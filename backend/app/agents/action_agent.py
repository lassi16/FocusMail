import json

from sympy import content

from app.services.llm.groq_client import client


def extract_action(subject, body):

    prompt = f"""
    Extract action items and deadlines.

    Return JSON only.

    Example:

    {{
      "task": "Submit assignment",
      "deadline": "Friday"
    }}

    If none found:

    {{
      "task": null,
      "deadline": null
    }}

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

    # Remove markdown code fences
    content = content.replace("```json", "")
    content = content.replace("```", "")
    content = content.strip()

    print("\n========== CLEANED RESPONSE ==========")
    print(content)
    print("=====================================\n")

    try:
        return json.loads(content)
    except Exception as e:
        print("JSON ERROR:", e)

        return {
            "task": None,
            "deadline": None
        }