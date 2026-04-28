# Deploy — Cloudflare Pages + Railway

All three services + Postgres in a single Railway project, frontend on
Cloudflare Pages.

```
┌─ Railway project ────────────────────────────────┐
│  ┌──────────┐    ┌──────────┐    ┌────────────┐  │
│  │ backend  │───▶│ Postgres │◀───│   bot      │  │
│  │ :PORT    │    │ internal │    │ long-poll  │  │
│  └────┬─────┘    └──────────┘    └────────────┘  │
└───────┼──────────────────────────────────────────┘
        ▼
   Cloudflare Pages (static React, hits backend public URL)
        ▲
        │ X-Telegram-Init-Data
   Telegram Mini App  (BotFather → Configure Mini App)
```

## 1. Railway

1. https://railway.app → **New Project** → **Deploy from GitHub** → `ekbmusk/stembot`.
2. **Service: backend**
   - Root directory: `/backend`
   - Settings → Networking → **Generate Domain**
3. **+ Add Service** → **GitHub Repo** → same repo → **Service: bot**
   - Root directory: `/bot`
   - No public domain needed.
4. **+ Add Service** → **Database** → **PostgreSQL** (one-click template).
   The service is named `Postgres` and exposes `DATABASE_URL` internally.
5. Project-level **Variables** (shared by backend + bot):
   ```
   BOT_TOKEN=<from BotFather>
   TELEGRAM_BOT_TOKEN=<same as BOT_TOKEN>
   INTERNAL_BOT_TOKEN=<random 32-char secret>
   GROQ_API_KEY=<from groq.com>
   TEACHER_TELEGRAM_IDS=<your TG id>
   MINI_APP_URL=<placeholder, replaced after step 3>
   ```
6. **backend** service-only var (uses Railway's reference variable so the URL
   tracks any Postgres re-provisioning):
   ```
   DATABASE_URL=${{ Postgres.DATABASE_URL }}
   ```
7. **bot** service-only var:
   ```
   BACKEND_URL=https://<backend-public-domain>.up.railway.app
   ```
8. Deploy all three services. On first boot, backend runs SQLAlchemy
   `create_all` against Postgres and seeds the 26-case catalogue from
   `backend/seeds/cases.json`.
9. Sanity check:
   ```
   curl https://<backend>.up.railway.app/api/health
   # {"status":"ok"}
   ```

## 2. Cloudflare Pages

1. Cloudflare dashboard → Workers & Pages → **Create** → Pages →
   **Connect to Git** → `ekbmusk/stembot`.
2. Build settings:
   - Framework preset: **None**
   - Build command: `cd frontend && npm install && npm run build`
   - Build output directory: `frontend/dist`
3. Environment variables (Production):
   ```
   VITE_API_URL=https://<backend>.up.railway.app/api
   ```
4. Save & deploy. First build ≈ 2 min. Note the public URL
   (`https://<project>.pages.dev`).

## 3. Wire MINI_APP_URL back

Railway → project Variables → `MINI_APP_URL=https://<project>.pages.dev`.
Both backend and bot redeploy automatically.

## 4. BotFather

In Telegram → @BotFather:

1. `/mybots` → pick the bot → **Bot Settings** → **Configure Mini App** →
   **Enable Mini App** → enter the Cloudflare Pages URL.
2. (Optional) `/setmenubutton` → set "Кейстерді ашу" + same URL → adds the
   blue Mini App button to the chat input area.

## 5. Smoke test

1. `/start` in Telegram → welcome + Mini App button.
2. Tap → app opens inside Telegram, you're auto-registered.
3. Open a case → preview → Бастау → answer → Тапсыру → AI grades on the spot.
4. As teacher (your TG id in `TEACHER_TELEGRAM_IDS`): bottom nav switches to
   teacher tabs, dashboard / submissions / case editor are accessible.

## Persistence matrix

| | Where | Survives redeploy | Backed up |
|---|---|---|---|
| Users, submissions, answers, AI feedback, groups | Railway Postgres | ✓ | manual snapshot from Railway dashboard |
| Seeded cases | re-seeded on boot from `seeds/cases.json` | ✓ (idempotent) | irrelevant — in git |
| Cover images | `frontend/public/cases/...` baked into CF Pages build | ✓ | irrelevant — in git |
| `backend/uploads/` (file_upload task answers) | container disk | ✗ wipes on redeploy | ✗ |

`uploads/` is ephemeral — none of the 26 seeded cases use a `file_upload`
task. If you later add a case that asks the student to upload a photo/PDF,
plan to wire it to Cloudflare R2 (10 GB free) before shipping.

For real backups of Postgres, schedule a periodic `pg_dump` cron service in
Railway that uploads to R2 / S3. Railway's built-in snapshot feature works
but is manual.

## Local dev unchanged

`docker compose up` keeps using SQLite (`sqlite:///./stem_case_bot.db`) and a
local `backend/uploads/` dir. Postgres only kicks in when `DATABASE_URL` is a
`postgresql://` value (in production).

## Alternative: Neon Postgres

If you don't want Railway Postgres on the bill (it counts against your
Railway usage), point `DATABASE_URL` at a free [Neon](https://neon.tech)
project instead — same env var, no code change. Neon's free tier gives 0.5 GB
storage + 24h PITR backups + auto-suspend after 5 min idle.

If you go Neon, also bump `NOTIFIER_INTERVAL_SEC=300` on the **bot** service —
the default 30s polling would keep Neon's compute warm 24/7 and burn through
the 190 free compute hours fast.
