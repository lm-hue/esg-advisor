-- Migration: Add umbrella/family grouping fields to regulations table
-- These fields enable clustering related regulations, standards, and frameworks
-- under a common parent without breaking the existing flat data structure.
--
-- umbrella_id       — ID of the parent/umbrella regulation (matches the `id` column)
-- umbrella_relation — how this entry relates to its umbrella:
--                       'part_of'  : a standard/tool that is formally part of a larger family
--                       'version'  : a newer or older version of the same regulation
--                       'amendment': a regulation that amends or is amended by the umbrella
--                       'component': a member initiative or component standard
-- version_label     — human-readable label, e.g. "V1.0 (2004)", "Sector Standard", "Revised 2023"

ALTER TABLE regulations
  ADD COLUMN IF NOT EXISTS umbrella_id       text,
  ADD COLUMN IF NOT EXISTS umbrella_relation text
    CHECK (umbrella_relation IN ('part_of', 'version', 'amendment', 'component')),
  ADD COLUMN IF NOT EXISTS version_label     text;

CREATE INDEX IF NOT EXISTS idx_regulations_umbrella_id
  ON regulations(umbrella_id)
  WHERE umbrella_id IS NOT NULL;

-- ---------------------------------------------------------------------------
-- DB entries: set umbrella relationships for regulations managed in Supabase
--
-- NOTE: These UPDATE statements are provided for owner review. Apply them
-- manually via the Supabase SQL editor after verifying the IDs below match
-- the UUIDs in your regulations table. The local supplemental entries in
-- src/lib/regulations.ts are updated directly in TypeScript — see that file.
-- ---------------------------------------------------------------------------

-- EU Omnibus I amends CSRD
-- UPDATE regulations
--   SET umbrella_id = (SELECT id FROM regulations WHERE title ILIKE '%corporate sustainability reporting directive%' LIMIT 1),
--       umbrella_relation = 'amendment',
--       version_label = 'Omnibus I Amendment (2026)'
--   WHERE title ILIKE '%omnibus%simplification%' OR title ILIKE '%omnibus i%';

-- ESRS Set 1 is part_of CSRD
-- UPDATE regulations
--   SET umbrella_id = (SELECT id FROM regulations WHERE title ILIKE '%corporate sustainability reporting directive%' LIMIT 1),
--       umbrella_relation = 'part_of',
--       version_label = 'Delegated Act — ESRS Set 1'
--   WHERE title ILIKE '%european sustainability reporting standards%' OR title ILIKE '%esrs set 1%';

-- IFRS S1 and IFRS S2 are components of the ISSB Standards family
-- (If you have an "ISSB Standards" umbrella entry, set its ID below)
-- UPDATE regulations
--   SET umbrella_relation = 'component',
--       version_label = 'IFRS S1'
--   WHERE title ILIKE '%ifrs s1%' OR title ILIKE '%general requirements for disclosure%';
-- UPDATE regulations
--   SET umbrella_relation = 'component',
--       version_label = 'IFRS S2'
--   WHERE title ILIKE '%ifrs s2%' OR title ILIKE '%climate-related disclosures%';
