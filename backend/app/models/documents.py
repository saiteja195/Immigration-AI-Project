from datetime import datetime
from typing import Literal

from pydantic import BaseModel

DocKind = Literal["passport", "visa", "i94", "i797", "i20", "ead", "marriage", "degree", "employment", "tax", "other"]


class DocumentOut(BaseModel):
    id: str
    name: str
    kind: DocKind
    content_type: str
    size: int
    created: datetime
    has_text: bool


class VaultStatus(BaseModel):
    enabled: bool
    assistant_access: bool
    max_upload_mb: int


class VaultSettingsIn(BaseModel):
    assistant_access: bool
