"""Tools the assistant can call to read the user's data and create plans/tasks."""
import json
from datetime import date

from app.services import goals as goal_service
from app.services.workflows import get_workflow, load_all

WEB_SEARCH_TOOL = {
    "type": "web_search_20250305",
    "name": "web_search",
    "max_uses": 4,
    # Official sources only, so answers stay grounded.
    "allowed_domains": [
        "uscis.gov", "travel.state.gov", "state.gov", "dol.gov", "dhs.gov",
        "ice.gov", "cbp.gov", "ssa.gov", "usa.gov", "irs.gov",
    ],
}

CUSTOM_TOOLS = [
    {
        "name": "get_my_profile",
        "description": "Get the user's visa type, key dates (with days left) and family members. Call this before answering anything about their own situation.",
        "input_schema": {"type": "object", "properties": {}},
    },
    {
        "name": "get_my_cases",
        "description": "List the USCIS cases (receipt numbers, form type, stage, latest status, RFE due date) the user is tracking.",
        "input_schema": {"type": "object", "properties": {}},
    },
    {
        "name": "get_my_tasks",
        "description": "List the user's open tasks with due dates.",
        "input_schema": {"type": "object", "properties": {}},
    },
    {
        "name": "list_plans",
        "description": "List the step-by-step plans (workflows) the app can create, e.g. F-1 OPT, H-4 EAD, driver's license.",
        "input_schema": {"type": "object", "properties": {}},
    },
    {
        "name": "get_plan_details",
        "description": "Get the steps, documents and sources for one plan.",
        "input_schema": {
            "type": "object",
            "properties": {"plan_id": {"type": "string"}},
            "required": ["plan_id"],
        },
    },
    {
        "name": "create_plan",
        "description": "Create a plan with dated tasks for the user. Only call this after the user clearly asks for it or agrees.",
        "input_schema": {
            "type": "object",
            "properties": {
                "plan_id": {"type": "string"},
                "start_date": {"type": "string", "description": "YYYY-MM-DD, defaults to today"},
            },
            "required": ["plan_id"],
        },
    },
    {
        "name": "add_task",
        "description": "Add one custom task for the user. Only call this after the user asks for it or agrees.",
        "input_schema": {
            "type": "object",
            "properties": {
                "title": {"type": "string"},
                "due_date": {"type": "string", "description": "YYYY-MM-DD, optional"},
            },
            "required": ["title"],
        },
    },
]

TOOLS = [WEB_SEARCH_TOOL, *CUSTOM_TOOLS]


def _parse_date(value) -> date | None:
    if not value:
        return None
    try:
        return date.fromisoformat(value)
    except ValueError:
        return None


async def run_tool(db, user_id: str, name: str, args: dict) -> tuple[str, dict | None]:
    """Run one custom tool. Returns (text for the model, optional action for the UI)."""
    if name == "get_my_profile":
        profile = await db.profiles.find_one({"user_id": user_id}, {"_id": 0, "user_id": 0})
        deps = await db.dependents.find({"user_id": user_id}, {"_id": 0, "user_id": 0}).to_list(50)
        if not profile:
            return "The user has not filled in their profile yet.", None
        today = date.today()
        days = {
            k: (date.fromisoformat(v) - today).days
            for k, v in profile.items() if k.endswith(("_expiry", "_date")) and v
        }
        return json.dumps({"today": today.isoformat(), "profile": profile, "days_left": days, "family": deps}), None

    if name == "get_my_cases":
        cases = await db.cases.find({"user_id": user_id}, {"_id": 0, "user_id": 0}).to_list(50)
        return json.dumps(cases) if cases else "The user is not tracking any cases yet.", None

    if name == "get_my_tasks":
        tasks = await db.tasks.find({"user_id": user_id, "done": False}).sort([("due_date", 1)]).to_list(50)
        return json.dumps([{"title": t["title"], "due_date": t.get("due_date")} for t in tasks]), None

    if name == "list_plans":
        return json.dumps([
            {"id": w.id, "title": w.title, "topic": w.topic, "description": w.description, "applies_to": w.applies_to}
            for w in load_all().values()
        ]), None

    if name == "get_plan_details":
        wf = get_workflow(args.get("plan_id", ""))
        return (wf.model_dump_json() if wf else "Unknown plan id."), None

    if name == "create_plan":
        try:
            goal = await goal_service.create_goal(db, user_id, args.get("plan_id", ""), _parse_date(args.get("start_date")))
        except goal_service.GoalError as e:
            return f"Could not create the plan: {e}.", None
        return f"Created plan '{goal['title']}' with {goal['total']} tasks.", {"type": "plan", "title": goal["title"]}

    if name == "add_task":
        title = (args.get("title") or "").strip()[:200]
        if not title:
            return "A task title is required.", None
        await goal_service.add_task(db, user_id, title, _parse_date(args.get("due_date")))
        return f"Added task '{title}'.", {"type": "task", "title": title}

    return f"Unknown tool: {name}", None
