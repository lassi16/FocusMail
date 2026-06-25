from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database.db import get_db
from app.database.models import Email

router = APIRouter()


@router.get("/emails")
def get_emails():
    return [
        {
            "sender": "test@gmail.com",
            "subject": "Test Email"
        }
    ]


@router.post("/emails/test")
def create_test_email(db: Session = Depends(get_db)):

    email = Email(
        gmail_id="123",
        sender="test@gmail.com",
        subject="First Test Email",
        body="Hello from FastAPI"
    )

    db.add(email)
    db.commit()
    db.refresh(email)

    return {
        "message": "Email inserted",
        "id": email.id
    }