# FocusMail — AI-Powered Email Intelligence Assistant

> Sync your Gmail inbox, auto-classify every email by category & priority, extract deadlines and events, compose & reply to emails, and chat with your inbox using a RAG-powered AI assistant.

---

## Table of Contents

1. [Features](#features)
2. [Architecture & Flow Diagrams](#architecture--flow-diagrams)
3. [Tech Stack](#tech-stack)
4. [Vector DB & Semantic Search (Deep Dive)](#vector-db--semantic-search-deep-dive)
5. [Redis Caching Strategy (Deep Dive)](#redis-caching-strategy-deep-dive)
6. [Project Structure](#project-structure)
7. [Prerequisites](#prerequisites)
8. [Google Cloud Setup (OAuth + Gmail API)](#google-cloud-setup-oauth--gmail-api)
9. [Backend Setup](#backend-setup)
10. [Redis Setup (Optional but Recommended)](#redis-setup)
11. [Frontend Setup](#frontend-setup)
12. [Deployment Guide](#deployment-guide)
13. [First-Time Usage](#first-time-usage)
14. [API Reference](#api-reference)
15. [Troubleshooting](#troubleshooting)

---

## Features

| Feature | Description |
|---|---|
| **Google Sign-In** | One-click OAuth 2.0 with PKCE — no email/password needed |
| **Gmail Sync** | Fetches your last 20 emails via the Gmail API |
| **Compose & Reply** | Send new emails or reply to any email directly from FocusMail |
| **AI Classification** | Every email auto-tagged with a **category** (Internship, College, Finance, etc.) and **priority** (High / Medium / Low) using Groq's `llama-3.3-70b-versatile` |
| **Event Extraction** | Deadlines, interviews, exams, and meetings auto-extracted from email bodies |
| **Dashboard** | Overview of email stats, priority distribution, and upcoming events |
| **Inbox** | Filterable email list with category/priority filters and full-text search |
| **Calendar** | Visual calendar of all extracted events |
| **AI Chat** | Ask natural language questions about your emails (RAG-powered) |
| **Analytics** | Charts for email volume, category and priority distribution |
| **Redis Caching** | PKCE state store, JWT revocation, stats cache, LLM classification cache |

---

## Architecture & Flow Diagrams

### 1. System Architecture

How all the pieces fit together:

```mermaid
graph TD
    User(["👤 User Browser"])

    subgraph Frontend ["Frontend — Next.js on Vercel"]
        Auth["Auth Page\n(Google Sign-In)"]
        Dashboard["Dashboard"]
        Inbox["Inbox\n(Compose / Reply)"]
        Chat["AI Chat"]
        Analytics["Analytics"]
    end

    subgraph Backend ["Backend — FastAPI on Railway"]
        AuthAPI["auth.py\n(OAuth / JWT)"]
        GmailAPI["gmail.py\n(Sync / Send)"]
        EmailsAPI["emails.py\n(Stats / List)"]
        RAGAPI["rag.py\n(Chat / Search)"]
        Processor["email_processor.py"]
        ClassAgent["classification_agent.py"]
        EventAgent["event_agent.py"]
    end

    subgraph Storage ["Storage Layer"]
        Neon[("🐘 Neon PostgreSQL\n(Users / Emails / Events)")]
        Redis[("🔴 Redis\n(Cache / Blocklist / PKCE)")]
        Chroma[("🔵 ChromaDB\n(Email Embeddings)")]
    end

    subgraph External ["External APIs"]
        Google["Google OAuth 2.0"]
        GmailSvc["Gmail API"]
        Groq["Groq LLM\n(llama-3.3-70b)"]  
    end

    User --> Frontend
    Frontend --> Backend
    AuthAPI --> Google
    AuthAPI --> Redis
    GmailAPI --> GmailSvc
    GmailAPI --> Processor
    Processor --> ClassAgent
    Processor --> EventAgent
    ClassAgent --> Groq
    ClassAgent --> Redis
    EventAgent --> Groq
    EmailsAPI --> Redis
    EmailsAPI --> Neon
    RAGAPI --> Chroma
    RAGAPI --> Groq
    Processor --> Neon
    Processor --> Chroma
```

---

### 2. Google OAuth Login Flow

What happens when you click "Continue with Google":

```mermaid
sequenceDiagram
    actor User
    participant Frontend as Next.js Frontend
    participant Backend as FastAPI Backend
    participant Redis as Redis
    participant Google as Google OAuth
    participant DB as Neon PostgreSQL

    User->>Frontend: Click "Continue with Google"
    Frontend->>Backend: GET /auth/login
    Backend->>Backend: Generate PKCE pair\n(code_verifier + code_challenge)
    Backend->>Redis: SETEX pkce:{state} 600 code_verifier
    Backend->>Frontend: 302 Redirect → Google consent screen
    Frontend->>Google: User signs in & grants permissions
    Google->>Backend: GET /auth/callback?code=...&state=...
    Backend->>Redis: GETDEL pkce:{state} → code_verifier
    Backend->>Google: Exchange code + verifier for tokens
    Google->>Backend: access_token + refresh_token
    Backend->>DB: Upsert User + UserEmail (store tokens)
    Backend->>Backend: Create JWT (7-day expiry)
    Backend->>Frontend: 302 Redirect → /auth/google/callback?token=JWT
    Frontend->>Frontend: Save JWT to localStorage
    Frontend->>User: Redirect to Dashboard ✅
```

---

### 3. Gmail Sync & AI Processing Pipeline

What happens when you click "Sync Gmail":

```mermaid
flowchart TD
    A(["User clicks Sync Gmail"]) --> B["GET /gmail/sync\n(FastAPI)"]
    B --> C["Load user's Gmail tokens\nfrom Neon DB"]
    C --> D["Build Gmail API service\n(auto-refresh token if expired)"]
    D --> E["Fetch last 20 messages\nfrom Gmail API"]
    E --> F{"Email already\nin DB?"}
    F -- Yes --> G["Skip — already processed"]
    F -- No --> H["Extract subject, sender,\nbody, date"]
    H --> I["Save raw email to Neon DB"]
    I --> J{"Redis cache\nhit?"}
    J -- Yes --> K["Return cached\ncategory + priority"]
    J -- No --> L["Call Groq LLM\nclassify_email()"]
    L --> M["Parse JSON response\ncategory + priority"]
    M --> N["Store result in Redis\n30-day TTL"]
    N --> K
    K --> O["Update email in DB\nwith category + priority"]
    O --> P["Call Groq LLM\nextract events"]
    P --> Q["Save events to DB\n(deadlines, meetings, exams)"]
    Q --> R["Generate embedding\n(SentenceTransformer)"]
    R --> S["Store in ChromaDB\nfor RAG search"]
    S --> T(["✅ Email fully processed"])
```

---

### 4. Redis Caching Strategy

How Redis integrates into every major request:

```mermaid
flowchart LR
    subgraph Login ["🔐 OAuth Login"]
        L1["Generate PKCE pair"] --> L2["SETEX pkce:state\n10-min TTL"]
        L3["Callback arrives"] --> L4["GETDEL pkce:state"]
    end

    subgraph Logout ["🚪 Logout"]
        LO1["POST /api/auth/logout"] --> LO2["SETEX blocklist:token\n7-day TTL"]
        LO3["Every auth'd request"] --> LO4{"GET blocklist:token?"}
        LO4 -- exists --> LO5["401 Token revoked"]
        LO4 -- missing --> LO6["✅ Allow request"]
    end

    subgraph Stats ["📊 Stats Cache"]
        S1["GET /stats"] --> S2{"GET stats:0?"}
        S2 -- hit --> S3["Return cached JSON"]
        S2 -- miss --> S4["Run 6 SQL queries"]
        S4 --> S5["SETEX stats:0\n60-sec TTL"]
        S5 --> S3
    end

    subgraph Classify ["🧠 LLM Cache"]
        C1["classify_email()"] --> C2{"GET classify:MD5?"}
        C2 -- hit --> C3["Return cached result"]
        C2 -- miss --> C4["Call Groq API"]
        C4 --> C5["SETEX classify:MD5\n30-day TTL"]
        C5 --> C3
    end
```

---

## Tech Stack

### Backend

| Technology | Purpose |
|---|---|
| **FastAPI** | REST API framework |
| **SQLAlchemy** | ORM for database access |
| **Neon PostgreSQL** | Serverless cloud PostgreSQL database |
| **Redis** | PKCE OAuth state, JWT blocklist, API response cache, LLM result cache |
| **Groq API** | LLM inference (`llama-3.3-70b-versatile`) for classification & event extraction |
| **ChromaDB** | Vector database for RAG (semantic email search) |
| **SentenceTransformers** | `all-MiniLM-L6-v2` model for generating embeddings |
| **google-auth-oauthlib** | Google OAuth 2.0 PKCE flow |
| **google-api-python-client** | Gmail API — read & send emails |
| **python-jose** | JWT access token creation/verification |
| **bcrypt** | Password hashing |

### Frontend

| Technology | Purpose |
|---|---|
| **Next.js 16** (App Router) | React framework |
| **TypeScript** | Type safety |
| **Tailwind CSS v4** | Styling |
| **Recharts** | Analytics charts |
| **Lucide React** | Icons |

---

## Vector DB & Semantic Search (Deep Dive)

### What Problem Does It Solve?

Normal database search is **keyword-based** — it looks for exact word matches.
If you type `"urgent deadline"` it only finds emails containing those exact words.
If an email says `"please submit before Friday"` — a normal DB search misses it completely.

**Semantic search** understands *meaning*, not just words.
It knows `"urgent deadline"` and `"please submit before Friday"` mean the same thing.
This is what powers the AI Chat in FocusMail.

---

### What It Uses

| Component | What it does |
|---|---|
| **ChromaDB** | Local vector database — stores email embeddings and searches them |
| **SentenceTransformers** | `all-MiniLM-L6-v2` model — converts text into a list of 384 numbers (a vector) |
| **Groq LLM** | Takes the search results and writes a human-readable answer |

---

### How It Works Step by Step

#### Phase 1 — Indexing (done once after sync)

```
Email body + subject + category
        ↓
  SentenceTransformer model
  "all-MiniLM-L6-v2"
        ↓
  384 floating-point numbers  →  [0.23, -0.11, 0.84, 0.02, ...]
  (this is called an "embedding" or "vector")
        ↓
  Stored in ChromaDB with the email ID as the key
```

Every email becomes a point in a 384-dimensional mathematical space.
Emails with **similar meaning** end up **close together** in this space.

#### Phase 2 — Searching (every chat query)

```
User types: "show me internship rejection emails"
        ↓
  Same SentenceTransformer model runs on the query
        ↓
  Query vector: [0.18, -0.09, 0.79, ...]
        ↓
  ChromaDB finds the 5 closest email vectors
  ("closest" = most similar in meaning)
        ↓
  Returns those 5 email bodies as context
        ↓
  Groq LLM reads those 5 emails + your question
        ↓
  Writes a natural language answer: "You have 3 rejection emails from..."
```

#### Full RAG Pipeline Flowchart

```mermaid
flowchart TD
    A(["User types a question in Chat"]) --> B["GET /chat?query=.."]
    B --> C{"Redis cache hit?\n(same question asked before)"}
    C -- Yes --> D["Return cached answer\ninstantly ~5ms"]
    C -- No --> E["Generate query embedding\nSentenceTransformer"]
    E --> F["Search ChromaDB\nfind 5 most similar emails"]
    F --> G["Send question + 5 emails\nto Groq LLM"]
    G --> H["LLM generates\nnatural language answer"]
    H --> I["Store answer in Redis\n5-minute TTL"]
    I --> J(["Return answer to user ~2-3s"])
    D --> J
```

---

### Advantages Over Normal DB Search

| Normal DB Search | Semantic Search (ChromaDB + Embeddings) |
|---|---|
| Exact word match only | Matches by meaning |
| `LIKE '%internship%'` misses synonyms | Finds "job offer", "placement drive", "recruiter" all as internship-related |
| Fast but dumb | Slightly slower but intelligent |
| Can't answer questions | LLM turns results into a readable answer |
| No context understanding | Understands "it" refers to the deadline mentioned earlier |

### Example

```
Query: "do I have any pending payments?"

Normal search: looks for emails with word "pending" AND "payments"
Semantic search: finds emails about bills, subscriptions, bank alerts,
                 invoices, and due dates — even if those exact words aren't used
```

---

### Limitations

| Limitation | Explanation |
|---|---|
| Needs indexing first | Run `/index-emails` after syncing for search to work |
| Local storage | ChromaDB stores on disk — not shared across multiple servers |
| Model size | `all-MiniLM-L6-v2` is ~80MB, downloaded on first startup |
| Top-5 only | Only the 5 most similar emails are sent to the LLM as context |

---

## Redis Caching Strategy (Deep Dive)

### Why Redis and Not Just Memory?

A Python dictionary (`{}`) in memory works locally but breaks in production:
- If the server **restarts**, all data is gone
- If you run **2+ server workers** (Railway does this), each worker has its own memory — they can't share data

Redis is an **external shared memory** — all workers, all restarts, one source of truth.

---

### All 5 Cache Keys Explained

#### 1. `focusmail:classify:{md5}` — LLM Email Classification

```
What's stored:  {"category": "Internship", "priority": "High"}
Key built from: MD5( subject + first 500 chars of body )
TTL:            30 days
When set:       After Groq classifies a new email
When read:      Next time the same email content is classified (re-sync)
When useful:    If you clear DB and re-sync the same inbox
```

#### 2. `focusmail:chat:{md5}` — AI Chat Answer Cache ⭐ Most Impactful

```
What's stored:  {"answer": "You have 3 high priority internship emails...", "cached": true}
Key built from: MD5( lowercased query string )
TTL:            5 minutes
When set:       After Groq generates an answer
When read:      Same question asked again within 5 minutes
When useful:    Every time — people ask the same things repeatedly
```

> Why 5 minutes? Short enough that if you sync new emails, the next question
> gets fresh results. Long enough to benefit repeated clicks.

#### 3. `focusmail:emails:{md5}` — Filtered Inbox List ⭐ Most Impactful

```
What's stored:  {"total": 45, "emails": [...], "limit": 50, "offset": 0}
Key built from: MD5( sorted categories + sorted priorities + limit + offset )
TTL:            60 seconds
When set:       After DB query runs for a filter combination
When read:      Same filter combo used again within 60 seconds
When useful:    Every time you switch tabs or re-open inbox with same filters
NOT cached:     Free text search (too dynamic — stale results would be confusing)
```

#### 4. `focusmail:stats:0` — Dashboard Statistics

```
What's stored:  Full stats JSON (totals, charts, upcoming events, recent emails)
Key built from: Static key (stats are global, not per-user)
TTL:            60 seconds
When set:       After 6 heavy GROUP BY queries run
When read:      Every dashboard open within 60 seconds
When useful:    Dashboard is opened frequently — saves repeated DB aggregation
```

#### 5. `focusmail:pkce:{state}` — OAuth Login State

```
What's stored:  PKCE code_verifier string
Key built from: OAuth state parameter (random UUID from Google)
TTL:            10 minutes
When set:       When user clicks "Continue with Google"
When read:      When Google redirects back to /auth/callback (deleted immediately after)
When useful:    CRITICAL in production — fixes login with multiple server workers
```

#### 6. `focusmail:blocklist:{token}` — Revoked JWT Tokens

```
What's stored:  "revoked" (just the presence matters, not the value)
Key built from: The full JWT token string
TTL:            7 days (matches max token lifetime)
When set:       When user clicks Logout
When read:      Every authenticated API request
When useful:    Prevents stolen/leaked tokens from being used after logout
```

---

### Cache Hit Rate — What to Expect

| Usage pattern | Expected hit rate |
|---|---|
| First day (fresh setup) | ~20-40% (mostly misses — nothing cached yet) |
| After a week of daily use | ~70-85% (common queries and filters all cached) |
| Heavy repeated use | ~90%+ (same questions, same inbox views) |

> Your current hit rate after first setup was **38.9%** — this is normal and will increase.

---

### Graceful Degradation

All Redis calls are **optional** — if Redis goes down or is not configured:

```python
r = get_redis()   # Returns None if Redis is unreachable
if r:             # Only use Redis if it's available
    cached = r.get(key)
```

The app continues working normally — just without caching benefits.
The only exception: PKCE state falls back to in-memory dict (which breaks multi-worker login).

---

### Upstash Free Tier Limits

| Limit | Value | Your usage |
|---|---|
---|
| Commands/day | 10,000 | Very low currently |
| Storage | 256 MB | Tiny (text JSON only) |
| Max connections | 100 | Fine for this app |

---

## Project Structure

```
email-intelligence-assistant/
├── backend/
│   ├── .env                            # Backend environment variables (not committed)
│   ├── credentials.json                # Google OAuth credentials (not committed)
│   ├── Procfile                        # Railway/Render start command
│   ├── requirements.txt
│   └── app/
│       ├── main.py                     # FastAPI app, CORS, startup migrations
│       ├── database/
│       │   ├── db.py                   # SQLAlchemy engine (Neon PostgreSQL)
│       │   └── models.py               # User, UserEmail, Email, EmailEvent models
│       ├── api/
│       │   ├── auth.py                 # Google OAuth, JWT, logout blocklist
│       │   ├── gmail.py                # /gmail/sync, /gmail/send, /gmail/reply
│       │   ├── emails.py               # /emails, /events, /stats (Redis cached)
│       │   ├── rag.py                  # /chat, /search, /index-emails
│       │   └── agents.py               # /detect-intent
│       ├── agents/
│       │   ├── classification_agent.py # Category + Priority via LLM (Redis cached)
│       │   ├── event_agent.py          # Event extraction via LLM
│       │   ├── query_agent.py          # RAG answer generation
│       │   └── search_agent.py         # ChromaDB semantic search
│       ├── services/
│       │   ├── email_processor.py      # Orchestrates the processing pipeline
│       │   ├── event_service.py        # Saves extracted events to DB
│       │   ├── redis_client.py         # Redis singleton + namespaced key helpers
│       │   ├── gmail/
│       │   │   └── gmail_auth.py       # Gmail API service builder
│       │   └── llm/
│       │       └── groq_client.py      # Groq API client
│       └── rag/
│           ├── chroma_client.py        # ChromaDB persistent client
│           └── embedding.py            # SentenceTransformer (lazy-loaded)
└── frontend/
    ├── .env.local                      # Frontend environment variables (not committed)
    ├── app/
    │   ├── auth/page.tsx               # Google Sign-In page (single button)
    │   ├── auth/google/callback/       # Google OAuth callback handler
    │   ├── dashboard/page.tsx
    │   ├── inbox/page.tsx
    │   ├── calendar/page.tsx
    │   ├── chat/page.tsx
    │   ├── analytics/page.tsx
    │   └── settings/emails/page.tsx
    ├── components/
    │   ├── layout/                     # AppShell, Sidebar, Header
    │   ├── dashboard/                  # DashboardClient
    │   ├── inbox/                      # InboxClient, ComposeModal
    │   └── ui/                         # Button, Card, Badge, StatCard
    └── lib/
        ├── api.ts                      # All backend API calls (incl. sendEmail)
        ├── auth-context.tsx            # React auth context + localStorage helpers
        └── types.ts                    # Shared TypeScript types
```

---

## Prerequisites

Make sure the following are installed:

- **Python 3.11+** — [python.org/downloads](https://www.python.org/downloads/)
- **Node.js 18+** — [nodejs.org](https://nodejs.org/)
- **Git** — [git-scm.com](https://git-scm.com/)
- A **Neon** account (free) — [neon.tech](https://neon.tech/)
- A **Groq** account (free) — [console.groq.com](https://console.groq.com/)
- A **Google Cloud** account (free) — [console.cloud.google.com](https://console.cloud.google.com/)

---

## Google Cloud Setup (OAuth + Gmail API)

This is the most important setup section. Follow every step carefully.

---

### Step 1 — Create a Google Cloud Project

1. Go to [console.cloud.google.com](https://console.cloud.google.com/).
2. Click the **project dropdown** at the top → **New Project**.
3. Enter a project name (e.g. `FocusMail`) and click **Create**.
4. Make sure it is **selected** in the dropdown before continuing.

---

### Step 2 — Enable the Gmail API

1. In the left sidebar go to **APIs & Services → Library**.
2. Search for **"Gmail API"** → click it → click **Enable**.

---

### Step 3 — Configure the OAuth Consent Screen

1. Go to **APIs & Services → OAuth consent screen**.
2. Choose **External** → click **Create**.
3. Fill in:
   - **App name**: `FocusMail`
   - **User support email**: your Google account email
   - **Developer contact information**: your email
4. Click **Save and Continue**.

**On the "Scopes" page:**

5. Click **Add or Remove Scopes**.
6. Select all of the following:

   | Scope | Purpose |
   |---|---|
   | `openid` | Basic sign-in identification |
   | `.../auth/userinfo.email` | Read your email address |
   | `.../auth/userinfo.profile` | Read your name/profile |
   | `.../auth/gmail.readonly` | Read Gmail messages (sync) |
   | `.../auth/gmail.send` | Send emails on your behalf (compose & reply) |

7. Click **Update** → **Save and Continue** → **Back to Dashboard**.

---

### Step 4 — Add Test Users

> ⚠️ **This step is required.** While in **Testing** mode, only listed test users can sign in. Anyone else gets blocked with "Google hasn't verified this app".

1. Go to **APIs & Services → OAuth consent screen**.
2. Scroll to **"Test users"** → click **+ Add Users**.
3. Enter the Gmail address(es) you want to allow.
4. Click **Save**.

> You can add up to **100 test users**. For public access, publish the app (requires Google review for sensitive scopes).

---

### Step 5 — Create OAuth 2.0 Credentials

1. Go to **APIs & Services → Credentials**.
2. Click **+ Create Credentials → OAuth client ID**.
3. **Application type**: Web application.
4. **Name**: `FocusMail Web Client`.
5. Under **Authorized redirect URIs**, add:
   ```
   http://localhost:8000/auth/callback
   ```
6. Click **Create**.

---

### Step 6 — Download credentials.json

1. Click the **Download** icon (↓) next to the credential you just created.
2. Rename the downloaded file to `credentials.json`.
3. Place it at: `backend/credentials.json`

The file must look like this:

```json
{
  "web": {
    "client_id": "YOUR_CLIENT_ID.apps.googleusercontent.com",
    "project_id": "your-project-id",
    "auth_uri": "https://accounts.google.com/o/oauth2/auth",
    "token_uri": "https://oauth2.googleapis.com/token",
    "client_secret": "YOUR_CLIENT_SECRET",
    "redirect_uris": ["http://localhost:8000/auth/callback"]
  }
}
```

> ⚠️ **Never commit `credentials.json` to Git.** It is listed in `.gitignore`.

---

## Backend Setup

### Backend Environment Variables

Create `backend/.env`:

```env
# Groq API Key — get yours free at https://console.groq.com/keys
GROQ_API_KEY=gsk_your_groq_api_key_here

# Neon PostgreSQL connection string — get yours at https://neon.tech
DATABASE_URL=postgresql://username:password@ep-xxxx.region.aws.neon.tech/neondb?sslmode=require&channel_binding=require

# Redis (optional for local dev — app works without it)
# Local: redis://localhost:6379
# Upstash (production): rediss://:password@host:6380
REDIS_URL=redis://localhost:6379

# --- Production only (leave blank for local dev) ---
# SECRET_KEY=your-long-random-secret-key
# GOOGLE_REDIRECT_URI=https://your-railway-url/auth/callback
# FRONTEND_URL=https://your-vercel-url
```

**Getting your Neon DATABASE_URL:**
1. Sign up at [neon.tech](https://neon.tech) (free tier).
2. Create a project → click **Connect** → copy the **Pooled connection string**.
3. Make sure it ends with `?sslmode=require&channel_binding=require`.

**Getting your Groq API Key:**
1. Sign up at [console.groq.com](https://console.groq.com).
2. Go to **API Keys → Create API Key** → copy the key (starts with `gsk_`).

---

### Install Dependencies

```bash
cd backend

# Create and activate a virtual environment
python -m venv venv

# Windows
venv\Scripts\activate

# macOS / Linux
source venv/bin/activate

# Install all packages from requirements.txt
pip install -r requirements.txt
```

> **Note:** `sentence-transformers` downloads the `all-MiniLM-L6-v2` model (~80 MB) on first use. It is lazy-loaded so it won't slow down server startup.

---

### Run the Backend Server

```bash
# Make sure you are in the backend/ directory with venv activated
uvicorn app.main:app --reload
```

Backend starts at **http://127.0.0.1:8000**.

On first startup:
- All database tables are created automatically.
- Any missing columns are added via startup migrations.

Verify: [http://127.0.0.1:8000](http://127.0.0.1:8000) → `{"message": "Email Intelligence Assistant Backend Running"}`

Interactive docs: [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)

---

## Redis Setup

Redis is **optional** for local development — the app degrades gracefully (caches miss, PKCE state falls back to in-memory dict). For production it is strongly recommended.

### What Redis Powers

| Feature | Redis Key | TTL | Benefit |
|---|---|---|---|
| OAuth PKCE state | `focusmail:pkce:{state}` | 10 min | Fixes multi-worker login in production |
| JWT revocation | `focusmail:blocklist:{token}` | 7 days | Secure logout — token is truly invalidated |
| Dashboard stats cache | `focusmail:stats:0` | 60 sec | Avoids repeated heavy SQL queries |
| LLM classification cache | `focusmail:classify:{md5}` | 30 days | Never re-classifies the same email twice |

### Option A — Local Redis (Windows via Chocolatey)

```bash
# Install Chocolatey first if not present: https://chocolatey.org/install
choco install redis-64
redis-server
```

Then set in `backend/.env`:
```
REDIS_URL=redis://localhost:6379
```

### Option B — Local Redis via Docker

```bash
docker run -d -p 6379:6379 redis
```

### Option C — Upstash (Free Cloud Redis, best for production)

1. Go to [upstash.com](https://upstash.com) → Create a free account.
2. Click **Create Database** → choose a region → **Create**.
3. Copy the **`UPSTASH_REDIS_REST_URL`** or the `rediss://` connection string.
4. Set in `backend/.env`:
   ```
   REDIS_URL=rediss://:your-password@your-host.upstash.io:6380
   ```

> The app logs `Redis connected` on startup if the connection succeeds, or `Redis unavailable — caching disabled` if it can't connect (and continues normally).

---

## Frontend Setup

### Frontend Environment Variables

Create `frontend/.env.local`:

```env
NEXT_PUBLIC_API_URL=http://127.0.0.1:8000
```

---

### Install & Run

```bash
cd frontend
npm install
npm run dev
```

Frontend starts at **http://localhost:3000**.

---

## Deployment Guide

### Backend → Railway

1. Go to [railway.app](https://railway.app) → **Login with GitHub**.
2. **New Project → Deploy from GitHub repo** → select your repo.
3. Set **Root Directory** to `backend`.
4. In **Settings**, set **Start Command**:
   ```
   uvicorn app.main:app --host 0.0.0.0 --port $PORT
   ```
5. In **Variables**, add:

   | Variable | Value |
   |---|---|
   | `DATABASE_URL` | Your Neon connection string |
   | `GROQ_API_KEY` | Your Groq key |
   | `SECRET_KEY` | A long random string |
   | `GOOGLE_REDIRECT_URI` | `https://YOUR-RAILWAY-URL/auth/callback` |
   | `FRONTEND_URL` | `https://YOUR-VERCEL-URL` |
   | `GOOGLE_CREDENTIALS_JSON` | Full contents of `credentials.json` (paste the JSON) |
   | `REDIS_URL` | Your Upstash `rediss://` URL |

6. Click **Deploy**. Railway auto-detects Python from `requirements.txt`.

---

### Frontend → Vercel

1. Go to [vercel.com](https://vercel.com) → **Login with GitHub**.
2. **New Project → Import** your repo → set **Root Directory** to `frontend`.
3. Add environment variable:

   | Variable | Value |
   |---|---|
   | `NEXT_PUBLIC_API_URL` | `https://YOUR-RAILWAY-URL` |

4. Click **Deploy**.

---

### Update Google Cloud for Production

After deploying, add your production URLs to Google Cloud:

1. **APIs & Services → Credentials → your OAuth client**.
2. Under **Authorized redirect URIs** → add:
   ```
   https://YOUR-RAILWAY-URL/auth/callback
   ```
3. Under **Authorized JavaScript origins** → add:
   ```
   https://YOUR-VERCEL-URL
   ```
4. Click **Save**.

> After updating credentials, re-download `credentials.json` and update `GOOGLE_CREDENTIALS_JSON` in Railway.

---

## First-Time Usage

1. Open [http://localhost:3000](http://localhost:3000).
2. Click **"Continue with Google"**.
3. Sign in with an account added in [Step 4](#step-4--add-test-users).
4. Grant permissions:
   - View basic profile info
   - View your email address
   - **View Gmail messages** (read)
   - **Send email on your behalf** (compose & reply)
5. You'll land on the dashboard.
6. Click **"Sync Gmail"** to fetch and process emails:
   - Each email is classified by category and priority (LLM).
   - Deadlines, meetings, and events are extracted automatically.
7. Explore **Dashboard**, **Inbox** (compose/reply available), **Calendar**, **Analytics**, and **Chat**.

> **Re-sign in required:** If you had previously signed in, sign out and back in once to grant the new `gmail.send` permission.

---

## API Reference

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/auth/login` | No | Initiate Google OAuth (redirects to Google) |
| `GET` | `/auth/callback` | No | Google OAuth callback handler |
| `GET` | `/api/auth/me` | JWT | Get current user info |
| `POST` | `/api/auth/logout` | JWT | Logout + revoke token in Redis |
| `POST` | `/api/auth/refresh` | JWT | Issue a fresh JWT |
| `GET` | `/gmail/sync` | JWT | Sync last 20 Gmail messages |
| `POST` | `/gmail/send` | JWT | Send a new email |
| `POST` | `/gmail/reply/{gmail_id}` | JWT | Reply to an existing email |
| `GET` | `/emails` | No | List emails (category, priority, search filters) |
| `GET` | `/emails/{id}` | No | Get single email with its events |
| `GET` | `/events` | No | List calendar events |
| `GET` | `/stats` | No | Dashboard statistics (Redis cached 60s) |
| `GET` | `/chat?query=` | No | AI chat over your emails (RAG) |
| `GET` | `/search?query=` | No | Semantic email search |
| `POST` | `/index-emails` | No | Index all emails into ChromaDB |

---

## Environment Files Summary

| File | Purpose | Committed? |
|---|---|---|
| `backend/.env` | Groq key, Neon URL, Redis URL, secrets | ❌ No |
| `backend/credentials.json` | Google OAuth client credentials | ❌ No |
| `frontend/.env.local` | Backend API URL | ❌ No |

---

## Troubleshooting

### "Google hasn't verified this app" / access blocked
Your account is not in the **Test users** list. Go to Google Cloud Console → APIs & Services → OAuth consent screen → Test users → add your Gmail address.

### "This app isn't verified" warning
Click **Advanced** → **"Go to FocusMail (unsafe)"**. Expected during development/testing mode.

### "redirect_uri_mismatch" error
The redirect URI in Google Cloud doesn't match. Make sure you added exactly `http://localhost:8000/auth/callback` (no trailing slash, no HTTPS) under Authorized redirect URIs.

### "OAuth state expired" on login (production)
Caused by multiple workers sharing no common state. Fix: add Redis (`REDIS_URL`). The PKCE state is then stored in Redis and visible to all workers.

### "Token has been revoked. Please log in again."
You logged out — your token was added to the Redis blocklist. Just sign in again.

### Dashboard "Cannot reach the backend"
- Make sure `uvicorn app.main:app --reload` is running in `backend/`.
- Check `frontend/.env.local` has `NEXT_PUBLIC_API_URL=http://127.0.0.1:8000`.
- The dashboard auto-retries 3 times. Use the **Retry** button if it fails.

### All emails showing "Personal / Medium" priority
The Groq LLM was returning JSON inside markdown code fences which broke parsing. Already fixed in `classification_agent.py`. **Re-sync your emails** to get correct classifications.

### Gmail sync returns 0 emails
Sign out and sign back in with Google — this refreshes the OAuth tokens. If you previously signed in without `gmail.send` scope, you must re-authenticate to grant the new scope.

### "SSL connection has been closed unexpectedly" (Neon DB)
Neon's free-tier suspends after ~5 min of inactivity. Handled automatically via `pool_pre_ping=True`. Restart uvicorn if it persists.

### "column emails.user_id does not exist"
Run the backend once — the startup migration in `main.py` runs `ALTER TABLE emails ADD COLUMN IF NOT EXISTS user_id` automatically.

---

## License

MIT — feel free to fork and adapt for your own use.
