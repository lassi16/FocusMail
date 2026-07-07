from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker
from dotenv import load_dotenv
import os
from pathlib import Path

# Load .env from backend directory
backend_dir = Path(__file__).resolve().parent.parent.parent
load_dotenv(backend_dir / ".env")

DATABASE_URL = os.getenv("DATABASE_URL")

engine = create_engine(
    DATABASE_URL,
    # Verify each connection from the pool before using it.
    # This is the key fix for Neon serverless SSL drop errors.
    pool_pre_ping=True,
    # Discard connections older than 5 minutes (Neon suspends ~5 min idle).
    pool_recycle=300,
    # Keep the pool small — Neon free tier has a low connection limit.
    pool_size=5,
    max_overflow=2,
    connect_args={
        # TCP keepalive so the OS detects dead connections sooner.
        "keepalives": 1,
        "keepalives_idle": 30,
        "keepalives_interval": 10,
        "keepalives_count": 5,
        # Fail fast if the DB is unreachable (10s timeout).
        "connect_timeout": 10,
    },
)

SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine
)

Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()