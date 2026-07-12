'use client'

import { useEffect, useState } from 'react'
import { createSupabaseBrowserClient } from '@/lib/supabase-browser'
import { createVoiceNote, createVoicePromptNote, updateNoteAudioUrl, deleteNote } from '@/lib/notes'
import { uploadAudioBlob } from '@/lib/voice-notes'
import VoiceNoteRecorder from './VoiceNoteRecorder'
import ErrorMessagePill from './ErrorMessagePill'
import type { Note } from '@/lib/notes'
import type { SaveStatus } from './VoiceNoteRecorder'

// ---------------------------------------------------------------------------
// Save modes
// ---------------------------------------------------------------------------

export type VoiceNoteSaveMode =
  | { kind: 'freeform' }
  | { kind: 'prompt'; promptContext: string; promptId: string; entryId: string }

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

type Props = {
  saveMode: VoiceNoteSaveMode
  onSaved: (note: Note) => void
  // Visual context
  buttonLabel?: React.ReactNode
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
  // Whether the audio blob failed to upload to storage (storagePath === null). Lets the
  // saved-state distinguish "recording didn't save" from "transcription didn't run".
  const [audioUploadFailed, setAudioUploadFailed] = useState(false)
  const [isHovered, setIsHovered] = useState(false)

  const isDark = theme === 'dark'

  useEffect(() => {
    if (phase !== 'saved') return
    const timer = setTimeout(() => setPhase('idle'), 3000)
    return () => clearTimeout(timer)
  }, [phase])

  async function handleRecorderSave(blob: Blob, durationSeconds: number) {
    setPhase('uploading')
    setAudioUploadFailed(false)

    try {
      const supabase = createSupabaseBrowserClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      // 1. Create a fresh note record for EVERY recording. Each voice note is its
      //    own entry in Your Materials — consecutive recordings never replace one
      //    another (Delete removes a specific note). Previously we reused the prior
      //    note on re-record, which silently overwrote it.
      let note: Note
      if (saveMode.kind === 'prompt') {
        const created = await createVoicePromptNote({
          audioUrl: '',
          durationSeconds,
          promptContext: saveMode.promptContext,
          promptId: saveMode.promptId,
          entryId: saveMode.entryId,
        })
        if (!created) throw new Error('Failed to create note record')
        note = created
      } else {
        const created = await createVoiceNote({ audioUrl: '', durationSeconds })
        if (!created) throw new Error('Failed to create note record')
        note = created
      }

      // 2. Upload audio
      const storagePath = await uploadAudioBlob(blob, user.id, note.id)
      if (storagePath) {
        await updateNoteAudioUrl(note.id, storagePath)
        note = { ...note, audio_url: storagePath }
      } else {
        // The recording itself didn't get stored. Note still exists (transcription
        // uses the in-memory blob, not storage), but the audio is gone — flag it so
        // the saved-state shows the "couldn't save your recording" error, not success.
        setAudioUploadFailed(true)
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
    setAudioUploadFailed(false)
    setPhase('idle')
    onDelete?.()
  }

  function deriveSaveStatus(): SaveStatus | undefined {
    if (phase === 'uploading') return 'saving'
    if (phase === 'transcribing') return 'transcribing'
    if (phase === 'saved') {
      // Priority: a recording that didn't save is the headline failure — it wins even
      // if transcription also failed (transcription is moot without saved audio). Then
      // transcription-failed, then full success. Check === 'failed' (not !== 'complete')
      // so this only ever fires on a terminal failure — never a transient 'pending'
      // (which corresponds to phase 'transcribing' anyway, not 'saved').
      if (audioUploadFailed) return 'audio_failed'
      if (savedNote?.transcription_status === 'failed') return 'transcribe_failed'
      return 'saved'
    }
    return undefined
  }

  // Idle — new row layout
  if (phase === 'idle') {
    const hv = "'Helvetica Neue', Helvetica, Arial, sans-serif"
    const micColor = isDark ? 'rgba(255,255,255,0.9)' : '#2d3a6b'
    return (
      <button
        onClick={() => setPhase('recording')}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 10,
          padding: '8px 14px',
          borderRadius: 10,
          cursor: 'pointer',
          background: isHovered
            ? (isDark ? 'rgba(255,255,255,0.08)' : 'rgba(44,55,119,0.06)')
            : 'transparent',
          border: isDark ? '1.5px solid rgba(255,255,255,0.22)' : '1.5px solid rgba(44,55,119,0.2)',
          transition: 'background 0.15s ease',
          fontFamily: hv,
        }}
      >
        <svg width="18" height="18" viewBox="0 0 12 16" fill="none" aria-hidden style={{ flexShrink: 0 }}>
          <rect x="2.5" y="0.5" width="7" height="9" rx="3.5" fill={micColor} />
          <path d="M0.5 8c0 2.76 2.24 5 5.5 5s5.5-2.24 5.5-5" stroke={micColor} strokeWidth="1.5" strokeLinecap="round" fill="none" />
          <line x1="6" y1="13" x2="6" y2="15.5" stroke={micColor} strokeWidth="1.5" strokeLinecap="round" />
          <line x1="3.5" y1="15.5" x2="8.5" y2="15.5" stroke={micColor} strokeWidth="1.5" strokeLinecap="round" />
        </svg>
        <span style={{ fontSize: 14, fontWeight: 700, color: isDark ? '#ffffff' : '#2d3a6b' }}>
          Record a voice note
        </span>
        <span style={{
          fontSize: 11,
          fontWeight: 600,
          borderRadius: 100,
          padding: '3px 10px',
          background: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(44,55,119,0.12)',
          color: isDark ? '#ffffff' : '#2d3a6b',
          border: isDark ? '1px solid rgba(255,255,255,0.25)' : '1px solid rgba(44,55,119,0.25)',
        }}>
          auto-transcribed
        </span>
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
        onDelete={phase === 'saved' ? handleDelete : undefined}
        theme={theme}
      />
    )
  }

  // Error
  return (
    <div style={{ padding: '8px 0' }}>
      <div style={{ marginBottom: 6 }}>
        <ErrorMessagePill>{errorMsg}</ErrorMessagePill>
      </div>
      <button
        onClick={() => { setPhase('idle'); setErrorMsg('') }}
        style={{ fontSize: 12, color: 'rgba(0,0,0,0.45)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
      >
        Try again
      </button>
    </div>
  )
}
