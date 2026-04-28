from datetime import datetime
from typing import Any, Literal, Optional

from pydantic import BaseModel, ConfigDict, Field, field_validator


# ---- shared bits -----------------------------------------------------------


class EquipmentItem(BaseModel):
    name: str
    qty: int = 1
    purpose: Optional[str] = None


BlockType = Literal[
    "text", "formula", "image", "video", "equipment", "safety", "divider", "task"
]
TaskType = Literal["open_text", "numeric", "multiple_choice", "file_upload"]
VideoProvider = Literal["youtube", "mp4"]


# ---- read schemas ----------------------------------------------------------


class CaseBlockOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    position: int
    type: BlockType
    payload: dict


class CaseVideoOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    provider: VideoProvider
    external_id_or_url: str
    title_kk: Optional[str] = None
    duration_sec: Optional[int] = None
    position: int


class CaseTaskOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    position: int
    prompt_kk: str
    type: TaskType
    options: Optional[list[str]] = None
    points: float
    rubric_kk: Optional[str] = None
    # expected_answer/tolerance are intentionally hidden from students.


class CaseTaskTeacherOut(CaseTaskOut):
    expected_answer: Optional[Any] = None
    tolerance: Optional[float] = None


class CaseListItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    title_kk: str
    objective_kk: Optional[str] = None
    cover_image_url: Optional[str] = None
    subject: str
    difficulty: str
    age_range: Optional[str] = None
    tags: list[str] = []
    is_published: bool


class CaseDetail(CaseListItem):
    situation_kk: Optional[str] = None
    theory_kk: Optional[str] = None
    equipment: list[EquipmentItem] = []
    blocks: list[CaseBlockOut] = []
    videos: list[CaseVideoOut] = []
    tasks: list[CaseTaskOut] = []
    created_at: datetime
    updated_at: datetime


# ---- write schemas (teacher) -----------------------------------------------


class CaseBlockIn(BaseModel):
    position: int = 0
    type: BlockType
    payload: dict = Field(default_factory=dict)


class CaseVideoIn(BaseModel):
    provider: VideoProvider = "youtube"
    external_id_or_url: str
    title_kk: Optional[str] = None
    duration_sec: Optional[int] = None
    position: int = 0


class CaseTaskIn(BaseModel):
    position: int = 0
    prompt_kk: str
    type: TaskType
    options: Optional[list[str]] = None
    expected_answer: Optional[Any] = None
    tolerance: Optional[float] = None
    points: float = 1.0
    rubric_kk: Optional[str] = None


class CaseCreate(BaseModel):
    title_kk: str
    objective_kk: Optional[str] = None
    situation_kk: Optional[str] = None
    theory_kk: Optional[str] = None
    cover_image_url: Optional[str] = None
    equipment: list[EquipmentItem] = []
    subject: str
    difficulty: str = "medium"
    age_range: Optional[str] = None
    tags: list[str] = []
    is_published: bool = True
    blocks: list[CaseBlockIn] = []
    videos: list[CaseVideoIn] = []
    tasks: list[CaseTaskIn] = []

    @field_validator("theory_kk")
    @classmethod
    def _balanced_latex(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return v
        # Cheap balance check — protects the editor from saving obviously broken
        # LaTeX. Not a full parser.
        if v.count("$") % 2 != 0:
            raise ValueError("Unbalanced '$' in theory_kk")
        if v.count("{") != v.count("}"):
            raise ValueError("Unbalanced braces in theory_kk")
        return v


class CaseUpdate(BaseModel):
    title_kk: Optional[str] = None
    objective_kk: Optional[str] = None
    situation_kk: Optional[str] = None
    theory_kk: Optional[str] = None
    cover_image_url: Optional[str] = None
    equipment: Optional[list[EquipmentItem]] = None
    subject: Optional[str] = None
    difficulty: Optional[str] = None
    age_range: Optional[str] = None
    tags: Optional[list[str]] = None
    is_published: Optional[bool] = None
    blocks: Optional[list[CaseBlockIn]] = None
    videos: Optional[list[CaseVideoIn]] = None
    tasks: Optional[list[CaseTaskIn]] = None
