USER = {"email": "Me@Example.com", "password": "correct-horse", "full_name": "Test User"}


def test_signup_then_me(client):
    r = client.post("/api/auth/signup", json=USER)
    assert r.status_code == 201
    assert "password" not in r.text
    me = client.get("/api/auth/me")
    assert me.status_code == 200
    assert me.json()["email"] == "me@example.com"


def test_me_requires_login(client):
    assert client.get("/api/auth/me").status_code == 401


def test_login_wrong_password(client):
    client.post("/api/auth/signup", json=USER)
    client.cookies.clear()
    r = client.post("/api/auth/login", json={"email": USER["email"], "password": "nope-nope"})
    assert r.status_code == 401


def test_login_and_logout(client):
    client.post("/api/auth/signup", json=USER)
    client.post("/api/auth/logout")
    assert client.get("/api/auth/me").status_code == 401
    r = client.post("/api/auth/login", json={"email": USER["email"], "password": USER["password"]})
    assert r.status_code == 200
    assert client.get("/api/auth/me").status_code == 200


def test_short_password_rejected(client):
    r = client.post("/api/auth/signup", json={**USER, "password": "short"})
    assert r.status_code == 422


def test_duplicate_email_rejected(client):
    client.post("/api/auth/signup", json=USER)
    r = client.post("/api/auth/signup", json={**USER, "email": "me@example.com"})
    assert r.status_code == 409
