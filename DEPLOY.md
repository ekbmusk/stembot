# Deploy — Cloudflare Pages + Railway + Neon

Frontend on Cloudflare Pages (static), backend + bot on Railway (Docker, no
volume), Postgres on Neon (3 GB free with automatic backups). SQLite-on-volume
is _not_ used in this layout because Railway volumes need a paid plan; Neon
gives us proper persistence + backups for free.

## 1. Neon — database

1. https://neon.tech → sign up → **New Project**
   - Region: closest to Railway region (e.g. `eu-central-1` for FRA Railway)
   - Postgres version: 16 (default)
2. Copy the **Pooled connection** string. It looks like:
   ```
   postgresql://owner:password@ep-xxx-pooler.eu-central-1.aws.neon.tech/dbname?sslmode=require
   ```
   Use the pooled (PgBouncer) URL — it survives Railway restarts better than
   the direct connection.

## 2. Railway — backend + bot

1. https://railway.app → **New Project** → **Deploy from GitHub** → `ekbmusk/stembot`.
2. Add **Service: backend**
   - Root directory: `/backend`
   - Dockerfile: auto-detected
   - Settings → Networking → Generate Domain
3. Add **Service: bot** (same project, **+ Add Service** → GitHub → same repo)
   - Root directory: `/bot`
   - No public domain needed (bot polls Telegram outbound).
4. Project-level **Variables** (shared by both services):

   ```
   BOT_TOKEN=<from BotFather>
   TELEGRAM_BOT_TOKEN=<same as BOT_TOKEN>
   INTERNAL_BOT_TOKEN=<random 32-char secret>
   GROQ_API_KEY=<from groq.com>
   TEACHER_TELEGRAM_IDS=<your TG id>
   MINI_APP_URL=<the Cloudflare Pages URL — set after step 3>
   ```
5. **backend** service-only var (the Neon URL from step 1):

   ```
   DATABASE_URL=postgresql://owner:password@ep-xxx-pooler.eu-central-1.aws.neon.tech/dbname?sslmode=require
   ```
6. **bot** service-only var:

   ```
   BACKEND_URL=https://<backend-public-domain>.up.railway.app
   ```
7. Deploy both services. On first boot the backend creates all tables in Neon
   and seeds the 26-case catalogue from `backend/seeds/cases.json`.
8. Sanity check:
   ```
   curl https://<backend>.up.railway.app/api/health
   # {"status":"ok"}
   ```

## 3. Cloudflare Pages — frontend

1. Cloudflare dashboard → Workers & Pages → Create → Pages → Connect to Git → `ekbmusk/stembot`.
2. Build settings:
   - Framework preset: **None**
   - Build command: `cd frontend && npm install && npm run build`
   - Build output directory: `frontend/dist`
3. Environment variables (Production):

   ```
   VITE_API_URL=https://<backend>.up.railway.app/api
   ```
4. Save & deploy. First build ≈ 2 min.
5. Get the public URL (`https://<project>.pages.dev`).

## 4. Wire MINI_APP_URL back

1. Railway → project Variables → `MINI_APP_URL=https://<project>.pages.dev`.
2. Both services redeploy automatically.
3. The bot's "Кейстерді ашу" button now points at the live Mini App.

## 5. BotFather — register the Mini App

In Telegram → @BotFather:

1. `/mybots` → pick the bot → **Bot Settings** → **Configure Mini App** →
   **Enable Mini App** → enter the Cloudflare Pages URL.
2. (Optional) `/setmenubutton` → set "Кейстерді ашу" + same URL → adds the
   blue Mini App button to the chat input area.

## 6. Smoke test

1. `/start` in Telegram → welcome + Mini App button.
2. Tap button → app opens inside Telegram, you're auto-registered.
3. Open a case → preview → Бастау → answer → Тапсыру → AI grades on the spot.
4. As teacher (your TG id in `TEACHER_TELEGRAM_IDS`): bottom nav switches to
   teacher tabs, dashboard / submissions / case editor are accessible.

## What's persistent vs ephemeral

| | Where | Survives redeploy | Backed up |
|---|---|---|---|
| Users, submissions, answers, feedback, groups | Neon Postgres | ✓ | ✓ (Neon point-in-time recovery, 7d on free) |
| Seeded cases | re-seeded on boot from `seeds/cases.json` | ✓ (idempotent) | irrelevant — in git |
| Cover images | `frontend/public/cases/...` baked into CF Pages build | ✓ | irrelevant — in git |
| `backend/uploads/` (file_upload task answers) | container disk | ✗ wipes on redeploy | ✗ |

The `uploads/` ephemeral situation is fine for now — none of the 26 seeded
cases use a `file_upload` task. If you later add a case that asks the student
to upload a photo/PDF, plan to wire it to Cloudflare R2 (10 GB free) before
shipping that case to students.

## Local dev unchanged

`docker compose up` keeps using SQLite (`sqlite:///./stem_case_bot.db`) and a
local `backend/uploads/` dir. The Neon URL only kicks in when Railway sets
`DATABASE_URL` to a `postgresql://` value.
