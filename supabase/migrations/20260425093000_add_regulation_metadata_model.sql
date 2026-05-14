-- Add a richer regulation metadata model so the app can use first-class
-- jurisdiction, lifecycle, date precision, type, topics, and link-health data.

ALTER TABLE regulations
  DROP CONSTRAINT IF EXISTS regulations_status_check;

ALTER TABLE regulations
  ADD CONSTRAINT regulations_status_check
  CHECK (
    status IN (
      'in_force',
      'draft',
      'adopted',
      'amended',
      'repealed',
      'proposal',
      'consultation',
      'adopted_not_yet_effective',
      'effective',
      'amended_effective',
      'superseded',
      'archived'
    )
  );

ALTER TABLE regulations
  ADD COLUMN IF NOT EXISTS jurisdiction_type text
    CHECK (jurisdiction_type IN ('country', 'supranational_region', 'global', 'standards_body', 'exchange_or_regulator')),
  ADD COLUMN IF NOT EXISTS jurisdiction_value text,
  ADD COLUMN IF NOT EXISTS published_date date,
  ADD COLUMN IF NOT EXISTS adopted_date date,
  ADD COLUMN IF NOT EXISTS date_precision text
    CHECK (date_precision IN ('year', 'month', 'day')),
  ADD COLUMN IF NOT EXISTS regulation_type text
    CHECK (regulation_type IN ('law_or_regulation', 'proposal_or_draft', 'guidance', 'standard', 'framework', 'market_rule', 'rating_or_benchmark', 'policy_plan')),
  ADD COLUMN IF NOT EXISTS topics text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS link_status text
    CHECK (link_status IN ('working_website', 'working_pdf', 'archived_pdf', 'broken', 'missing', 'unknown')),
  ADD COLUMN IF NOT EXISTS source_health text
    CHECK (source_health IN ('healthy', 'archived', 'broken', 'missing', 'unknown'));

UPDATE regulations
SET jurisdiction_value = COALESCE(NULLIF(jurisdiction_value, ''), region);

UPDATE regulations
SET jurisdiction_type = CASE
  WHEN region IS NULL OR btrim(region) = '' THEN 'global'
  WHEN region = 'Global' THEN 'global'
  WHEN region = 'EU' THEN 'supranational_region'
  WHEN region IN ('ASEAN', 'Mercosur', 'OECD', 'UN', 'CDP', 'GRI', 'IFRS', 'IIRC', 'ILO', 'IFC', 'ICMM', 'SASB', 'SBTi', 'TCFD', 'TNFD', 'SSE', 'SRP', 'CDSB') THEN
    CASE WHEN region = 'SSE' THEN 'exchange_or_regulator' ELSE 'standards_body' END
  ELSE 'country'
END
WHERE jurisdiction_type IS NULL;

UPDATE regulations
SET status = CASE
  WHEN status = 'in_force' THEN 'effective'
  WHEN status = 'adopted' THEN 'adopted_not_yet_effective'
  WHEN status = 'amended' THEN 'amended_effective'
  WHEN status IN ('draft', 'repealed') THEN status
  ELSE status
END
WHERE status IN ('in_force', 'adopted', 'amended', 'draft', 'repealed');

UPDATE regulations
SET date_precision = CASE
  WHEN effective_date IS NULL THEN NULL
  WHEN source_url ILIKE '%carrotsandsticks.org%' AND to_char(effective_date, 'MM-DD') = '01-01' THEN 'year'
  ELSE 'day'
END
WHERE date_precision IS NULL;

UPDATE regulations
SET regulation_type = CASE
  WHEN title ~* '(proposal|proposed|draft|consultation|exposure draft|bill)\b' THEN 'proposal_or_draft'
  WHEN coalesce(array_to_string(tags, ' '), '') ~* '(ratings_rankings|rating|rankings|benchmark|cdp|ecovadis|msci)' THEN 'rating_or_benchmark'
  WHEN title ~* '(stock exchange|listing requirement|listing rule|exchange rule|hkex|sgx|jse|sebi|fca|sec)' THEN 'market_rule'
  WHEN title ~* '(^|[^a-z])(standard|standards|iso |esrs|ifrs s1|ifrs s2|sasb|gri)([^a-z]|$)' THEN 'standard'
  WHEN title ~* '(guidance|guide|playbook|faq|manual)' THEN 'guidance'
  WHEN title ~* '(roadmap|action plan|strategy|programme|program)' THEN 'policy_plan'
  WHEN title ~* '(framework|protocol|principles)' OR source_name ~* '(OECD|GRI|IFRS|ISO|TNFD|TCFD|SBTi|ILO)' THEN 'framework'
  ELSE 'law_or_regulation'
END
WHERE regulation_type IS NULL;

