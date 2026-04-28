from __future__ import annotations

from aiogram import Router
from aiogram.filters import Command
from aiogram.types import Message

from keyboards import mini_app_button

router = Router(name="help")

HELP_TEXT = (
    "🆘 *Көмек*\n\n"
    "STEM Case Bot — нақты STEM кейстері арқылы оқуға арналған бот.\n\n"
    "*Командалар:*\n"
    "/start — басты экран\n"
    "/profile — профиль және статистика\n"
    "/my_cases — менің кейстерім\n"
    "/assigned — мұғалім берген кейстер\n"
    "/help — осы анықтама\n\n"
    "Кейстерді шешу үшін төмендегі түймемен Mini App-ты аш."
)


@router.message(Command("help"))
async def on_help(message: Message) -> None:
    await message.answer(HELP_TEXT, parse_mode="Markdown", reply_markup=mini_app_button())
