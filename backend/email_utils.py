import smtplib
import threading
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import List, Optional
from config import settings

COMMUNITY_LINK = "https://chat.whatsapp.com/JJCbhKk8N1j7yNNW7kmKMX"

EVENT_GROUP_NAMES = {
    "carlsen-chess": "Envision'26 Carlsen Classic (Chess)",
    "syntaxx": "Envision'26 SyntaxX (Coding)",
    "mindspark": "Envision'26 MindSpark (Quiz)",
    "bidquest": "Envision'26 BidQuest (Auction)",
    "lensverse": "Envision'26 LensVerse (Photography)",
    "techtalk": "Envision'26 Tech Talk (Seminar)",
}

EVENT_RULES_LINKS = {
    "syntaxx": "https://ibb.co/Z69WbqC2",
    "mindspark": "https://ibb.co/v9M8dpD",
    "bidquest": "https://ibb.co/spH899Sy",
    "carlsen-chess": "https://ibb.co/DgrbN57k",
    "lensverse": "https://ibb.co/PzQxbTX5",
    "techtalk": "https://envision-2026-seven.vercel.app/events"
}


def send_email_in_background(to_emails: List[str], subject: str, html_content: str, text_content: str):
    """
    Spawns a daemon thread to send SMTP email asynchronously without blocking HTTP response.
    """
    def _worker():
        smtp_user = settings.SMTP_USER
        smtp_password = settings.SMTP_PASSWORD
        if not smtp_user or not smtp_password:
            print("[Email Warning] SMTP credentials not configured in settings. Skipping email dispatch.")
            return

        for to_email in to_emails:
            if not to_email or "@" not in to_email:
                continue
            try:
                msg = MIMEMultipart("alternative")
                msg["Subject"] = subject
                msg["From"] = f"Envision'26 Organisers <{smtp_user}>"
                msg["To"] = to_email

                part1 = MIMEText(text_content, "plain")
                part2 = MIMEText(html_content, "html")
                msg.attach(part1)
                msg.attach(part2)

                with smtplib.SMTP_SSL("smtp.gmail.com", 465, timeout=12) as server:
                    server.login(smtp_user, smtp_password)
                    server.sendmail(smtp_user, to_email, msg.as_string())
                print(f"[Email Success] Registration confirmation email sent to {to_email}")
            except Exception as e:
                print(f"[Email Error] Failed to send email to {to_email}: {e}")

    thread = threading.Thread(target=_worker, daemon=True)
    thread.start()


