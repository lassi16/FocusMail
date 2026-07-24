import base64
import logging
import os
from datetime import datetime
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.interval import IntervalTrigger

from app.database.db import SessionLocal
from app.database.models import UserEmail, Email
from app.services.gmail.gmail_auth import get_gmail_service_for_tokens
from app.services.email_processor import process_email
from app.services.redis_client import get_redis

logger = logging.getLogger(__name__)

SYNC_INTERVAL_MINUTES = int(os.getenv("SYNC_INTERVAL_MINUTES", "10"))


def _extract_body(payload: dict) -> str:
    """Recursively extract plain-text body from a Gmail message payload."""
    if payload.get("body") and payload["body"].get("data"):
        return base64.urlsafe_b64decode(
            payload["body"]["data"].encode("UTF-8")
        ).decode("utf-8", errors="ignore")

    if "parts" in payload:
        for part in payload["parts"]:
            if part["mimeType"] == "text/plain":
                body = _extract_body(part)
                if body.strip():
                    return body
        for part in payload["parts"]:
            if part["mimeType"] == "text/html":
                body = _extract_body(part)
                if body.strip():
                    return body
        for part in payload["parts"]:
            body = _extract_body(part)
            if body.strip():
                return body
    return ""


def _send_sync_summary_email(
    service,
    to_email: str,
    new_emails: list,
) -> None:
    """
    Send a digest email to the user after a successful sync.

    Parameters
    ----------
    service    : Gmail API service object (already authenticated)
    to_email   : The user's Gmail address to send to
    new_emails : List of Email ORM objects that were just synced & classified
    """
    count = len(new_emails)
    now_str = datetime.now().strftime("%d %b %Y, %I:%M %p")

    # ── Build priority breakdown ──────────────────────────────────────────
    high   = [e for e in new_emails if e.priority and e.priority.lower() == "high"]
    medium = [e for e in new_emails if e.priority and e.priority.lower() == "medium"]
    low    = [e for e in new_emails if e.priority and e.priority.lower() == "low"]

    # ── Build category breakdown ──────────────────────────────────────────
    from collections import Counter
    cat_counts = Counter(
        (e.category or "Uncategorized") for e in new_emails
    )
    category_rows = "".join(
        f"<tr><td style='padding:4px 12px;'>{cat}</td>"
        f"<td style='padding:4px 12px; text-align:center;'><b>{cnt}</b></td></tr>"
        for cat, cnt in cat_counts.most_common()
    )

    # ── List high-priority emails ─────────────────────────────────────────
    high_priority_rows = ""
    if high:
        high_priority_rows = "<h3 style='color:#dc2626;'>🔴 High Priority</h3><ul>"
        for e in high[:10]:  # max 10 to keep email short
            high_priority_rows += (
                f"<li><b>{e.subject or '(no subject)'}</b>"
                f"<br><span style='color:#6b7280;font-size:13px;'>From: {e.sender or 'Unknown'}</span></li>"
            )
        high_priority_rows += "</ul>"

    # ── Compose HTML email body ───────────────────────────────────────────
    html_body = f"""
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;background:#f9fafb;padding:24px;border-radius:12px;">

      <div style="background:#1e1b4b;padding:20px 24px;border-radius:8px;margin-bottom:20px;">
        <h1 style="color:#fff;margin:0;font-size:22px;">FocusMail Sync Report</h1>
        <p style="color:#a5b4fc;margin:4px 0 0;">{now_str}</p>
      </div>

      <div style="background:#fff;padding:20px;border-radius:8px;margin-bottom:16px;border-left:4px solid #6366f1;">
        <h2 style="margin:0 0 4px;font-size:28px;color:#1e1b4b;">{count}</h2>
        <p style="margin:0;color:#6b7280;">New email(s) synced and classified</p>
      </div>

      <div style="background:#fff;padding:20px;border-radius:8px;margin-bottom:16px;">
        <h3 style="margin:0 0 12px;color:#374151;">Priority Breakdown</h3>
        <table style="width:100%;border-collapse:collapse;">
          <tr style="background:#fef2f2;">
            <td style="padding:8px 12px;">🔴 High</td>
            <td style="padding:8px 12px;text-align:center;"><b style="color:#dc2626;">{len(high)}</b></td>
          </tr>
          <tr style="background:#fffbeb;">
            <td style="padding:8px 12px;">🟡 Medium</td>
            <td style="padding:8px 12px;text-align:center;"><b style="color:#d97706;">{len(medium)}</b></td>
          </tr>
          <tr style="background:#f0fdf4;">
            <td style="padding:8px 12px;">🟢 Low</td>
            <td style="padding:8px 12px;text-align:center;"><b style="color:#16a34a;">{len(low)}</b></td>
          </tr>
        </table>
      </div>

      <div style="background:#fff;padding:20px;border-radius:8px;margin-bottom:16px;">
        <h3 style="margin:0 0 12px;color:#374151;">Category Breakdown</h3>
        <table style="width:100%;border-collapse:collapse;">
          {category_rows}
        </table>
      </div>

      {f'<div style="background:#fff;padding:20px;border-radius:8px;margin-bottom:16px;">{high_priority_rows}</div>' if high_priority_rows else ''}

      <p style="text-align:center;color:#9ca3af;font-size:12px;margin-top:16px;">
        Sent automatically by FocusMail &bull; Background sync every {SYNC_INTERVAL_MINUTES} min
      </p>
    </div>
    """

    # ── Build MIME message ────────────────────────────────────────────────
    msg = MIMEMultipart("alternative")
    msg["To"]      = to_email
    msg["From"]    = to_email        # sending from the user's own account
    msg["Subject"] = f"FocusMail: {count} new email(s) synced — {now_str}"
    msg.attach(MIMEText(html_body, "html"))

    raw = base64.urlsafe_b64encode(msg.as_bytes()).decode()

    try:
        service.users().messages().send(
            userId="me",
            body={"raw": raw},
        ).execute()
        logger.info("[AutoSync] Digest email sent to %s", to_email)
    except Exception as exc:
        logger.warning("[AutoSync] Could not send digest email to %s: %s", to_email, exc)


