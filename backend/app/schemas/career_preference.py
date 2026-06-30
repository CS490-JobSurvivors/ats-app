from uuid import UUID

from pydantic import BaseModel, ConfigDict


class CareerPreferenceBase(BaseModel):
    target_roles: list[str] | None = None
    location_preference: str | None = None
    work_mode: str | None = None
    salary_minimum: int | None = None


class CareerPreferenceUpdate(BaseModel):
    target_roles: list[str] | None = None
    location_preference: str | None = None
    work_mode: str | None = None
    salary_minimum: int | None = None


class CareerPreferenceRead(CareerPreferenceBase):
    model_config = ConfigDict(from_attributes=True)

    user_id: UUID
