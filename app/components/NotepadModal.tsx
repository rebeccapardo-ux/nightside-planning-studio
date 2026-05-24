'use client'

import { useEffect, useRef, useState } from 'react'
import { usePathname } from 'next/navigation'
import { createNote } from '@/lib/notes'
import VoiceNoteButton from './VoiceNoteButton'
import type { Note } from '@/lib/notes'

export default function NotepadModal({
  variant = 'floating',
  buttonStyle = 'lavender',
  size = 'default',
}: {
  variant?: 'floating' | 'panel'
  buttonStyle?: 'lavender' | 'cream' | 'orange' | 'midnight' | 'navy' | 'sunrise'
  size?: 'default' | 'sm'
}) {
  const [composerText, setComposerText] = useState('')
  const [saving, setSaving] = useState(false)
  const [isOpen, setIsOpen] = useState(false)
  const [isHovered, setIsHovered] = useState(false)
  const [confirmVisible, setConfirmVisible] = useState(false)

  const composerRef = useRef<HTMLTextAreaElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pathname = usePathname()

  // Pages with dark backgrounds — ghost panel should be cream with dark text
  const darkPageBg =
    pathname?.startsWith('/app/reflect') ||
    pathname?.startsWith('/app/reflect/prompts') ||
    pathname?.startsWith('/app/capture') ||
    pathname?.startsWith('/app/plan') ||
    pathname?.startsWith('/app/domains')

  const ghost = darkPageBg
    ? {
        bg: '#F8F4EB',
        border: '1px solid rgba(19,4,38,0.20)',
        shadow: '0 8px 32px rgba(0,0,0,0.30)',
        textareaBg: 'rgba(19,4,38,0.07)',
        textareaBorder: '1px solid rgba(19,4,38,0.18)',
        placeholderClass: 'placeholder:text-[#130426]/70',
        iconColor: '#130426',
        labelColor: '#130426',
      }
    : {
        bg: '#2d3a6b',
        border: '1px solid rgba(187,171,244,0.55)',
        shadow: '0 8px 32px rgba(0,0,0,0.45)',
        textareaBg: 'rgba(255,255,255,0.1)',
        textareaBorder: '1px solid rgba(255,255,255,0.2)',
        placeholderClass: 'placeholder:text-white/45',
        iconColor: 'rgba(255,255,255,0.75)',
        labelColor: 'rgba(255,255,255,0.75)',
      }

  // Auto-resize panel composer textarea
  useEffect(() => {
    if (composerRef.current) {
      const el = composerRef.current
      el.style.height = 'auto'
      el.style.height = `${el.scrollHeight}px`
    }
  }, [composerText])

  // ── Modal save (Pattern 1 — explicit, creates new note, clears input) ─────────

  async function handleModalSave() {
    const trimmed = composerText.trim()
    if (!trimmed || saving) return
    setSaving(true)
    await createNote(trimmed)
    setSaving(false)
    setComposerText('')
    setConfirmVisible(true)
    setTimeout(() => setConfirmVisible(false), 2000)
  }

  // ── Panel save ────────────────────────────────────────────────────────────────

  async function handleSave() {
    const trimmed = composerText.trim()
    if (!trimmed || saving) return
    setSaving(true)
    await createNote(trimmed)
    setComposerText('')
    setSaving(false)
  }

  function handlePanelKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSave()
    }
  }

  function handleClose() {
    setIsOpen(false)
    setComposerText('')
    setConfirmVisible(false)
  }

  function openModal() {
    setIsOpen(true)
    setComposerText('')
    setConfirmVisible(false)
  }

  // ─── Modal overlay ────────────────────────────────────────────────────────────

  const hv = "'Helvetica Neue', Helvetica, Arial, sans-serif"

  const modalOverlay = isOpen && (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/55 px-4">
      <div className="w-full max-w-xl rounded-2xl border border-white/10 p-6 shadow-2xl" style={{ background: '#2d3a6b' }}>

        {/* Header */}
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-2xl font-semibold text-[#f8f4eb]">Notepad</h2>
          <button
            onClick={handleClose}
            className="transition-colors text-xl leading-none hover:opacity-100"
            style={{ color: 'rgba(255,255,255,0.7)' }}
          >
            ×
          </button>
        </div>

        {/* Helper text */}
        <p className="text-sm italic text-[#f8f4eb] mb-4">Notes save automatically to Your Plan.</p>

        {/* Composer */}
        <textarea
          value={composerText}
          placeholder="Capture a thought, question, or anything on your mind…"
          className="h-44 w-full text-[#130426] placeholder:text-[#130426]/45 text-sm leading-relaxed resize-none outline-none"
          style={{ background: '#ffffff', border: '1.5px solid rgba(26,26,26,0.15)', borderRadius: 10, padding: '12px 16px' }}
          onChange={(e) => {
            const text = e.target.value
            setComposerText(text)
            if (debounceRef.current) clearTimeout(debounceRef.current)
            const trimmed = text.trim()
            if (!trimmed) return
            debounceRef.current = setTimeout(async () => {
              setSaving(true)
              await createNote(trimmed)
              setSaving(false)
              setComposerText('')
              setConfirmVisible(true)
              setTimeout(() => setConfirmVisible(false), 2000)
            }, 900)
          }}
        />

        {/* Save status */}
        <div style={{ margin: '6px 0 16px', minHeight: 18, display: 'flex', alignItems: 'center', gap: 6 }}>
          {saving && (
            <span style={{ fontFamily: hv, fontSize: 13, color: 'rgba(255,255,255,0.75)' }}>Saving…</span>
          )}
          {confirmVisible && !saving && (
            <>
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true" style={{ flexShrink: 0 }}>
                <circle cx="7" cy="7" r="6" stroke="rgba(255,255,255,0.75)" strokeWidth="1.3" />
                <path d="M4.5 7L6.2 8.8L9.5 5.5" stroke="rgba(255,255,255,0.75)" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <span style={{ fontFamily: hv, fontSize: 13, color: 'rgba(255,255,255,0.75)' }}>Saved to Your Plan</span>
            </>
          )}
        </div>

        {/* Voice note */}
        <div className="mb-4">
          <VoiceNoteButton
            saveMode={{ kind: 'freeform' }}
            theme="dark"
            onSaved={() => {
              setTimeout(() => setIsOpen(false), 3000)
            }}
          />
        </div>

      </div>
    </div>
  )

  // ─── Panel variant ────────────────────────────────────────────────────────────

  if (variant === 'panel') {
    return (
      <>
        <div>
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-semibold text-[#f8f4eb]">Notepad</span>
            <button
              onClick={openModal}
              className="rounded-full bg-[#f8f4eb] text-[#2C3777] hover:bg-[#BBABF4] transition-colors px-3 py-1 text-xs font-semibold"
            >
              ✎ Open notepad
            </button>
          </div>
          <div className="mb-1">
            <textarea
              ref={composerRef}
              value={composerText}
              onChange={(e) => setComposerText(e.target.value)}
              onKeyDown={handlePanelKeyDown}
              placeholder="Write a note…"
              rows={2}
              className="w-full rounded-lg bg-[#f8f4eb] text-[#130426] placeholder:text-[#130426]/40 px-3 py-2 text-sm leading-relaxed resize-none outline-none overflow-hidden"
            />
          </div>
          <div className="flex items-center justify-end" style={{ minHeight: 36 }}>
            {composerText.trim() && (
              <button
                onClick={handleSave}
                disabled={saving}
                style={{
                  fontSize: 14,
                  fontWeight: 500,
                  fontFamily: hv,
                  color: '#f8f4eb',
                  background: 'transparent',
                  border: '1px solid rgba(248,244,235,0.4)',
                  borderRadius: 4,
                  padding: '8px 16px',
                  cursor: !saving ? 'pointer' : 'default',
                  opacity: !saving ? 1 : 0.4,
                }}
              >
                {saving ? 'Saving…' : 'Add note'}
              </button>
            )}
          </div>
          <div className="mt-2 mb-4">
            <VoiceNoteButton
              saveMode={{ kind: 'freeform' }}
              theme="dark"
              onSaved={(_note: Note) => {}}
            />
          </div>
        </div>
        {modalOverlay}
      </>
    )
  }

  // ─── Floating variant ─────────────────────────────────────────────────────────

  const showGhost = isHovered && !isOpen

  return (
    <>
      <div
        style={{ position: 'relative', display: 'inline-block' }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* Notepad button */}
        {size === 'sm' ? (
          <button
            onClick={openModal}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              height: 30,
              borderRadius: 20,
              paddingLeft: 14,
              paddingRight: 14,
              fontSize: 12,
              fontWeight: 500,
              fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif",
              border: '1px solid rgba(187,171,244,0.6)',
              cursor: 'pointer',
              whiteSpace: 'nowrap' as const,
              background: buttonStyle === 'cream' ? '#f8f4eb' : buttonStyle === 'orange' ? '#DB5835' : buttonStyle === 'midnight' ? '#130426' : buttonStyle === 'navy' ? '#2C3777' : buttonStyle === 'sunrise' ? '#F29836' : '#BBABF4',
              color: buttonStyle === 'orange' || buttonStyle === 'midnight' || buttonStyle === 'navy' ? '#f8f4eb' : '#130426',
            }}
          >
            <svg width="13" height="13" viewBox="0 0 13 13" fill="none" aria-hidden="true">
              <rect x="2.5" y="1" width="8" height="10.5" rx="1.5" stroke="#130426" strokeWidth="1.3" />
              <path d="M4.5 4h4M4.5 6.5h4M4.5 9h2.5" stroke="#130426" strokeWidth="1.3" strokeLinecap="round" />
            </svg>
            Notepad
          </button>
        ) : (
          <button
            onClick={openModal}
            className={`rounded-full px-5 py-3 text-sm font-semibold transition-colors flex items-center gap-2 ${
              buttonStyle === 'cream'
                ? 'bg-[#f8f4eb] text-[#130426] hover:bg-[#BBABF4]'
                : buttonStyle === 'orange'
                ? 'bg-[#DB5835] text-[#f8f4eb] hover:bg-[#C04828]'
                : buttonStyle === 'midnight'
                ? 'bg-[#130426] text-[#f8f4eb] hover:bg-[#200840]'
                : buttonStyle === 'navy'
                ? 'bg-[#2C3777] text-[#f8f4eb] hover:bg-[#3d4e8f]'
                : buttonStyle === 'sunrise'
                ? 'bg-[#F29836] text-[#130426] hover:bg-[#e08a25]'
                : 'bg-[#BBABF4] text-[#130426] hover:bg-[#f8f4eb]'
            }`}
          >
            <svg width="13" height="13" viewBox="0 0 14 14" fill="none" aria-hidden="true" style={{ flexShrink: 0 }}>
              <path d="M11.5 6L6.5 11C5.4 12.1 3.6 12.1 2.5 11C1.4 9.9 1.4 8.1 2.5 7L8 1.5C8.8 0.7 10.2 0.7 11 1.5C11.8 2.3 11.8 3.7 11 4.5L5.5 10C5.1 10.4 4.4 10.4 4 10C3.6 9.6 3.6 8.9 4 8.5L9 3.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Notepad
          </button>
        )}

        {/* Ghost preview panel — appears below button on hover */}
        <div
          onClick={openModal}
          style={{
            position: 'absolute',
            top: 'calc(100% + 8px)',
            right: 0,
            width: 260,
            background: ghost.bg,
            border: ghost.border,
            borderRadius: 12,
            padding: 14,
            boxShadow: ghost.shadow,
            opacity: showGhost ? 1 : 0,
            transform: showGhost ? 'translateY(0)' : 'translateY(-6px)',
            transition: 'opacity 0.25s ease, transform 0.25s ease',
            pointerEvents: showGhost ? 'auto' : 'none',
            zIndex: 50,
            cursor: 'pointer',
          }}
        >
          {/* Ghost textarea — read-only preview */}
          <textarea
            readOnly
            tabIndex={-1}
            placeholder="Capture a thought..."
            style={{
              display: 'block',
              width: '100%',
              height: 80,
              background: ghost.textareaBg,
              border: ghost.textareaBorder,
              borderRadius: 8,
              padding: '10px 12px',
              resize: 'none',
              outline: 'none',
              fontSize: 13,
              lineHeight: 1.5,
              cursor: 'pointer',
              boxSizing: 'border-box',
              fontFamily: 'inherit',
            }}
            className={ghost.placeholderClass}
          />

          {/* Ghost voice row */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginTop: 10 }}>
            <svg width="11" height="15" viewBox="0 0 12 16" fill="none" aria-hidden>
              <rect x="2.5" y="0.5" width="7" height="9" rx="3.5" fill={ghost.iconColor} />
              <path d="M0.5 8c0 2.76 2.24 5 5.5 5s5.5-2.24 5.5-5" stroke={ghost.iconColor} strokeWidth="1.5" strokeLinecap="round" fill="none" />
              <line x1="6" y1="13" x2="6" y2="15.5" stroke={ghost.iconColor} strokeWidth="1.5" strokeLinecap="round" />
              <line x1="3.5" y1="15.5" x2="8.5" y2="15.5" stroke={ghost.iconColor} strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            <span style={{ fontSize: 12, color: ghost.labelColor }}>Record a voice note</span>
          </div>
        </div>
      </div>

      {modalOverlay}
    </>
  )
}
