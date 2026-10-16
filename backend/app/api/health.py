from fastapi import APIRouter

from app.core.db import get_db

router = APIRouter(tags=["health"])


@router.get("/health")
async def health():
    """Liveness check. Also reports whether MongoDB is reachable."""
    try:
        await get_db().command("ping")
        db = "up"
    except Exception:
        db = "down"
    return {"status": "ok", "db": db}
