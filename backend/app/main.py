import logging
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy import text

from .database.db import engine
from .database.models import Base
from .api.rag import router as rag_router
from .api.emails import router as email_router
from .api.gmail import router as gmail_router
from .api.agents import router as agent_router
from .api.router import router as router_api
from .api.auth import router as auth_router, google_router

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Schema migration: add any columns that exist in the ORM models but are
# missing from the live Neon DB table (create_all won't ALTER existing tables).
# ---------------------------------------------------------------------------
_MIGRATIONS = [
    # emails table gained user_id after the table was first created
    """
    ALTER TABLE emails
        ADD COLUMN IF NOT EXISTS user_id INTEGER
        REFERENCES users(id) ON DELETE CASCADE
    """,
]

def run_startup_migrations() -> None:
    try:
        with engine.connect() as conn:
            for sql in _MIGRATIONS:
                conn.execute(text(sql))
            conn.commit()
        logger.info("Startup migrations applied successfully.")
    except Exception as exc:
        logger.error("Startup migration failed: %s", exc)

run_startup_migrations()
Base.metadata.create_all(bind=engine)

app = FastAPI(title="Email Intelligence Assistant")

# ---------------------------------------------------------------------------
# CORS — must be added BEFORE the exception handler so the headers are present
# on error responses too.
# ---------------------------------------------------------------------------
ALLOWED_ORIGINS = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:8000",
    "http://127.0.0.1:8000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------------------------------------------------------------------------
# Global exception handler — ensures unhandled 500s include CORS headers so
# the browser shows the real error instead of "Failed to fetch".
# ---------------------------------------------------------------------------
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.exception("Unhandled exception for %s %s", request.method, request.url)
    origin = request.headers.get("origin", "")
    headers = {}
    if origin in ALLOWED_ORIGINS:
        headers["Access-Control-Allow-Origin"] = origin
        headers["Access-Control-Allow-Credentials"] = "true"
    return JSONResponse(
        status_code=500,
        content={"detail": str(exc)},
        headers=headers,
    )


app.include_router(email_router)
app.include_router(gmail_router)
app.include_router(agent_router)
app.include_router(rag_router)
app.include_router(router_api)
app.include_router(auth_router)
app.include_router(google_router)


@app.get("/")
def root():
    return {"message": "Email Intelligence Assistant Backend Running"}