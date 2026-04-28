from __future__ import annotations

from datetime import datetime
from typing import Optional

from fastapi import HTTPException, status
from sqlalchemy.orm import Session, selectinload

from app.database.models import (
    CaseSubmission,
    CaseTask,
    Notification,
    STEMCase,
    TaskAnswer,
    TeacherFeedback,
    User,
)
from app.schemas.submission import GradeSubmissionIn, TaskAnswerIn


def create_submission(db: Session, *, user_id: int, case_id: int) -> CaseSubmission:
    case = db.query(STEMCase).filter(STEMCase.id == case_id).first()
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")

    # Reuse the active in-progress submission, if any — students often re-enter
    # a case from the catalogue.
    existing = (
        db.query(CaseSubmission)
        .filter(
            CaseSubmission.user_id == user_id,
            CaseSubmission.case_id == case_id,
            CaseSubmission.status == "in_progress",
        )
        .first()
    )
    if existing:
        return existing

    submission = CaseSubmission(
        user_id=user_id, case_id=case_id, status="in_progress"
    )
    db.add(submission)
    db.commit()
    db.refresh(submission)
    return submission


def get_submission(db: Session, submission_id: int) -> Optional[CaseSubmission]:
    return (
        db.query(CaseSubmission)
        .options(selectinload(CaseSubmission.answers))
        .filter(CaseSubmission.id == submission_id)
        .first()
    )


def list_my_submissions(db: Session, user_id: int) -> list[CaseSubmission]:
    return (
        db.query(CaseSubmission)
        .options(selectinload(CaseSubmission.answers))
        .filter(CaseSubmission.user_id == user_id)
        .order_by(CaseSubmission.started_at.desc())
        .all()
    )


def answer_task(
    db: Session, *, submission_id: int, user_id: int, payload: TaskAnswerIn
) -> TaskAnswer:
    submission = (
        db.query(CaseSubmission)
        .filter(CaseSubmission.id == submission_id)
        .first()
    )
    if not submission:
        raise HTTPException(status_code=404, detail="Submission not found")
    if submission.user_id != user_id:
        raise HTTPException(status_code=403, detail="Not your submission")
    if submission.status != "in_progress":
        raise HTTPException(
            status_code=400, detail="Submission already finalized"
        )

    task = (
        db.query(CaseTask)
        .filter(CaseTask.id == payload.task_id, CaseTask.case_id == submission.case_id)
        .first()
    )
    if not task:
        raise HTTPException(status_code=404, detail="Task not found for this case")

    _validate_answer_payload(task, payload.payload)

    answer = (
        db.query(TaskAnswer)
        .filter(
            TaskAnswer.submission_id == submission_id,
            TaskAnswer.task_id == task.id,
        )
        .first()
    )
    if answer is None:
        answer = TaskAnswer(
            submission_id=submission_id,
            task_id=task.id,
            payload=payload.payload,
        )
        db.add(answer)
    else:
        answer.payload = payload.payload
        # Re-grading: reset prior auto-grade so we don't carry stale numbers.
        answer.score = None
        answer.feedback = None
        answer.auto_graded = False

    score = _try_auto_grade(task, payload.payload)
    if score is not None:
        answer.score = score
        answer.auto_graded = True

    db.commit()
    db.refresh(answer)
    return answer


async def finalize_submission(
    db: Session, *, submission_id: int, user_id: int
) -> CaseSubmission:
    submission = (
        db.query(CaseSubmission)
        .options(selectinload(CaseSubmission.answers))
        .filter(CaseSubmission.id == submission_id)
        .first()
    )
    if not submission:
        raise HTTPException(status_code=404, detail="Submission not found")
    if submission.user_id != user_id:
        raise HTTPException(status_code=403, detail="Not your submission")
    if submission.status != "in_progress":
        raise HTTPException(status_code=400, detail="Already finalized")

    submission.submitted_at = datetime.utcnow()

    # AI fills in everything that auto-grade left blank (open_text/file_upload).
    # Imported lazily so backend boots without openai when AI is disabled.
    from app.services.grader import grade_tasks

    case = db.query(STEMCase).filter(STEMCase.id == submission.case_id).first()
    tasks_by_id = {t.id: t for t in (case.tasks if case else [])}
    needs_grading = [
        (tasks_by_id[a.task_id], a)
        for a in submission.answers
        if a.score is None
        and a.task_id in tasks_by_id
        and tasks_by_id[a.task_id].type in ("open_text", "file_upload")
    ]

    if needs_grading:
        grades = await grade_tasks(case, needs_grading)
        for ans in submission.answers:
            g = grades.get(ans.task_id)
            if not g:
                continue
            ans.score = g["score"]
            ans.feedback = g["feedback"]
            ans.auto_graded = True

    # If every task ended up with a score, we're done — no teacher needed.
    # Otherwise leave it as `submitted` for manual review (graceful AI fallback).
    all_scored = all(a.score is not None for a in submission.answers)
    if all_scored:
        submission.status = "graded"
        submission.graded_at = datetime.utcnow()
    else:
        submission.status = "submitted"

    submission.total_score = _sum_scores(submission)
    _queue_teacher_alerts(db, submission)
    db.commit()
    db.refresh(submission)
    return submission


