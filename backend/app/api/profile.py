from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, status

from app.api.auth import current_user
from app.core.db import get_db
from app.models.profile import DependentIn, DependentOut, KeyDateOut, ProfileIn, ProfileOut
from app.models.user import UserOut
from app.services.keydates import collect_key_dates

router = APIRouter(tags=["profile"])

@router.get("/profile", response_model=ProfileOut)
async def get_profile(user: UserOut = Depends(current_user), db=Depends(get_db)):
    doc = await db.profiles.find_one({"user_id": user.id})
    if not doc:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Profile not set up yet")
    return ProfileOut(**doc)


@router.put("/profile", response_model=ProfileOut)
async def save_profile(body: ProfileIn, user: UserOut = Depends(current_user), db=Depends(get_db)):
    data = body.model_dump(mode="json")
    await db.profiles.update_one({"user_id": user.id}, {"$set": data}, upsert=True)
    return ProfileOut(**data)


@router.get("/dependents", response_model=list[DependentOut])
async def list_dependents(user: UserOut = Depends(current_user), db=Depends(get_db)):
    docs = await db.dependents.find({"user_id": user.id}).to_list(100)
    return [DependentOut(id=str(d["_id"]), **d) for d in docs]


@router.post("/dependents", response_model=DependentOut, status_code=status.HTTP_201_CREATED)
async def add_dependent(body: DependentIn, user: UserOut = Depends(current_user), db=Depends(get_db)):
    data = body.model_dump(mode="json")
    result = await db.dependents.insert_one({"user_id": user.id, **data})
    return DependentOut(id=str(result.inserted_id), **data)


@router.delete("/dependents/{dependent_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_dependent(dependent_id: str, user: UserOut = Depends(current_user), db=Depends(get_db)):
    if not ObjectId.is_valid(dependent_id):
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Not found")
    result = await db.dependents.delete_one({"_id": ObjectId(dependent_id), "user_id": user.id})
    if result.deleted_count == 0:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Not found")


@router.get("/key-dates", response_model=list[KeyDateOut])
async def key_dates(user: UserOut = Depends(current_user), db=Depends(get_db)):
    """All upcoming expiry dates (me + dependents), soonest first."""
    return [KeyDateOut(**k) for k in await collect_key_dates(db, user.id)]
