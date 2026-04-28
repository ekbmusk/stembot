from __future__ import annotations

from aiogram import Router
from aiogram.filters import CommandStart
from aiogram.types import Message

from api import client
from keyboards import mini_app_button

router = Router(name="start")


@router.message(CommandStart())
async def on_start(message: Message) -> None:
    user = message.from_user
    if not user:
        return

    backend_user = await client().get_user_by_telegram(user.id)
    role = backend_user["role"] if backend_user else None

    if role == "teacher":
        text = (
            f"Сәлем, {user.first_name or 'ұстаз'}! 👋\n\n"
            "Сен — STEM Case Bot мұғалімісің. "
            "Mini App арқылы кейстерді құрастыр, оқушылардың прогресін қарап шық, "
            "тапсырыстарды баға."
        )
    else:
        text = (
            f"Сәлем, {user.first_name or 'оқушы'}! 👋\n\n"
            "STEM Case Bot — нақты жағдайлар арқылы STEM-ді үйрететін бот.\n"
            "Mini App-ты ашып, кейстер каталогынан өзіңе ұнайтынын тап.\n\n"
            "Командалар: /my_cases — ағымдағы жұмысым, /assigned — берілген кейстер, /help."
        )

    await message.answer(text, reply_markup=mini_app_button())
