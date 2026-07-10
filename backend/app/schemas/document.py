from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

DocType = Literal["resume", "cover_letter"]
DocStatus = Literal["active", "archived", "draft"]


class DocumentCreate(BaseModel):
    doc_type: DocType
    doc_title: str = Field(..., min_length=1)
    content: str | None = None
    status: DocStatus = "active"
    tags: list[str] = []


class DocumentUpdate(BaseModel):
    doc_title: str | None = Field(default=None, min_length=1)
    status: DocStatus | None = None
    tags: list[str] | None = None

    @model_validator(mode="after")
    def reject_null_title(self) -> "DocumentUpdate":
        if "doc_title" in self.model_fields_set and self.doc_title is None:
            raise ValueError("doc_title cannot be null")
        return self


class DocumentRename(BaseModel):
    doc_title: str = Field(..., min_length=1)


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
    status: str
    tags: list[str]
    updated_at: datetime | None
    created_at: datetime

    @field_validator("tags", mode="before")
    @classmethod
    def coerce_null_tags(cls, v: object) -> object:
        return v if v is not None else []

    @field_validator("status", mode="before")
    @classmethod
    def coerce_null_status(cls, v: object) -> object:
        return v if v is not None else "active"
