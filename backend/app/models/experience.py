import uuid
from datetime import date

from sqlalchemy import Boolean, Date, Text, Uuid
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class Experience(Base):
    __tablename__ = "experiences"

    experience_id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    experience_user_id: Mapped[uuid.UUID] = mapped_column(Uuid, nullable=False, index=True)
    company: Mapped[str] = mapped_column(Text, nullable=False)
    title: Mapped[str] = mapped_column(Text, nullable=False)
    start_date: Mapped[date] = mapped_column(Date, nullable=False)
    end_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    experience_description: Mapped[str | None] = mapped_column(Text, nullable=True)
    is_current: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
