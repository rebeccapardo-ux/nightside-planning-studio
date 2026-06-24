'use client'

import { useEffect, useRef, useState } from 'react'
import { getDomainStructureByCode } from '@/lib/domain-structure'
import { OTHER_ROW_KEY } from '@/lib/user-tasks'
import type { Note, Container } from '@/lib/notes'

export type TaskDestination = { domainId: string; rowKey: string; label: string }

// "Make this a task" destination picker (PR 4). Editable label (pre-filled from
// the note's content / voice transcript) + a destination: pick a domain (defaults
// to the one the user is on) then a readiness row, or "Other tasks for [domain]".
// Component only — NoteCard wiring + the conversion handler live in chunk 4.
export default function MakeTaskModal({
  note,
  domains,
  currentDomainId,
  onConfirm,
  onClose,
}: {
  note: Note
  domains: Container[]
  currentDomainId: string
  onConfirm: (dest: TaskDestination) => void
  onClose: () => void
}) {
  // Pre-fill from content; for voice notes content holds the transcript. An empty
  // transcript (succeeded-but-no-text) just yields an empty field to type into.
  const [label, setLabel] = useState((note.content ?? '').trim())
  // Default the domain to the one the user is on (the overwhelmingly likely
  // destination) — they still choose the specific row. Cross-domain remains a
  // domain switch away.
  const [domainId, setDomainId] = useState(
    domains.some((d) => d.id === currentDomainId) ? currentDomainId : (domains[0]?.id ?? ''),
  )
  const [rowKey, setRowKey] = useState<string | null>(null)
  const labelRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  useEffect(() => { labelRef.current?.focus() }, [])

  const activeDomain = domains.find((d) => d.id === domainId)
  const rows = getDomainStructureByCode(activeDomain?.domain_code)?.readiness ?? []
  const canCreate = label.trim().length > 0 && rowKey !== null

  // Row keys are domain-scoped, so switching domains clears the selected row.
  function selectDomain(id: string) {
    if (id === domainId) return
    setDomainId(id)
    setRowKey(null)
  }

  function handleCreate() {
    if (!canCreate || rowKey === null) return
    onConfirm({ domainId, rowKey, label: label.trim() })
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
          <p style={{ fontSize: 18, fontWeight: 700, color: '#130426', margin: 0 }}>Make this a task</p>
          <button onClick={onClose} aria-label="Close" style={{ fontSize: 22, lineHeight: 1, color: 'rgba(19,4,38,0.6)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>×</button>
        </div>

        {/* Body */}
        <div style={{ overflowY: 'auto', padding: '16px 24px' }}>
          <p style={{ fontSize: 13, fontWeight: 600, color: '#130426', margin: '0 0 6px 0' }}>Task</p>
          <input
            ref={labelRef}
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="Describe the task…"
            aria-label="Task"
            style={{ width: '100%', fontSize: 14, color: '#130426', background: '#FFFFFF', border: '1px solid rgba(19,4,38,0.20)', borderRadius: 8, padding: '8px 10px', outline: 'none', marginBottom: 18 }}
          />

          {/* Domain switcher — defaults to the current domain */}
          <p style={{ fontSize: 13, fontWeight: 600, color: '#130426', margin: '0 0 8px 0' }}>Area</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 16 }}>
            {domains.map((d) => {
              const isActive = d.id === domainId
              return (
                <button
                  key={d.id}
                  onClick={() => selectDomain(d.id)}
                  style={{
                    fontSize: 13, fontWeight: 600, borderRadius: 999, padding: '6px 12px', cursor: 'pointer',
                    background: isActive ? '#130426' : '#FFFFFF',
                    color: isActive ? '#FFFFFF' : '#130426',
                    border: `1px solid ${isActive ? '#130426' : 'rgba(19,4,38,0.18)'}`,
                  }}
                  className="hover:opacity-90 transition-opacity"
                >
                  {d.title}
                </button>
              )
            })}
          </div>

          {/* Rows for the selected domain */}
          <p style={{ fontSize: 13, fontWeight: 600, color: '#130426', margin: '0 0 8px 0' }}>Where in {activeDomain?.title ?? 'this area'}?</p>
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
              title={`Other tasks for ${activeDomain?.title ?? 'this area'}`}
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
