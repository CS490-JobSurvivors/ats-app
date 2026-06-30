from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.career_preference import CareerPreference
from app.schemas.career_preference import CareerPreferenceRead, CareerPreferenceUpdate
from app.services.auth.dependencies import get_current_user

router = APIRouter(prefix="/career-preferences", tags=["career-preferences"])


def get_current_user_id(current_user: dict) -> UUID:
    try:
        return UUID(str(current_user["sub"]))
    except (KeyError, ValueError) as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authenticated user",
        ) from exc


@router.get("", response_model=CareerPreferenceRead)
def get_career_preferences(
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    owner_id = get_current_user_id(current_user)
    prefs = db.scalar(select(CareerPreference).where(CareerPreference.user_id == owner_id))
    if prefs is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No preferences found")
    return prefs


@router.put("", response_model=CareerPreferenceRead)
def upsert_career_preferences(
    payload: CareerPreferenceUpdate,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    owner_id = get_current_user_id(current_user)
    prefs = db.scalar(select(CareerPreference).where(CareerPreference.user_id == owner_id))
    if prefs is None:
        prefs = CareerPreference(user_id=owner_id)
        db.add(prefs)
    for field, value in payload.model_dump(exclude_unset=False).items():
        setattr(prefs, field, value)
    db.commit()
    db.refresh(prefs)
    return prefs
