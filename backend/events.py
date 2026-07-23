import uuid
from typing import List, Optional
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status, Request
from fastapi_cache import FastAPICache
from fastapi_cache.decorator import cache
from limiter import limiter
from sqlalchemy.orm import Session
from jose import jwt
import models, schemas
from database import get_db
from security import get_current_user
from config import settings
from auth import get_frontend_url, generate_fest_id

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
        "notes": "Free for all participants who register in any paid event.",
        "image": "/images/events/techtalk.jpg",
        "benefits": "Free Access to Techfest, RKMRC for keynote sessions, technical seminars, and networking hubs.",
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
        "has_food": False,
        "notes": "Individual Event (NO Food Provided)",
        "image": "/images/events/lensverse.jpg",
        "benefits": "Participation certificate, Winning Cash prize worth ₹499",
        "date": "6th August",
        "venue": "Online Submission Portal",
        "time": "Flexible submission"
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
                ev.requires_team = item["requires_team"]
                ev.max_team_size = item["max_team_size"]
                ev.has_food = item["has_food"]
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

    registrations = db.query(models.EventRegistration).filter(
        models.EventRegistration.user_id == current_user.id,
        models.EventRegistration.status != "CANCELLED"
    ).all()

    registered_event_ids = {r.event_id for r in registrations}

    paid_registrations = [
        r for r in registrations
        if r.event_id != "techtalk"
    ]

    if paid_registrations and "techtalk" not in registered_event_ids:
        auto_techtalk_reg = models.EventRegistration(
            user_id=current_user.id,
            event_id="techtalk",
            user_email=current_user.email,
            user_name=current_user.full_name or current_user.name,
            food_preference="Veg",
            college=current_user.college,
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

    # Invalidate Redis catalog cache immediately
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

    # Invalidate Redis catalog cache immediately
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

    if event_id == "techtalk":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Tech Talk pass is automatically unlocked when you register for any technical or quiz event."
        )

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

        # 1. Process full teammate details submitted directly by Team Leader
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

                tm_name = tm_detail.name.strip() if tm_detail.name else tm_email.split('@')[0].capitalize()
                tm_phone = tm_detail.phone.strip() if tm_detail.phone else None
                tm_college = tm_detail.college.strip() if tm_detail.college else None

                # Find or auto-create teammate user
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

                teammates_to_register.append(tm_user)

        # 2. Fallback to teammate Fest IDs if passed
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

        for tm in teammates_to_register:
            tm_existing = db.query(models.EventRegistration).filter(
                models.EventRegistration.user_id == tm.id,
                models.EventRegistration.event_id == event_id,
                models.EventRegistration.status != "CANCELLED"
            ).first()

            if not tm_existing:
                tm_reg = models.EventRegistration(
                    user_id=tm.id,
                    event_id=event_id,
                    team_id=new_team_id,
                    food_preference=food_pref,
                    user_email=tm.email,
                    user_name=tm.full_name or tm.name,
                    user_phone=tm.phone or payload.phone,
                    team_name=payload.team_name.strip(),
                    college=tm.college or payload.college,
                    payment_status=initial_payment_status,
                    status="CONFIRMED"
                )
                db.add(tm_reg)

    leader_reg = models.EventRegistration(
        user_id=current_user.id,
        event_id=event_id,
        team_id=new_team_id,
        food_preference=food_pref,
        user_email=current_user.email,
        user_name=current_user.full_name or current_user.name,
        user_phone=payload.phone,
        team_name=created_team_name,
        college=payload.college or current_user.college,
        transaction_id=payload.transaction_id,
        payment_status=initial_payment_status,
        status="CONFIRMED"
    )

    db.add(leader_reg)
    db.commit()
    db.refresh(leader_reg)

    # Format member summary with generated Fest IDs for Team Leader
    registered_members = [f"{current_user.name} ({current_user.fest_id or 'Leader'})"]
    for tm in teammates_to_register:
        registered_members.append(f"{tm.name} ({tm.fest_id or 'Member'})")
    team_members_str = ", ".join(registered_members)

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


@router.post("/teams/{team_id}/invite", response_model=schemas.TeamInviteResponse)
def create_team_invite(
    team_id: str,
    payload: schemas.TeamInviteCreate,
    request: Request,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Generate a Team Magic Link Invitation for a teammate via email."""
    team = db.query(models.Team).filter(models.Team.id == team_id).first()
    if not team:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Team not found.")

    if team.leader_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only the Team Leader can send invitations.")

    token_data = {
        "team_id": team.id,
        "event_id": team.event_id,
        "invited_email": payload.email,
        "invited_by": current_user.name,
        "type": "team_invite"
    }
    invite_token = jwt.encode(token_data, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)

    db_invite = models.TeamInvite(
        team_id=team.id,
        event_id=team.event_id,
        invited_by_user_id=current_user.id,
        invited_email=payload.email,
        invite_token=invite_token,
        status="PENDING"
    )
    db.add(db_invite)
    db.commit()
    db.refresh(db_invite)

    frontend_url = get_frontend_url(request)
    invite_url = f"{frontend_url}/register?invite_token={invite_token}"

    return schemas.TeamInviteResponse(
        id=db_invite.id,
        team_id=team.id,
        event_id=team.event_id,
        invited_email=payload.email,
        invite_token=invite_token,
        invite_url=invite_url,
        status="PENDING",
        message=f"Magic invitation link created for {payload.email}!"
    )


@router.post("/teams/join-via-invite")
def join_team_via_invite(
    invite_token: str,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Validate Team Magic Link Invitation Token and join teammate to team."""
    try:
        payload = jwt.decode(invite_token, settings.JWT_SECRET_KEY, algorithms=[settings.JWT_ALGORITHM])
        if payload.get("type") != "team_invite":
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid token type.")

        team_id = payload.get("team_id")
        event_id = payload.get("event_id")
    except Exception:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid or expired magic invitation token.")

    team = db.query(models.Team).filter(models.Team.id == team_id).first()
    if not team:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Team no longer exists.")

    existing_reg = db.query(models.EventRegistration).filter(
        models.EventRegistration.user_id == current_user.id,
        models.EventRegistration.event_id == event_id,
        models.EventRegistration.status != "CANCELLED"
    ).first()

    if existing_reg:
        return {"message": f"You are already registered in team '{team.name}'."}

    new_reg = models.EventRegistration(
        user_id=current_user.id,
        event_id=event_id,
        team_id=team_id,
        food_preference="Veg",
        user_email=current_user.email,
        user_name=current_user.full_name or current_user.name,
        team_name=team.name,
        college=current_user.college,
        payment_status="COMPLETED",
        status="CONFIRMED"
    )
    db.add(new_reg)
    db.commit()

    return {"message": f"Successfully joined team '{team.name}' for Envision '26!"}


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
