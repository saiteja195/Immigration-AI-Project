import asyncio
from datetime import date, timedelta

import pytest
from bson import ObjectId

from app.api import reminders as reminders_api
from app.services.reminders import run_all, run_for_user

USER = {"email": "me@example.com", "password": "correct-horse", "full_name": "Test User"}
OTHER = {"email": "other@example.com", "password": "correct-horse", "full_name": "Other"}
TODAY = date(2027, 1, 1)


class FakeMailer:
    def __init__(self):
        self.sent = []

    async def send(self, to, subject, body):
        self.sent.append((to, subject, body))


def make_user(db):
    uid = ObjectId()
    user = {"_id": uid, "email": f"{uid}@example.com", "full_name": "Sai Teja"}
    asyncio.run(db.users.insert_one(user))
    return user, str(uid)


def run(db, user, mailer=None, today=TODAY):
    return asyncio.run(run_for_user(db, user, mailer, today))


def set_profile(db, uid, **dates):
    asyncio.run(db.profiles.insert_one({"user_id": uid, "visa_type": "H-1B", **{k: v.isoformat() for k, v in dates.items()}}))


def add_task(db, uid, title, due, done=False):
    asyncio.run(db.tasks.insert_one({"user_id": uid, "title": title, "due_date": due.isoformat(), "done": done}))


def test_key_date_uses_closest_window_and_fires_once(db):
    user, uid = make_user(db)
    set_profile(db, uid, passport_expiry=TODAY + timedelta(days=25))
    first = run(db, user)
    assert len(first) == 1 and "Passport expiry in 25 days" in first[0]["title"]
    assert first[0]["tone"] == "danger" and first[0]["key"].endswith(":30")
    assert run(db, user) == []  # same day again: nothing new


def test_next_window_fires_later(db):
    user, uid = make_user(db)
    set_profile(db, uid, ead_expiry=TODAY + timedelta(days=100))
    assert run(db, user)[0]["key"].endswith(":180")
    assert run(db, user, today=TODAY + timedelta(days=15))[0]["key"].endswith(":90")  # 85 days left


def test_far_away_date_is_quiet(db):
    user, uid = make_user(db)
    set_profile(db, uid, i94_expiry=TODAY + timedelta(days=400))
    assert run(db, user) == []


def test_expired_date(db):
    user, uid = make_user(db)
    set_profile(db, uid, passport_expiry=TODAY - timedelta(days=3))
    r = run(db, user)
    assert r[0]["title"] == "Passport expiry has passed"
    assert run(db, user) == []


def test_dependent_date_names_the_person(db):
    user, uid = make_user(db)
    asyncio.run(db.dependents.insert_one({"user_id": uid, "name": "Priya", "ead_expiry": (TODAY + timedelta(days=5)).isoformat()}))
    assert "(Priya)" in run(db, user)[0]["title"]


def test_task_reminders(db):
    user, uid = make_user(db)
    add_task(db, uid, "Book DMV", TODAY + timedelta(days=1))
    add_task(db, uid, "File I-765", TODAY - timedelta(days=2))
    add_task(db, uid, "Done thing", TODAY, done=True)
    add_task(db, uid, "Far away", TODAY + timedelta(days=30))
    titles = sorted(n["title"] for n in run(db, user))
    assert titles == ["Due tomorrow: Book DMV", "Overdue: File I-765"]


def test_prefs_can_turn_off_tasks_and_change_windows(db):
    user, uid = make_user(db)
    asyncio.run(db.reminder_prefs.insert_one({"user_id": uid, "task_reminders": False, "windows": [14]}))
    add_task(db, uid, "Book DMV", TODAY)
    set_profile(db, uid, passport_expiry=TODAY + timedelta(days=25))
    assert run(db, user) == []  # 25 days is outside the 14-day window and tasks are off
    assert len(run(db, user, today=TODAY + timedelta(days=15))) == 1