def _queue_teacher_alerts(db: Session, submission: CaseSubmission) -> None:
    """Drop a Notification row for every teacher; the bot's notifier polls these."""
    teachers = db.query(User.id).filter(User.role == "teacher").all()
    student = db.query(User).filter(User.id == submission.user_id).first()
    case = db.query(STEMCase).filter(STEMCase.id == submission.case_id).first()
    payload = {
        "submission_id": submission.id,
        "case_id": submission.case_id,
        "case_title": case.title_kk if case else None,
        "student_name": (
            f"{student.first_name or ''} {student.last_name or ''}".strip()
            if student
            else None
        ),
        "student_username": student.username if student else None,
    }
    for (teacher_id,) in teachers:
        db.add(
            Notification(user_id=teacher_id, type="new_submission", payload=payload)
        )


def grade_submission(
    db: Session,
    *,
    submission_id: int,
    teacher_id: int,
    payload: GradeSubmissionIn,
) -> CaseSubmission:
    submission = (
        db.query(CaseSubmission)
        .options(selectinload(CaseSubmission.answers))
        .filter(CaseSubmission.id == submission_id)
        .first()
    )
    if not submission:
        raise HTTPException(status_code=404, detail="Submission not found")
    if submission.status == "in_progress":
        raise HTTPException(
            status_code=400, detail="Cannot grade an in-progress submission"
        )

    answers_by_task = {a.task_id: a for a in submission.answers}
    for grade in payload.grades:
        answer = answers_by_task.get(grade.task_id)
        if not answer:
            raise HTTPException(
                status_code=400,
                detail=f"No answer for task {grade.task_id} on this submission",
            )
        answer.score = grade.score
        if grade.feedback is not None:
            answer.feedback = grade.feedback
        answer.auto_graded = False

    if payload.overall_feedback:
        db.add(
            TeacherFeedback(
                submission_id=submission.id,
                teacher_id=teacher_id,
                text=payload.overall_feedback,
            )
        )

    submission.status = "graded"
    submission.graded_at = datetime.utcnow()
    submission.total_score = _sum_scores(submission)
    db.commit()
    db.refresh(submission)
    return submission


# ---- internals -------------------------------------------------------------


def _validate_answer_payload(task: CaseTask, payload: dict) -> None:
    if not isinstance(payload, dict):
        raise HTTPException(status_code=400, detail="Payload must be an object")

    if task.type == "open_text":
        if not isinstance(payload.get("text"), str):
            raise HTTPException(
                status_code=400, detail="open_text expects {text: string}"
            )
    elif task.type == "numeric":
        value = payload.get("value")
        if not isinstance(value, (int, float)):
            raise HTTPException(
                status_code=400, detail="numeric expects {value: number}"
            )
    elif task.type == "multiple_choice":
        selected = payload.get("selected")
        if not isinstance(selected, list) or not all(
            isinstance(i, int) for i in selected
        ):
            raise HTTPException(
                status_code=400,
                detail="multiple_choice expects {selected: int[]}",
            )
    elif task.type == "file_upload":
        files = payload.get("files")
        if not isinstance(files, list) or not all(
            isinstance(f, str) for f in files
        ):
            raise HTTPException(
                status_code=400,
                detail="file_upload expects {files: string[]}",
            )


def _try_auto_grade(task: CaseTask, payload: dict) -> Optional[float]:
    if task.type == "numeric" and task.expected_answer is not None:
        expected = task.expected_answer.get("value")
        if expected is None:
            return None
        tolerance = task.tolerance if task.tolerance is not None else 0.01
        if abs(float(payload["value"]) - float(expected)) <= tolerance:
            return float(task.points)
        return 0.0

    if task.type == "multiple_choice" and task.expected_answer is not None:
        expected = set(task.expected_answer.get("indexes") or [])
        selected = set(payload.get("selected") or [])
        return float(task.points) if selected == expected else 0.0

    return None


def _sum_scores(submission: CaseSubmission) -> float:
    return float(sum((a.score or 0.0) for a in submission.answers))
