"""
Envision '26 TechFest - Manual Database Approval Email Trigger Script

Run this script anytime after updating registration payment statuses directly in PostgreSQL / database:
    python backend/send_approval_emails.py
"""
import sys
import os

# Ensure backend directory is in sys.path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from database import SessionLocal
import models
from sqlalchemy import func
from registration import auto_enroll_techtalk
from email_utils import dispatch_registration_approval_email, normalize_event_id


def process_all_approved_registrations():
    print("=" * 65)
    print("ENVISION '26 TECHFEST: PROCESSING APPROVED REGISTRATIONS")
    print("=" * 65)

    db = SessionLocal()
    try:
        from sqlalchemy import text
        # Auto Migration: ensure email_sent column exists on existing registrations table
        db.execute(text("ALTER TABLE registrations ADD COLUMN IF NOT EXISTS email_sent BOOLEAN DEFAULT FALSE;"))
        db.commit()

        paid_regs = db.query(models.Registration).filter(
            func.upper(models.Registration.payment_status).in_(["CONFIRMED", "PAID", "COMPLETED", "SUCCESS"]),
            (models.Registration.email_sent == False) | (models.Registration.email_sent == None)
        ).all()

        if not paid_regs:
            print("[INFO] No pending unsent approved registrations found in database.")
            return

        print(f"[INFO] Found {len(paid_regs)} unsent approved registration(s) in database.\n")

        for index, reg in enumerate(paid_regs, 1):
            print(f"[{index}/{len(paid_regs)}] Processing Registration ID: {reg.reg_id} ({reg.event_name})...")
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
                    print(f"  Dispatching confirmation email to: {recipients}")
                    dispatch_registration_approval_email(
                        to_emails=recipients,
                        participant_name=participant_name,
                        fest_id=fest_id,
                        registration_id=str(reg.reg_id),
                        event_name=reg.event_name,
                        event_id=canonical_event_id,
                        utr_number=utr_val
                    )
                else:
                    print("  Warning: No valid email recipient address found.")

                reg.email_sent = True
                if reg.team_id:
                    for tm_reg in db.query(models.Registration).filter(models.Registration.team_id == reg.team_id).all():
                        tm_reg.email_sent = True

                db.commit()
                print("  Status updated: email_sent = True\n")
            except Exception as ex:
                print(f"  Error processing registration {reg.reg_id}: {ex}\n")

        print("Finished processing all database registration approvals!")

    finally:
        db.close()


if __name__ == "__main__":
    process_all_approved_registrations()
