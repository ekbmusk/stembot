from __future__ import annotations

import logging
import os
from contextlib import asynccontextmanager
from pathlib import Path

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# Load .env from project root before app modules import os.getenv-driven config.
load_dotenv(Path(__file__).resolve().parent.parent / ".env")

logging.basicConfig(
    level=os.getenv("LOG_LEVEL", "INFO"),
    format="%(asctime)s %(levelname)s %(name)s %(message)s",
)

from app.database.database import create_tables  # noqa: E402
from app.routes import (  # noqa: E402
    ai,
    bot,
    cases,
    groups,
    submissions,
    teacher,
    uploads,
    users,
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    create_tables()
    yield


app = FastAPI(
    title="STEM Case Bot API",
    description="Backend for the STEM case-based learning Mini App.",
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(users.router)
app.include_router(cases.router)
app.include_router(submissions.router)
app.include_router(groups.router)
app.include_router(teacher.router)
app.include_router(ai.router)
app.include_router(uploads.router)
app.include_router(bot.router)


@app.get("/api/health")
def health():
    return {"status": "ok"}
