from pathlib import Path
from uuid import UUID, uuid4

import requests as http_requests
from fastapi import APIRouter, Depends, Form, HTTPException, Request, UploadFile, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.document import Document
from app.schemas.document import DocType, DocumentRead, DocumentRename
from app.services import storage
from app.services.auth.dependencies import get_current_user

router = APIRouter(prefix="/documents", tags=["documents"])

MAX_BYTES = 10 * 1024 * 1024  # 10 MB


def get_current_user_id(current_user: dict) -> UUID:
    try:
        return UUID(str(current_user["sub"]))
    except (KeyError, ValueError) as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authenticated user",
        ) from exc


def get_access_token(request: Request) -> str:
    auth = request.headers.get("Authorization", "")
    if not auth.startswith("Bearer "):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing token.")
    return auth[7:]


@router.post("/upload", response_model=DocumentRead, status_code=status.HTTP_201_CREATED)
async def upload_document(
    file: UploadFile,
    doc_type: DocType = Form(...),
    doc_title: str = Form(...),
    current_user: dict = Depends(get_current_user),
    access_token: str = Depends(get_access_token),
    db: Session = Depends(get_db),
):
    user_id = get_current_user_id(current_user)

    suffix = Path(file.filename or "").suffix.lower()
    if suffix not in storage.ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Unsupported file type '{suffix}'. Allowed: PDF, DOCX, TXT.",
        )

    content_type = file.content_type or ""
    if content_type not in storage.ALLOWED_CONTENT_TYPES:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Unsupported content type '{content_type}'.",
        )

    file_bytes = await file.read()
    if len(file_bytes) > MAX_BYTES:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail="File exceeds 10 MB limit.",
        )

    document_id = uuid4()
    storage_path = f"{user_id}/{document_id}{suffix}"

    try:
        storage.upload_file(storage_path, file_bytes, content_type, access_token)
    except http_requests.HTTPError as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Storage upload failed.",
        ) from exc

    doc = Document(
        document_id=document_id,
        user_id=user_id,
        doc_type=doc_type,
        doc_title=doc_title.strip(),
        file_path=storage_path,
        status="active",
        tags=[],
    )
    db.add(doc)
    db.commit()
    db.refresh(doc)
    return doc


@router.get("/download/{document_id}")
def get_download_url(
    document_id: UUID,
    current_user: dict = Depends(get_current_user),
    access_token: str = Depends(get_access_token),
    db: Session = Depends(get_db),
):
    user_id = get_current_user_id(current_user)
    doc = db.scalar(
        select(Document).where(
            Document.document_id == document_id,
            Document.user_id == user_id,
        )
    )
    if doc is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found.")
    if doc.file_path is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No file attached to this document.",
        )

    try:
        signed_url = storage.get_signed_url(doc.file_path, access_token)
    except http_requests.HTTPError as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Could not generate download link.",
        ) from exc

    return {"url": signed_url}


@router.patch("/{document_id}", response_model=DocumentRead)
def rename_document(
    document_id: UUID,
    body: DocumentRename,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    user_id = get_current_user_id(current_user)
    doc = db.scalar(
        select(Document).where(
            Document.document_id == document_id,
            Document.user_id == user_id,
        )
    )
    if doc is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found.")
    doc.doc_title = body.doc_title.strip()
    db.commit()
    db.refresh(doc)
    return doc


@router.post(
    "/{document_id}/duplicate",
    response_model=DocumentRead,
    status_code=status.HTTP_201_CREATED,
)
def duplicate_document(
    document_id: UUID,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    user_id = get_current_user_id(current_user)
    doc = db.scalar(
        select(Document).where(
            Document.document_id == document_id,
            Document.user_id == user_id,
        )
    )
    if doc is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found.")
    copy = Document(
        document_id=uuid4(),
        user_id=user_id,
        job_id=doc.job_id,
        doc_type=doc.doc_type,
        doc_title=f"Copy of {doc.doc_title}",
        content=doc.content,
        file_path=doc.file_path,
        doc_version=1,
    )
    db.add(copy)
    db.commit()
    db.refresh(copy)
    return copy
