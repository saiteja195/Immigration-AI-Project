from datetime import datetime, timedelta, timezone

from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from pymongo.errors import DuplicateKeyError

from app.core.config import settings
from app.core.db import get_db
from app.core.security import create_token, decode_token, hash_password, verify_password
from app.models.user import LoginIn, SignupIn, UserOut

router = APIRouter(prefix="/auth", tags=["auth"])
COOKIE = "access_token"
_DUMMY_HASH = hash_password("not-a-real-password")  # keeps timing similar for unknown emails


def _out(doc) -> UserOut:
    return UserOut(id=str(doc["_id"]), email=doc["email"], full_name=doc["full_name"])


def _set_cookie(response: Response, user_id: str) -> None:
    response.set_cookie(
        COOKIE,
        create_token(user_id),
        httponly=True,
        samesite="lax",
        secure=settings.cookie_secure,
        max_age=settings.token_minutes * 60,
    )


async def current_user(request: Request, db=Depends(get_db)) -> UserOut:
    user_id = decode_token(request.cookies.get(COOKIE, ""))
    if not user_id or not ObjectId.is_valid(user_id):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Not logged in")
    doc = await db.users.find_one({"_id": ObjectId(user_id)})
    if not doc:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Not logged in")
    return _out(doc)


async def signups_open(db) -> bool:
    return settings.allow_signups or await db.users.find_one({}, {"_id": 1}) is None


@router.get("/config")
async def auth_config(db=Depends(get_db)):
    return {"signups_open": await signups_open(db)}


@router.post("/signup", response_model=UserOut, status_code=status.HTTP_201_CREATED)
async def signup(body: SignupIn, response: Response, db=Depends(get_db)):
    if not await signups_open(db):
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Signups are closed.")
    doc = {
        "email": body.email.lower(),
        "full_name": body.full_name,
        "password_hash": hash_password(body.password),
    }
    try:
        result = await db.users.insert_one(doc)
    except DuplicateKeyError:
        raise HTTPException(status.HTTP_409_CONFLICT, "Email already registered")
    doc["_id"] = result.inserted_id
    _set_cookie(response, str(result.inserted_id))
    return _out(doc)


@router.post("/login", response_model=UserOut)
async def login(body: LoginIn, response: Response, db=Depends(get_db)):
    email = body.email.lower()
    since = datetime.now(timezone.utc) - timedelta(minutes=settings.login_window_minutes)
    failures = await db.login_failures.count_documents({"email": email, "at": {"$gte": since}})
    if failures >= settings.login_max_attempts:
        raise HTTPException(status.HTTP_429_TOO_MANY_REQUESTS, "Too many wrong attempts. Please wait a few minutes and try again.")
    doc = await db.users.find_one({"email": email})
    ok = verify_password(body.password, doc["password_hash"] if doc else _DUMMY_HASH)
    if not doc or not ok:
        await db.login_failures.insert_one({"email": email, "at": datetime.now(timezone.utc)})
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Wrong email or password")
    await db.login_failures.delete_many({"email": email})
    _set_cookie(response, str(doc["_id"]))
    return _out(doc)


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
async def logout(response: Response):
    response.delete_cookie(COOKIE)


@router.get("/me", response_model=UserOut)
async def me(user: UserOut = Depends(current_user)):
    return user
