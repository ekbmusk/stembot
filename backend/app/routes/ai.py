from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database.database import get_db
from app.database.models import CaseTask, User
from app.schemas.ai import AskIn, AskOut, HintIn
from app.services import ai_service
from app.utils.auth import get_current_user

router = APIRouter(prefix="/api/ai", tags=["ai"])


@router.post("/ask", response_model=AskOut)
async def ask(
    payload: AskIn,
    _user: User = Depends(get_current_user),
):
    answer, blocked, reason = await ai_service.ask(payload.prompt, payload.context)
    return AskOut(answer=answer, blocked=blocked, reason=reason)


@router.post("/hint", response_model=AskOut)
async def hint(
    payload: HintIn,
    _user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    task = db.query(CaseTask).filter(CaseTask.id == payload.task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    prompt = (
        "Оқушыға келесі тапсырмаға кеңес бер. Тура жауапты берме — бағыттап түсіндір.\n"
        f"Тапсырма: {task.prompt_kk}"
    )
    if payload.student_attempt:
        prompt += f"\nОқушының әрекеті: {payload.student_attempt}"

    answer, blocked, reason = await ai_service.ask(prompt)
    return AskOut(answer=answer, blocked=blocked, reason=reason)