def _invalidate_caches() -> None:
    """Delete cached stats and email list keys so fresh data appears after sync."""
    r = get_redis()
    if not r:
        return
    try:
        for pattern in ("focusmail:stats:*", "focusmail:emails:*"):
            keys = r.keys(pattern)
            if keys:
                r.delete(*keys)
    except Exception as exc:
        logger.warning("Cache invalidation failed: %s", exc)


def auto_sync_all_users() -> None:
    """
    Main job: runs every SYNC_INTERVAL_MINUTES.
    Loops over all connected Gmail accounts, syncs new emails,
    and sends a digest summary email to each user after their sync.
    """
    logger.info("[AutoSync] Starting scheduled sync at %s", datetime.now().strftime("%H:%M:%S"))

    db = SessionLocal()
    total_inserted = 0

    try:
        connected_accounts = (
            db.query(UserEmail)
            .filter(
                UserEmail.provider == "gmail",
                UserEmail.is_connected == True,
                UserEmail.refresh_token.isnot(None),
            )
            .all()
        )

        if not connected_accounts:
            logger.info("[AutoSync] No connected Gmail accounts found. Skipping.")
            return

        logger.info("[AutoSync] Found %d connected account(s).", len(connected_accounts))

        for user_email in connected_accounts:
            try:
                logger.info("[AutoSync] Syncing user_id=%s (%s)", user_email.user_id, user_email.email)

                service = get_gmail_service_for_tokens(
                    user_email.access_token,
                    user_email.refresh_token,
                )

                results = service.users().messages().list(
                    userId="me",
                    maxResults=20,
                ).execute()

                messages = results.get("messages", [])
                inserted = 0
                new_emails = []   # collect newly synced Email objects for the digest

                for msg in messages:
                    gmail_id = msg["id"]

                    if db.query(Email).filter(Email.gmail_id == gmail_id).first():
                        continue

                    msg_detail = service.users().messages().get(
                        userId="me",
                        id=gmail_id,
                    ).execute()

                    internal_date = int(msg_detail["internalDate"])
                    received_at = datetime.fromtimestamp(internal_date / 1000)

                    headers = msg_detail["payload"]["headers"]
                    sender  = next((h["value"] for h in headers if h["name"] == "From"), "")
                    subject = next((h["value"] for h in headers if h["name"] == "Subject"), "")

                    full_body = _extract_body(msg_detail["payload"])
                    if not full_body.strip():
                        full_body = msg_detail.get("snippet", "")

                    email = Email(
                        gmail_id=gmail_id,
                        sender=sender,
                        subject=subject,
                        body=full_body,
                        gmail_internal_date=internal_date,
                        received_at=received_at,
                    )

                    db.add(email)
                    db.flush()

                    process_email(email, db)
                    db.commit()
                    db.refresh(email)

                    new_emails.append(email)
                    inserted += 1

                total_inserted += inserted
                logger.info(
                    "[AutoSync] user_id=%s — %d new email(s) synced.",
                    user_email.user_id,
                    inserted,
                )

                # Send digest notification email to the user
                if new_emails:
                    _send_sync_summary_email(
                        service=service,
                        to_email=user_email.email,
                        new_emails=new_emails,
                    )

            except Exception as user_exc:
                logger.error(
                    "[AutoSync] Failed for user_id=%s: %s",
                    user_email.user_id,
                    user_exc,
                )
                db.rollback()

    finally:
        db.close()

    if total_inserted > 0:
        _invalidate_caches()
        logger.info("[AutoSync] Cache cleared. %d new email(s) total across all users.", total_inserted)
    else:
        logger.info("[AutoSync] No new emails found across all accounts.")


# ---------------------------------------------------------------------------
# Scheduler singleton — started from main.py on FastAPI startup
# ---------------------------------------------------------------------------
scheduler = BackgroundScheduler(timezone="UTC")

scheduler.add_job(
    func=auto_sync_all_users,
    trigger=IntervalTrigger(minutes=SYNC_INTERVAL_MINUTES),
    id="auto_gmail_sync",
    name="Auto Gmail Sync",
    replace_existing=True,
    max_instances=1,          # Never run 2 syncs at the same time
    misfire_grace_time=60,    # If job was missed by <60s, run it anyway
)


def start_scheduler() -> None:
    """Call this from FastAPI startup to begin the background sync."""
    if not scheduler.running:
        scheduler.start()
        logger.info(
            "[AutoSync] Scheduler started. Gmail will sync every %d minute(s).",
            SYNC_INTERVAL_MINUTES,
        )


def stop_scheduler() -> None:
    """Call this from FastAPI shutdown to cleanly stop the scheduler."""
    if scheduler.running:
        scheduler.shutdown(wait=False)
        logger.info("[AutoSync] Scheduler stopped.")
