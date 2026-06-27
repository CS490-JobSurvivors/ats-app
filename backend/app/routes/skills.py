from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.skill import Skill
from app.schemas.skill import ReorderEntry, SkillCreate, SkillRead, SkillUpdate
from app.services.auth.dependencies import get_current_user

router = APIRouter(prefix="/skills", tags=["skills"])


def get_current_user_id(current_user: dict) -> UUID:
    try:
        return UUID(str(current_user["sub"]))
    except (KeyError, ValueError) as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authenticated user",
        ) from exc


@router.post("", response_model=SkillRead, status_code=status.HTTP_201_CREATED)
def create_skill(
    skill: SkillCreate,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    owner_id = get_current_user_id(current_user)
    duplicate = db.scalar(
        select(Skill).where(
            Skill.skill_user_id == owner_id,
            func.lower(Skill.skill_name) == skill.skill_name.strip().lower(),
        )
    )
    if duplicate:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A skill with this name already exists.",
        )
    position = db.scalar(select(func.count()).where(Skill.skill_user_id == owner_id)) or 0
    db_skill = Skill(
        **skill.model_dump(exclude={"position_number"}),
        skill_user_id=owner_id,
        position_number=position,
    )
    db.add(db_skill)
    db.commit()
    db.refresh(db_skill)
    return db_skill


@router.get("", response_model=list[SkillRead])
def list_skills(
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    owner_id = get_current_user_id(current_user)
    return db.scalars(
        select(Skill)
        .where(Skill.skill_user_id == owner_id)
        .order_by(Skill.position_number.asc())
    ).all()


@router.patch("/reorder", status_code=status.HTTP_204_NO_CONTENT)
def reorder_skills(
    entries: list[ReorderEntry],
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    owner_id = get_current_user_id(current_user)
    for entry in entries:
        db_skill = db.scalar(
            select(Skill).where(
                Skill.skill_id == entry.skill_id,
                Skill.skill_user_id == owner_id,
            )
        )
        if db_skill is not None:
            db_skill.position_number = entry.position_number
    db.commit()


@router.patch("/{skill_id}", response_model=SkillRead)
def update_skill(
    skill_id: UUID,
    skill_update: SkillUpdate,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    owner_id = get_current_user_id(current_user)
    db_skill = db.scalar(
        select(Skill).where(
            Skill.skill_id == skill_id,
            Skill.skill_user_id == owner_id,
        )
    )
    if db_skill is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Skill not found")

    if skill_update.skill_name is not None:
        duplicate = db.scalar(
            select(Skill).where(
                Skill.skill_user_id == owner_id,
                func.lower(Skill.skill_name) == skill_update.skill_name.strip().lower(),
                Skill.skill_id != skill_id,
            )
        )
        if duplicate:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="A skill with this name already exists.",
            )

    for field, value in skill_update.model_dump(exclude_unset=True).items():
        setattr(db_skill, field, value)

    db.commit()
    db.refresh(db_skill)
    return db_skill


@router.delete("/{skill_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_skill(
    skill_id: UUID,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    owner_id = get_current_user_id(current_user)
    db_skill = db.scalar(
        select(Skill).where(
            Skill.skill_id == skill_id,
            Skill.skill_user_id == owner_id,
        )
    )
    if db_skill is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Skill not found")

    db.delete(db_skill)
    db.commit()
