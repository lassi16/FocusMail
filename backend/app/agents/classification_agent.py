import json
import re
import logging

from app.services.llm.groq_client import client

logger = logging.getLogger(__name__)

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


def _extract_json(text: str) -> dict:
    """
    Robustly extract a JSON object from LLM output.
    Handles plain JSON, markdown code fences, and partial wrapping.
    """
    # 1. Strip markdown code fences: ```json ... ``` or ``` ... ```
    text = re.sub(r"```(?:json)?", "", text).strip()
    text = text.replace("```", "").strip()

    # 2. Try direct parse
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        pass

    # 3. Regex fallback: find the first {...} block in the text
    match = re.search(r"\{[^{}]+\}", text, re.DOTALL)
    if match:
        try:
            return json.loads(match.group())
        except json.JSONDecodeError:
            pass

    raise ValueError(f"No valid JSON found in LLM response: {text!r}")


def classify_email(subject: str, body: str) -> dict:
    system_message = (
        "You are an email classification assistant. "
        "You MUST respond with ONLY a raw JSON object — no markdown, no code fences, no explanation. "
        'Example: {"category": "Internship", "priority": "High"}'
    )

    user_prompt = f"""Classify the following email.

CATEGORIES (pick exactly one):
- Internship   → job/internship applications, offers, rejections, recruiter outreach
- Placement    → campus placement drives, company visits, HR from companies
- College      → college notices, faculty emails, academic announcements, results
- Meeting      → meeting requests, calendar invites, schedule coordination
- Finance      → bills, payments, bank alerts, transactions, subscriptions
- Personal     → friends, family, personal conversations, anything that doesn't fit above
- Promotion    → marketing emails, offers, discounts, newsletters
- Spam         → suspicious, irrelevant, bulk unsolicited email

PRIORITY RULES (pick exactly one):
- High   → action required urgently: deadlines, exam/assignment alerts, interview calls,
           recruiter emails, urgent meeting requests, payment due, important personal message
           explicitly marked urgent or time-sensitive
- Medium → informational but relevant: college notices, course updates, general announcements,
           non-urgent personal emails
- Low    → no action needed: promotions, newsletters, spam, marketing

Subject: {subject}

Body (first 1500 chars):
{body[:1500]}

Respond with ONLY this JSON, no other text:
{{"category": "<one of the 8 categories>", "priority": "<High|Medium|Low>"}}"""

    try:
        response = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[
                {"role": "system", "content": system_message},
                {"role": "user",   "content": user_prompt},
            ],
            temperature=0.0,   # deterministic — classification should not be creative
            max_tokens=64,     # we only need a small JSON blob
        )

        raw = response.choices[0].message.content or ""
        logger.debug("LLM raw classification response: %r", raw)

        data = _extract_json(raw)

    except Exception as exc:
        logger.error("Classification failed (subject=%r): %s", subject, exc)
        return {"category": "Personal", "priority": "Medium"}

    category = data.get("category", "Personal")
    priority = data.get("priority", "Medium")

    # Normalize casing from LLM (it might say "high" or "HIGH")
    category = next((c for c in VALID_CATEGORIES if c.lower() == category.lower()), "Personal")
    priority = next((p for p in VALID_PRIORITIES if p.lower() == priority.lower()), "Medium")

    return {"category": category, "priority": priority}