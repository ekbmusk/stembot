from __future__ import annotations

from datetime import datetime, timezone

from aiogram import Router
from aiogram.filters import Command
from aiogram.types import Message

from api import client
from keyboards import mini_app_button

router = Router(name="assigned")

_DIFFICULTY_KK = {"easy": "оңай", "medium": "орташа", "hard": "қиын"}


def _format_due(due_iso: str | None) -> str:
    if not due_iso:
        return ""
    try:
        due = datetime.fromisoformat(due_iso.replace("Z", "+00:00"))
    except ValueError:
        return ""
    now = datetime.now(timezone.utc) if due.tzinfo else datetime.utcnow()
    delta = due - now
    if delta.total_seconds() < 0:
        return " — ⚠️ мерзімі өтіп кетті"
    days = delta.days
    if days <= 0:
        return " — ⏰ бүгін!"
    if days == 1:
        return " — ⏰ ертең"
    return f" — ⏰ {days} күн қалды"


@router.message(Command("assigned"))
async def on_assigned(message: Message) -> None:
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

    cases = await client().list_assigned_cases(backend_user["id"])
    if not cases:
        await message.answer(
            "Әзірге саған берілген кейс жоқ. Mini App-тағы каталогтан өзің таңдай аласың.",
            reply_markup=mini_app_button(),
        )
        return

    lines = ["📋 *Берілген кейстер*", ""]
    for c in cases:
        diff = _DIFFICULTY_KK.get(c.get("difficulty"), c.get("difficulty") or "")
        meta = " • ".join(filter(None, [c.get("subject"), diff]))
        lines.append(f"• {c['title_kk']} ({meta}){_format_due(c.get('due_at'))}")

    await message.answer(
        "\n".join(lines),
        parse_mode="Markdown",
        reply_markup=mini_app_button(),
    )
