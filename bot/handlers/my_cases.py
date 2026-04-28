from __future__ import annotations

from aiogram import Router
from aiogram.filters import Command
from aiogram.types import Message

from api import client
from keyboards import mini_app_button

router = Router(name="my_cases")

_STATUS_KK = {
    "in_progress": "🟡 орындалуда",
    "submitted": "🔵 тапсырылды",
    "graded": "🟢 бағаланды",
}


@router.message(Command("my_cases"))
async def on_my_cases(message: Message) -> None:
    user = message.from_user
    if not user:
        return

    backend_user = await client().get_user_by_telegram(user.id)
    if not backend_user:
        await message.answer(
            "Алдымен Mini App-ты ашып, тіркеуден өт.",
            reply_markup=mini_app_button(),
        )
        return

    submissions = await client().list_submissions(backend_user["id"])
    if not submissions:
        await message.answer(
            "Әзірге бастаған кейс жоқ. Каталогтан таңдап көр.",
            reply_markup=mini_app_button(),
        )
        return

    lines = ["📚 *Менің кейстерім*", ""]
    for s in submissions[:20]:
        status = _STATUS_KK.get(s["status"], s["status"])
        title = s.get("case_title") or f"Кейс #{s['case_id']}"
        score = s.get("total_score")
        score_str = f" — {score:g} балл" if score is not None else ""
        lines.append(f"• {title} — {status}{score_str}")

    await message.answer(
        "\n".join(lines),
        parse_mode="Markdown",
        reply_markup=mini_app_button(),
    )
