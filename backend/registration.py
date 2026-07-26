import os
import uuid
import json
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy import func
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session
from database import get_db
import models
import schemas
from config import settings

router = APIRouter(tags=["registration"])


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


EVENT_CAPACITY_LIMITS = {
    "techtalk": 1000,
    "tech talk": 1000,
    "syntaxx": 50,
    "mindspark": 50,
    "bidquest": 70,
    "lensverse": 200,
    "carlsen-chess": 50,
    "carlsen chess": 50,
    "chess": 50
}

def check_event_capacity(db: Session, event_name: str):
    """
    Checks event capacity BEFORE generating a Razorpay order.
    Counts active registrations safely across SUCCESS, COMPLETED, and PENDING statuses.
    """
    normalized = event_name.lower().replace(" ", "-").strip()
    event = db.query(models.Event).filter(models.Event.id == normalized).first()
    
    if event and hasattr(event, "max_capacity") and event.max_capacity is not None:
        max_cap = event.max_capacity
    else:
        max_cap = EVENT_CAPACITY_LIMITS.get(event_name.lower().strip(), EVENT_CAPACITY_LIMITS.get(normalized, 100))

    # Unlimited capacity for Tech Talk
    if max_cap >= 999999 or max_cap == 0:
        return

    # Count active rows including COMPLETED, SUCCESS, and PENDING
    active_count = db.query(models.Registration).filter(
        models.Registration.event_name == event_name,
        models.Registration.payment_status.in_(["SUCCESS", "COMPLETED", "PENDING"])
    ).count()

    if active_count >= max_cap:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Registration capacity limit of {max_cap} for '{event_name}' has been reached."
        )


