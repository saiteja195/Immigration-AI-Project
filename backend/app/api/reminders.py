from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, status

from app.api.auth import current_user
from app.core.config import settings
from app.core.db import get_db
from app.models.reminders import NotificationList, NotificationOut, PrefsIn, PrefsOut
from app.models.user import UserOut
from app.services.mailer import get_mailer
from app.services.reminders import find_user, get_prefs, run_for_user

router = APIRouter(tags=["reminders"])


def _out(d) -> NotificationOut:
    return NotificationOut(id=str(d["_id"]), kind=d["kind"], title=d["title"], body=d["body"],
                           link=d["link"], tone=d["tone"], created=d["created"], read=d["read"])


@router.get("/notifications", response_model=NotificationList)
async def list_notifications(user: UserOut = Depends(current_user), db=Depends(get_db)):
    docs = await db.notifications.find({"user_id": user.id}).sort([("created", -1)]).to_list(50)
    unread = await db.notifications.count_documents({"user_id": user.id, "read": False})
    return NotificationList(unread=unread, items=[_out(d) for d in docs])


@router.post("/notifications/read-all", status_code=status.HTTP_204_NO_CONTENT)
async def read_all(user: UserOut = Depends(current_user), db=Depends(get_db)):
    await db.notifications.update_many({"user_id": user.id, "read": False}, {"$set": {"read": True}})


@router.post("/notifications/{notification_id}/read", status_code=status.HTTP_204_NO_CONTENT)
async def mark_read(notification_id: str, user: UserOut = Depends(current_user), db=Depends(get_db)):
    if not ObjectId.is_valid(notification_id):
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Not found")
    result = await db.notifications.update_one({"_id": ObjectId(notification_id), "user_id": user.id}, {"$set": {"read": True}})
    if result.matched_count == 0:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Not found")


@router.post("/reminders/check", response_model=NotificationList)
async def check_now(user: UserOut = Depends(current_user), db=Depends(get_db)):
    """Run today's reminder check for the current user (the scheduler does this daily for everyone)."""
    doc = await find_user(db, user.id)
    await run_for_user(db, doc, get_mailer())
    return await list_notifications(user, db)


@router.get("/reminders/prefs", response_model=PrefsOut)
async def get_reminder_prefs(user: UserOut = Depends(current_user), db=Depends(get_db)):
    return PrefsOut(**await get_prefs(db, user.id), email_available=bool(settings.smtp_host))


@router.put("/reminders/prefs", response_model=PrefsOut)
async def save_reminder_prefs(body: PrefsIn, user: UserOut = Depends(current_user), db=Depends(get_db)):
    if any(w < 1 or w > 730 for w in body.windows):
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "Reminder days must be between 1 and 730.")
    data = body.model_dump()
    data["windows"] = sorted(set(data["windows"]), reverse=True)
    await db.reminder_prefs.update_one({"user_id": user.id}, {"$set": data}, upsert=True)
    return PrefsOut(**data, email_available=bool(settings.smtp_host))
