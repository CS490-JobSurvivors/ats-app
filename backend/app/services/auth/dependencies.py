from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.services.auth.jwt import verify_supabase_jwt

security = HTTPBearer(auto_error=False)

def get_current_user(
        credentials: HTTPAuthorizationCredentials | None = Depends(security)
) -> dict:
    if credentials is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing authorization token"
        )

    return verify_supabase_jwt(credentials.credentials)
