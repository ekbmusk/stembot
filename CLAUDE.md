# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

STEM Case Bot — a Telegram Mini App that teaches STEM through real-world **cases** (kейстер). A case is a structured scenario, not just a lecture. Each case has:

- **мақсаты** — learning objective (`objective_kk`)
- **фото** — cover image (`cover_image_url`) plus inline photos in content blocks
- **жағдаят** — narrative situation/context that frames the problem (`situation_kk`)
- **теориялық түсінік** — theoretical primer with formulas if needed (`theory_kk`)
- **құрал-жабдықтар** — equipment list, structured (`equipment`)
- **тапсырмалар** — graded tasks the student must answer (`tasks`)
- **видео** — embedded videos (`videos`), first-class content type, primarily YouTube

**One Mini App** serves two roles, gated by Telegram user ID:

- **Student** (оқушы) — browses the case catalogue, opens a case, reads the situation, watches the videos, studies the theory, then answers each task. Photos and equipment lists render inline.
- **Teacher / mentor** (мұғалім) — same Mini App, but the backend recognises the Telegram ID (via `TEACHER_TELEGRAM_IDS`) and unlocks: case authoring with a block editor that supports text / formula / image / video / equipment / task blocks, group progress dashboards, submission review, broadcast composer.

There is **no separate teacher web app**. Role detection happens server-side; the frontend renders student or teacher screens from the same React app.

Conventions:

- User-facing language: **Kazakh**. Engineering language: English.
- Formula format: LaTeX (`$...$` inline, `$$...$$` block), rendered with KaTeX.
- Video format: **YouTube IFrame embed via `youtube-nocookie.com`** primary, with optional self-hosted MP4 fallback for content that may be blocked at the network level. Never rely on autoplay-with-sound.
- Core stack: React 18 + Vite 5 + TailwindCSS 3, FastAPI + SQLAlchemy 2 + Pydantic 2, aiogram 3, SQLite. AI assistance is optional (Groq llama-3.3-70b via OpenAI SDK) and only used to explain concepts on demand — not part of the core flow.
- No test suite exists. No linting/formatting configs.

## Local Development Commands

```bash
# Backend (API docs at localhost:8000/docs) — must run from backend/
cd backend && source .venv/bin/activate && pip install -r requirements.txt
uvicorn main:app --reload --port 8000

# Frontend (single Mini App — student + teacher views) — Vite dev server on :3000, proxies /api → localhost:8000
cd frontend && npm install && npm run dev

# Bot
cd bot && pip install -r requirements.txt && python main.py

# Docker (all services: frontend :3000, backend :8000)
docker-compose up --build
```

### Deployment

```bash
# Frontend — Cloudflare Pages
cd frontend && npm run build && npm run pages:deploy

# Backend — Render (configured in render.yaml)
# Auto-deploys from git. Manual: push to main.
```

## Architecture

### Three services

