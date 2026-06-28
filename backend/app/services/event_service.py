from datetime import datetime

from app.database.models import EmailEvent
from app.agents.event_agent import extract_events


def process_events(email, db):

    events = extract_events(
        email.subject,
        email.body
    )

    print(f"Found {len(events)} events")

    for event in events:

        event_date = None

        if event.get("event_date"):

            try:

                event_date = datetime.strptime(
                    event["event_date"],
                    "%Y-%m-%d"
                ).date()

            except Exception:

                pass

        db_event = EmailEvent(

            email_id=email.id,

            event_type=event.get("event_type"),

            title=event.get("title"),

            description=event.get("description"),

            event_date=event_date,

            event_time=event.get("event_time"),

            priority=event.get("priority")

        )

        db.add(db_event)