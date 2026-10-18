import json
from datetime import datetime, time, timezone
from functools import lru_cache

import anthropic
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse

from app.api.auth import current_user
from app.core.config import settings
from app.core.db import get_db
from app.models.chat import ChatIn, ChatMessageOut, ChatOut, ChatStatus
from app.models.user import UserOut
from app.services.chat import run_chat, stream_chat

router = APIRouter(prefix="/chat", tags=["chat"])
HISTORY_LIMIT = 20


@lru_cache
def _client() -> anthropic.AsyncAnthropic | None:
    if not settings.anthropic_api_key:
        return None
    return anthropic.AsyncAnthropic(api_key=settings.anthropic_api_key, timeout=90)


def get_llm():
    return _client()


@router.get("/status", response_model=ChatStatus)
async def chat_status(_: UserOut = Depends(current_user), llm=Depends(get_llm)):
    return ChatStatus(enabled=llm is not None)


@router.get("/messages", response_model=list[ChatMessageOut])
async def messages(user: UserOut = Depends(current_user), db=Depends(get_db)):
    docs = await db.chat_messages.find({"user_id": user.id}).sort([("created", 1)]).to_list(200)
    return [ChatMessageOut(role=d["role"], content=d["content"], citations=d.get("citations", [])) for d in docs]


@router.delete("", status_code=status.HTTP_204_NO_CONTENT)
async def clear(user: UserOut = Depends(current_user), db=Depends(get_db)):
    await db.chat_messages.delete_many({"user_id": user.id})


async def _prepare(user: UserOut, db, llm) -> list[dict]:
    """Checks shared by both chat endpoints. Returns the recent history to send."""
    if llm is None:
        raise HTTPException(status.HTTP_503_SERVICE_UNAVAILABLE, "The assistant is not set up yet.")
    today_start = datetime.combine(datetime.now(timezone.utc).date(), time.min, tzinfo=timezone.utc)
    sent_today = await db.chat_messages.count_documents({"user_id": user.id, "role": "user", "created": {"$gte": today_start}})
    if sent_today >= settings.chat_daily_limit:
        raise HTTPException(status.HTTP_429_TOO_MANY_REQUESTS, "Daily message limit reached. Try again tomorrow.")
    docs = await db.chat_messages.find({"user_id": user.id}).sort([("created", -1)]).to_list(HISTORY_LIMIT)
    history = [{"role": d["role"], "content": d["content"]} for d in reversed(docs)]
    while history and history[0]["role"] != "user":
        history.pop(0)
    return history


async def _save(db, user_id: str, message: str, result) -> None:
    now = datetime.now(timezone.utc)
    await db.chat_messages.insert_many([
        {"user_id": user_id, "role": "user", "content": message, "created": now},
        {"user_id": user_id, "role": "assistant", "content": result.reply, "citations": result.citations, "created": datetime.now(timezone.utc)},
    ])


def _friendly(e: Exception) -> tuple[int, str]:
    if isinstance(e, anthropic.AuthenticationError):
        return status.HTTP_503_SERVICE_UNAVAILABLE, "The assistant is not configured correctly."
    if isinstance(e, anthropic.RateLimitError):
        return status.HTTP_429_TOO_MANY_REQUESTS, "The assistant is busy. Please try again in a moment."
    return status.HTTP_502_BAD_GATEWAY, "The assistant could not answer right now."


@router.post("", response_model=ChatOut)
async def send(body: ChatIn, user: UserOut = Depends(current_user), db=Depends(get_db), llm=Depends(get_llm)):
    history = await _prepare(user, db, llm)
    try:
        result = await run_chat(llm, db, user.id, history, body.message, settings.anthropic_model, settings.chat_max_tokens)
    except anthropic.APIError as e:
        code, text = _friendly(e)
        raise HTTPException(code, text)
    await _save(db, user.id, body.message, result)
    return ChatOut(reply=result.reply, citations=result.citations, actions=result.actions)


@router.post("/stream")
async def send_stream(body: ChatIn, user: UserOut = Depends(current_user), db=Depends(get_db), llm=Depends(get_llm)):
    """Server-sent events: text pieces as they are written, then a final 'done' event."""
    history = await _prepare(user, db, llm)

    async def events():
        try:
            async for ev in stream_chat(llm, db, user.id, history, body.message, settings.anthropic_model, settings.chat_max_tokens):
                if ev["type"] == "done":
                    r = ev["result"]
                    await _save(db, user.id, body.message, r)
                    ev = {"type": "done", "reply": r.reply, "citations": r.citations, "actions": r.actions}
                yield f"data: {json.dumps(ev)}\n\n"
        except anthropic.APIError as e:
            yield f"data: {json.dumps({'type': 'error', 'message': _friendly(e)[1]})}\n\n"
        except Exception:
            yield f"data: {json.dumps({'type': 'error', 'message': 'The assistant could not answer right now.'})}\n\n"

    return StreamingResponse(events(), media_type="text/event-stream", headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"})
