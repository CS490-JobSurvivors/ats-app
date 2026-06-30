from datetime import date
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, model_validator


class EducationBase(BaseModel):
    institution_name: str = Field(..., min_length=1)
    degree: str = Field(..., min_length=1)
    major: str = Field(..., min_length=1)
    start_date: date
    end_date: date | None = None
    GPA: float | None = None
    is_current: bool = False
    position_number: int = 0

    @model_validator(mode="after")
    def validate_dates(self) -> "EducationBase":
        if not self.is_current and self.end_date and self.end_date < self.start_date:
            raise ValueError("end_date cannot be earlier than start_date")
        return self


class EducationCreate(EducationBase):
    pass


class EducationUpdate(BaseModel):
    institution_name: str | None = Field(default=None, min_length=1)
    degree: str | None = Field(default=None, min_length=1)
    major: str | None = Field(default=None, min_length=1)
    start_date: date | None = None
    end_date: date | None = None
    GPA: float | None = None
    is_current: bool | None = None

    @model_validator(mode="after")
    def validate_dates(self) -> "EducationUpdate":
        if (
            self.is_current is False
            and self.end_date is not None
            and self.start_date is not None
            and self.end_date < self.start_date
        ):
            raise ValueError("end_date cannot be earlier than start_date")
        return self


class ReorderEntry(BaseModel):
    education_id: UUID
    position_number: int


class EducationRead(EducationBase):
    model_config = ConfigDict(from_attributes=True)

    education_id: UUID
    education_user_id: UUID
