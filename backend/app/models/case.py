import re
from datetime import date
from typing import Literal

from pydantic import BaseModel, Field, field_validator

FormType = Literal["I-129", "I-765", "I-485", "I-539", "I-140", "I-131", "I-130", "I-751", "I-90", "N-400", "Other"]
Stage = Literal["received", "biometrics", "in_review", "rfe", "approved", "denied", "other"]
CLOSED_STAGES = {"approved", "denied"}

RECEIPT_RE = re.compile(r"^[A-Z]{3}\d{10}$")


def normalize_receipt(value: str) -> str:
    cleaned = re.sub(r"[^A-Za-z0-9]", "", value).upper()
    if not RECEIPT_RE.match(cleaned):
        raise ValueError("A receipt number is 3 letters followed by 10 digits, e.g. EAC2190000000.")
    return cleaned


class CaseIn(BaseModel):
    receipt_number: str
    form_type: FormType
    label: str = Field(default="", max_length=80)
    owner: str = Field(default="me", max_length=100)  # "me" or a family member's name
    filed_date: date | None = None
    stage: Stage = "received"
    status_text: str = Field(default="", max_length=200)
    notes: str = Field(default="", max_length=1000)
    rfe_due_date: date | None = None

    @field_validator("receipt_number")
    @classmethod
    def _receipt(cls, v: str) -> str:
        return normalize_receipt(v)


class CaseUpdate(BaseModel):
    label: str | None = Field(default=None, max_length=80)
    stage: Stage | None = None
    status_text: str | None = Field(default=None, max_length=200)
    notes: str | None = Field(default=None, max_length=1000)
    rfe_due_date: date | None = None


class HistoryEntry(BaseModel):
    date: date
    stage: Stage
    status_text: str = ""


class CaseOut(CaseIn):
    id: str
    closed: bool
    history: list[HistoryEntry] = []
