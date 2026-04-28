from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database.database import get_db
from app.database.models import User
from app.schemas.group import (
    CaseAssignIn,
    EnrollIn,
    GroupCreate,
    GroupOut,
    GroupProgressOut,
)
from app.services import group_service
from app.utils.auth import get_current_user, require_teacher

router = APIRouter(prefix="/api/groups", tags=["groups"])


@router.get("/", response_model=list[GroupOut])
def list_groups(
    _user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return group_service.list_groups(db)


@router.post("/", response_model=GroupOut)
def create_group(
    payload: GroupCreate,
    _teacher: User = Depends(require_teacher),
    db: Session = Depends(get_db),
):
    g = group_service.create_group(db, name=payload.name, description=payload.description)
    return GroupOut(
        id=g.id,
        name=g.name,
        description=g.description,
        created_at=g.created_at,
        student_count=0,
    )


@router.post("/{group_id}/enroll")
def enroll(
    group_id: int,
    payload: EnrollIn,
    _teacher: User = Depends(require_teacher),
    db: Session = Depends(get_db),
):
    e = group_service.enroll(db, group_id=group_id, user_id=payload.user_id)
    return {"id": e.id, "group_id": e.group_id, "user_id": e.user_id}


@router.delete("/{group_id}/enroll/{student_id}")
def unenroll(
    group_id: int,
    student_id: int,
    _teacher: User = Depends(require_teacher),
    db: Session = Depends(get_db),
):
    group_service.unenroll(db, group_id=group_id, user_id=student_id)
    return {"ok": True}


@router.post("/{group_id}/assign-case")
def assign_case(
    group_id: int,
    payload: CaseAssignIn,
    teacher: User = Depends(require_teacher),
    db: Session = Depends(get_db),
):
    a = group_service.assign_case(
        db,
        group_id=group_id,
        case_id=payload.case_id,
        assigned_by=teacher.id,
        due_at=payload.due_at,
    )
    return {"id": a.id, "case_id": a.case_id, "group_id": a.group_id}


@router.get("/{group_id}/progress", response_model=GroupProgressOut)
def progress(
    group_id: int,
    _teacher: User = Depends(require_teacher),
    db: Session = Depends(get_db),
):
    return group_service.get_group_progress(db, group_id)
