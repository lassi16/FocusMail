from app.database.models import Email

from app.agents.classification_agent import classify_email

from app.services.event_service import process_events


def process_email(email: Email, db):
    """
    Central Email Processing Pipeline

    Every email entering the system passes through this pipeline.

    Current Stages:
    1. Category Agent
    2. Priority Agent
    3. Event Extraction Agent

    Future Stages:
    4. Entity Extraction Agent
    5. Insight Extraction Agent
    6. Chroma Indexing

    """

    print("\n========== EMAIL ==========")
    print("Subject:")
    print(email.subject)

    print("\nBody:")
    print(email.body)

    print("===========================\n")

    print("\n" + "=" * 60)
    print(f"Processing Email: {email.subject}")
    print("=" * 60)

    # --------------------------------------------------
# CLASSIFICATION AGENT
# --------------------------------------------------

    try:

        result = classify_email(
            email.subject,
            email.body
        )

        email.category = result["category"]
        email.priority = result["priority"]

        print(f"✓ Category : {email.category}")
        print(f"✓ Priority : {email.priority}")

    except Exception as e:

        print(f"✗ Classification Failed : {e}")

    # --------------------------------------------------
    # EVENT AGENT
    # --------------------------------------------------
    try:

        process_events(
            email,
            db
        )

        print("✓ Events Saved")

    except Exception as e:

        print(f"✗ Event Extraction Failed : {e}")

    return email