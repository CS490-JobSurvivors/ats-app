# request endpoint for extracting and verifying JWT
from app.config import SUPABASE_URL, SUPABASE_JWKS_URL
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

router = APIRouter(prefix="/auth", tags=["auth"])
security = HTTPBearer(auto_error=False)


@router.get("/me")
async def auth_me(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """This is a protected endpoint used to determine who is currently authenticated"""

    if credentials is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="No token provided",
        )

    # TODO: Extract the raw JWT string
    token = credentials.credentials

    # TODO: perform basic format checks before validation
    if not token or not isinstance(token, str):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid token format",
        )

    # TODO: verify the token with the Supabase JWT secret
    JWKS_URL = f"{SUPABASE_URL}{SUPABASE_JWKS_URL}"

    print(JWKS_URL)

    return {"jwks_url": JWKS_URL, "token": token[:20] + "..."}


"""
    token = credentials.credentials

    # TODO: verify supabase JWT here
    # TODO: extract user_id and user_email from the verified token
    # For example:
    # user_id = payload.get("user_id")
    # user_email = payload.get("user_email")
    payload = jwt.decode(token, SETTINGS.JWT_SECRET, algorithms=["HS256"])
    user_id = payload.get("user_id")
    user_email = payload.get("user_email")

    return {"token": credentials.credentials, "user_id": user_id, "user_email": user_email}

#verify token
@app.get("/auth/verify")
async def verify_token(credentials: HTTPAuthorizationCredentials = Depends(security)):
    # Add your token verification logic here
    try:
        # Example verification logic (replace with your actual logic)
        payload = jwt.decode(credentials.credentials, SETTINGS.JWT_SECRET, algorithms=["HS256"])
        return {"status": "Token is valid", "user": payload.get("email")}
    except jwt.PyJWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token",
        )
    return {"status": "Token is valid"}
"""
