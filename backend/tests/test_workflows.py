from app.services.visas import visa_codes
from app.services.workflows import load_all

USER = {"email": "me@example.com", "password": "correct-horse", "full_name": "Test User"}
OTHER = {"email": "other@example.com", "password": "correct-horse", "full_name": "Other"}


def login(client, user=USER):
    client.cookies.clear()
    client.post("/api/auth/signup", json=user)


def test_all_templates_are_valid():
    visas = set(visa_codes())
    workflows = load_all()
    assert len(workflows) >= 8
    for wf in workflows.values():
        assert wf.steps and wf.sources, wf.id
        assert set(wf.applies_to) <= visas, wf.id
        days = [s.due_in_days for s in wf.steps]
        assert days == sorted(days), f"{wf.id} steps out of order"


def test_workflows_mark_recommended(client):
    login(client)
    client.put("/api/profile", json={"visa_type": "H-4"})
    rec = {w["id"] for w in client.get("/api/workflows").json() if w["recommended"]}
    assert "h4_ead" in rec and "f1_opt" not in rec


def test_create_goal_makes_tasks_with_due_dates(client):
    login(client)
    r = client.post("/api/goals", json={"workflow_id": "drivers_license", "start_date": "2027-01-01"})
    assert r.status_code == 201
    goal = r.json()
    tasks = client.get("/api/tasks", params={"goal_id": goal["id"]}).json()
    assert len(tasks) == goal["total"] > 3
    assert tasks[0]["due_date"] == "2027-01-01"
    assert tasks[0]["done"] is False


def test_duplicate_goal_rejected(client):
    login(client)
    client.post("/api/goals", json={"workflow_id": "ssn"})
    assert client.post("/api/goals", json={"workflow_id": "ssn"}).status_code == 409


def test_unknown_workflow(client):
    login(client)
    assert client.post("/api/goals", json={"workflow_id": "nope"}).status_code == 404


def test_tick_task_updates_progress(client):
    login(client)
    gid = client.post("/api/goals", json={"workflow_id": "ssn"}).json()["id"]
    tid = client.get("/api/tasks", params={"goal_id": gid}).json()[0]["id"]
    r = client.patch(f"/api/tasks/{tid}", json={"done": True, "notes": "called SSA"})
    assert r.json()["done"] is True and r.json()["notes"] == "called SSA"
    assert client.get("/api/goals").json()[0]["completed"] == 1


def test_custom_task_and_delete_goal(client):
    login(client)
    t = client.post("/api/tasks", json={"title": "Renew passport", "due_date": "2027-03-01"})
    assert t.status_code == 201
    gid = client.post("/api/goals", json={"workflow_id": "ssn"}).json()["id"]
    assert client.delete(f"/api/goals/{gid}").status_code == 204
    titles = [x["title"] for x in client.get("/api/tasks").json()]
    assert titles == ["Renew passport"]


def test_cannot_touch_other_users_tasks(client):
    login(client)
    gid = client.post("/api/goals", json={"workflow_id": "ssn"}).json()["id"]
    tid = client.get("/api/tasks", params={"goal_id": gid}).json()[0]["id"]
    login(client, OTHER)
    assert client.patch(f"/api/tasks/{tid}", json={"done": True}).status_code == 404
    assert client.delete(f"/api/goals/{gid}").status_code == 404
    assert client.get("/api/tasks").json() == []
