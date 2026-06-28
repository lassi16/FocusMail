import json

from app.services.llm.groq_client import client


VALID_CATEGORIES = [
    "Internship",
    "Placement",
    "College",
    "Meeting",
    "Finance",
    "Personal",
    "Promotion",
    "Spam"
]

VALID_PRIORITIES = [
    "High",
    "Medium",
    "Low"
]


def classify_email(subject, body):

    prompt = f"""
You are an intelligent email classifier.

Analyze the email.

Return ONLY valid JSON.

Example:

{{
    "category":"Internship",
    "priority":"High"
}}

Categories:

- Internship
- Placement
- College
- Meeting
- Finance
- Personal
- Promotion
- Spam

Priority Rules:

High
- Internship
- Recruiter
- Deadlines
- Assignments
- Exams
- Meetings

Medium
- College Notices
- Informational

Low
- Marketing
- Promotions
- Spam
- Newsletters

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

    try:

        data = json.loads(
            response.choices[0].message.content
        )

    except:

        return {
            "category": "Personal",
            "priority": "Medium"
        }

    category = data.get("category", "Personal")
    priority = data.get("priority", "Medium")

    if category not in VALID_CATEGORIES:
        category = "Personal"

    if priority not in VALID_PRIORITIES:
        priority = "Medium"

    return {
        "category": category,
        "priority": priority
    }