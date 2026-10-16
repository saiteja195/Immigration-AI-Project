from pydantic import BaseModel, Field


class ChatIn(BaseModel):
    message: str = Field(min_length=1, max_length=2000)


class Citation(BaseModel):
    title: str
    url: str


class Action(BaseModel):
    type: str  # "plan" | "task"
    title: str


class ChatOut(BaseModel):
    reply: str
    citations: list[Citation] = []
    actions: list[Action] = []


class ChatMessageOut(BaseModel):
    role: str
    content: str
    citations: list[Citation] = []


class ChatStatus(BaseModel):
    enabled: bool
