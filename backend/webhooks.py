import json
from fastapi import APIRouter, Request, Depends, HTTPException, status
from sqlalchemy.orm import Session

from database import get_db
import models

router = APIRouter(prefix="/webhooks", tags=["webhooks"])


@router.post("/generic")
@router.post("/razorpay")
async def generic_payment_webhook(
    request: Request,
    db: Session = Depends(get_db)
):
    """
    Generic Direct Payment Notification Webhook Endpoint.
    Receives automated payment reference updates and updates registration status idempotently.
    """
    body_bytes = await request.body()
    body_str = body_bytes.decode("utf-8")

    try:
        event_payload = json.loads(body_str) if body_str else {}
    except json.JSONDecodeError:
        return {"status": "ignored", "message": "Invalid JSON payload format."}

    event_type = event_payload.get("event") or "payment.updated"
    utr_number = event_payload.get("utr") or event_payload.get("transaction_id")
    registration_id = event_payload.get("registration_id")

    if registration_id and utr_number:
        reg = db.query(models.Registration).filter(
            models.Registration.reg_id == registration_id
        ).first()

        if reg and reg.payment_status not in ("COMPLETED", "SUCCESS"):
            reg.payment_status = "COMPLETED"
            reg.payment_order_id = f"UTR-{utr_number}"
            db.commit()
            return {"status": "ok", "message": f"Registration '{registration_id}' updated to COMPLETED."}

    return {"status": "ignored", "message": f"Event '{event_type}' received."}
