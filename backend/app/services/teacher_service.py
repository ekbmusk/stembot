from __future__ import annotations

from typing import Optional

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.database.models import (
    BroadcastLog,
    CaseSubmission,
    GroupEnrollment,
    Notification,
    STEMCase,
    User,
)
from app.schemas.teacher import BroadcastIn, TeacherStats


def get_stats(db: Session) -> TeacherStats:
    total_students = (
        db.query(func.count(User.id)).filter(User.role == "student").scalar() or 0
    )
    total_cases = db.query(func.count(STEMCase.id)).scalar() or 0
    total_subs = db.query(func.count(CaseSubmission.id)).scalar() or 0
    in_progress = (
        db.query(func.count(CaseSubmission.id))
        .filter(CaseSubmission.status == "in_progress")
        .scalar()
        or 0
    )
    submitted = (
        db.query(func.count(CaseSubmission.id))
        .filter(CaseSubmission.status == "submitted")
        .scalar()
        or 0
    )
    graded = (
        db.query(func.count(CaseSubmission.id))
        .filter(CaseSubmission.status == "graded")
        .scalar()
        or 0
    )
    avg = (
        db.query(func.avg(CaseSubmission.total_score))
        .filter(CaseSubmission.status == "graded")
        .scalar()
    )
    by_subject_rows = (
        db.query(STEMCase.subject, func.count(STEMCase.id))
        .group_by(STEMCase.subject)
        .all()
    )

    return TeacherStats(
        total_students=total_students,
        total_cases=total_cases,
        total_submissions=total_subs,
        submissions_in_progress=in_progress,
        submissions_submitted=submitted,
        submissions_graded=graded,
        average_score=float(avg) if avg is not None else None,
        by_subject={k: v for k, v in by_subject_rows if k},
    )


def list_students(db: Session, group_id: Optional[int] = None) -> list[User]:
    q = db.query(User).filter(User.role == "student")
    if group_id is not None:
        q = q.join(GroupEnrollment, GroupEnrollment.user_id == User.id).filter(
            GroupEnrollment.group_id == group_id
        )
    return q.order_by(User.first_name, User.last_name).all()


def list_submissions(
    db: Session,
    *,
    group_id: Optional[int] = None,
    case_id: Optional[int] = None,
    status_filter: Optional[str] = None,
) -> list[CaseSubmission]:
    q = db.query(CaseSubmission)
    if group_id is not None:
        q = q.join(GroupEnrollment, GroupEnrollment.user_id == CaseSubmission.user_id).filter(
            GroupEnrollment.group_id == group_id
        )
    if case_id is not None:
        q = q.filter(CaseSubmission.case_id == case_id)
    if status_filter:
        q = q.filter(CaseSubmission.status == status_filter)
    return q.order_by(CaseSubmission.started_at.desc()).all()


def queue_broadcast(
    db: Session, *, teacher_id: int, payload: BroadcastIn
) -> tuple[BroadcastLog, int]:
    """Persist a broadcast and queue per-recipient notifications.

    The bot polls `notifications` to actually deliver via Telegram.
    """
    if payload.group_ids:
        recipients = (
            db.query(User.id)
            .join(GroupEnrollment, GroupEnrollment.user_id == User.id)
            .filter(GroupEnrollment.group_id.in_(payload.group_ids))
            .filter(User.role == "student")
            .distinct()
            .all()
        )
    else:
        recipients = (
            db.query(User.id).filter(User.role == "student").all()
        )

    user_ids = [r[0] for r in recipients]

    log = BroadcastLog(
        teacher_id=teacher_id,
        group_ids=payload.group_ids,
        text=payload.text,
        sent_count=len(user_ids),
    )
    db.add(log)
    for uid in user_ids:
        db.add(
            Notification(
                user_id=uid,
                type="broadcast",
                payload={"text": payload.text, "broadcast_log_id": None},
            )
        )
    db.commit()
    db.refresh(log)
    # Backfill broadcast_log_id on the notifications now that the log has an id.
    db.query(Notification).filter(
        Notification.type == "broadcast",
        Notification.user_id.in_(user_ids or [-1]),
        Notification.delivered.is_(False),
    ).update(
        {"payload": {"text": payload.text, "broadcast_log_id": log.id}},
        synchronize_session=False,
    )
    db.commit()
    return log, len(user_ids)
