#request endpoint for extracting and verifying JWT
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.services.auth.jwt import verify_supabase_jwt

router = APIRouter(prefix="/auth", tags=["auth"])
security = HTTPBearer(auto_error=False)

@router.get("/me")
async def auth_me(credentials: HTTPAuthorizationCredentials = Depends(security)):
    '''This is a protected endpoint used to determine who is currently authenticated'''

    if credentials is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="No token provided",
        )

    # Extracting the token from the Authorization header
    token = credentials.credentials

    if not token or not isinstance(token, str):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid token format",
        )

    #Verify the JWT signature and claims using Supabase's JWKS
    payload = verify_supabase_jwt(token)

    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token",
        )

    # Return the user's protected information
    # Return the user's unique identifier and email address
    # "sub" contains the authenticated user's unique identifier (UUID) from Supabase Auth
    return {
        "user_id": payload.get("sub"),
        "email": payload.get("email"),
    }

