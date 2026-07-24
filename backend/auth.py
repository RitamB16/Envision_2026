import random
import string
from sqlalchemy.orm import Session
from google.oauth2 import id_token
from google.auth.transport import requests as google_requests

from database import get_db
from models import User
from schemas import GoogleToken, TokenResponse, InstantLoginRequest
from security import create_access_token
from config import settings

from fastapi import APIRouter, Depends, HTTPException, status, Request, Response
from limiter import limiter

router = APIRouter(prefix="/auth", tags=["Authentication"])

def generate_fest_id(db: Session) -> str:
    """Generates an auto-incrementing Fest ID in format ENV-2026-001, ENV-2026-002, etc."""
    users = db.query(User).filter(User.fest_id.isnot(None)).all()
    max_num = 0
    for u in users:
        if u.fest_id and "ENV-2026-" in u.fest_id.upper():
            suffix = u.fest_id.upper().split("ENV-2026-")[-1]
            if suffix.isdigit():
                max_num = max(max_num, int(suffix))
    next_num = max_num + 1
    return f"ENV-2026-{next_num:03d}"

def ensure_valid_fest_id(user: User, db: Session) -> bool:
    """Checks if a user has a valid Fest ID, and generates one if they don't."""
    if not user.fest_id or not user.fest_id.startswith("ENV-2026-") or not user.fest_id.replace("ENV-2026-", "").isdigit():
        user.fest_id = generate_fest_id(db)
        return True
    return False

def get_frontend_url(request: Request) -> str:
    origin = request.headers.get("origin") or request.headers.get("referer")
    if origin:
        from urllib.parse import urlparse
        parsed = urlparse(origin)
        if parsed.scheme and parsed.netloc:
            return f"{parsed.scheme}://{parsed.netloc}"
    return getattr(settings, "FRONTEND_URL", "https://envision-2026-seven.vercel.app")

def set_auth_cookie(response: Response, request: Request, access_token: str):
    origin = request.headers.get("origin", "")
    is_https = request.url.scheme == "https" or "vercel.app" in origin or "https" in origin
    samesite_val = "none" if is_https else "lax"
    secure_val = True if is_https else False

    response.set_cookie(
        key="access_token",
        value=f"Bearer {access_token}",
        httponly=True,
        samesite=samesite_val,
        secure=secure_val,
        path="/"
    )

def clear_auth_cookie(response: Response, request: Request):
    origin = request.headers.get("origin", "")
    is_https = request.url.scheme == "https" or "vercel.app" in origin or "https" in origin
    
    response.delete_cookie(
        key="access_token",
        path="/",
        samesite="none" if is_https else "lax",
        secure=True if is_https else False
    )

@router.post("/google", response_model=TokenResponse)
@limiter.limit("3/minute")
def google_login(request: Request, response: Response, token_data: GoogleToken, db: Session = Depends(get_db)):
    raw_token = token_data.id_token or token_data.token
    if not raw_token:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Token or id_token is required"
        )
    email = None
    name = ""
    picture = None

    # Try ID token verification first
    try:
        id_info = id_token.verify_oauth2_token(
            raw_token,
            google_requests.Request(),
            settings.GOOGLE_CLIENT_ID
        )
        email = id_info.get("email")
        name = id_info.get("name", "")
        picture = id_info.get("picture")
    except Exception:
        # Fallback to Google UserInfo endpoint using OAuth access_token
        try:
            import requests
            resp = requests.get(
                "https://www.googleapis.com/oauth2/v3/userinfo",
                headers={"Authorization": f"Bearer {raw_token}"},
                timeout=5
            )
            if resp.status_code == 200:
                info = resp.json()
                email = info.get("email")
                name = info.get("name", "")
                picture = info.get("picture")
        except Exception as e:
            print(f"Userinfo fetch error: {e}")

    if not email:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired Google token"
        )

    user = db.query(User).filter(User.email == email).first()
    if not user:
        fest_id = generate_fest_id(db)
        user = User(
            email=email,
            name=name,
            fest_id=fest_id
        )
        # Safely add profile_picture only if it exists in your model
        if hasattr(user, 'profile_picture'):
            user.profile_picture = picture
            
        db.add(user)
        db.commit()
        db.refresh(user)
    else:
        made_changes = ensure_valid_fest_id(user, db)
        
        # Safely update profile_picture only if it exists in your model
        if picture and hasattr(user, 'profile_picture') and user.profile_picture != picture:
            user.profile_picture = picture
            made_changes = True
            
        if made_changes:
            db.commit()
            db.refresh(user)

    access_token = create_access_token(
        data={
            "sub": str(user.id),
            "role": user.role,
            "fest_id": user.fest_id
        }
    )

    # Set secure HttpOnly cookie
    set_auth_cookie(response, request, access_token)

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": user
    }

@router.post("/logout")
def logout(response: Response, request: Request):
    """Clears HttpOnly authentication cookie."""
    clear_auth_cookie(response, request)
    return {"message": "Successfully logged out"}

@router.post("/instant-login", response_model=TokenResponse)
@limiter.limit("10/minute")
def instant_login(
    request: Request,
    response: Response,
    payload: InstantLoginRequest,
    db: Session = Depends(get_db)
):
    """Direct instant on-screen sign-in and sign-up without email dependency."""
    email = payload.email.strip().lower()
    user = db.query(User).filter(User.email == email).first()
    if not user:
        raw_name = payload.name.strip() if payload.name and payload.name.strip() else email.split('@')[0].capitalize()
        fest_id = generate_fest_id(db)
        user = User(
            email=email,
            name=raw_name,
            fest_id=fest_id
        )
        db.add(user)
        db.commit()
        db.refresh(user)
    else:
        made_changes = ensure_valid_fest_id(user, db)
        if payload.name and payload.name.strip() and user.name != payload.name.strip():
            user.name = payload.name.strip()
            made_changes = True
            
        if made_changes:
            db.commit()
            db.refresh(user)

    access_token = create_access_token(
        data={
            "sub": str(user.id),
            "role": user.role,
            "fest_id": user.fest_id
        }
    )

    set_auth_cookie(response, request, access_token)

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": user
    }