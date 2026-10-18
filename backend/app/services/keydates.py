from datetime import date

from app.services.visas import DATE_LABELS

DATE_FIELDS = DATE_LABELS


async def collect_key_dates(db, user_id: str, today: date | None = None) -> list[dict]:
    """All dates to watch (me + dependents), soonest first."""
    today = today or date.today()
    items: list[dict] = []

    def collect(doc, owner):
        for field, label in DATE_FIELDS.items():
            raw = doc.get(field)
            if raw:
                due = date.fromisoformat(raw)
                items.append({"label": label, "owner": owner, "due": due, "days_left": (due - today).days})

    profile = await db.profiles.find_one({"user_id": user_id})
    if profile:
        collect(profile, "me")
    async for dep in db.dependents.find({"user_id": user_id}):
        collect(dep, dep["name"])
    # RFE response deadlines from open cases
    async for case in db.cases.find({"user_id": user_id, "stage": "rfe", "rfe_due_date": {"$ne": None}}):
        due = date.fromisoformat(case["rfe_due_date"])
        items.append({"label": f"RFE response due ({case['form_type']})", "owner": case.get("owner", "me"), "due": due, "days_left": (due - today).days})
    return sorted(items, key=lambda k: k["due"])
