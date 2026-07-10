from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

DocType = Literal["resume", "cover_letter"]
DocumentStatus = Literal["active", "archived"]


class DocumentCreate(BaseModel):
    doc_type: DocType
    doc_title: str = Field(..., min_length=1)
    content: str | None = None


class DocumentRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    document_id: UUID
    user_id: UUID
    job_id: UUID | None
    doc_type: str | None
    doc_title: str
    content: str | None
    file_path: str | None
    doc_version: int
    file_path: str | None = None
    status: DocumentStatus = "active"
    tags: str | None = None
    created_at: datetime
    updated_at: datetime | None = None
