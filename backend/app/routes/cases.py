from __future__ import annotations

from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.database.database import get_db
from app.database.models import User
from app.schemas.case import CaseDetail, CaseListItem
from app.services import case_service
from app.utils.auth import get_current_user

router = APIRouter(prefix="/api/cases", tags=["cases"])


@router.get("/", response_model=list[CaseListItem])
def list_cases(
    subject: Optional[str] = Query(None),
    difficulty: Optional[str] = Query(None),
    tag: Optional[str] = Query(None),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    cases = case_service.list_cases(
        db,
        subject=subject,
        difficulty=difficulty,
        tag=tag,
        include_unpublished=(user.role == "teacher"),
    )
    return cases


@router.get("/subjects", response_model=list[str])
def list_subjects():
    return case_service.SUBJECT_TAXONOMY


@router.get("/assigned", response_model=list[CaseListItem])
def list_assigned(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return case_service.list_assigned_cases(db, user.id)


@router.get("/{case_id}", response_model=CaseDetail)
def get_case(
    case_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    case = case_service.get_case(db, case_id)
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")
    if not case.is_published and user.role != "teacher":
        raise HTTPException(status_code=404, detail="Case not found")

    detail = CaseDetail.model_validate(case)
    # Rubrics often spell out the expected answer — keep them out of student
    # responses. Teachers (incl. CaseEditor) still need them for authoring.
    if user.role != "teacher":
        for task in detail.tasks:
            task.rubric_kk = None
    return detail
