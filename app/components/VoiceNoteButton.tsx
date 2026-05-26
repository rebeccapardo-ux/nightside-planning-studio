'use client'

import { useEffect, useRef, useState } from 'react'
import { createSupabaseBrowserClient } from '@/lib/supabase-browser'
import { createVoiceNote, createVoicePromptNote, updateNoteAudioUrl, deleteNote, resetVoiceNote } from '@/lib/notes'
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
  | { kind: 'prompt'; promptContext: string; entryId: string }

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
  const [isHovered, setIsHovered] = useState(false)
  const prevNoteRef = useRef<Note | null>(null)

  const isDark = theme === 'dark'

  useEffect(() => {
    if (phase !== 'saved') return
    const timer = setTimeout(() => setPhase('idle'), 3000)
    return () => clearTimeout(timer)
  }, [phase])

  async function handleRecorderSave(blob: Blob, durationSeconds: number) {
    setPhase('uploading')

    try {
      const supabase = createSupabaseBrowserClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      // 1. Create note record — or reuse existing on re-record
      let note: Note
      const existing = prevNoteRef.current
      if (existing) {
        await resetVoiceNote(existing.id, durationSeconds)
        note = { ...existing, audio_url: null, duration_seconds: durationSeconds, content: '', transcript: null, transcription_status: 'pending' }
      } else if (saveMode.kind === 'prompt') {
        const created = await createVoicePromptNote({
          audioUrl: '',
          durationSeconds,
          promptContext: saveMode.promptContext,
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

      prevNoteRef.current = finalNote
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
    prevNoteRef.current = null
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
