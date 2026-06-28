from fastapi import APIRouter

from app.router.intent_router import detect_intent

router = APIRouter()


@router.get("/detect-intent")
def detect(query: str):

    return {
        "query": query,
        "domain": detect_intent(query)
    }