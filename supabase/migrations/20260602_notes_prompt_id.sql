-- 20260602_notes_prompt_id.sql
--
-- 1A: introduce a stable prompt_id on notes to replace the label-text-as-key
-- pattern (notes.prompt_context held the literal prompt prose and was used as a
-- join key). prompt_id stores the stable REFLECT_PROMPT_META id (prompt_1..prompt_43).
--
-- This migration:
--   1. adds notes.prompt_id (nullable text)
--   2. indexes (user_id, prompt_id) to serve the lookups that currently filter
--      on prompt_context
--   3. backfills prompt_id from REFLECT_PROMPT_META, in two passes:
--        (a) primary      — exact match on notes.prompt_context
--        (b) second-chance — via entry_notes -> entries.title for still-null rows
--   4. RAISE NOTICEs the matched/unmatched counts so they're visible on run.
--
-- prompt_context is intentionally LEFT INTACT as a denormalized display field.
-- No write-path or read-path code is changed here (that is commit 2+).
--
-- Run in the Supabase SQL editor (or via the CLI). Idempotent and safe to re-run:
-- every backfill UPDATE is guarded by `prompt_id IS NULL`, so a second run is a no-op.

-- 1. Column ------------------------------------------------------------------
ALTER TABLE notes
  ADD COLUMN IF NOT EXISTS prompt_id text;

-- 2. Index to serve prompt_id lookups (replaces prompt_context filters) -------
CREATE INDEX IF NOT EXISTS notes_user_prompt_id_idx
  ON notes (user_id, prompt_id)
  WHERE prompt_id IS NOT NULL;

-- 3. Backfill + reporting ----------------------------------------------------
DO $$
DECLARE
  v_total        bigint;
  v_primary      bigint;
  v_secondchance bigint;
  v_unmatched    bigint;
