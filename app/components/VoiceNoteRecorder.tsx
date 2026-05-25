'use client'

import { useEffect, useRef, useState } from 'react'
import { getSupportedMimeType, formatDuration } from '@/lib/voice-notes'

export const MAX_RECORDING_SECONDS = 180 // 3 minutes

type RecorderPhase = 'recording' | 'review'

export type SaveStatus = 'saving' | 'transcribing' | 'saved' | 'failed'

type Props = {
  onSave: (blob: Blob, durationSeconds: number) => void
  onCancel: () => void
  // Post-save status injected by VoiceNoteButton
  saveStatus?: SaveStatus
  // Called when user deletes the saved note
  onDelete?: () => void
  theme?: 'light' | 'dark'
}

export default function VoiceNoteRecorder({ onSave, onCancel, saveStatus, onDelete, theme = 'light' }: Props) {
  const isDark = theme === 'dark'
  const c = {
    primary:   isDark ? '#f8f4eb'               : '#130426',
    secondary: isDark ? 'rgba(255,255,255,0.55)' : 'rgba(0,0,0,0.45)',
    muted:     isDark ? 'rgba(255,255,255,0.40)' : 'rgba(0,0,0,0.40)',
    status:    isDark ? 'rgba(255,255,255,0.88)' : '#374151',
    border:    isDark ? 'rgba(255,255,255,0.22)' : 'rgba(0,0,0,0.18)',
    error:     '#DB5835',
  }
  const [phase, setPhase] = useState<RecorderPhase>('recording')
  const [elapsed, setElapsed] = useState(0)
  const [limitReached, setLimitReached] = useState(false)
  const [reviewUrl, setReviewUrl] = useState<string | null>(null)
  const [reviewDuration, setReviewDuration] = useState(0)
  const [micError, setMicError] = useState<string | null>(null)

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const blobRef = useRef<Blob | null>(null)
  const mimeTypeRef = useRef<string>('')
  const elapsedRef = useRef(0)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const autoSavedRef = useRef(false) // prevent double-call on re-render

  // Start recording immediately on mount
  useEffect(() => {
    let cancelled = false

    async function startRecording() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
        if (cancelled) { stream.getTracks().forEach((t) => t.stop()); return }

        const mimeType = getSupportedMimeType()
        mimeTypeRef.current = mimeType
        const options = mimeType ? { mimeType } : {}
        const recorder = new MediaRecorder(stream, options)
        mediaRecorderRef.current = recorder
        chunksRef.current = []
        elapsedRef.current = 0

        recorder.ondataavailable = (e) => {
          if (e.data.size > 0) chunksRef.current.push(e.data)
        }

        recorder.onstop = () => {
          stream.getTracks().forEach((t) => t.stop())
          const blob = new Blob(chunksRef.current, { type: mimeType || 'audio/webm' })
          blobRef.current = blob
          const url = URL.createObjectURL(blob)
          setReviewUrl(url)
          setReviewDuration(elapsedRef.current)
          setPhase('review')
        }

        recorder.start(100)

        timerRef.current = setInterval(() => {
          elapsedRef.current += 1
          setElapsed(elapsedRef.current)
          if (elapsedRef.current >= MAX_RECORDING_SECONDS) {
            setLimitReached(true)
            stopRecording()
          }
        }, 1000)
      } catch {
        setMicError('Microphone access was denied. Please allow microphone access and try again.')
      }
    }

    startRecording()

    return () => {
      cancelled = true
      if (timerRef.current) clearInterval(timerRef.current)
      if (mediaRecorderRef.current?.state !== 'inactive') {
        mediaRecorderRef.current?.stop()
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Auto-save as soon as the blob is ready — no user action required
  useEffect(() => {
    if (phase === 'review' && blobRef.current && !autoSavedRef.current) {
      autoSavedRef.current = true
      onSave(blobRef.current, reviewDuration)
    }
  }, [phase, reviewDuration, onSave])

  // Revoke blob URL on unmount
  useEffect(() => {
    return () => {
      if (reviewUrl) URL.revokeObjectURL(reviewUrl)
    }
  }, [reviewUrl])

  function stopRecording() {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null }
    if (mediaRecorderRef.current?.state !== 'inactive') {
      mediaRecorderRef.current?.stop()
    }
  }

  const remaining = MAX_RECORDING_SECONDS - elapsed

  if (micError) {
    return (
      <div style={{ padding: '12px 0' }}>
        <p style={{ fontSize: 13, color: c.secondary, marginBottom: 8 }}>{micError}</p>
        <button onClick={onCancel} style={{ fontSize: 12, color: c.secondary, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
          Cancel
        </button>
      </div>
    )
  }

  // ── Recording phase ──────────────────────────────────────────────────────────

  if (phase === 'recording') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: '8px 0' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span
            style={{
              display: 'inline-block',
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: '#DB5835',
              flexShrink: 0,
              animation: 'voice-pulse 1.2s ease-in-out infinite',
            }}
          />
          <style>{`@keyframes voice-pulse { 0%,100%{opacity:1} 50%{opacity:0.3} }`}</style>
          <span style={{ fontSize: 14, fontWeight: 600, color: c.primary, fontVariantNumeric: 'tabular-nums' }}>
            {formatDuration(elapsed)}
          </span>
          <span style={{ fontSize: 12, color: c.muted, marginLeft: 4 }}>
            / {formatDuration(MAX_RECORDING_SECONDS)}
          </span>
        </div>

        {limitReached && (
          <p style={{ fontSize: 12, color: '#DB5835', margin: 0 }}>
            3-minute limit reached — recording stopped.
          </p>
        )}

        {remaining <= 30 && !limitReached && (
          <p style={{ fontSize: 12, color: c.secondary, margin: 0 }}>
            {remaining}s remaining
          </p>
        )}

        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <button
            onClick={() => stopRecording()}
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: c.primary,
              background: 'none',
              border: `1px solid ${c.border}`,
              borderRadius: 8,
              padding: '5px 12px',
              cursor: 'pointer',
            }}
          >
            Stop
          </button>
          <button
            onClick={onCancel}
            style={{ fontSize: 12, color: c.secondary, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
          >
            Cancel
          </button>
        </div>
      </div>
    )
  }

  // ── Review / post-save phase ─────────────────────────────────────────────────

  const statusText = !saveStatus || saveStatus === 'saving'
    ? 'Saving…'
    : saveStatus === 'transcribing'
    ? 'Transcribing…'
    : saveStatus === 'saved'
    ? ''
    : "Couldn't save — try again"

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: '8px 0' }}>
      {/* Audio player */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {reviewUrl && (
          // eslint-disable-next-line jsx-a11y/media-has-caption -- review playback of a just-recorded clip; no transcript exists yet
          <audio
            src={reviewUrl}
            controls
            aria-label="Review recording"
            style={{ flex: 1, height: 32, minWidth: 0 }}
          />
        )}
        <span style={{ fontSize: 12, color: c.muted, flexShrink: 0 }}>
          {formatDuration(reviewDuration)}
        </span>
      </div>

      {limitReached && (
        <p style={{ fontSize: 12, color: '#DB5835', margin: 0 }}>
          Recording stopped at the 3-minute limit.
        </p>
      )}

      {/* Save status + delete in a single row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
        {saveStatus === 'saved' ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true" style={{ flexShrink: 0 }}>
              <circle cx="7" cy="7" r="6" stroke={c.status} strokeWidth="1.3" />
              <path d="M4.5 7L6.2 8.8L9.5 5.5" stroke={c.status} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span style={{ fontSize: 13, fontWeight: 500, color: c.status }}>Saved to Your Plan</span>
          </div>
        ) : (
          <p style={{ fontSize: 13, fontWeight: 500, color: c.status, margin: 0 }}>
            {statusText}
          </p>
        )}
        {onDelete && (
          <button
            onClick={onDelete}
            onMouseEnter={e => { e.currentTarget.style.opacity = '1' }}
            onMouseLeave={e => { e.currentTarget.style.opacity = isDark ? '0.88' : '0.75' }}
            style={{
              fontSize: 13,
              fontWeight: 400,
              color: isDark ? '#F8F4EB' : 'rgba(19,4,38,0.85)',
              opacity: isDark ? 0.88 : 0.75,
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: 0,
              flexShrink: 0,
              transition: 'opacity 0.15s ease',
            }}
          >
            Delete
          </button>
        )}
      </div>
    </div>
  )
}
