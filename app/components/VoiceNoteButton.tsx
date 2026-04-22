'use client'

import { useState } from 'react'
import { createSupabaseBrowserClient } from '@/lib/supabase-browser'
import { createVoiceNote, createVoicePromptNote, updateNoteAudioUrl, deleteNote } from '@/lib/notes'
import { uploadAudioBlob } from '@/lib/voice-notes'
import VoiceNoteRecorder from './VoiceNoteRecorder'
import type { Note } from '@/lib/notes'
import type { SaveStatus } from './VoiceNoteRecorder'

// ---------------------------------------------------------------------------
// Save modes
// ---------------------------------------------------------------------------

export type VoiceNoteSaveMode =
  | { kind: 'freeform' }
  | { kind: 'prompt'; promptContext: string; entryId: string }

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

type Props = {
  saveMode: VoiceNoteSaveMode
  onSaved: (note: Note) => void
  // Visual context
  buttonLabel?: string
  theme?: 'light' | 'dark'
  // Skip the idle button and go straight to recording
  autoStart?: boolean
  // Called after the user deletes the saved note
  onDelete?: () => void
}

type Phase = 'idle' | 'recording' | 'uploading' | 'transcribing' | 'saved' | 'error'

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function VoiceNoteButton({
  saveMode,
  onSaved,
  buttonLabel = '🎤 Voice note',
  theme = 'light',
  autoStart = false,
  onDelete,
}: Props) {
  const [phase, setPhase] = useState<Phase>(autoStart ? 'recording' : 'idle')
  const [errorMsg, setErrorMsg] = useState('')
  const [savedNote, setSavedNote] = useState<Note | null>(null)

  const isDark = theme === 'dark'

  async function handleRecorderSave(blob: Blob, durationSeconds: number) {
    setPhase('uploading')

    try {
      const supabase = createSupabaseBrowserClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      // 1. Create note record
      let note: Note | null
      if (saveMode.kind === 'prompt') {
        note = await createVoicePromptNote({
          audioUrl: '',
          durationSeconds,
          promptContext: saveMode.promptContext,
          entryId: saveMode.entryId,
        })
      } else {
        note = await createVoiceNote({ audioUrl: '', durationSeconds })
      }
      if (!note) throw new Error('Failed to create note record')

      // 2. Upload audio
      const storagePath = await uploadAudioBlob(blob, user.id, note.id)
      if (storagePath) {
        await updateNoteAudioUrl(note.id, storagePath)
        note = { ...note, audio_url: storagePath }
      }

      // 3. Transcribe
      setPhase('transcribing')
      const ext = blob.type.includes('mp4') ? 'mp4' : 'webm'
      const form = new FormData()
      form.append('audio', new File([blob], `recording.${ext}`, { type: blob.type }))
      form.append('noteId', note.id)

      let finalNote: Note = { ...note, transcription_status: 'failed' }
      try {
        const res = await fetch('/api/transcribe', { method: 'POST', body: form })
        if (res.ok) {
          const { transcript } = (await res.json()) as { transcript?: string }
          finalNote = { ...note, content: transcript ?? '', transcript: transcript ?? null, transcription_status: 'complete' }
        }
      } catch {
        finalNote = { ...note, transcription_status: 'failed' }
      }

      setSavedNote(finalNote)
      setPhase('saved')
      onSaved(finalNote)
    } catch (err) {
      console.error('VoiceNoteButton save error:', err)
      setErrorMsg('Something went wrong. Please try again.')
      setPhase('error')
    }
  }

  async function handleDelete() {
    if (savedNote) await deleteNote(savedNote.id)
    setSavedNote(null)
    setPhase('idle')
    onDelete?.()
  }

  function deriveSaveStatus(): SaveStatus | undefined {
    if (phase === 'uploading') return 'saving'
    if (phase === 'transcribing') return 'transcribing'
    if (phase === 'saved') return savedNote?.transcription_status === 'complete' ? 'saved' : 'failed'
    return undefined
  }

  // Idle — trigger button
  if (phase === 'idle') {
    return (
      <button
        onClick={() => setPhase('recording')}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 5,
          fontSize: 12,
          fontWeight: 500,
          color: isDark ? 'rgba(255,255,255,0.65)' : 'rgba(0,0,0,0.45)',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          padding: 0,
        }}
        className="hover:opacity-80 transition-opacity"
      >
        {buttonLabel}
      </button>
    )
  }

  // Recording + all post-record phases — keep VoiceNoteRecorder mounted
  if (phase === 'recording' || phase === 'uploading' || phase === 'transcribing' || phase === 'saved') {
    return (
      <VoiceNoteRecorder
        onSave={handleRecorderSave}
        onCancel={() => setPhase('idle')}
        saveStatus={deriveSaveStatus()}
        onReRecord={() => { setSavedNote(null); setPhase('recording') }}
        onDelete={phase === 'saved' ? handleDelete : undefined}
      />
    )
  }

  // Error
  return (
    <div style={{ padding: '8px 0' }}>
      <p style={{ fontSize: 12, color: '#DB5835', marginBottom: 6 }}>{errorMsg}</p>
      <button
        onClick={() => { setPhase('idle'); setErrorMsg('') }}
        style={{ fontSize: 12, color: 'rgba(0,0,0,0.45)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
      >
        Try again
      </button>
    </div>
  )
}
