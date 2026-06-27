from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.experience import Experience
from app.schemas.experience import ExperienceCreate, ExperienceRead, ExperienceUpdate, ReorderEntry
from app.services.auth.dependencies import get_current_user

router = APIRouter(prefix="/experiences", tags=["experiences"])


def get_current_user_id(current_user: dict) -> UUID:
    try:
        return UUID(str(current_user["sub"]))
    except (KeyError, ValueError) as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authenticated user",
        ) from exc


@router.post("", response_model=ExperienceRead, status_code=status.HTTP_201_CREATED)
def create_experience(
    experience: ExperienceCreate,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    owner_id = get_current_user_id(current_user)
    position = db.scalar(
        select(func.count()).where(Experience.experience_user_id == owner_id)
    ) or 0
    db_experience = Experience(
        **experience.model_dump(exclude={'position_number'}),
        experience_user_id=owner_id,
        position_number=position,
    )
    db.add(db_experience)
    db.commit()
    db.refresh(db_experience)
    return db_experience


@router.get("", response_model=list[ExperienceRead])
def list_experiences(
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    owner_id = get_current_user_id(current_user)
    return db.scalars(
        select(Experience)
        .where(Experience.experience_user_id == owner_id)
        .order_by(Experience.position_number.asc())
    ).all()


@router.patch("/reorder", status_code=status.HTTP_204_NO_CONTENT)
def reorder_experiences(
    entries: list[ReorderEntry],
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    owner_id = get_current_user_id(current_user)
    for entry in entries:
        db_experience = db.scalar(
            select(Experience).where(
                Experience.experience_id == entry.experience_id,
                Experience.experience_user_id == owner_id,
            )
        )
        if db_experience is not None:
            db_experience.position_number = entry.position_number
    db.commit()


@router.patch("/{experience_id}", response_model=ExperienceRead)
def update_experience(
    experience_id: UUID,
    experience_update: ExperienceUpdate,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    owner_id = get_current_user_id(current_user)
    db_experience = db.scalar(
        select(Experience).where(
            Experience.experience_id == experience_id,
            Experience.experience_user_id == owner_id,
        )
    )

    if db_experience is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Experience not found",
        )

    for field, value in experience_update.model_dump(exclude_unset=True).items():
        setattr(db_experience, field, value)

    db.commit()
    db.refresh(db_experience)
    return db_experience


@router.delete("/{experience_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_experience(
    experience_id: UUID,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    owner_id = get_current_user_id(current_user)
    db_experience = db.scalar(
        select(Experience).where(
            Experience.experience_id == experience_id,
            Experience.experience_user_id == owner_id,
        )
    )

    if db_experience is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Experience not found",
        )

    db.delete(db_experience)
    db.commit()
