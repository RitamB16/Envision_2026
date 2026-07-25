import uuid
from typing import List, Optional
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status, Request
from fastapi_cache import FastAPICache
from fastapi_cache.decorator import cache
from limiter import limiter
from sqlalchemy.orm import Session
import models, schemas
from database import get_db
from security import get_current_user
from config import settings
from auth import generate_fest_id

router = APIRouter(prefix="/events", tags=["events"])

DEFAULT_EVENTS = [
    {
        "id": "techtalk",
        "name": "TECH TALK",
        "category": "SEMINAR",
        "price": "FREE",
        "price_amount": 0,
        "requires_team": False,
        "max_team_size": 1,
        "has_food": False,
        "max_capacity": 1000,
        "notes": "100% FREE & Open to All! Direct Registration.",
        "image": "/images/events/techtalk.jpg",
        "benefits": "Free Keynote Entry Pass to RKMRC Tech Talk, Technical Seminars & Certificates.",
        "date": "6th August",
        "venue": "Mumukshananda Auditorium, RKMRC",
        "time": "10:30 AM"
    },
    {
        "id": "syntaxx",
        "name": "SYNTAXX",
        "category": "CODING",
        "price": "₹39",
        "price_amount": 39,
        "requires_team": False,
        "max_team_size": 1,
        "has_food": True,
        "max_capacity": 50,
        "notes": "Individual Event",
        "image": "/images/events/syntaxx.jpg",
        "benefits": "Participation certificate, Exciting Swags for Winner",
        "date": "6th August",
        "venue": "Computer Science Lab",
        "time": "1 PM"
    },
    {
        "id": "mindspark",
        "name": "MINDSPARK",
        "category": "QUIZ",
        "price": "₹49",
        "price_amount": 49,
        "requires_team": True,
        "max_team_size": 2,
        "has_food": True,
        "max_capacity": 50,
        "notes": "Team (max. 2 members)",
        "image": "/images/events/mindspark.jpg",
        "benefits": "Participation certificate, Winning Cash prize worth ₹499",
        "date": "6th August",
        "venue": "Mumukshananda Auditorium, RKMRC",
        "time": "11:30 AM"
    },
    {
        "id": "bidquest",
        "name": "BIDQUEST",
        "category": "AUCTION",
        "price": "₹149",
        "price_amount": 149,
        "requires_team": True,
        "max_team_size": 3,
        "has_food": True,
        "max_capacity": 70,
        "notes": "Team Event (max. 3 members)",
        "image": "/images/events/bidquest.jpg",
        "benefits": "Participation certificate, Winning Cash prize worth ₹1199",
        "date": "6th August",
        "venue": "Mumukshananda Auditorium, RKMRC",
        "time": "11:00 AM"
    },
    {
        "id": "lensverse",
        "name": "LENSVERSE",
        "category": "PHOTOGRAPHY",
        "price": "₹49",
        "price_amount": 49,
        "requires_team": False,
        "max_team_size": 1,
        "has_food": True,
        "max_capacity": 200,
        "notes": "Top 10 shortlisted participants earn free entry, campus pass & FREE food for live photo competition!",
        "image": "/images/events/lensverse.jpg",
        "benefits": "Top 10 shortlisted photographers get invited to RKMRC campus with FREE food & festival pass to compete in live campus photo competition for winner cash prizes!",
        "date": "6th August",
        "venue": "RKMRC Campus (For Top 10 Finalists)",
        "time": "10:00 AM"
    },
    {
        "id": "carlsen-chess",
        "name": "CARLSEN CHESS",
        "category": "CHESS",
        "price": "₹49",
        "price_amount": 49,
        "requires_team": False,
        "max_team_size": 1,
        "has_food": True,
        "max_capacity": 50,
        "notes": "Individual Event",
        "image": "/images/events/chess.jpg",
        "benefits": "Participation certificate, Winning Cash prize worth ₹499",
        "date": "6th August",
        "venue": "Mumukshananda Auditorium, RKMRC",
        "time": "1 PM"
    }
]


