from __future__ import annotations

from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.database.database import get_db
from app.database.models import User
from app.schemas.case import CaseCreate, CaseDetail, CaseUpdate
from app.schemas.submission import GradeSubmissionIn, SubmissionOut
from app.schemas.teacher import BroadcastIn, BroadcastOut, TeacherStats
from app.schemas.user import UserOut
from app.services import case_service, submission_service, teacher_service
from app.utils.auth import require_teacher

router = APIRouter(prefix="/api/teacher", tags=["teacher"])


@router.get("/stats", response_model=TeacherStats)
def stats(
    _t: User = Depends(require_teacher),
    db: Session = Depends(get_db),
):
    return teacher_service.get_stats(db)


@router.get("/students", response_model=list[UserOut])
def students(
    group_id: Optional[int] = Query(None),
    _t: User = Depends(require_teacher),
    db: Session = Depends(get_db),
):
    return teacher_service.list_students(db, group_id=group_id)


@router.get("/submissions", response_model=list[SubmissionOut])
def submissions(
    group_id: Optional[int] = Query(None),
    case_id: Optional[int] = Query(None),
    status: Optional[str] = Query(None),
    _t: User = Depends(require_teacher),
    db: Session = Depends(get_db),
):
    return teacher_service.list_submissions(
        db, group_id=group_id, case_id=case_id, status_filter=status
    )


@router.post("/broadcast", response_model=BroadcastOut)
def broadcast(
    payload: BroadcastIn,
    teacher: User = Depends(require_teacher),
    db: Session = Depends(get_db),
):
    _, count = teacher_service.queue_broadcast(db, teacher_id=teacher.id, payload=payload)
    return BroadcastOut(queued=count, group_ids=payload.group_ids)


@router.post("/cases", response_model=CaseDetail)
def create_case(
    payload: CaseCreate,
    _t: User = Depends(require_teacher),
    db: Session = Depends(get_db),
):
    case = case_service.create_case(db, payload)
    return case_service.get_case(db, case.id)


@router.patch("/cases/{case_id}", response_model=CaseDetail)
def update_case(
    case_id: int,
    payload: CaseUpdate,
    _t: User = Depends(require_teacher),
    db: Session = Depends(get_db),
):
    case = case_service.update_case(db, case_id, payload)
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")
    return case_service.get_case(db, case.id)


@router.patch("/submissions/{submission_id}/grade", response_model=SubmissionOut)
def grade(
    submission_id: int,
    payload: GradeSubmissionIn,
    teacher: User = Depends(require_teacher),
    db: Session = Depends(get_db),
):
    return submission_service.grade_submission(
        db,
        submission_id=submission_id,
        teacher_id=teacher.id,
        payload=payload,
    )
