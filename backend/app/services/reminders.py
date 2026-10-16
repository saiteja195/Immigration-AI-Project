import logging
from datetime import date, datetime, timezone

from bson import ObjectId

from app.core.config import settings
from app.services.keydates import collect_key_dates

log = logging.getLogger("reminders")

DEFAULT_PREFS = {"email_enabled": True, "task_reminders": True, "windows": [180, 90, 30, 7]}


async def get_prefs(db, user_id: str) -> dict:
    doc = await db.reminder_prefs.find_one({"user_id": user_id}) or {}
    return {**DEFAULT_PREFS, **{k: v for k, v in doc.items() if k in DEFAULT_PREFS}}


def _tone(days: int) -> str:
    return "danger" if days <= 30 else "warn" if days <= 90 else "ok"


def _plural(n: int) -> str:
    return f"{n} day" if n == 1 else f"{n} days"


async def build_candidates(db, user_id: str, prefs: dict, today: date) -> list[dict]:
    """Every reminder that is due today. Each has a unique key so it only fires once."""
    out: list[dict] = []
    windows = sorted(prefs["windows"])

    for k in await collect_key_dates(db, user_id, today):
        who = "" if k["owner"] == "me" else f" ({k['owner']})"
        name = f"{k['label']}{who}"
        base = f"kd:{k['label']}:{k['owner']}:{k['due']}"
        if k["days_left"] < 0:
            out.append({"key": f"{base}:expired", "kind": "key_date", "tone": "danger", "link": "/plans",
                        "title": f"{name} has passed", "body": f"It was on {k['due']:%b %d, %Y}. Check what you need to do next."})
            continue
        window = next((w for w in windows if k["days_left"] <= w), None)  # the closest window we are inside
        if window is not None:
            when = "today" if k["days_left"] == 0 else f"in {_plural(k['days_left'])}"
            out.append({"key": f"{base}:{window}", "kind": "key_date", "tone": _tone(k["days_left"]), "link": "/plans",
                        "title": f"{name} {when}", "body": f"Due {k['due']:%b %d, %Y}. Start early, see Plans for the steps."})

    if prefs["task_reminders"]:
        async for t in db.tasks.find({"user_id": user_id, "done": False, "due_date": {"$ne": None}}):
            days = (date.fromisoformat(t["due_date"]) - today).days
            tid = str(t["_id"])
            if days < 0:
                out.append({"key": f"task:{tid}:overdue", "kind": "task", "tone": "danger", "link": "/tasks",
                            "title": f"Overdue: {t['title']}", "body": f"Was due {_plural(-days)} ago."})
            elif days <= 1:
                when = "today" if days == 0 else "tomorrow"
                out.append({"key": f"task:{tid}:soon", "kind": "task", "tone": "warn", "link": "/tasks",
                            "title": f"Due {when}: {t['title']}", "body": "Open Tasks to mark it done or change the date."})
    return out


def _email_body(name: str, items: list[dict]) -> str:
    lines = [f"Hi {name.split()[0] if name else 'there'},", "", "Here is what needs your attention:", ""]
    lines += [f"- {i['title']}: {i['body']}" for i in items]
    lines += ["", f"Open your dashboard: {settings.app_url}", "", "This is general information, not legal advice."]
    return "\n".join(lines)


async def run_for_user(db, user: dict, mailer, today: date | None = None) -> list[dict]:
    """Create today's new notifications for one user and email them as one digest."""
    today = today or date.today()
    uid = str(user["_id"])
    prefs = await get_prefs(db, uid)
    candidates = await build_candidates(db, uid, prefs, today)
    if not candidates:
        return []
    keys = [c["key"] for c in candidates]
    seen = {d["key"] async for d in db.notifications.find({"user_id": uid, "key": {"$in": keys}})}
    fresh = [c for c in candidates if c["key"] not in seen]
    if not fresh:
        return []
    now = datetime.now(timezone.utc)
    docs = [{**c, "user_id": uid, "created": now, "read": False, "emailed": False} for c in fresh]
    await db.notifications.insert_many(docs)

    if mailer and prefs["email_enabled"] and user.get("email"):
        try:
            subject = fresh[0]["title"] if len(fresh) == 1 else f"{len(fresh)} immigration reminders"
            await mailer.send(user["email"], subject, _email_body(user.get("full_name", ""), fresh))
            await db.notifications.update_many({"user_id": uid, "key": {"$in": [c["key"] for c in fresh]}}, {"$set": {"emailed": True}})
        except Exception:
            log.exception("Could not email reminders to user %s", uid)
    return fresh


async def run_all(db, mailer, today: date | None = None) -> int:
    count = 0
    async for user in db.users.find({}):
        try:
            count += len(await run_for_user(db, user, mailer, today))
        except Exception:
            log.exception("Reminder run failed for user %s", user.get("_id"))
    return count


async def find_user(db, user_id: str) -> dict | None:
    return await db.users.find_one({"_id": ObjectId(user_id)})