def seed_events_if_empty(db: Session):
    existing_events = db.query(models.Event).all()
    if not existing_events:
        for item in DEFAULT_EVENTS:
            db_event = models.Event(**item)
            db.add(db_event)
        db.commit()
    else:
        for item in DEFAULT_EVENTS:
            ev = db.query(models.Event).filter(models.Event.id == item["id"]).first()
            if ev:
                ev.name = item["name"]
                ev.price = item["price"]
                ev.price_amount = item["price_amount"]
                ev.requires_team = item["requires_team"]
                ev.max_team_size = item["max_team_size"]
                ev.has_food = item["has_food"]
                ev.notes = item["notes"]
                ev.benefits = item["benefits"]
                ev.venue = item["venue"]
                ev.max_capacity = item["max_capacity"]
        db.commit()


@router.get("", response_model=List[schemas.EventResponse])
@cache(expire=3600)
def get_all_events(db: Session = Depends(get_db)):
    """Fetch all events available in Envision '26 (Cached for 1 hour)."""
    seed_events_if_empty(db)
    return db.query(models.Event).all()


@router.get("/registrations/me", response_model=List[schemas.EventRegistrationResponse])
def get_user_registrations(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Fetch all event registrations for the authenticated user."""
    seed_events_if_empty(db)

    # Fetch direct registrations by ID or matching email
    user_email_lower = current_user.email.strip().lower() if current_user.email else ""
    
    registrations = db.query(models.Registration).filter(
        (models.Registration.participant_id == current_user.id) |
        (models.Registration.participant.has(models.User.email == user_email_lower)),
        models.Registration.payment_status != "CANCELLED"
    ).all()

    # Also fetch team registrations where current_user is the team leader
    user_teams = db.query(models.Team).filter(models.Team.leader_id == current_user.id).all()
    team_ids = [t.team_id for t in user_teams]
    if team_ids:
        team_regs = db.query(models.Registration).filter(
            models.Registration.team_id.in_(team_ids),
            models.Registration.payment_status != "CANCELLED"
        ).all()
        registrations.extend(team_regs)

    # Deduplicate registrations by reg_id
    registrations = list({r.reg_id: r for r in registrations}.values())

    registered_event_ids = {r.event_id for r in registrations}

    paid_registrations = [
        r for r in registrations
        if r.event_id != "techtalk"
    ]

    if paid_registrations and "techtalk" not in registered_event_ids:
        auto_techtalk_reg = models.EventRegistration(
            user_id=current_user.id,
            event_id="techtalk",
            payment_order_id=f"auto_free_{uuid.uuid4().hex[:10]}",
            payment_status="COMPLETED",
            status="CONFIRMED"
        )
        db.add(auto_techtalk_reg)
        db.commit()
        db.refresh(auto_techtalk_reg)
        registrations.append(auto_techtalk_reg)

    all_events = {e.id: e for e in db.query(models.Event).all()}
    result = []
    for reg in registrations:
        event = all_events.get(reg.event_id)
        reg_response = schemas.EventRegistrationResponse.model_validate(reg)
        if event:
            reg_response.event = schemas.EventResponse.model_validate(event)
        result.append(reg_response)

    return result


@router.get("/{event_id}", response_model=schemas.EventResponse)
@cache(expire=3600)
def get_event_by_id(event_id: str, db: Session = Depends(get_db)):
    """Fetch event details by ID (Cached for 1 hour)."""
    seed_events_if_empty(db)
    event = db.query(models.Event).filter(models.Event.id == event_id).first()
    if not event:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Event '{event_id}' not found."
        )
    return event


@router.post("", response_model=schemas.EventResponse)
async def create_event(
    payload: schemas.EventResponse,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Admin Route: Create new event and instantly clear Redis cache."""
    if current_user.role != "ADMIN":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin permissions required.")

    db_event = models.Event(**payload.model_dump())
    db.add(db_event)
    db.commit()
    db.refresh(db_event)

    await FastAPICache.clear(namespace="events")
    return db_event


@router.put("/{event_id}", response_model=schemas.EventResponse)
async def update_event(
    event_id: str,
    payload: schemas.EventResponse,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Admin Route: Update existing event and instantly clear Redis cache."""
    if current_user.role != "ADMIN":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin permissions required.")

    event = db.query(models.Event).filter(models.Event.id == event_id).first()
    if not event:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Event not found.")

    for field, val in payload.model_dump().items():
        setattr(event, field, val)

    db.commit()
    db.refresh(event)

    await FastAPICache.clear(namespace="events")
    return event


@router.post("/{event_id}/register")
@limiter.limit("5/minute")
def register_for_event(
    request: Request,
    event_id: str,
    payload: schemas.EventRegistrationCreate,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Register for an event (Individual or Team) with Fest ID validation and status checks."""
    seed_events_if_empty(db)

    event = db.query(models.Event).filter(models.Event.id == event_id).first()
    if not event:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Event '{event_id}' not found."
        )

    existing_reg = db.query(models.EventRegistration).filter(
        models.EventRegistration.user_id == current_user.id,
        models.EventRegistration.event_id == event_id,
        models.EventRegistration.status != "CANCELLED"
    ).first()

    amount = event.price_amount
    is_free = (event.price == "FREE" or amount == 0)

    if existing_reg:
        if existing_reg.payment_status in ["COMPLETED", "CONFIRMED"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Already registered"
            )
        elif existing_reg.payment_status == "PENDING":
            return {
                "status": "success",
                "registration_id": existing_reg.id,
                "amount": amount,
                "is_free": is_free,
                "id": existing_reg.id,
                "user_id": current_user.id,
                "event_id": event_id,
                "team_id": existing_reg.team_id,
                "payment_status": existing_reg.payment_status
            }

    food_pref = payload.food_preference if event.has_food else None
    new_team_id = None
    created_team_name = payload.team_name
    initial_payment_status = "COMPLETED" if (is_free or payload.transaction_id) else "PENDING"

    if event.requires_team:
        if not payload.team_name or not payload.team_name.strip():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"A Team Name is required for '{event.name}'."
            )

        teammates_to_register = []
        tm_food_map = {}

        if payload.teammate_details:
            if len(payload.teammate_details) > (event.max_team_size - 1):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Maximum teammate limit for '{event.name}' is {event.max_team_size - 1} members."
                )

            for tm_detail in payload.teammate_details:
                tm_email = tm_detail.email.strip().lower() if tm_detail.email else ""
                if not tm_email or tm_email == current_user.email.lower():
                    continue

                if tm_detail.food_preference and event.has_food:
                    tm_food_map[tm_email] = tm_detail.food_preference

                tm_name = tm_detail.name.strip() if tm_detail.name else tm_email.split('@')[0].capitalize()
                tm_phone = tm_detail.phone.strip() if tm_detail.phone else None
                tm_college = tm_detail.college.strip() if tm_detail.college else None

                tm_user = db.query(models.User).filter(models.User.email == tm_email).first()
                if not tm_user:
                    fest_id = generate_fest_id(db)
                    tm_user = models.User(
                        email=tm_email,
                        name=tm_name,
                        full_name=tm_name,
                        phone=tm_phone,
                        college=tm_college or payload.college,
                        fest_id=fest_id,
                        role="USER",
                        is_approved=True
                    )
                    db.add(tm_user)
                    db.commit()
                    db.refresh(tm_user)
                else:
                    if not tm_user.fest_id or not tm_user.fest_id.startswith("ENV-2026-"):
                        tm_user.fest_id = generate_fest_id(db)
                    if tm_name and not tm_user.name:
                        tm_user.name = tm_name
                    if tm_phone and not tm_user.phone:
                        tm_user.phone = tm_phone
                    if tm_college and not tm_user.college:
                        tm_user.college = tm_college
                    db.commit()
                    db.refresh(tm_user)

                if tm_user not in teammates_to_register:
                    teammates_to_register.append(tm_user)

        provided_ids = [fid.strip() for fid in (payload.teammate_fest_ids or []) if fid.strip()]
        if provided_ids:
            for fest_id in provided_ids:
                teammate_user = db.query(models.User).filter(
                    (models.User.fest_id == fest_id) | (models.User.fest_id == fest_id.upper())
                ).first()
                if not teammate_user and "ENV-2026-" in fest_id.upper():
                    suffix = fest_id.upper().split("ENV-2026-")[-1]
                    if suffix.isdigit():
                        padded_id = f"ENV-2026-{int(suffix):03d}"
                        teammate_user = db.query(models.User).filter(models.User.fest_id == padded_id).first()

                if teammate_user and teammate_user.id != current_user.id and teammate_user not in teammates_to_register:
                    teammates_to_register.append(teammate_user)

        new_team = models.Team(
            name=payload.team_name.strip(),
            event_id=event_id,
            leader_id=current_user.id
        )
        db.add(new_team)
        db.commit()
        db.refresh(new_team)
        new_team_id = new_team.id

        registered_members = [f"{current_user.name} ({current_user.fest_id or 'Leader'})"]
        for tm in teammates_to_register:
            registered_members.append(f"{tm.name} ({tm.fest_id or 'Member'})")
        team_members_str = ", ".join(registered_members)

        for tm in teammates_to_register:
            tm_existing = db.query(models.EventRegistration).filter(
                models.EventRegistration.user_id == tm.id,
                models.EventRegistration.event_id == event_id,
                models.EventRegistration.status != "CANCELLED"
            ).first()

            if not tm_existing:
                tm_food_pref = tm_food_map.get(tm.email.lower(), food_pref) if event.has_food else None
                tm_reg = models.EventRegistration(
                    user_id=tm.id,
                    event_id=event_id,
                    team_id=new_team_id,
                    food_preference=tm_food_pref,
                    user_email=tm.email,
                    user_name=tm.full_name or tm.name,
                    user_phone=tm.phone or payload.phone,
                    team_name=payload.team_name.strip(),
                    team_members=team_members_str,
                    college=tm.college or payload.college,
                    payment_status=initial_payment_status,
                    status="CONFIRMED"
                )
                db.add(tm_reg)
    else:
        team_members_str = f"{current_user.name} ({current_user.fest_id or 'Participant'})"

    leader_reg = models.EventRegistration(
        user_id=current_user.id,
        event_id=event_id,
        team_id=new_team_id,
        food_preference=food_pref,
        user_email=current_user.email,
        user_name=current_user.full_name or current_user.name,
        user_phone=payload.phone,
        team_name=created_team_name,
        team_members=team_members_str,
        college=payload.college or current_user.college,
        transaction_id=payload.transaction_id,
        payment_status=initial_payment_status,
        status="CONFIRMED"
    )

    if payload.college and not current_user.college:
        current_user.college = payload.college
    if payload.phone and not current_user.phone:
        current_user.phone = payload.phone

    db.add(leader_reg)
    db.commit()
    db.refresh(leader_reg)

    return {
        "status": "success",
        "registration_id": leader_reg.id,
        "amount": amount,
        "is_free": is_free,
        "id": leader_reg.id,
        "user_id": current_user.id,
        "event_id": event_id,
        "team_id": new_team_id,
        "team_name": created_team_name,
        "team_members": team_members_str,
        "food_preference": food_pref,
        "user_email": current_user.email,
        "user_name": current_user.full_name or current_user.name,
        "payment_status": initial_payment_status
    }


