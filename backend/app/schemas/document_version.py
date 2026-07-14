from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict


class DocumentVersionRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    version_id: UUID
    document_id: UUID
    user_id: UUID
    version_number: int
    content: str | None
    file_path: str | None
    created_at: datetime
