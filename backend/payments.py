import re
import uuid
from datetime import datetime, timezone
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status, Request
from pydantic import BaseModel
from sqlalchemy.orm import Session

from database import get_db
import models
from security import get_current_user
from limiter import limiter
from registration import normalize_event_id

router = APIRouter(prefix="/payments", tags=["payments"])


def is_valid_uuid(val: str) -> bool:
    if not val:
        return False
    try:
        uuid.UUID(str(val))
        return True
    except (ValueError, TypeError):
        return False


class VerifyUPIPaymentRequest(BaseModel):
    registration_id: str
    utr_number: str
    event_name: Optional[str] = None
    email: Optional[str] = None
    user_email: Optional[str] = None


class CreateOrderRequest(BaseModel):
    registration_id: str


class AdminVerifyPaymentRequest(BaseModel):
    registration_id: str
    action: str = "APPROVE"  # APPROVE or REJECT


@router.post("/verify-upi")
@router.post("/submit-utr")
@router.post("/verify")
@limiter.limit("10/minute")
def verify_upi_payment(
    request: Request,
    payload: VerifyUPIPaymentRequest,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    r"""
    Direct Secure UPI Payment & 12-Digit UTR Reference Number Verification Endpoint.
    1. Server-side strict 12-digit numeric UTR regex validation (^\d{12}$).
    2. Safe UUID & Multi-Field Registration Lookup (prevents PostgreSQL UUID DataErrors).
    3. Self-Healing Auto-Creation: If registration record was missing, creates it in DB automatically.
    4. Fraud Prevention: Blocks duplicate UTR reuse across registrations.
    5. Updates payment_status to PENDING_VERIFICATION & saves UTR reference to Database.
    """
    utr = payload.utr_number.strip()

    # 1. Server-side strict 12-digit numeric UTR regex validation
    if not re.match(r"^\d{12}$", utr):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid UTR format. Please enter a valid 12-digit numeric UPI UTR / Ref number from your payment app receipt (e.g., 420185938210)."
        )

    utr_txn_id = f"UTR-{utr}"
    reg = None
    reg_id_raw = (payload.registration_id or "").strip()

    # 2. Safe UUID Lookup (prevents psycopg2.errors.InvalidTextRepresentation)
    if reg_id_raw and is_valid_uuid(reg_id_raw):
        reg = db.query(models.Registration).filter(
            models.Registration.reg_id == reg_id_raw
        ).first()

    # 3. Lookup by payment_order_id if reg is not found yet
    if not reg and reg_id_raw:
        reg = db.query(models.Registration).filter(
            models.Registration.payment_order_id == reg_id_raw
        ).first()

    # 4. Lookup by participant ID / user email + event_name
    target_email = (payload.email or payload.user_email or current_user.email or "").strip().lower()
    target_user = current_user
    if target_email and target_email != current_user.email.lower():
        found_usr = db.query(models.User).filter(models.User.email == target_email).first()
        if found_usr:
            target_user = found_usr

    if not reg and target_user:
        reg_query = db.query(models.Registration).filter(
            models.Registration.participant_id == target_user.id
        )
        if payload.event_name:
            reg_query = reg_query.filter(models.Registration.event_name.ilike(payload.event_name.strip()))
        reg = reg_query.order_by(models.Registration.created_at.desc()).first()

    # 5. Self-Healing Auto-Creation: If registration row does not exist in DB yet, create it right now!
    if not reg:
        event_title = payload.event_name.strip() if payload.event_name else "ENVISION TRACK"
        reg = models.Registration(
            participant_id=target_user.id,
            event_name=event_title,
            payment_order_id=utr_txn_id,
            payment_status="PENDING_VERIFICATION"
        )
        db.add(reg)
        db.flush()

    # 6. State Validation: Block redundant UTR submission on completed registrations
    if reg.payment_status in ("COMPLETED", "SUCCESS", "PAID", "CONFIRMED", "VERIFIED"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This registration is already paid and confirmed."
        )

    # 7. Fraud Prevention: Block duplicate UTR reuse across ALL registrations
    existing_utr = db.query(models.Registration).filter(
        (models.Registration.payment_order_id == utr_txn_id)
    ).first()

    if existing_utr and str(existing_utr.reg_id) != str(reg.reg_id):
        client_ip = request.client.host if request.client else "unknown"
        print(f"[SECURITY ALERT - DUPLICATE UTR ATTEMPT] User: {target_user.id} ({target_user.email}) | Reg: {reg.reg_id} | Duplicate UTR: {utr} | IP: {client_ip}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="SECURITY ERROR: This 12-digit UTR number has already been submitted for another registration. Each payment receipt UTR can only be used once."
        )

    # 8. Administrative Audit Trail Logging
    client_ip = request.client.host if request.client else "unknown"
    user_agent = request.headers.get("user-agent", "unknown")
    timestamp_str = datetime.now(timezone.utc).isoformat()
    
    print(f"[AUDIT LOG - UTR SUBMISSION SUCCESS] Timestamp: {timestamp_str} | User ID: {target_user.id} | Email: {target_user.email} | Reg ID: {reg.reg_id} | Event: {reg.event_name} | UTR: {utr} | IP: {client_ip} | UserAgent: {user_agent}")

    # 9. Update registration payment status to PENDING_VERIFICATION & store UTR transaction ID in DB
    reg.payment_status = "PENDING_VERIFICATION"
    reg.payment_order_id = utr_txn_id

    # 10. Sync teammates if part of a team registration
    if reg.team_id:
        teammate_regs = db.query(models.Registration).filter(
            models.Registration.team_id == reg.team_id
        ).all()
        for tm_reg in teammate_regs:
            tm_reg.payment_status = "PENDING_VERIFICATION"
            tm_reg.payment_order_id = utr_txn_id

    db.commit()
    db.refresh(reg)

    return {
        "status": "pending_verification",
        "message": "12-digit UTR recorded successfully in Database. Registration status updated to PENDING_VERIFICATION.",
        "utr": utr,
        "registration_id": str(reg.reg_id),
        "payment_status": "PENDING_VERIFICATION",
        "timestamp": timestamp_str
    }


