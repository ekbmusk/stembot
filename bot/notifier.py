"""Periodic dispatch loop: pull pending notifications from the backend and
deliver them via Telegram.
"""
from __future__ import annotations

import asyncio
import logging
from typing import Optional

from aiogram import Bot
from aiogram.exceptions import TelegramAPIError

from api import client
from config import NOTIFIER_INTERVAL_SEC
from keyboards import mini_app_button, open_specific_case

logger = logging.getLogger(__name__)


def _format(notification: dict) -> tuple[str, Optional[int]]:
    """Return (text, optional_case_id) for a notification."""
    n_type = notification.get("type")
    payload = notification.get("payload") or {}

    if n_type == "broadcast":
        return payload.get("text") or "", None

    if n_type == "new_submission":
        title = payload.get("case_title") or f"Кейс №{payload.get('case_id', '?')}"
        student = payload.get("student_name") or "Оқушы"
        username = payload.get("student_username")
        suffix = f" (@{username})" if username else ""
        return (
            f"*Жаңа тапсырыс*\n\n{student}{suffix} «{title}» кейсін тапсырды.",
            payload.get("case_id"),
        )

    if n_type == "case_reminder":
        title = payload.get("case_title") or f"Кейс №{payload.get('case_id', '?')}"
        return (
            f"Еске салу: «{title}» кейсін аяқтауды ұмытпа.",
            payload.get("case_id"),
        )

    return payload.get("text") or n_type or "Жаңа хабар", payload.get("case_id")


async def deliver_one(bot: Bot, notification: dict) -> bool:
    text, case_id = _format(notification)
    if not text:
        # Drop empty payloads without retrying forever.
        await client().ack_notification(notification["id"])
        return True

    keyboard = (
        open_specific_case(case_id) if case_id else mini_app_button()
    )

    try:
        await bot.send_message(
            chat_id=notification["telegram_id"],
            text=text,
            parse_mode="Markdown",
            reply_markup=keyboard,
        )
    except TelegramAPIError as exc:
        # Common cases: bot blocked by user, chat not found. ACK so we don't
        # retry forever — the message is logically lost.
        message = str(exc).lower()
        if any(k in message for k in ("blocked", "chat not found", "user is deactivated")):
            logger.info("Dropping notification %s: %s", notification["id"], exc)
            await client().ack_notification(notification["id"])
            return True
        logger.warning("Telegram delivery failed for %s: %s", notification["id"], exc)
        return False

    await client().ack_notification(notification["id"])
    return True


async def run(bot: Bot, stop_event: asyncio.Event) -> None:
    logger.info("Notifier started (interval %ss)", NOTIFIER_INTERVAL_SEC)
    while not stop_event.is_set():
        try:
            pending = await client().pending_notifications()
            for n in pending:
                if stop_event.is_set():
                    break
                await deliver_one(bot, n)
        except Exception:  # noqa: BLE001 — never let a tick kill the loop
            logger.exception("Notifier tick failed")

        try:
            await asyncio.wait_for(stop_event.wait(), timeout=NOTIFIER_INTERVAL_SEC)
        except asyncio.TimeoutError:
            pass
    logger.info("Notifier stopped")
