import asyncio

from scripts import seed_demo


def test_seed_creates_a_working_demo_account(client, db):
    assert asyncio.run(seed_demo.seed(db)) is not None
    r = client.post("/api/auth/login", json={"email": seed_demo.EMAIL, "password": seed_demo.PASSWORD})
    assert r.status_code == 200
    assert client.get("/api/profile").json()["visa_type"] == "H-1B"
    assert len(client.get("/api/goals").json()) == 2
    assert len(client.get("/api/cases").json()) == 2
    assert len(client.get("/api/dependents").json()) == 1
    done = [t for t in client.get("/api/tasks").json() if t["done"]]
    assert len(done) == 3
    labels = [k["label"] for k in client.get("/api/key-dates").json()]
    assert "RFE response due (I-765)" in labels


def test_seed_is_idempotent_and_reset_recreates(client, db):
    assert asyncio.run(seed_demo.seed(db)) is not None
    assert asyncio.run(seed_demo.seed(db)) is None  # already there
    asyncio.run(seed_demo.reset(db))
    assert asyncio.run(db.tasks.count_documents({})) == 0
    assert asyncio.run(seed_demo.seed(db)) is not None
    assert asyncio.run(db.users.count_documents({})) == 1
