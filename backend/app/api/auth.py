import base64
import hashlib
import json
import os
import secrets
import uuid
from datetime import datetime, timedelta
from pathlib import Path
from typing import Dict, Optional, Tuple

from fastapi import APIRouter, Depends, HTTPException, status, Header, Request
from fastapi.responses import RedirectResponse
from google_auth_oauthlib.flow import Flow
from googleapiclient.discovery import build
from sqlalchemy.orm import Session
from pydantic import BaseModel
from bcrypt import hashpw, checkpw, gensalt
from jose import JWTError, jwt

from app.database.db import get_db
from app.database.models import User, UserEmail

# ---------------------------------------------------------------------------
# Configuration — all read from environment variables.
# Local dev: set these in backend/.env
# Production: set these in Railway / Render dashboard
# ---------------------------------------------------------------------------
CREDENTIALS_PATH = Path(__file__).resolve().parents[2] / "credentials.json"

GOOGLE_SCOPES = [
    "openid",
    "https://www.googleapis.com/auth/userinfo.email",
    "https://www.googleapis.com/auth/userinfo.profile",
    "https://www.googleapis.com/auth/gmail.readonly",
    "https://www.googleapis.com/auth/gmail.send",
]

# In production set GOOGLE_REDIRECT_URI=https://your-railway-url/auth/callback
GOOGLE_REDIRECT_URI = os.getenv("GOOGLE_REDIRECT_URI", "http://localhost:8000/auth/callback")

# In production set FRONTEND_URL=https://your-vercel-url
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:3000")

# In production set SECRET_KEY to a long random string — never use the default!
SECRET_KEY = os.getenv("SECRET_KEY", "dev-secret-key-change-in-production")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7  # 7 days


router = APIRouter(prefix="/api/auth", tags=["auth"])


# Pydantic Models
class UserRegister(BaseModel):
    email: str
    password: str
    first_name: Optional[str] = None
    last_name: Optional[str] = None


class UserLogin(BaseModel):
    email: str
    password: str


class UserResponse(BaseModel):
    id: int
    email: str
    first_name: Optional[str]
    last_name: Optional[str]
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True


class TokenResponse(BaseModel):
    access_token: str
    token_type: str
    user: UserResponse


class TokenData(BaseModel):
    email: Optional[str] = None


# Utility Functions
def hash_password(password: str) -> str:
    """Hash a password using bcrypt"""
    return hashpw(password.encode(), gensalt()).decode()


def verify_password(password: str, password_hash: str) -> bool:
    """Verify a password against its hash"""
    return checkpw(password.encode(), password_hash.encode())


def create_access_token(
    data: dict, expires_delta: Optional[timedelta] = None
) -> str:
    """Create a JWT access token"""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt


def get_current_user(
    authorization: Optional[str] = Header(None), db: Session = Depends(get_db)
) -> User:
    """Get current user from JWT token in Authorization header"""
    if not authorization:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
            headers={"WWW-Authenticate": "Bearer"},
        )

    try:
        scheme, token = authorization.split()
        if scheme.lower() != "bearer":
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid authentication scheme",
            )
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authorization header",
        )

    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token",
            )
        token_data = TokenData(email=email)
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token",
        )

    user = db.query(User).filter(User.email == token_data.email).first()
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
        )
    return user


# Routes
@router.post("/register", response_model=TokenResponse)
def register(user_data: UserRegister, db: Session = Depends(get_db)):
    """Register a new user"""
    # Check if user already exists
    existing_user = db.query(User).filter(User.email == user_data.email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered",
        )

    # Create new user
    password_hash = hash_password(user_data.password)
    db_user = User(
        email=user_data.email,
        password_hash=password_hash,
        first_name=user_data.first_name,
        last_name=user_data.last_name,
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)

    # Create access token
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": db_user.email}, expires_delta=access_token_expires
    )

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": UserResponse.model_validate(db_user),
    }


@router.post("/login", response_model=TokenResponse)
def login(login_data: UserLogin, db: Session = Depends(get_db)):
    """Login user and return JWT token"""
    # Find user
    user = db.query(User).filter(User.email == login_data.email).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )

    # Verify password
    if not verify_password(login_data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )

    # Check if user is active
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is inactive",
        )

    # Create access token
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.email}, expires_delta=access_token_expires
    )

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": UserResponse.model_validate(user),
    }


