-- S2 backfill: Add job_location field to jobs table
-- Run in Supabase SQL editor before deploying this branch.
-- Rollback: ALTER TABLE jobs DROP COLUMN job_location;

ALTER TABLE jobs
ADD COLUMN IF NOT EXISTS job_location text;
