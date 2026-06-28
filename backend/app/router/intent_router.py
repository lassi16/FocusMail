from rapidfuzz import fuzz
from app.config.intent_keywords import INTENT_KEYWORDS


def detect_intent(query: str):

    query = query.lower()

    best_domain = "general"
    best_score = 0

    for domain, keywords in INTENT_KEYWORDS.items():

        for keyword in keywords:

            score = fuzz.partial_ratio(
                query,
                keyword.lower()
            )

            if score > best_score:
                best_score = score
                best_domain = domain

    if best_score < 70:
        return "general"

    return best_domain