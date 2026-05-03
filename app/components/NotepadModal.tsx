'use client'

import { useEffect, useRef, useState } from 'react'
import { usePathname } from 'next/navigation'
import { createNote } from '@/lib/notes'
import VoiceNoteButton from './VoiceNoteButton'
import type { Note } from '@/lib/notes'

export default function NotepadModal({
  variant = 'floating',
  buttonStyle = 'lavender',
}: {
  variant?: 'floating' | 'panel'
  buttonStyle?: 'lavender' | 'cream' | 'orange'
}) {
  const [composerText, setComposerText] = useState('')
  const [saving, setSaving] = useState(false)
  const [isOpen, setIsOpen] = useState(false)
  const [isHovered, setIsHovered] = useState(false)
  const [confirmVisible, setConfirmVisible] = useState(false)
  const [voiceConfirmVisible, setVoiceConfirmVisible] = useState(false)

  const composerRef = useRef<HTMLTextAreaElement>(null)
  const pathname = usePathname()

  // Pages with dark backgrounds — ghost panel should be cream with dark text
  const darkPageBg =
    pathname?.startsWith('/app/explore') ||
    pathname?.startsWith('/app/reflect/prompts') ||
    pathname?.startsWith('/app/capture') ||
    pathname?.startsWith('/app/materials') ||
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
        bg: 'rgba(22,18,15,0.96)',
        border: '1px solid rgba(187,171,244,0.55)',
        shadow: '0 8px 32px rgba(0,0,0,0.45)',
        textareaBg: 'rgba(248,244,235,0.10)',
        textareaBorder: '1px solid rgba(187,171,244,0.40)',
        placeholderClass: 'placeholder:text-[#f8f4eb]/80',
        iconColor: '#F8F4EB',
        labelColor: '#F8F4EB',
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
    setVoiceConfirmVisible(false)
  }

  function openModal() {
    setIsOpen(true)
    setComposerText('')
    setConfirmVisible(false)
    setVoiceConfirmVisible(false)
  }

  // ─── Modal overlay ────────────────────────────────────────────────────────────

  const hv = "'Helvetica Neue', Helvetica, Arial, sans-serif"

  const modalOverlay = isOpen && (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/55 px-4">
      <div className="w-full max-w-xl rounded-2xl border border-[#f8f4eb]/10 bg-[#16120f] p-6 shadow-2xl">

        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-2xl font-semibold text-[#f8f4eb]">Notepad</h2>
          <button
            onClick={handleClose}
            className="text-app-secondary hover:text-[#f8f4eb] transition-colors text-xl leading-none"
          >
            ×
          </button>
        </div>

        {/* Composer */}
        <textarea
          value={composerText}
          onChange={(e) => setComposerText(e.target.value)}
          placeholder="Capture a thought, question, or anything on your mind…"
          className="h-44 w-full rounded-lg bg-[#f8f4eb] px-4 py-3 text-[#130426] placeholder:text-[#130426]/45 text-sm leading-relaxed resize-none outline-none"
        />

        {/* Inline confirmation */}
        <div style={{ minHeight: 20, marginTop: 6, marginBottom: 16 }}>
          {confirmVisible && (
            <p style={{ fontSize: 13, fontFamily: hv, color: 'rgba(248,244,235,0.72)', margin: 0 }}>
              Added to your Plan
            </p>
          )}
        </div>

        {/* Add note button */}
        <button
          onClick={handleModalSave}
          disabled={!composerText.trim() || saving}
          style={{
            display: 'block',
            fontSize: 14,
            fontWeight: 500,
            fontFamily: hv,
            color: '#f8f4eb',
            background: 'transparent',
            border: '1px solid rgba(248,244,235,0.4)',
            borderRadius: 4,
            padding: '8px 16px',
            cursor: composerText.trim() && !saving ? 'pointer' : 'default',
            opacity: composerText.trim() && !saving ? 1 : 0.4,
            marginBottom: 20,
          }}
        >
          {saving ? 'Saving…' : 'Add note'}
        </button>

        {/* Voice note */}
        <div className="mb-4">
          <VoiceNoteButton
            saveMode={{ kind: 'freeform' }}
            theme="dark"
            buttonLabel={
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7 }}>
                <svg width="12" height="16" viewBox="0 0 12 16" fill="none" aria-hidden>
                  <rect x="2.5" y="0.5" width="7" height="9" rx="3.5" fill="currentColor" />
                  <path d="M0.5 8c0 2.76 2.24 5 5.5 5s5.5-2.24 5.5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" fill="none" />
                  <line x1="6" y1="13" x2="6" y2="15.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                  <line x1="3.5" y1="15.5" x2="8.5" y2="15.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
                Record a voice note
              </span>
            }
            onSaved={(_note: Note) => {
              setVoiceConfirmVisible(true)
              setTimeout(() => {
                setVoiceConfirmVisible(false)
                setIsOpen(false)
              }, 2000)
            }}
          />
          {voiceConfirmVisible && (
            <p style={{ fontSize: 13, fontFamily: hv, color: 'rgba(248,244,235,0.72)', marginTop: 8 }}>
              Saved to your Plan
            </p>
          )}
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
        <button
          onClick={openModal}
          className={`rounded-full px-5 py-3 text-sm font-semibold transition-colors ${
            buttonStyle === 'cream'
              ? 'bg-[#f8f4eb] text-[#130426] hover:bg-[#BBABF4]'
              : buttonStyle === 'orange'
              ? 'bg-[#DB5835] text-[#f8f4eb] hover:bg-[#F29836]'
              : 'bg-[#BBABF4] text-[#130426] hover:bg-[#f8f4eb]'
          }`}
        >
          ✎ Notepad
        </button>

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
