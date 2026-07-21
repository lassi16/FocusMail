import hashlib
import json
from datetime import datetime, timedelta
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func
from sqlalchemy.orm import Session, joinedload

from app.database.db import get_db
from app.database.models import Email, EmailEvent
from app.services.redis_client import get_redis, stats_key, emails_key

router = APIRouter()


def serialize_email(email: Email, include_body: bool = True) -> dict:
    return {
        "id": email.id,
        "gmail_id": email.gmail_id,
        "sender": email.sender,
        "subject": email.subject,
        "body": email.body if include_body else None,
        "category": email.category,
        "priority": email.priority,
        "action_item": email.action_item,
        "deadline": email.deadline,
        "received_at": email.received_at.isoformat() if email.received_at else None,
        "event_count": len(email.events),
    }


def serialize_event(event: EmailEvent) -> dict:
    return {
        "id": event.id,
        "email_id": event.email_id,
        "event_type": event.event_type,
        "title": event.title,
        "description": event.description,
        "event_date": event.event_date.isoformat() if event.event_date else None,
        "event_time": event.event_time,
        "priority": event.priority,
        "status": event.status,
        "email_subject": event.email.subject if event.email else None,
        "email_sender": event.email.sender if event.email else None,
    }


@router.get("/emails")
def get_emails(
    db: Session = Depends(get_db),
    category: Optional[list[str]] = Query(None),
    priority: Optional[list[str]] = Query(None),
    search: Optional[str] = Query(None),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
):
    """
    Redis cache: filtered email lists are cached for 60 seconds.

    How the cache key is built:
      MD5( sorted(categories) + sorted(priorities) + search + limit + offset )
    So "Internship + High priority" always maps to the same key regardless
    of the order the filters were selected.

    Search queries (free text) are NOT cached — they change too frequently
    and returning stale search results would be confusing.
    """
    EMAILS_CACHE_TTL = 60

    # Build a deterministic cache key from all filter params
    # Skip caching when there's a search term (too dynamic)
    r = get_redis()
    cache_key = None
    if r and not search:
        filter_str = (
            "|".join(sorted(category or []))
            + ":" + "|".join(sorted(priority or []))
            + ":" + str(limit)
            + ":" + str(offset)
        )
        cache_key = emails_key(hashlib.md5(filter_str.encode()).hexdigest())
        cached = r.get(cache_key)
        if cached:
            return json.loads(cached)

    # Cache miss (or search query) — hit the database
    query = db.query(Email).options(joinedload(Email.events))

    if category:
        lowered = [value.lower() for value in category if value]
        if lowered:
            query = query.filter(func.lower(Email.category).in_(lowered))

    if priority:
        lowered = [value.lower() for value in priority if value]
        if lowered:
            query = query.filter(func.lower(Email.priority).in_(lowered))

    if search:
        pattern = f"%{search.lower()}%"
        query = query.filter(
            func.lower(Email.subject).like(pattern)
            | func.lower(Email.sender).like(pattern)
            | func.lower(Email.body).like(pattern)
        )

    total = query.count()
    emails = (
        query.order_by(Email.received_at.desc().nullslast(), Email.id.desc())
        .offset(offset)
        .limit(limit)
        .all()
    )

    result = {
        "total": total,
        "limit": limit,
        "offset": offset,
        "emails": [serialize_email(email) for email in emails],
    }

    # Store in Redis (only for non-search filter queries)
    if r and cache_key:
        try:
            r.setex(cache_key, EMAILS_CACHE_TTL, json.dumps(result))
        except Exception:
            pass

    return result


@router.get("/emails/{email_id}")
def get_email(email_id: int, db: Session = Depends(get_db)):
    email = (
        db.query(Email)
        .options(joinedload(Email.events))
        .filter(Email.id == email_id)
        .first()
    )

    if not email:
        raise HTTPException(status_code=404, detail="Email not found")

    payload = serialize_email(email)
    payload["events"] = [serialize_event(event) for event in email.events]
    return payload


