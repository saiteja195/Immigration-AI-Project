import asyncio
from datetime import datetime, timedelta, timezone

from app.core.config import settings

USER = {"email": "me@example.com", "password": "correct-horse", "full_name": "Test User"}
OTHER = {"email": "other@example.com", "password": "correct-horse", "full_name": "Other"}


def bad_login(client, email=USER["email"]):
    return client.post("/api/auth/login", json={"email": email, "password": "wrong-password"})


def test_signups_open_by_default(client):
    assert client.get("/api/auth/config").json() == {"signups_open": True}


def test_first_account_allowed_when_signups_closed(client, monkeypatch):
    monkeypatch.setattr(settings, "allow_signups", False)
    assert client.get("/api/auth/config").json() == {"signups_open": True}  # nobody exists yet
    assert client.post("/api/auth/signup", json=USER).status_code == 201


def test_signups_rejected_once_closed_and_someone_exists(client, monkeypatch):
    client.post("/api/auth/signup", json=USER)
    monkeypatch.setattr(settings, "allow_signups", False)
    assert client.get("/api/auth/config").json() == {"signups_open": False}
    client.cookies.clear()
    r = client.post("/api/auth/signup", json=OTHER)
    assert r.status_code == 403 and "closed" in r.json()["detail"]


def test_existing_users_can_still_log_in_when_closed(client, monkeypatch):
    client.post("/api/auth/signup", json=USER)
    monkeypatch.setattr(settings, "allow_signups", False)
    client.cookies.clear()
    assert client.post("/api/auth/login", json={"email": USER["email"], "password": USER["password"]}).status_code == 200


def test_too_many_wrong_passwords_locks_login(client, monkeypatch):
    monkeypatch.setattr(settings, "login_max_attempts", 3)
    client.post("/api/auth/signup", json=USER)
    client.cookies.clear()
    assert [bad_login(client).status_code for _ in range(3)] == [401, 401, 401]
    assert bad_login(client).status_code == 429
    # even the right password is refused while locked
    ok = client.post("/api/auth/login", json={"email": USER["email"], "password": USER["password"]})
    assert ok.status_code == 429


def test_lock_is_per_email(client, monkeypatch):
    monkeypatch.setattr(settings, "login_max_attempts", 2)
    client.post("/api/auth/signup", json=USER)
    client.cookies.clear()
    client.post("/api/auth/signup", json=OTHER)
    client.cookies.clear()
    bad_login(client); bad_login(client)
    assert bad_login(client).status_code == 429
    assert client.post("/api/auth/login", json={"email": OTHER["email"], "password": OTHER["password"]}).status_code == 200


def test_success_resets_the_counter(client, monkeypatch):
    monkeypatch.setattr(settings, "login_max_attempts", 3)
    client.post("/api/auth/signup", json=USER)
    client.cookies.clear()
    bad_login(client); bad_login(client)
    assert client.post("/api/auth/login", json={"email": USER["email"], "password": USER["password"]}).status_code == 200
    client.cookies.clear()
    assert [bad_login(client).status_code for _ in range(3)] == [401, 401, 401]


def test_old_failures_do_not_count(client, db, monkeypatch):
    monkeypatch.setattr(settings, "login_max_attempts", 2)
    client.post("/api/auth/signup", json=USER)
    client.cookies.clear()
    old = datetime.now(timezone.utc) - timedelta(minutes=settings.login_window_minutes + 5)
    asyncio.run(db.login_failures.insert_many([{"email": USER["email"], "at": old} for _ in range(5)]))
    assert bad_login(client).status_code == 401
