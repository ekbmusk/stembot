from typing import Optional

from pydantic import BaseModel


class TeacherStats(BaseModel):
    total_students: int
    total_cases: int
    total_submissions: int
    submissions_in_progress: int
    submissions_submitted: int
    submissions_graded: int
    average_score: Optional[float] = None
    by_subject: dict[str, int] = {}


class BroadcastIn(BaseModel):
    text: str
    group_ids: Optional[list[int]] = None  # None = all students


class BroadcastOut(BaseModel):
    queued: int
    group_ids: Optional[list[int]] = None
