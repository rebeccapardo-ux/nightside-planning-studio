-- Voice note fields for the notes table
-- Run this migration in the Supabase SQL editor or via the CLI

ALTER TABLE notes
  ADD COLUMN IF NOT EXISTS note_mode text NOT NULL DEFAULT 'text'
    CONSTRAINT notes_mode_check CHECK (note_mode IN ('text', 'audio'));

ALTER TABLE notes
  ADD COLUMN IF NOT EXISTS audio_url text;

ALTER TABLE notes
  ADD COLUMN IF NOT EXISTS transcript text;

ALTER TABLE notes
  ADD COLUMN IF NOT EXISTS duration_seconds integer;

ALTER TABLE notes
  ADD COLUMN IF NOT EXISTS transcription_status text
    CONSTRAINT notes_transcription_status_check CHECK (
      transcription_status IN ('pending', 'complete', 'failed')
    );

-- Storage bucket (run once in the Supabase dashboard → Storage, or via this SQL):
-- INSERT INTO storage.buckets (id, name, public) VALUES ('voice-notes', 'voice-notes', false)
-- ON CONFLICT (id) DO NOTHING;

-- RLS policies for the voice-notes bucket:
-- Users may upload only to their own sub-folder ({user_id}/*)
-- CREATE POLICY "voice_notes_insert" ON storage.objects FOR INSERT TO authenticated
--   WITH CHECK (
--     bucket_id = 'voice-notes' AND
--     auth.uid()::text = (storage.foldername(name))[1]
--   );
-- CREATE POLICY "voice_notes_select" ON storage.objects FOR SELECT TO authenticated
--   USING (
--     bucket_id = 'voice-notes' AND
--     auth.uid()::text = (storage.foldername(name))[1]
--   );
-- CREATE POLICY "voice_notes_delete" ON storage.objects FOR DELETE TO authenticated
--   USING (
--     bucket_id = 'voice-notes' AND
--     auth.uid()::text = (storage.foldername(name))[1]
--   );