def auto_enroll_techtalk(db: Session, participant_id: uuid.UUID) -> Optional[models.Registration]:
    """
    Idempotent helper function:
    Automatically enrolls a participant into Tech Talk (techtalk) with payment_status="PAID"
    whenever they register for any event in the tech fest.
    """
    if not participant_id:
        return None

    existing_techtalk = db.query(models.Registration).filter(
        models.Registration.participant_id == participant_id,
        models.Registration.event_name.ilike("techtalk")
    ).first()

    if existing_techtalk:
        if existing_techtalk.payment_status not in ("PAID", "COMPLETED", "SUCCESS"):
            existing_techtalk.payment_status = "PAID"
            db.add(existing_techtalk)
            try:
                db.commit()
                db.refresh(existing_techtalk)
            except Exception:
                db.rollback()
        return existing_techtalk

    auto_reg = models.Registration(
        participant_id=participant_id,
        event_name="techtalk",
        team_id=None,
        payment_order_id=f"auto_techtalk_{uuid.uuid4().hex[:10]}",
        payment_status="PAID"
    )
    db.add(auto_reg)
    try:
        db.commit()
        db.refresh(auto_reg)
        print(f"[AUTO-ENROLL SUCCESS] Participant {participant_id} auto-enrolled into Tech Talk.")
        return auto_reg
    except Exception as err:
        db.rollback()
        return db.query(models.Registration).filter(
            models.Registration.participant_id == participant_id,
            models.Registration.event_name.ilike("techtalk")
        ).first()


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

    # Check for pre-existing registration record for this participant and event (Idempotent Resumption)
    existing_reg = db.query(models.Registration).filter(
        models.Registration.participant_id == participant.id,
        models.Registration.event_name == payload.event_name
    ).first()

    price_amount = get_event_price(db, payload.event_name)

    # Check if event requires a team or payload provided team_name / team_id
    normalized_event_name = payload.event_name.lower().replace(" ", "-").strip()
    event_obj = db.query(models.Event).filter(models.Event.id == normalized_event_name).first()
    is_team_event = (event_obj and event_obj.requires_team) or bool(payload.team_name) or bool(payload.team_id)

    bound_team_id = payload.team_id
    if is_team_event and not bound_team_id:
        clean_team_name = payload.team_name.strip() if payload.team_name else f"{participant.name.strip()}'s Team"
        team = db.query(models.Team).filter(
            func.lower(models.Team.team_name) == clean_team_name.lower(),
            models.Team.event_name == payload.event_name
        ).first()

        if not team:
            try:
                team = models.Team(
                    team_name=clean_team_name,
                    event_name=payload.event_name,
                    leader_id=participant.id
                )
                db.add(team)
                db.flush()
            except IntegrityError:
                db.rollback()
                team = db.query(models.Team).filter(
                    func.lower(models.Team.team_name) == clean_team_name.lower(),
                    models.Team.event_name == payload.event_name
                ).first()
        
        if team:
            bound_team_id = team.team_id

    if existing_reg:
        if bound_team_id and not existing_reg.team_id:
            existing_reg.team_id = bound_team_id
            db.commit()
            db.refresh(existing_reg)
        return {
            "status": "success" if existing_reg.payment_status in ("PENDING", "UNPAID") else "already_registered",
            "registration_id": str(existing_reg.reg_id),
            "order_id": existing_reg.payment_order_id,
            "team_id": str(existing_reg.team_id) if existing_reg.team_id else (str(bound_team_id) if bound_team_id else None),
            "amount": price_amount,
            "payment_status": existing_reg.payment_status,
            "is_free": price_amount == 0
        }

    # Create Direct Order (Free or UPI)
    price_in_paise = price_amount * 100
    
    if price_in_paise == 0:
        order_id = f"ENV26-FREE-{uuid.uuid4().hex[:6].upper()}"
        payment_status_val = "COMPLETED"
    else:
        order_id = f"ENV26-ORD-{uuid.uuid4().hex[:6].upper()}"
        payment_status_val = "PENDING"

    # Insert registration record with SQL IntegrityError Concurrency Catching
    try:
        registration = models.Registration(
            participant_id=participant.id,
            event_name=payload.event_name,
            team_id=bound_team_id,
            payment_order_id=order_id,
            payment_status=payment_status_val
        )
        db.add(registration)
        db.commit()
        db.refresh(registration)

        # Auto-enroll in Tech Talk for all festival participants
        auto_enroll_techtalk(db, participant.id)

        return {
            "status": "success",
            "registration_id": str(registration.reg_id),
            "order_id": order_id,
            "team_id": str(registration.team_id) if registration.team_id else None,
            "amount": price_amount,
            "payment_status": payment_status_val,
            "is_free": price_amount == 0
        }
    except Exception as err:
        db.rollback()
        conflict_reg = db.query(models.Registration).filter(
            models.Registration.participant_id == participant.id,
            models.Registration.event_name == payload.event_name
        ).first()
        if conflict_reg:
            if bound_team_id and not conflict_reg.team_id:
                conflict_reg.team_id = bound_team_id
                db.commit()
                db.refresh(conflict_reg)
            return {
                "status": "success",
                "registration_id": str(conflict_reg.reg_id),
                "order_id": conflict_reg.payment_order_id,
                "team_id": str(conflict_reg.team_id) if conflict_reg.team_id else (str(bound_team_id) if bound_team_id else None),
                "amount": price_amount,
                "payment_status": conflict_reg.payment_status,
                "is_free": price_amount == 0
            }
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to register due to database concurrency conflict."
        )


