-- Add parent_id column to file table for consistent folder relationships
-- Note: Backfill is intentionally omitted due to cross-dialect differences (SQLite vs Postgres).
-- The application will continue to read from meta as a fallback.

ALTER TABLE "file" ADD COLUMN parent_id TEXT;

-- Helpful index for lookups by parent
CREATE INDEX IF NOT EXISTS file_parent_idx ON "file"(parent_id);


