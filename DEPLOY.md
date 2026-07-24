# Deploy FocusMail (Vercel + Railway)

Recommended stack: **Vercel** (frontend) + **Railway** (backend) + **Neon** (Postgres) + **Upstash** (Redis).

## 1. Push code to GitHub

```bash
git add .
git commit -m "Prepare deployment"
git push origin main
```

Repo: https://github.com/lassi16/FocusMail

---

## 2. Database — Neon (free)

1. Create a project at [neon.tech](https://neon.tech)
2. Copy the **pooled** connection string
3. Example: `postgresql://user:pass@ep-xxx.aws.neon.tech/neondb?sslmode=require`

---

## 3. Redis — Upstash (free)

1. Create a database at [upstash.com](https://upstash.com)
2. Copy the **Redis URL** (`rediss://...`)

Required for production OAuth (PKCE) and caching.

---

## 4. Backend — Railway

1. Go to [railway.app](https://railway.app) → **New Project** → **Deploy from GitHub**
2. Select `lassi16/FocusMail`
3. **Settings → Root Directory:** `backend`
4. **Settings → Start Command:**
   ```
   uvicorn app.main:app --host 0.0.0.0 --port $PORT
   ```
5. Add **Variables**:

| Variable | Value |
|----------|-------|
| `DATABASE_URL` | Neon connection string |
| `GROQ_API_KEY` | From [console.groq.com](https://console.groq.com) |
| `REDIS_URL` | Upstash `rediss://` URL |
| `SECRET_KEY` | Long random string (e.g. `openssl rand -hex 32`) |
| `FRONTEND_URL` | `https://YOUR-APP.vercel.app` (set after step 5) |
| `GOOGLE_REDIRECT_URI` | `https://YOUR-BACKEND.up.railway.app/auth/callback` |
| `GOOGLE_CREDENTIALS_JSON` | Full JSON from Google Cloud (see below) |

6. Deploy and copy your Railway public URL (e.g. `https://focusmail-production.up.railway.app`)

### Google credentials for production

In Google Cloud Console → **Credentials** → your OAuth client:

- **Authorized redirect URIs:** add  
  `https://YOUR-BACKEND.up.railway.app/auth/callback`
- **Authorized JavaScript origins:** add  
  `https://YOUR-APP.vercel.app`

Paste the entire `credentials.json` contents into `GOOGLE_CREDENTIALS_JSON` on Railway.

---

## 5. Frontend — Vercel

1. Go to [vercel.com](https://vercel.com) → **Add New Project** → import `lassi16/FocusMail`
2. **Root Directory:** `frontend`
3. **Environment Variable:**

| Variable | Value |
|----------|-------|
| `NEXT_PUBLIC_API_URL` | Your Railway backend URL (no trailing slash) |

4. Deploy → copy Vercel URL (e.g. `https://focusmail.vercel.app`)

5. Go back to **Railway** and set `FRONTEND_URL` to your Vercel URL, then redeploy backend.

---

## 6. Verify deployment

| Check | URL |
|-------|-----|
| Backend health | `https://YOUR-BACKEND/` → `{"message":"Email Intelligence Assistant Backend Running"}` |
| API docs | `https://YOUR-BACKEND/docs` |
| Frontend | `https://YOUR-APP.vercel.app` |
| Google login | Sign in → should redirect back to dashboard |

After first login: click **Sync Gmail**, then **Index Emails**.

---

## Alternative: Docker on Render

Use `render.yaml` or connect Render to the repo with:

- **Dockerfile path:** `backend/Dockerfile`
- **Root directory:** `backend`
- Same environment variables as Railway

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| `redirect_uri_mismatch` | Redirect URI in Google Cloud must exactly match `GOOGLE_REDIRECT_URI` |
| CORS / Failed to fetch | Set `FRONTEND_URL` on backend to exact Vercel URL |
| OAuth state expired | Ensure `REDIS_URL` is set on backend |
| Build timeout on Railway | Uses `requirements-prod.txt` (slim deps, no TensorFlow) |