@router.get("/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_user)):
    """Get current user info"""
    return UserResponse.model_validate(current_user)


@router.post("/logout")
def logout():
    """Logout user (handled on client side)"""
    return {"message": "Logged out successfully"}


@router.post("/refresh", response_model=TokenResponse)
def refresh_token(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Issue a fresh JWT for an already-authenticated user."""
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": current_user.email}, expires_delta=access_token_expires
    )
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": UserResponse.model_validate(current_user),
    }


google_router = APIRouter()

# In-memory store for state/code_verifier mapping during local dev
_google_oauth_state_store: Dict[str, str] = {}

# Allow insecure (http) OAuth redirect — only needed for local development.
# In production the redirect URI is https so this must NOT be set.
if os.getenv("GOOGLE_REDIRECT_URI", "").startswith("http://") or not os.getenv("GOOGLE_REDIRECT_URI"):
    os.environ.setdefault("OAUTHLIB_INSECURE_TRANSPORT", "1")


def _load_client_config() -> dict:
    """
    Load Google OAuth client config.

    Production: reads the GOOGLE_CREDENTIALS_JSON environment variable
                (set it to the full contents of credentials.json).
    Local dev:  falls back to the credentials.json file on disk.
    """
    raw = os.getenv("GOOGLE_CREDENTIALS_JSON")
    if raw:
        return json.loads(raw)
    with open(str(CREDENTIALS_PATH), "r", encoding="utf-8") as f:
        return json.load(f)


def _generate_pkce_pair() -> Tuple[str, str]:
    """Generate a PKCE (code_verifier, code_challenge) pair using S256 method."""
    # code_verifier: 32 random bytes, base64url-encoded (no padding)
    code_verifier = base64.urlsafe_b64encode(secrets.token_bytes(32)).rstrip(b"=").decode()
    # code_challenge: SHA-256 of verifier, base64url-encoded (no padding)
    digest = hashlib.sha256(code_verifier.encode()).digest()
    code_challenge = base64.urlsafe_b64encode(digest).rstrip(b"=").decode()
    return code_verifier, code_challenge


def _create_base_flow(state: Optional[str] = None) -> Flow:
    """Create a bare Google OAuth Flow (no PKCE auto-generation)."""
    return Flow.from_client_config(
        _load_client_config(),
        scopes=GOOGLE_SCOPES,
        redirect_uri=GOOGLE_REDIRECT_URI,
        state=state,
    )


@google_router.get("/auth/login")
def google_login():
    """Initiate Google OAuth login with manually-generated PKCE."""
    code_verifier, code_challenge = _generate_pkce_pair()

    flow = _create_base_flow()
    authorization_url, state = flow.authorization_url(
        access_type="offline",
        include_granted_scopes="true",
        prompt="consent",
        code_challenge=code_challenge,
        code_challenge_method="S256",
    )

    # Store verifier keyed by state so the callback can retrieve it
    _google_oauth_state_store[state] = code_verifier

    return RedirectResponse(authorization_url)


@google_router.get("/auth/callback")
def google_callback(request: Request, db: Session = Depends(get_db)):
    """Handle Google OAuth callback, exchange code for tokens, and log the user in."""
    # Check if Google returned an error (e.g. user denied permission)
    error = request.query_params.get("error")
    if error:
        return RedirectResponse(f"{FRONTEND_URL}/auth?error={error}")

    state = request.query_params.get("state")
    if not state:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="OAuth state is missing.",
        )

    code_verifier = _google_oauth_state_store.pop(state, None)
    if not code_verifier:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="OAuth state expired or code verifier is missing. Please try logging in again.",
        )

    # Re-create a bare flow for the callback and fetch token with the verifier
    flow = _create_base_flow(state=state)
    try:
        flow.fetch_token(
            authorization_response=str(request.url),
            code_verifier=code_verifier,
        )
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"OAuth token exchange failed: {exc}",
        )

    credentials = flow.credentials
    oauth2 = build("oauth2", "v2", credentials=credentials)
    user_info = oauth2.userinfo().get().execute()

    email = user_info.get("email")
    if not email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Unable to retrieve email from Google account.",
        )

    first_name = user_info.get("given_name")
    last_name = user_info.get("family_name")

    user = db.query(User).filter(User.email == email).first()
    if not user:
        user = User(
            email=email,
            password_hash=hash_password(str(uuid.uuid4())),
            first_name=first_name,
            last_name=last_name,
        )
        db.add(user)
        db.commit()
        db.refresh(user)
    else:
        if first_name and not user.first_name:
            user.first_name = first_name
        if last_name and not user.last_name:
            user.last_name = last_name
        db.commit()

    user_email = (
        db.query(UserEmail)
        .filter(UserEmail.user_id == user.id, UserEmail.provider == "gmail")
        .first()
    )

    refresh_token = credentials.refresh_token
    if user_email and not refresh_token:
        refresh_token = user_email.refresh_token

    if not user_email:
        user_email = UserEmail(
            user_id=user.id,
            email=email,
            provider="gmail",
            refresh_token=refresh_token,
            access_token=credentials.token,
            is_connected=True,
        )
        db.add(user_email)
    else:
        user_email.refresh_token = refresh_token
        user_email.access_token = credentials.token
        user_email.is_connected = True

    db.commit()

    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.email},
        expires_delta=access_token_expires,
    )

    frontend_redirect = f"{FRONTEND_URL}/auth/google/callback?token={access_token}"
    return RedirectResponse(frontend_redirect)

