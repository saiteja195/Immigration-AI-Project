"""Fill the database with a demo account and sample data (development only).

Usage (from the backend folder, or `docker compose exec api` for Docker):

    python -m scripts.seed_demo          # create the demo account
    python -m scripts.seed_demo --reset  # delete the demo account's data and create it again

Login: demo@example.com / demo-password-123
"""
import asyncio
import sys
from datetime import date, timedelta

from app.core.db import get_db
from app.core.security import hash_password
from app.services import goals as goal_service

EMAIL = "demo@example.com"
PASSWORD = "demo-password-123"
USER_COLLECTIONS = ["profiles", "dependents", "goals", "tasks", "cases", "notifications", "reminder_prefs", "chat_messages"]


def _iso(days: int) -> str:
    return (date.today() + timedelta(days=days)).isoformat()


async def reset(db) -> None:
    user = await db.users.find_one({"email": EMAIL})
    if not user:
        return
    uid = str(user["_id"])
    for name in USER_COLLECTIONS:
        await db[name].delete_many({"user_id": uid})
    await db.users.delete_one({"_id": user["_id"]})


async def seed(db) -> str | None:
    """Create the demo data. Returns the user id, or None if the demo user already exists."""
    if await db.users.find_one({"email": EMAIL}):
        return None
    uid = str((await db.users.insert_one({"email": EMAIL, "full_name": "Demo User", "password_hash": hash_password(PASSWORD)})).inserted_id)

    await db.profiles.insert_one({
        "user_id": uid, "visa_type": "H-1B", "country_of_citizenship": "India", "employer_or_school": "Acme Technologies",
        "i94_expiry": _iso(412), "visa_stamp_expiry": _iso(200), "passport_expiry": _iso(25), "ead_expiry": _iso(80),
        "i20_end_date": None, "i797_expiry": _iso(410),
    })
    await db.dependents.insert_one({
        "user_id": uid, "name": "Priya", "relationship": "spouse", "visa_type": "H-4",
        "i94_expiry": _iso(412), "passport_expiry": None, "ead_expiry": _iso(55),
    })

    license_goal = await goal_service.create_goal(db, uid, "drivers_license")
    await goal_service.create_goal(db, uid, "h1b_extension")
    steps = await db.tasks.find({"user_id": uid, "goal_id": license_goal["id"]}).sort([("order", 1)]).to_list(None)
    first_steps = steps[:3]
    await db.tasks.update_many({"_id": {"$in": [t["_id"] for t in first_steps]}}, {"$set": {"done": True}})
    await goal_service.add_task(db, uid, "Renew passport at the consulate", date.today() + timedelta(days=21))

    today = date.today().isoformat()
    await db.cases.insert_many([
        {"user_id": uid, "receipt_number": "EAC2190012345", "form_type": "I-765", "label": "H-4 EAD renewal", "owner": "Priya",
         "filed_date": _iso(-48), "stage": "rfe", "status_text": "Request for Additional Evidence Was Sent", "notes": "",
         "rfe_due_date": _iso(18),
         "history": [{"date": _iso(-48), "stage": "received", "status_text": ""}, {"date": today, "stage": "rfe", "status_text": "Request for Additional Evidence Was Sent"}]},
        {"user_id": uid, "receipt_number": "WAC2190054321", "form_type": "I-129", "label": "H-1B extension", "owner": "me",
         "filed_date": _iso(-20), "stage": "in_review", "status_text": "Case Is Being Actively Reviewed", "notes": "", "rfe_due_date": None,
         "history": [{"date": _iso(-20), "stage": "received", "status_text": ""}, {"date": _iso(-5), "stage": "in_review", "status_text": "Case Is Being Actively Reviewed"}]},
    ])
    return uid


async def main() -> None:
    db = get_db()
    if "--reset" in sys.argv:
        await reset(db)
    if await seed(db) is None:
        print(f"{EMAIL} already exists. Use --reset to recreate it.")
        return
    print(f"Demo account ready.\n  Email:    {EMAIL}\n  Password: {PASSWORD}\nDevelopment only: do not use this on a public server.")


if __name__ == "__main__":
    asyncio.run(main())
