from datetime import date
from typing import Literal

from pydantic import BaseModel, Field


class Source(BaseModel):
    name: str
    url: str


class Step(BaseModel):
    title: str
    details: str = ""
    due_in_days: int = Field(ge=0)
    required_docs: list[str] = []


TOPICS = ["work", "student", "family", "visitor", "green_card", "everyday"]


class Workflow(BaseModel):
    id: str
    title: str
    topic: Literal["work", "student", "family", "visitor", "green_card", "everyday"]
    description: str
    applies_to: list[str]
    last_verified: date
    sources: list[Source]
    steps: list[Step]


class WorkflowSummary(BaseModel):
    id: str
    title: str
    topic: str
    description: str
    applies_to: list[str]
    last_verified: date
    recommended: bool = False


class GoalIn(BaseModel):
    workflow_id: str
    start_date: date | None = None


class TaskIn(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    details: str = ""
    due_date: date | None = None


class TaskUpdate(BaseModel):
    done: bool | None = None
    notes: str | None = None
    due_date: date | None = None


class TaskOut(BaseModel):
    id: str
    goal_id: str | None = None
    title: str
    details: str = ""
    due_date: date | None = None
    done: bool = False
    notes: str = ""
    required_docs: list[str] = []


class GoalOut(BaseModel):
    id: str
    workflow_id: str
    title: str
    total: int
    completed: int
