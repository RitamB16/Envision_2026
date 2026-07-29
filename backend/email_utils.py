import asyncio
import threading
import resend
from typing import List, Optional
from config import settings

resend.api_key = settings.RESEND_API_KEY

COMMUNITY_LINK = "https://chat.whatsapp.com/JJCbhKk8N1j7yNNW7kmKMX"


def normalize_event_id(event_name: Optional[str]) -> str:
    if not event_name:
        return "techtalk"
    clean = event_name.lower().strip()
    if "chess" in clean or "carlsen" in clean:
        return "carlsen-chess"
    if "syntax" in clean:
        return "syntaxx"
    if "bid" in clean or "auction" in clean:
        return "bidquest"
    if "lens" in clean or "photo" in clean:
        return "lensverse"
    if "mind" in clean or "quiz" in clean:
        return "mindspark"
    return clean.replace(" ", "-")

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


async def send_email_resend(to_emails: List[str], subject: str, html_content: str, text_content: str) -> bool:
    """
    Dispatches emails asynchronously using the Resend HTTP API (resend.Emails.send_async).
    Loops through recipient list with asyncio.sleep(0.5) delay per dispatch to prevent rate-limiting.
    Includes try/except block around each dispatch to ensure individual network failures do not halt batch loop.
    """
    resend.api_key = settings.RESEND_API_KEY
    if not resend.api_key:
        print("[Email Error] RESEND_API_KEY not configured in settings. Skipping email dispatch.")
        return False

    valid_emails = [e.strip() for e in to_emails if e and "@" in e]
    if not valid_emails:
        print("[Email Warning] No valid email recipients specified.")
        return False

    print(f"[Email Dispatcher] Dispatching email via Resend to {len(valid_emails)} recipient(s): {valid_emails}")

    all_success = True
    from_email = getattr(settings, "RESEND_FROM_EMAIL", "Envision 2026 TechFest <onboarding@resend.dev>")

    for to_email in valid_emails:
        try:
            params: resend.Emails.SendParams = {
                "from": from_email,
                "to": [to_email],
                "subject": subject,
                "html": html_content,
                "text": text_content,
            }
            response = await resend.Emails.send_async(params)
            print(f"[Email Success] Resend email successfully dispatched to {to_email}: {response}")
        except Exception as err:
            err_str = str(err)
            if "testing emails to your own email address" in err_str:
                print(
                    f"[Resend Sandbox Restriction] Could not deliver to {to_email}.\n"
                    f"  -> Resend account is currently in Sandbox/Testing mode.\n"
                    f"  -> To send emails to all external recipients, verify your domain at https://resend.com/domains\n"
                    f"  -> And set RESEND_FROM_EMAIL=Envision 2026 TechFest <noreply@yourdomain.com> in your environment settings."
                )
            else:
                print(f"[Email Error] Failed sending email to {to_email} via Resend API: {err}")
            all_success = False

        await asyncio.sleep(0.5)

    return all_success


async def send_email(to_emails: List[str], subject: str, html_content: str, text_content: str) -> bool:
    return await send_email_resend(to_emails, subject, html_content, text_content)


def run_async(coro):
    """
    Helper utility to execute an async coroutine from synchronous contexts safely.
    """
    try:
        loop = asyncio.get_running_loop()
        return loop.create_task(coro)
    except RuntimeError:
        return asyncio.run(coro)


def send_email_in_background(to_emails: List[str], subject: str, html_content: str, text_content: str):
    """
    Spawns an async task or event loop execution to send email asynchronously using Resend API.
    """
    run_async(send_email_resend(to_emails, subject, html_content, text_content))



