# Deploy — Cloudflare Pages + Railway

Frontend on Cloudflare Pages (static), backend + bot on Railway (Docker, with
a shared persistent volume for SQLite and uploads).

## 1. Railway — backend + bot

1. Create a new Railway project, link the GitHub repo `ekbmusk/stembot`.
2. Add **Service: backend**
   - Root directory: `/backend`
   - Dockerfile: auto-detected
   - Volume: attach a 1 GB volume mounted at `/data`
   - Generate a public domain (Settings → Networking → Generate Domain)
3. Add **Service: bot** to the same project
   - Root directory: `/bot`
   - Dockerfile: auto-detected
   - No public domain needed (bot polls Telegram outbound)
4. Project-level **Variables** (shared by both services):

   ```
   BOT_TOKEN=<from BotFather>
   TELEGRAM_BOT_TOKEN=<same as BOT_TOKEN>
   INTERNAL_BOT_TOKEN=<random 32-char secret>
   GROQ_API_KEY=<from groq.com>
   TEACHER_TELEGRAM_IDS=<your TG id>
   MINI_APP_URL=<the Cloudflare Pages URL — set after step 2>
   ```
5. **backend** service-only vars:

   ```
   DATABASE_URL=sqlite:////data/stem_case_bot.db
   UPLOAD_DIR=/data/uploads
   ```
   The four slashes in the URL are intentional — it's an absolute path.
6. **bot** service-only var:

   ```
   BACKEND_URL=https://<backend-public-domain>.up.railway.app
   ```
   Use the public domain from step 2.4.
7. Deploy both services. Wait for healthy status.
8. Sanity check: `curl https://<backend>.up.railway.app/api/health` → `{"status":"ok"}`.

## 2. Cloudflare Pages — frontend

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
5. Get the public URL (`https://<project>.pages.dev` or your custom domain).

## 3. Wire MINI_APP_URL back

1. In Railway → both services → set `MINI_APP_URL=https://<project>.pages.dev`.
2. Restart both services.
3. Bot's "Кейстерді ашу" button now opens the real Mini App.

## 4. BotFather — register the Mini App

In Telegram → @BotFather:

1. `/mybots` → pick the bot → **Bot Settings** → **Configure Mini App** →
   **Enable Mini App** → enter the Cloudflare Pages URL.
2. (Optional) `/setmenubutton` → set "Кейстерді ашу" + same URL → makes the
   blue Mini App button always visible in chat.
3. (Optional) `/setdescription` and `/setabouttext` for the bot profile.

## 5. Smoke test

1. Open a Telegram chat with the bot, send `/start` → welcome + Mini App button.
2. Tap the button → app opens inside Telegram, you're auto-registered.
3. Open a case → preview → start → answer → finalize → AI grades.
4. As teacher (your TG id in TEACHER_TELEGRAM_IDS): bottom nav switches to
   teacher tabs, dashboard / submissions / case editor accessible.

## Notes

- `--reload` is only used in `docker-compose.yml`. The Dockerfile CMD honors
  `$PORT` for cloud platforms.
- SQLite + a single volume is fine for ≤ a few thousand submissions. When you
  outgrow it, swap `DATABASE_URL` to a Railway/Neon Postgres URL — SQLAlchemy
  models work unchanged.
- Cloudflare Pages free tier has no bandwidth cap; Railway free tier gives ~$5
  of monthly credit, after which it's pay-as-you-go (~$5 backend + ~$2 bot).