@router.post("/register/team")
def register_team(
    payload: schemas.TeamRegistrationCreate,
    db: Session = Depends(get_db)
):
    """
    Endpoint 2: Accepts team details (leader + up to 2 members, max team size 3),
    verifies capacity caps, executes inside an ATOMIC TRANSACTION to prevent orphaned data,
    and programmatically binds team_id to all member registration rows.
    """
    leader_email = payload.leader_email.strip().lower()
    
    if len(payload.members) > 2:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Teams cannot exceed 3 members total (Leader + up to 2 members)."
        )

    # Concurrency & Capacity check
    check_event_capacity(db, payload.event_name)

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

        # Check if leader already has a registration record for this event (Idempotent Resumption)
        existing_leader_reg = db.query(models.Registration).filter(
            models.Registration.participant_id == leader.id,
            models.Registration.event_name == payload.event_name
        ).first()

        # 2. Fetch or Create Teammate Participants
        teammates = []
        for member in payload.members:
            member_email = member.email.strip().lower()
            if member_email == leader_email:
                continue
                
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

        # 3. Idempotent Team Creation / Lookup
        clean_team_name = payload.team_name.strip()
        team = db.query(models.Team).filter(
            func.lower(models.Team.team_name) == clean_team_name.lower(),
            models.Team.event_name == payload.event_name
        ).first()

        if not team:
            team = models.Team(
                team_name=clean_team_name,
                event_name=payload.event_name,
                leader_id=leader.id
            )
            db.add(team)
            db.flush()

        # Ensure team_id is strictly bound and non-NULL for team events
        assert team.team_id is not None, "team_id must not be null for team events"

        # 4. Create Direct Order (Free or UPI)
        price_amount = get_event_price(db, payload.event_name)
        price_in_paise = price_amount * 100
        
        if existing_leader_reg:
            order_id = existing_leader_reg.payment_order_id
            payment_status_val = existing_leader_reg.payment_status
            if not existing_leader_reg.team_id:
                existing_leader_reg.team_id = team.team_id
                db.flush()
            leader_reg = existing_leader_reg
        else:
            if price_in_paise == 0:
                order_id = f"ENV26-FREE-{uuid.uuid4().hex[:6].upper()}"
                payment_status_val = "COMPLETED"
            else:
                order_id = f"ENV26-ORD-{uuid.uuid4().hex[:6].upper()}"
                payment_status_val = "PENDING"

            leader_reg = models.Registration(
                participant_id=leader.id,
                event_name=payload.event_name,
                team_id=team.team_id,
                payment_order_id=order_id,
                payment_status=payment_status_val
            )
            db.add(leader_reg)
            db.flush()

        # 5. Insert or update registration rows for teammates with bound team_id
        for tm in teammates:
            tm_reg = db.query(models.Registration).filter(
                models.Registration.participant_id == tm.id,
                models.Registration.event_name == payload.event_name
            ).first()

            if tm_reg:
                if not tm_reg.team_id:
                    tm_reg.team_id = team.team_id
                    db.flush()
            else:
                tm_reg = models.Registration(
                    participant_id=tm.id,
                    event_name=payload.event_name,
                    team_id=team.team_id,
                    payment_order_id=order_id,
                    payment_status=payment_status_val
                )
                db.add(tm_reg)
                db.flush()

        db.commit()
        db.refresh(leader_reg)

        # Auto-enroll leader and all team members into Tech Talk
        auto_enroll_techtalk(db, leader.id)
        for tm in teammates:
            auto_enroll_techtalk(db, tm.id)

        return {
            "status": "success",
            "team_id": str(team.team_id),
            "registration_id": str(leader_reg.reg_id),
            "order_id": order_id,
            "amount": price_amount,
            "payment_status": leader_reg.payment_status,
            "is_free": price_amount == 0
        }

    except IntegrityError as integ_err:
        db.rollback()
        # Fallback query for concurrency race condition handling
        clean_team_name = payload.team_name.strip()
        team = db.query(models.Team).filter(
            func.lower(models.Team.team_name) == clean_team_name.lower(),
            models.Team.event_name == payload.event_name
        ).first()

        existing_reg = db.query(models.Registration).filter(
            models.Registration.participant_id == leader.id if 'leader' in locals() else False,
            models.Registration.event_name == payload.event_name
        ).first()

        if existing_reg:
            price_amount = get_event_price(db, payload.event_name)
            return {
                "status": "success",
                "team_id": str(team.team_id) if team else None,
                "registration_id": str(existing_reg.reg_id),
                "order_id": existing_reg.payment_order_id,
                "amount": price_amount,
                "payment_status": existing_reg.payment_status,
                "is_free": price_amount == 0
            }
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Team registration failed due to database constraint: {str(integ_err)}"
        )

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