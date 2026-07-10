from datetime import date, datetime, time, timezone
from typing import cast
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.document import Document
from app.models.followup import FollowUp
from app.models.interviews import Interview
from app.models.job_stage_history import JobStageHistory
from app.models.jobs import Job
from app.schemas.document import DocumentCreate, DocumentRead
from app.schemas.jobs import (
    ActivityEventType,
    FollowUpCreate,
    FollowUpRead,
    FollowUpUpdate,
    InterviewCreate,
    InterviewRead,
    InterviewUpdate,
    JobActivityEvent,
    JobCreate,
    JobMetrics,
    JobRead,
    JobUpdate,
    StageCounts,
)
from app.services.auth.dependencies import get_current_user

router = APIRouter(prefix="/jobs", tags=["jobs"])

RESPONDED_STAGES = {"Interview", "Offer", "Rejected"}


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


def get_owned_followup_or_404(
    job_id: UUID, followup_id: UUID, owner_id: UUID, db: Session
) -> FollowUp:
    get_owned_job_or_404(job_id, owner_id, db)
    followup = db.scalar(
        select(FollowUp).where(
            FollowUp.followup_id == followup_id,
            FollowUp.job_id == job_id,
            FollowUp.user_id == owner_id,
        )
    )

    if followup is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Follow-up not found",
        )

    return followup


def get_owned_document_or_404(
    job_id: UUID, document_id: UUID, owner_id: UUID, db: Session
) -> Document:
    get_owned_job_or_404(job_id, owner_id, db)
    document = db.scalar(
        select(Document).where(
            Document.document_id == document_id,
            Document.job_id == job_id,
            Document.user_id == owner_id,
        )
    )

    if document is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found",
        )

    return document


def get_owned_library_document_or_404(document_id: UUID, owner_id: UUID, db: Session) -> Document:
    document = db.scalar(
        select(Document).where(
            Document.document_id == document_id,
            Document.user_id == owner_id,
        )
    )

    if document is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found",
        )

    return document


def archive_document_record(document: Document) -> Document:
    now = datetime.now(timezone.utc)
    document.status = "archived"
    document.updated_at = now
    return document


def restore_document_record(document: Document) -> Document:
    document.status = "active"
    document.updated_at = datetime.now(timezone.utc)
    return document


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