def find_event_by_registration_name(db: Session, reg_event_name: str) -> Optional[models.Event]:
    if not reg_event_name:
        return None
    canonical_id = normalize_event_id(reg_event_name)
    return db.query(models.Event).filter(
        (models.Event.id == canonical_id) |
        (models.Event.name.ilike(reg_event_name))
    ).first()


@router.post("/create-order")
@limiter.limit("10/minute")
def create_upi_order(
    request: Request,
    payload: CreateOrderRequest,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Generates or fetches order reference for direct UPI payment flow.
    """
    reg = db.query(models.Registration).filter(
        models.Registration.reg_id == payload.registration_id,
        models.Registration.participant_id == current_user.id
    ).first()

    if not reg:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Registration record not found."
        )

    if reg.payment_status in ("COMPLETED", "SUCCESS"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Registration is already paid and completed."
        )

    event = find_event_by_registration_name(db, reg.event_name)
    price_amount = event.price_amount if (event and event.price_amount) else (reg.amount or 49)
    event_display_name = event.name if event else reg.event_name

    order_id = reg.payment_order_id or f"ENV26-ORD-{uuid.uuid4().hex[:6].upper()}"
    if not reg.payment_order_id:
        reg.payment_order_id = order_id
        db.commit()

    upi_id = os.getenv("FEST_UPI_ID") or getattr(settings, "FEST_UPI_ID", "8336048128@oksbi")

    return {
        "status": "success",
        "order_id": order_id,
        "amount": price_amount,
        "event_name": event_display_name,
        "currency": "INR",
        "upi_id": upi_id
    }


@router.get("/registration/{registration_id}")
def get_registration_details_for_checkout(
    registration_id: str,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Fetches exact registration & event details from the database for checkout page refresh resilience.
    """
    reg = db.query(models.Registration).filter(
        models.Registration.reg_id == registration_id,
        models.Registration.participant_id == current_user.id
    ).first()

    if not reg:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Registration record not found."
        )

    event = find_event_by_registration_name(db, reg.event_name)
    price_amount = event.price_amount if (event and event.price_amount) else (reg.amount or 49)
    event_display_name = event.name if event else reg.event_name

    return {
        "registration_id": reg.reg_id,
        "event_name": event_display_name,
        "amount": price_amount,
        "payment_status": reg.payment_status,
        "participant_name": current_user.full_name or current_user.name,
        "fest_id": current_user.fest_id
    }