- **frontend/** — Single Telegram Mini App for both roles. React + Zustand + axios + Recharts (for teacher charts) + react-hook-form/zod + hello-pangea/dnd (for the case editor). On launch, backend returns `{ role: "student" | "teacher" }`; the app branches into `routes/student/*` or `routes/teacher/*`. Sends `X-Telegram-Init-Data` header on every API request (interceptor in `src/api/client.js`). Deployed via Cloudflare Pages.
- **backend/** — FastAPI REST API. All routes under `/api/`. Thin routers → `app/services/` for business logic. SQLite DB auto-creates, migrates columns, and seeds data on startup (`create_tables()` in lifespan). Teacher-only routes are protected by a `require_teacher` dependency that checks the Telegram ID against `TEACHER_TELEGRAM_IDS`.
- **bot/** — aiogram 3 long-polling bot. Communicates with backend via httpx. Sends reminders for assigned cases and notifies teachers when new submissions arrive.

### Backend internals

- **AI service** (`app/services/ai_service.py`, optional): uses **Groq API** via `AsyncOpenAI(base_url="https://api.groq.com/openai/v1")`. Model: `llama-3.3-70b-versatile`, temp 0.3, max 1000 tokens. System prompt enforces Kazakh-only STEM responses with jailbreak detection. Used for "explain this concept" and "hint for this task" features.
- **Database** (`app/database/database.py`): `create_tables()` on startup → `_migrate_sqlite()` (ALTER TABLE for missing columns) → seed default groups and a small case catalogue. All idempotent.
- **Auth** (`app/utils/auth.py`): No password login, no JWT. Both students and teachers authenticate purely via Telegram initData (`X-Telegram-Init-Data`). Teacher role is decided server-side by checking the Telegram user ID against `TEACHER_TELEGRAM_IDS` env var (comma-separated). Students are auto-registered on first launch. The `require_teacher` FastAPI dependency rejects non-teacher requests to `/api/teacher/*` and other privileged routes. No Telegram initData signature validation on backend — trusts frontend header.
- **Submissions** (`app/services/submission_service.py`): `create_submission()` (one record per case attempt), `answer_task()` (validates against the task's type and rubric), `grade_submission()` (teacher sets per-task scores + feedback), `get_group_progress()` (per-student case completion matrix).
- **Models**:
  - `User` (role: student | teacher) with `submissions`, `enrollments` cascade.
  - `Group`, `GroupEnrollment` (User ↔ Group many-to-many) — replaces "Class" because STEM cases aren't strictly grade-bound.
  - `STEMCase` — top-level case record with `objective_kk`, `situation_kk`, `theory_kk`, `cover_image_url`, `equipment` (JSON list), `subject`, `difficulty`, `age_range`, `tags`.
  - `CaseBlock` — ordered rich content blocks per case. Block types: `text` | `formula` | `image` | `video` | `equipment` | `safety` | `divider` | `task`. The editor reorders blocks via drag-and-drop.
  - `CaseVideo` — denormalised video pointers. Fields: `provider` (`youtube` | `mp4`), `external_id_or_url`, `title_kk`, `duration_sec`, `position`. Either embedded inline as a `video` block or surfaced as a top-level video list on the case detail screen.
  - `CaseTask` — graded items inside a case. Fields: `case_id`, `position`, `prompt_kk`, `type` (`open_text` | `numeric` | `multiple_choice` | `file_upload`), `options` (JSON, for MCQ), `expected_answer` (for auto-grading), `points`, `rubric_kk`.
  - `CaseSubmission` — student attempt at a case (`user_id`, `case_id`, `status`, `total_score`, `submitted_at`).
  - `TaskAnswer` — one row per task per submission (`submission_id`, `task_id`, `payload` JSON, `score`, `feedback`, `auto_graded` flag).
  - `TeacherFeedback`, `Notification`, `BroadcastLog` — same patterns as the physics-bot project for cross-cutting concerns.
- **Cascades**: `User → CaseSubmission` cascade delete. `STEMCase → CaseBlock`, `STEMCase → CaseTask`, `STEMCase → CaseVideo`, `CaseSubmission → TaskAnswer` all cascade delete.

### Backend API routes (`/api/`)

| Group | Key endpoints |
|-------|--------------|
| `/users` | `POST /register` (returns role), `GET /{id}/avatar` (proxies Telegram API), `GET /me` |
| `/cases` | `GET /` (filter by subject/difficulty/tag), `GET /{id}` (full case content + blocks + videos + tasks), `GET /subjects` (taxonomy) |
| `/submissions` | `POST /` (create attempt), `POST /{id}/answers` (submit per-task answer), `POST /{id}/finalize`, `GET /mine`, `GET /{id}` |
| `/groups` | `GET /`, `POST /` (teacher), `POST /{id}/enroll`, `DELETE /{id}/enroll/{student_id}`, `GET /{id}/progress` (case × student matrix) |
| `/teacher` | Telegram-ID-gated via `require_teacher`. `GET /stats` (aggregate completion, average scores), `GET /students`, `POST /broadcast`, `GET /submissions?group_id&case_id&status`, `POST /cases` / `PATCH /cases/{id}` (content editor), `PATCH /submissions/{id}/grade` (per-task scoring). |
| `/ai` | `POST /ask` (concept explanation, with jailbreak check), `POST /hint` (hint for a task). Optional. |
| `/uploads` | `POST /submissions/{case_id}` (photo / file upload for `file_upload` tasks), `GET /submissions/{user_id}/{case_id}/{filename}` (auth-gated). |

### Frontend internals

- **State**: `store/userStore.js` (user + role + isAuthenticated), `store/caseStore.js` (case catalogue cache by subject, current case, current submission draft with per-task answers map). Zustand, no persist middleware.
- **API layer**: `src/api/client.js` (axios, baseURL from `VITE_API_URL` or `/api`, 15s timeout, auto-attaches Telegram initData). Individual API modules in `src/api/` per domain (`cases.js`, `submissions.js`, `groups.js`, `teacher.js`).
- **Role routing**: `App.jsx` reads `user.role` after `/users/register`. Student → `/cases` catalogue + case detail + task answer flow. Teacher → `/teacher/dashboard` (full monitoring: group lists, case × student matrix, submission inspector with photos/answers/grading, case content editor, broadcast composer). Both roles share `FormulaRenderer`, `VideoPlayer`, `CaseBlocks`, and the case detail viewer.
- **Teacher views** (under `src/routes/teacher/`):
  - `Dashboard.jsx` — aggregate stats with Recharts (completion %, average scores).
  - `GroupMatrix.jsx` — case × student status grid; click a cell → `SubmissionDetail.jsx` (per-task answers with photos, score input, feedback form).
  - `CaseEditor.jsx` — drag-and-drop block editor (hello-pangea/dnd) with live KaTeX preview and inline YouTube preview. Block types: text, formula, equipment, image, **video**, safety, divider, task.
  - `Broadcast.jsx` — pick groups → send a message via the bot.
- **Authorization**: the frontend hides teacher routes for students, but the real gate is the backend `require_teacher` dependency. Don't rely on UI hiding alone.
- **FormulaRenderer** (`src/components/FormulaRenderer.jsx`): KaTeX-backed, parses mixed text+LaTeX (`$$...$$`, `$...$`, `\[...\]`, `\(...\)`). Has `glow` prop for styled display.
- **VideoPlayer** (`src/components/VideoPlayer.jsx`): renders YouTube embeds via `<iframe src="https://www.youtube-nocookie.com/embed/<id>?rel=0&modestbranding=1">` with 16:9 aspect ratio. For `provider="mp4"`, falls back to `<video controls preload="metadata">`. iOS Telegram WebView fullscreen is unreliable, so the player also exposes a "YouTube-те ашу" button that calls `Telegram.WebApp.openLink(url)` as escape hatch.
- **Case content blocks**: Rendered by `CaseBlocks.jsx`, one component per block type (`text`, `formula`, `equipment`, `image`, `video`, `safety`, `divider`, `task`). The `task` block is interactive — it captures the student's answer for that task and stores it in `caseStore.draft.answers[task_id]`.
- **Telegram SDK**: `WebApp.ready()` + `expand()` + `setHeaderColor('#0F0F1A')` in App.jsx. Onboarding gate via `localStorage.onboarding_completed`.
- **Vite config**: `envDir: '../'` (reads .env from project root), dev proxy `/api` → `localhost:8000`.
- **Tailwind theme**: Dark mode only. Custom colors (bg: #0F0F1A, surface: #1A1A2E, primary: #6C63FF). Font: Inter.

### Bot internals

- **Handlers**: start (register + role-aware welcome with Mini App button), profile, my_cases (student: in-progress + completed list), assigned (cases assigned by teachers), help (static), notifications (case reminders + new-submission alerts to teachers).
- **Communication**: All backend calls via `httpx.AsyncClient` with 5–10s timeout. Silent failure pattern (try/except pass).

## STEM Curriculum Model

Cases are categorised primarily by **subject**, secondarily by **difficulty** and **age_range**. Suggested taxonomy (extend as content is authored):

- **subject** (string tag, lowercase):
  - `biology`, `chemistry`, `physics`, `mathematics`, `informatics`, `engineering`, `astronomy`, `ecology`, `interdisciplinary`
- **difficulty**:
  - `easy` | `medium` | `hard`
- **age_range** (free-form, e.g. `12-14`, `15-17`, `7+`)
- **tags**: open list — for cross-cutting themes like `robotics`, `climate`, `genetics`, `data-analysis`.

Each `STEMCase` record carries: `subject`, `difficulty`, `age_range`, `tags`, `title_kk`, `objective_kk` (мақсаты), `cover_image_url` (фото), `situation_kk` (жағдаят), `theory_kk` (теориялық түсінік), `equipment` (құрал-жабдықтар, structured list of `{name, qty, purpose}`), and relations to `CaseBlock` (mixed content), `CaseVideo` (видео), `CaseTask` (тапсырмалар).

### Task types (`CaseTask.type`)

| Type | Payload from student | Auto-grading |
|------|----------------------|--------------|
| `open_text` | `{ "text": "…" }` | No — teacher reviews. |
| `numeric` | `{ "value": 12.5 }` | Yes when `expected_answer` is set; tolerance configurable per task. |
| `multiple_choice` | `{ "selected": [0, 2] }` | Yes — compares against `expected_answer.indexes`. |
| `file_upload` | `{ "files": ["url1", …] }` | No — teacher reviews. |

The submission flow is: create `CaseSubmission` → `POST /submissions/{id}/answers` per task → `POST /submissions/{id}/finalize` to lock and notify teacher. Auto-graded tasks set their score immediately; teacher-graded tasks stay `score = null` until the teacher reviews.

### Video conventions

- Always store a normalised `external_id_or_url`. For YouTube, store **just the video ID** (`dQw4w9WgXcQ`), not the full URL — the frontend builds the embed URL.
- Use `youtube-nocookie.com` for embeds (avoids cookie consent in EU traffic, lighter tracking).
- For on-network blocks (some Kazakhstan school networks throttle YouTube), the case author can attach a fallback by adding a second `CaseVideo` row with `provider="mp4"` pointing at a self-hosted file. The player picks the working source.

## Engineering Conventions

- User-facing content in Kazakh; code/docs in English.
- Frontend: 100% Tailwind utilities (no `.module.css`). Mobile-first, Telegram WebView compatible. Haptic feedback on interactions.
- Backend: Thin routers → services. Pydantic schemas for all request/response. LaTeX validation checks brace/`$` balance in teacher-facing schemas.
- Task answers are validated against the task's `type` server-side before saving — never trust client validation alone.
- Photos and uploaded files in submissions are stored on disk under `backend/uploads/submissions/{user_id}/{case_id}/` and served via a dedicated `/api/uploads/...` route with auth.
- `.env` sits at project root (this directory), loaded by backend and bot via python-dotenv, by frontend via Vite `envDir: '../'`.

## Environment Variables

Required in `.env`:
```
BOT_TOKEN, TELEGRAM_BOT_TOKEN, MINI_APP_URL,
BACKEND_URL (default http://localhost:8000),
DATABASE_URL (default sqlite:///./stem_case_bot.db),
TEACHER_TELEGRAM_IDS (comma-separated Telegram user IDs recognized as teachers/mentors)
```
Optional (only if AI explanations are enabled): `GROQ_API_KEY`.
Frontend: `VITE_API_URL` (defaults to `/api` via the dev proxy).
