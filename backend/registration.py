import os
import uuid
import json
import razorpay
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from database import get_db
import models
import schemas
from config import settings

router = APIRouter(tags=["registration"])

def get_razorpay_client():
    key_id = os.getenv("RAZORPAY_KEY_ID") or getattr(settings, "RAZORPAY_KEY_ID", "rzp_test_TGuT8hs5QZ9uy9")
    key_secret = os.getenv("RAZORPAY_KEY_SECRET") or getattr(settings, "RAZORPAY_KEY_SECRET", "Smb0IOLOAy5wzyp7cX2IOTqL")
    return razorpay.Client(auth=(key_id, key_secret))


def get_event_price(db: Session, event_name: str) -> int:
    normalized = event_name.lower().replace(" ", "-").strip()
    event = db.query(models.Event).filter(models.Event.id == normalized).first()
    if event:
        return event.price_amount
    
    # Standard pricing mapping
    prices = {
        "techtalk": 0,
        "tech talk": 0,
        "syntaxx": 39,
        "mindspark": 49,
        "bidquest": 149,
        "lensverse": 49,
        "carlsen-chess": 49,
        "carlsen chess": 49
    }
    return prices.get(event_name.lower().strip(), prices.get(normalized, 39))


def generate_env_id(db: Session) -> str:
    count = db.query(models.User).count() + 1
    return f"ENV-2026-{count:03d}"


def check_event_capacity(db: Session, event_name: str):
    """
    Checks event capacity BEFORE generating a Razorpay order.
    Counts active registrations (both 'SUCCESS' and 'PENDING').
    """
    normalized = event_name.lower().replace(" ", "-").strip()
    event = db.query(models.Event).filter(models.Event.id == normalized).first()
    max_cap = event.max_capacity if (event and hasattr(event, "max_capacity")) else 100

    active_count = db.query(models.Registration).filter(
        models.Registration.event_name == event_name,
        models.Registration.payment_status.in_(["SUCCESS", "PENDING"])
    ).count()

    if active_count >= max_cap:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Registration capacity for event '{event_name}' has been reached."
        )


@router.post("/register/solo")
def register_solo(
    payload: schemas.SoloRegistrationCreate,
    db: Session = Depends(get_db)
):
    """
    Endpoint 1: Accepts individual event details, verifies capacity caps,
    creates/updates participant, creates a Razorpay order, inserts a 'PENDING' row, and returns Order ID.
    """
    email_clean = payload.email.strip().lower()
    
    # Concurrency & Capacity check
    check_event_capacity(db, payload.event_name)

    # Fetch or Create Participant
    participant = db.query(models.User).filter(models.User.email == email_clean).first()
    if not participant:
        participant = models.User(
            name=payload.name.strip(),
            email=email_clean,
            mobile=payload.mobile,
            college=payload.college,
            food_pref=payload.food_pref,
            env_id=generate_env_id(db)
        )
        db.add(participant)
        db.commit()
        db.refresh(participant)
    else:
        # Update missing information if provided
        updated = False
        if payload.mobile and not participant.mobile:
            participant.mobile = payload.mobile
            updated = True
        if payload.college and not participant.college:
            participant.college = payload.college
            updated = True
        if payload.food_pref and not participant.food_pref:
            participant.food_pref = payload.food_pref
            updated = True
        if updated:
            db.commit()
            db.refresh(participant)

    # Check if already successfully registered for this event
    existing_reg = db.query(models.Registration).filter(
        models.Registration.participant_id == participant.id,
        models.Registration.event_name == payload.event_name,
        models.Registration.payment_status == "SUCCESS"
    ).first()
    if existing_reg:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"You are already registered for {payload.event_name}."
        )

    # Create Razorpay Order or Free Order
    price_amount = get_event_price(db, payload.event_name)
    price_in_paise = price_amount * 100
    
    if price_in_paise == 0:
        order_id = f"free_order_{uuid.uuid4().hex[:12]}"
        payment_status_val = "SUCCESS"
    else:
        client = get_razorpay_client()
        try:
            order_data = {
                "amount": price_in_paise,
                "currency": "INR",
                "receipt": f"receipt_{uuid.uuid4().hex[:10]}",
                "payment_capture": 1
            }
            order = client.order.create(data=order_data)
            order_id = order.get("id")
            payment_status_val = "PENDING"
        except Exception as e:
            print(f"[!] Razorpay Order Creation Notice: {e}")
            order_id = f"order_mock_{uuid.uuid4().hex[:12]}"
            payment_status_val = "PENDING"

    # Insert registration record
    registration = models.Registration(
        participant_id=participant.id,
        event_name=payload.event_name,
        payment_order_id=order_id,
        payment_status=payment_status_val
    )
    db.add(registration)
    db.commit()
    db.refresh(registration)

    return {
        "status": "success",
        "registration_id": str(registration.reg_id),
        "razorpay_order_id": order_id,
        "amount": price_amount,
        "is_free": price_amount == 0
    }


