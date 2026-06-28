import json

from app.services.llm.groq_client import client


def extract_events(subject, body):

    prompt = f"""
You are an event extraction assistant.

Extract EVERY event mentioned in this email.

Possible event types:

- application_deadline
- interview
- meeting
- assignment
- exam
- payment_due
- registration
- orientation
- reminder
- other

Return ONLY valid JSON.

Example:

[
    {{
        "event_type":"application_deadline",
        "title":"Google Summer Internship",
        "description":"Application closes",
        "event_date":"2026-06-30",
        "event_time":null,
        "priority":"High"
    }},
    {{
        "event_type":"interview",
        "title":"Google Interview",
        "description":"Online Interview",
        "event_date":"2026-07-05",
        "event_time":"10:00 AM",
        "priority":"High"
    }}
]

If there are no events return:

[]

Subject:
{subject}

Body:
{body}
"""

    response = client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[
            {
                "role": "user",
                "content": prompt
            }
        ]
    )

    content = response.choices[0].message.content

    print("\n========== EVENT AGENT ==========")
    print(content)
    print("=================================\n")

    try:
        return json.loads(content)

    except Exception:
        return []