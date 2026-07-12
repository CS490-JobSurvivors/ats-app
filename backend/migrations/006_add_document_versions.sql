-- S3-003: Create document_versions table for version history tracking
-- Run in Supabase SQL editor before deploying this branch.
-- Rollback:
--   DROP INDEX IF EXISTS document_versions_document_id_idx;
--   DROP TABLE IF EXISTS document_versions;

CREATE TABLE IF NOT EXISTS document_versions (
    version_id     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id    UUID NOT NULL REFERENCES documents(document_id) ON DELETE CASCADE,
    user_id        UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    version_number INT NOT NULL,
    content        TEXT,
    file_path      TEXT,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS document_versions_document_id_idx
    ON public.document_versions USING btree (document_id);
