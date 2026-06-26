from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.jobs import Job
from app.models.job_stage_history import JobStageHistory
from app.schemas.jobs import JobCreate, JobRead, JobUpdate
from app.services.auth.dependencies import get_current_user

FORWARD_TRANSITIONS: dict[str, set[str]] = {
    "Interested": {"Applied", "Rejected"},
    "Applied": {"Interview", "Rejected"},
    "Interview": {"Offer", "Rejected"},
    "Offer": {"Archived", "Rejected"},
    "Rejected": set(),
    "Archived": set(),
}

router = APIRouter(prefix="/jobs", tags=["jobs"])


def get_current_user_id(current_user: dict) -> UUID:
    try:
        return UUID(str(current_user["sub"]))
    except (KeyError, ValueError) as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authenticated user",
        ) from exc


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

    return db.scalars(
        select(Job).where(Job.job_poster_id == owner_id).order_by(Job.updated_at.desc())
    ).all()


@router.delete("/{job_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_job(
    job_id: UUID,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    owner_id = get_current_user_id(current_user)
    db_job = db.scalar(select(Job).where(Job.job_id == job_id, Job.job_poster_id == owner_id))

    if db_job is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Job not found",
        )

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
    db_job = db.scalar(select(Job).where(Job.job_id == job_id, Job.job_poster_id == owner_id))

    if db_job is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Job not found",
        )

    updates = job_update.model_dump(exclude_unset=True)
    new_stage = updates.get("job_stage")
    if new_stage and new_stage != db_job.job_stage:
        is_override = new_stage not in FORWARD_TRANSITIONS.get(db_job.job_stage, set())
        db.add(JobStageHistory(
            job_id=db_job.job_id,
            from_stage=db_job.job_stage,
            to_stage=new_stage,
            changed_by=owner_id,
            is_override=is_override,
        ))

    for field, value in updates.items():
        setattr(db_job, field, value)

    db.commit()
    db.refresh(db_job)

    return db_job
