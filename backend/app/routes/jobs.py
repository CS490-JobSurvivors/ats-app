from datetime import date, datetime, time, timezone
from typing import cast
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.followup import FollowUp
from app.models.interviews import Interview
from app.models.job_stage_history import JobStageHistory
from app.models.jobs import Job
from app.schemas.jobs import (
    ActivityEventType,
    InterviewCreate,
    InterviewRead,
    InterviewUpdate,
    JobActivityEvent,
    JobCreate,
    JobRead,
    JobUpdate,
)
from app.services.auth.dependencies import get_current_user

router = APIRouter(prefix="/jobs", tags=["jobs"])


def get_current_user_id(current_user: dict) -> UUID:
    try:
        return UUID(str(current_user["sub"]))
    except (KeyError, ValueError) as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authenticated user",
        ) from exc


def get_owned_job_or_404(job_id: UUID, owner_id: UUID, db: Session) -> Job:
    db_job = db.scalar(select(Job).where(Job.job_id == job_id, Job.job_poster_id == owner_id))

    if db_job is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Job not found",
        )

    return db_job


def get_latest_stage_history(job_id: UUID, db: Session) -> JobStageHistory | None:
    return db.scalar(
        select(JobStageHistory)
        .where(JobStageHistory.job_id == job_id)
        .order_by(JobStageHistory.changed_at.desc())
    )


def sync_job_stage_with_history(db_job: Job, db: Session) -> bool:
    latest_history = get_latest_stage_history(db_job.job_id, db)
    if latest_history is None or db_job.job_stage == latest_history.to_stage:
        return False

    db_job.job_stage = latest_history.to_stage
    return True


def get_owned_interview_or_404(
    job_id: UUID, interview_id: UUID, owner_id: UUID, db: Session
) -> Interview:
    get_owned_job_or_404(job_id, owner_id, db)
    interview = db.scalar(
        select(Interview).where(
            Interview.interview_id == interview_id,
            Interview.job_id == job_id,
            Interview.user_id == owner_id,
        )
    )

    if interview is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Interview not found",
        )

    return interview


def as_datetime(value: date | datetime) -> datetime:
    if isinstance(value, datetime):
        return value

    return datetime.combine(value, time.min, tzinfo=timezone.utc)


def stage_event_type(stage: str) -> ActivityEventType:
    if stage == "Applied":
        return "applied"
    if stage == "Interview":
        return "interview"
    if stage in {"Offer", "Rejected", "Archived"}:
        return "outcome"
    return cast(ActivityEventType, "stage_change")


def stage_event_title(stage: str) -> str:
    titles = {
        "Applied": "Applied",
        "Interview": "Interview stage started",
        "Offer": "Offer received",
        "Rejected": "Marked rejected",
        "Archived": "Archived",
    }

    return titles.get(stage, f"Moved to {stage}")


