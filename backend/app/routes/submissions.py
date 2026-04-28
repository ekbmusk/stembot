from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database.database import get_db
from app.database.models import User
from app.schemas.submission import (
    SubmissionCreate,
    SubmissionOut,
    TaskAnswerIn,
    TaskAnswerOut,
)
from app.services import submission_service
from app.utils.auth import get_current_user

router = APIRouter(prefix="/api/submissions", tags=["submissions"])


@router.post("/", response_model=SubmissionOut)
def create(
    payload: SubmissionCreate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    sub = submission_service.create_submission(
        db, user_id=user.id, case_id=payload.case_id
    )
    db.refresh(sub)
    return sub


@router.get("/mine", response_model=list[SubmissionOut])
def mine(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return submission_service.list_my_submissions(db, user.id)


@router.get("/{submission_id}", response_model=SubmissionOut)
def get(
    submission_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    sub = submission_service.get_submission(db, submission_id)
    if not sub:
        raise HTTPException(status_code=404, detail="Submission not found")
    if sub.user_id != user.id and user.role != "teacher":
        raise HTTPException(status_code=403, detail="Not your submission")
    return sub


@router.post("/{submission_id}/answers", response_model=TaskAnswerOut)
def answer(
    submission_id: int,
    payload: TaskAnswerIn,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return submission_service.answer_task(
        db, submission_id=submission_id, user_id=user.id, payload=payload
    )


@router.post("/{submission_id}/finalize", response_model=SubmissionOut)
async def finalize(
    submission_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return await submission_service.finalize_submission(
        db, submission_id=submission_id, user_id=user.id
    )
