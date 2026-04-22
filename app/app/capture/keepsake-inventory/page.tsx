'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import {
  fetchKeepsakeInventory,
  createKeepsakeInventory,
  saveKeepsakeInventory,
  type KeepsakeEntry,
} from '@/lib/keepsakes'

const AUTOSAVE_DELAY = 1200
const hv = "'Helvetica Neue', Helvetica, Arial, sans-serif"
const apfel = "'ApfelGrotezk', sans-serif"

const REFLECTION_PROMPTS = [
  'What is it, and who did it belong to?',
  'Why is it meaningful to you?',
  'How does it make you feel?',
  'If they had left a note about it, what would it say?',
]

function makeEntry(): KeepsakeEntry {
  return { id: crypto.randomUUID(), object: '', recipient: '', meaning: '' }
}

function ensureFour(loaded: KeepsakeEntry[]): KeepsakeEntry[] {
  const base = loaded.slice(0, 4)
  while (base.length < 4) base.push(makeEntry())
  return base
}

// ---------------------------------------------------------------------------
// Input focus ring — applied via inline style on focus/blur
// ---------------------------------------------------------------------------

const FOCUS_STYLE: React.CSSProperties = {
  borderColor: '#F29836',
  outline: 'none',
  boxShadow: '0 0 0 2px rgba(242,152,54,0.16)',
}

const BLUR_STYLE: React.CSSProperties = {
  borderColor: 'rgba(44,55,119,0.18)',
  outline: 'none',
  boxShadow: 'none',
}

// ---------------------------------------------------------------------------
// FocusableInput / FocusableTextarea — thin wrappers that apply focus ring
// ---------------------------------------------------------------------------

function FocusableInput({
  value,
  onChange,
  placeholder,
  style,
  className,
}: {
  value: string
  onChange: (v: string) => void
  placeholder?: string
  style?: React.CSSProperties
  className?: string
}) {
  const [focused, setFocused] = useState(false)
  return (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      style={{ ...style, ...(focused ? FOCUS_STYLE : BLUR_STYLE) }}
      className={className}
    />
  )
}

function FocusableTextarea({
  value,
  onChange,
  placeholder,
  style,
  className,
}: {
  value: string
  onChange: (v: string) => void
  placeholder?: string
  style?: React.CSSProperties
  className?: string
}) {
  const [focused, setFocused] = useState(false)
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      style={{ ...style, ...(focused ? FOCUS_STYLE : BLUR_STYLE) }}
      className={className}
    />
  )
}

// ---------------------------------------------------------------------------
// Shared input base styles
// ---------------------------------------------------------------------------

