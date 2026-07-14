# Database Migrations

Migration files are numbered sequentially. Each file contains the forward SQL and a rollback comment.

## Running a Migration
1. Open the Supabase SQL editor for the target project
2. Paste the contents of the migration file (forward SQL only, not the rollback comment)
3. Execute and confirm no errors

## Verifying a Migration Applied
- Check the Supabase Table Editor to confirm the column or table exists
- Or run the migration verification tests locally: `pytest testing/test_migrations.py`

## Rolling Back a Migration
Run the rollback SQL from the comment block at the top of each migration file. Apply in reverse order (006 → 001) to fully undo all versioned schema changes:

| File | Rollback SQL |
|------|-------------|
| 006_add_document_versions.sql | `DROP INDEX IF EXISTS document_versions_document_id_idx; DROP TABLE IF EXISTS document_versions;` |
| 005_add_document_metadata.sql | `ALTER TABLE documents DROP COLUMN updated_at; DROP COLUMN tags; DROP COLUMN status;` |
| 004_add_file_path_to_documents.sql | `ALTER TABLE documents DROP COLUMN file_path;` |
| 003_add_company_research_notes.sql | `ALTER TABLE jobs DROP COLUMN company_research_notes;` |
| 002_add_prep_notes_to_interviews.sql | `ALTER TABLE interviews DROP COLUMN prep_notes;` |
| 001_add_job_filter_fields.sql | `ALTER TABLE jobs DROP COLUMN job_location;` |
