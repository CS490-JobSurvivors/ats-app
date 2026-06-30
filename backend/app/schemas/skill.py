from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class SkillBase(BaseModel):
    skill_name: str = Field(..., min_length=1)
    category: str | None = None
    proficiency: str | None = None
    position_number: int = 0


class SkillCreate(SkillBase):
    pass


class SkillUpdate(BaseModel):
    skill_name: str | None = Field(default=None, min_length=1)
    category: str | None = None
    proficiency: str | None = None


class ReorderEntry(BaseModel):
    skill_id: UUID
    position_number: int


class SkillRead(SkillBase):
    model_config = ConfigDict(from_attributes=True)

    skill_id: UUID
    skill_user_id: UUID