@router.post("/admin/approve-utr")
def admin_approve_utr(
    payload: AdminVerifyPaymentRequest,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Administrative Endpoint to manually approve/reject UTR payment records after bank statement cross-referencing.
    """
    if current_user.role not in ("ADMIN", "COORDINATOR", "SUPERADMIN"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied. Administrator privileges required for manual bank verification approval."
        )

    reg = db.query(models.Registration).filter(
        models.Registration.reg_id == payload.registration_id
    ).first()

    if not reg:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Registration record not found."
        )

    action_clean = (payload.action or "").upper().strip()
    is_approval = action_clean in ("APPROVE", "CONFIRM", "CONFIRMED", "PAID", "SUCCESS", "COMPLETED")
    target_status = "PAID" if is_approval else "REJECTED"
    reg.payment_status = target_status

    if reg.team_id:
        teammate_regs = db.query(models.Registration).filter(
            models.Registration.team_id == reg.team_id
        ).all()
        for tm_reg in teammate_regs:
            tm_reg.payment_status = target_status

    db.commit()

    # Auto-enroll in Tech Talk & dispatch confirmation email upon successful payment approval
    if is_approval:
        from registration import auto_enroll_techtalk
        from email_utils import dispatch_registration_approval_email_sync, dispatch_techtalk_confirmation_email_sync, normalize_event_id

        target_regs = [reg]
        if reg.team_id:
            team_regs = db.query(models.Registration).filter(models.Registration.team_id == reg.team_id).all()
            if team_regs:
                target_regs = team_regs

        utr_val = getattr(reg, "utr_number", None) or getattr(reg, "payment_order_id", None) or "VERIFIED"
        canonical_event_id = normalize_event_id(reg.event_name)
        clean_ev = reg.event_name.lower().replace(" ", "-").strip()

        for member_reg in target_regs:
            member_reg.payment_status = target_status
            auto_enroll_techtalk(db, member_reg.participant_id)

            tm_user = db.query(models.User).filter(models.User.id == member_reg.participant_id).first()
            if tm_user and tm_user.email:
                tm_name = (tm_user.full_name or tm_user.name) or "Participant"
                tm_fest_id = tm_user.fest_id or "ENV26-001"

                if clean_ev in ("techtalk", "tech-talk"):
                    sent_ok = dispatch_techtalk_confirmation_email_sync(
                        to_email=tm_user.email,
                        participant_name=tm_name,
                        fest_id=tm_fest_id,
                        registration_id=str(member_reg.reg_id)
                    )
                else:
                    sent_ok = dispatch_registration_approval_email_sync(
                        to_emails=[tm_user.email],
                        participant_name=tm_name,
                        fest_id=tm_fest_id,
                        registration_id=str(member_reg.reg_id),
                        event_name=member_reg.event_name,
                        event_id=canonical_event_id,
                        utr_number=utr_val
                    )
                if sent_ok:
                    member_reg.email_sent = True

        db.commit()

    return {
        "status": "success",
        "message": f"Registration '{reg.reg_id}' status updated to {target_status} after manual bank audit. Confirmation emails dispatched.",
        "registration_id": str(reg.reg_id),
        "payment_status": target_status
    }