BEGIN
  -- Canonical (label -> id) map, generated verbatim from REFLECT_PROMPT_META
  -- (lib/content-metadata.ts). Single quotes in labels are doubled per SQL.
  DROP TABLE IF EXISTS _prompt_label_map;
  CREATE TEMP TABLE _prompt_label_map (label text PRIMARY KEY, id text NOT NULL) ON COMMIT DROP;
  INSERT INTO _prompt_label_map (label, id) VALUES
    ('What matters most to you right now?', 'prompt_1'),
    ('What would you want someone making decisions for you to understand?', 'prompt_2'),
    ('What feels unresolved or unclear?', 'prompt_3'),
    ('What was your earliest experience with death? What do you remember about it?', 'prompt_4'),
    ('If you could choose the setting for your final moments, where would you be and who would be with you?', 'prompt_5'),
    ('If you were unable to make decisions for yourself, who would you want to make those decisions, and why?', 'prompt_6'),
    ('What are a few of your favorite special traditions?', 'prompt_7'),
    ('What do you believe happens when we die? How does this influence your relationship to death?', 'prompt_8'),
    ('How would you want your body to be handled after death, and why?', 'prompt_9'),
    ('If you could leave behind a time capsule for future generations of your family, what 3 items would you include and why?', 'prompt_10'),
    ('Have you ever witnessed someone have a "good death"? What made it good?', 'prompt_11'),
    ('If you could write your own obituary, what key elements would you include?', 'prompt_12'),
    ('Is there anyone you haven''t spoken to in a long time that you would want to talk to before you died?', 'prompt_13'),
    ('What is your favorite routine or habit?', 'prompt_14'),
    ('What is one goal or dream you''ve been putting off that you would regret not pursuing if you died tomorrow?', 'prompt_15'),
    ('What''s one book, movie, or piece of art that has deeply influenced how you think about life or death?', 'prompt_16'),
    ('What''s one thing you''ve been holding back from doing or saying that would bring you peace if you acted on it?', 'prompt_17'),
    ('If you found out you had a few months left, what would you change about your life?', 'prompt_18'),
    ('If you needed help going to the bathroom or bathing, who would you feel most comfortable asking?', 'prompt_19'),
    ('What do you worry most about when thinking about your future health and care?', 'prompt_20'),
    ('Who do you go to first for advice?', 'prompt_21'),
    ('What does a good day look like for you?', 'prompt_22'),
    ('What situations do you find stressful or difficult?', 'prompt_23'),
    ('Reflecting on challenges you''ve had in the past, what has brought you strength and comfort?', 'prompt_24'),
    ('Fill in the blank: I want to live in my body as long as…', 'prompt_25'),
    ('What does quality of life mean to you?', 'prompt_26'),
    ('Is there anything you would want to be forgiven for before you die?', 'prompt_27'),
    ('Is there anyone or anything you would want to forgive before you die?', 'prompt_28'),
    ('If you had one year to live, what would you give yourself permission to do?', 'prompt_29'),
    ('If you could control one aspect of your death, what would it be?', 'prompt_30'),
    ('Who knows the best stories about you?', 'prompt_31'),
    ('Who do you trust with your secrets?', 'prompt_32'),
    ('What were your childhood experiences of funerals or memorials? What impressions did they leave on you?', 'prompt_33'),
    ('What aspect of death or dying have you struggled the most to accept or understand?', 'prompt_34'),
    ('What are three things that bring you the most joy in life?', 'prompt_35'),
    ('Think of a mentor or role model who has passed. What''s the most valuable lesson they left you with?', 'prompt_36'),
    ('If you could relive one moment in your life, not to change it but to experience it again, what moment would you choose?', 'prompt_37'),
    ('If you had the chance to write a letter to your younger self about life''s most important lessons, what would you include?', 'prompt_38'),
    ('What''s one thing you hope people will always remember about you, no matter how much time has passed?', 'prompt_39'),
    ('What rituals or ceremonies—personal, cultural, or religious—are meaningful to you?', 'prompt_40'),
    ('If you could choose one personal item to be included in your final resting place, what would it be?', 'prompt_41'),
    ('If you could be remembered for one specific contribution to your community, family, or loved ones, what would it be?', 'prompt_42'),
    ('You have the opportunity to donate to one cause in your will. What''s the focus of your legacy gift?', 'prompt_43');

  -- Total prompt notes in scope.
  SELECT count(*) INTO v_total
  FROM notes
  WHERE origin_type = 'prompt';

  -- (a) Primary backfill — exact match on prompt_context.
  UPDATE notes n
  SET prompt_id = m.id
  FROM _prompt_label_map m
  WHERE n.origin_type = 'prompt'
    AND n.prompt_id IS NULL
    AND n.prompt_context = m.label;
  GET DIAGNOSTICS v_primary = ROW_COUNT;

  -- (b) Second-chance backfill — via entry_notes -> entries.title for rows the
  --     primary pass left null (e.g. notes whose prompt_context drifted but whose
  --     originating reflection_prompts entry title still matches).
  UPDATE notes n
  SET prompt_id = m.id
  FROM entry_notes en
  JOIN entries e           ON e.id = en.entry_id
  JOIN _prompt_label_map m ON m.label = e.title
  WHERE n.id = en.note_id
    AND n.origin_type = 'prompt'
    AND n.prompt_id IS NULL
    AND e.activity = 'reflection_prompts';
  GET DIAGNOSTICS v_secondchance = ROW_COUNT;

  -- Remaining unmatched.
  SELECT count(*) INTO v_unmatched
  FROM notes
  WHERE origin_type = 'prompt'
    AND prompt_id IS NULL;

  RAISE NOTICE '--- notes.prompt_id backfill ---------------------------------';
  RAISE NOTICE 'Total prompt notes (origin_type = prompt): %', v_total;
  RAISE NOTICE 'Matched via primary (prompt_context):      %', v_primary;
  RAISE NOTICE 'Matched via second-chance (entry title):   %', v_secondchance;
  RAISE NOTICE 'Remaining UNMATCHED (prompt_id IS NULL):    %', v_unmatched;
  RAISE NOTICE '-------------------------------------------------------------';
END $$;
