from aiogram import Router

from . import assigned, help, my_cases, profile, start


def all_routers() -> list[Router]:
    return [
        start.router,
        profile.router,
        my_cases.router,
        assigned.router,
        help.router,
    ]