@router.delete("/registrations/{registration_id}")
def cancel_registration(
    registration_id: str,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Cancel an event registration."""
    reg = db.query(models.EventRegistration).filter(
        models.EventRegistration.id == registration_id,
        models.EventRegistration.user_id == current_user.id
    ).first()

    if not reg:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Event registration not found."
        )

    reg.status = "CANCELLED"
    db.commit()
    return {"message": f"Registration '{registration_id}' cancelled successfully."}


@router.get("/{event_id}/participants")
def get_event_participants(
    event_id: str,
    db: Session = Depends(get_db)
):
    """
    Event-Wise Data Retrieval Endpoint:
    Retrieves complete participant records for a specific event after registration closes.
    """
    seed_events_if_empty(db)
    event = db.query(models.Event).filter(models.Event.id == event_id).first()
    if not event:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Event '{event_id}' not found."
        )

    registrations = db.query(models.EventRegistration).filter(
        models.EventRegistration.event_id == event_id,
        models.EventRegistration.status != "CANCELLED"
    ).all()

    user_ids = [r.user_id for r in registrations]
    users_by_id = {u.id: u for u in db.query(models.User).filter(models.User.id.in_(user_ids)).all()} if user_ids else {}

    result = []
    for reg in registrations:
        u = users_by_id.get(reg.user_id)
        fest_id = u.fest_id if u else "ENV-2026-000"
        name = reg.user_name or (u.full_name or u.name if u else "Participant")
        email = reg.user_email or (u.email if u else "")
        phone = reg.user_phone or (u.phone if u else "N/A")
        college = reg.college or (u.college if u else "N/A")

        result.append({
            "registration_id": reg.id,
            "event_id": reg.event_id,
            "event_name": event.name,
            "fest_id": fest_id,
            "name": name,
            "email": email,
            "phone": phone,
            "college": college,
            "food_preference": reg.food_preference if event.has_food else "No Food",
            "team_name": reg.team_name or "Individual",
            "team_members": reg.team_members or name,
            "payment_status": reg.payment_status,
            "transaction_id": reg.transaction_id or reg.razorpay_order_id or "N/A",
            "created_at": reg.created_at.isoformat() if reg.created_at else None
        })

    return {
        "status": "success",
        "event_id": event.id,
        "event_name": event.name,
        "total_registrations": len(result),
        "participants": result
    }


@router.get("/export/all-events")
def export_all_event_data(
    db: Session = Depends(get_db)
):
    """
    Master Event-Wise Export Endpoint:
    Groups all registered participant data by event for administrative reporting.
    """
    seed_events_if_empty(db)
    all_events = db.query(models.Event).all()
    all_registrations = db.query(models.EventRegistration).filter(
        models.EventRegistration.status != "CANCELLED"
    ).all()

    user_ids = [r.user_id for r in all_registrations]
    users_by_id = {u.id: u for u in db.query(models.User).filter(models.User.id.in_(user_ids)).all()} if user_ids else {}

    grouped_data = {}
    for ev in all_events:
        grouped_data[ev.id] = {
            "event_id": ev.id,
            "event_name": ev.name,
            "category": ev.category,
            "price": ev.price,
            "has_food": ev.has_food,
            "total_participants": 0,
            "participants": []
        }

    for reg in all_registrations:
        if reg.event_id in grouped_data:
            u = users_by_id.get(reg.user_id)
            name = reg.user_name or (u.full_name or u.name if u else "Participant")
            email = reg.user_email or (u.email if u else "")
            phone = reg.user_phone or (u.phone if u else "N/A")
            college = reg.college or (u.college if u else "N/A")
            fest_id = u.fest_id if u else "ENV-2026-000"

            participant_entry = {
                "registration_id": reg.id,
                "fest_id": fest_id,
                "name": name,
                "email": email,
                "phone": phone,
                "college": college,
                "food_preference": reg.food_preference if grouped_data[reg.event_id]["has_food"] else "No Food",
                "team_name": reg.team_name or "Individual",
                "team_members": reg.team_members or name,
                "payment_status": reg.payment_status,
                "transaction_id": reg.transaction_id or reg.razorpay_order_id or "N/A",
                "created_at": reg.created_at.isoformat() if reg.created_at else None
            }

            grouped_data[reg.event_id]["participants"].append(participant_entry)
            grouped_data[reg.event_id]["total_participants"] += 1

    return {
        "status": "success",
        "events_summary": grouped_data
    }