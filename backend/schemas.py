from typing import Optional, List, Union
from datetime import datetime
from uuid import UUID
from pydantic import BaseModel, ConfigDict, EmailStr

class UserBase(BaseModel):
    email: EmailStr
    name: str

class UserResponse(BaseModel):
    id: Union[UUID, str]
    email: str
    name: str
    fest_id: Optional[str] = None
    role: Optional[str] = "PARTICIPANT"
    is_approved: Optional[bool] = True
    profile_picture: Optional[str] = None
    department: Optional[str] = "Computer Science"
    full_name: Optional[str] = None
    gender: Optional[str] = None
    college: Optional[str] = None
    phone: Optional[str] = None
    created_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)

class UserProfileUpdate(BaseModel):
    full_name: Optional[str] = None
    gender: Optional[str] = None
    college: Optional[str] = None
    department: Optional[str] = None
    phone: Optional[str] = None

class GoogleToken(BaseModel):
    token: Optional[str] = None
    id_token: Optional[str] = None

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse

class MagicLinkRequest(BaseModel):
    email: EmailStr

class InstantLoginRequest(BaseModel):
    email: EmailStr
    name: Optional[str] = None

class MagicLinkResponse(BaseModel):
    message: str
    magic_url: Optional[str] = None

class EventResponse(BaseModel):
    id: str
    name: str
    category: Optional[str] = "GENERAL"
    price: Optional[str] = "FREE"
    price_amount: Optional[Union[int, float, str]] = 0
    requires_team: Optional[bool] = False
    max_team_size: Optional[int] = 1
    has_food: Optional[bool] = True
    max_capacity: Optional[int] = 100
    notes: Optional[str] = None
    image: Optional[str] = None
    benefits: Optional[str] = None
    date: Optional[str] = None
    venue: Optional[str] = None
    time: Optional[str] = None
    created_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)

class TeammateDetail(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    college: Optional[str] = None
    food_preference: Optional[str] = "Veg"

class EventRegistrationCreate(BaseModel):
    event_id: str
    phone: Optional[str] = None
    team_name: Optional[str] = None
    teammate_details: Optional[List[TeammateDetail]] = None
    teammate_fest_ids: Optional[List[str]] = None
    teammate_emails: Optional[List[str]] = None
    food_preference: Optional[str] = "Veg" # Veg or Non-Veg
    college: Optional[str] = None
    transaction_id: Optional[str] = None

class EventRegistrationResponse(BaseModel):
    id: Union[UUID, str]
    user_id: Union[UUID, str]
    event_id: Union[UUID, str]
    team_id: Optional[Union[UUID, str]] = None
    food_preference: Optional[str] = None
    user_email: Optional[str] = None
    user_name: Optional[str] = None
    user_phone: Optional[str] = None
    team_name: Optional[str] = None
    team_members: Optional[str] = None
    college: Optional[str] = None
    transaction_id: Optional[str] = None
    razorpay_order_id: Optional[str] = None
    payment_status: Optional[str] = "PENDING"
    status: Optional[str] = "PENDING"
    created_at: Optional[datetime] = None
    event: Optional[EventResponse] = None

    model_config = ConfigDict(from_attributes=True)

class TeamInviteCreate(BaseModel):
    email: EmailStr

class TeamInviteResponse(BaseModel):
    id: Union[UUID, str]
    team_id: Union[UUID, str]
    event_id: Union[UUID, str]
    invited_email: str
    invite_token: Optional[str] = None
    invite_url: Optional[str] = None
    status: Optional[str] = "PENDING"
    message: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)

class SoloRegistrationCreate(BaseModel):
    event_name: str
    name: str
    email: EmailStr
    mobile: Optional[str] = None
    college: Optional[str] = None
    food_pref: Optional[str] = None

class ParticipantTeammateDetail(BaseModel):
    name: str
    email: EmailStr
    mobile: Optional[str] = None
    college: Optional[str] = None
    food_pref: Optional[str] = "Veg"

class TeamRegistrationCreate(BaseModel):
    team_name: str
    event_name: str
    leader_name: str
    leader_email: EmailStr
    leader_mobile: Optional[str] = None
    leader_college: Optional[str] = None
    leader_food_pref: Optional[str] = None
    members: List[ParticipantTeammateDetail] = []