def dispatch_registration_approval_email(
    to_emails: List[str],
    participant_name: str,
    fest_id: str,
    registration_id: str,
    event_name: str,
    event_id: str,
    utr_number: Optional[str] = None
):
    """
    Dispatches exact registration confirmation email template after manual payment verification.
    """
    clean_id = (event_id or "").lower().replace(" ", "-")
    group_name = EVENT_GROUP_NAMES.get(clean_id, f"Envision'26 {event_name}")
    rule_url = EVENT_RULES_LINKS.get(clean_id, f"{settings.FRONTEND_URL}/events")
    brochure_url = "https://drive.google.com/file/d/18zngC1fwb-heQlqg14H6lDjgBvioxfeJ/view"

    subject = "Registration Confirmed – Envision'26"

    text_content = f"""Dear {participant_name},

Greetings!

We are pleased to inform you that your registration for {event_name} (Registration ID: {registration_id}, Fest ID: {fest_id}) has been successfully confirmed.

To receive all important announcements, event schedules, reporting instructions, and other updates, please join our official WhatsApp Community using the link below:

🔗 WhatsApp Community: {COMMUNITY_LINK}
📌 WhatsApp Group Name: {group_name}

After joining the community, please join the above-mentioned WhatsApp group for your registered event.

All further updates regarding the event will be shared only through this WhatsApp Community and the respective event WhatsApp group. We request you to join the Community as soon as possible to avoid missing any important information.

We look forward to your participation and wish you the very best for the event!


Regards,
Organizing Team
Envision 2026
"""

    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body {{ font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #04010d; color: #e2e8f0; margin: 0; padding: 20px; }}
        .card {{ max-width: 620px; margin: 0 auto; background: #0a051c; border: 1px solid #00f3ff; border-radius: 16px; padding: 30px; box-shadow: 0 0 35px rgba(0, 243, 255, 0.2); }}
        .header {{ text-align: center; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 18px; margin-bottom: 22px; }}
        .title {{ color: #00f3ff; font-size: 24px; font-weight: 900; letter-spacing: 2px; text-transform: uppercase; margin: 0; }}
        .subtitle {{ color: #a855f7; font-size: 13px; font-weight: 700; margin-top: 6px; letter-spacing: 1px; }}
        .status-badge {{ display: inline-block; background: rgba(16, 185, 129, 0.15); border: 1px solid #10b981; color: #10b981; padding: 6px 16px; border-radius: 20px; font-weight: 800; font-size: 12px; margin-top: 12px; }}
        .box {{ background: #070318; border: 1px solid rgba(0, 243, 255, 0.3); border-radius: 12px; padding: 18px; margin: 20px 0; font-family: monospace; font-size: 13px; line-height: 1.8; }}
        .btn-wa {{ display: block; width: 85%; margin: 16px auto; text-align: center; background: #25D366; color: #000000; padding: 14px 20px; border-radius: 12px; font-weight: 900; text-decoration: none; font-size: 14px; text-transform: uppercase; letter-spacing: 1px; box-shadow: 0 0 20px rgba(37, 211, 102, 0.4); }}
        .btn-rules {{ display: inline-block; padding: 10px 18px; background: rgba(0,243,255,0.15); border: 1px solid #00f3ff; color: #00f3ff; border-radius: 8px; text-decoration: none; font-size: 12px; font-weight: 700; margin-top: 10px; }}
        .footer {{ text-align: center; font-size: 11px; color: #6b7280; margin-top: 28px; border-top: 1px solid rgba(255,255,255,0.08); padding-top: 16px; }}
      </style>
    </head>
    <body>
      <div class="card">
        <div class="header">
          <h1 class="title">ENVISION '26 TECHFEST</h1>
          <div class="subtitle">REGISTRATION CONFIRMED</div>
          <div class="status-badge">✓ PAYMENT VERIFIED & SEAT CONFIRMED</div>
        </div>

        <p>Dear <strong>{participant_name}</strong>,</p>
        <p>Greetings!</p>
        <p>We are pleased to inform you that your registration for <strong>{event_name}</strong> has been successfully confirmed.</p>

        <div class="box">
          <div>📌 <strong>PARTICIPANT NAME:</strong> {participant_name}</div>
          <div>🎫 <strong>REGISTRATION ID:</strong> <span style="color: #a855f7;">{registration_id}</span></div>
          <div>🆔 <strong>FEST ID:</strong> <span style="color: #00f3ff;">{fest_id}</span></div>
          <div>🏆 <strong>REGISTERED EVENT:</strong> <span style="color: #ffffff;">{event_name}</span></div>
          <div>💳 <strong>PAYMENT UTR:</strong> {utr_number or 'VERIFIED'}</div>
          <div>📅 <strong>EVENT DATE:</strong> 6th August 2026</div>
          <div>⏰ <strong>REPORTING TIME:</strong> 9:30 AM IST</div>
        </div>

        <p>To receive all important announcements, event schedules, reporting instructions, and other updates, please join our official WhatsApp Community using the link below:</p>

        <a href="{COMMUNITY_LINK}" class="btn-wa" target="_blank">🔗 JOIN OFFICIAL WHATSAPP COMMUNITY &rarr;</a>

        <div style="background: rgba(168,85,247,0.1); border: 1px border #a855f7; border-radius: 10px; padding: 14px; text-align: center; margin: 16px 0;">
          <p style="margin: 0; font-size: 13px;">📌 <strong>WhatsApp Group Name:</strong> <strong style="color: #00f3ff;">{group_name}</strong></p>
          <p style="margin: 6px 0 0 0; font-size: 11.5px; color: #cbd5e1;">After joining the community, please join the above-mentioned WhatsApp group for your registered event.</p>
        </div>

        <p style="font-size: 12.5px; color: #cbd5e1; line-height: 1.6;">
          All further updates regarding the event will be shared only through this WhatsApp Community and the respective event WhatsApp group. We request you to join the Community as soon as possible to avoid missing any important information.
        </p>

        <p style="text-align: center; margin-top: 16px;">
          <a href="{rule_url}" class="btn-rules" target="_blank">📜 View Event Guidelines & Rules</a>
          <a href="{brochure_url}" class="btn-rules" style="border-color: #a855f7; color: #a855f7;" target="_blank">📄 Download Brochure PDF</a>
        </p>

        <p>We look forward to your participation and wish you the very best for the event!</p>

        <div class="footer">
          <strong>Regards,</strong><br>
          Organizing Team<br>
          Envision 2026 &bull; RKMRC Narendrapur
        </div>
      </div>
    </body>
    </html>
    """

    send_email_in_background(to_emails, subject, html_content, text_content)