async def dispatch_registration_approval_email(
    to_emails: List[str],
    participant_name: str,
    fest_id: str,
    registration_id: str,
    event_name: str,
    event_id: str,
    utr_number: Optional[str] = None
):
    """
    Dispatches exact registration confirmation email template after manual payment verification for paid events.
    """
    clean_id = (event_id or "").lower().replace(" ", "-")
    group_name = EVENT_GROUP_NAMES.get(clean_id, f"Envision'26 {event_name}")
    rule_url = EVENT_RULES_LINKS.get(clean_id, f"{settings.FRONTEND_URL}/events")
    brochure_url = "https://drive.google.com/file/d/18zngC1fwb-heQlqg14H6lDjgBvioxfeJ/view"

    subject = f"Registration Confirmed – Envision'26 ({event_name.upper()})"

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
        body {{ font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #04010d; color: #ffffff; margin: 0; padding: 20px; }}
        .card {{ max-width: 620px; margin: 0 auto; background: #0a051c; border: 1px solid #00f3ff; border-radius: 16px; padding: 30px; box-shadow: 0 0 35px rgba(0, 243, 255, 0.2); }}
        .header {{ text-align: center; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 18px; margin-bottom: 22px; }}
        .title {{ color: #00f3ff; font-size: 24px; font-weight: 900; letter-spacing: 2px; text-transform: uppercase; margin: 0; }}
        .subtitle {{ color: #a855f7; font-size: 13px; font-weight: 700; margin-top: 6px; letter-spacing: 1px; }}
        .status-badge {{ display: inline-block; background: rgba(16, 185, 129, 0.15); border: 1px solid #10b981; color: #10b981; padding: 6px 16px; border-radius: 20px; font-weight: 800; font-size: 12px; margin-top: 12px; }}
        .box {{ background: #070318; border: 1px solid rgba(0, 243, 255, 0.3); border-radius: 12px; padding: 20px; margin: 20px 0; font-family: monospace; font-size: 13.5px; line-height: 1.9; color: #ffffff !important; }}
        .btn-wa {{ display: block; width: 85%; margin: 18px auto; text-align: center; background: #25D366; color: #000000 !important; padding: 14px 20px; border-radius: 12px; font-weight: 900; text-decoration: none; font-size: 14px; text-transform: uppercase; letter-spacing: 1px; box-shadow: 0 0 20px rgba(37, 211, 102, 0.4); }}
        .btn-rules {{ display: inline-block; padding: 10px 18px; background: rgba(0,243,255,0.15); border: 1px solid #00f3ff; color: #00f3ff !important; border-radius: 8px; text-decoration: none; font-size: 12px; font-weight: 700; margin: 6px 4px; }}
        .footer {{ text-align: center; font-size: 11.5px; color: #9ca3af !important; margin-top: 28px; border-top: 1px solid rgba(255,255,255,0.1); padding-top: 16px; line-height: 1.5; }}
      </style>
    </head>
    <body style="background-color: #04010d; color: #ffffff !important;">
      <div class="card" style="background-color: #0a051c; border: 1px solid #00f3ff;">
        <div class="header">
          <h1 class="title" style="color: #00f3ff !important;">ENVISION '26 TECHFEST</h1>
          <div class="subtitle" style="color: #a855f7 !important;">REGISTRATION CONFIRMED</div>
          <div class="status-badge" style="color: #10b981 !important;">✓ PAYMENT VERIFIED & SEAT CONFIRMED</div>
        </div>

        <p style="color: #ffffff !important; font-size: 15px; margin: 12px 0;">Dear <strong style="color: #ffffff !important;">{participant_name}</strong>,</p>
        <p style="color: #ffffff !important; font-size: 15px; margin: 8px 0;">Greetings!</p>
        <p style="color: #ffffff !important; font-size: 15px; margin: 8px 0 16px 0;">We are pleased to inform you that your registration for <strong style="color: #00f3ff !important;">{event_name}</strong> has been successfully confirmed.</p>

        <div class="box" style="background: #070318; border: 1px solid rgba(0, 243, 255, 0.4); color: #ffffff !important;">
          <div style="margin-bottom: 6px; color: #ffffff !important;">📌 <span style="color: #94a3b8 !important;">PARTICIPANT NAME:</span> <strong style="color: #ffffff !important;">{participant_name}</strong></div>
          <div style="margin-bottom: 6px; color: #ffffff !important;">🎫 <span style="color: #94a3b8 !important;">REGISTRATION ID:</span> <span style="color: #c084fc !important; font-weight: bold;">{registration_id}</span></div>
          <div style="margin-bottom: 6px; color: #ffffff !important;">🆔 <span style="color: #94a3b8 !important;">FEST ID:</span> <span style="color: #38bdf8 !important; font-weight: bold;">{fest_id}</span></div>
          <div style="margin-bottom: 6px; color: #ffffff !important;">🏆 <span style="color: #94a3b8 !important;">REGISTERED EVENT:</span> <strong style="color: #ffffff !important;">{event_name}</strong></div>
          <div style="margin-bottom: 6px; color: #ffffff !important;">💳 <span style="color: #94a3b8 !important;">PAYMENT UTR:</span> <strong style="color: #f1f5f9 !important;">{utr_number or 'VERIFIED'}</strong></div>
          <div style="margin-bottom: 6px; color: #ffffff !important;">📅 <span style="color: #94a3b8 !important;">EVENT DATE:</span> <strong style="color: #ffffff !important;">6th August 2026</strong></div>
          <div style="margin-bottom: 6px; color: #ffffff !important;">⏰ <span style="color: #94a3b8 !important;">REPORTING TIME:</span> <strong style="color: #ffffff !important;">9:30 AM IST</strong></div>
        </div>

        <p style="color: #f1f5f9 !important; font-size: 13.5px; line-height: 1.6; margin: 18px 0 14px 0;">To receive all important announcements, event schedules, reporting instructions, and other updates, please join our official WhatsApp Community using the link below:</p>

        <a href="{COMMUNITY_LINK}" class="btn-wa" target="_blank" style="color: #000000 !important; background-color: #25D366;">🔗 JOIN OFFICIAL WHATSAPP COMMUNITY &rarr;</a>

        <div style="background: #0f0826; border: 1px solid #a855f7; border-radius: 12px; padding: 16px; text-align: center; margin: 18px 0;">
          <p style="margin: 0; font-size: 14px; color: #ffffff !important;">📌 <strong>WhatsApp Group Name:</strong> <strong style="color: #38bdf8 !important;">{group_name}</strong></p>
          <p style="margin: 6px 0 0 0; font-size: 12px; color: #cbd5e1 !important;">After joining the community, please join the above-mentioned WhatsApp group for your registered event.</p>
        </div>

        <p style="font-size: 12.5px; color: #cbd5e1 !important; line-height: 1.6; margin: 16px 0;">
          All further updates regarding the event will be shared only through this WhatsApp Community and the respective event WhatsApp group. We request you to join the Community as soon as possible to avoid missing any important information.
        </p>

        <p style="text-align: center; margin-top: 20px;">
          <a href="{rule_url}" class="btn-rules" target="_blank" style="color: #00f3ff !important;">📜 View Event Guidelines & Rules</a>
          <a href="{brochure_url}" class="btn-rules" style="border-color: #a855f7; color: #c084fc !important;" target="_blank">📄 Download Brochure PDF</a>
        </p>

        <p style="color: #ffffff !important; font-size: 14px; margin-top: 20px;">We look forward to your participation and wish you the very best for the event!</p>

        <div class="footer" style="color: #9ca3af !important;">
          <strong style="color: #ffffff !important;">Regards,</strong><br>
          Organizing Team<br>
          Envision 2026 &bull; RKMRC Narendrapur
        </div>
      </div>
    </body>
    </html>
    """

    return await send_email_resend(to_emails, subject, html_content, text_content)


async def dispatch_techtalk_confirmation_email(
    to_email: str,
    participant_name: str,
    fest_id: str,
    registration_id: Optional[str] = None
) -> bool:
    """
    Dispatches immediate confirmation email for Tech Talk free seminar registration.
    Includes ONLY: Event Name, Date (6th August 2026), Reporting Time (10:00 AM IST), Venue (Mumukshananda Auditorium, RKMRC Narendrapur), Participant Name, Fest ID, and PDF Brochure Link.
    NO payment verified badge, NO UTR number, NO WhatsApp community link!
    """
    if not to_email or "@" not in to_email:
        return False

    brochure_url = "https://drive.google.com/file/d/18zngC1fwb-heQlqg14H6lDjgBvioxfeJ/view"
    subject = "Registration Confirmed – Tech Talk | Envision'26"

    text_content = f"""Dear {participant_name},

Greetings!

We are pleased to inform you that your registration for TECH TALK (Keynote Seminar & Technical Sessions) has been successfully confirmed.

Registration Details:
• Participant Name: {participant_name}
• Registration ID: {registration_id or 'CONFIRMED'}
• Fest ID: {fest_id}
• Event Name: TECH TALK
• Event Date: 6th August 2026
• Reporting Time: 10:00 AM IST
• Venue: Mumukshananda Auditorium, RKMRC Narendrapur

Official PDF Brochure Link:
{brochure_url}

We look forward to your participation and wish you the very best for the event!

Regards,
Organizing Team
Envision 2026 • RKMRC Narendrapur
"""

    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body {{ font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #04010d; color: #ffffff; margin: 0; padding: 20px; }}
        .card {{ max-width: 600px; margin: 0 auto; background: #0a051c; border: 1px solid #00f3ff; border-radius: 16px; padding: 28px; box-shadow: 0 0 35px rgba(0, 243, 255, 0.2); }}
        .header {{ text-align: center; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 16px; margin-bottom: 20px; }}
        .title {{ color: #00f3ff; font-size: 24px; font-weight: 900; letter-spacing: 2px; text-transform: uppercase; margin: 0; }}
        .subtitle {{ color: #a855f7; font-size: 13px; font-weight: 700; margin-top: 6px; letter-spacing: 1px; }}
        .status-badge {{ display: inline-block; background: rgba(0, 243, 255, 0.15); border: 1px solid #00f3ff; color: #00f3ff; padding: 6px 16px; border-radius: 20px; font-weight: 800; font-size: 12px; margin-top: 12px; }}
        .box {{ background: #070318; border: 1px solid rgba(0, 243, 255, 0.3); border-radius: 12px; padding: 20px; margin: 20px 0; font-family: monospace; font-size: 13.5px; line-height: 1.9; color: #ffffff !important; }}
        .btn-brochure {{ display: block; width: 80%; margin: 18px auto; text-align: center; background: linear-gradient(to right, #00f3ff, #a855f7); color: #000000 !important; padding: 13px 20px; border-radius: 12px; font-weight: 900; text-decoration: none; font-size: 13px; text-transform: uppercase; letter-spacing: 1px; box-shadow: 0 0 20px rgba(0, 243, 255, 0.4); }}
        .footer {{ text-align: center; font-size: 11.5px; color: #9ca3af !important; margin-top: 24px; border-top: 1px solid rgba(255,255,255,0.1); padding-top: 14px; line-height: 1.5; }}
      </style>
    </head>
    <body style="background-color: #04010d; color: #ffffff !important;">
      <div class="card" style="background-color: #0a051c; border: 1px solid #00f3ff;">
        <div class="header">
          <h1 class="title" style="color: #00f3ff !important;">ENVISION '26 TECHFEST</h1>
          <div class="subtitle" style="color: #a855f7 !important;">KEYNOTE SEMINAR REGISTRATION</div>
          <div class="status-badge" style="color: #00f3ff !important;">✓ SEAT CONFIRMED (100% FREE PASS)</div>
        </div>

        <p style="color: #ffffff !important; font-size: 15px; margin: 12px 0;">Dear <strong style="color: #ffffff !important;">{participant_name}</strong>,</p>
        <p style="color: #ffffff !important; font-size: 15px; margin: 8px 0;">Greetings!</p>
        <p style="color: #ffffff !important; font-size: 15px; margin: 8px 0 16px 0;">We are pleased to inform you that your registration for <strong style="color: #00f3ff !important;">TECH TALK</strong> has been successfully confirmed.</p>

        <div class="box" style="background: #070318; border: 1px solid rgba(0, 243, 255, 0.4); color: #ffffff !important;">
          <div style="margin-bottom: 6px; color: #ffffff !important;">📌 <span style="color: #94a3b8 !important;">PARTICIPANT NAME:</span> <strong style="color: #ffffff !important;">{participant_name}</strong></div>
          <div style="margin-bottom: 6px; color: #ffffff !important;">🎫 <span style="color: #94a3b8 !important;">REGISTRATION ID:</span> <span style="color: #c084fc !important; font-weight: bold;">{registration_id or 'CONFIRMED'}</span></div>
          <div style="margin-bottom: 6px; color: #ffffff !important;">🆔 <span style="color: #94a3b8 !important;">FEST ID:</span> <span style="color: #38bdf8 !important; font-weight: bold;">{fest_id}</span></div>
          <div style="margin-bottom: 6px; color: #ffffff !important;">🏆 <span style="color: #94a3b8 !important;">REGISTERED EVENT:</span> <strong style="color: #ffffff !important;">TECH TALK</strong></div>
          <div style="margin-bottom: 6px; color: #ffffff !important;">📅 <span style="color: #94a3b8 !important;">EVENT DATE:</span> <strong style="color: #ffffff !important;">6th August 2026</strong></div>
          <div style="margin-bottom: 6px; color: #ffffff !important;">⏰ <span style="color: #94a3b8 !important;">REPORTING TIME:</span> <strong style="color: #ffffff !important;">10:00 AM IST</strong></div>
          <div style="margin-bottom: 6px; color: #ffffff !important;">📍 <span style="color: #94a3b8 !important;">VENUE:</span> <strong style="color: #ffffff !important;">Mumukshananda Auditorium, RKMRC Narendrapur</strong></div>
        </div>

        <a href="{brochure_url}" class="btn-brochure" target="_blank" style="color: #000000 !important;">📄 DOWNLOAD BROCHURE PDF &rarr;</a>

        <p style="color: #ffffff !important; font-size: 14px; margin-top: 20px;">We look forward to your participation and wish you the very best for the event!</p>

        <div class="footer" style="color: #9ca3af !important;">
          <strong style="color: #ffffff !important;">Regards,</strong><br>
          Organizing Team<br>
          Envision 2026 &bull; RKMRC Narendrapur
        </div>
      </div>
    </body>
    </html>
    """

    return await send_email_resend([to_email], subject, html_content, text_content)


def dispatch_registration_approval_email_sync(*args, **kwargs):
    return run_async(dispatch_registration_approval_email(*args, **kwargs))


def dispatch_techtalk_confirmation_email_sync(*args, **kwargs):
    return run_async(dispatch_techtalk_confirmation_email(*args, **kwargs))

