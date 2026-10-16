from datetime import date, timedelta

from anthropic.types import Message, TextBlock, ToolUseBlock, Usage

from app.api.chat import get_llm
from app.main import app

USER = {"email": "me@example.com", "password": "correct-horse", "full_name": "Test User"}
OTHER = {"email": "other@example.com", "password": "correct-horse", "full_name": "Other"}
CASE = {"receipt_number": "EAC2190000001", "form_type": "I-765", "label": "H-4 EAD renewal", "filed_date": "2026-09-01"}


def login(client, user=USER):
    client.cookies.clear()
    client.post("/api/auth/signup", json=user)


def test_requires_login(client):
    assert client.get("/api/cases").status_code == 401


def test_add_normalizes_receipt_and_starts_history(client):
    login(client)
    r = client.post("/api/cases", json={**CASE, "receipt_number": "eac-2190 000001"})
    assert r.status_code == 201
    c = r.json()
    assert c["receipt_number"] == "EAC2190000001" and c["stage"] == "received" and c["closed"] is False
    assert len(c["history"]) == 1


def test_invalid_receipt_rejected(client):
    login(client)
    for bad in ["12345", "EAC123", "EAC21900000012", "1234567890123"]:
        assert client.post("/api/cases", json={**CASE, "receipt_number": bad}).status_code == 422


def test_duplicate_receipt_rejected(client):
    login(client)
    client.post("/api/cases", json=CASE)
    assert client.post("/api/cases", json={**CASE, "receipt_number": "EAC 2190000001"}).status_code == 409


def test_same_receipt_allowed_for_different_users(client):
    login(client)
    client.post("/api/cases", json=CASE)
    login(client, OTHER)
    assert client.post("/api/cases", json=CASE).status_code == 201


def test_stage_change_adds_history_but_notes_do_not(client):
    login(client)
    cid = client.post("/api/cases", json=CASE).json()["id"]
    r = client.patch(f"/api/cases/{cid}", json={"notes": "called USCIS"}).json()
    assert len(r["history"]) == 1 and r["notes"] == "called USCIS"
    r = client.patch(f"/api/cases/{cid}", json={"stage": "in_review", "status_text": "Case Is Being Actively Reviewed"}).json()
    assert [h["stage"] for h in r["history"]] == ["received", "in_review"]
    r = client.patch(f"/api/cases/{cid}", json={"stage": "approved"}).json()
    assert r["closed"] is True and len(r["history"]) == 3


def test_open_cases_listed_first(client):
    login(client)
    a = client.post("/api/cases", json={**CASE, "receipt_number": "EAC2190000001"}).json()["id"]
    client.post("/api/cases", json={**CASE, "receipt_number": "EAC2190000002", "filed_date": "2026-10-01"})
    client.patch(f"/api/cases/{a}", json={"stage": "approved"})
    order = [c["receipt_number"] for c in client.get("/api/cases").json()]
    assert order == ["EAC2190000002", "EAC2190000001"]


def test_privacy_and_delete(client):
    login(client)
    cid = client.post("/api/cases", json=CASE).json()["id"]
    login(client, OTHER)
    assert client.get("/api/cases").json() == []
    assert client.patch(f"/api/cases/{cid}", json={"notes": "x"}).status_code == 404
    assert client.delete(f"/api/cases/{cid}").status_code == 404
    login(client)
    client.post("/api/auth/login", json={"email": USER["email"], "password": USER["password"]})
    assert client.delete(f"/api/cases/{cid}").status_code == 204
    assert client.get("/api/cases").json() == []


def test_rfe_deadline_shows_in_key_dates_and_reminders(client):
    login(client)
    cid = client.post("/api/cases", json=CASE).json()["id"]
    due = (date.today() + timedelta(days=20)).isoformat()
    client.patch(f"/api/cases/{cid}", json={"stage": "rfe", "rfe_due_date": due})
    kd = client.get("/api/key-dates").json()
    assert kd[0]["label"] == "RFE response due (I-765)" and kd[0]["days_left"] == 20
    items = client.post("/api/reminders/check").json()["items"]
    assert any("RFE response due (I-765) in 20 days" in n["title"] and n["link"] == "/cases" for n in items)
    # once the case is answered the deadline goes away
    client.patch(f"/api/cases/{cid}", json={"stage": "in_review"})
    assert client.get("/api/key-dates").json() == []


def test_assistant_can_read_cases(client):
    login(client)
    client.post("/api/cases", json=CASE)

    class Fake:
        def __init__(self):
            self.messages = self
            self.calls = []
            self.queue = [
                Message(id="1", content=[ToolUseBlock(type="tool_use", id="t1", name="get_my_cases", input={})], model="f", role="assistant", stop_reason="tool_use", type="message", usage=Usage(input_tokens=1, output_tokens=1)),
                Message(id="2", content=[TextBlock(type="text", text="Your I-765 was received.")], model="f", role="assistant", stop_reason="end_turn", type="message", usage=Usage(input_tokens=1, output_tokens=1)),
            ]

        async def create(self, **kw):
            self.calls.append({**kw, "messages": list(kw["messages"])})
            return self.queue.pop(0)

    fake = Fake()
    app.dependency_overrides[get_llm] = lambda: fake
    r = client.post("/api/chat", json={"message": "Where is my case?"}).json()
    assert r["reply"] == "Your I-765 was received."
    assert "EAC2190000001" in fake.calls[1]["messages"][-1]["content"][0]["content"]
