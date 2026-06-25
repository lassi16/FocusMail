from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database.db import get_db
from app.database.models import Email

from app.agents.category_agent import categorize_email
from app.agents.priority_agent import get_priority
from app.agents.action_agent import extract_action

router = APIRouter()


@router.get("/categorize")
def categorize_emails(
    db: Session = Depends(get_db)
):

    emails = db.query(Email).all()

    updated = 0

    for email in emails:

        if email.category:
            continue

        category = categorize_email(
            email.subject,
            email.body
        )

        email.category = category

        updated += 1

    db.commit()

    return {
        "categorized": updated
    }

@router.get("/prioritize")
def prioritize_emails(
    db: Session = Depends(get_db)
):

    emails = db.query(Email).all()

    updated = 0

    for email in emails:

        if email.priority:
            continue

        priority = get_priority(
            email.subject,
            email.body
        )

        email.priority = priority

        updated += 1

    db.commit()

    return {
        "prioritized": updated
    }

@router.get("/extract-actions")
def extract_actions(
    db: Session = Depends(get_db)
):

    emails = db.query(Email).all()

    updated = 0

    for email in emails:

        if email.action_item:
            continue

        result = extract_action(
            email.subject,
            email.body
        )

        email.action_item = result.get("task")
        email.deadline = result.get("deadline")

        updated += 1

    db.commit()

    return {
        "processed": updated
    }


@router.get("/test-action")
def test_action():

    result = extract_action(
        "Assignment Submission",
        "Please submit your DBMS assignment before Friday."
    )

    return result