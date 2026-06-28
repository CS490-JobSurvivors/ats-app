from datetime import date, datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

JobStage = Literal["Interested", "Applied", "Interview", "Offer", "Rejected", "Archived"]
ActivityEventType = Literal["applied", "follow_up", "interview", "outcome", "stage_change"]


class JobBase(BaseModel):
    company_name: str = Field(..., min_length=1)
    job_title: str = Field(..., min_length=1)
    job_description: str = Field(..., min_length=1)
    application_link: str | None = None
    job_location: str | None = None
    deadline: date | None = None
    job_stage: JobStage = "Interested"


class JobCreate(JobBase):
    pass


class JobUpdate(BaseModel):
    company_name: str | None = Field(default=None, min_length=1)
    job_title: str | None = Field(default=None, min_length=1)
    job_description: str | None = Field(default=None, min_length=1)
    application_link: str | None = None
    job_location: str | None = None
    deadline: date | None = None
    job_stage: JobStage | None = None


class JobRead(JobBase):
    model_config = ConfigDict(from_attributes=True)

    job_id: UUID
    job_poster_id: UUID
    updated_at: datetime
    created_at: datetime


class JobActivityEvent(BaseModel):
    event_id: str
    event_type: ActivityEventType
    title: str
    description: str | None = None
    occurred_at: datetime
    can_delete: bool = False


class InterviewBase(BaseModel):
    round_type: str = Field(..., min_length=1)
    scheduled_at_date: date
    scheduled_at_time: datetime
    interview_notes: str | None = None


class InterviewCreate(InterviewBase):
    pass


class InterviewUpdate(BaseModel):
    round_type: str | None = Field(default=None, min_length=1)
    scheduled_at_date: date | None = None
    scheduled_at_time: datetime | None = None
    interview_notes: str | None = None


class InterviewRead(InterviewBase):
    model_config = ConfigDict(from_attributes=True)

    interview_id: UUID
    job_id: UUID
    user_id: UUID


class FollowUpBase(BaseModel):
    due_date: date
    notes: str | None = None
    is_completed: bool = False


class FollowUpCreate(FollowUpBase):
    pass


class FollowUpUpdate(BaseModel):
    due_date: date | None = None
    notes: str | None = None
    is_completed: bool | None = None


class FollowUpRead(FollowUpBase):
    model_config = ConfigDict(from_attributes=True)

    followup_id: UUID
    job_id: UUID
    user_id: UUID
    created_at: datetime | None = None