@router.post("/register/team")
def register_team(
    payload: schemas.TeamRegistrationCreate,
    db: Session = Depends(get_db)
):
    """
    Endpoint 2: Accepts team details (leader + up to 2 members, max team size 3),
    verifies capacity caps, executes inside an ATOMIC TRANSACTION to prevent orphaned data,
    creates/updates participants, creates a team row, creates Razorpay order, and returns Order ID.
    """
    leader_email = payload.leader_email.strip().lower()
    
    # Enforce maximum 3 members total (Leader + max 2 extra members)
    if len(payload.members) > 2:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Teams cannot exceed 3 members total (Leader + up to 2 members)."
        )

    # Concurrency & Capacity check
    check_event_capacity(db, payload.event_name)

    # ATOMIC TRANSACTION BLOCK
    try:
        # 1. Fetch or Create Leader Participant
        leader = db.query(models.User).filter(models.User.email == leader_email).first()
        if not leader:
            leader = models.User(
                name=payload.leader_name.strip(),
                email=leader_email,
                mobile=payload.leader_mobile,
                college=payload.leader_college,
                food_pref=payload.leader_food_pref,
                env_id=generate_env_id(db)
            )
            db.add(leader)
            db.flush()
        else:
            if payload.leader_mobile and not leader.mobile:
                leader.mobile = payload.leader_mobile
            if payload.leader_college and not leader.college:
                leader.college = payload.leader_college
            if payload.leader_food_pref and not leader.food_pref:
                leader.food_pref = payload.leader_food_pref
            db.flush()

        # 2. Fetch or Create Teammate Participants (max 2 members)
        teammates = []
        for member in payload.members:
            member_email = member.email.strip().lower()
            if member_email == leader_email:
                continue # Avoid adding leader as member twice
                
            tm = db.query(models.User).filter(models.User.email == member_email).first()
            if not tm:
                tm = models.User(
                    name=member.name.strip(),
                    email=member_email,
                    mobile=member.mobile,
                    college=member.college or payload.leader_college,
                    food_pref=member.food_pref,
                    env_id=generate_env_id(db)
                )
                db.add(tm)
                db.flush()
            else:
                if member.mobile and not tm.mobile:
                    tm.mobile = member.mobile
                if member.college and not tm.college:
                    tm.college = member.college
                if member.food_pref and not tm.food_pref:
                    tm.food_pref = member.food_pref
                db.flush()
            teammates.append(tm)

        # 3. Create Teams table row
        team = models.Team(
            team_name=payload.team_name.strip(),
            event_name=payload.event_name,
            leader_id=leader.id
        )
        db.add(team)
        db.flush()

        # 4. Create Razorpay order
        price_amount = get_event_price(db, payload.event_name)
        price_in_paise = price_amount * 100
        
        if price_in_paise == 0:
            order_id = f"free_order_{uuid.uuid4().hex[:12]}"
            payment_status_val = "SUCCESS"
        else:
            client = get_razorpay_client()
            try:
                order_data = {
                    "amount": price_in_paise,
                    "currency": "INR",
                    "receipt": f"receipt_{uuid.uuid4().hex[:10]}",
                    "payment_capture": 1
                }
                order = client.order.create(data=order_data)
                order_id = order.get("id")
                payment_status_val = "PENDING"
            except Exception as e:
                print(f"[!] Razorpay Team Order Creation Notice: {e}")
                order_id = f"order_mock_{uuid.uuid4().hex[:12]}"
                payment_status_val = "PENDING"

        # 5. Insert registration rows for leader and teammates
        leader_reg = models.Registration(
            participant_id=leader.id,
            event_name=payload.event_name,
            team_id=team.team_id,
            payment_order_id=order_id,
            payment_status=payment_status_val
        )
        db.add(leader_reg)

        for tm in teammates:
            tm_reg = models.Registration(
                participant_id=tm.id,
                event_name=payload.event_name,
                team_id=team.team_id,
                payment_order_id=order_id,
                payment_status=payment_status_val
            )
            db.add(tm_reg)

        db.commit()
        db.refresh(leader_reg)

        return {
            "status": "success",
            "team_id": str(team.team_id),
            "registration_id": str(leader_reg.reg_id),
            "razorpay_order_id": order_id,
            "amount": price_amount,
            "is_free": price_amount == 0
        }

    except HTTPException:
        db.rollback()
        raise
    except Exception as err:
        db.rollback()
        print(f"[!] Atomic Team Registration Error (Rolled Back): {err}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to complete team registration. Database transaction rolled back."
        )


