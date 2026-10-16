from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api import auth, health, profile
from app.core.config import settings
from app.core.db import close_client, get_db


@asynccontextmanager
async def lifespan(_: FastAPI):
    try:
        await get_db().users.create_index("email", unique=True)
    except Exception:
        pass  # Mongo not reachable yet; /api/health will show it
    yield
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
