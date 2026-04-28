"""Internal endpoints used by the bot process. Auth: X-Bot-Token shared secret."""
from __future__ import annotations

from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.database.database import get_db
from app.database.models import (
    CaseAssignment,
    CaseSubmission,
    Notification,
    STEMCase,
    User,
)
from app.schemas.bot import (
    BotAssignedCaseItem,
    BotNotification,
    BotSubmissionItem,
    BotUserOut,
)
from app.services.case_service import list_assigned_cases
from app.utils.auth import require_bot_token

router = APIRouter(
    prefix="/api/bot",
    tags=["bot"],
    dependencies=[Depends(require_bot_token)],
)


@router.get("/users/by-telegram/{telegram_id}", response_model=BotUserOut)
def get_user_by_telegram(telegram_id: int, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.telegram_id == telegram_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user


@router.get(
    "/users/{user_id}/submissions",
    response_model=list[BotSubmissionItem],
)
def get_user_submissions(
    user_id: int,
    status: Optional[str] = Query(None),
    db: Session = Depends(get_db),
):
    q = (
        db.query(CaseSubmission, STEMCase.title_kk)
        .join(STEMCase, STEMCase.id == CaseSubmission.case_id)
        .filter(CaseSubmission.user_id == user_id)
    )
    if status:
        q = q.filter(CaseSubmission.status == status)
    rows = q.order_by(CaseSubmission.started_at.desc()).all()
    return [
        BotSubmissionItem(
            submission_id=s.id,
            case_id=s.case_id,
            case_title=title,
            status=s.status,
            total_score=s.total_score,
            submitted_at=s.submitted_at,
        )
        for s, title in rows
    ]


@router.get(
    "/users/{user_id}/assigned-cases",
    response_model=list[BotAssignedCaseItem],
)
def get_user_assigned_cases(user_id: int, db: Session = Depends(get_db)):
    cases = list_assigned_cases(db, user_id)
    # Pick the earliest due_at across the user's group assignments per case.
    due_map: dict[int, Optional[datetime]] = {}
    if cases:
        case_ids = [c.id for c in cases]
        rows = (
            db.query(CaseAssignment.case_id, CaseAssignment.due_at)
            .filter(CaseAssignment.case_id.in_(case_ids))
            .all()
        )
        for cid, due in rows:
            current = due_map.get(cid)
            if due is None:
                continue
            if current is None or due < current:
                due_map[cid] = due

    return [
        BotAssignedCaseItem(
            case_id=c.id,
            title_kk=c.title_kk,
            subject=c.subject,
            difficulty=c.difficulty,
            due_at=due_map.get(c.id),
        )
        for c in cases
    ]


@router.get("/notifications/pending", response_model=list[BotNotification])
def pending_notifications(
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
):
    rows = (
        db.query(Notification, User.telegram_id)
        .join(User, User.id == Notification.user_id)
        .filter(Notification.delivered.is_(False))
        .order_by(Notification.created_at.asc())
        .limit(limit)
        .all()
    )
    return [
        BotNotification(
            id=n.id,
            user_id=n.user_id,
            telegram_id=tg_id,
            type=n.type,
            payload=n.payload,
            created_at=n.created_at,
        )
        for n, tg_id in rows
    ]


@router.post("/notifications/{notification_id}/delivered")
def mark_delivered(notification_id: int, db: Session = Depends(get_db)):
    n = db.query(Notification).filter(Notification.id == notification_id).first()
    if not n:
        raise HTTPException(status_code=404, detail="Notification not found")
    n.delivered = True
    db.commit()
    return {"ok": True, "id": n.id}
