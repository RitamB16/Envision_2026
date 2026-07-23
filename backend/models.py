import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Boolean, DateTime, Integer, ForeignKey
from database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(String, primary_key=True, index=True, default=lambda: str(uuid.uuid4()))
    email = Column(String, unique=True, index=True, nullable=False)
    name = Column(String, nullable=False)
    fest_id = Column(String, unique=True, index=True, nullable=True)
    college = Column(String, nullable=True)
    department = Column(String, nullable=True, default="Computer Science")
    gender = Column(String, nullable=True)
    phone = Column(String, nullable=True)
    role = Column(String, default="PARTICIPANT", nullable=False)
    is_approved = Column(Boolean, default=True, nullable=False)
    profile_picture = Column(String, nullable=True)
    full_name = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)


class Event(Base):
    __tablename__ = "events"

    id = Column(String, primary_key=True, index=True)
    name = Column(String, nullable=False)
    price = Column(String, nullable=False)
    requires_team = Column(Boolean, default=False, nullable=False)
    max_team_size = Column(Integer, default=1, nullable=False)
    has_food = Column(Boolean, default=True, nullable=False)
    category = Column(String, nullable=False, default="GENERAL")
    price_amount = Column(Integer, default=0, nullable=False)
    notes = Column(String, nullable=True)
    image = Column(String, nullable=True)
    benefits = Column(String, nullable=True)
    date = Column(String, nullable=True)
    venue = Column(String, nullable=True)
    time = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)


class Team(Base):
    __tablename__ = "teams"

    id = Column(String, primary_key=True, index=True, default=lambda: f"TEAM-{str(uuid.uuid4())[:8].upper()}")
    name = Column(String, nullable=False)
    event_id = Column(String, ForeignKey("events.id"), nullable=False, index=True)
    leader_id = Column(String, ForeignKey("users.id"), nullable=False, index=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)


class EventRegistration(Base):
    __tablename__ = "event_registrations"

    id = Column(String, primary_key=True, index=True, default=lambda: f"REG-{str(uuid.uuid4())[:8].upper()}")
    user_id = Column(String, ForeignKey("users.id"), nullable=False, index=True)
    event_id = Column(String, ForeignKey("events.id"), nullable=False, index=True)
    team_id = Column(String, ForeignKey("teams.id"), nullable=True, index=True)
    food_preference = Column(String, nullable=True, default="Veg")
    payment_status = Column(String, default="PENDING", nullable=False)
    user_email = Column(String, nullable=True)
    user_name = Column(String, nullable=True)
    user_phone = Column(String, nullable=True)
    team_name = Column(String, nullable=True)
    team_members = Column(String, nullable=True)
    college = Column(String, nullable=True)
    transaction_id = Column(String, nullable=True)
    razorpay_order_id = Column(String, nullable=True, index=True)
    status = Column(String, default="CONFIRMED", nullable=False)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)


class TeamInvite(Base):
    __tablename__ = "team_invites"

    id = Column(String, primary_key=True, index=True, default=lambda: f"INV-{str(uuid.uuid4())[:8].upper()}")
    team_id = Column(String, nullable=False, index=True)
    event_id = Column(String, nullable=False)
    invited_by_user_id = Column(String, nullable=False)
    invited_email = Column(String, nullable=False, index=True)
    invite_token = Column(String, unique=True, index=True, nullable=False)
    status = Column(String, default="PENDING", nullable=False)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
