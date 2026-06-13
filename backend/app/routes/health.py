from fastapi import APIRouter

router = APIRouter()

#get request for health returns ok
@router.get("/health")
async def health():
    return {"status":"ok"}