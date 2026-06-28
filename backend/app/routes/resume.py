import os
from uuid import UUID

import anthropic
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.education import Education
from app.models.experience import Experience
from app.models.jobs import Job
from app.models.profile import Profile
from app.models.skill import Skill
from app.services.auth.dependencies import get_current_user

router = APIRouter(prefix="/resume", tags=["resume"])


def get_current_user_id(current_user: dict) -> UUID:
    try:
        return UUID(str(current_user["sub"]))
    except (KeyError, ValueError) as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authenticated user",
        ) from exc


class ResumeRequest(BaseModel):
    job_id: UUID


class ResumeResponse(BaseModel):
    resume: str


@router.post("/generate", response_model=ResumeResponse)
def generate_resume(
    body: ResumeRequest,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    owner_id = get_current_user_id(current_user)

    profile = db.scalar(select(Profile).where(Profile.user_id == owner_id))
    if profile is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Profile not found")

    job = db.scalar(
        select(Job).where(Job.job_id == body.job_id, Job.job_poster_id == owner_id)
    )
    if job is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Job not found")

    experiences = db.scalars(
        select(Experience)
        .where(Experience.experience_user_id == owner_id)
        .order_by(Experience.position_number.asc())
    ).all()

    educations = db.scalars(
        select(Education)
        .where(Education.education_user_id == owner_id)
        .order_by(Education.position_number.asc())
    ).all()

    skills = db.scalars(
        select(Skill)
        .where(Skill.skill_user_id == owner_id)
        .order_by(Skill.position_number.asc())
    ).all()

    exp_lines = []
    for e in experiences:
        end = "Present" if e.is_current else (str(e.end_date) if e.end_date else "")
        line = f"- {e.title} at {e.company} ({e.start_date} — {end})"
        if e.experience_description:
            line += f"\n  {e.experience_description}"
        exp_lines.append(line)

    edu_lines = []
    for e in educations:
        end = "Present" if e.is_current else (str(e.end_date) if e.end_date else "")
        line = f"- {e.degree} in {e.major} at {e.institution_name} ({e.start_date} — {end})"
        if e.GPA is not None:
            line += f", GPA: {e.GPA}"
        edu_lines.append(line)

    skill_parts = []
    for s in skills:
        part = s.skill_name
        if s.proficiency:
            part += f" ({s.proficiency})"
        skill_parts.append(part)

    prompt = f"""You are a professional resume writer. Generate a tailored resume for the following candidate applying to a specific job.

## Candidate Profile
Name: {profile.first_name} {profile.last_name}
City: {profile.city}
Phone: {profile.phone_number}
Summary: {profile.summary}

## Work Experience
{chr(10).join(exp_lines) if exp_lines else "No work experience listed."}

## Education
{chr(10).join(edu_lines) if edu_lines else "No education listed."}

## Skills
{", ".join(skill_parts) if skill_parts else "No skills listed."}

## Job They Are Applying To
Title: {job.job_title}
Company: {job.company_name}
Description: {job.job_description}

Write a complete, professional resume tailored to this job. Include all sections: Summary, Experience, Education, Skills. Format it clearly in plain text."""

    api_key = os.environ.get("ANTHROPIC_API_KEY")
    if not api_key:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="ANTHROPIC_API_KEY is not configured",
        )

    client = anthropic.Anthropic(api_key=api_key)
    message = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=2000,
        messages=[{"role": "user", "content": prompt}],
    )

    resume_text = message.content[0].text
    return ResumeResponse(resume=resume_text)
