import uuid
from datetime import date

from sqlalchemy import Boolean, Date, Float, Integer, Text, Uuid
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class Education(Base):
    __tablename__ = "education"

    education_id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    education_user_id: Mapped[uuid.UUID] = mapped_column(Uuid, nullable=False, index=True)
    institution_name: Mapped[str] = mapped_column(Text, nullable=False)
    degree: Mapped[str] = mapped_column(Text, nullable=False)
    major: Mapped[str] = mapped_column(Text, nullable=False)
    start_date: Mapped[date] = mapped_column(Date, nullable=False)
    end_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    GPA: Mapped[float | None] = mapped_column(Float, nullable=True)
    is_current: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    position_number: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
