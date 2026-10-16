"""Immigration profile: the facts we track about a person's status."""
import json
from dataclasses import dataclass, field, asdict
from datetime import date
from typing import Optional

STATUSES = ["F-1", "F-1 OPT", "F-1 STEM OPT", "H-1B", "H-4", "Green Card Pending", "Green Card", "Other"]


@dataclass
class KeyDate:
    """A document or event with a date, e.g. passport expiry."""
    name: str
    due: date
    notes: str = ""


@dataclass
class Profile:
    full_name: str
    status: str
    country_of_citizenship: str = ""
    employer_or_school: str = ""
    key_dates: list = field(default_factory=list)  # list of KeyDate

    def __post_init__(self):
        if self.status not in STATUSES:
            raise ValueError(f"Unknown status: {self.status}")

    def add_date(self, name: str, due: date, notes: str = "") -> None:
        self.key_dates.append(KeyDate(name, due, notes))

    def to_json(self) -> str:
        return json.dumps(asdict(self), default=str, indent=2)

    @classmethod
    def from_json(cls, text: str) -> "Profile":
        data = json.loads(text)
        dates = [KeyDate(d["name"], date.fromisoformat(d["due"]), d.get("notes", ""))
                 for d in data.pop("key_dates", [])]
        profile = cls(**data)
        profile.key_dates = dates
        return profile


def save(profile: Profile, path: str) -> None:
    with open(path, "w") as f:
        f.write(profile.to_json())


def load(path: str) -> Optional[Profile]:
    try:
        with open(path) as f:
            return Profile.from_json(f.read())
    except FileNotFoundError:
        return None
