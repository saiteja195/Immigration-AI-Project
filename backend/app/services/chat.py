from collections.abc import AsyncIterator
from dataclasses import dataclass, field

from app.services.chat_tools import TOOLS, run_tool

SYSTEM_PROMPT = """You are Immigration AI, an assistant that helps people on US visas (mainly Indian nationals on F-1, OPT/STEM OPT, F-2, H-1B, H-4, H-4 EAD, and green card processes) understand their status and next steps.

Rules:
- Be grounded. For anything that can change (fees, processing times, rules, dates, forms), search the web first and rely on official government sources. Cite what you used.
- Never invent dates, receipt numbers, fees or rules. If you are not sure, say so and point to the official source.
- For questions about the user's own situation, call get_my_profile first, and use today's date from it.
- You may create plans or tasks with the tools, but only after the user asks or agrees. Say what you created.
- You are not a lawyer. For case-specific or risky decisions (status violations, denials, travel with pending cases), tell them to confirm with their DSO or an immigration attorney.
- Keep answers short, in simple words. Use short lists when helpful."""

MAX_STEPS = 6


@dataclass
class ChatResult:
    reply: str = ""
    citations: list[dict] = field(default_factory=list)
    actions: list[dict] = field(default_factory=list)


def _dump(block) -> dict:
    return block.model_dump(mode="json", exclude_none=True)


STATUS_TEXT = {
    "get_my_profile": "Checking your profile…",
    "get_my_tasks": "Checking your tasks…",
    "get_my_cases": "Checking your cases…",
    "list_plans": "Looking at plans…",
    "get_plan_details": "Looking at plans…",
    "create_plan": "Creating your plan…",
    "add_task": "Adding a task…",
    "search_my_documents": "Searching your documents…",
}
SEARCH_STATUS = "Searching official sources…"


def _collect(resp, result: ChatResult, seen_urls: set[str]) -> None:
    """Take the answer text and citations out of one model response."""
    texts = []
    for block in resp.content:
        if block.type == "text":
            texts.append(block.text)
            for c in getattr(block, "citations", None) or []:
                url = getattr(c, "url", None)
                if url and url not in seen_urls:
                    seen_urls.add(url)
                    result.citations.append({"title": getattr(c, "title", None) or url, "url": url})
    if texts:
        result.reply = "".join(texts).strip()


async def _run_tools(db, user_id: str, resp, result: ChatResult) -> list[dict]:
    tool_results = []
    for block in resp.content:
        if block.type == "tool_use":
            output, action = await run_tool(db, user_id, block.name, block.input or {})
            if action:
                result.actions.append(action)
            tool_results.append({"type": "tool_result", "tool_use_id": block.id, "content": output})
    return tool_results


async def run_chat(client, db, user_id: str, history: list[dict], message: str, model: str, max_tokens: int) -> ChatResult:
    messages = [*history, {"role": "user", "content": message}]
    result = ChatResult()
    seen_urls: set[str] = set()

    for _ in range(MAX_STEPS):
        resp = await client.messages.create(
            model=model, max_tokens=max_tokens, system=SYSTEM_PROMPT, tools=TOOLS, messages=messages,
        )
        messages.append({"role": "assistant", "content": [_dump(b) for b in resp.content]})
        _collect(resp, result, seen_urls)

        if resp.stop_reason == "tool_use":
            messages.append({"role": "user", "content": await _run_tools(db, user_id, resp, result)})
            continue
        if resp.stop_reason == "pause_turn":
            continue  # server-side search paused; send it back to continue
        break

    if not result.reply:
        result.reply = "Sorry, I could not put together an answer. Please try asking again."
    return result


async def stream_chat(client, db, user_id: str, history: list[dict], message: str, model: str, max_tokens: int) -> AsyncIterator[dict]:
    """Same as run_chat, but yields events as they happen:
    {"type": "text", "delta"}, {"type": "status", "text"}, {"type": "reset"} (clear text shown so far),
    and finally {"type": "done", "result": ChatResult}."""
    messages = [*history, {"role": "user", "content": message}]
    result = ChatResult()
    seen_urls: set[str] = set()

    for _ in range(MAX_STEPS):
        async with client.messages.stream(
            model=model, max_tokens=max_tokens, system=SYSTEM_PROMPT, tools=TOOLS, messages=messages,
        ) as stream:
            async for event in stream:
                kind = getattr(event, "type", None)
                if kind == "text":
                    yield {"type": "text", "delta": event.text}
                elif kind == "content_block_start" and getattr(event.content_block, "type", None) == "server_tool_use":
                    yield {"type": "status", "text": SEARCH_STATUS}
            resp = await stream.get_final_message()
        messages.append({"role": "assistant", "content": [_dump(b) for b in resp.content]})
        _collect(resp, result, seen_urls)

        if resp.stop_reason == "tool_use":
            for block in resp.content:
                if block.type == "tool_use":
                    yield {"type": "status", "text": STATUS_TEXT.get(block.name, "Working…")}
            messages.append({"role": "user", "content": await _run_tools(db, user_id, resp, result)})
            yield {"type": "reset"}
            continue
        if resp.stop_reason == "pause_turn":
            continue
        break

    if not result.reply:
        result.reply = "Sorry, I could not put together an answer. Please try asking again."
    yield {"type": "done", "result": result}
