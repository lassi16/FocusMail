import base64
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database.db import get_db
from app.database.models import Email, UserEmail, User

from app.api.auth import get_current_user
from app.services.gmail.gmail_auth import get_gmail_service_for_tokens
from app.services.email_processor import process_email

router = APIRouter()


# ----------------------------------------------------
# Extract Full Email Body (Recursive)
# ----------------------------------------------------
def extract_body(payload):

    # Plain text body
    if payload.get("body") and payload["body"].get("data"):

        data = payload["body"]["data"]

        return base64.urlsafe_b64decode(
            data.encode("UTF-8")
        ).decode("utf-8", errors="ignore")

    # Multipart email
    if "parts" in payload:

        # Prefer plain text
        for part in payload["parts"]:

            if part["mimeType"] == "text/plain":

                body = extract_body(part)

                if body.strip():
                    return body

        # Fallback to HTML
        for part in payload["parts"]:

            if part["mimeType"] == "text/html":

                body = extract_body(part)

                if body.strip():
                    return body

        # Search nested multiparts
        for part in payload["parts"]:

            body = extract_body(part)

            if body.strip():
                return body

    return ""


# ----------------------------------------------------
# Gmail Test
# ----------------------------------------------------
@router.get("/gmail/test")
def gmail_test(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    user_email = db.query(UserEmail).filter(
        UserEmail.user_id == current_user.id,
        UserEmail.provider == "gmail",
        UserEmail.is_connected == True,
    ).first()

    if not user_email or not (user_email.access_token or user_email.refresh_token):
        raise HTTPException(
            status_code=404,
            detail="Gmail account not connected. Please sign in with Google first.",
        )

    service = get_gmail_service_for_tokens(user_email.access_token, user_email.refresh_token)

    results = service.users().messages().list(
        userId="me",
        maxResults=5
    ).execute()

    messages = results.get("messages", [])

    email_data = []

    for msg in messages:

        msg_detail = service.users().messages().get(
            userId="me",
            id=msg["id"]
        ).execute()

        headers = msg_detail["payload"]["headers"]

        sender = ""
        subject = ""

        for header in headers:

            if header["name"] == "From":
                sender = header["value"]

            if header["name"] == "Subject":
                subject = header["value"]

        body = extract_body(
            msg_detail["payload"]
        )

        if body.strip() == "":
            body = msg_detail.get("snippet", "")

        email_data.append({

            "id": msg["id"],
            "sender": sender,
            "subject": subject,
            "body": body[:500]

        })

    return {

        "count": len(email_data),
        "emails": email_data

    }


# ----------------------------------------------------
# Gmail Sync
# ----------------------------------------------------
@router.get("/gmail/sync")
def sync_gmail(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):

    user_email = db.query(UserEmail).filter(
        UserEmail.user_id == current_user.id,
        UserEmail.provider == "gmail",
        UserEmail.is_connected == True,
    ).first()

    if not user_email or not (user_email.access_token or user_email.refresh_token):
        raise HTTPException(
            status_code=404,
            detail="Gmail account not connected. Please sign in with Google first.",
        )

    service = get_gmail_service_for_tokens(user_email.access_token, user_email.refresh_token)

    results = service.users().messages().list(
        userId="me",
        maxResults=20
    ).execute()

    messages = results.get("messages", [])

    inserted = 0

    for msg in messages:

        gmail_id = msg["id"]

        existing = db.query(Email).filter(
            Email.gmail_id == gmail_id
        ).first()

        if existing:
            continue

        msg_detail = service.users().messages().get(
            userId="me",
            id=gmail_id
        ).execute()

        internal_date = int(
            msg_detail["internalDate"]
        )

        received_at = datetime.fromtimestamp(
            internal_date / 1000
        )

        headers = msg_detail["payload"]["headers"]

        sender = ""
        subject = ""

        for header in headers:

            if header["name"] == "From":
                sender = header["value"]

            if header["name"] == "Subject":
                subject = header["value"]

        # -----------------------------
        # FULL EMAIL BODY
        # -----------------------------
        full_body = extract_body(
            msg_detail["payload"]
        )

        if full_body.strip() == "":
            full_body = msg_detail.get(
                "snippet",
                ""
            )

        print("\n" + "=" * 80)
        print(subject)
        print("=" * 80)
        print(full_body[:1500])
        print("=" * 80)

        email = Email(

            gmail_id=gmail_id,

            sender=sender,

            subject=subject,

            body=full_body,

            gmail_internal_date=internal_date,

            received_at=received_at

        )

        db.add(email)

        db.flush()

        process_email(
            email,
            db
        )

        db.commit()

        db.refresh(email)

        inserted += 1

    return {

        "inserted": inserted

    }