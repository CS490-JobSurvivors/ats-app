-- S3-013: Add preparation notes field to interviews table
-- Run in Supabase SQL editor before deploying this branch.
-- Rollback: ALTER TABLE interviews DROP COLUMN prep_notes;

ALTER TABLE interviews ADD COLUMN IF NOT EXISTS prep_notes TEXT;
