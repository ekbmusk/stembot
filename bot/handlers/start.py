from __future__ import annotations

from aiogram import Router
from aiogram.filters import CommandStart
from aiogram.types import Message

from api import client
from keyboards import main_reply_keyboard

router = Router(name="start")


STUDENT_TEXT = (
    "Сәлем, {name}!\n\n"
    "STEM Case Bot — нақты өмірлік жағдайлардан тұратын физика кейстерін шешуге арналған бот.\n\n"
    "— Mini App-ты ашып, өзіңе ұнайтын кейсті тап\n"
    "— Әр жауабыңды AI бағалап, түсіндірме береді\n"
    "— Жетістіктер мен прогрессіңді жинай отырып үйрен\n\n"
    "Төмендегі түймемен бастаймыз."
)

TEACHER_TEXT = (
    "Сәлем, {name}!\n\n"
    "Сен — STEM Case Bot ұстазысың. Mini App арқылы:\n\n"
    "— Кейстер құрастыр (тапсырмалар, теория, видео)\n"
    "— Топтардың прогресін қара\n"
    "— AI бағалаған тапсырыстарды тексер\n"
    "— Оқушыларға хабарлама жібер\n\n"
    "Бастаймыз."
)


@router.message(CommandStart())
async def on_start(message: Message) -> None:
    user = message.from_user
    if not user:
        return

    backend_user = await client().get_user_by_telegram(user.id)
    role = backend_user["role"] if backend_user else None

    template = TEACHER_TEXT if role == "teacher" else STUDENT_TEXT
    text = template.format(
        name=user.first_name or ("ұстаз" if role == "teacher" else "оқушы"),
    )

    # Set the persistent reply keyboard first so it stays across the session,
    # then nudge the user with an inline web-app button on the welcome message
    # for one-tap discovery (the reply keyboard's web-app button works too).
    await message.answer(text, reply_markup=main_reply_keyboard(role))
