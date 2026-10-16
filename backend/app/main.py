from contextlib import asynccontextmanager

from apscheduler.schedulers.asyncio import AsyncIOScheduler

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api import auth, chat, health, profile, reminders, tasks
from app.core.config import settings
from app.core.db import close_client, get_db
from app.services.mailer import get_mailer
from app.services.reminders import run_all


@asynccontextmanager
async def lifespan(_: FastAPI):
    try:
        await get_db().users.create_index("email", unique=True)
        await get_db().notifications.create_index([("user_id", 1), ("key", 1)], unique=True)
    except Exception:
        pass  # Mongo not reachable yet; /api/health will show it
    scheduler = None
    if settings.scheduler_enabled:
        scheduler = AsyncIOScheduler(timezone="UTC")
        scheduler.add_job(lambda: run_all(get_db(), get_mailer()), "cron", hour=settings.reminder_hour_utc, minute=0)
        scheduler.add_job(lambda: run_all(get_db(), get_mailer()), "date")  # catch up after a restart
        scheduler.start()
    yield
    if scheduler:
        scheduler.shutdown(wait=False)
    close_client()


app = FastAPI(title=settings.app_name, lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.include_router(health.router, prefix="/api")
app.include_router(auth.router, prefix="/api")
app.include_router(profile.router, prefix="/api")
app.include_router(tasks.router, prefix="/api")
app.include_router(chat.router, prefix="/api")
app.include_router(reminders.router, prefix="/api")
