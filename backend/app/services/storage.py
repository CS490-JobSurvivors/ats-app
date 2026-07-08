import os

import requests

SUPABASE_URL = os.environ.get("SUPABASE_URL", "")
BUCKET = "documents"

ALLOWED_EXTENSIONS = {".pdf", ".docx", ".txt"}
ALLOWED_CONTENT_TYPES = {
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "text/plain",
}


def upload_file(file_path: str, file_bytes: bytes, content_type: str, user_token: str) -> str:
    url = f"{SUPABASE_URL}/storage/v1/object/{BUCKET}/{file_path}"
    response = requests.post(
        url,
        headers={
            "Authorization": f"Bearer {user_token}",
            "Content-Type": content_type,
        },
        data=file_bytes,
    )
    response.raise_for_status()
    return file_path


def delete_file(file_path: str, user_token: str) -> None:
    url = f"{SUPABASE_URL}/storage/v1/object/{BUCKET}/{file_path}"
    response = requests.delete(
        url,
        headers={"Authorization": f"Bearer {user_token}"},
    )
    response.raise_for_status()


def get_signed_url(file_path: str, user_token: str, expires_in: int = 3600) -> str:
    url = f"{SUPABASE_URL}/storage/v1/object/sign/{BUCKET}/{file_path}"
    response = requests.post(
        url,
        headers={
            "Authorization": f"Bearer {user_token}",
            "Content-Type": "application/json",
        },
        json={"expiresIn": expires_in},
    )
    response.raise_for_status()
    data = response.json()
    return f"{SUPABASE_URL}/storage/v1{data['signedURL']}"
