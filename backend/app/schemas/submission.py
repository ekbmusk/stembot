from datetime import datetime
from typing import Any, Literal, Optional

from pydantic import BaseModel, ConfigDict


class TaskAnswerIn(BaseModel):
    task_id: int
    payload: dict   # shape depends on task type — validated in service


class TaskAnswerOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    task_id: int
    payload: dict
    score: Optional[float] = None
    feedback: Optional[str] = None
    auto_graded: bool
    answered_at: datetime


class SubmissionCreate(BaseModel):
    case_id: int


class SubmissionOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int
    case_id: int
    status: Literal["in_progress", "submitted", "graded"]
    total_score: Optional[float] = None
    started_at: datetime
    submitted_at: Optional[datetime] = None
    graded_at: Optional[datetime] = None
    answers: list[TaskAnswerOut] = []


class GradeTaskIn(BaseModel):
    task_id: int
    score: float
    feedback: Optional[str] = None


class GradeSubmissionIn(BaseModel):
    grades: list[GradeTaskIn]
    overall_feedback: Optional[str] = None
