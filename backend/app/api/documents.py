import re
from datetime import datetime, timezone

from typing import get_args

from bson import ObjectId
from fastapi import APIRouter, Depends, File, Form, HTTPException, Response, UploadFile, status

from app.api.auth import current_user
from app.core.config import settings
from app.core.db import get_db
from app.models.documents import DocKind, DocumentOut, VaultSettingsIn, VaultStatus
from app.models.user import UserOut
from app.services import vault

router = APIRouter(prefix="/documents", tags=["documents"])

KINDS = set(get_args(DocKind))


def get_vault():
    return vault.get_fernet()


def _out(d) -> DocumentOut:
    return DocumentOut(id=str(d["_id"]), name=d["name"], kind=d["kind"], content_type=d["content_type"],
                       size=d["size"], created=d["created"], has_text=bool(d.get("has_text")))


def _oid(value: str) -> ObjectId:
    if not ObjectId.is_valid(value):
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Not found")
    return ObjectId(value)


async def _assistant_access(db, user_id: str) -> bool:
    doc = await db.doc_settings.find_one({"user_id": user_id})
    return bool(doc and doc.get("assistant_access"))


@router.get("/status", response_model=VaultStatus)
async def vault_status(user: UserOut = Depends(current_user), db=Depends(get_db), fernet=Depends(get_vault)):
    return VaultStatus(enabled=fernet is not None, assistant_access=await _assistant_access(db, user.id), max_upload_mb=settings.max_upload_mb)


@router.put("/settings", response_model=VaultStatus)
async def save_settings(body: VaultSettingsIn, user: UserOut = Depends(current_user), db=Depends(get_db), fernet=Depends(get_vault)):
    await db.doc_settings.update_one({"user_id": user.id}, {"$set": {"assistant_access": body.assistant_access}}, upsert=True)
    return await vault_status(user, db, fernet)


@router.get("", response_model=list[DocumentOut])
async def list_documents(user: UserOut = Depends(current_user), db=Depends(get_db)):
    docs = await db.documents.find({"user_id": user.id}, {"data": 0, "text_enc": 0}).sort([("created", -1)]).to_list(200)
    return [_out(d) for d in docs]


@router.post("", response_model=DocumentOut, status_code=status.HTTP_201_CREATED)
async def upload(
    file: UploadFile = File(...), kind: str = Form("other"), name: str | None = Form(None),
    user: UserOut = Depends(current_user), db=Depends(get_db), fernet=Depends(get_vault),
):
    if fernet is None:
        raise HTTPException(status.HTTP_503_SERVICE_UNAVAILABLE, "The document vault is not set up yet.")
    if kind not in KINDS:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "Unknown document type.")
    if await db.documents.count_documents({"user_id": user.id}) >= settings.max_documents_per_user:
        raise HTTPException(status.HTTP_409_CONFLICT, f"You can store up to {settings.max_documents_per_user} documents.")
    limit = settings.max_upload_mb * 1024 * 1024
    data = await file.read(limit + 1)
    if len(data) > limit:
        raise HTTPException(status.HTTP_413_REQUEST_ENTITY_TOO_LARGE, f"Files can be up to {settings.max_upload_mb} MB.")
    if not data:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "The file is empty.")
    content_type = vault.sniff_type(data)
    if content_type is None:
        raise HTTPException(status.HTTP_415_UNSUPPORTED_MEDIA_TYPE, "Only PDF, PNG and JPG files are allowed.")
    text = vault.extract_text(data, content_type)
    doc = {
        "user_id": user.id, "name": vault.safe_filename(name or file.filename or "document"), "kind": kind,
        "content_type": content_type, "size": len(data), "created": datetime.now(timezone.utc),
        "data": fernet.encrypt(data), "has_text": bool(text), "text_enc": fernet.encrypt(text.encode()) if text else None,
    }
    doc["_id"] = (await db.documents.insert_one(doc)).inserted_id
    return _out(doc)


@router.get("/{doc_id}/download")
async def download(doc_id: str, user: UserOut = Depends(current_user), db=Depends(get_db), fernet=Depends(get_vault)):
    if fernet is None:
        raise HTTPException(status.HTTP_503_SERVICE_UNAVAILABLE, "The document vault is not set up yet.")
    doc = await db.documents.find_one({"_id": _oid(doc_id), "user_id": user.id})
    if not doc:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Not found")
    ext = {"application/pdf": ".pdf", "image/png": ".png", "image/jpeg": ".jpg"}[doc["content_type"]]
    filename = doc["name"] if doc["name"].lower().endswith(ext) else doc["name"] + ext
    return Response(
        content=fernet.decrypt(doc["data"]), media_type=doc["content_type"],
        headers={"Content-Disposition": f'attachment; filename="{re.sub(r"[^A-Za-z0-9._ -]", "_", filename)}"', "X-Content-Type-Options": "nosniff", "Cache-Control": "no-store"},
    )


@router.delete("/{doc_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_document(doc_id: str, user: UserOut = Depends(current_user), db=Depends(get_db)):
    result = await db.documents.delete_one({"_id": _oid(doc_id), "user_id": user.id})
    if result.deleted_count == 0:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Not found")
