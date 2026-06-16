from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

JobStage = Literal["Interested", "Applied", "Interview", "Offer", "Rejected", "Archived"]


class JobBase(BaseModel):
    company_name: str = Field(..., min_length=1)
    job_title: str = Field(..., min_length=1)
    job_description: str = Field(..., min_length=1)
    application_link: str | None = None
    job_stage: JobStage = "Interested"


class JobCreate(JobBase):
    pass


class JobUpdate(BaseModel):
    company_name: str | None = Field(default=None, min_length=1)
    job_title: str | None = Field(default=None, min_length=1)
    job_description: str | None = Field(default=None, min_length=1)
    application_link: str | None = None
    job_stage: JobStage | None = None


class JobRead(JobBase):
    model_config = ConfigDict(from_attributes=True)

    job_id: UUID
    job_poster_id: UUID
    updated_at: datetime
    created_at: datetime
