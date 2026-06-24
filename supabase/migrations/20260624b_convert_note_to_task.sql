-- "Make this a task" (Phase 1, PR 4) — note -> user-task conversion RPC.
--
-- A SECURITY DEFINER function that performs the DESTRUCTIVE half of the
-- conversion as ONE transaction: it creates the user task and tears down the
-- note (+ its links, + origin-aware its entry). Storage (a voice note's audio
-- object) lives OUTSIDE the database and cannot participate in this transaction;
-- the calling service-role route deletes it best-effort after this returns
-- (the function hands back audio_url / note_mode for that purpose).
--
-- INVOCATION: called only by the thin service-role route POST /api/notes/
-- convert-to-task (see PR 4 chunk 2). Because the service role has no JWT,
-- `auth.uid()` is null in here, so ownership is checked against the p_user_id
-- the route passes (the route authenticates the session first, mirroring
-- delete-account / recover-account). EXECUTE is granted to service_role only.
--
-- Idempotent migration: CREATE OR REPLACE; safe to re-run.

CREATE OR REPLACE FUNCTION public.convert_note_to_task(
  p_user_id   uuid,
  p_note_id   uuid,
  p_domain_id uuid,
  p_row_key   text,
  p_label     text
)
RETURNS TABLE (
  task_id         uuid,
  task_domain_id  uuid,
  task_row_key    text,
  task_label      text,
  task_checked    boolean,
  task_created_at timestamptz,
  task_updated_at timestamptz,
  note_audio_url  text,
  note_mode       text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_note    record;
  v_task    record;
  v_trimmed text := btrim(p_label);
BEGIN
  -- IDEMPOTENCY CONTRACT: if the note no longer exists (e.g. a second browser
  -- tab already converted it), this is a no-op — return an EMPTY result set. The
  -- route treats an empty return as "already handled," not an error. The owner
  -- predicate (user_id = p_user_id) doubles as the authorization check, since
  -- SECURITY DEFINER + service-role context bypasses RLS and auth.uid() is null.
  SELECT id, user_id, origin_type, note_mode, audio_url
    INTO v_note
    FROM notes
   WHERE id = p_note_id AND user_id = p_user_id;
  IF NOT FOUND THEN
    RETURN;  -- empty set
  END IF;

  -- DEFENSE IN DEPTH: the destination domain must be one of THIS user's own
  -- containers. RLS would normally enforce this on a user_checkboxes insert, but
  -- SECURITY DEFINER bypasses it — so validate ownership explicitly. A client
  -- that POSTs someone else's domain_id is rejected here, not silently honored.
  IF NOT EXISTS (SELECT 1 FROM containers WHERE id = p_domain_id AND user_id = p_user_id) THEN
    RAISE EXCEPTION 'destination domain % does not belong to user %', p_domain_id, p_user_id;
  END IF;

  -- Backstop: the modal pre-fills + lets the user edit the label, but never
  -- persist an empty task.
  IF v_trimmed = '' THEN
    RAISE EXCEPTION 'task label must not be empty';
  END IF;

  -- 1. Create the task (the durable outcome). The whole function is one
  --    transaction, so this ordering is for readability, not atomicity.
  INSERT INTO user_checkboxes (user_id, domain_id, row_key, label, checked)
  VALUES (p_user_id, p_domain_id, p_row_key, v_trimmed, false)
  RETURNING id, domain_id, row_key, label, checked, created_at, updated_at
       INTO v_task;

  -- 2. ORIGIN-AWARE entries cleanup — load-bearing, do not "simplify" to always
  --    delete (or never delete) the entry:
  --      * origin_type='prompt': the entries row exists ONLY to back this note
  --        (a reflect-prompt answer). DELETE it, so the prompt reads as
  --        unanswered next visit. If we left it, the Pass-2 saveText fix would
  --        RESURRECT a note for the converted-away prompt — loadExisting finds
  --        the surviving entry, and the next keystroke recreates a note. Deleting
  --        the entry here is what closes that loop.
  --      * origin_type='reflection': the entries row holds the ACTIVITY OUTPUT
  --        (values/fears rankings, legacy-map moments). The reflection note is
  --        only commentary ON it. PRESERVE the entry — deleting it would destroy
  --        unrelated user work.
  --      * origin_type='freeform': no entry exists; nothing to delete.
  IF v_note.origin_type = 'prompt' THEN
    DELETE FROM entries
     WHERE user_id = p_user_id
       AND id IN (SELECT entry_id FROM entry_notes WHERE note_id = p_note_id);
  END IF;

  -- 3. Delete every link row that references the note. We delete these
  --    EXPLICITLY rather than relying on FK ON DELETE CASCADE: these junction
  --    tables were created in the Supabase dashboard and their cascade rules are
  --    not guaranteed in migration history. Explicit deletes are correct whether
  --    or not a cascade exists, keep the teardown auditable in one place, and
  --    make this function self-contained.
  DELETE FROM entry_notes         WHERE note_id = p_note_id;
  DELETE FROM container_notes     WHERE note_id = p_note_id;
  DELETE FROM domain_hidden_notes WHERE note_id = p_note_id;

  -- 4. Finally, the note row itself.
  DELETE FROM notes WHERE id = p_note_id;

  -- Hand back the created task + the note's audio info. Storage is outside this
  -- transaction, so the route deletes the audio object (if any) best-effort after
  -- we return.
  RETURN QUERY
    SELECT v_task.id, v_task.domain_id, v_task.row_key, v_task.label,
           v_task.checked, v_task.created_at, v_task.updated_at,
           v_note.audio_url, v_note.note_mode;
END;
$$;

-- Service-role only — the conversion route is the sole caller. Never the browser.
REVOKE EXECUTE ON FUNCTION public.convert_note_to_task(uuid, uuid, uuid, text, text) FROM PUBLIC, anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.convert_note_to_task(uuid, uuid, uuid, text, text) TO service_role;

DO $$
BEGIN
  RAISE NOTICE 'convert_note_to_task(uuid,uuid,uuid,text,text) ready (note -> task conversion; service_role only).';
END $$;
