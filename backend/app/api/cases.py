from datetime import date

from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, status
from pymongo.errors import DuplicateKeyError

from app.api.auth import current_user
from app.core.db import get_db
from app.models.case import CLOSED_STAGES, CaseIn, CaseOut, CaseUpdate
from app.models.user import UserOut

router = APIRouter(tags=["cases"])


def _out(d) -> CaseOut:
    fields = {k: v for k, v in d.items() if k not in ("_id", "user_id")}
    return CaseOut(id=str(d["_id"]), closed=d["stage"] in CLOSED_STAGES, **fields)


def _oid(value: str) -> ObjectId:
    if not ObjectId.is_valid(value):
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Not found")
    return ObjectId(value)


@router.get("/cases", response_model=list[CaseOut])
async def list_cases(user: UserOut = Depends(current_user), db=Depends(get_db)):
    docs = await db.cases.find({"user_id": user.id}).to_list(200)
    # open cases first, then newest filed first
    docs.sort(key=lambda d: (d["stage"] in CLOSED_STAGES, -(date.fromisoformat(d["filed_date"]).toordinal() if d.get("filed_date") else 0)))
    return [_out(d) for d in docs]


@router.post("/cases", response_model=CaseOut, status_code=status.HTTP_201_CREATED)
async def add_case(body: CaseIn, user: UserOut = Depends(current_user), db=Depends(get_db)):
    data = body.model_dump(mode="json")
    doc = {"user_id": user.id, **data, "history": [{"date": date.today().isoformat(), "stage": body.stage, "status_text": body.status_text}]}
    if await db.cases.find_one({"user_id": user.id, "receipt_number": body.receipt_number}):
        raise HTTPException(status.HTTP_409_CONFLICT, "You already track this receipt number")
    try:
        doc["_id"] = (await db.cases.insert_one(doc)).inserted_id
    except DuplicateKeyError:
        raise HTTPException(status.HTTP_409_CONFLICT, "You already track this receipt number")
    return _out(doc)


@router.patch("/cases/{case_id}", response_model=CaseOut)
async def update_case(case_id: str, body: CaseUpdate, user: UserOut = Depends(current_user), db=Depends(get_db)):
    query = {"_id": _oid(case_id), "user_id": user.id}
    doc = await db.cases.find_one(query)
    if not doc:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Not found")
    changes = body.model_dump(mode="json", exclude_unset=True)
    update: dict = {"$set": changes}
    stage = changes.get("stage", doc["stage"])
    text = changes.get("status_text", doc.get("status_text", ""))
    if stage != doc["stage"] or text != doc.get("status_text", ""):
        update["$push"] = {"history": {"date": date.today().isoformat(), "stage": stage, "status_text": text}}
    if changes:
        await db.cases.update_one(query, update)
    return _out(await db.cases.find_one(query))


@router.delete("/cases/{case_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_case(case_id: str, user: UserOut = Depends(current_user), db=Depends(get_db)):
    result = await db.cases.delete_one({"_id": _oid(case_id), "user_id": user.id})
    if result.deleted_count == 0:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Not found")
