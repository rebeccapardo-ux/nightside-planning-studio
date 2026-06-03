-- 20260603_containers_domain_code.sql
--
-- 1C — Migration A: add containers.domain_code and backfill it from the title.
--
-- domain_code is the stable per-domain identity that replaces title-substring
-- matching ( title.includes('healthcare'), .ilike('title','%death%'), etc. )
-- across the app. Renaming a domain container title currently breaks domain
-- identity silently; a stable code fixes that.
--
--   - NULL for non-domain containers (the CHECK and all reads are domain-scoped).
--   - Six-value controlled vocabulary (text + CHECK, matching the prompt_id /
--     document_type convention — not a native PG enum).
--
-- The duplicate cleanup and the partial UNIQUE INDEX on (user_id, domain_code)
-- are deferred to Migration B (1C commit 5), applied AFTER the code-aware,
-- idempotent seeder ships — so no non-idempotent insert can race the index.
--
-- Idempotent and safe to re-run. Run in the Supabase SQL editor.

-- 1. Column + CHECK (NULL allowed for non-domain containers) ------------------
ALTER TABLE containers
  ADD COLUMN IF NOT EXISTS domain_code text;

ALTER TABLE containers
  DROP CONSTRAINT IF EXISTS containers_domain_code_check;
ALTER TABLE containers
  ADD CONSTRAINT containers_domain_code_check
  CHECK (domain_code IS NULL OR domain_code IN
    ('healthcare', 'deathcare', 'legacy', 'wills_estates', 'ritual', 'personal_admin'));

-- 2. Backfill from title + reporting -----------------------------------------
DO $$
DECLARE
  v_total     bigint;
  v_matched   bigint;
  v_unmatched bigint;
  v_dupgroups bigint;
BEGIN
  -- Backfill only domain rows that don't yet have a code. The substring rules
  -- mirror the union of every title heuristic currently in the codebase; this
  -- is the SQL-side copy of the canonical mapping (SQL can't import the TS one).
  UPDATE containers SET domain_code =
    CASE
      WHEN lower(title) LIKE '%health%'                                   THEN 'healthcare'
      WHEN lower(title) LIKE '%death%'                                    THEN 'deathcare'
      WHEN lower(title) LIKE '%legacy%'                                   THEN 'legacy'
      WHEN lower(title) LIKE '%will%'    OR lower(title) LIKE '%estate%'  THEN 'wills_estates'
      WHEN lower(title) LIKE '%ritual%'  OR lower(title) LIKE '%ceremony%' THEN 'ritual'
      WHEN lower(title) LIKE '%personal%'                                 THEN 'personal_admin'
      ELSE NULL
    END
  WHERE type = 'domain' AND domain_code IS NULL;

  SELECT count(*) INTO v_total     FROM containers WHERE type = 'domain';
  SELECT count(*) INTO v_matched   FROM containers WHERE type = 'domain' AND domain_code IS NOT NULL;
  SELECT count(*) INTO v_unmatched FROM containers WHERE type = 'domain' AND domain_code IS NULL;
  SELECT count(*) INTO v_dupgroups FROM (
    SELECT user_id, domain_code
    FROM containers
    WHERE type = 'domain' AND domain_code IS NOT NULL
    GROUP BY user_id, domain_code
    HAVING count(*) > 1
  ) d;

  -- Don't ship a domain container with no code — surface it instead of silently
  -- leaving a broken (unidentifiable) domain. Rolls back the backfill; the
  -- ADD COLUMN / CHECK above persist, so a corrected re-run is clean.
  IF v_unmatched > 0 THEN
    RAISE EXCEPTION 'domain_code backfill: % domain row(s) did not map to a code — inspect their titles before retrying', v_unmatched;
  END IF;

  RAISE NOTICE '--- containers.domain_code (Migration A) ------------------';
  RAISE NOTICE 'domain containers total:         %', v_total;
  RAISE NOTICE 'matched (domain_code set):       %', v_matched;
  RAISE NOTICE 'unmatched (NULL after backfill):  %', v_unmatched;
  RAISE NOTICE 'duplicate (user, code) groups:   %  (cleanup -> Migration B)', v_dupgroups;
  RAISE NOTICE '----------------------------------------------------------';
END $$;
