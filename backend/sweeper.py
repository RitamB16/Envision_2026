import asyncio
from datetime import datetime, timedelta, timezone
from database import SessionLocal
import models


from sqlalchemy import func


async def process_approved_registrations():
    """
    Scans the database for any registration with payment_status in ('PAID', 'COMPLETED', 'CONFIRMED', 'SUCCESS')
    where email_sent IS NOT True.
    Auto-enrolls them in Tech Talk and dispatches personalized confirmation emails automatically per member via Resend.
    Loops through recipient batch with await asyncio.sleep(0.5) delay between dispatches and try/except error handling.
    """
    db = SessionLocal()
    try:
        from registration import auto_enroll_techtalk
        from email_utils import dispatch_registration_approval_email, dispatch_techtalk_confirmation_email, normalize_event_id

        paid_regs = db.query(models.Registration).filter(
            func.upper(models.Registration.payment_status).in_(["CONFIRMED", "PAID", "COMPLETED", "SUCCESS"]),
            (models.Registration.email_sent == False) | (models.Registration.email_sent == None)
        ).all()

        if paid_regs:
            print(f"[Sweeper] Found {len(paid_regs)} unsent approved registration row(s) to process.")
            for reg in paid_regs:
                try:
                    # Sync payment status and auto-enroll for all team members if part of a team
                    if reg.team_id:
                        team_regs = db.query(models.Registration).filter(models.Registration.team_id == reg.team_id).all()
                        for tm_reg in team_regs:
                            if tm_reg.payment_status not in ("PAID", "COMPLETED", "CONFIRMED", "SUCCESS"):
                                tm_reg.payment_status = reg.payment_status
                            auto_enroll_techtalk(db, tm_reg.participant_id)
                    else:
                        auto_enroll_techtalk(db, reg.participant_id)

                    participant_user = db.query(models.User).filter(models.User.id == reg.participant_id).first()
                    if not participant_user or not participant_user.email:
                        print(f"[Sweeper Warning] No email address found for participant_id {reg.participant_id}. Marking email_sent True.")
                        reg.email_sent = True
                        db.commit()
                        continue

                    participant_name = (participant_user.full_name or participant_user.name) or "Participant"
                    fest_id = participant_user.fest_id or "ENV26-001"
                    canonical_event_id = normalize_event_id(reg.event_name)
                    utr_val = getattr(reg, "utr_number", None) or getattr(reg, "payment_order_id", None) or "VERIFIED"
                    clean_ev = reg.event_name.lower().replace(" ", "-").strip()

                    if clean_ev in ("techtalk", "tech-talk"):
                        sent_ok = await dispatch_techtalk_confirmation_email(
                            to_email=participant_user.email,
                            participant_name=participant_name,
                            fest_id=fest_id,
                            registration_id=str(reg.reg_id)
                        )
                    else:
                        sent_ok = await dispatch_registration_approval_email(
                            to_emails=[participant_user.email],
                            participant_name=participant_name,
                            fest_id=fest_id,
                            registration_id=str(reg.reg_id),
                            event_name=reg.event_name,
                            event_id=canonical_event_id,
                            utr_number=utr_val
                        )

                    if sent_ok:
                        reg.email_sent = True
                        db.commit()
                        print(f"[Sweeper Success] Email dispatched to {participant_user.email} & email_sent marked True for reg_id {reg.reg_id}.")
                    else:
                        print(f"[Sweeper Warning] Email delivery failed for {participant_user.email} (reg_id {reg.reg_id}). Will retry next loop.")

                except Exception as ex:
                    print(f"[Sweeper Error] Failed to process registration {reg.reg_id}: {ex}")

                # Rate-limiting delay between dispatches in batch loop
                await asyncio.sleep(0.5)
    except Exception as e:
        print(f"[Sweeper Error in process_approved_registrations] {e}")
    finally:
        db.close()


def process_approved_registrations_sync():
    """
    Sync wrapper for process_approved_registrations.
    """
    from email_utils import run_async
    return run_async(process_approved_registrations())


async def run_sweeper_cycle():
    try:
        # 1. Cleanup expired abandoned pending registrations
        db = SessionLocal()
        cutoff = datetime.now(timezone.utc) - timedelta(minutes=15)

        expired_regs = db.query(models.Registration).filter(
            models.Registration.payment_status == "PENDING",
            models.Registration.created_at <= cutoff
        ).all()

        if expired_regs:
            count = len(expired_regs)
            for reg in expired_regs:
                reg.payment_status = "EXPIRED"

            db.commit()
            print(f"[Sweeper] Expired {count} abandoned PENDING registrations older than 15m.")
        db.close()

        # 2. Process newly approved database registrations and dispatch emails asynchronously
        await process_approved_registrations()

    except Exception as e:
        print(f"[Sweeper Error] {e}")


def run_sweeper_cycle_sync():
    from email_utils import run_async
    return run_async(run_sweeper_cycle())


async def cleanup_expired_registrations():
    # Allow 5 seconds initial delay so FastAPI server completes startup instantly
    await asyncio.sleep(5)
    while True:
        await run_sweeper_cycle()
        await asyncio.sleep(30)  # Runs every 30 seconds in background thread

