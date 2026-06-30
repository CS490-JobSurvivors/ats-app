from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.education import Education
from app.schemas.education import EducationCreate, EducationRead, EducationUpdate, ReorderEntry
from app.services.auth.dependencies import get_current_user

router = APIRouter(prefix="/education", tags=["education"])


def get_current_user_id(current_user: dict) -> UUID:
    try:
        return UUID(str(current_user["sub"]))
    except (KeyError, ValueError) as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authenticated user",
        ) from exc


@router.post("", response_model=EducationRead, status_code=status.HTTP_201_CREATED)
def create_education(
    education: EducationCreate,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    owner_id = get_current_user_id(current_user)
    position = db.scalar(select(func.count()).where(Education.education_user_id == owner_id)) or 0
    db_education = Education(
        **education.model_dump(exclude={"position_number"}),
        education_user_id=owner_id,
        position_number=position,
    )
    db.add(db_education)
    db.commit()
    db.refresh(db_education)
    return db_education


@router.get("", response_model=list[EducationRead])
def list_education(
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    owner_id = get_current_user_id(current_user)
    return db.scalars(
        select(Education)
        .where(Education.education_user_id == owner_id)
        .order_by(Education.position_number.asc())
    ).all()


@router.patch("/reorder", status_code=status.HTTP_204_NO_CONTENT)
def reorder_education(
    entries: list[ReorderEntry],
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    owner_id = get_current_user_id(current_user)
    for entry in entries:
        db_education = db.scalar(
            select(Education).where(
                Education.education_id == entry.education_id,
                Education.education_user_id == owner_id,
            )
        )
        if db_education is not None:
            db_education.position_number = entry.position_number
    db.commit()


@router.patch("/{education_id}", response_model=EducationRead)
def update_education(
    education_id: UUID,
    education_update: EducationUpdate,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    owner_id = get_current_user_id(current_user)
    db_education = db.scalar(
        select(Education).where(
            Education.education_id == education_id,
            Education.education_user_id == owner_id,
        )
    )

    if db_education is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Education record not found",
        )

    for field, value in education_update.model_dump(exclude_unset=True).items():
        setattr(db_education, field, value)

    if (
        not db_education.is_current
        and db_education.end_date is not None
        and db_education.end_date < db_education.start_date
    ):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="end_date cannot be earlier than start_date",
        )

    db.commit()
    db.refresh(db_education)
    return db_education


@router.delete("/{education_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_education(
    education_id: UUID,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    owner_id = get_current_user_id(current_user)
    db_education = db.scalar(
        select(Education).where(
            Education.education_id == education_id,
            Education.education_user_id == owner_id,
        )
    )

    if db_education is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Education record not found",
        )

    db.delete(db_education)
    db.commit()
