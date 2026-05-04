"""Manually trigger the mock-student seed (24 students across the default
groups, each graded on the 5 mechanics cases). The same function runs
automatically from the FastAPI lifespan, so this script only matters for
local dev or for re-seeding without restarting the backend.

Run from project root:
    backend/.venv/bin/python scripts/seed_mock_students.py
"""
from __future__ import annotations

import os
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
os.chdir(ROOT)
sys.path.insert(0, str(ROOT / "backend"))

from app.database.database import SessionLocal, create_tables  # noqa: E402
from app.database.mock_seed import seed_mock_students  # noqa: E402


def main() -> None:
    create_tables()
    with SessionLocal() as db:
        seed_mock_students(db)


if __name__ == "__main__":
    main()
