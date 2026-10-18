import { afterEach, describe, expect, it, vi } from "vitest";
import { api, ApiError, streamEvents } from "./api";
import { jsonResponse, mockFetch } from "@/test/helpers";

afterEach(() => vi.unstubAllGlobals());

describe("api", () => {
  it("returns JSON and sends credentials", async () => {
    const fetchMock = mockFetch(() => jsonResponse(200, { ok: true }));
    expect(await api.get("/ping")).toEqual({ ok: true });
    expect(fetchMock).toHaveBeenCalledWith("/api/ping", expect.objectContaining({ credentials: "include", method: "GET" }));
  });

  it("returns nothing for 204", async () => {
    mockFetch(() => new Response(null, { status: 204 }));
    expect(await api.del("/things/1")).toBeUndefined();
  });

  it("uses the server's message for errors", async () => {
    mockFetch(() => jsonResponse(401, { detail: "Wrong email or password" }));
    await expect(api.post("/auth/login", {})).rejects.toMatchObject({ status: 401, message: "Wrong email or password" });
  });

  it("gives a simple message for form validation errors", async () => {
    mockFetch(() => jsonResponse(422, { detail: [{ loc: ["body", "email"], msg: "bad" }] }));
    await expect(api.post("/x", {})).rejects.toThrow("Please check the form fields.");
  });

  it("sends JSON bodies with a content type, and form data without one", async () => {
    const fetchMock = mockFetch(() => jsonResponse(200, {}));
    await api.post("/a", { n: 1 });
    expect(fetchMock.mock.calls[0][1]).toMatchObject({ headers: { "Content-Type": "application/json" }, body: '{"n":1}' });
    const form = new FormData();
    form.append("kind", "passport");
    await api.upload("/documents", form);
    const init = fetchMock.mock.calls[1][1] as RequestInit;
    expect(init.body).toBe(form);
    expect(init.headers).toBeUndefined(); // the browser sets the multipart boundary itself
  });
});

describe("streamEvents", () => {
  const sseResponse = (chunks: string[]) =>
    new Response(new ReadableStream({ start(c) { chunks.forEach((x) => c.enqueue(new TextEncoder().encode(x))); c.close(); } }), { status: 200 });

  it("parses events even when they are split across chunks", async () => {
    mockFetch(() => sseResponse(['data: {"type":"text","delta":"Hel', 'lo"}\n\ndata: {"type":"status","text":"Checking…"}\n\n', 'data: {"type":"done"}\n\n']));
    const seen: unknown[] = [];
    await streamEvents("/chat/stream", { message: "hi" }, (e) => seen.push(e));
    expect(seen).toEqual([{ type: "text", delta: "Hello" }, { type: "status", text: "Checking…" }, { type: "done" }]);
  });

  it("throws an ApiError when the request fails before streaming", async () => {
    mockFetch(() => jsonResponse(429, { detail: "Daily message limit reached." }));
    const err = await streamEvents("/chat/stream", { message: "hi" }, () => {}).catch((e) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect(err).toMatchObject({ status: 429, message: "Daily message limit reached." });
  });
});
