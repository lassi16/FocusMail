from app.services.llm.groq_client import client


def categorize_email(subject, body):

    prompt = f"""
    Categorize this email into one category only:

    Internship
    Placement
    College
    Meeting
    Finance
    Personal
    Promotion
    Spam

    Subject:
    {subject}

    Body:
    {body}

    Return only the category.
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

    category = response.choices[0].message.content.strip()

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

    if category not in VALID_CATEGORIES:
        category = "Personal"

    return category