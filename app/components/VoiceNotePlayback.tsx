'use client'

import { useRef, useState } from 'react'
import { getAudioSignedUrl, formatDuration } from '@/lib/voice-notes'
import type { Note } from '@/lib/notes'

type Props = {
  note: Note
  // visual context — 'dark' for dark panel backgrounds, 'light' for cream/light
  theme?: 'dark' | 'light'
}

export default function VoiceNotePlayback({ note, theme = 'light' }: Props) {
  const [signedUrl, setSignedUrl] = useState<string | null>(null)
  const [loadingUrl, setLoadingUrl] = useState(false)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  const isDark = theme === 'dark'
  const textMuted = isDark ? 'rgba(255,255,255,0.55)' : 'rgba(0,0,0,0.45)'
  const textPrimary = isDark ? '#FFFFFF' : '#130426'
  const textBody = isDark ? 'rgba(255,255,255,0.82)' : 'rgba(0,0,0,0.75)'

  async function handlePlay() {
    if (!note.audio_url) return
    if (signedUrl) {
      audioRef.current?.play()
      return
    }
    setLoadingUrl(true)
    const url = await getAudioSignedUrl(note.audio_url)
    setSignedUrl(url)
    setLoadingUrl(false)
  }

  const duration = note.duration_seconds
  const status = note.transcription_status
  const transcript = note.transcript || note.content

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {/* Playback row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        {signedUrl ? (
          // eslint-disable-next-line jsx-a11y/media-has-caption -- transcript rendered adjacent and linked via aria-describedby
          <audio
            ref={audioRef}
            src={signedUrl}
            controls
            autoPlay
            aria-describedby={transcript ? `voice-note-transcript-${note.id}` : undefined}
            style={{ flex: 1, height: 32, minWidth: 0 }}
          />
        ) : (
          <button
            onClick={handlePlay}
            disabled={loadingUrl || !note.audio_url}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              fontSize: 13,
              fontWeight: 600,
              color: isDark ? '#FFFFFF' : '#2C3777',
              background: 'none',
              border: 'none',
              cursor: loadingUrl ? 'default' : 'pointer',
              padding: 0,
              opacity: loadingUrl ? 0.6 : 1,
            }}
          >
            <span style={{ fontSize: 16 }}>▶</span>
            {loadingUrl ? 'Loading…' : 'Play'}
          </button>
        )}

        {duration != null && !signedUrl && (
          <span style={{ fontSize: 12, color: textMuted, flexShrink: 0 }}>
            {formatDuration(duration)}
          </span>
        )}
      </div>

      {/* Transcript / status */}
      {status === 'pending' && (
        <p style={{ fontSize: 12, color: textMuted, fontStyle: 'italic', margin: 0 }}>
          Transcribing…
        </p>
      )}

      {status === 'complete' && transcript && (
        <p
          id={`voice-note-transcript-${note.id}`}
          style={{
            fontSize: 13,
            lineHeight: '1.55',
            color: textBody,
            margin: 0,
            whiteSpace: 'pre-wrap',
          }}
        >
          {transcript}
        </p>
      )}

      {status === 'failed' && (
        <p style={{ fontSize: 12, color: textMuted, margin: 0 }}>
          Transcript unavailable
        </p>
      )}

      {/* No status set yet (legacy/incomplete saves) */}
      {!status && note.note_mode === 'audio' && !transcript && (
        <p style={{ fontSize: 12, color: textMuted, fontStyle: 'italic', margin: 0 }}>
          Voice note
        </p>
      )}
    </div>
  )
}
