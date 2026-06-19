-- Allow origin_type='reflection' on the notes table.
--
-- The notes table (dashboard-created, not in a CREATE TABLE migration) carries a CHECK
-- constraint `notes_origin_type_check` that originally permitted only 'freeform' and
-- 'prompt'. Activity reflections (values-ranking, fears-ranking, legacy-map) are stored as
-- notes with origin_type='reflection' (createReflectionNote / createPromptNote pattern), so
-- the constraint must admit 'reflection' — otherwise every reflection save fails at the DB
-- with a 23514 check_violation ("new row ... violates check constraint
-- notes_origin_type_check"), and the write path is broken even though the app code is correct.
--
-- ORDER: apply this BEFORE 20260619_activity_reflections_to_notes.sql (which INSERTs
-- reflection notes) and before relying on the runtime write path. The filename sorts first.
--
-- Idempotent: drop-if-exists then re-add, so it is safe to re-run and converges to the
-- expanded allowed set regardless of the current constraint definition. Expanding the
-- allowed set never invalidates existing rows (all current values stay permitted), so the
-- ADD CONSTRAINT validation pass cannot fail on existing data.

ALTER TABLE notes DROP CONSTRAINT IF EXISTS notes_origin_type_check;
ALTER TABLE notes ADD CONSTRAINT notes_origin_type_check
  CHECK (origin_type IN ('freeform', 'prompt', 'reflection'));

DO $$
BEGIN
  RAISE NOTICE 'notes_origin_type_check updated — allowed origin_type values: freeform, prompt, reflection';
END $$;