UPDATE regulations
SET topics = ARRAY(
  SELECT DISTINCT topic FROM unnest(ARRAY[
    CASE WHEN concat_ws(' ', title, description, full_description, array_to_string(tags, ' ')) ~* '(report(ing)?|disclosure|materiality|assurance|esrs|issb|ifrs|gri|sustainability report)' THEN 'reporting' END,
    CASE WHEN concat_ws(' ', title, description, full_description, array_to_string(tags, ' ')) ~* 'taxonomy' THEN 'taxonomy' END,
    CASE WHEN concat_ws(' ', title, description, full_description, array_to_string(tags, ' ')) ~* '(governance|board|anti-corruption|bribery|ethics|conduct)' THEN 'governance' END,
    CASE WHEN concat_ws(' ', title, description, full_description, array_to_string(tags, ' ')) ~* '(human rights|labou?r|worker|forced labour|indigenous|harassment|diversity|equality)' THEN 'human_rights' END,
    CASE WHEN concat_ws(' ', title, description, full_description, array_to_string(tags, ' ')) ~* '(supply chain|due diligence|supplier|mineral|procurement|traceability)' THEN 'supply_chain' END,
    CASE WHEN concat_ws(' ', title, description, full_description, array_to_string(tags, ' ')) ~* '(biodiversity|deforestation|ecosystem|forest|nature-related)' THEN 'biodiversity' END,
    CASE WHEN concat_ws(' ', title, description, full_description, array_to_string(tags, ' ')) ~* '(\mwater\M|wastewater|marine|ocean)' THEN 'water' END,
    CASE WHEN concat_ws(' ', title, description, full_description, array_to_string(tags, ' ')) ~* '(pollution|emission|air quality|chemical|contaminant|plastic)' THEN 'pollution' END,
    CASE WHEN concat_ws(' ', title, description, full_description, array_to_string(tags, ' ')) ~* '(\mwaste\M|recycling|circular|battery stewardship|packaging)' THEN 'waste' END,
    CASE WHEN concat_ws(' ', title, description, full_description, array_to_string(tags, ' ')) ~* '(energy|electricity|renewable|efficiency|fuel)' THEN 'energy' END,
    CASE WHEN concat_ws(' ', title, description, full_description, array_to_string(tags, ' ')) ~* '(climate|greenhouse gas|ghg|net zero|carbon|tcfd|transition plan)' THEN 'climate' END,
    CASE WHEN concat_ws(' ', title, description, full_description, array_to_string(tags, ' ')) ~* '(finance|financial|investor|bank|fund|securities|listing)' THEN 'finance' END,
    CASE WHEN category ILIKE 'Climate' THEN 'climate' END,
    CASE WHEN category ILIKE 'Circularity' THEN 'waste' END,
    CASE WHEN category ILIKE 'Nature' THEN 'biodiversity' END,
    CASE WHEN category ILIKE 'Social' THEN 'human_rights' END,
    CASE WHEN category ILIKE 'Governance' THEN 'governance' END
  ]) AS topic
  WHERE topic IS NOT NULL
)
WHERE topics = '{}'::text[];

UPDATE regulations
SET link_status = CASE
  WHEN source_url IS NULL OR btrim(source_url) = '' THEN 'missing'
  WHEN source_url ILIKE '%/regulation-source-archives/%' THEN 'archived_pdf'
  WHEN source_url ILIKE '%.pdf%' THEN 'working_pdf'
  WHEN source_url ILIKE '%carrotsandsticks.org%' THEN 'broken'
  WHEN source_url ILIKE 'http%' THEN 'working_website'
  ELSE 'unknown'
END
WHERE link_status IS NULL;

UPDATE regulations
SET source_health = CASE
  WHEN link_status IN ('working_website', 'working_pdf') THEN 'healthy'
  WHEN link_status = 'archived_pdf' THEN 'archived'
  WHEN link_status = 'broken' THEN 'broken'
  WHEN link_status = 'missing' THEN 'missing'
  ELSE 'unknown'
END
WHERE source_health IS NULL;

CREATE INDEX IF NOT EXISTS idx_regulations_jurisdiction_type
  ON regulations(jurisdiction_type);

CREATE INDEX IF NOT EXISTS idx_regulations_jurisdiction_value
  ON regulations(jurisdiction_value);

CREATE INDEX IF NOT EXISTS idx_regulations_regulation_type
  ON regulations(regulation_type);

CREATE INDEX IF NOT EXISTS idx_regulations_link_status
  ON regulations(link_status);

CREATE INDEX IF NOT EXISTS idx_regulations_source_health
  ON regulations(source_health);

CREATE INDEX IF NOT EXISTS idx_regulations_topics_gin
  ON regulations
  USING gin(topics);
