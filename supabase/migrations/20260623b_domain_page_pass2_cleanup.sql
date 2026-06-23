-- Domain-page redesign (Pass 2) — CLEANUP (destructive, post-deploy).
--
-- Retires the now-unused per-row data. The Pass 2 code no longer renders per-row
-- status pills or per-row note pins, and note auto-surfacing moved per-row -> per-domain.
--
--   1. DROP domain_topic_notes — manual row-level pins. No UI anchor anymore (rows are
--      not rendered as cards), so nothing can create or read them. 0 rows.
--
--   2. DROP hidden_row_notes — replaced by the per-domain domain_hidden_notes created in
--      20260623a_domain_page_pass2_setup.sql. The old (user_id, note_id, domain_id,
--      topic_id) shape carries a now-meaningless topic_id; 0 rows, nothing to migrate.
--
--   3. Strip "orient" from user_profiles.domain_state JSONB — orientation rows are
--      back-end-only now (they drive tagging, not UI), so their manual status carries no
--      meaning. (~6 blobs across 3 users per probe.)
--
-- ORDER: apply AFTER the Pass 2 code is deployed and live, and AFTER
-- 20260623a_domain_page_pass2_setup.sql. The deployed code no longer references the
-- dropped tables. Idempotent and safe to re-run.

-- ---------------------------------------------------------------------------
-- 1. Per-row manual pins — gone.
-- ---------------------------------------------------------------------------
DROP TABLE IF EXISTS domain_topic_notes;

-- ---------------------------------------------------------------------------
-- 2. Old per-row suppression — gone (superseded by domain_hidden_notes).
-- ---------------------------------------------------------------------------
DROP TABLE IF EXISTS hidden_row_notes;

-- ---------------------------------------------------------------------------
-- 3. Strip "orient" from every domain blob in user_profiles.domain_state.
--    Each top-level key is a domain_uuid -> { checkboxes, orient }; remove the
--    orient sub-key from each, leaving checkboxes intact. Idempotent: the WHERE
--    skips already-cleaned rows, so a re-run reports 0.
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  n_updated int;
BEGIN
  WITH cleaned AS (
    UPDATE user_profiles up
    SET domain_state = (
      SELECT coalesce(jsonb_object_agg(k, v - 'orient'), '{}'::jsonb)
      FROM jsonb_each(up.domain_state) AS e(k, v)
    )
    WHERE up.domain_state::text LIKE '%"orient"%'
    RETURNING 1
  )
  SELECT count(*) INTO n_updated FROM cleaned;
  RAISE NOTICE 'domain_state orient removal: % user_profiles row(s) updated', n_updated;
END $$;
