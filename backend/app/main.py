from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routes.auth import router as auth_router
from app.routes.education import router as education_router
from app.routes.experiences import router as experiences_router
from app.routes.health import router as health_router
from app.routes.jobs import router as jobs_router
from app.routes.profile import router as profile_router
from app.routes.protected import router as protected_router
from app.routes.skills import router as skills_router

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health_router)
app.include_router(auth_router)
app.include_router(protected_router)
app.include_router(jobs_router)
app.include_router(education_router)
app.include_router(experiences_router)
app.include_router(skills_router)
app.include_router(profile_router)
