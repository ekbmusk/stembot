"""Keyboard factories.

- `main_reply_keyboard` — persistent reply keyboard sent once on /start, gives
  the student fast access to the most-used flows without typing slash commands.
- `mini_app_button` / `open_specific_case` — inline web-app buttons used inside
  individual messages (welcomes, deep-links from notifications).
"""
from __future__ import annotations

from aiogram.types import (
    InlineKeyboardButton,
    InlineKeyboardMarkup,
    KeyboardButton,
    ReplyKeyboardMarkup,
    WebAppInfo,
)

from config import MINI_APP_URL

# Button labels — also used as message-text filters in handlers so the same
# function fires whether the user typed /command or tapped the button.
BTN_OPEN_APP = "Mini App-ты ашу"
BTN_MY_CASES = "Менің кейстерім"
BTN_ASSIGNED = "Берілген кейстер"
BTN_PROFILE = "Профиль"
BTN_HELP = "Көмек"


def main_reply_keyboard(role: str | None = None) -> ReplyKeyboardMarkup:
    """Persistent keyboard shown under the chat input. Stays put across
    messages until the bot replaces it. Web-app button works in both
    student and teacher modes — Mini App routes by role internally.
    """
    rows: list[list[KeyboardButton]] = [
        [KeyboardButton(text=BTN_OPEN_APP, web_app=WebAppInfo(url=MINI_APP_URL))],
        [
            KeyboardButton(text=BTN_MY_CASES),
            KeyboardButton(text=BTN_ASSIGNED),
        ],
        [
            KeyboardButton(text=BTN_PROFILE),
            KeyboardButton(text=BTN_HELP),
        ],
    ]
    return ReplyKeyboardMarkup(
        keyboard=rows,
        resize_keyboard=True,
        is_persistent=True,
    )


def mini_app_button(text: str = "Mini App-ты ашу") -> InlineKeyboardMarkup:
    return InlineKeyboardMarkup(
        inline_keyboard=[
            [InlineKeyboardButton(text=text, web_app=WebAppInfo(url=MINI_APP_URL))],
        ]
    )


def open_specific_case(
    case_id: int, label: str = "Кейсті ашу"
) -> InlineKeyboardMarkup:
    """Deep-link button — opens the Mini App with the case preselected via
    Telegram.WebApp.initDataUnsafe.start_param."""
    url = f"{MINI_APP_URL}?startapp=case-{case_id}"
    return InlineKeyboardMarkup(
        inline_keyboard=[
            [InlineKeyboardButton(text=label, web_app=WebAppInfo(url=url))]
        ]
    )
