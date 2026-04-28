from __future__ import annotations

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.database.database import get_db
from app.database.models import User
from app.services import upload_service
from app.utils.auth import get_current_user

router = APIRouter(prefix="/api/uploads", tags=["uploads"])


@router.post("/submissions/{case_id}")
async def upload_submission_files(
    case_id: int,
    files: list[UploadFile] = File(...),
    user: User = Depends(get_current_user),
):
    urls = await upload_service.save_files(
        user_id=user.id, case_id=case_id, files=files
    )
    return {"files": urls}


@router.get("/submissions/{owner_id}/{case_id}/{filename}")
def get_submission_file(
    owner_id: int,
    case_id: int,
    filename: str,
    user: User = Depends(get_current_user),
    _db: Session = Depends(get_db),
):
    if user.id != owner_id and user.role != "teacher":
        raise HTTPException(status_code=403, detail="Forbidden")
    path = upload_service.resolve_path(owner_id, case_id, filename)
    return FileResponse(path)
