import asyncio

import pytest
from anthropic.types import Message, TextBlock, ToolUseBlock, Usage
from cryptography.fernet import Fernet

from app.api.chat import get_llm
from app.core.config import settings
from app.main import app

USER = {"email": "me@example.com", "password": "correct-horse", "full_name": "Test User"}
OTHER = {"email": "other@example.com", "password": "correct-horse", "full_name": "Other"}
PNG = b"\x89PNG\r\n\x1a\n" + b"0" * 64


def make_pdf(text: str) -> bytes:
    stream = f"BT /F1 12 Tf 72 720 Td ({text}) Tj ET"
    objs = ["<< /Type /Catalog /Pages 2 0 R >>", "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
            "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>",
            f"<< /Length {len(stream)} >>\nstream\n{stream}\nendstream", "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>"]
    out, offs = b"%PDF-1.4\n", []
    for i, o in enumerate(objs, 1):
        offs.append(len(out))
        out += f"{i} 0 obj\n{o}\nendobj\n".encode()
    x = len(out)
    out += f"xref\n0 {len(objs) + 1}\n0000000000 65535 f \n".encode()
    for o in offs:
        out += f"{o:010d} 00000 n \n".encode()
    return out + f"trailer\n<< /Size {len(objs) + 1} /Root 1 0 R >>\nstartxref\n{x}\n%%EOF".encode()


@pytest.fixture(autouse=True)
def vault_key(monkeypatch):
    monkeypatch.setattr(settings, "encryption_key", Fernet.generate_key().decode())


def login(client, user=USER):
    client.cookies.clear()
    client.post("/api/auth/signup", json=user)


def upload(client, data=PNG, name="scan.png", kind="passport"):
    return client.post("/api/documents", files={"file": (name, data)}, data={"kind": kind})


def test_disabled_without_key(client, monkeypatch):
    login(client)
    monkeypatch.setattr(settings, "encryption_key", "")
    assert client.get("/api/documents/status").json()["enabled"] is False
    assert upload(client).status_code == 503


def test_requires_login(client):
    assert client.get("/api/documents").status_code == 401


def test_upload_list_download_roundtrip_and_encrypted_at_rest(client, db):
    login(client)
    r = upload(client)
    assert r.status_code == 201
    doc = r.json()
    assert doc["content_type"] == "image/png" and doc["size"] == len(PNG) and doc["has_text"] is False
    assert [d["id"] for d in client.get("/api/documents").json()] == [doc["id"]]
    stored = asyncio.run(db.documents.find_one({}))
    assert PNG not in stored["data"] and stored["data"] != PNG  # not plain text in the database
    dl = client.get(f"/api/documents/{doc['id']}/download")
    assert dl.content == PNG and dl.headers["content-type"] == "image/png"
    assert "attachment" in dl.headers["content-disposition"] and dl.headers["x-content-type-options"] == "nosniff"


def test_type_is_checked_by_content_not_name(client):
    login(client)
    assert upload(client, b"MZ\x90\x00 not an image", name="evil.png").status_code == 415
    assert upload(client, b"<html><script>alert(1)</script>", name="a.pdf").status_code == 415
    assert upload(client, make_pdf("hello"), name="liar.png").json()["content_type"] == "application/pdf"


def test_size_and_count_limits(client, monkeypatch):
    login(client)
    monkeypatch.setattr(settings, "max_upload_mb", 1)
    assert upload(client, PNG + b"0" * (1024 * 1024)).status_code == 413
    assert upload(client, b"").status_code == 422
    monkeypatch.setattr(settings, "max_documents_per_user", 1)
    assert upload(client).status_code == 201
    assert upload(client).status_code == 409


def test_bad_kind_and_filename_are_cleaned(client):
    login(client)
    assert upload(client, kind="secret").status_code == 422
    r = upload(client, name="../../etc/pass wd?.png")
    assert "/" not in r.json()["name"] and ".." not in r.json()["name"].replace("._", "")


def test_pdf_text_is_extracted(client):
    login(client)
    r = upload(client, make_pdf("Passport expiry 2030"), name="p.pdf")
    assert r.json()["has_text"] is True


def test_documents_are_private_and_deletable(client):
    login(client)
    doc_id = upload(client).json()["id"]
    login(client, OTHER)
    assert client.get("/api/documents").json() == []
    assert client.get(f"/api/documents/{doc_id}/download").status_code == 404
    assert client.delete(f"/api/documents/{doc_id}").status_code == 404
    login(client)
    client.post("/api/auth/login", json={"email": USER["email"], "password": USER["password"]})
    assert client.delete(f"/api/documents/{doc_id}").status_code == 204
    assert client.get("/api/documents").json() == []


def test_assistant_access_setting_defaults_off(client):
    login(client)
    assert client.get("/api/documents/status").json()["assistant_access"] is False
    assert client.put("/api/documents/settings", json={"assistant_access": True}).json()["assistant_access"] is True


# ---- assistant tool ----

def msg(content, stop="end_turn"):
    return Message(id="m", content=content, model="f", role="assistant", stop_reason=stop, type="message", usage=Usage(input_tokens=1, output_tokens=1))


class Fake:
    def __init__(self, query):
        self.messages = self
        self.calls = []
        self.queue = [msg([ToolUseBlock(type="tool_use", id="t1", name="search_my_documents", input={"query": query})], "tool_use"),
                      msg([TextBlock(type="text", text="ok")])]

    async def create(self, **kw):
        self.calls.append({**kw, "messages": list(kw["messages"])})
        return self.queue.pop(0)


def ask(client, query):
    fake = Fake(query)
    app.dependency_overrides[get_llm] = lambda: fake
    client.post("/api/chat", json={"message": "what does my document say?"})
    return fake.calls[1]["messages"][-1]["content"][0]["content"]


def test_assistant_cannot_read_documents_until_allowed(client):
    login(client)
    upload(client, make_pdf("Receipt number EAC2190000001 approved"), name="i797.pdf", kind="i797")
    assert "not allowed" in ask(client, "receipt number")


def test_assistant_finds_text_when_allowed(client):
    login(client)
    upload(client, make_pdf("Receipt number EAC2190000001 approved"), name="i797.pdf", kind="i797")
    client.put("/api/documents/settings", json={"assistant_access": True})
    result = ask(client, "receipt number")
    assert "EAC2190000001" in result and "i797.pdf" in result


def test_assistant_search_only_sees_own_documents(client):
    login(client)
    upload(client, make_pdf("Secret receipt EAC1111111111"), name="mine.pdf")
    login(client, OTHER)
    client.put("/api/documents/settings", json={"assistant_access": True})
    assert "No matching text" in ask(client, "receipt")
