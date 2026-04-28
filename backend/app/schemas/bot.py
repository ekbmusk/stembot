from datetime import datetime
from typing import Any, Optional

from pydantic import BaseModel, ConfigDict


class BotUserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    telegram_id: int
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    username: Optional[str] = None
    role: str


class BotSubmissionItem(BaseModel):
    submission_id: int
    case_id: int
    case_title: Optional[str] = None
    status: str
    total_score: Optional[float] = None
    submitted_at: Optional[datetime] = None


class BotAssignedCaseItem(BaseModel):
    case_id: int
    title_kk: str
    subject: str
    difficulty: str
    due_at: Optional[datetime] = None


class BotNotification(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int
    telegram_id: int
    type: str
    payload: Optional[dict[str, Any]] = None
    created_at: datetime
