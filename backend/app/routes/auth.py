from fastapi import APIRouter, Depends
from app.services.auth.dependencies import get_current_user

router = APIRouter(prefix="/auth", tags=["auth"])

@router.get("/me")
async def auth_me(current_user: dict = Depends(get_current_user)):
    '''
    This is a protected endpoint used to determine who is currently authenticated
    '''
    return {
        "user_id": current_user.get("sub"),
        "email": current_user.get("email"),
    }