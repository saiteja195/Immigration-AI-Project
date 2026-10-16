from datetime import date, timedelta

from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, status

from app.api.auth import current_user
from app.core.db import get_db
from app.models.user import UserOut
from app.models.workflow import (GoalIn, GoalOut, TaskIn, TaskOut, TaskUpdate, Workflow,
                                 WorkflowSummary)
from app.services.workflows import get_workflow, load_all

router = APIRouter(tags=["tasks"])


def _oid(value: str) -> ObjectId:
    if not ObjectId.is_valid(value):
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Not found")
    return ObjectId(value)


def _task_out(doc) -> TaskOut:
    return TaskOut(id=str(doc["_id"]), **{k: v for k, v in doc.items() if k not in ("_id", "user_id", "order")})


async def _goal_out(db, doc) -> GoalOut:
    gid = str(doc["_id"])
    total = await db.tasks.count_documents({"goal_id": gid})
    completed = await db.tasks.count_documents({"goal_id": gid, "done": True})
    return GoalOut(id=gid, workflow_id=doc["workflow_id"], title=doc["title"], total=total, completed=completed)


@router.get("/workflows", response_model=list[WorkflowSummary])
async def list_workflows(user: UserOut = Depends(current_user), db=Depends(get_db)):
    profile = await db.profiles.find_one({"user_id": user.id})
    visa = profile["visa_type"] if profile else None
    return [
        WorkflowSummary(**wf.model_dump(), recommended=visa in wf.applies_to)
        for wf in load_all().values()
    ]


@router.get("/workflows/{workflow_id}", response_model=Workflow)
async def workflow_detail(workflow_id: str, _: UserOut = Depends(current_user)):
    wf = get_workflow(workflow_id)
    if not wf:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Unknown workflow")
    return wf


@router.post("/goals", response_model=GoalOut, status_code=status.HTTP_201_CREATED)
async def create_goal(body: GoalIn, user: UserOut = Depends(current_user), db=Depends(get_db)):
    wf = get_workflow(body.workflow_id)
    if not wf:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Unknown workflow")
    if await db.goals.find_one({"user_id": user.id, "workflow_id": wf.id}):
        raise HTTPException(status.HTTP_409_CONFLICT, "You already have this goal")
    start = body.start_date or date.today()
    goal = {"user_id": user.id, "workflow_id": wf.id, "title": wf.title}
    gid = str((await db.goals.insert_one(goal)).inserted_id)
    tasks = [
        {
            "user_id": user.id, "goal_id": gid, "order": i,
            "title": s.title, "details": s.details, "required_docs": s.required_docs,
            "due_date": (start + timedelta(days=s.due_in_days)).isoformat(),
            "done": False, "notes": "",
        }
        for i, s in enumerate(wf.steps)
    ]
    await db.tasks.insert_many(tasks)
    return GoalOut(id=gid, workflow_id=wf.id, title=wf.title, total=len(tasks), completed=0)


@router.get("/goals", response_model=list[GoalOut])
async def list_goals(user: UserOut = Depends(current_user), db=Depends(get_db)):
    docs = await db.goals.find({"user_id": user.id}).to_list(100)
    return [await _goal_out(db, d) for d in docs]


@router.delete("/goals/{goal_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_goal(goal_id: str, user: UserOut = Depends(current_user), db=Depends(get_db)):
    result = await db.goals.delete_one({"_id": _oid(goal_id), "user_id": user.id})
    if result.deleted_count == 0:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Not found")
    await db.tasks.delete_many({"goal_id": goal_id, "user_id": user.id})


@router.get("/tasks", response_model=list[TaskOut])
async def list_tasks(goal_id: str | None = None, user: UserOut = Depends(current_user), db=Depends(get_db)):
    query = {"user_id": user.id}
    if goal_id:
        query["goal_id"] = goal_id
    docs = await db.tasks.find(query).sort([("order", 1)]).to_list(500)
    return [_task_out(d) for d in docs]


@router.post("/tasks", response_model=TaskOut, status_code=status.HTTP_201_CREATED)
async def add_task(body: TaskIn, user: UserOut = Depends(current_user), db=Depends(get_db)):
    doc = {
        "user_id": user.id, "goal_id": None, "order": 0, "done": False, "notes": "",
        "required_docs": [], **body.model_dump(mode="json"),
    }
    doc["_id"] = (await db.tasks.insert_one(doc)).inserted_id
    return _task_out(doc)


@router.patch("/tasks/{task_id}", response_model=TaskOut)
async def update_task(task_id: str, body: TaskUpdate, user: UserOut = Depends(current_user), db=Depends(get_db)):
    changes = body.model_dump(mode="json", exclude_unset=True)
    query = {"_id": _oid(task_id), "user_id": user.id}
    if changes:
        await db.tasks.update_one(query, {"$set": changes})
    doc = await db.tasks.find_one(query)
    if not doc:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Not found")
    return _task_out(doc)


@router.delete("/tasks/{task_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_task(task_id: str, user: UserOut = Depends(current_user), db=Depends(get_db)):
    result = await db.tasks.delete_one({"_id": _oid(task_id), "user_id": user.id})
    if result.deleted_count == 0:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Not found")
