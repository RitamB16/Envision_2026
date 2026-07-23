from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from database import get_db
from models import User
from schemas import UserResponse, UserProfileUpdate
from security import get_current_user

router = APIRouter(prefix="/users", tags=["Users"])

@router.get("/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Returns profile data for the authenticated student/user."""
    if not current_user.fest_id or not current_user.fest_id.startswith("ENV-2026-") or not current_user.fest_id.replace("ENV-2026-", "").isdigit():
        from auth import generate_fest_id
        current_user.fest_id = generate_fest_id(db)
        db.commit()
        db.refresh(current_user)
    return current_user

@router.put("/me/profile", response_model=UserResponse)
def update_profile(
    profile_data: UserProfileUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Updates profile information for the authenticated user."""
    if profile_data.full_name is not None:
        current_user.full_name = profile_data.full_name
        current_user.name = profile_data.full_name
    if profile_data.gender is not None:
        current_user.gender = profile_data.gender
    if profile_data.college is not None:
        current_user.college = profile_data.college
    if profile_data.department is not None:
        current_user.department = profile_data.department
    if profile_data.phone is not None:
        current_user.phone = profile_data.phone

    db.commit()
    db.refresh(current_user)
    return current_user
