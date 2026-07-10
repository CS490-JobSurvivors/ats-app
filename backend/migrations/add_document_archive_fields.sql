-- S3-008: Ensure document archive metadata exists.
-- Run in Supabase SQL editor before deploying this branch.
-- Rollback:
-- ALTER TABLE documents DROP CONSTRAINT IF EXISTS documents_status_check;

ALTER TABLE documents ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active';
ALTER TABLE documents ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'documents_status_check'
    ) THEN
        ALTER TABLE documents
            ADD CONSTRAINT documents_status_check
            CHECK (status IN ('active', 'archived'));
    END IF;
END $$;
