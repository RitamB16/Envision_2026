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

router = APIRouter(prefix="/payments", tags=["payments"])


class VerifyUPIPaymentRequest(BaseModel):
    registration_id: str
    utr_number: str


class CreateOrderRequest(BaseModel):
    registration_id: str


@router.post("/verify-upi")
@router.post("/submit-utr")
@router.post("/verify")
@limiter.limit("5/minute")
def verify_upi_payment(
    request: Request,
    payload: VerifyUPIPaymentRequest,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    r"""
    Direct Secure UPI Payment & 12-Digit UTR Reference Number Verification Endpoint.
    1. Rate-Limited to 5 requests / minute per IP (SlowAPI).
    2. Server-side strict 12-digit numeric UTR regex validation (^\d{12}$).
    3. Enforces participant authorization & ownership.
    4. Validates registration state (blocks re-submitting for already COMPLETED orders).
    5. Blocks duplicate UTR reuse across multiple registrations.
    6. Records administrative audit log with IP, Timestamp, User ID, and UTR.
    """
    utr = payload.utr_number.strip()

    # 1. Server-side strict 12-digit numeric UTR regex validation
    if not re.match(r"^\d{12}$", utr):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid UTR format. Please enter a valid 12-digit numeric UPI UTR / Ref number from your payment app receipt (e.g., 420185938210)."
        )

    # 2. Verify participant ownership & fetch record
    reg = db.query(models.Registration).filter(
        models.Registration.reg_id == payload.registration_id,
        models.Registration.participant_id == current_user.id
    ).first()

    if not reg:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Registration record not found or access denied."
        )

    # 3. State Validation: Block redundant UTR submission on completed registrations
    if reg.payment_status in ("COMPLETED", "SUCCESS"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This registration is already paid and completed."
        )

    # 4. Fraud Prevention: Block duplicate UTR reuse across ALL registrations
    utr_txn_id = f"UTR-{utr}"
    existing_utr = db.query(models.Registration).filter(
        (models.Registration.payment_order_id == utr_txn_id)
    ).first()

    if existing_utr and str(existing_utr.reg_id) != str(reg.reg_id):
        client_ip = request.client.host if request.client else "unknown"
        print(f"[SECURITY ALERT - DUPLICATE UTR ATTEMPT] User: {current_user.id} ({current_user.email}) | Reg: {reg.reg_id} | Duplicate UTR: {utr} | IP: {client_ip}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="SECURITY ERROR: This 12-digit UTR number has already been submitted for another registration. Each payment receipt UTR can only be used once."
        )

    # 5. Administrative Audit Trail Logging
    client_ip = request.client.host if request.client else "unknown"
    user_agent = request.headers.get("user-agent", "unknown")
    timestamp_str = datetime.now(timezone.utc).isoformat()
    
    print(f"[AUDIT LOG - UTR SUBMISSION SUCCESS] Timestamp: {timestamp_str} | User ID: {current_user.id} | Email: {current_user.email} | Reg ID: {reg.reg_id} | Event: {reg.event_name} | UTR: {utr} | IP: {client_ip} | UserAgent: {user_agent}")

    # 6. Update registration payment status & store UTR transaction ID
    reg.payment_status = "COMPLETED"
    reg.payment_order_id = utr_txn_id

    # 7. Sync teammates if part of a team registration
    if reg.team_id:
        teammate_regs = db.query(models.Registration).filter(
            models.Registration.team_id == reg.team_id
        ).all()
        for tm_reg in teammate_regs:
            tm_reg.payment_status = "COMPLETED"
            tm_reg.payment_order_id = utr_txn_id

    db.commit()

    return {
        "status": "success",
        "message": "UPI Payment & 12-digit UTR verified successfully.",
        "utr": utr,
        "registration_id": str(reg.reg_id),
        "timestamp": timestamp_str
    }


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

    event = db.query(models.Event).filter(models.Event.id == reg.event_name).first()
    price_amount = event.price_amount if event else 49

    order_id = reg.payment_order_id or f"upi_order_{uuid.uuid4().hex[:10]}"
    if not reg.payment_order_id:
        reg.payment_order_id = order_id
        db.commit()

    upi_id = os.getenv("FEST_UPI_ID") or getattr(settings, "FEST_UPI_ID", "8336048128@ybl")

    return {
        "status": "success",
        "order_id": order_id,
        "amount": price_amount,
        "currency": "INR",
        "upi_id": upi_id
    }