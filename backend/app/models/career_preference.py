import uuid

from sqlalchemy import JSON, Numeric, Text, Uuid
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class CareerPreference(Base):
    __tablename__ = "career_preferences"

    user_id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True)
    target_roles: Mapped[list | None] = mapped_column(JSON, nullable=True)
    location_preference: Mapped[str | None] = mapped_column(Text, nullable=True)
    work_mode: Mapped[str | None] = mapped_column(Text, nullable=True)
    salary_minimum: Mapped[int | None] = mapped_column(Numeric, nullable=True)
