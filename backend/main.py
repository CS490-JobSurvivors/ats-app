#boilerplate for main

from fastapi import FastAPI
from routes.health import router as health_router
app = FastAPI()
app.include_router(health_router)