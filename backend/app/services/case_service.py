from __future__ import annotations

from typing import Optional

from sqlalchemy.orm import Session, selectinload

from app.database.models import (
    CaseAssignment,
    CaseBlock,
    CaseTask,
    CaseVideo,
    GroupEnrollment,
    STEMCase,
)
from app.schemas.case import CaseCreate, CaseUpdate


SUBJECT_TAXONOMY = [
    "biology",
    "chemistry",
    "physics",
    "mathematics",
    "informatics",
    "engineering",
    "astronomy",
    "ecology",
    "interdisciplinary",
]


def list_cases(
    db: Session,
    *,
    subject: Optional[str] = None,
    difficulty: Optional[str] = None,
    tag: Optional[str] = None,
    include_unpublished: bool = False,
) -> list[STEMCase]:
    q = db.query(STEMCase)
    if not include_unpublished:
        q = q.filter(STEMCase.is_published.is_(True))
    if subject:
        q = q.filter(STEMCase.subject == subject)
    if difficulty:
        q = q.filter(STEMCase.difficulty == difficulty)
    cases = q.order_by(STEMCase.created_at.desc()).all()
    if tag:
        cases = [c for c in cases if c.tags and tag in c.tags]
    return cases


def get_case(db: Session, case_id: int) -> Optional[STEMCase]:
    return (
        db.query(STEMCase)
        .options(
            selectinload(STEMCase.blocks),
            selectinload(STEMCase.videos),
            selectinload(STEMCase.tasks),
        )
        .filter(STEMCase.id == case_id)
        .first()
    )


def list_assigned_cases(db: Session, user_id: int) -> list[STEMCase]:
    """Cases assigned (via group) to the given user."""
    group_ids = [
        ge.group_id
        for ge in db.query(GroupEnrollment.group_id)
        .filter(GroupEnrollment.user_id == user_id)
        .all()
    ]
    if not group_ids:
        return []
    case_ids = [
        a.case_id
        for a in db.query(CaseAssignment.case_id)
        .filter(CaseAssignment.group_id.in_(group_ids))
        .distinct()
        .all()
    ]
    if not case_ids:
        return []
    return (
        db.query(STEMCase)
        .filter(STEMCase.id.in_(case_ids))
        .order_by(STEMCase.created_at.desc())
        .all()
    )


def create_case(db: Session, payload: CaseCreate) -> STEMCase:
    case = STEMCase(
        title_kk=payload.title_kk,
        objective_kk=payload.objective_kk,
        situation_kk=payload.situation_kk,
        theory_kk=payload.theory_kk,
        cover_image_url=payload.cover_image_url,
        equipment=[item.model_dump() for item in payload.equipment],
        subject=payload.subject,
        difficulty=payload.difficulty,
        age_range=payload.age_range,
        tags=list(payload.tags),
        is_published=payload.is_published,
    )
    db.add(case)
    db.flush()
    _replace_blocks(db, case, payload.blocks)
    _replace_videos(db, case, payload.videos)
    _replace_tasks(db, case, payload.tasks)
    db.commit()
    db.refresh(case)
    return case


def update_case(db: Session, case_id: int, payload: CaseUpdate) -> Optional[STEMCase]:
    case = db.query(STEMCase).filter(STEMCase.id == case_id).first()
    if not case:
        return None

    data = payload.model_dump(exclude_unset=True)
    if "equipment" in data and data["equipment"] is not None:
        data["equipment"] = [item.model_dump() if hasattr(item, "model_dump") else item for item in data["equipment"]]
    if "tags" in data and data["tags"] is not None:
        data["tags"] = list(data["tags"])

    blocks = data.pop("blocks", None)
    videos = data.pop("videos", None)
    tasks = data.pop("tasks", None)

    for key, value in data.items():
        setattr(case, key, value)

    if blocks is not None:
        _replace_blocks(db, case, payload.blocks or [])
    if videos is not None:
        _replace_videos(db, case, payload.videos or [])
    if tasks is not None:
        _replace_tasks(db, case, payload.tasks or [])

    db.commit()
    db.refresh(case)
    return case


def _replace_blocks(db: Session, case: STEMCase, blocks: list) -> None:
    db.query(CaseBlock).filter(CaseBlock.case_id == case.id).delete()
    for idx, b in enumerate(blocks):
        db.add(
            CaseBlock(
                case_id=case.id,
                position=b.position if b.position is not None else idx,
                type=b.type,
                payload=b.payload,
            )
        )


def _replace_videos(db: Session, case: STEMCase, videos: list) -> None:
    db.query(CaseVideo).filter(CaseVideo.case_id == case.id).delete()
    for idx, v in enumerate(videos):
        db.add(
            CaseVideo(
                case_id=case.id,
                provider=v.provider,
                external_id_or_url=v.external_id_or_url,
                title_kk=v.title_kk,
                duration_sec=v.duration_sec,
                position=v.position if v.position is not None else idx,
            )
        )


def _replace_tasks(db: Session, case: STEMCase, tasks: list) -> None:
    db.query(CaseTask).filter(CaseTask.case_id == case.id).delete()
    for idx, t in enumerate(tasks):
        db.add(
            CaseTask(
                case_id=case.id,
                position=t.position if t.position is not None else idx,
                prompt_kk=t.prompt_kk,
                type=t.type,
                options=t.options,
                expected_answer=t.expected_answer,
                tolerance=t.tolerance,
                points=t.points,
                rubric_kk=t.rubric_kk,
            )
        )
