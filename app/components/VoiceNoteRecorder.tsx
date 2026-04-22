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
  // Called when user wants to re-record (parent should reset its phase)
  onReRecord?: () => void
  // Called when user deletes the saved note
  onDelete?: () => void
}

export default function VoiceNoteRecorder({ onSave, onCancel, saveStatus, onReRecord, onDelete }: Props) {
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

  function handleReRecord() {
    if (reviewUrl) URL.revokeObjectURL(reviewUrl)
    setReviewUrl(null)
    blobRef.current = null
    autoSavedRef.current = false
    setElapsed(0)
    setLimitReached(false)
    setPhase('recording')
    elapsedRef.current = 0
    onReRecord?.()

    navigator.mediaDevices.getUserMedia({ audio: true }).then((stream) => {
      const mimeType = mimeTypeRef.current
      const options = mimeType ? { mimeType } : {}
      const recorder = new MediaRecorder(stream, options)
      mediaRecorderRef.current = recorder
      chunksRef.current = []

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
          if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null }
          if (mediaRecorderRef.current?.state !== 'inactive') mediaRecorderRef.current?.stop()
        }
      }, 1000)
    }).catch(() => {
      setMicError('Microphone access was denied.')
    })
  }

  const remaining = MAX_RECORDING_SECONDS - elapsed

  if (micError) {
    return (
      <div style={{ padding: '12px 0' }}>
        <p style={{ fontSize: 13, color: 'rgba(0,0,0,0.6)', marginBottom: 8 }}>{micError}</p>
        <button onClick={onCancel} style={{ fontSize: 12, color: 'rgba(0,0,0,0.5)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
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
          <span style={{ fontSize: 14, fontWeight: 600, color: '#130426', fontVariantNumeric: 'tabular-nums' }}>
            {formatDuration(elapsed)}
          </span>
          <span style={{ fontSize: 12, color: 'rgba(0,0,0,0.4)', marginLeft: 4 }}>
            / {formatDuration(MAX_RECORDING_SECONDS)}
          </span>
        </div>

        {limitReached && (
          <p style={{ fontSize: 12, color: '#DB5835', margin: 0 }}>
            3-minute limit reached — recording stopped.
          </p>
        )}

        {remaining <= 30 && !limitReached && (
          <p style={{ fontSize: 12, color: 'rgba(0,0,0,0.5)', margin: 0 }}>
            {remaining}s remaining
          </p>
        )}

        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <button
            onClick={() => stopRecording()}
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: '#130426',
              background: 'none',
              border: '1px solid rgba(0,0,0,0.18)',
              borderRadius: 8,
              padding: '5px 12px',
              cursor: 'pointer',
            }}
          >
            Stop
          </button>
          <button
            onClick={onCancel}
            style={{ fontSize: 12, color: 'rgba(0,0,0,0.45)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
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
    ? 'Saved · Transcribing…'
    : saveStatus === 'saved'
    ? 'Saved to your materials'
    : 'Transcript unavailable'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: '8px 0' }}>
      {/* Audio player */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {reviewUrl && (
          <audio
            src={reviewUrl}
            controls
            style={{ flex: 1, height: 32, minWidth: 0 }}
          />
        )}
        <span style={{ fontSize: 12, color: 'rgba(0,0,0,0.4)', flexShrink: 0 }}>
          {formatDuration(reviewDuration)}
        </span>
      </div>

      {limitReached && (
        <p style={{ fontSize: 12, color: '#DB5835', margin: 0 }}>
          Recording stopped at the 3-minute limit.
        </p>
      )}

      {/* Save status */}
      <p style={{ fontSize: 13, fontWeight: 500, color: '#6B7280', margin: 0 }}>
        {statusText}
      </p>

      {/* Actions */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <button
          onClick={handleReRecord}
          style={{ fontSize: 13, fontWeight: 500, color: 'rgba(0,0,0,0.55)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
        >
          Re-record
        </button>
        {onDelete && (
          <button
            onClick={onDelete}
            style={{ fontSize: 13, fontWeight: 500, color: '#DB5835', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
          >
            Delete
          </button>
        )}
      </div>
    </div>
  )
}
