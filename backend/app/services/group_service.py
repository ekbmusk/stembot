from __future__ import annotations

from typing import Optional

from fastapi import HTTPException
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.database.models import (
    CaseAssignment,
    CaseSubmission,
    Group,
    GroupEnrollment,
    User,
)
from app.schemas.group import (
    CaseProgressCell,
    GroupOut,
    GroupProgressOut,
    StudentProgressRow,
    StudentSummary,
)


def list_groups(db: Session) -> list[GroupOut]:
    rows = (
        db.query(
            Group,
            func.count(GroupEnrollment.id),
        )
        .outerjoin(GroupEnrollment, GroupEnrollment.group_id == Group.id)
        .group_by(Group.id)
        .order_by(Group.name)
        .all()
    )
    return [
        GroupOut(
            id=g.id,
            name=g.name,
            description=g.description,
            created_at=g.created_at,
            student_count=count or 0,
        )
        for g, count in rows
    ]


def create_group(db: Session, *, name: str, description: Optional[str]) -> Group:
    g = Group(name=name, description=description)
    db.add(g)
    db.commit()
    db.refresh(g)
    return g


def enroll(db: Session, *, group_id: int, user_id: int) -> GroupEnrollment:
    if not db.query(Group).filter(Group.id == group_id).first():
        raise HTTPException(status_code=404, detail="Group not found")
    if not db.query(User).filter(User.id == user_id).first():
        raise HTTPException(status_code=404, detail="User not found")
    existing = (
        db.query(GroupEnrollment)
        .filter(
            GroupEnrollment.group_id == group_id,
            GroupEnrollment.user_id == user_id,
        )
        .first()
    )
    if existing:
        return existing
    e = GroupEnrollment(group_id=group_id, user_id=user_id)
    db.add(e)
    db.commit()
    db.refresh(e)
    return e


def unenroll(db: Session, *, group_id: int, user_id: int) -> None:
    db.query(GroupEnrollment).filter(
        GroupEnrollment.group_id == group_id,
        GroupEnrollment.user_id == user_id,
    ).delete()
    db.commit()


def assign_case(
    db: Session, *, group_id: int, case_id: int, assigned_by: int, due_at=None
) -> CaseAssignment:
    if not db.query(Group).filter(Group.id == group_id).first():
        raise HTTPException(status_code=404, detail="Group not found")
    a = CaseAssignment(
        group_id=group_id,
        case_id=case_id,
        assigned_by=assigned_by,
        due_at=due_at,
    )
    db.add(a)
    db.commit()
    db.refresh(a)
    return a


def get_group_progress(db: Session, group_id: int) -> GroupProgressOut:
    """Build a case × student matrix for the group.

    Includes every case assigned to the group plus any case the students have
    already attempted, even if it was unassigned (browsing).
    """
    if not db.query(Group).filter(Group.id == group_id).first():
        raise HTTPException(status_code=404, detail="Group not found")

    students = (
        db.query(User)
        .join(GroupEnrollment, GroupEnrollment.user_id == User.id)
        .filter(GroupEnrollment.group_id == group_id)
        .order_by(User.first_name, User.last_name)
        .all()
    )
    student_ids = [s.id for s in students]

    assigned_case_ids = {
        a.case_id
        for a in db.query(CaseAssignment.case_id)
        .filter(CaseAssignment.group_id == group_id)
        .all()
    }
    attempted_case_ids = {
        s.case_id
        for s in db.query(CaseSubmission.case_id)
        .filter(CaseSubmission.user_id.in_(student_ids or [-1]))
        .distinct()
        .all()
    }
    case_ids = sorted(assigned_case_ids | attempted_case_ids)

    submissions = (
        db.query(CaseSubmission)
        .filter(
            CaseSubmission.user_id.in_(student_ids or [-1]),
            CaseSubmission.case_id.in_(case_ids or [-1]),
        )
        .all()
    )
    by_user_case: dict[tuple[int, int], CaseSubmission] = {}
    for s in submissions:
        # Keep the most recent attempt per (user, case).
        prev = by_user_case.get((s.user_id, s.case_id))
        if prev is None or (s.started_at and prev.started_at and s.started_at > prev.started_at):
            by_user_case[(s.user_id, s.case_id)] = s

    rows: list[StudentProgressRow] = []
    for s in students:
        cells = []
        for cid in case_ids:
            sub = by_user_case.get((s.id, cid))
            cells.append(
                CaseProgressCell(
                    case_id=cid,
                    status=sub.status if sub else None,
                    total_score=sub.total_score if sub else None,
                )
            )
        rows.append(
            StudentProgressRow(
                student=StudentSummary(
                    user_id=s.id,
                    first_name=s.first_name,
                    last_name=s.last_name,
                    username=s.username,
                ),
                cases=cells,
            )
        )

    return GroupProgressOut(group_id=group_id, case_ids=case_ids, rows=rows)
