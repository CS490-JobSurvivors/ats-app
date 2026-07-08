-- S3-004: Add file_path column to documents table for Supabase Storage references
-- Run in Supabase SQL editor before deploying this branch.
-- Rollback: ALTER TABLE documents DROP COLUMN file_path;

ALTER TABLE documents ADD COLUMN IF NOT EXISTS file_path TEXT;
