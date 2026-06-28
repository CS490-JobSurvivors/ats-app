import uuid
from datetime import date, datetime

from sqlalchemy import Date, DateTime, ForeignKey, Text, Uuid
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class Interview(Base):
    __tablename__ = "interviews"

    interview_id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    job_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("jobs.job_id", ondelete="CASCADE"), nullable=False
    )
    scheduled_at_date: Mapped[date] = mapped_column(Date, nullable=False)
    scheduled_at_time: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    interview_notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    user_id: Mapped[uuid.UUID] = mapped_column(Uuid, nullable=False)
    round_type: Mapped[str | None] = mapped_column(Text, nullable=True)
