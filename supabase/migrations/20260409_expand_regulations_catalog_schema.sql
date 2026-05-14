-- Expand the regulations table so it can store the full app catalog shape.
-- This is required before bulk-syncing the supplemental regulations from
-- src/lib/regulations.ts into Supabase.

ALTER TABLE regulations
  ADD COLUMN IF NOT EXISTS description text,
  ADD COLUMN IF NOT EXISTS full_description text,
  ADD COLUMN IF NOT EXISTS source_name text,
  ADD COLUMN IF NOT EXISTS source_url text,
  ADD COLUMN IF NOT EXISTS tags text[] NOT NULL DEFAULT '{}';

CREATE INDEX IF NOT EXISTS idx_regulations_source_name
  ON regulations(source_name);

CREATE INDEX IF NOT EXISTS idx_regulations_tags_gin
  ON regulations
  USING gin(tags);
