"""Inline keyboard helpers — Mini App entry buttons."""
from __future__ import annotations

from aiogram.types import InlineKeyboardButton, InlineKeyboardMarkup, WebAppInfo

from config import MINI_APP_URL


def mini_app_button(text: str = "📱 Кейстерді ашу") -> InlineKeyboardMarkup:
    return InlineKeyboardMarkup(
        inline_keyboard=[
                [InlineKeyboardButton(text=text, web_app=WebAppInfo(url=MINI_APP_URL))],
        ]
    )


def open_specific_case(case_id: int, label: str = "Кейсті ашу") -> InlineKeyboardMarkup:
    """A deep-link button that opens the Mini App with the case preselected.

    The frontend reads `?startapp=case-<id>` from `Telegram.WebApp.initDataUnsafe`.
    """
    url = f"{MINI_APP_URL}?startapp=case-{case_id}"
    return InlineKeyboardMarkup(
        inline_keyboard=[
            [InlineKeyboardButton(text=label, web_app=WebAppInfo(url=url))]
        ]
    )
