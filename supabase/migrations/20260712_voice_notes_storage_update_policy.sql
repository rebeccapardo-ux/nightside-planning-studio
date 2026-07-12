-- Add the missing UPDATE policy for the voice-notes storage bucket.
--
-- Bug: recording a voice note a SECOND time on the same reflection prompt /
-- trivia card (without reloading) failed with "We couldn't save your recording."
-- VoiceNoteButton reuses the same note id on re-record, so the audio uploads to
-- the SAME path ({user_id}/{note_id}.{ext}) with upsert:true — i.e. an overwrite,
-- which storage treats as an UPDATE. The bucket had only INSERT / SELECT / DELETE
-- policies (see 20250420_voice_note_fields.sql), so the overwrite was denied by
-- RLS and uploadAudioBlob() returned null. The first recording (INSERT to a new
-- path) and a post-reload recording (new note id → new path → INSERT) both work,
-- which is why only the second-in-a-row recording failed.
--
-- Fix: grant owners UPDATE on their own objects in the voice-notes bucket, mirroring
-- the existing owner-scoped INSERT/SELECT/DELETE pattern ({user_id} is the first
-- path segment). UPDATE requires BOTH USING (row visibility) and WITH CHECK (new row).
--
-- Apply in the Supabase SQL Editor (storage policies are not auto-run). Idempotent.

DROP POLICY IF EXISTS "voice_notes_update" ON storage.objects;

CREATE POLICY "voice_notes_update" ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'voice-notes' AND
    auth.uid()::text = (storage.foldername(name))[1]
  )
  WITH CHECK (
    bucket_id = 'voice-notes' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );
