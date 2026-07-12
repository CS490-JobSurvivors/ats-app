-- S3-002: Add status, tags, and updated_at metadata fields to documents table
-- Run in Supabase SQL editor before deploying this branch.
-- Rollback:
--   ALTER TABLE documents DROP COLUMN updated_at;
--   ALTER TABLE documents DROP COLUMN tags;
--   ALTER TABLE documents DROP COLUMN status;

ALTER TABLE documents ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active';
ALTER TABLE documents ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}';
ALTER TABLE documents ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ;
