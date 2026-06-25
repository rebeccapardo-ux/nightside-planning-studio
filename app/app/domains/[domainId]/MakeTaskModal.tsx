'use client'

import { useEffect, useRef, useState } from 'react'
import { getDomainStructureByCode } from '@/lib/domain-structure'
import { OTHER_ROW_KEY } from '@/lib/user-tasks'
import type { Note, Container } from '@/lib/notes'

export type TaskDestination = { domainId: string; rowKey: string; label: string }

// "Convert to a task" picker (PR 4). Editable label (pre-filled from the note's
// content / voice transcript) + a destination row WITHIN the current domain
// (conversions always land here; to file elsewhere, add the note to that domain
// first). A destructive-conversion warning sits above, dismissable per note type.
// Component only — NoteCard wiring + the conversion handler live in chunk 4.
export default function MakeTaskModal({
  note,
  domain,
  textWarningDismissed,
  voiceWarningDismissed,
  onDismissTextWarning,
  onDismissVoiceWarning,
  onConfirm,
  onClose,
}: {
  note: Note
  domain: Container
  textWarningDismissed: boolean
  voiceWarningDismissed: boolean
  onDismissTextWarning: () => void
  onDismissVoiceWarning: () => void
  onConfirm: (dest: TaskDestination) => void
  onClose: () => void
}) {
  // Destructive-conversion warning — symmetric: both note types can dismiss it
  // (the copy is the load-bearing part; a dismiss is an informed choice). Separate
  // flags so a user can keep the higher-stakes voice warning while hiding text.
  const isVoice = note.note_mode === 'audio'
  const showWarning = isVoice ? !voiceWarningDismissed : !textWarningDismissed
  const warningTail = isVoice
    ? 'permanently deletes this note and the voice recording.'
    : 'permanently deletes this note.'
  const onDismissWarning = isVoice ? onDismissVoiceWarning : onDismissTextWarning

  // Pre-fill from content; for voice notes content holds the transcript. An empty
  // transcript (succeeded-but-no-text) just yields an empty field to type into.
  const [label, setLabel] = useState((note.content ?? '').trim())
  const [rowKey, setRowKey] = useState<string | null>(null)
  const labelRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  useEffect(() => { labelRef.current?.focus() }, [])

  const rows = getDomainStructureByCode(domain.domain_code)?.readiness ?? []
  const canCreate = label.trim().length > 0 && rowKey !== null

  function handleCreate() {
    if (!canCreate || rowKey === null) return
    onConfirm({ domainId: domain.id, rowKey, label: label.trim() })
  }

  return (
    <div style={{ position: 'fixed', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: 20 }}>
      {/* Backdrop (click to close) — a real button so it's keyboard/a11y-friendly */}
      <button
        aria-label="Close"
        onClick={onClose}
        style={{ position: 'absolute', inset: 0, background: 'rgba(19,4,38,0.45)', border: 'none', cursor: 'default', padding: 0 }}
      />
      <div
        style={{ position: 'relative', zIndex: 1, background: '#F8F4EB', borderRadius: 16, maxWidth: 560, width: '100%', maxHeight: '85vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 12px 40px rgba(0,0,0,0.25)' }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, padding: '20px 24px', borderBottom: '1px solid rgba(19,4,38,0.10)' }}>
          <p style={{ fontSize: 18, fontWeight: 700, color: '#130426', margin: 0 }}>Convert to a task</p>
          <button onClick={onClose} aria-label="Close" style={{ fontSize: 22, lineHeight: 1, color: 'rgba(19,4,38,0.6)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>×</button>
        </div>

        {/* Body */}
        <div style={{ overflowY: 'auto', padding: '16px 24px' }}>
          {showWarning && (
            <div style={{ background: '#F8E8DD', border: '1px solid rgba(219,88,53,0.35)', borderRadius: 8, padding: '10px 12px', marginBottom: 16, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
              <p style={{ fontSize: 13, color: '#8A3D1C', lineHeight: 1.5, margin: 0 }}>
                Converting to task <strong>{warningTail}</strong>
              </p>
              <button
                onClick={onDismissWarning}
                style={{ flexShrink: 0, fontSize: 12, fontWeight: 600, color: '#8A3D1C', background: 'none', border: 'none', cursor: 'pointer', padding: 0, textDecoration: 'underline', whiteSpace: 'nowrap' }}
                className="hover:opacity-75 transition-opacity"
              >
                Don&apos;t show again
              </button>
            </div>
          )}

          <p style={{ fontSize: 13, fontWeight: 600, color: '#130426', margin: '0 0 6px 0' }}>Task</p>
          <input
            ref={labelRef}
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="Describe the task…"
            aria-label="Task"
            style={{ width: '100%', fontSize: 14, color: '#130426', background: '#FFFFFF', border: '1px solid rgba(19,4,38,0.20)', borderRadius: 8, padding: '8px 10px', outline: 'none', marginBottom: 18 }}
          />

          {/* Destination row — always the current domain */}
          <p style={{ fontSize: 13, fontWeight: 600, color: '#130426', margin: '0 0 8px 0' }}>Where in {domain.title}?</p>
          <div className="space-y-1">
            {rows.map((r) => (
              <DestOption
                key={r.key}
                title={r.title}
                selected={rowKey === r.key}
                onSelect={() => setRowKey(r.key)}
              />
            ))}
            <DestOption
              title="Other tasks"
              muted
              selected={rowKey === OTHER_ROW_KEY}
              onSelect={() => setRowKey(OTHER_ROW_KEY)}
            />
          </div>
        </div>

        {/* Footer */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 10, padding: '14px 24px', borderTop: '1px solid rgba(19,4,38,0.10)' }}>
          <button onClick={onClose} style={{ fontSize: 14, fontWeight: 500, color: 'rgba(19,4,38,0.7)', background: 'none', border: 'none', cursor: 'pointer', padding: '8px 12px' }}>Cancel</button>
          <button
            onClick={handleCreate}
            disabled={!canCreate}
            style={{ fontSize: 14, fontWeight: 600, color: '#FFFFFF', background: canCreate ? '#2C3777' : 'rgba(44,55,119,0.4)', border: 'none', borderRadius: 999, padding: '8px 18px', cursor: canCreate ? 'pointer' : 'not-allowed' }}
            className={canCreate ? 'hover:opacity-90 transition-opacity' : ''}
          >
            Create task
          </button>
        </div>
      </div>
    </div>
  )
}

function DestOption({ title, selected, muted, onSelect }: {
  title: string
  selected: boolean
  muted?: boolean
  onSelect: () => void
}) {
  return (
    <button
      onClick={onSelect}
      style={{
        display: 'flex', alignItems: 'center', gap: 8, width: '100%', textAlign: 'left',
        background: selected ? '#2C3777' : '#FFFFFF',
        border: `1px solid ${selected ? '#2C3777' : 'rgba(19,4,38,0.12)'}`,
        borderRadius: 8, padding: '8px 12px', cursor: 'pointer',
      }}
      className="hover:opacity-90 transition-opacity"
    >
      <span style={{ width: 14, height: 14, borderRadius: 999, flexShrink: 0, border: `2px solid ${selected ? '#FFFFFF' : 'rgba(19,4,38,0.3)'}`, background: selected ? '#FFFFFF' : 'transparent' }} />
      <span style={{ fontSize: 13, color: selected ? '#FFFFFF' : (muted ? 'rgba(19,4,38,0.6)' : '#130426'), fontStyle: muted ? 'italic' : 'normal' }}>{title}</span>
    </button>
  )
}
