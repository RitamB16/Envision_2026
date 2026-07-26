import asyncio
from datetime import datetime, timedelta, timezone
from database import SessionLocal
import models


from sqlalchemy import func


def process_approved_registrations_sync():
    """
    Scans the database for any registration with payment_status in ('PAID', 'COMPLETED', 'CONFIRMED', 'SUCCESS')
    where email_sent IS NOT True.
    Auto-enrolls them in Tech Talk and dispatches confirmation emails automatically.
    This handles direct SQL database status updates seamlessly!
    """
    db = SessionLocal()
    try:
        from registration import auto_enroll_techtalk
        from email_utils import dispatch_registration_approval_email, normalize_event_id

        paid_regs = db.query(models.Registration).filter(
            func.upper(models.Registration.payment_status).in_(["CONFIRMED", "PAID", "COMPLETED", "SUCCESS"]),
            (models.Registration.email_sent == False) | (models.Registration.email_sent == None)
        ).all()

        if paid_regs:
            print(f"[Sweeper] Found {len(paid_regs)} newly approved database registration(s) to process.")
            for reg in paid_regs:
                try:
                    auto_enroll_techtalk(db, reg.participant_id)

                    recipients = []
                    participant_user = db.query(models.User).filter(models.User.id == reg.participant_id).first()
                    if participant_user and participant_user.email:
                        recipients.append(participant_user.email)

                    if reg.team_id:
                        team_regs = db.query(models.Registration).filter(models.Registration.team_id == reg.team_id).all()
                        for tm_reg in team_regs:
                            auto_enroll_techtalk(db, tm_reg.participant_id)
                            tm_user = db.query(models.User).filter(models.User.id == tm_reg.participant_id).first()
                            if tm_user and tm_user.email and tm_user.email not in recipients:
                                recipients.append(tm_user.email)

                    participant_name = (participant_user.full_name or participant_user.name) if participant_user else "Participant"
                    fest_id = participant_user.fest_id if (participant_user and participant_user.fest_id) else "ENV-2026-001"
                    canonical_event_id = normalize_event_id(reg.event_name)
                    utr_val = getattr(reg, "utr_number", None) or getattr(reg, "payment_order_id", None) or "VERIFIED"

                    if recipients:
                        clean_ev = reg.event_name.lower().replace(" ", "-").strip()
                        sent_ok = False
                        if clean_ev in ("techtalk", "tech-talk"):
                            from email_utils import dispatch_techtalk_confirmation_email
                            all_ok = True
                            for email in recipients:
                                res = dispatch_techtalk_confirmation_email(
                                    to_email=email,
                                    participant_name=participant_name,
                                    fest_id=fest_id,
                                    registration_id=str(reg.reg_id)
                                )
                                if not res:
                                    all_ok = False
                            sent_ok = all_ok
                        else:
                            sent_ok = dispatch_registration_approval_email(
                                to_emails=recipients,
                                participant_name=participant_name,
                                fest_id=fest_id,
                                registration_id=str(reg.reg_id),
                                event_name=reg.event_name,
                                event_id=canonical_event_id,
                                utr_number=utr_val
                            )

                        if sent_ok:
                            reg.email_sent = True
                            if reg.team_id:
                                for tm_reg in db.query(models.Registration).filter(models.Registration.team_id == reg.team_id).all():
                                    tm_reg.email_sent = True
                            db.commit()
                            print(f"[Sweeper Success] Email dispatched & email_sent marked True for registration {reg.reg_id}.")
                        else:
                            print(f"[Sweeper Warning] Email delivery failed for registration {reg.reg_id}. Retrying on next cycle.")
                    else:
                        print(f"[Sweeper Warning] No email recipient found for registration {reg.reg_id}.")
                except Exception as ex:
                    print(f"[Sweeper Process Error] Failed to process registration {reg.reg_id}: {ex}")
    except Exception as e:
        print(f"[Sweeper Error in process_approved_registrations_sync] {e}")
    finally:
        db.close()


async def cleanup_expired_registrations():
    """
    Background Sweeper:
    1. Sweeps abandoned "PENDING" registrations older than 15 minutes and marks them as "EXPIRED".
    2. Scans for direct SQL database payment status updates (PAID/CONFIRMED) and sends confirmation emails.
    """
    while True:
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

            # 2. Process newly approved database registrations and dispatch emails
            process_approved_registrations_sync()

        except Exception as e:
            print(f"[Sweeper Error] {e}")

        await asyncio.sleep(30)  # Runs every 30 seconds
