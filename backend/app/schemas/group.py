from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict


class GroupCreate(BaseModel):
    name: str
    description: Optional[str] = None


class GroupOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    description: Optional[str] = None
    created_at: datetime
    student_count: int = 0


class EnrollIn(BaseModel):
    user_id: int


class StudentSummary(BaseModel):
    user_id: int
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    username: Optional[str] = None


class CaseProgressCell(BaseModel):
    case_id: int
    status: Optional[str] = None  # in_progress | submitted | graded | None
    total_score: Optional[float] = None


class StudentProgressRow(BaseModel):
    student: StudentSummary
    cases: list[CaseProgressCell]


class GroupProgressOut(BaseModel):
    group_id: int
    case_ids: list[int]
    rows: list[StudentProgressRow]


class CaseAssignIn(BaseModel):
    case_id: int
    due_at: Optional[datetime] = None
