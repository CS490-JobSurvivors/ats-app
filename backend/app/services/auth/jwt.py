from datetime import timedelta

import jwt
import requests
from fastapi import HTTPException, status

from app.config import SUPABASE_JWKS_URL


def verify_supabase_jwt(token: str) -> dict:
    try:
        # Get token header without verifying
        header = jwt.get_unverified_header(token)
        kid = header.get("kid")
        if not kid:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Missing token key ID",
            )
        # Fetch supabase JWKS
        jwks = requests.get(SUPABASE_JWKS_URL, timeout=5).json()

        # Find matching public key by kid
        public_key = None
        for key in jwks["keys"]:
            if key.get("kid") == kid:
                public_key = jwt.algorithms.ECAlgorithm.from_jwk(key)
                break

        if public_key is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="No matching public key found",
            )

        # Verify token signature and claims
        payload = jwt.decode(
            token,
            public_key,
            algorithms=["ES256"],
            audience="authenticated",
            leeway=timedelta(seconds=10),
        )

        return payload

    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has expired",
        )

    except jwt.InvalidTokenError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token",
        )
