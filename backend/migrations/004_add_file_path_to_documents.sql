-- S3-004: Add file_path field to documents table
-- Run in Supabase SQL editor before deploying this branch.
-- Rollback: ALTER TABLE documents DROP COLUMN file_path;

ALTER TABLE documents ADD COLUMN IF NOT EXISTS file_path TEXT;
