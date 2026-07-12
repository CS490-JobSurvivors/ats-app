from pathlib import Path

import pytest
from sqlalchemy import inspect as sa_inspect

from app.models.document import Document
from app.models.interviews import Interview
from app.models.jobs import Job

MIGRATIONS_DIR = Path(__file__).parent.parent / "migrations"

MIGRATION_FILES = [
    "001_add_job_filter_fields.sql",
    "002_add_prep_notes_to_interviews.sql",
    "003_add_company_research_notes.sql",
    "004_add_file_path_to_documents.sql",
    "005_add_document_metadata.sql",
    "006_add_document_versions.sql",
]


def model_columns(model) -> set[str]:
    return {col.key for col in sa_inspect(model).mapper.column_attrs}


# ---------------------------------------------------------------------------
# Migration file presence and structure
# ---------------------------------------------------------------------------


def test_all_migration_files_exist():
    for filename in MIGRATION_FILES:
        assert (MIGRATIONS_DIR / filename).exists(), f"Missing migration file: {filename}"


def test_migration_files_are_non_empty():
    for filename in MIGRATION_FILES:
        content = (MIGRATIONS_DIR / filename).read_text().strip()
        assert content, f"Migration file is empty: {filename}"


def test_migration_files_contain_rollback_comments():
    for filename in MIGRATION_FILES:
        content = (MIGRATIONS_DIR / filename).read_text()
        assert "Rollback" in content, f"No rollback comment in: {filename}"


def test_migration_files_are_numbered_sequentially():
    numbers = []
    for filename in MIGRATION_FILES:
        prefix = filename.split("_")[0]
        assert prefix.isdigit(), f"Non-numeric prefix in: {filename}"
        numbers.append(int(prefix))
    assert numbers == list(range(1, len(MIGRATION_FILES) + 1))


# ---------------------------------------------------------------------------
# 001 — job_location (S2 backfill)
# ---------------------------------------------------------------------------


def test_job_model_has_job_location_column():
    assert "job_location" in model_columns(Job)


def test_job_location_is_nullable():
    col = sa_inspect(Job).mapper.columns["job_location"]
    assert col.nullable


# ---------------------------------------------------------------------------
# 002 — prep_notes on interviews (S3-013)
# ---------------------------------------------------------------------------


def test_interview_model_has_prep_notes_column():
    assert "prep_notes" in model_columns(Interview)


def test_prep_notes_is_nullable():
    col = sa_inspect(Interview).mapper.columns["prep_notes"]
    assert col.nullable


# ---------------------------------------------------------------------------
# 003 — company_research_notes on jobs (S3-012, verified via migration file)
# ---------------------------------------------------------------------------


def test_003_migration_adds_company_research_notes():
    content = (MIGRATIONS_DIR / "003_add_company_research_notes.sql").read_text()
    assert "company_research_notes" in content
    assert "jobs" in content


def test_003_rollback_drops_company_research_notes():
    content = (MIGRATIONS_DIR / "003_add_company_research_notes.sql").read_text()
    assert "DROP COLUMN company_research_notes" in content


# ---------------------------------------------------------------------------
# 004 — file_path on documents (S3-004, verified via migration file)
# ---------------------------------------------------------------------------


def test_004_migration_adds_file_path():
    content = (MIGRATIONS_DIR / "004_add_file_path_to_documents.sql").read_text()
    assert "file_path" in content
    assert "documents" in content


def test_004_rollback_drops_file_path():
    content = (MIGRATIONS_DIR / "004_add_file_path_to_documents.sql").read_text()
    assert "DROP COLUMN file_path" in content


# ---------------------------------------------------------------------------
# 005 — status, tags, updated_at on documents (S3-002, verified via migration file)
# ---------------------------------------------------------------------------


def test_005_migration_adds_status_tags_updated_at():
    content = (MIGRATIONS_DIR / "005_add_document_metadata.sql").read_text()
    for col in ("status", "tags", "updated_at"):
        assert col in content, f"005 migration missing column: {col}"


def test_005_status_has_not_null_default():
    content = (MIGRATIONS_DIR / "005_add_document_metadata.sql").read_text()
    assert "NOT NULL" in content
    assert "DEFAULT" in content


def test_005_rollback_drops_all_three_columns():
    content = (MIGRATIONS_DIR / "005_add_document_metadata.sql").read_text()
    for col in ("status", "tags", "updated_at"):
        assert f"DROP COLUMN {col}" in content, f"005 rollback missing DROP COLUMN {col}"


# ---------------------------------------------------------------------------
# 006 — document_versions table (S3-003, verified via migration file)
# ---------------------------------------------------------------------------


def test_006_migration_creates_document_versions_table():
    content = (MIGRATIONS_DIR / "006_add_document_versions.sql").read_text()
    assert "document_versions" in content


def test_006_migration_has_required_columns_defined():
    content = (MIGRATIONS_DIR / "006_add_document_versions.sql").read_text()
    for col in ("version_id", "document_id", "user_id", "version_number", "created_at"):
        assert col in content, f"006 migration missing column definition: {col}"


def test_006_migration_references_documents_foreign_key():
    content = (MIGRATIONS_DIR / "006_add_document_versions.sql").read_text()
    assert "REFERENCES documents" in content


def test_006_rollback_drops_table():
    content = (MIGRATIONS_DIR / "006_add_document_versions.sql").read_text()
    assert "DROP TABLE" in content


# ---------------------------------------------------------------------------
# Regression — previously delivered columns still present
# ---------------------------------------------------------------------------


@pytest.mark.parametrize("col", ["document_id", "user_id", "job_id", "doc_type", "doc_title", "content", "doc_version", "created_at"])
def test_document_model_retains_original_columns(col: str):
    assert col in model_columns(Document)


@pytest.mark.parametrize("col", ["job_id", "job_title", "company_name", "job_stage", "created_at"])
def test_job_model_retains_original_columns(col: str):
    assert col in model_columns(Job)