def test_email_digest_sent_once(db):
    user, uid = make_user(db)
    set_profile(db, uid, passport_expiry=TODAY + timedelta(days=5))
    add_task(db, uid, "Book DMV", TODAY)
    mailer = FakeMailer()
    run(db, user, mailer)
    run(db, user, mailer)
    assert len(mailer.sent) == 1
    to, subject, body = mailer.sent[0]
    assert to == user["email"] and "2 immigration reminders" in subject
    assert "Passport expiry in 5 days" in body and "Book DMV" in body
    assert asyncio.run(db.notifications.count_documents({"emailed": True})) == 2


def test_email_respects_pref_and_failures_do_not_lose_notifications(db):
    user, uid = make_user(db)
    asyncio.run(db.reminder_prefs.insert_one({"user_id": uid, "email_enabled": False}))
    set_profile(db, uid, passport_expiry=TODAY + timedelta(days=5))
    mailer = FakeMailer()
    run(db, user, mailer)
    assert mailer.sent == []

    class Broken:
        async def send(self, *a):
            raise RuntimeError("smtp down")

    user2, uid2 = make_user(db)
    set_profile(db, uid2, passport_expiry=TODAY + timedelta(days=5))
    assert len(run(db, user2, Broken())) == 1  # still saved in-app
    assert asyncio.run(db.notifications.count_documents({"user_id": uid2, "emailed": False})) == 1


def test_run_all_covers_every_user(db):
    for _ in range(2):
        _, uid = make_user(db)
        set_profile(db, uid, passport_expiry=TODAY + timedelta(days=5))
    assert asyncio.run(run_all(db, None, TODAY)) == 2


# ---- API ----

def login(client, user=USER):
    client.cookies.clear()
    client.post("/api/auth/signup", json=user)


@pytest.fixture(autouse=True)
def no_smtp(monkeypatch):
    monkeypatch.setattr(reminders_api, "get_mailer", lambda: None)


def test_notifications_flow(client):
    login(client)
    soon = (date.today() + timedelta(days=10)).isoformat()
    client.put("/api/profile", json={"visa_type": "H-1B", "passport_expiry": soon})
    data = client.post("/api/reminders/check").json()
    assert data["unread"] == 1 and "Passport expiry" in data["items"][0]["title"]
    assert client.post("/api/reminders/check").json()["unread"] == 1  # no duplicates
    nid = data["items"][0]["id"]
    assert client.post(f"/api/notifications/{nid}/read").status_code == 204
    assert client.get("/api/notifications").json()["unread"] == 0


def test_read_all_and_privacy(client):
    login(client)
    client.post("/api/tasks", json={"title": "Pay fee", "due_date": date.today().isoformat()})
    nid = client.post("/api/reminders/check").json()["items"][0]["id"]
    login(client, OTHER)
    assert client.get("/api/notifications").json()["items"] == []
    assert client.post(f"/api/notifications/{nid}/read").status_code == 404
    login(client)
    client.post("/api/auth/login", json={"email": USER["email"], "password": USER["password"]})
    assert client.post("/api/notifications/read-all").status_code == 204
    assert client.get("/api/notifications").json()["unread"] == 0


def test_prefs_roundtrip_and_validation(client):
    login(client)
    d = client.get("/api/reminders/prefs").json()
    assert d["windows"] == [180, 90, 30, 7] and d["email_available"] is False
    r = client.put("/api/reminders/prefs", json={"email_enabled": False, "task_reminders": True, "windows": [7, 60, 7]})
    assert r.json()["windows"] == [60, 7] and r.json()["email_enabled"] is False
    assert client.put("/api/reminders/prefs", json={"windows": [0]}).status_code == 422
    assert client.put("/api/reminders/prefs", json={"windows": [1000]}).status_code == 422


def test_requires_login(client):
    assert client.get("/api/notifications").status_code == 401
    assert client.post("/api/reminders/check").status_code == 401
