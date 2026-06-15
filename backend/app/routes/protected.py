from fastapi import APIRouter, Depends
from app.services.auth.dependencies import get_current_user

router = APIRouter(prefix="/protected", tags=["protected"])

@router.get("/test")
def read_protected_data(current_user: dict = Depends(get_current_user)):
    return {"message": "Protected route accessed", "user": current_user}