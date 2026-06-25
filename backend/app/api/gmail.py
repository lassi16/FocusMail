from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.services.gmail.gmail_auth import get_gmail_service

from app.database.db import get_db
from app.database.models import Email

from datetime import datetime

router = APIRouter()


@router.get("/gmail/test")
def gmail_test():

    service = get_gmail_service()

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

        email_data.append({
            "id": msg["id"],
            "sender": sender,
            "subject": subject,
            "snippet": msg_detail.get("snippet", "")
        })

    return {
        "count": len(email_data),
        "emails": email_data
    }

@router.get("/gmail/sync")
def sync_gmail(db: Session = Depends(get_db)):

    service = get_gmail_service()

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

        # Get Gmail timestamp
        internal_date = int(msg_detail["internalDate"])

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

        email = Email(
            gmail_id=gmail_id,
            sender=sender,
            subject=subject,
            body=msg_detail.get("snippet", ""),
            gmail_internal_date=internal_date,
            received_at=received_at
        )

        db.add(email)

        inserted += 1

    db.commit()

    return {
        "inserted": inserted
    }