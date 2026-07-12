import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.services.error_handling import configure_logging, unhandled_exception_handler
from app.routes.auth import router as auth_router
from app.routes.career_preferences import router as career_preferences_router
from app.routes.documents import router as documents_router
from app.routes.education import router as education_router
from app.routes.experiences import router as experiences_router
from app.routes.health import router as health_router
from app.routes.jobs import router as jobs_router
from app.routes.profile import router as profile_router
from app.routes.protected import router as protected_router
from app.routes.research import router as research_router
from app.routes.resume import router as resume_router
from app.routes.skills import router as skills_router

configure_logging()

app = FastAPI()

app.add_exception_handler(Exception, unhandled_exception_handler)

_raw_origins = os.environ.get("ALLOWED_ORIGINS", "http://localhost:3000")
_allowed_origins = [o.strip() for o in _raw_origins.split(",")]

app.add_middleware(
    CORSMiddleware,
    allow_origins=_allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health_router)
app.include_router(research_router)
app.include_router(resume_router)
app.include_router(documents_router)
app.include_router(auth_router)
app.include_router(protected_router)
app.include_router(jobs_router)
app.include_router(education_router)
app.include_router(experiences_router)
app.include_router(skills_router)
app.include_router(career_preferences_router)
app.include_router(profile_router)
