from __future__ import annotations

from aiogram import Router
from aiogram.filters import Command
from aiogram.types import Message

from api import client
from keyboards import mini_app_button

router = Router(name="profile")


@router.message(Command("profile"))
async def on_profile(message: Message) -> None:
    user = message.from_user
    if not user:
        return

    backend_user = await client().get_user_by_telegram(user.id)
    if not backend_user:
        await message.answer(
            "Профиліңді табу үшін алдымен Mini App-ты ашып, тіркеуден өт.",
            reply_markup=mini_app_button(),
        )
        return

    role_kk = "Мұғалім" if backend_user["role"] == "teacher" else "Оқушы"
    name = " ".join(filter(None, [backend_user.get("first_name"), backend_user.get("last_name")]))
    username = backend_user.get("username")

    lines = [
        "👤 *Профиль*",
        f"Аты-жөні: {name or '—'}",
        f"Telegram: @{username}" if username else None,
        f"Рөлі: {role_kk}",
    ]

    submissions = await client().list_submissions(backend_user["id"])
    in_progress = sum(1 for s in submissions if s["status"] == "in_progress")
    submitted = sum(1 for s in submissions if s["status"] in ("submitted", "graded"))
    lines.append(f"Орындалуда: {in_progress} • Тапсырылған: {submitted}")

    await message.answer(
        "\n".join(line for line in lines if line),
        parse_mode="Markdown",
        reply_markup=mini_app_button(),
    )