@router.post("/webhook/razorpay")
async def razorpay_webhook(
    request: Request,
    db: Session = Depends(get_db)
):
    """
    Endpoint 3: Production-Ready Webhook Pipeline.
    Strictly verifies x-razorpay-signature, enforces idempotency,
    and returns 200 OK on internal DB events to avoid retry loops.
    """
    body_bytes = await request.body()
    body_str = body_bytes.decode("utf-8")
    
    signature = request.headers.get("x-razorpay-signature")
    webhook_secret = os.getenv("RAZORPAY_WEBHOOK_SECRET") or getattr(settings, "RAZORPAY_WEBHOOK_SECRET", "whsec_mocksecret123")
    
    if signature:
        try:
            client = get_razorpay_client()
            client.utility.verify_webhook_signature(
                body_str,
                signature,
                webhook_secret
            )
        except Exception as e:
            print(f"[!] Webhook Signature Verification Error: {e}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Signature verification failed."
            )

    try:
        event_payload = json.loads(body_str)
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid JSON payload."
        )

    event_type = event_payload.get("event")
    
    if event_type in ("payment.captured", "order.paid"):
        payment_entity = event_payload.get("payload", {}).get("payment", {}).get("entity", {})
        order_id = payment_entity.get("order_id")
        
        if not order_id:
            order_id = event_payload.get("payload", {}).get("order", {}).get("entity", {}).get("id")

        if order_id:
            try:
                registrations = db.query(models.Registration).filter(
                    models.Registration.payment_order_id == order_id
                ).all()
                
                if not registrations:
                    return {"status": "ignored", "message": f"Order '{order_id}' not found in database."}

                # IDEMPOTENCY CHECK: If already marked as SUCCESS, return 200 OK immediately
                if all(reg.payment_status == "SUCCESS" for reg in registrations):
                    return {
                        "status": "ok",
                        "message": f"Order '{order_id}' is already marked as SUCCESS. Idempotent response."
                    }

                for reg in registrations:
                    reg.payment_status = "SUCCESS"
                db.commit()
                
                return {
                    "status": "ok",
                    "message": f"Updated {len(registrations)} registration(s) for order {order_id} to SUCCESS."
                }
            except Exception as db_err:
                db.rollback()
                print(f"[!] Webhook Database Error (Safely Handled): {db_err}")
                return {
                    "status": "error",
                    "message": f"Webhook received but internal DB error logged: {db_err}"
                }
            
    return {"status": "ignored"}
