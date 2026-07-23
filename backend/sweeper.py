import asyncio
from datetime import datetime, timedelta, timezone
from database import SessionLocal
import models


async def cleanup_expired_registrations():
    """
    Background Sweeper: Sweeps abandoned "PENDING" registrations older than 15 minutes,
    marks them as "EXPIRED", and releases locked event seats.
    """
    while True:
        try:
            db = SessionLocal()
            cutoff = datetime.now(timezone.utc) - timedelta(minutes=15)

            expired_regs = db.query(models.EventRegistration).filter(
                models.EventRegistration.payment_status == "PENDING",
                models.EventRegistration.created_at <= cutoff
            ).all()

            if expired_regs:
                count = len(expired_regs)
                for reg in expired_regs:
                    reg.payment_status = "EXPIRED"
                    reg.status = "EXPIRED"

                    event = db.query(models.Event).filter(models.Event.id == reg.event_id).first()
                    if event and hasattr(event, "seats_available") and event.seats_available is not None:
                        event.seats_available += 1

                db.commit()
                print(f"[Sweeper] Expired {count} abandoned PENDING registrations older than 15m.")
            db.close()
        except Exception as e:
            print(f"[Sweeper Error] {e}")

        await asyncio.sleep(60)  # Runs every 60 seconds
