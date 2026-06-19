-- Migrate activity reflections out of entries.content and into the notes table.
--
-- The free-text reflection at the bottom of values-ranking, fears-ranking, and
-- legacy-map is a NOTE (it should surface on the Plan grid + wishes panels like every
-- other note), not activity data. Historically it was stored in entries.content:
--   * values_ranking / fears_ranking -> content.reflection
--   * legacy_map                     -> content.themes   (single free-text textarea)
-- so it never reached the notes pipeline. This backfills those into notes rows
-- (origin_type='reflection'), links each to its activity entry via entry_notes (the
-- same provenance pattern createPromptNote uses), and removes the source field from
-- content so there is one clean data path going forward.
--
-- Idempotent: an entry that already has a linked reflection note is skipped (its source
-- field is still cleared, harmlessly). Re-runnable. Transactional (a DO block runs in one
-- transaction) — any error aborts the whole migration rather than leaving a half-state.
--
-- DEPENDENCY: requires notes.origin_type to allow 'reflection'
-- (20260618_notes_origin_type_allow_reflection.sql). Re-asserted below — idempotently — so
-- this migration is self-sufficient even if run on its own; without it the INSERTs below
-- would fail with a 23514 check_violation.

-- Ensure the reflection origin_type is permitted before we insert any (see 20260618).
ALTER TABLE notes DROP CONSTRAINT IF EXISTS notes_origin_type_check;
ALTER TABLE notes ADD CONSTRAINT notes_origin_type_check
  CHECK (origin_type IN ('freeform', 'prompt', 'reflection'));

DO $$
DECLARE
  r          RECORD;
  v_note_id  uuid;
  v_text     text;
  v_field    text;
  n_matched  int := 0;
  n_migrated int := 0;
  n_skipped  int := 0;
BEGIN
  FOR r IN
    SELECT e.id, e.user_id, e.activity, e.created_at,
           CASE WHEN e.activity = 'legacy_map'
                THEN e.content->>'themes'
                ELSE e.content->>'reflection' END AS reflection_text
    FROM entries e
    WHERE e.activity IN ('values_ranking', 'fears_ranking', 'legacy_map')
  LOOP
    v_field := CASE WHEN r.activity = 'legacy_map' THEN 'themes' ELSE 'reflection' END;
    v_text  := r.reflection_text;

    -- Only entries that actually hold reflection text.
    IF v_text IS NULL OR length(trim(v_text)) = 0 THEN
      CONTINUE;
    END IF;
    n_matched := n_matched + 1;

    -- Idempotency: already migrated → just make sure the stale source field is gone.
    IF EXISTS (
      SELECT 1 FROM entry_notes en JOIN notes n ON n.id = en.note_id
      WHERE en.entry_id = r.id AND n.origin_type = 'reflection'
    ) THEN
      n_skipped := n_skipped + 1;
      UPDATE entries SET content = content - v_field WHERE id = r.id AND content ? v_field;
      CONTINUE;
    END IF;

    -- Create the reflection note (preserve rough chronology via the entry's created_at
    -- so it sorts sensibly in the Plan grid).
    INSERT INTO notes (user_id, content, origin_type, created_at)
    VALUES (r.user_id, trim(v_text), 'reflection', r.created_at)
    RETURNING id INTO v_note_id;

    -- Provenance link (lets the activity page rehydrate the noteId + the export read it back).
    INSERT INTO entry_notes (entry_id, note_id) VALUES (r.id, v_note_id);

    -- Remove the now-migrated source field from content (single source of truth = the note).
    UPDATE entries SET content = content - v_field WHERE id = r.id;

    n_migrated := n_migrated + 1;
  END LOOP;

  RAISE NOTICE 'activity-reflection migration: matched=%  migrated=%  skipped(already linked)=%',
    n_matched, n_migrated, n_skipped;
END $$;
