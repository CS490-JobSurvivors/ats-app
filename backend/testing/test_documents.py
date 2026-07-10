import io
from datetime import datetime, timezone
from unittest.mock import patch
from uuid import UUID, uuid4

from fastapi.testclient import TestClient

from app.database import get_db
from app.main import app
from app.models.document import Document
from app.routes.documents import get_access_token
from app.services.auth.dependencies import get_current_user

client = TestClient(app)

documents: list[Document] = []
active_user_id = ""


class FakeDb:
    def add(self, obj):
        if isinstance(obj, Document):
            documents.append(obj)

    def commit(self):
        pass

    def refresh(self, obj):
        if isinstance(obj, Document):
            if obj.doc_version is None:
                obj.doc_version = 1
            if obj.status is None:
                obj.status = "active"
            if obj.created_at is None:
                obj.created_at = datetime.now(timezone.utc)
            if obj.status is None:
                obj.status = "active"
            if obj.tags is None:
                obj.tags = []

    def scalar(self, query):
        entity = query.column_descriptions[0]["entity"]
        if entity is Document:
            for clause in query.whereclause.clauses:
                for val in getattr(clause, "right", None) or []:
                    if isinstance(val, UUID):
                        match = next(
                            (
                                d
                                for d in documents
                                if str(d.document_id) == str(val)
                                and str(d.user_id) == active_user_id
                            ),
                            None,
                        )
                        return match
        return None


def get_fake_db():
    yield FakeDb()


def set_authenticated_user(user_id: str):
    global active_user_id
    active_user_id = user_id
    app.dependency_overrides[get_current_user] = lambda: {"sub": user_id}
    app.dependency_overrides[get_access_token] = lambda: "fake-token"
    app.dependency_overrides[get_db] = get_fake_db


def make_pdf(filename: str = "resume.pdf") -> tuple:
    pdf_bytes = b"%PDF-1.4 fake content"
    return (filename, io.BytesIO(pdf_bytes), "application/pdf")


# ---------------------------------------------------------------------------
# S3-004 tests
# ---------------------------------------------------------------------------


def test_upload_pdf_resume_returns_201_and_file_path():
    user_id = str(uuid4())
    set_authenticated_user(user_id)
    documents.clear()

    with patch("app.services.storage.upload_file", return_value=f"{user_id}/fakeid.pdf"):
        response = client.post(
            "/documents/upload",
            data={"doc_type": "resume", "doc_title": "My Resume"},
            files={"file": make_pdf()},
        )

    assert response.status_code == 201
    body = response.json()
    assert body["file_path"] is not None
    assert body["file_path"].startswith(user_id)
    assert body["file_path"].endswith(".pdf")
    assert body["doc_type"] == "resume"


def test_upload_unsupported_file_type_returns_422():
    user_id = str(uuid4())
    set_authenticated_user(user_id)
    documents.clear()

    response = client.post(
        "/documents/upload",
        data={"doc_type": "cover_letter", "doc_title": "Bad Upload"},
        files={"file": ("malware.exe", io.BytesIO(b"MZ"), "application/octet-stream")},
    )

    assert response.status_code == 422
    assert "Unsupported" in response.json()["detail"]


def test_upload_rejects_invalid_doc_type():
    user_id = str(uuid4())
    set_authenticated_user(user_id)
    documents.clear()

    response = client.post(
        "/documents/upload",
        data={"doc_type": "transcript", "doc_title": "My Transcript"},
        files={"file": make_pdf()},
    )

    assert response.status_code == 422


# ---------------------------------------------------------------------------
# Document metadata: status, tags, updated_at (S3-002)
# ---------------------------------------------------------------------------


def test_upload_document_defaults_to_active_status_and_no_tags():
    # Arrange
    user_id = str(uuid4())
    set_authenticated_user(user_id)
    documents.clear()

    # Act
    with patch("app.services.storage.upload_file", return_value=f"{user_id}/fakeid.pdf"):
        response = client.post(
            "/documents/upload",
            data={"doc_type": "resume", "doc_title": "My Resume"},
            files={"file": make_pdf()},
        )

    # Assert
    body = response.json()
    assert body["status"] == "active"
    assert body["tags"] == []


def test_upload_document_leaves_updated_at_unset():
    # Arrange
    user_id = str(uuid4())
    set_authenticated_user(user_id)
    documents.clear()

    # Act
    with patch("app.services.storage.upload_file", return_value=f"{user_id}/fakeid.pdf"):
        response = client.post(
            "/documents/upload",
            data={"doc_type": "cover_letter", "doc_title": "My Cover Letter"},
            files={"file": make_pdf("cover.pdf")},
        )

    # Assert
    assert response.json()["updated_at"] is None
