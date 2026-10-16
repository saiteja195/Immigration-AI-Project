from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from pymongo.errors import DuplicateKeyError

from app.core.config import settings
from app.core.db import get_db
from app.core.security import create_token, decode_token, hash_password, verify_password
from app.models.user import LoginIn, SignupIn, UserOut

router = APIRouter(prefix="/auth", tags=["auth"])
COOKIE = "access_token"


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


@router.post("/signup", response_model=UserOut, status_code=status.HTTP_201_CREATED)
async def signup(body: SignupIn, response: Response, db=Depends(get_db)):
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
    doc = await db.users.find_one({"email": body.email.lower()})
    if not doc or not verify_password(body.password, doc["password_hash"]):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Wrong email or password")
    _set_cookie(response, str(doc["_id"]))
    return _out(doc)


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
async def logout(response: Response):
    response.delete_cookie(COOKIE)


@router.get("/me", response_model=UserOut)
async def me(user: UserOut = Depends(current_user)):
    return user
