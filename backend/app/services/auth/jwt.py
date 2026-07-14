from datetime import timedelta

import jwt
import requests
from fastapi import HTTPException, status

from app.config import SUPABASE_JWKS_URL

_jwks_cache: dict | None = None


def _get_jwks() -> dict:
    global _jwks_cache
    if _jwks_cache is None:
        _jwks_cache = requests.get(SUPABASE_JWKS_URL, timeout=10).json()
    return _jwks_cache


def verify_supabase_jwt(token: str) -> dict:
    global _jwks_cache
    try:
        # Get token header without verifying
        header = jwt.get_unverified_header(token)
        kid = header.get("kid")
        if not kid:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Missing token key ID",
            )

        jwks = _get_jwks()

        # Find matching public key by kid
        public_key = None
        for key in jwks["keys"]:
            if key.get("kid") == kid:
                public_key = jwt.algorithms.ECAlgorithm.from_jwk(key)
                break

        # If key not found, bust cache and retry once (key rotation)
        if public_key is None:
            _jwks_cache = None
            jwks = _get_jwks()
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
