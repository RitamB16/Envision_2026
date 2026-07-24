import json
import razorpay
from fastapi import APIRouter, Request, Depends, HTTPException, status
from sqlalchemy.orm import Session

from database import get_db
import models
from config import settings

router = APIRouter(prefix="/webhooks", tags=["webhooks"])


def get_razorpay_client():
    return razorpay.Client(auth=(settings.RAZORPAY_KEY_ID, settings.RAZORPAY_KEY_SECRET))


@router.post("/razorpay")
async def razorpay_webhook(
    request: Request,
    db: Session = Depends(get_db)
):
    """
    Asynchronous Razorpay Webhook Endpoint.
    Cryptographically verifies origin signature, handles payment.captured events,
    and updates registration & team payment status idempotently with atomic error safety.
    """
    # 1. Extract raw body bytes and signature header
    body_bytes = await request.body()
    body_str = body_bytes.decode("utf-8")

    signature = request.headers.get("x-razorpay-signature")
    if not signature:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Missing x-razorpay-signature header."
        )

    # 2. Cryptographically verify webhook origin signature
    try:
        client = get_razorpay_client()
        client.utility.verify_webhook_signature(
            body_str,
            signature,
            settings.RAZORPAY_WEBHOOK_SECRET
        )
    except razorpay.errors.SignatureVerificationError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid Razorpay webhook signature."
        )
    except Exception as e:
        print(f"Webhook Signature Verification Security Alert: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Webhook signature verification failed."
        )

    # 3. Parse JSON event payload safely
    try:
        event_payload = json.loads(body_str)
    except json.JSONDecodeError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid JSON body payload."
        )

    event_type = event_payload.get("event")

    # 4. Handle payment.captured or order.paid events
    if event_type in ("payment.captured", "order.paid"):
        payment_entity = event_payload.get("payload", {}).get("payment", {}).get("entity", {})

        payment_id = payment_entity.get("id")
        order_id = payment_entity.get("order_id") or event_payload.get("payload", {}).get("order", {}).get("entity", {}).get("id")
        receipt = payment_entity.get("receipt")  # registration_id passed during order creation
        notes = payment_entity.get("notes", {})
        registration_id = receipt or notes.get("registration_id")

        reg = None

        # FIX 2: Safely attempt UUID query for registration_id to prevent parsing crashes
        if registration_id:
            try:
                reg = db.query(models.EventRegistration).filter(
                    models.EventRegistration.id == registration_id
                ).first()
            except Exception as uuid_err:
                print(f"[!] Malformed registration_id string ignored during query: {uuid_err}")
                db.rollback()
                reg = None

        # FIX 1: Fallback query using order_id instead of payment_id
        if not reg and order_id:
            try:
                reg = db.query(models.EventRegistration).filter(
                    (models.EventRegistration.transaction_id == order_id) |
                    (models.EventRegistration.payment_order_id == order_id)
                ).first()
            except Exception as order_err:
                print(f"[!] Order ID query error: {order_err}")
                db.rollback()
                reg = None

        if not reg:
            return {
                "status": "ignored",
                "message": f"No registration matching receipt '{registration_id}' or order '{order_id}' found."
            }

        # FIX 3: Wrap status update, teammate sync, and db.commit() in try...except with db.rollback() to prevent 500 retry storms
        try:
            # Idempotency Check: Avoid redundant DB updates or duplicate commits
            if reg.payment_status in ("COMPLETED", "SUCCESS"):
                return {
                    "status": "ok",
                    "message": f"Registration '{reg.id}' is already marked as COMPLETED. No duplicate update performed."
                }

            # Update EventRegistration payment status & overwrite transaction_id with payment_id
            reg.payment_status = "COMPLETED"
            if payment_id:
                reg.transaction_id = payment_id

            # Update teammates linked under the same team_id
            if reg.team_id:
                teammate_regs = db.query(models.EventRegistration).filter(
                    models.EventRegistration.team_id == reg.team_id
                ).all()
                for tm_reg in teammate_regs:
                    tm_reg.payment_status = "COMPLETED"
                    if payment_id:
                        tm_reg.transaction_id = payment_id

            db.commit()

            return {
                "status": "ok",
                "message": f"Payment successfully processed for registration '{reg.id}'."
            }

        except Exception as e:
            db.rollback()
            print(f"[!] Webhook Database Commit Error: {e}")
            return {
                "status": "error",
                "message": f"Database commit error: {e}"
            }

    return {
        "status": "ignored",
        "event": event_type,
        "message": "Event ignored."
    }
