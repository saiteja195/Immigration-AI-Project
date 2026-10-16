from datetime import date, timedelta

from app.services.workflows import get_workflow


class GoalError(Exception):
    """Raised for user-facing problems, e.g. unknown plan or duplicate goal."""

    def __init__(self, message: str, code: str):
        super().__init__(message)
        self.code = code  # "not_found" | "duplicate"


async def create_goal(db, user_id: str, workflow_id: str, start: date | None = None) -> dict:
    wf = get_workflow(workflow_id)
    if not wf:
        raise GoalError("Unknown plan", "not_found")
    if await db.goals.find_one({"user_id": user_id, "workflow_id": wf.id}):
        raise GoalError("You already have this plan", "duplicate")
    start = start or date.today()
    gid = str((await db.goals.insert_one({"user_id": user_id, "workflow_id": wf.id, "title": wf.title})).inserted_id)
    tasks = [
        {
            "user_id": user_id, "goal_id": gid, "order": i,
            "title": s.title, "details": s.details, "required_docs": s.required_docs,
            "due_date": (start + timedelta(days=s.due_in_days)).isoformat(),
            "done": False, "notes": "",
        }
        for i, s in enumerate(wf.steps)
    ]
    await db.tasks.insert_many(tasks)
    return {"id": gid, "workflow_id": wf.id, "title": wf.title, "total": len(tasks), "completed": 0}


async def add_task(db, user_id: str, title: str, due: date | None = None, details: str = "") -> dict:
    doc = {
        "user_id": user_id, "goal_id": None, "order": 0, "done": False, "notes": "",
        "required_docs": [], "title": title, "details": details,
        "due_date": due.isoformat() if due else None,
    }
    doc["_id"] = (await db.tasks.insert_one(doc)).inserted_id
    return doc
