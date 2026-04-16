-- Migration: entries → notes
--
-- Migrates old lightweight entries into the notes table.
-- Safe to re-run: uses entry_notes as an idempotency guard.
-- Any entry already linked via entry_notes is skipped.
--
-- Included entry types:
--   activity = 'reflection_prompts'  → origin_type = 'prompt',   prompt_context = title
--   activity = 'notepad'             → origin_type = 'freeform',  prompt_context = NULL
--   activity IS NULL (freeform)      → origin_type = 'freeform',  prompt_context = NULL
--   any other unrecognised activity  → origin_type = 'freeform',  prompt_context = NULL
--
-- Excluded entry types:
--   document_type IS NOT NULL        (formal documents)
--   section = 'capture'             (capture-section entries)
--   activity = 'values_ranking'      (structured exercise output)
--   activity = 'fears_ranking'       (structured exercise output)
--
-- Rows that yield no meaningful text content are skipped.
-- Migrated notes preserve the original created_at timestamp.
-- entry_notes rows serve as both provenance and idempotency guard.

DO $$
DECLARE
  rec               RECORD;
  new_note_id       UUID;
  extracted_content TEXT;
  note_origin_type  TEXT;
  note_prompt_ctx   TEXT;
  migrated_count    INT := 0;
  skipped_count     INT := 0;
BEGIN

  FOR rec IN
    SELECT
      e.id,
      e.user_id,
      e.title,
      e.content,
      e.activity,
      e.created_at
    FROM entries e
    WHERE
      -- Exclude formal documents
      e.document_type IS NULL
      -- Exclude capture-section entries (NULL section rows are included)
      AND (e.section IS NULL OR e.section <> 'capture')
      -- Exclude structured exercise outputs; include NULL and all other activity values
      AND (
        e.activity IS NULL
        OR e.activity NOT IN ('values_ranking', 'fears_ranking')
      )
      -- Idempotency: skip entries already linked to a note
      AND NOT EXISTS (
        SELECT 1 FROM entry_notes en WHERE en.entry_id = e.id
      )
  LOOP

    -- Extract plain text from the content column.
    -- Uses pg_typeof to guard against implicit jsonb cast errors on text columns,
    -- then applies jsonb extraction for string and object values.
    -- Prefer known response-like keys for objects before falling back to first string value.
    extracted_content := NULL;

    IF rec.content IS NOT NULL THEN
      IF pg_typeof(rec.content)::text = 'text' THEN
        -- Plain text column: use the value directly
        extracted_content := NULLIF(trim(rec.content::text), '');

      ELSIF pg_typeof(rec.content)::text = 'jsonb' AND jsonb_typeof(rec.content) = 'string' THEN
        -- JSONB string: strip surrounding quotes via #>>'{}'
        extracted_content := NULLIF(trim(rec.content #>> '{}'), '');

      ELSIF pg_typeof(rec.content)::text = 'jsonb' AND jsonb_typeof(rec.content) = 'object' THEN
        -- JSONB object: prefer known response-like keys, fall back to first string value
        extracted_content := COALESCE(
          NULLIF(trim(rec.content #>> '{response}'), ''),
          NULLIF(trim(rec.content #>> '{content}'), ''),
          NULLIF(trim(rec.content #>> '{text}'), ''),
          (
            SELECT NULLIF(trim(val #>> '{}'), '')
            FROM jsonb_each(rec.content) AS kv(key, val)
            WHERE jsonb_typeof(val) = 'string'
            LIMIT 1
          )
        );
      END IF;
    END IF;

    -- Skip rows that yield no meaningful text
    IF extracted_content IS NULL OR extracted_content = '' THEN
      skipped_count := skipped_count + 1;
      CONTINUE;
    END IF;

    -- Determine origin_type and prompt_context
    IF rec.activity = 'reflection_prompts' THEN
      note_origin_type := 'prompt';
      note_prompt_ctx  := rec.title;   -- title holds the prompt text for these entries
    ELSE
      -- Covers: activity = 'notepad', activity IS NULL, any other value
      note_origin_type := 'freeform';
      note_prompt_ctx  := NULL;
    END IF;

    -- Create the note (updated_at is set by DB trigger)
    INSERT INTO notes (user_id, content, origin_type, prompt_context, created_at)
    VALUES (rec.user_id, extracted_content, note_origin_type, note_prompt_ctx, rec.created_at)
    RETURNING id INTO new_note_id;

    -- Record provenance and serve as idempotency guard on rerun
    INSERT INTO entry_notes (entry_id, note_id)
    VALUES (rec.id, new_note_id);

    migrated_count := migrated_count + 1;

  END LOOP;

  RAISE NOTICE 'Migration complete — migrated: %, skipped (no content): %',
    migrated_count, skipped_count;

END $$;


-- After running, verify with:
--
-- SELECT e.activity, count(*) as migrated
-- FROM entry_notes en
-- JOIN entries e ON e.id = en.entry_id
-- GROUP BY e.activity
-- ORDER BY migrated DESC;
--
-- SELECT count(*) FROM notes;
