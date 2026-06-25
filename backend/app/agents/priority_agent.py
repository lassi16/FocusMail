from app.services.llm.groq_client import client


def get_priority(subject, body):

    prompt = f"""
    Determine the importance of this email.

    Possible values:

    High
    Medium
    Low

    Rules:

    High:
    - Deadlines
    - Assignments
    - Recruiter emails
    - Internship opportunities
    - Meeting invitations

    Medium:
    - Informational emails
    - Course announcements

    Low:
    - Promotions
    - Marketing
    - Newsletters

    Subject:
    {subject}

    Body:
    {body}

    Return ONLY:
    High
    Medium
    or
    Low
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

    return response.choices[0].message.content.strip()