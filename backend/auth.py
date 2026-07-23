import random
import string
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session
from google.oauth2 import id_token
from google.auth.transport import requests as google_requests

from database import get_db
from models import User
from schemas import GoogleToken, TokenResponse, MagicLinkRequest, MagicLinkResponse, InstantLoginRequest
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

def send_brevo_email(to_email: str, subject: str, html_content: str) -> bool:
    import requests
    brevo_api_key = getattr(settings, "BREVO_API_KEY", None)
    if not brevo_api_key:
        return False

    try:
        sender_email = getattr(settings, "SMTP_USER", "ritambera6969@gmail.com")
        headers = {
            "api-key": brevo_api_key,
            "Content-Type": "application/json",
            "Accept": "application/json"
        }
        payload = {
            "sender": {"name": "Envision TechFest", "email": sender_email},
            "to": [{"email": to_email}],
            "subject": subject,
            "htmlContent": html_content
        }
        resp = requests.post("https://api.brevo.com/v3/smtp/email", json=payload, headers=headers, timeout=5)
        if resp.status_code in (200, 201):
            print(f"[+] Brevo HTTP Email successfully sent to {to_email}")
            return True
        else:
            print(f"[!] Brevo HTTP Error ({resp.status_code}): {resp.text}")
            return False
    except Exception as e:
        print(f"[!] Brevo HTTP Notice: {e}")
        return False

def send_smtp_email(to_email: str, subject: str, html_content: str) -> bool:
    import smtplib
    from email.mime.text import MIMEText
    from email.mime.multipart import MIMEMultipart

    smtp_user = getattr(settings, "SMTP_USER", None)
    smtp_password = getattr(settings, "SMTP_PASSWORD", None)

    if not smtp_user or not smtp_password:
        return False

    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = f"Envision TechFest <{smtp_user}>"
        msg["To"] = to_email
        msg.attach(MIMEText(html_content, "html"))

        clean_pwd = smtp_password.replace(" ", "").strip()

        with smtplib.SMTP("smtp.gmail.com", 587, timeout=8) as server:
            server.starttls()
            server.login(smtp_user, clean_pwd)
            server.sendmail(smtp_user, [to_email], msg.as_string())
        print(f"[+] Successfully dispatched magic email to {to_email} via Gmail SMTP")
        return True
    except Exception as e:
        print(f"[!] Gmail SMTP Delivery Error: {e}")
        return False

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
        if not user.fest_id or not user.fest_id.startswith("ENV-2026-") or not user.fest_id.replace("ENV-2026-", "").isdigit():
            user.fest_id = generate_fest_id(db)
        if payload.name and payload.name.strip() and user.name != payload.name.strip():
            user.name = payload.name.strip()
        db.commit()
        db.refresh(user)

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

    html_content = f"""
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

    # 1. Try Brevo HTTP API (Port 443 HTTPS - Never blocked by Render cloud!)
    if send_brevo_email(email, "⚡ Your Magic Invitation Link for Envision TechFest", html_content):
        return {
            "message": f"Magic invitation link sent to {email}! Please check your inbox.",
            "magic_url": magic_url
        }

    # 2. Try Gmail SMTP (Port 587 - Works on localhost)
    if send_smtp_email(email, "⚡ Your Magic Invitation Link for Envision TechFest", html_content):
        return {
            "message": f"Magic invitation link sent to {email}! Please check your inbox.",
            "magic_url": magic_url
        }

    # 2. Fallback to Resend API
    resend_success = False
    resend_error = None
    try:
        resend_headers = {
            "Authorization": f"Bearer {settings.RESEND_API_KEY}",
            "Content-Type": "application/json"
        }
        resend_payload = {
            "from": "Envision TechFest <onboarding@resend.dev>",
            "to": [email],
            "subject": "⚡ Your Magic Invitation Link for Envision TechFest",
            "html": html_content
        }
        resp = requests.post("https://api.resend.com/emails", json=resend_payload, headers=resend_headers, timeout=5)
        if resp.status_code in (200, 201):
            resend_success = True
        else:
            try:
                err_json = resp.json()
                resend_error = err_json.get("message") or resp.text
            except Exception:
                resend_error = resp.text
            print(f"[!] Resend Email Error ({resp.status_code}): {resend_error}")
    except Exception as e:
        resend_error = str(e)
        print(f"[!] Resend Email Notice: {e}")

    if resend_success:
        return {
            "message": f"Magic invitation link sent to {email}! Please check your inbox.",
            "magic_url": magic_url
        }
    else:
        return {
            "message": f"Magic link generated for {email}. Click the direct button below to sign in instantly!",
            "magic_url": magic_url
        }


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


