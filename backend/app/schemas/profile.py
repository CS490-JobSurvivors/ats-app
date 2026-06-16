from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class ProfileUpsert(BaseModel):
    first_name: str = Field(..., min_length=1)
    last_name: str = Field(..., min_length=1)
    city: str = Field(..., min_length=1)
    phone_number: str = Field(..., min_length=1)
    summary: str = Field(..., min_length=1)


class ProfileRead(ProfileUpsert):
    model_config = ConfigDict(from_attributes=True)

    user_id: UUID
    created_at: datetime
    updated_at: datetime
