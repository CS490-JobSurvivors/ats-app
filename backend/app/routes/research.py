import os
from uuid import UUID

import anthropic
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.jobs import Job
from app.services.auth.dependencies import get_current_user

router = APIRouter(prefix="/jobs", tags=["research"])


def get_current_user_id(current_user: dict) -> UUID:
    try:
        return UUID(str(current_user["sub"]))
    except (KeyError, ValueError) as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authenticated user",
        ) from exc


class ResearchRequest(BaseModel):
    user_context: str = Field(..., min_length=1, max_length=2000)


class ResearchResponse(BaseModel):
    research: str


def _get_anthropic_client() -> anthropic.Anthropic:
    api_key = os.environ.get("ANTHROPIC_API_KEY")
    if not api_key:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="ANTHROPIC_API_KEY is not configured",
        )
    return anthropic.Anthropic(api_key=api_key)


@router.post("/{job_id}/research", response_model=ResearchResponse)
def generate_company_research(
    job_id: UUID,
    body: ResearchRequest,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    owner_id = get_current_user_id(current_user)

    job = db.scalar(select(Job).where(Job.job_id == job_id, Job.job_poster_id == owner_id))
    if job is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Job not found")

    system = (
        "You are a research assistant helping a job candidate prepare for an application. "
        "Provide concise, factual company research based on the company name and role provided. "
        "Focus on information relevant to a job seeker: company culture, tech stack, recent news, "
        "growth trajectory, and what to highlight in an application. "
        "Do not fabricate specific details you are uncertain about — note uncertainty where appropriate. "
        "Format your response in clear markdown sections."
    )

    prompt = (
        f"Company: {job.company_name}\n"
        f"Role: {job.job_title}\n\n"
        f"The candidate wants to know:\n{body.user_context}\n\n"
        "Provide targeted company research to help them prepare their application and interviews."
    )

    client = _get_anthropic_client()
    message = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=1000,
        system=system,
        messages=[{"role": "user", "content": prompt}],
    )

    return ResearchResponse(research=message.content[0].text)
