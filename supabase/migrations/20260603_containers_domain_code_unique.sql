-- 20260603_containers_domain_code_unique.sql
--
-- 1C — Migration B: enforce one domain container per (user, domain_code).
--
-- Runs AFTER the code-aware idempotent seeder (commit 3) shipped, so every
-- insert path now sets domain_code and skips existing codes — this index is the
-- DB-level backstop against recurrence.
--
-- Steps:
--   1. Pre-check: abort if any type='domain' row has a NULL domain_code (would
--      escape the partial index and indicate an unmapped/legacy row to fix first).
--   2. Duplicate cleanup (expected no-op): for any (user_id, domain_code) with
--      >1 row, keep the row with the most attached data (container_entries +
--      container_notes), tie-break oldest; re-point the losers' links to the
--      keeper, delete leftover/duplicate links, delete the loser containers.
--   3. Create the partial unique index on (user_id, domain_code).
--
-- Idempotent / safe to re-run. Run in the Supabase SQL editor.

DO $$
DECLARE
  v_unmatched  bigint;
  v_dupgroups  bigint;
  v_deleted    bigint := 0;
  r RECORD;
  keeper uuid;
BEGIN
  -- 1. Pre-check ------------------------------------------------------------
  SELECT count(*) INTO v_unmatched
  FROM containers WHERE type = 'domain' AND domain_code IS NULL;
  IF v_unmatched > 0 THEN
    RAISE EXCEPTION 'Cannot add unique index: % domain row(s) have NULL domain_code — backfill them first', v_unmatched;
  END IF;

  -- 2. Duplicate cleanup (expected to find nothing) -------------------------
  SELECT count(*) INTO v_dupgroups FROM (
    SELECT user_id, domain_code
    FROM containers
    WHERE type = 'domain' AND domain_code IS NOT NULL
    GROUP BY user_id, domain_code HAVING count(*) > 1
  ) d;

  FOR r IN
    SELECT user_id, domain_code
    FROM containers
    WHERE type = 'domain' AND domain_code IS NOT NULL
    GROUP BY user_id, domain_code HAVING count(*) > 1
  LOOP
    -- keeper = most attached data, tie-break oldest
    SELECT c.id INTO keeper
    FROM containers c
    LEFT JOIN (SELECT container_id, count(*) n FROM container_entries GROUP BY container_id) ce ON ce.container_id = c.id
    LEFT JOIN (SELECT container_id, count(*) n FROM container_notes   GROUP BY container_id) cn ON cn.container_id = c.id
    WHERE c.type = 'domain' AND c.user_id = r.user_id AND c.domain_code = r.domain_code
    ORDER BY (coalesce(ce.n,0) + coalesce(cn.n,0)) DESC, c.created_at ASC
    LIMIT 1;

    -- re-point losers' links to keeper (skip rows that would duplicate a keeper link)
    UPDATE container_entries le SET container_id = keeper
    WHERE le.container_id IN (
      SELECT id FROM containers
      WHERE type='domain' AND user_id=r.user_id AND domain_code=r.domain_code AND id <> keeper
    )
    AND NOT EXISTS (
      SELECT 1 FROM container_entries k WHERE k.container_id = keeper AND k.entry_id = le.entry_id
    );

    UPDATE container_notes ln SET container_id = keeper
    WHERE ln.container_id IN (
      SELECT id FROM containers
      WHERE type='domain' AND user_id=r.user_id AND domain_code=r.domain_code AND id <> keeper
    )
    AND NOT EXISTS (
      SELECT 1 FROM container_notes k WHERE k.container_id = keeper AND k.note_id = ln.note_id
    );

    -- delete any leftover (duplicate) link rows still on the losers
    DELETE FROM container_entries WHERE container_id IN (
      SELECT id FROM containers
      WHERE type='domain' AND user_id=r.user_id AND domain_code=r.domain_code AND id <> keeper);
    DELETE FROM container_notes WHERE container_id IN (
      SELECT id FROM containers
      WHERE type='domain' AND user_id=r.user_id AND domain_code=r.domain_code AND id <> keeper);

    -- delete the loser containers
    WITH del AS (
      DELETE FROM containers
      WHERE type='domain' AND user_id=r.user_id AND domain_code=r.domain_code AND id <> keeper
      RETURNING 1
    )
    SELECT v_deleted + count(*) INTO v_deleted FROM del;
  END LOOP;

  RAISE NOTICE '--- containers.domain_code (Migration B) ------------------';
  RAISE NOTICE 'unmatched (NULL) domain rows:  %', v_unmatched;
  RAISE NOTICE 'duplicate (user, code) groups: %', v_dupgroups;
  RAISE NOTICE 'duplicate rows deleted:        %', v_deleted;
  RAISE NOTICE '----------------------------------------------------------';
END $$;

-- 3. Partial unique index ----------------------------------------------------
CREATE UNIQUE INDEX IF NOT EXISTS containers_user_domain_code_uidx
  ON containers (user_id, domain_code)
  WHERE domain_code IS NOT NULL;
