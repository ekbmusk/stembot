"""Seed 24 mock students enrolled across the default groups, each with a
graded submission for the 5 newest cases (mechanics block). Scores are
randomised in a 'decent' band so the teacher dashboard has realistic data.

Re-runnable: identifies prior mocks by telegram_id range and skips them.
Run from project root:
    backend/.venv/bin/python scripts/seed_mock_students.py
"""
from __future__ import annotations

import os
import random
import sys
from datetime import datetime, timedelta
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
os.chdir(ROOT)
sys.path.insert(0, str(ROOT / "backend"))

from app.database.database import SessionLocal, create_tables  # noqa: E402
from app.database.models import (  # noqa: E402
    CaseSubmission,
    CaseTask,
    Group,
    GroupEnrollment,
    STEMCase,
    TaskAnswer,
    User,
)

TG_BASE = 9_000_000_000  # mock telegram ids live above this — easy to wipe later
NUM_STUDENTS = 24
TARGET_CASE_TITLES = [
    "Жеңіске апаратын жол: триатлон физикасы",
    "Физика секіруге рұқсат бере ме? Еркін түсу үдеуі",
    "Шәйнек неге суды осынша ұзақ жылытады? Энергия мен ПӘК",
    "Ырғақтың физикасы: маятник пен резонанс",
    "Бойлық толқындар: дыбыс — көрінбейтін толқын",
]

NAMES = [
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
assert len(NAMES) == NUM_STUDENTS


def _decent_score(task: CaseTask, rng: random.Random) -> float:
    """Sample a score that's 'not bad': mostly correct numeric/MCQ, partial credit on open."""
    pts = float(task.points or 1.0)
    if task.type in ("numeric", "multiple_choice"):
        return pts if rng.random() < 0.78 else 0.0
    if task.type == "open_text":
        return round(pts * rng.uniform(0.6, 1.0), 2)
    if task.type == "file_upload":
        return round(pts * rng.uniform(0.5, 0.95), 2)
    return 0.0


def _mock_payload(task: CaseTask, score: float) -> dict:
    """Build a payload that matches the task's type so SubmissionDetail renders something."""
    if task.type == "numeric":
        expected = (task.expected_answer or {}).get("value") if task.expected_answer else None
        if score > 0 and expected is not None:
            return {"value": float(expected)}
        # Wrong-on-purpose: nudge the answer outside tolerance.
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
    # open_text — short stub answer in Kazakh, length scaled by score band.
    return {"text": "Шешімі есептелген, формула қолданылған. Жауабы дәлелденді."}


def main() -> None:
    create_tables()
    rng = random.Random(20260504)  # deterministic so re-runs are stable

    with SessionLocal() as db:
        groups = db.query(Group).order_by(Group.id).all()
        if not groups:
            raise RuntimeError("No groups found — seed defaults first.")

        cases = (
            db.query(STEMCase)
            .filter(STEMCase.title_kk.in_(TARGET_CASE_TITLES))
            .all()
        )
        title_to_case = {c.title_kk: c for c in cases}
        missing = [t for t in TARGET_CASE_TITLES if t not in title_to_case]
        if missing:
            raise RuntimeError(f"Missing cases: {missing}")

        new_users = 0
        new_enrollments = 0
        new_submissions = 0
        new_answers = 0

        for i, (first, last) in enumerate(NAMES):
            tg = TG_BASE + i + 1
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
                    days=rng.randint(1, 14),
                    minutes=rng.randint(0, 600),
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

        db.commit()
        print(
            f"users+={new_users}, enrollments+={new_enrollments}, "
            f"submissions+={new_submissions}, answers+={new_answers}"
        )

        # Quick sanity dump.
        from sqlalchemy import func
        rows = (
            db.query(STEMCase.title_kk, func.count(CaseSubmission.id), func.avg(CaseSubmission.total_score))
            .join(CaseSubmission, CaseSubmission.case_id == STEMCase.id)
            .filter(STEMCase.title_kk.in_(TARGET_CASE_TITLES))
            .group_by(STEMCase.id)
            .all()
        )
        for title, count, avg in rows:
            max_pts = sum(float(t.points or 1.0) for t in title_to_case[title].tasks)
            pct = (avg / max_pts * 100) if max_pts else 0
            print(f"  {title[:50]:<50} subs={count:3d}  avg={avg:5.2f}/{max_pts:.1f}  ({pct:.1f}%)")


if __name__ == "__main__":
    main()