@router.get("/metrics", response_model=JobMetrics)
def get_job_metrics(
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    owner_id = get_current_user_id(current_user)
    user_jobs = db.scalars(select(Job).where(Job.job_poster_id == owner_id)).all()
    has_stage_updates = False

    for db_job in user_jobs:
        has_stage_updates = sync_job_stage_with_history(db_job, db) or has_stage_updates

    if has_stage_updates:
        db.commit()

    stage_counts = dict.fromkeys(StageCounts.model_fields, 0)
    for db_job in user_jobs:
        stage_counts[db_job.job_stage] += 1

    return JobMetrics(
        total_applications=len(user_jobs),
        awaiting_response=stage_counts["Applied"],
        responded=sum(count for stage, count in stage_counts.items() if stage in RESPONDED_STAGES),
        stage_counts=StageCounts(**stage_counts),
    )


@router.get("/documents", response_model=list[DocumentRead])
def list_user_documents(
    include_archived: bool = False,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    owner_id = get_current_user_id(current_user)
    query = select(Document).where(
        Document.user_id == owner_id,
        Document.doc_type.in_(("resume", "cover_letter")),
    )
    if not include_archived:
        query = query.where(Document.status == "active")

    return db.scalars(query.order_by(Document.created_at.desc())).all()


@router.patch("/documents/{document_id}/archive", response_model=DocumentRead)
def archive_user_document(
    document_id: UUID,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    owner_id = get_current_user_id(current_user)
    db_document = get_owned_library_document_or_404(document_id, owner_id, db)
    archive_document_record(db_document)

    db.commit()
    db.refresh(db_document)

    return db_document


@router.patch("/documents/{document_id}/restore", response_model=DocumentRead)
def restore_user_document(
    document_id: UUID,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    owner_id = get_current_user_id(current_user)
    db_document = get_owned_library_document_or_404(document_id, owner_id, db)
    restore_document_record(db_document)

    db.commit()
    db.refresh(db_document)

    return db_document


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
        db.add(
            JobStageHistory(
                job_id=db_job.job_id,
                from_stage=db_job.job_stage,
                to_stage=new_stage,
                changed_by=owner_id,
            )
        )

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


@router.delete("/{job_id}/interviews/{interview_id}", status_code=204)
def delete_job_interview(
    job_id: UUID,
    interview_id: UUID,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> None:
    owner_id = get_current_user_id(current_user)
    db_interview = get_owned_interview_or_404(job_id, interview_id, owner_id, db)
    db.delete(db_interview)
    db.commit()


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


@router.get("/{job_id}/followups", response_model=list[FollowUpRead])
def list_job_followups(
    job_id: UUID,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    owner_id = get_current_user_id(current_user)
    get_owned_job_or_404(job_id, owner_id, db)

    return db.scalars(
        select(FollowUp)
        .where(FollowUp.job_id == job_id, FollowUp.user_id == owner_id)
        .order_by(FollowUp.due_date.asc())
    ).all()


@router.post(
    "/{job_id}/followups",
    response_model=FollowUpRead,
    status_code=status.HTTP_201_CREATED,
)
def create_job_followup(
    job_id: UUID,
    followup: FollowUpCreate,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    owner_id = get_current_user_id(current_user)
    get_owned_job_or_404(job_id, owner_id, db)
    db_followup = FollowUp(
        **followup.model_dump(),
        job_id=job_id,
        user_id=owner_id,
        created_at=datetime.now(timezone.utc),
    )

    db.add(db_followup)
    db.commit()
    db.refresh(db_followup)

    return db_followup


@router.patch("/{job_id}/followups/{followup_id}", response_model=FollowUpRead)
def update_job_followup(
    job_id: UUID,
    followup_id: UUID,
    followup_update: FollowUpUpdate,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    owner_id = get_current_user_id(current_user)
    db_followup = get_owned_followup_or_404(job_id, followup_id, owner_id, db)

    for field, value in followup_update.model_dump(exclude_unset=True).items():
        setattr(db_followup, field, value)

    db.commit()
    db.refresh(db_followup)

    return db_followup


@router.delete("/{job_id}/followups/{followup_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_job_followup(
    job_id: UUID,
    followup_id: UUID,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    owner_id = get_current_user_id(current_user)
    db_followup = get_owned_followup_or_404(job_id, followup_id, owner_id, db)

    db.delete(db_followup)
    db.commit()


@router.get("/{job_id}/documents", response_model=list[DocumentRead])
def list_job_documents(
    job_id: UUID,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    owner_id = get_current_user_id(current_user)
    get_owned_job_or_404(job_id, owner_id, db)

    return db.scalars(
        select(Document)
        .where(
            Document.job_id == job_id,
            Document.user_id == owner_id,
            Document.status == "active",
        )
        .order_by(Document.created_at.desc())
    ).all()


@router.post(
    "/{job_id}/documents",
    response_model=DocumentRead,
    status_code=status.HTTP_201_CREATED,
)
def create_job_document(
    job_id: UUID,
    document: DocumentCreate,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    owner_id = get_current_user_id(current_user)
    get_owned_job_or_404(job_id, owner_id, db)

    latest_version = db.scalar(
        select(func.max(Document.doc_version)).where(
            Document.job_id == job_id,
            Document.user_id == owner_id,
            Document.doc_type == document.doc_type,
        )
    )

    db_document = Document(
        **document.model_dump(),
        job_id=job_id,
        user_id=owner_id,
        doc_version=(latest_version or 0) + 1,
    )

    db.add(db_document)
    db.commit()
    db.refresh(db_document)

    return db_document


@router.delete("/{job_id}/documents/{document_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_job_document(
    job_id: UUID,
    document_id: UUID,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    owner_id = get_current_user_id(current_user)
    db_document = get_owned_document_or_404(job_id, document_id, owner_id, db)

    archive_document_record(db_document)
    db.commit()
