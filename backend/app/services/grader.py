"""AI-driven grading for open-ended tasks.

Replaces manual teacher review for `open_text` and `file_upload` answers — at
finalize time we batch all unscored answers into a single Groq call and write
back per-task score + feedback. Numeric and multiple-choice tasks keep their
deterministic auto-grade (cheap, instant, no LLM math drift).

Returns an empty dict on any upstream failure; the caller is responsible for
deciding whether to fall back to teacher review.
"""
from __future__ import annotations

import json
import logging
import os
from typing import Any

from app.database.models import CaseTask, STEMCase, TaskAnswer

logger = logging.getLogger(__name__)

GROQ_BASE_URL = "https://api.groq.com/openai/v1"
MODEL = "llama-3.3-70b-versatile"
TEMPERATURE = 0.2
MAX_TOKENS = 2000

SYSTEM_PROMPT = (
    "Сен — STEM пәндері бойынша оқушылардың ашық жауаптарын бағалайтын тәжірибелі ұстазсың.\n\n"
    "Әр тапсырмада «rubric» өрісі болады — бұл дұрыс жауаптың үлгісі немесе бағалау критерийі. "
    "Оны эталон ретінде пайдалан, бірақ жауаптың дәл сөзбе-сөз көшірмесі ретінде емес.\n\n"
    "Бағалау логикасы:\n"
    "1. Оқушы жауабындағы НЕГІЗГІ ИДЕЯ рубрикадағы идеямен сәйкес келе ме? Сол маңызды.\n"
    "2. Идея толық, дұрыс, әрі негізделген — толық балл.\n"
    "3. Идея бар, бірақ толық емес немесе шала түсіндірілген — пропорционал жартылай балл.\n"
    "4. Идея қате немесе жоқ — 0-ге жақын балл.\n"
    "5. Оқушы өз сөздерімен жазса да, идея дұрыс болса — толық балл бер. Терминдер дәл болмаса да, түсінігі көрінсе — кешірімді бол.\n"
    "6. Бос немесе мағынасыз жауап (бір сөз, «не білмеймін» сияқты) — 0 балл.\n\n"
    "Пікір жазу принциптері:\n"
    "- Қазақ тілінде, 1–2 сөйлемнен аспасын\n"
    "- Не дұрыс, не қате екенін айт; қажет болса — рубрикадан не қалғанын ескерт\n"
    "- Эмпатиямен жаз — оқушы үйренеді\n\n"
    "Әрбір тапсырма үшін: 0..points аралығында балл және қысқа қазақ тіліндегі пікір. "
    "Жауапты қатаң JSON форматта бер."
)


def _format_answer(payload: dict | None, type_: str) -> str:
    if not payload:
        return "[жауап жоқ]"
    if type_ == "open_text":
        return payload.get("text") or "[бос мәтін]"
    if type_ == "file_upload":
        files = payload.get("files") or []
        if not files:
            return "[файл тіркелмеген]"
        names = [f.split("/")[-1] for f in files]
        return f"[оқушы {len(files)} файл тіркеді: {', '.join(names[:5])}]"
    if type_ == "numeric":
        return f"value = {payload.get('value')}"
    if type_ == "multiple_choice":
        return f"selected indexes = {payload.get('selected', [])}"
    return json.dumps(payload, ensure_ascii=False)


async def grade_tasks(
    case: STEMCase, items: list[tuple[CaseTask, TaskAnswer]]
) -> dict[int, dict[str, Any]]:
    """Returns {task_id: {"score": float, "feedback": str}}.

    Empty dict on any failure (missing API key, network, malformed JSON).
    """
    if not items:
        return {}

    api_key = os.getenv("GROQ_API_KEY")
    if not api_key:
        logger.info("GROQ_API_KEY not set — AI grading skipped")
        return {}

    payload_tasks = []
    for task, answer in items:
        payload_tasks.append({
            "task_id": task.id,
            "type": task.type,
            "prompt": task.prompt_kk,
            "points": task.points,
            "rubric": task.rubric_kk,
            "expected_answer": task.expected_answer,
            "options": task.options,
            "student_answer": _format_answer(answer.payload, task.type),
        })

    user_msg = (
        f"Кейс: {case.title_kk}\n"
        f"Мақсаты: {case.objective_kk or '—'}\n"
        f"Теориялық контекст: {(case.theory_kk or '—').strip()}\n\n"
        "Әр тапсырмада «rubric» — эталон, «student_answer» — оқушы жауабы. "
        "Идеяны салыстыр, балл қой, қысқа пікір жаз.\n\n"
        f"{json.dumps(payload_tasks, ensure_ascii=False, indent=2)}\n\n"
        "Қатаң JSON форматы:\n"
        '{ "grades": [{"task_id": <int>, "score": <float>, "feedback": "<string>"}, ...] }'
    )

    try:
        from openai import AsyncOpenAI

        client = AsyncOpenAI(base_url=GROQ_BASE_URL, api_key=api_key)
        resp = await client.chat.completions.create(
            model=MODEL,
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": user_msg},
            ],
            temperature=TEMPERATURE,
            max_tokens=MAX_TOKENS,
            response_format={"type": "json_object"},
        )
        content = resp.choices[0].message.content or ""
        data = json.loads(content)
    except Exception:  # noqa: BLE001 — we want to surface ANY failure as a fallback
        logger.exception("AI grading request failed")
        return {}

    raw = data.get("grades") if isinstance(data, dict) else None
    if not isinstance(raw, list):
        logger.warning("AI grader returned unexpected payload shape: %r", data)
        return {}

    points_by_id = {task.id: float(task.points) for task, _ in items}
    out: dict[int, dict[str, Any]] = {}
    for entry in raw:
        if not isinstance(entry, dict):
            continue
        try:
            tid = int(entry.get("task_id"))
        except (TypeError, ValueError):
            continue
        if tid not in points_by_id:
            continue
        try:
            score = float(entry.get("score", 0.0))
        except (TypeError, ValueError):
            score = 0.0
        score = max(0.0, min(score, points_by_id[tid]))
        feedback = (entry.get("feedback") or "").strip()
        out[tid] = {"score": score, "feedback": feedback}

    logger.info("AI graded %d/%d tasks for case %s", len(out), len(items), case.id)
    return out
