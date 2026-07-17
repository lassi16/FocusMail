import json
import os
from pathlib import Path
from typing import Optional

from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow
from googleapiclient.discovery import build

SCOPES = [
    "openid",
    "email",
    "profile",
    "https://www.googleapis.com/auth/gmail.readonly",
    "https://www.googleapis.com/auth/gmail.send",
]

CREDENTIALS_PATH = Path(__file__).resolve().parents[3] / "credentials.json"


def _load_client_config() -> dict:
    """
    Load Google OAuth client config.
    Production: from GOOGLE_CREDENTIALS_JSON environment variable.
    Local dev:  from credentials.json file on disk.
    """
    raw = os.getenv("GOOGLE_CREDENTIALS_JSON")
    if raw:
        return json.loads(raw)
    with open(str(CREDENTIALS_PATH), "r", encoding="utf-8") as f:
        return json.load(f)


def get_gmail_service():
    client_config = _load_client_config()
    flow = InstalledAppFlow.from_client_config(
        client_config,
        SCOPES,
    )

    creds = flow.run_local_server(host="localhost", port=8080)
    return build("gmail", "v1", credentials=creds)


def get_gmail_service_for_tokens(
    access_token: Optional[str],
    refresh_token: Optional[str],
):
    client_config = _load_client_config()["web"]

    creds = Credentials(
        token=access_token,
        refresh_token=refresh_token,
        token_uri=client_config["token_uri"],
        client_id=client_config["client_id"],
        client_secret=client_config["client_secret"],
        scopes=SCOPES,
    )

    # We don't store the expiry timestamp in the DB, so creds.expired is
    # unreliable. Proactively refresh whenever a refresh_token is available
    # to guarantee a valid access token before any Gmail API call.
    if creds.refresh_token:
        creds.refresh(Request())

    return build("gmail", "v1", credentials=creds)
