from datetime import date
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, model_validator


class ExperienceBase(BaseModel):
    company: str = Field(..., min_length=1)
    title: str = Field(..., min_length=1)
    start_date: date
    end_date: date | None = None
    experience_description: str | None = None
    is_current: bool = False

    @model_validator(mode="after")
    def validate_dates(self) -> "ExperienceBase":
        if not self.is_current and self.end_date and self.end_date < self.start_date:
            raise ValueError("end_date cannot be earlier than start_date")
        return self


class ExperienceCreate(ExperienceBase):
    pass


class ExperienceUpdate(BaseModel):
    company: str | None = Field(default=None, min_length=1)
    title: str | None = Field(default=None, min_length=1)
    start_date: date | None = None
    end_date: date | None = None
    experience_description: str | None = None
    is_current: bool | None = None

    @model_validator(mode="after")
    def validate_dates(self) -> "ExperienceUpdate":
        if (
            self.is_current is False
            and self.end_date is not None
            and self.start_date is not None
            and self.end_date < self.start_date
        ):
            raise ValueError("end_date cannot be earlier than start_date")
        return self


class ExperienceRead(ExperienceBase):
    model_config = ConfigDict(from_attributes=True)

    experience_id: UUID
    experience_user_id: UUID
