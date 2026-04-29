from __future__ import annotations

from datetime import datetime, timezone

from aiogram import F, Router
from aiogram.filters import Command, or_f
from aiogram.types import Message

from api import client
from keyboards import BTN_ASSIGNED, mini_app_button

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
        return " — мерзімі өтіп кетті"
    days = delta.days
    if days <= 0:
        return " — бүгінге дейін"
    if days == 1:
        return " — ертеңге дейін"
    return f" — {days} күн қалды"


@router.message(or_f(Command("assigned"), F.text == BTN_ASSIGNED))
async def on_assigned(message: Message) -> None:
    user = message.from_user
    if not user:
        return

    backend_user = await client().get_user_by_telegram(user.id)
    if not backend_user:
        await message.answer(
            "Алдымен Mini App-ты ашып, кіруден өт.",
            reply_markup=mini_app_button(),
        )
        return

    cases = await client().list_assigned_cases(backend_user["id"])
    if not cases:
        await message.answer(
            "Саған әлі ұстаз жеке кейс бермеген. Mini App-тағы каталогтан өзің таңдай аласың.",
            reply_markup=mini_app_button(),
        )
        return

    lines = ["*Ұстаз берген кейстер*", ""]
    for c in cases:
        diff = _DIFFICULTY_KK.get(c.get("difficulty"), c.get("difficulty") or "")
        lines.append(
            f"• {c['title_kk']} ({diff}){_format_due(c.get('due_at'))}"
        )

    await message.answer("\n".join(lines), parse_mode="Markdown")