@router.get("/events")
def get_events(
    db: Session = Depends(get_db),
    event_type: Optional[str] = Query(None),
    priority: Optional[str] = Query(None),
    from_date: Optional[str] = Query(None),
    to_date: Optional[str] = Query(None),
    limit: int = Query(100, ge=1, le=500),
):
    query = db.query(EmailEvent).options(joinedload(EmailEvent.email))

    if event_type:
        query = query.filter(func.lower(EmailEvent.event_type) == event_type.lower())

    if priority:
        query = query.filter(func.lower(EmailEvent.priority) == priority.lower())

    if from_date:
        query = query.filter(EmailEvent.event_date >= datetime.fromisoformat(from_date).date())

    if to_date:
        query = query.filter(EmailEvent.event_date <= datetime.fromisoformat(to_date).date())

    total = query.count()
    events = (
        query.order_by(EmailEvent.event_date.asc().nullslast(), EmailEvent.id.asc())
        .limit(limit)
        .all()
    )

    return {
        "total": total,
        "events": [serialize_event(event) for event in events],
    }


@router.get("/stats")
def get_stats(db: Session = Depends(get_db)):
    # ---- Redis cache check ----
    # Stats are expensive (multiple GROUP BY queries on Neon).
    # Cache the full response for 60 seconds to avoid hammering the DB
    # every time the dashboard page loads or auto-refreshes.
    CACHE_KEY = stats_key(0)          # global stats (not per-user)
    CACHE_TTL = 60                    # seconds

    r = get_redis()
    if r:
        cached = r.get(CACHE_KEY)
        if cached:
            return json.loads(cached)
    # ---- /cache check ----

    today = datetime.utcnow().date()
    week_end = today + timedelta(days=7)

    total_emails = db.query(func.count(Email.id)).scalar() or 0

    category_rows = (
        db.query(Email.category, func.count(Email.id))
        .group_by(Email.category)
        .all()
    )

    priority_rows = (
        db.query(Email.priority, func.count(Email.id))
        .group_by(Email.priority)
        .all()
    )

    upcoming_events = (
        db.query(EmailEvent)
        .options(joinedload(EmailEvent.email))
        .filter(EmailEvent.event_date.isnot(None))
        .filter(EmailEvent.event_date >= today)
        .filter(EmailEvent.event_date <= week_end)
        .order_by(EmailEvent.event_date.asc())
        .limit(10)
        .all()
    )

    recent_important = (
        db.query(Email)
        .options(joinedload(Email.events))
        .filter(func.lower(Email.priority) == "high")
        .order_by(Email.received_at.desc().nullslast(), Email.id.desc())
        .limit(6)
        .all()
    )

    monthly_rows = (
        db.query(
            func.date_trunc("month", Email.received_at),
            func.count(Email.id),
        )
        .filter(Email.received_at.isnot(None))
        .group_by(func.date_trunc("month", Email.received_at))
        .order_by(func.date_trunc("month", Email.received_at))
        .all()
    )

    result = {
        "total_emails": total_emails,
        "internship_count": sum(
            count for category, count in category_rows if category and "intern" in category.lower()
        ),
        "placement_count": sum(
            count for category, count in category_rows if category and "placement" in category.lower()
        ),
        "high_priority_count": sum(
            count for priority, count in priority_rows if priority and priority.lower() == "high"
        ),
        "upcoming_deadlines": len(upcoming_events),
        "category_distribution": [
            {"category": category or "Uncategorized", "count": count}
            for category, count in category_rows
        ],
        "priority_distribution": [
            {"priority": priority or "Unassigned", "count": count}
            for priority, count in priority_rows
        ],
        "monthly_volume": [
            {
                "month": row[0].strftime("%Y-%m") if row[0] else "Unknown",
                "count": row[1],
            }
            for row in monthly_rows
        ],
        "upcoming_events": [serialize_event(event) for event in upcoming_events],
        "recent_important_emails": [serialize_email(email) for email in recent_important],
    }

    # Store in Redis cache for next request
    if r:
        try:
            r.setex(CACHE_KEY, CACHE_TTL, json.dumps(result))
        except Exception:
            pass  # Never let cache failures break the response

    return result



@router.post("/emails/test")
def create_test_email(db: Session = Depends(get_db)):
    email = Email(
        gmail_id="123",
        sender="test@gmail.com",
        subject="First Test Email",
        body="Hello from FastAPI",
    )

    db.add(email)
    db.commit()
    db.refresh(email)

    return {
        "message": "Email inserted",
        "id": email.id,
    }
