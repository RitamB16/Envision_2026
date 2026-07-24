import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Boolean, DateTime, Integer, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from database import Base

class User(Base):
    __tablename__ = "participants"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    auth_id = Column(UUID(as_uuid=True), unique=True, nullable=True)
    env_id = Column(String, unique=True, index=True, nullable=True)
    name = Column(String, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    mobile = Column(String, nullable=True)
    college = Column(String, nullable=True)
    food_pref = Column(String, nullable=True)

    @property
    def phone(self):
        return self.mobile

    @phone.setter
    def phone(self, value):
        self.mobile = value

    @property
    def fest_id(self):
        return self.env_id or "ENV-2026-000"

    @property
    def role(self):
        return "PARTICIPANT"


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
    max_capacity = Column(Integer, default=100, nullable=False)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)


class Team(Base):
    __tablename__ = "teams"

    team_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    team_name = Column(String, nullable=False)
    event_name = Column(String, nullable=False)
    leader_id = Column(UUID(as_uuid=True), ForeignKey("participants.id", ondelete="CASCADE"), nullable=False)


class Registration(Base):
    __tablename__ = "registrations"

    reg_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    participant_id = Column(UUID(as_uuid=True), ForeignKey("participants.id", ondelete="CASCADE"), nullable=False)
    event_name = Column(String, nullable=False)
    team_id = Column(UUID(as_uuid=True), ForeignKey("teams.team_id", ondelete="SET NULL"), nullable=True)
    payment_order_id = Column(String, nullable=False)
    payment_status = Column(String, nullable=False, default="PENDING")
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
