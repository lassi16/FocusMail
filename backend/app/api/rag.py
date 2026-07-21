import hashlib
import json

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database.db import get_db
from app.database.models import Email

from app.rag.chroma_client import collection
from app.rag.embedding import generate_embedding

from app.agents.search_agent import search_emails
from app.agents.query_agent import answer_query
from app.services.redis_client import get_redis, chat_key

router = APIRouter()

# How long to cache a chat answer (seconds).
# 5 minutes — short enough that new synced emails start affecting answers quickly.
CHAT_CACHE_TTL = 60 * 5


@router.get("/index-emails")
def index_emails(
    db: Session = Depends(get_db)
):

    emails = db.query(Email).all()

    count = 0

    for email in emails:

        text = f"""
        Subject: {email.subject}

        Body:
        {email.body}

        Category:
        {email.category}
        """

        embedding = generate_embedding(text)

        collection.upsert(
            ids=[str(email.id)],
            embeddings=[embedding],
            documents=[text]
        )

        count += 1

    return {
        "indexed": count
    }

@router.get("/search")
def search_endpoint(query: str):
    return {
        "documents": search_emails(query)
    }

@router.get("/chat")
def chat(query: str):
    """
    AI chat over your emails using RAG.

    Redis cache: the full answer for a given query is cached for 5 minutes.
    - Same question typed again → instant answer from Redis (no ChromaDB search, no Groq call).
    - Cache expires after 5 min so new emails you sync start influencing answers quickly.
    - Cache key = MD5 of the lowercased query (case-insensitive matching).
    """
    # Normalise query so "High priority mails" and "high priority mails" hit the same key
    normalised = query.strip().lower()
    q_hash = hashlib.md5(normalised.encode()).hexdigest()
    cache_key = chat_key(q_hash)

    # Check Redis first
    r = get_redis()
    if r:
        cached = r.get(cache_key)
        if cached:
            data = json.loads(cached)
            # Add a flag so you can see in the response if it was served from cache
            data["cached"] = True
            return data

    # Cache miss — run the full RAG pipeline
    docs = search_emails(query)
    answer = answer_query(query, docs)

    result = {"answer": answer, "cached": False}

    # Store answer in Redis
    if r:
        try:
            r.setex(cache_key, CHAT_CACHE_TTL, json.dumps(result))
        except Exception:
            pass

    return result