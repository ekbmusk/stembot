"""SQLite-backed engine + session, with idempotent table creation, lightweight
ALTER-TABLE migrations, and seed data for default groups and the authored
case catalogue (loaded from seeds/cases.json).
"""
from __future__ import annotations

import json
import logging
import os
from pathlib import Path
from typing import Iterable

from sqlalchemy import create_engine, inspect, text
from sqlalchemy.orm import Session, sessionmaker

from app.database.models import (
    Base,
    CaseBlock,
    CaseTask,
    CaseVideo,
    Group,
    STEMCase,
)

logger = logging.getLogger(__name__)

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./stem_case_bot.db")

connect_args = {"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}
engine = create_engine(DATABASE_URL, connect_args=connect_args, future=True)

SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False, future=True)


def get_db() -> Iterable[Session]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# --- migrations -------------------------------------------------------------

# (table_name, column_name, ddl_fragment) — all nullable / defaulted so we can
# tack them onto existing rows without a backfill.
_SQLITE_MIGRATIONS: list[tuple[str, str, str]] = [
    ("stem_cases", "is_published", "BOOLEAN DEFAULT 1"),
    ("stem_cases", "age_range", "VARCHAR(20)"),
    ("stem_cases", "tags", "JSON"),
    ("case_tasks", "tolerance", "FLOAT"),
    ("case_tasks", "rubric_kk", "TEXT"),
    ("users", "photo_url", "VARCHAR(1000)"),
    ("users", "language_code", "VARCHAR(10)"),
]


def _migrate_sqlite() -> None:
    if not DATABASE_URL.startswith("sqlite"):
        return
    inspector = inspect(engine)
    existing = {t: {c["name"] for c in inspector.get_columns(t)} for t in inspector.get_table_names()}
    with engine.begin() as conn:
        for table, column, ddl in _SQLITE_MIGRATIONS:
            if table not in existing or column in existing[table]:
                continue
            logger.info("Migrating %s: adding column %s", table, column)
            conn.execute(text(f'ALTER TABLE {table} ADD COLUMN {column} {ddl}'))


# --- seeds ------------------------------------------------------------------

_DEFAULT_GROUPS = [
    {"name": "7А", "description": "7-сынып, негізгі топ"},
    {"name": "8А", "description": "8-сынып, негізгі топ"},
    {"name": "9А", "description": "9-сынып, негізгі топ"},
]


def _seed_groups(db: Session) -> None:
    if db.query(Group).count() > 0:
        return
    for g in _DEFAULT_GROUPS:
        db.add(Group(**g))
    db.commit()


_SEED_PATH = Path(__file__).resolve().parent.parent.parent / "seeds" / "cases.json"


def _seed_authored_cases(db: Session, path: Path = _SEED_PATH) -> None:
    """Load cases from seeds/cases.json. Dedupes new cases by title_kk and
    syncs the videos array for existing ones — so editing a case's video
    list in the seed file flows through to a live DB without wiping it.
    Text fields, blocks and tasks are NOT overwritten on existing cases —
    those may have been edited via the teacher UI.
    """
    if not path.exists():
        logger.warning("Case seed file missing: %s", path)
        return

    with path.open("r", encoding="utf-8") as f:
        raw = json.load(f)

    existing_by_title = {
        c.title_kk: c for c in db.query(STEMCase).all()
    }

    inserted = 0
    videos_synced = 0
    for entry in raw:
        existing = existing_by_title.get(entry["title_kk"])
        if existing is not None:
            seed_videos = entry.get("videos") or []
            current = sorted(
                ((v.provider, v.external_id_or_url) for v in existing.videos)
            )
            target = sorted(
                ((v.get("provider", "youtube"), v["external_id_or_url"])
                 for v in seed_videos)
            )
            if current != target:
                db.query(CaseVideo).filter(
                    CaseVideo.case_id == existing.id
                ).delete()
                for i, v in enumerate(seed_videos):
                    db.add(
                        CaseVideo(
                            case_id=existing.id,
                            provider=v.get("provider", "youtube"),
                            external_id_or_url=v["external_id_or_url"],
                            title_kk=v.get("title_kk"),
                            duration_sec=v.get("duration_sec"),
                            position=v.get("position", i),
                        )
                    )
                videos_synced += 1
            continue

        case = STEMCase(
            title_kk=entry["title_kk"],
            objective_kk=entry.get("objective_kk"),
            situation_kk=entry.get("situation_kk"),
            theory_kk=entry.get("theory_kk"),
            cover_image_url=entry.get("cover_image_url"),
            equipment=entry.get("equipment") or [],
            subject=entry["subject"],
            difficulty=entry.get("difficulty", "medium"),
            age_range=entry.get("age_range"),
            tags=entry.get("tags") or [],
            is_published=entry.get("is_published", True),
        )
        db.add(case)
        db.flush()

        for i, block in enumerate(entry.get("blocks") or []):
            db.add(
                CaseBlock(
                    case_id=case.id,
                    position=block.get("position", i),
                    type=block["type"],
                    payload=block.get("payload") or {},
                )
            )

        for i, v in enumerate(entry.get("videos") or []):
            db.add(
                CaseVideo(
                    case_id=case.id,
                    provider=v.get("provider", "youtube"),
                    external_id_or_url=v["external_id_or_url"],
                    title_kk=v.get("title_kk"),
                    duration_sec=v.get("duration_sec"),
                    position=v.get("position", i),
                )
            )

        for i, t in enumerate(entry.get("tasks") or []):
            db.add(
                CaseTask(
                    case_id=case.id,
                    position=t.get("position", i),
                    prompt_kk=t["prompt_kk"],
                    type=t["type"],
                    options=t.get("options"),
                    expected_answer=t.get("expected_answer"),
                    tolerance=t.get("tolerance"),
                    points=t.get("points", 1.0),
                    rubric_kk=t.get("rubric_kk"),
                )
            )

        inserted += 1

    if inserted or videos_synced:
        db.commit()
        logger.info(
            "Cases seed: inserted=%d, videos_synced=%d", inserted, videos_synced
        )


def create_tables() -> None:
    """Create tables if missing, run lightweight migrations, then seed."""
    Base.metadata.create_all(bind=engine)
    _migrate_sqlite()

    with SessionLocal() as db:
        _seed_groups(db)
        _seed_authored_cases(db)
