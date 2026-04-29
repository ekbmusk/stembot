from __future__ import annotations

from aiogram import F, Router
from aiogram.filters import Command, or_f
from aiogram.types import Message

from keyboards import BTN_HELP

router = Router(name="help")

HELP_TEXT = (
    "*Көмек*\n\n"
    "STEM Case Bot — нақты өмірлік жағдайлардан тұратын физика кейстерін шешуге арналған бот. "
    "Кейстерді Mini App арқылы ашасың, AI әр жауабыңды тексеріп, түсіндірме береді.\n\n"
    "*Командалар*\n"
    "/start — бастапқы экран\n"
    "/profile — профиль және статистика\n"
    "/my_cases — менің кейстерім\n"
    "/assigned — ұстаз берген кейстер\n"
    "/help — осы анықтама\n\n"
    "Төмендегі түймелермен де бірден өте аласың."
)


@router.message(or_f(Command("help"), F.text == BTN_HELP))
async def on_help(message: Message) -> None:
    await message.answer(HELP_TEXT, parse_mode="Markdown")
