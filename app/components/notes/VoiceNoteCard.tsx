'use client'

import { useEffect, useRef, useState } from 'react'
import { getAudioSignedUrl, formatDuration } from '@/lib/voice-notes'
import type { Note } from '@/lib/notes'

// ---------------------------------------------------------------------------
// Decorative waveform — static bars fading left→right, signals "audio"
// ---------------------------------------------------------------------------

function DecorativeWaveform() {
  const heights = [4, 8, 14, 18, 20, 14, 18, 10, 16, 20, 12, 18, 8, 14, 20, 16, 12, 18, 10, 14, 8, 16, 12, 10, 8, 10, 8, 6]
  const n = heights.length
  const barW = 3
  const gap = 2
  const vbW = n * (barW + gap) - gap
  const vbH = 20

  return (
    <svg
      width="100%"
      height={vbH}
      viewBox={`0 0 ${vbW} ${vbH}`}
      preserveAspectRatio="none"
      aria-hidden
      style={{ display: 'block' }}
    >
      {heights.map((h, i) => (
        <rect
          key={i}
          x={i * (barW + gap)}
          y={(vbH - h) / 2}
          width={barW}
          height={h}
          rx={1}
          fill="#7C5CFF"
          fillOpacity={1 - (i / (n - 1)) * 0.7}
        />
      ))}
    </svg>
  )
}

// ---------------------------------------------------------------------------
// VoiceNoteCard
// ---------------------------------------------------------------------------

type Props = {
  note: Note
  promptContext: string | null
  actions: React.ReactNode
}

export default function VoiceNoteCard({ note, promptContext, actions }: Props) {
  const [signedUrl, setSignedUrl] = useState<string | null>(null)
  const [loadingUrl, setLoadingUrl] = useState(false)
  const [playing, setPlaying] = useState(false)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  const transcript = note.transcript || note.content || ''
  const status = note.transcription_status
  const duration = note.duration_seconds

  const hasTranscript = !!transcript && status !== 'pending'
  const isPending = status === 'pending'

  // Auto-play once signed URL resolves
  useEffect(() => {
    if (signedUrl && audioRef.current) {
      audioRef.current.play().catch(() => {})
    }
  }, [signedUrl])

  async function handlePlay() {
    if (!note.audio_url || loadingUrl) return

    if (!signedUrl) {
      setLoadingUrl(true)
      const url = await getAudioSignedUrl(note.audio_url)
      setLoadingUrl(false)
      if (url) setSignedUrl(url)
      return
    }

    if (playing) {
      audioRef.current?.pause()
    } else {
      audioRef.current?.play()
    }
  }

  const transcriptStyle: React.CSSProperties = hasTranscript
    ? { fontSize: '14px', lineHeight: '1.5', fontWeight: 400, color: '#1a1a1a' }
    : { fontSize: '14px', lineHeight: '1.5', fontWeight: 400, color: '#6B7280' }

  return (
    <div style={{
      background: '#FFFDF7',
      border: '1px solid #E6E3DA',
      borderRadius: '12px',
      boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
      padding: '12px 10px 8px',
      display: 'flex',
      flexDirection: 'column',
      gap: 0,
    }}>
      {/* Hidden audio element — mounts once URL is loaded */}
      {signedUrl && (
        <audio
          ref={audioRef}
          src={signedUrl}
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
          onEnded={() => setPlaying(false)}
        />
      )}

      {/* 1. Transcript / answer preview */}
      <p style={{
        ...transcriptStyle,
        margin: '0 0 8px 0',
        display: '-webkit-box',
        WebkitLineClamp: 2,
        WebkitBoxOrient: 'vertical',
        overflow: 'hidden',
      }}>
        {hasTranscript ? transcript : isPending ? 'Transcribing…' : 'Transcript unavailable'}
      </p>

      {/* 2. Divider */}
      <div style={{ borderTop: '1px solid #ECE7DF', marginBottom: '8px' }} />

      {/* 3. Prompt text — secondary, italic, only if present */}
      {promptContext && (
        <p style={{
          fontSize: '12px',
          lineHeight: '1.4',
          fontWeight: 400,
          fontStyle: 'italic',
          color: '#6B7280',
          margin: '0 0 8px 0',
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
        }}>
          {promptContext}
        </p>
      )}

      {/* 4. Audio bar — stable 40px, never shrinks */}
      <div style={{
        background: '#F2EEFF',
        borderRadius: '8px',
        height: '40px',
        minHeight: '40px',
        paddingLeft: '8px',
        paddingRight: '10px',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        marginBottom: '12px',
      }}>
        {/* Play / pause button */}
        <button
          onClick={handlePlay}
          disabled={loadingUrl || !note.audio_url}
          aria-label={playing ? 'Pause' : 'Play'}
          style={{
            width: '32px',
            height: '32px',
            borderRadius: '999px',
            background: '#7C5CFF',
            border: 'none',
            cursor: loadingUrl || !note.audio_url ? 'default' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            opacity: loadingUrl ? 0.6 : 1,
            transition: 'opacity 0.15s',
          }}
        >
          {playing ? (
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
              <rect x="3" y="2" width="4" height="12" rx="1" fill="white" />
              <rect x="9" y="2" width="4" height="12" rx="1" fill="white" />
            </svg>
          ) : (
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
              <path d="M5.5 3.5L12.5 8L5.5 12.5V3.5Z" fill="white" />
            </svg>
          )}
        </button>

        {/* Decorative waveform */}
        <div style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center' }}>
          <DecorativeWaveform />
        </div>

        {/* Duration */}
        {duration != null && (
          <span style={{
            fontSize: '12px',
            lineHeight: '1',
            fontWeight: 500,
            color: '#6B7280',
            flexShrink: 0,
          }}>
            {formatDuration(duration)}
          </span>
        )}
      </div>

      {/* 5. Actions */}
      <div style={{
        borderTop: '1px solid rgba(0,0,0,0.08)',
        paddingTop: '6px',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        flexShrink: 0,
      }}>
        {actions}
      </div>
    </div>
  )
}
