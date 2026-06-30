from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.profile import Profile
from app.schemas.profile import ProfileRead, ProfileUpsert
from app.services.auth.dependencies import get_current_user

router = APIRouter(prefix="/profile", tags=["profile"])


def get_current_user_id(current_user: dict) -> UUID:
    try:
        return UUID(str(current_user["sub"]))
    except (KeyError, ValueError) as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authenticated user",
        ) from exc


@router.get("", response_model=ProfileRead)
def get_profile(
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    user_id = get_current_user_id(current_user)
    profile = db.scalar(select(Profile).where(Profile.user_id == user_id))

    if profile is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Profile not found")

    return profile


@router.put("", response_model=ProfileRead)
def upsert_profile(
    data: ProfileUpsert,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    user_id = get_current_user_id(current_user)
    profile = db.scalar(select(Profile).where(Profile.user_id == user_id))

    if profile is None:
        profile = Profile(user_id=user_id, **data.model_dump())
        db.add(profile)
    else:
        for field, value in data.model_dump().items():
            setattr(profile, field, value)

    db.commit()
    db.refresh(profile)

    return profile
