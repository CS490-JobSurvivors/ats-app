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
            if obj.tags is None:
                obj.tags = []

    def scalar(self, query):
        entity = query.column_descriptions[0]["entity"]
        if entity is Document:
            params = query.compile().params
            document_id = params.get("document_id_1")
            user_id = params.get("user_id_1")
            if isinstance(document_id, UUID) and user_id is not None:
                return next(
                    (
                        d
                        for d in documents
                        if str(d.document_id) == str(document_id) and str(d.user_id) == str(user_id)
                    ),
                    None,
                )
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


def test_download_document_rejects_non_owner_without_requesting_signed_url():
    owner_id = str(uuid4())
    other_user_id = str(uuid4())
    set_authenticated_user(owner_id)
    documents.clear()

    with patch("app.services.storage.upload_file", return_value=f"{owner_id}/fakeid.pdf"):
        upload_response = client.post(
            "/documents/upload",
            data={"doc_type": "resume", "doc_title": "My Resume"},
            files={"file": make_pdf()},
        )
    document_id = upload_response.json()["document_id"]

    set_authenticated_user(other_user_id)
    with patch("app.services.storage.get_signed_url") as get_signed_url:
        response = client.get(f"/documents/download/{document_id}")

    assert response.status_code == 404
    assert response.json()["detail"] == "Document not found."
    get_signed_url.assert_not_called()


def test_download_document_returns_signed_url_for_owner():
    # Arrange
    user_id = str(uuid4())
    set_authenticated_user(user_id)
    documents.clear()

    with patch("app.services.storage.upload_file", return_value=f"{user_id}/fakeid.pdf"):
        upload_response = client.post(
            "/documents/upload",
            data={"doc_type": "resume", "doc_title": "My Resume"},
            files={"file": make_pdf()},
        )
    document_id = upload_response.json()["document_id"]
    fake_url = "https://storage.example.com/signed/resume.pdf?token=abc123"

    # Act
    with patch("app.services.storage.get_signed_url", return_value=fake_url):
        response = client.get(f"/documents/download/{document_id}")

    # Assert
    assert response.status_code == 200
    body = response.json()
    assert "url" in body
    assert isinstance(body["url"], str)
    assert body["url"]


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


# ---------------------------------------------------------------------------
# S3-007 tests
# ---------------------------------------------------------------------------


def test_rename_document_updates_title():
    user_id = str(uuid4())
    set_authenticated_user(user_id)
    documents.clear()

    doc = Document(
        document_id=uuid4(),
        user_id=UUID(user_id),
        doc_type="resume",
        doc_title="Old Title",
        content="# Resume",
        doc_version=1,
    )
    documents.append(doc)

    response = client.patch(
        f"/documents/{doc.document_id}",
        json={"doc_title": "New Title"},
    )

    assert response.status_code == 200
    assert response.json()["doc_title"] == "New Title"
    assert doc.doc_title == "New Title"


def test_rename_document_rejects_non_owner():
    owner_id = str(uuid4())
    other_id = str(uuid4())
    documents.clear()

    doc = Document(
        document_id=uuid4(),
        user_id=UUID(owner_id),
        doc_type="resume",
        doc_title="Owner's Doc",
        content="# Resume",
        doc_version=1,
    )
    documents.append(doc)

    set_authenticated_user(other_id)
    response = client.patch(
        f"/documents/{doc.document_id}",
        json={"doc_title": "Stolen Title"},
    )

    assert response.status_code == 404
    assert doc.doc_title == "Owner's Doc"


def test_duplicate_document_creates_copy_with_prefixed_title():
    user_id = str(uuid4())
    set_authenticated_user(user_id)
    documents.clear()

    doc = Document(
        document_id=uuid4(),
        user_id=UUID(user_id),
        doc_type="cover_letter",
        doc_title="My Cover Letter",
        content="# Cover Letter",
        doc_version=2,
    )
    documents.append(doc)

    response = client.post(f"/documents/{doc.document_id}/duplicate")

    assert response.status_code == 201
    body = response.json()
    assert body["doc_title"] == "Copy of My Cover Letter"
    assert body["doc_type"] == "cover_letter"
    assert body["doc_version"] == 1
    assert len(documents) == 2


def test_duplicate_document_rejects_non_owner():
    owner_id = str(uuid4())
    other_id = str(uuid4())
    documents.clear()

    doc = Document(
        document_id=uuid4(),
        user_id=UUID(owner_id),
        doc_type="resume",
        doc_title="Owner's Resume",
        content="# Resume",
        doc_version=1,
    )
    documents.append(doc)

    set_authenticated_user(other_id)
    response = client.post(f"/documents/{doc.document_id}/duplicate")

    assert response.status_code == 404
    assert len(documents) == 1
