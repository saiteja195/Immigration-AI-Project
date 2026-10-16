from datetime import datetime

from pydantic import BaseModel, Field


class PrefsIn(BaseModel):
    email_enabled: bool = True
    task_reminders: bool = True
    windows: list[int] = Field(default=[180, 90, 30, 7], max_length=8)


class PrefsOut(PrefsIn):
    email_available: bool  # false when the server has no SMTP set up


class NotificationOut(BaseModel):
    id: str
    kind: str
    title: str
    body: str
    link: str
    tone: str
    created: datetime
    read: bool


class NotificationList(BaseModel):
    unread: int
    items: list[NotificationOut]
