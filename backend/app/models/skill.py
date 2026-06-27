import uuid

from sqlalchemy import Integer, Text, Uuid
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class Skill(Base):
    __tablename__ = "skills"

    skill_id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    skill_user_id: Mapped[uuid.UUID] = mapped_column(Uuid, nullable=False, index=True)
    skill_name: Mapped[str] = mapped_column(Text, nullable=False)
    category: Mapped[str | None] = mapped_column(Text, nullable=True)
    proficiency: Mapped[str | None] = mapped_column(Text, nullable=True)
    position_number: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
