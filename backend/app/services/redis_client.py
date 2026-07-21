"""
Redis client for FocusMail.

Used for:
  1. OAuth PKCE state store  (fixes multi-worker production login)
  2. JWT revocation blocklist (secure logout)
  3. Dashboard /stats cache   (avoid repeated heavy DB queries)
  4. LLM classification cache (avoid re-calling Groq for same email)

Configuration:
  Set REDIS_URL environment variable.
  Local dev default: redis://localhost:6379
  Production (Upstash): rediss://:<password>@<host>:6380   (note rediss:// for TLS)

If Redis is unavailable the helper functions degrade gracefully —
caches simply miss and return None, so the app continues to work.
"""

import logging
import os
from typing import Optional

import redis as redis_lib

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Singleton connection
# ---------------------------------------------------------------------------
_client: Optional[redis_lib.Redis] = None


def get_redis() -> Optional[redis_lib.Redis]:
    """
    Return a shared Redis client, or None if Redis is not configured / reachable.

    We return None instead of raising so callers can treat Redis as optional:
        r = get_redis()
        if r:
            r.setex(...)
    """
    global _client
    if _client is not None:
        return _client

    url = os.getenv("REDIS_URL", "redis://localhost:6379")
    try:
        _client = redis_lib.from_url(
            url,
            decode_responses=True,   # always return str, not bytes
            socket_connect_timeout=3,
            socket_timeout=3,
        )
        _client.ping()               # fail fast if unreachable
        logger.info("Redis connected: %s", url.split("@")[-1])  # hide password in logs
    except Exception as exc:
        logger.warning("Redis unavailable (%s) — caching disabled, app continues normally.", exc)
        _client = None

    return _client


# ---------------------------------------------------------------------------
# Namespaced key helpers  (keeps Redis keyspace tidy)
# ---------------------------------------------------------------------------

def pkce_key(state: str) -> str:
    """Key for storing an OAuth PKCE code_verifier by its state token."""
    return f"focusmail:pkce:{state}"


def blocklist_key(token: str) -> str:
    """Key for a revoked JWT token entry."""
    return f"focusmail:blocklist:{token}"


def stats_key(user_id: int) -> str:
    """Key for a cached /stats response for a specific user."""
    return f"focusmail:stats:{user_id}"


def classify_key(content_hash: str) -> str:
    """Key for a cached email classification result."""
    return f"focusmail:classify:{content_hash}"


def chat_key(query_hash: str) -> str:
    """
    Key for a cached AI chat answer.
    Same question asked again = instant answer from Redis, no Groq call.
    TTL: 5 minutes (short so new emails affect answers quickly).
    """
    return f"focusmail:chat:{query_hash}"


def emails_key(filter_hash: str) -> str:
    """
    Key for a cached filtered email list (inbox queries).
    Same filter combo = instant result from Redis, no DB query.
    TTL: 60 seconds.
    """
    return f"focusmail:emails:{filter_hash}"
