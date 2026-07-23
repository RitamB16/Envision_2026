import random
import string
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session
from google.oauth2 import id_token
from google.auth.transport import requests as google_requests

from database import get_db
from models import User
from schemas import GoogleToken, TokenResponse, MagicLinkRequest, MagicLinkResponse
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
            fest_id=fest_id,
            profile_picture=picture
        )
        db.add(user)
        db.commit()
        db.refresh(user)
    else:
        if not user.fest_id or not user.fest_id.startswith("ENV-2026-") or not user.fest_id.replace("ENV-2026-", "").isdigit():
            user.fest_id = generate_fest_id(db)
        if picture and user.profile_picture != picture:
            user.profile_picture = picture
        db.commit()
        db.refresh(user)

    access_token = create_access_token(
        data={
            "sub": user.id,
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
    origin = request.headers.get("origin", "")
    is_https = request.url.scheme == "https" or "vercel.app" in origin or "https" in origin
    samesite_val = "none" if is_https else "lax"
    secure_val = True if is_https else False

    response.delete_cookie(
        key="access_token",
        path="/",
        samesite=samesite_val,
        secure=secure_val
    )
    return {"message": "Successfully logged out"}

@router.post("/magic-link", response_model=MagicLinkResponse)
@limiter.limit("3/minute")
def send_magic_link(request: Request, request_data: MagicLinkRequest, db: Session = Depends(get_db)):
    import requests
    from datetime import timedelta

    email = request_data.email

    user = db.query(User).filter(User.email == email).first()
    if not user:
        name_part = email.split('@')[0].capitalize()
        fest_id = generate_fest_id(db)
        user = User(
            email=email,
            name=name_part,
            fest_id=fest_id
        )
        db.add(user)
        db.commit()
        db.refresh(user)
    else:
        if not user.fest_id or not user.fest_id.startswith("ENV-2026-") or not user.fest_id.replace("ENV-2026-", "").isdigit():
            user.fest_id = generate_fest_id(db)
            db.commit()
            db.refresh(user)

    magic_token = create_access_token(
        data={"sub": user.id, "email": user.email, "type": "magic_link"},
        expires_delta=timedelta(minutes=15)
    )

    frontend_url = get_frontend_url(request)
    magic_url = f"{frontend_url}/login?magic_token={magic_token}"

    # Dispatch email via Resend API
    try:
        resend_headers = {
            "Authorization": f"Bearer {settings.RESEND_API_KEY}",
            "Content-Type": "application/json"
        }
        resend_payload = {
            "from": "Envision TechFest <onboarding@resend.dev>",
            "to": [email],
            "subject": "⚡ Your Magic Invitation Link for Envision TechFest",
            "html": f"""
            <div style="font-family: Arial, sans-serif; background-color: #060212; color: #ffffff; padding: 30px; border-radius: 10px;">
                <h2 style="color: #00f3ff; text-transform: uppercase;">Welcome to Envision TechFest</h2>
                <p>Hello <strong>{user.name}</strong>,</p>
                <p>Click the button below to complete your sign-in to Envision TechFest:</p>
                <p style="margin: 25px 0;">
                    <a href="{magic_url}" style="background: #a855f7; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
                        SIGN IN TO TECHFEST
                    </a>
                </p>
                <p style="color: #888; font-size: 12px;">Your Fest ID: <strong>{user.fest_id}</strong></p>
            </div>
            """
        }
        requests.post("https://api.resend.com/emails", json=resend_payload, headers=resend_headers, timeout=5)
    except Exception as e:
        print(f"Resend Email Notice: {e}")

    return {"message": f"Magic invitation link sent to {email}! Please check your inbox."}


class VerifyMagicLinkRequest(BaseModel):
    token: str


@router.post("/verify-magic-link", response_model=TokenResponse)
def verify_magic_link(
    payload: VerifyMagicLinkRequest,
    request: Request,
    response: Response,
    db: Session = Depends(get_db)
):
    """Verifies magic link token, sets HttpOnly cookie, and authenticates user session."""
    from jose import jwt
    try:
        decoded = jwt.decode(payload.token, settings.JWT_SECRET_KEY, algorithms=[settings.JWT_ALGORITHM])
        if decoded.get("type") != "magic_link":
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid token type.")
        user_id = decoded.get("sub")
    except Exception:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid or expired magic link token.")

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User record not found.")

    access_token = create_access_token(
        data={
            "sub": user.id,
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


