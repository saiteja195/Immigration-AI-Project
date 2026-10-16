from datetime import date, timedelta

USER = {"email": "me@example.com", "password": "correct-horse", "full_name": "Test User"}
OTHER = {"email": "other@example.com", "password": "correct-horse", "full_name": "Other"}


def login(client, user=USER):
    client.cookies.clear()
    client.post("/api/auth/signup", json=user)


def test_profile_requires_login(client):
    assert client.get("/api/profile").status_code == 401


def test_profile_missing_then_saved(client):
    login(client)
    assert client.get("/api/profile").status_code == 404
    r = client.put("/api/profile", json={"visa_type": "H-1B", "i94_expiry": "2027-09-30"})
    assert r.status_code == 200
    got = client.get("/api/profile").json()
    assert got["visa_type"] == "H-1B"
    assert got["country_of_citizenship"] == "India"


def test_invalid_visa_rejected(client):
    login(client)
    assert client.put("/api/profile", json={"visa_type": "XYZ"}).status_code == 422


def test_dependents_add_list_delete(client):
    login(client)
    r = client.post("/api/dependents", json={"name": "Spouse", "relationship": "spouse", "visa_type": "H-4"})
    assert r.status_code == 201
    dep_id = r.json()["id"]
    assert len(client.get("/api/dependents").json()) == 1
    assert client.delete(f"/api/dependents/{dep_id}").status_code == 204
    assert client.get("/api/dependents").json() == []


def test_users_cannot_see_each_others_dependents(client):
    login(client)
    dep_id = client.post("/api/dependents", json={"name": "Spouse", "relationship": "spouse", "visa_type": "H-4"}).json()["id"]
    login(client, OTHER)
    assert client.get("/api/dependents").json() == []
    assert client.delete(f"/api/dependents/{dep_id}").status_code == 404


def test_key_dates_sorted_with_days_left(client):
    login(client)
    soon = date.today() + timedelta(days=10)
    later = date.today() + timedelta(days=100)
    client.put("/api/profile", json={"visa_type": "H-1B", "i94_expiry": later.isoformat(), "passport_expiry": soon.isoformat()})
    client.post("/api/dependents", json={"name": "Spouse", "relationship": "spouse", "visa_type": "H-4", "ead_expiry": (date.today() + timedelta(days=50)).isoformat()})
    dates = client.get("/api/key-dates").json()
    assert [d["days_left"] for d in dates] == [10, 50, 100]
    assert dates[1]["owner"] == "Spouse"