const inputBase: React.CSSProperties = {
  display: 'block',
  width: '100%',
  background: '#F8F4EB',
  border: '1px solid rgba(44,55,119,0.18)',
  borderRadius: 10,
  fontFamily: hv,
  color: '#130426',
  boxSizing: 'border-box',
  transition: 'border-color 0.15s, box-shadow 0.15s',
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export default function KeepsakeDocumentPage() {
  const [entries, setEntries] = useState<KeepsakeEntry[]>(() => Array.from({ length: 4 }, makeEntry))
  const [loading, setLoading] = useState(true)
  const [saved, setSaved] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const docIdRef = useRef<string | null>(null)

  useEffect(() => {
    fetchKeepsakeInventory().then((inv) => {
      if (inv) {
        docIdRef.current = inv.id
        setEntries(ensureFour(inv.entries))
      }
      setLoading(false)
    })
  }, [])

  const scheduleSave = useCallback((nextEntries: KeepsakeEntry[]) => {
    setSaved(false)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(async () => {
      if (docIdRef.current) {
        await saveKeepsakeInventory(docIdRef.current, nextEntries)
      } else {
        const inv = await createKeepsakeInventory(nextEntries)
        if (inv) { docIdRef.current = inv.id }
      }
      setSaved(true)
    }, AUTOSAVE_DELAY)
  }, [])

  function updateEntry(index: number, field: keyof KeepsakeEntry, value: string) {
    setEntries((prev) => {
      const next = prev.map((e, i) => i === index ? { ...e, [field]: value } : e)
      scheduleSave(next)
      return next
    })
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#BBABF4]">
        <div style={{ maxWidth: 720, margin: '0 auto', padding: '48px 24px', fontFamily: hv, fontSize: 14, color: '#2C3777' }}>
          Loading…
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#BBABF4]">
      <div style={{ maxWidth: 720, margin: '0 auto', padding: '48px 24px 96px' }}>

        {/* Back link */}
        <Link
          href="/app/capture"
          style={{ fontFamily: hv, fontSize: 16, lineHeight: 1.4, fontWeight: 400, color: '#2C3777', display: 'block', marginBottom: 32, textDecoration: 'none' }}
          className="hover:opacity-70 transition-opacity"
        >
          ← Capture
        </Link>

        {/* Title */}
        <h1 style={{
          fontFamily: apfel,
          fontSize: 72,
          lineHeight: 0.95,
          fontWeight: 700,
          letterSpacing: '-0.04em',
          color: '#130426',
          marginBottom: 20,
        }}>
          Keepsakes Inventory
        </h1>

        {/* Subtitle */}
        <p style={{
          fontFamily: hv,
          fontSize: 18,
          lineHeight: 1.5,
          fontWeight: 400,
          color: '#130426',
          maxWidth: 720,
          marginBottom: 40,
        }}>
          Objects you want to pass on and what they should understand about them.
        </p>

        {/* Section label — Reflection */}
        <p style={{ fontFamily: hv, fontSize: 14, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#2C3777', marginBottom: 12 }}>
          Reflection
        </p>

        {/* Reflection panel */}
        <div style={{
          background: '#ffffff',
          border: '1px solid #e7e1d6',
          borderRadius: 16,
          padding: '24px 28px',
          maxWidth: 760,
          marginBottom: 56,
        }}>
          <p style={{
            fontFamily: hv,
            fontSize: 18,
            lineHeight: 1.4,
            fontWeight: 700,
            color: '#130426',
            margin: '0 0 16px 0',
          }}>
            Think of an object you have from someone who is no longer here.
          </p>

          <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 10 }}>
            {REFLECTION_PROMPTS.map((prompt) => (
              <li key={prompt} style={{ display: 'flex', gap: 8 }}>
                <span style={{ color: '#2C3777', flexShrink: 0 }}>·</span>
                <span style={{ fontFamily: hv, fontSize: 16, lineHeight: 1.6, fontWeight: 400, color: '#2C3777' }}>{prompt}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Section label — Inventory */}
        <p style={{ fontFamily: hv, fontSize: 14, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#2C3777', marginBottom: 16, marginTop: 24 }}>
          Inventory
        </p>

        {/* 4 fixed document entries */}
        {entries.map((entry, i) => (
          <div key={entry.id}>

            {/* Object */}
            <label style={{ display: 'block', fontFamily: hv, fontSize: 14, lineHeight: 1.4, fontWeight: 500, color: '#2C3777', marginBottom: 6 }}>
              Object
            </label>
            <FocusableInput
              value={entry.object}
              onChange={(v) => updateEntry(i, 'object', v)}
              placeholder="What is the object?"
              style={{
                ...inputBase,
                height: 56,
                padding: '14px 16px',
                fontSize: 18,
                fontWeight: 600,
                marginBottom: 16,
              }}
              className="placeholder:text-[#130426]/[0.35]"
            />

            {/* For */}
            <label style={{ display: 'block', fontFamily: hv, fontSize: 14, lineHeight: 1.4, fontWeight: 500, color: '#2C3777', marginBottom: 6 }}>
              For
            </label>
            <FocusableInput
              value={entry.recipient}
              onChange={(v) => updateEntry(i, 'recipient', v)}
              placeholder="Who would you want to receive this?"
              style={{
                ...inputBase,
                height: 52,
                padding: '14px 16px',
                fontSize: 16,
                fontWeight: 400,
                marginBottom: 16,
              }}
              className="placeholder:text-[#130426]/[0.35]"
            />

            {/* Meaning */}
            <label style={{ display: 'block', fontFamily: hv, fontSize: 14, lineHeight: 1.4, fontWeight: 500, color: '#2C3777', marginBottom: 6 }}>
              What should they understand about this?
            </label>
            <FocusableTextarea
              value={entry.meaning}
              onChange={(v) => updateEntry(i, 'meaning', v)}
              placeholder="Write here..."
              style={{
                ...inputBase,
                padding: 16,
                minHeight: 132,
                fontSize: 16,
                lineHeight: '1.55',
                fontWeight: 400,
                resize: 'none',
              }}
              className="placeholder:text-[#130426]/[0.35]"
            />

            {/* Divider — not after last entry */}
            {i < 3 && (
              <div style={{ height: 1, background: 'rgba(44,55,119,0.18)', margin: '40px 0' }} />
            )}
          </div>
        ))}

        {/* Save status */}
        <p style={{ fontFamily: hv, fontSize: 13, color: '#2C3777', marginTop: 32 }}>
          {saved ? 'Saved.' : 'Changes save automatically.'}
        </p>

      </div>
    </div>
  )
}
