-- S3-012: Add company research notes field to jobs table
-- Run in Supabase SQL editor before deploying this branch.
-- Rollback: ALTER TABLE jobs DROP COLUMN company_research_notes;

ALTER TABLE jobs ADD COLUMN IF NOT EXISTS company_research_notes TEXT;
