from __future__ import annotations

import logging
import os
import re
import uuid
from pathlib import Path
from typing import Iterable

from fastapi import HTTPException, UploadFile

logger = logging.getLogger(__name__)

UPLOAD_ROOT = Path(__file__).resolve().parent.parent.parent / "uploads" / "submissions"
MAX_FILE_SIZE = 15 * 1024 * 1024  # 15MB
ALLOWED_EXTS = {
    ".jpg", ".jpeg", ".png", ".gif", ".webp", ".heic",
    ".pdf", ".txt", ".csv", ".xlsx", ".docx",
}

_SAFE_NAME = re.compile(r"[^A-Za-z0-9._-]")


def _safe_filename(original: str) -> str:
    base = os.path.basename(original or "file")
    base = _SAFE_NAME.sub("_", base)
    if "." in base:
        stem, ext = base.rsplit(".", 1)
        return f"{stem[:60]}_{uuid.uuid4().hex[:8]}.{ext.lower()}"
    return f"{base[:60]}_{uuid.uuid4().hex[:8]}"


def _user_case_dir(user_id: int, case_id: int) -> Path:
    d = UPLOAD_ROOT / str(user_id) / str(case_id)
    d.mkdir(parents=True, exist_ok=True)
    return d


async def save_files(
    *, user_id: int, case_id: int, files: Iterable[UploadFile]
) -> list[str]:
    saved: list[str] = []
    target_dir = _user_case_dir(user_id, case_id)
    for f in files:
        ext = os.path.splitext(f.filename or "")[1].lower()
        if ext not in ALLOWED_EXTS:
            raise HTTPException(
                status_code=400, detail=f"File type not allowed: {ext or '?'}"
            )
        contents = await f.read()
        if len(contents) > MAX_FILE_SIZE:
            raise HTTPException(
                status_code=413, detail=f"File too large: {f.filename}"
            )
        name = _safe_filename(f.filename or "file")
        path = target_dir / name
        path.write_bytes(contents)
        # Public URL — the route in app/routes/uploads.py serves these.
        saved.append(f"/api/uploads/submissions/{user_id}/{case_id}/{name}")
    return saved


def resolve_path(user_id: int, case_id: int, filename: str) -> Path:
    if "/" in filename or ".." in filename:
        raise HTTPException(status_code=400, detail="Invalid filename")
    path = UPLOAD_ROOT / str(user_id) / str(case_id) / filename
    if not path.is_file():
        raise HTTPException(status_code=404, detail="File not found")
    return path
