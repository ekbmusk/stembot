"""Idempotent mock-student seeder. Called from the FastAPI lifespan so demo
data shows up on a fresh deploy. Identifies its own rows by telegram_id range
(> MOCK_TG_BASE) so it never touches real users.
"""
from __future__ import annotations

import logging
import random
from datetime import datetime, timedelta

from sqlalchemy.orm import Session

from app.database.models import (
    CaseSubmission,
    CaseTask,
    Group,
    GroupEnrollment,
    STEMCase,
    TaskAnswer,
    User,
)

logger = logging.getLogger(__name__)

MOCK_TG_BASE = 9_000_000_000
TARGET_CASE_TITLES = [
    "Жеңіске апаратын жол: триатлон физикасы",
    "Физика секіруге рұқсат бере ме? Еркін түсу үдеуі",
    "Шәйнек неге суды осынша ұзақ жылытады? Энергия мен ПӘК",
    "Ырғақтың физикасы: маятник пен резонанс",
    "Бойлық толқындар: дыбыс — көрінбейтін толқын",
]

NAMES: list[tuple[str, str]] = [
    ("Айдос", "Серіков"),
    ("Айгерім", "Қасенова"),
    ("Алихан", "Жұмабеков"),
    ("Аружан", "Бектұрсынова"),
    ("Арман", "Тұрсынбай"),
    ("Бекзат", "Орынбасар"),
    ("Дамир", "Сағатов"),
    ("Дана", "Әбілова"),
    ("Ержан", "Қалиев"),
    ("Жанна", "Нұрланова"),
    ("Зарина", "Айтжанова"),
    ("Камила", "Дәулетова"),
    ("Қанат", "Мұқанов"),
    ("Мадина", "Ыбраева"),
    ("Мадияр", "Сейтбек"),
    ("Назерке", "Ержанова"),
    ("Нұрсұлтан", "Бақыт"),
    ("Олжас", "Қожахмет"),
    ("Сабина", "Ислам"),
    ("Санжар", "Әлібек"),
    ("Темірлан", "Бейсенов"),
    ("Томирис", "Сейтжан"),
    ("Ұлжан", "Ермек"),
    ("Шынар", "Сапаргалиева"),
]


def _decent_score(task: CaseTask, rng: random.Random) -> float:
    pts = float(task.points or 1.0)
    if task.type in ("numeric", "multiple_choice"):
        return pts if rng.random() < 0.78 else 0.0
    if task.type == "open_text":
        return round(pts * rng.uniform(0.6, 1.0), 2)
    if task.type == "file_upload":
        return round(pts * rng.uniform(0.5, 0.95), 2)
    return 0.0


def _mock_payload(task: CaseTask, score: float) -> dict:
    if task.type == "numeric":
        expected = (task.expected_answer or {}).get("value") if task.expected_answer else None
        if score > 0 and expected is not None:
            return {"value": float(expected)}
        if expected is not None:
            tol = task.tolerance or 0.01
            return {"value": float(expected) + tol * 5 + 1.0}
        return {"value": 0.0}
    if task.type == "multiple_choice":
        idxs = (task.expected_answer or {}).get("indexes") if task.expected_answer else None
        if score > 0 and idxs is not None:
            return {"selected": list(idxs)}
        return {"selected": []}
    if task.type == "file_upload":
        return {"files": []}
    return {"text": "Шешімі есептелген, формула қолданылған. Жауабы дәлелденді."}


def seed_mock_students(db: Session) -> None:
    groups = db.query(Group).order_by(Group.id).all()
    if not groups:
        return

    cases = (
        db.query(STEMCase).filter(STEMCase.title_kk.in_(TARGET_CASE_TITLES)).all()
    )
    title_to_case = {c.title_kk: c for c in cases}
    if len(cases) != len(TARGET_CASE_TITLES):
        # Cases haven't been seeded yet — bail; we'll try again on next boot.
        return

    rng = random.Random(20260504)
    new_users = new_enrollments = new_submissions = new_answers = 0

    for i, (first, last) in enumerate(NAMES):
        tg = MOCK_TG_BASE + i + 1
        user = db.query(User).filter(User.telegram_id == tg).first()
        if user is None:
            user = User(
                telegram_id=tg,
                first_name=first,
                last_name=last,
                username=f"mock_{i+1:02d}",
                language_code="kk",
                role="student",
            )
            db.add(user)
            db.flush()
            new_users += 1

        group = groups[i % len(groups)]
        enr = (
            db.query(GroupEnrollment)
            .filter(
                GroupEnrollment.user_id == user.id,
                GroupEnrollment.group_id == group.id,
            )
            .first()
        )
        if enr is None:
            db.add(GroupEnrollment(user_id=user.id, group_id=group.id))
            new_enrollments += 1

        for case in cases:
            existing = (
                db.query(CaseSubmission)
                .filter(
                    CaseSubmission.user_id == user.id,
                    CaseSubmission.case_id == case.id,
                )
                .first()
            )
            if existing is not None:
                continue

            started = datetime.utcnow() - timedelta(
                days=rng.randint(1, 14), minutes=rng.randint(0, 600)
            )
            submitted = started + timedelta(minutes=rng.randint(15, 90))
            graded = submitted + timedelta(minutes=rng.randint(5, 240))

            sub = CaseSubmission(
                user_id=user.id,
                case_id=case.id,
                status="graded",
                started_at=started,
                submitted_at=submitted,
                graded_at=graded,
            )
            db.add(sub)
            db.flush()

            total = 0.0
            for task in case.tasks:
                score = _decent_score(task, rng)
                payload = _mock_payload(task, score)
                db.add(
                    TaskAnswer(
                        submission_id=sub.id,
                        task_id=task.id,
                        payload=payload,
                        score=score,
                        feedback=None,
                        auto_graded=task.type in ("numeric", "multiple_choice"),
                        answered_at=submitted,
                    )
                )
                total += score
                new_answers += 1

            sub.total_score = round(total, 2)
            new_submissions += 1

    if new_users or new_enrollments or new_submissions:
        db.commit()
        logger.info(
            "Mock seed: users+=%d enrollments+=%d submissions+=%d answers+=%d",
            new_users, new_enrollments, new_submissions, new_answers,
        )
