import json

import pytest
from anthropic.types import CitationsWebSearchResultLocation, Message, TextBlock, ToolUseBlock, Usage

from app.api.chat import get_llm
from app.core.config import settings
from app.main import app

USER = {"email": "me@example.com", "password": "correct-horse", "full_name": "Test User"}
OTHER = {"email": "other@example.com", "password": "correct-horse", "full_name": "Other"}


def msg(content, stop="end_turn"):
    return Message(id="m1", content=content, model="fake", role="assistant", stop_reason=stop,
                   type="message", usage=Usage(input_tokens=1, output_tokens=1))


def text(t, citations=None):
    return TextBlock(type="text", text=t, citations=citations)


class FakeLLM:
    """Returns scripted responses and records every request."""

    def __init__(self, *responses):
        self.responses = list(responses)
        self.calls = []
        self.messages = self

    async def create(self, **kwargs):
        self.calls.append(json.loads(json.dumps(kwargs, default=str)))
        return self.responses.pop(0)


@pytest.fixture
def llm(client):
    def install(*responses):
        fake = FakeLLM(*responses)
        app.dependency_overrides[get_llm] = lambda: fake
        return fake
    return install


def login(client, user=USER):
    client.cookies.clear()
    client.post("/api/auth/signup", json=user)


def test_disabled_without_key(client):
    login(client)
    app.dependency_overrides[get_llm] = lambda: None
    assert client.get("/api/chat/status").json() == {"enabled": False}
    assert client.post("/api/chat", json={"message": "hi"}).status_code == 503


def test_requires_login(client):
    assert client.post("/api/chat", json={"message": "hi"}).status_code == 401


def test_simple_reply_is_saved_and_listed(client, llm):
    login(client)
    fake = llm(msg([text("Hello! How can I help?")]))
    r = client.post("/api/chat", json={"message": "hi"})
    assert r.status_code == 200 and r.json()["reply"] == "Hello! How can I help?"
    hist = client.get("/api/chat/messages").json()
    assert [m["role"] for m in hist] == ["user", "assistant"]
    # web search is limited to official domains
    tools = {t["name"]: t for t in fake.calls[0]["tools"]}
    assert "uscis.gov" in tools["web_search"]["allowed_domains"]


def test_citations_are_returned(client, llm):
    login(client)
    cite = CitationsWebSearchResultLocation(type="web_search_result_location", cited_text="x", encrypted_index="e",
                                            title="USCIS I-765", url="https://www.uscis.gov/i-765")
    llm(msg([text("File Form I-765.", [cite])]))
    r = client.post("/api/chat", json={"message": "How do I get an EAD?"}).json()
    assert r["citations"] == [{"title": "USCIS I-765", "url": "https://www.uscis.gov/i-765"}]
    assert client.get("/api/chat/messages").json()[1]["citations"][0]["url"] == "https://www.uscis.gov/i-765"


def test_tool_loop_reads_profile(client, llm):
    login(client)
    client.put("/api/profile", json={"visa_type": "H-1B", "i94_expiry": "2030-01-01"})
    fake = llm(
        msg([ToolUseBlock(type="tool_use", id="t1", name="get_my_profile", input={})], stop="tool_use"),
        msg([text("You are on H-1B.")]),
    )
    r = client.post("/api/chat", json={"message": "What is my status?"}).json()
    assert r["reply"] == "You are on H-1B."
    tool_result = fake.calls[1]["messages"][-1]["content"][0]
    assert tool_result["tool_use_id"] == "t1" and "H-1B" in tool_result["content"]


def test_assistant_can_create_plan_and_task(client, llm):
    login(client)
    llm(
        msg([ToolUseBlock(type="tool_use", id="t1", name="create_plan", input={"plan_id": "ssn"}),
             ToolUseBlock(type="tool_use", id="t2", name="add_task", input={"title": "Renew passport", "due_date": "2027-01-01"})],
            stop="tool_use"),
        msg([text("Done, I created both.")]),
    )
    r = client.post("/api/chat", json={"message": "Make a plan for my SSN and remind me to renew my passport"}).json()
    assert {(a["type"], a["title"]) for a in r["actions"]} == {("plan", "Apply for a Social Security Number"), ("task", "Renew passport")}
    assert len(client.get("/api/goals").json()) == 1
    assert "Renew passport" in [t["title"] for t in client.get("/api/tasks").json()]


def test_duplicate_plan_is_reported_not_crashed(client, llm):
    login(client)
    client.post("/api/goals", json={"workflow_id": "ssn"})
    fake = llm(
        msg([ToolUseBlock(type="tool_use", id="t1", name="create_plan", input={"plan_id": "ssn"})], stop="tool_use"),
        msg([text("You already have that plan.")]),
    )
    r = client.post("/api/chat", json={"message": "plan for ssn"}).json()
    assert r["actions"] == []
    assert "already" in fake.calls[1]["messages"][-1]["content"][0]["content"]


def test_daily_limit(client, llm, monkeypatch):
    login(client)
    monkeypatch.setattr(settings, "chat_daily_limit", 1)
    llm(msg([text("one")]), msg([text("two")]))
    assert client.post("/api/chat", json={"message": "a"}).status_code == 200
    assert client.post("/api/chat", json={"message": "b"}).status_code == 429


def test_history_is_private_and_clearable(client, llm):
    login(client)
    llm(msg([text("secret answer")]))
    client.post("/api/chat", json={"message": "private"})
    login(client, OTHER)
    assert client.get("/api/chat/messages").json() == []
    login(client)
    client.post("/api/auth/login", json={"email": USER["email"], "password": USER["password"]})
    assert len(client.get("/api/chat/messages").json()) == 2
    assert client.delete("/api/chat").status_code == 204
    assert client.get("/api/chat/messages").json() == []


def test_empty_message_rejected(client, llm):
    login(client)
    llm(msg([text("x")]))
    assert client.post("/api/chat", json={"message": ""}).status_code == 422
