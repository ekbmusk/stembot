from __future__ import annotations

from aiogram import F, Router
from aiogram.filters import Command, or_f
from aiogram.types import Message

from api import client
from keyboards import BTN_PROFILE, mini_app_button

router = Router(name="profile")


@router.message(or_f(Command("profile"), F.text == BTN_PROFILE))
async def on_profile(message: Message) -> None:
    user = message.from_user
    if not user:
        return

    backend_user = await client().get_user_by_telegram(user.id)
    if not backend_user:
        await message.answer(
            "Профиліңді жасау үшін алдымен Mini App-ты ашып, кіруден өт.",
            reply_markup=mini_app_button(),
        )
        return

    role_kk = "Ұстаз" if backend_user["role"] == "teacher" else "Оқушы"
    name = " ".join(
        filter(None, [backend_user.get("first_name"), backend_user.get("last_name")])
    )
    username = backend_user.get("username")

    submissions = await client().list_submissions(backend_user["id"])
    in_progress = sum(1 for s in submissions if s["status"] == "in_progress")
    submitted = sum(1 for s in submissions if s["status"] in ("submitted", "graded"))
    total_score = sum((s.get("total_score") or 0) for s in submissions)

    lines = [
        "*Профиль*",
        "",
        f"Аты: {name or '—'}",
    ]
    if username:
        lines.append(f"Telegram: @{username}")
    lines.extend(
        [
            f"Рөлі: {role_kk}",
            "",
            f"Орындалуда: {in_progress}",
            f"Аяқталған: {submitted}",
            f"Жалпы балл: {total_score:g}",
        ]
    )

    await message.answer("\n".join(lines), parse_mode="Markdown")