@router.post("", response_model=JobRead, status_code=status.HTTP_201_CREATED)
def create_job(
    job: JobCreate,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    owner_id = get_current_user_id(current_user)
    db_job = Job(**job.model_dump(), job_poster_id=owner_id)

    db.add(db_job)
    db.commit()
    db.refresh(db_job)

    return db_job


@router.get("", response_model=list[JobRead])
def list_jobs(
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    owner_id = get_current_user_id(current_user)
    user_jobs = db.scalars(
        select(Job).where(Job.job_poster_id == owner_id).order_by(Job.updated_at.desc())
    ).all()
    has_stage_updates = False

    for db_job in user_jobs:
        has_stage_updates = sync_job_stage_with_history(db_job, db) or has_stage_updates

    if has_stage_updates:
        db.commit()

    return user_jobs


@router.delete("/{job_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_job(
    job_id: UUID,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    owner_id = get_current_user_id(current_user)
    db_job = get_owned_job_or_404(job_id, owner_id, db)

    db.delete(db_job)
    db.commit()


@router.patch("/{job_id}", response_model=JobRead)
def update_job(
    job_id: UUID,
    job_update: JobUpdate,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    owner_id = get_current_user_id(current_user)
    db_job = get_owned_job_or_404(job_id, owner_id, db)

    updates = job_update.model_dump(exclude_unset=True)
    new_stage = updates.get("job_stage")
    if new_stage and new_stage != db_job.job_stage:
        db.add(JobStageHistory(
            job_id=db_job.job_id,
            from_stage=db_job.job_stage,
            to_stage=new_stage,
            changed_by=owner_id,
        ))

    for field, value in updates.items():
        setattr(db_job, field, value)

    db.commit()
    db.refresh(db_job)

    return db_job


@router.get("/{job_id}/activity", response_model=list[JobActivityEvent])
def list_job_activity(
    job_id: UUID,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    owner_id = get_current_user_id(current_user)
    db_job = get_owned_job_or_404(job_id, owner_id, db)
    events = [
        JobActivityEvent(
            event_id=f"job-created-{db_job.job_id}",
            event_type="stage_change",
            title="Added to pipeline",
            description=f"{db_job.job_title} at {db_job.company_name}",
            occurred_at=db_job.created_at,
            can_delete=False,
        )
    ]

    stage_histories = db.scalars(
        select(JobStageHistory)
        .where(JobStageHistory.job_id == db_job.job_id)
        .order_by(JobStageHistory.changed_at.asc())
    ).all()
    for history in stage_histories:
        events.append(
            JobActivityEvent(
                event_id=str(history.job_history_id),
                event_type=stage_event_type(history.to_stage),
                title=stage_event_title(history.to_stage),
                description=f"{history.from_stage} to {history.to_stage}",
                occurred_at=history.changed_at,
                can_delete=True,
            )
        )

    followups = db.scalars(
        select(FollowUp)
        .where(FollowUp.job_id == db_job.job_id, FollowUp.user_id == owner_id)
        .order_by(FollowUp.due_date.asc())
    ).all()
    for followup in followups:
        status_label = "completed" if followup.is_completed else "due"
        events.append(
            JobActivityEvent(
                event_id=str(followup.followup_id),
                event_type="follow_up",
                title="Follow-up",
                description=f"{followup.notes or 'No notes'} ({status_label})",
                occurred_at=as_datetime(followup.due_date),
                can_delete=False,
            )
        )

    interviews = db.scalars(
        select(Interview)
        .where(Interview.job_id == db_job.job_id, Interview.user_id == owner_id)
        .order_by(Interview.scheduled_at_date.asc())
    ).all()
    for interview in interviews:
        events.append(
            JobActivityEvent(
                event_id=str(interview.interview_id),
                event_type="interview",
                title=f"{interview.round_type or 'Interview'} scheduled",
                description=interview.interview_notes,
                occurred_at=as_datetime(interview.scheduled_at_time or interview.scheduled_at_date),
                can_delete=False,
            )
        )

    return sorted(events, key=lambda event: event.occurred_at)


@router.delete(
    "/{job_id}/stage-history/{job_history_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def delete_job_stage_history(
    job_id: UUID,
    job_history_id: UUID,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    owner_id = get_current_user_id(current_user)
    db_job = get_owned_job_or_404(job_id, owner_id, db)
    stage_history = db.scalar(
        select(JobStageHistory).where(
            JobStageHistory.job_history_id == job_history_id,
            JobStageHistory.job_id == job_id,
        )
    )

    if stage_history is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Stage history not found",
        )

    fallback_stage = stage_history.from_stage
    db.delete(stage_history)
    latest_history = get_latest_stage_history(job_id, db)
    db_job.job_stage = latest_history.to_stage if latest_history else fallback_stage
    db.commit()


@router.get("/{job_id}/interviews", response_model=list[InterviewRead])
def list_job_interviews(
    job_id: UUID,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    owner_id = get_current_user_id(current_user)
    get_owned_job_or_404(job_id, owner_id, db)

    return db.scalars(
        select(Interview)
        .where(Interview.job_id == job_id, Interview.user_id == owner_id)
        .order_by(Interview.scheduled_at_date.asc(), Interview.scheduled_at_time.asc())
    ).all()


@router.post(
    "/{job_id}/interviews",
    response_model=InterviewRead,
    status_code=status.HTTP_201_CREATED,
)
def create_job_interview(
    job_id: UUID,
    interview: InterviewCreate,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    owner_id = get_current_user_id(current_user)
    get_owned_job_or_404(job_id, owner_id, db)
    db_interview = Interview(
        **interview.model_dump(),
        job_id=job_id,
        user_id=owner_id,
    )

    db.add(db_interview)
    db.commit()
    db.refresh(db_interview)

    return db_interview


@router.patch("/{job_id}/interviews/{interview_id}", response_model=InterviewRead)
def update_job_interview(
    job_id: UUID,
    interview_id: UUID,
    interview_update: InterviewUpdate,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    owner_id = get_current_user_id(current_user)
    db_interview = get_owned_interview_or_404(job_id, interview_id, owner_id, db)

    for field, value in interview_update.model_dump(exclude_unset=True).items():
        setattr(db_interview, field, value)

    db.commit()
    db.refresh(db_interview)

    return db_interview
