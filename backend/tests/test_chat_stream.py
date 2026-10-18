import json
from types import SimpleNamespace

import anthropic
import pytest
from anthropic.types import CitationsWebSearchResultLocation, Message, TextBlock, ToolUseBlock, Usage

from app.api.chat import get_llm
from app.core.config import settings
from app.main import app

USER = {"email": "me@example.com", "password": "correct-horse", "full_name": "Test User"}


def msg(content, stop="end_turn"):
    return Message(id="m", content=content, model="f", role="assistant", stop_reason=stop, type="message", usage=Usage(input_tokens=1, output_tokens=1))


def text_events(*chunks):
    return [SimpleNamespace(type="text", text=c, snapshot="") for c in chunks]


class FakeStream:
    def __init__(self, events, final, fail=None):
        self.events, self.final, self.fail = events, final, fail

    async def __aenter__(self):
        return self

    async def __aexit__(self, *a):
        return False

    def __aiter__(self):
        async def gen():
            for e in self.events:
                yield e
            if self.fail:
                raise self.fail
        return gen()

    async def get_final_message(self):
        return self.final


class FakeLLM:
    def __init__(self, *streams):
        self.streams = list(streams)
        self.messages = self
        self.calls = []

    def stream(self, **kw):
        self.calls.append({**kw, "messages": list(kw["messages"])})
        return self.streams.pop(0)


def login(client):
    client.cookies.clear()
    client.post("/api/auth/signup", json=USER)


def install(*streams):
    fake = FakeLLM(*streams)
    app.dependency_overrides[get_llm] = lambda: fake
    return fake


def sse(resp):
    return [json.loads(chunk[6:]) for chunk in resp.text.split("\n\n") if chunk.startswith("data: ")]


def test_streams_text_then_done_and_saves(client):
    login(client)
    install(FakeStream(text_events("Hel", "lo ", "there"), msg([TextBlock(type="text", text="Hello there")])))
    r = client.post("/api/chat/stream", json={"message": "hi"})
    assert r.headers["content-type"].startswith("text/event-stream")
    events = sse(r)
    assert [e["delta"] for e in events if e["type"] == "text"] == ["Hel", "lo ", "there"]
    assert events[-1] == {"type": "done", "reply": "Hello there", "citations": [], "actions": []}
    assert [m["role"] for m in client.get("/api/chat/messages").json()] == ["user", "assistant"]


def test_tool_use_sends_status_and_reset_and_actions(client):
    login(client)
    install(
        FakeStream(text_events("Let me create that. "),
                   msg([ToolUseBlock(type="tool_use", id="t1", name="create_plan", input={"plan_id": "ssn"})], stop="tool_use")),
        FakeStream(text_events("Done!"), msg([TextBlock(type="text", text="Done!")])),
    )
    events = sse(client.post("/api/chat/stream", json={"message": "make a plan for my SSN"}))
    types = [e["type"] for e in events]
    assert types == ["text", "status", "reset", "text", "done"]
    assert events[1]["text"] == "Creating your plan…"
    assert events[-1]["reply"] == "Done!" and events[-1]["actions"][0]["type"] == "plan"
    assert len(client.get("/api/goals").json()) == 1


def test_web_search_shows_status_and_citations(client):
    login(client)
    cite = CitationsWebSearchResultLocation(type="web_search_result_location", cited_text="x", encrypted_index="e", title="USCIS I-765", url="https://www.uscis.gov/i-765")
    search_start = SimpleNamespace(type="content_block_start", content_block=SimpleNamespace(type="server_tool_use"))
    install(FakeStream([search_start, *text_events("File I-765.")], msg([TextBlock(type="text", text="File I-765.", citations=[cite])])))
    events = sse(client.post("/api/chat/stream", json={"message": "how do I get an EAD?"}))
    assert {"type": "status", "text": "Searching official sources…"} in events
    assert events[-1]["citations"] == [{"title": "USCIS I-765", "url": "https://www.uscis.gov/i-765"}]


def test_error_mid_stream_is_reported_and_nothing_saved(client):
    login(client)
    err = anthropic.APIConnectionError(request=SimpleNamespace())
    install(FakeStream(text_events("Part"), msg([TextBlock(type="text", text="x")]), fail=err))
    events = sse(client.post("/api/chat/stream", json={"message": "hi"}))
    assert events[-1]["type"] == "error" and "could not answer" in events[-1]["message"]
    assert client.get("/api/chat/messages").json() == []


def test_checks_happen_before_streaming(client, monkeypatch):
    assert client.post("/api/chat/stream", json={"message": "hi"}).status_code == 401
    login(client)
    app.dependency_overrides[get_llm] = lambda: None
    assert client.post("/api/chat/stream", json={"message": "hi"}).status_code == 503
    monkeypatch.setattr(settings, "chat_daily_limit", 0)
    install()
    assert client.post("/api/chat/stream", json={"message": "hi"}).status_code == 429
    assert client.post("/api/chat/stream", json={"message": ""}).status_code == 422
