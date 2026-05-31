'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Breadcrumbs from '@/app/components/navigation/Breadcrumbs'
import AutosaveNotice from '@/app/components/AutosaveNotice'
import {
  fetchKeepsakeInventory,
  createKeepsakeInventory,
  saveKeepsakeInventory,
  type KeepsakeEntry,
} from '@/lib/keepsakes'
import { createSupabaseBrowserClient } from '@/lib/supabase-browser'

const AUTOSAVE_DELAY = 1500
const hv = "'Helvetica Neue', Helvetica, Arial, sans-serif"
const afG = "'Apfel Grotezk', 'Helvetica Neue', Helvetica, Arial, sans-serif"

const REFLECTION_PROMPTS = [
  'What is it, and who did it belong to?',
  'Why is it meaningful to you?',
  'How does it make you feel?',
  'If they had left a note about it, what would it say?',
]

function makeEntry(): KeepsakeEntry {
  return { id: crypto.randomUUID(), object: '', recipient: '', meaning: '', why: '' }
}

function isEntryEmpty(e: KeepsakeEntry): boolean {
  return !e.object.trim() && !e.recipient.trim() && !e.meaning.trim() && !e.why.trim()
}

// ---------------------------------------------------------------------------
// Field — shared input component
// ---------------------------------------------------------------------------

function Field({
  label,
  value,
  onChange,
  placeholder,
  rows = 2,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
  rows?: number
}) {
  return (
    <div>
      <label style={{ display: 'block', fontFamily: hv, fontSize: 14, color: '#1A1A1A', marginBottom: 8 }}>
        {label}
      </label>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={rows}
        style={{
          width: '100%',
          background: '#FFFFFF',
          color: '#1A1A1A',
          border: '1px solid #2C3777',
          borderRadius: 10,
          padding: 12,
          fontFamily: hv,
          fontSize: 15,
          lineHeight: 1.5,
          resize: 'none',
          outline: 'none',
          boxSizing: 'border-box',
        }}
        className="placeholder:text-[#1A1A1A]/65"
      />
    </div>
  )
}

// ---------------------------------------------------------------------------
// EntryCard — collapsible keepsake entry
// ---------------------------------------------------------------------------

function EntryCard({
  entry,
  isOpen,
  onToggle,
  onDelete,
  onChange,
  onBlurCard,
  entryRef,
  isSaving,
  isSaved,
  savedFading,
}: {
  entry: KeepsakeEntry
  isOpen: boolean
  onToggle: () => void
  onDelete: () => void
  onChange: (field: keyof KeepsakeEntry, value: string) => void
  onBlurCard: () => void
  entryRef: (el: HTMLDivElement | null) => void
  isSaving: boolean
  isSaved: boolean
  savedFading: boolean
}) {
  const title = entry.object.trim()
  return (
    <div
      ref={entryRef}
      onBlur={(e) => {
        // Fire only when focus leaves the entire card (not moving between fields inside it)
        if (!e.currentTarget.contains(e.relatedTarget as Node)) {
          onBlurCard()
        }
      }}
      style={{ background: '#F8F4EB', border: '1px solid #2C3777', borderRadius: 12, overflow: 'hidden' }}
    >
      <button
        type="button"
        onClick={onToggle}
        style={{ width: '100%', background: 'transparent', border: 'none', padding: '14px 16px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, textAlign: 'left', minHeight: 48 }}
      >
        <span style={{ fontFamily: hv, fontSize: 16, color: '#1A1A1A', fontWeight: 500 }}>{title}</span>
        <svg width="12" height="8" viewBox="0 0 12 8" fill="none" style={{ flexShrink: 0, transition: 'transform 0.2s', transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}>
          <path d="M1 1.5L6 6.5L11 1.5" stroke="#2C3777" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      {isOpen && (
        <div style={{ padding: '0 16px 16px', borderTop: '1px solid #2C3777', display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div style={{ height: 16 }} />
          <Field
            label="Object"
            value={entry.object}
            onChange={(v) => onChange('object', v)}
            placeholder="What is the object?"
            rows={1}
          />
          <Field
            label="Who this might be for (optional)"
            value={entry.recipient}
            onChange={(v) => onChange('recipient', v)}
            placeholder="A person, or leave blank if unsure"
            rows={1}
          />
          <Field
            label="What should someone understand about this?"
            value={entry.meaning}
            onChange={(v) => onChange('meaning', v)}
            placeholder="Write here..."
            rows={3}
          />
          <Field
            label="Why this matters to me (optional)"
            value={entry.why}
            onChange={(v) => onChange('why', v)}
            placeholder="Write here..."
            rows={3}
          />
          <div style={{ paddingTop: 4, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
            <button
              type="button"
              onClick={onDelete}
              style={{ fontFamily: hv, fontSize: 13, color: '#2C3777', background: 'none', border: '1px solid #2C3777', borderRadius: 999, padding: '6px 14px', cursor: 'pointer' }}
            >
              Delete
            </button>
            {isSaving && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontFamily: hv, fontSize: 12, fontWeight: 500, color: 'rgba(19,4,38,0.65)' }}>Saving…</span>
              </div>
            )}
            {isSaved && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, opacity: savedFading ? 0 : 1, transition: 'opacity 0.4s ease' }}>
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true" style={{ flexShrink: 0 }}>
                  <circle cx="7" cy="7" r="6" stroke="rgba(19,4,38,0.65)" strokeWidth="1.3" />
                  <path d="M4.5 7L6.2 8.8L9.5 5.5" stroke="rgba(19,4,38,0.65)" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <span style={{ fontFamily: hv, fontSize: 12, fontWeight: 500, color: 'rgba(19,4,38,0.65)' }}>Saved to Your Plan</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export default function KeepsakeDocumentPage() {
  const [entries, setEntries] = useState<KeepsakeEntry[]>([])
  const [openIdx, setOpenIdx] = useState<Set<number>>(new Set())
  const [pendingId, setPendingId] = useState<string | null>(null)
  const pendingIdRef = useRef<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null)
  const [statusNow, setStatusNow] = useState(Date.now())
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const docIdRef = useRef<string | null>(null)
  const userIdRef = useRef<string | null>(null)
  const router = useRouter()
  const [savedDocId, setSavedDocId] = useState<string | null>(null)
  const entryRefs = useRef<(HTMLDivElement | null)[]>([])

  const lastEditedEntryIdRef = useRef<string | null>(null)
  const [savingEntryId, setSavingEntryId] = useState<string | null>(null)
  const [savedIndicatorId, setSavedIndicatorId] = useState<string | null>(null)
  const [savedIndicatorFading, setSavedIndicatorFading] = useState(false)
  const savedFadeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Keep ref in sync so callbacks don't close over stale state
  useEffect(() => { window.scrollTo(0, 0) }, [])
  useEffect(() => { pendingIdRef.current = pendingId }, [pendingId])

  useEffect(() => {
    async function load() {
      const supabase = createSupabaseBrowserClient()
      const [inv, { data: { user } }] = await Promise.all([
        fetchKeepsakeInventory(),
        supabase.auth.getUser(),
      ])
      if (user) userIdRef.current = user.id
      if (inv) {
        docIdRef.current = inv.id
        setSavedDocId(inv.id)
        const storedSave = user ? localStorage.getItem(`nightside.lastSaved.${user.id}.${inv.id}`) : null
        const savedDate = storedSave ? new Date(storedSave) : inv.created_at ? new Date(inv.created_at) : null
        if (savedDate) setLastSavedAt(savedDate)
        const loaded = inv.entries
          .map((e) => ({ ...e, why: e.why ?? '' }))
          .filter((e) => !isEntryEmpty(e))
        setEntries(loaded)
        if (loaded.length > 0) {
          setOpenIdx(new Set(loaded.map((_, i) => i)))
        }
      }
      setLoading(false)
    }
    load()
  }, [])

  useEffect(() => {
    if (!lastSavedAt) return
    const interval = window.setInterval(() => setStatusNow(Date.now()), 30000)
    return () => window.clearInterval(interval)
  }, [lastSavedAt])

  const hasAnyContent = useMemo(
    () => entries.some((e) => !isEntryEmpty(e)),
    [entries]
  )

  const saveStatusText = useMemo(() => {
    if (!lastSavedAt) return null
    const diff = Math.max(statusNow - lastSavedAt.getTime(), 0)
    const s = Math.floor(diff / 1000), m = Math.floor(s / 60), h = Math.floor(m / 60), d = Math.floor(h / 24), w = Math.floor(d / 7)
    if (s < 60) return 'Saved just now'
    if (m < 60) return `Saved ${m}m ago`
    if (h < 24) return h === 1 ? 'Saved 1h ago' : `Saved ${h}h ago`
    if (d < 7) return d === 1 ? 'Saved 1 day ago' : `Saved ${d} days ago`
    return w === 1 ? 'Saved 1 week ago' : `Saved ${w} weeks ago`
  }, [lastSavedAt, statusNow])

  const scheduleSave = useCallback((nextEntries: KeepsakeEntry[]) => {
    const saveable = nextEntries.filter((e) => !isEntryEmpty(e))
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(async () => {
      const targetId = lastEditedEntryIdRef.current
      setSavingEntryId(targetId)
      if (docIdRef.current) {
        await saveKeepsakeInventory(docIdRef.current, saveable)
      } else if (saveable.length > 0) {
        const inv = await createKeepsakeInventory(saveable)
        if (inv) { docIdRef.current = inv.id; setSavedDocId(inv.id) }
      }
      setSavingEntryId(null)
      if (saveable.length > 0) {
        if (docIdRef.current && userIdRef.current) localStorage.setItem(`nightside.lastSaved.${userIdRef.current}.${docIdRef.current}`, new Date().toISOString())
        setLastSavedAt(new Date())
        setStatusNow(Date.now())
        if (targetId) {
          if (savedFadeTimerRef.current) clearTimeout(savedFadeTimerRef.current)
          setSavedIndicatorId(targetId)
          setSavedIndicatorFading(false)
          savedFadeTimerRef.current = setTimeout(() => {
            setSavedIndicatorFading(true)
            setTimeout(() => setSavedIndicatorId(null), 400)
          }, 2600)
        }
      }
    }, AUTOSAVE_DELAY)
  }, [])

  async function handlePreviewExport() {
    const id = docIdRef.current
    if (!id) return
    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
      debounceRef.current = null
      const saveable = entries.filter((e) => !isEntryEmpty(e))
      await saveKeepsakeInventory(id, saveable)
    }
    router.push(`/app/entries/${id}`)
  }

  // Discard pending entry if it's still empty
  function discardEmptyPending() {
    const pid = pendingIdRef.current
    if (!pid) return
    setEntries((prev) => {
      const entry = prev.find((e) => e.id === pid)
      if (entry && isEntryEmpty(entry)) {
        setPendingId(null)
        pendingIdRef.current = null
        return prev.filter((e) => e.id !== pid)
      }
      return prev
    })
  }

  function addEntry() {
    // Clean up any existing empty pending entry first
    discardEmptyPending()

    const newEntry = makeEntry()
    setPendingId(newEntry.id)
    pendingIdRef.current = newEntry.id

    setEntries((prev) => {
      const next = [...prev, newEntry]
      const newIdx = next.length - 1
      setOpenIdx((old) => new Set([...old, newIdx]))
      setTimeout(() => entryRefs.current[newIdx]?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 50)
      return next
    })
  }

  function deleteEntry(idx: number) {
    setEntries((prev) => {
      const removed = prev[idx]
      if (removed && removed.id === pendingIdRef.current) {
        setPendingId(null)
        pendingIdRef.current = null
      }
      const next = prev.filter((_, i) => i !== idx)
      setOpenIdx((old) => {
        const n = new Set<number>()
        old.forEach((i) => { if (i < idx) n.add(i); else if (i > idx) n.add(i - 1) })
        return n
      })
      scheduleSave(next)
      return next
    })
  }

  function updateEntry(idx: number, field: keyof KeepsakeEntry, value: string) {
    setEntries((prev) => {
      const next = prev.map((e, i) => i === idx ? { ...e, [field]: value } : e)
      // Promote pending entry to committed once it has content
      const updated = next[idx]
      if (updated && updated.id === pendingIdRef.current && !isEntryEmpty(updated)) {
        setPendingId(null)
        pendingIdRef.current = null
      }
      lastEditedEntryIdRef.current = updated?.id ?? null
      scheduleSave(next)
      return next
    })
  }

  function toggleEntry(idx: number) {
    setOpenIdx((prev) => {
      const n = new Set(prev)
      n.has(idx) ? n.delete(idx) : n.add(idx)
      return n
    })
  }

  // Only render entries that have content, plus the active pending entry
  const visibleEntries = entries.filter((e) => !isEntryEmpty(e) || e.id === pendingId)

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
    <div className="min-h-screen bg-[#BBABF4] relative">
      {savedDocId && hasAnyContent && (
        <div className="capture-export-bar" style={{ position: 'absolute', top: 20, right: 152, zIndex: 10, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
          <button
            type="button"
            onClick={handlePreviewExport}
            className="hover:opacity-90 transition-opacity mobile-sticky-export"
            style={{ display: 'flex', alignItems: 'center', gap: 6, borderRadius: 999, padding: '10px 20px', fontFamily: hv, fontSize: 14, fontWeight: 600, background: '#DB5835', color: '#130426', border: 'none', cursor: 'pointer', whiteSpace: 'nowrap' }}
          >
            <svg width="14" height="14" viewBox="0 0 13 13" fill="none" aria-hidden="true">
              <path d="M6.5 1.5v6M3.5 5.5L6.5 8.5L9.5 5.5" stroke="#F8F4EB" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M1.5 10.5h10" stroke="#F8F4EB" strokeWidth="1.4" strokeLinecap="round" />
            </svg>
            <span className="hidden md:inline">Preview &amp; </span>Export
          </button>
          {saveStatusText && (
            <span style={{ fontSize: 12, fontWeight: 500, color: 'rgba(19,4,38,0.75)', fontFamily: hv }}>{saveStatusText}</span>
          )}
        </div>
      )}
      <div style={{ maxWidth: 720, margin: '0 auto', padding: '48px 24px 96px' }}>

        <div style={{ marginBottom: 32 }}>
          <Breadcrumbs
            theme="light"
            items={[
              { label: 'Plan', href: '/app/plan' },
              { label: 'Keepsakes Inventory' },
            ]}
          />
        </div>

        {/* Title */}
        <div style={{ marginBottom: 20 }}>
          <h1 className="text-[34px] font-semibold leading-[0.98] tracking-[-0.03em] md:text-[42px]" style={{ color: '#130426', marginBottom: 0 }}>
            Keepsakes Inventory
          </h1>
        </div>

        {/* Subtitle */}
        <p style={{ fontFamily: hv, fontSize: 18, lineHeight: 1.5, fontWeight: 400, color: '#130426', maxWidth: 720, marginBottom: 20 }}>
          This is where you can record objects that matter to you, and any guidance you want to share about them.
        </p>
        <p style={{ fontFamily: hv, fontSize: 15, lineHeight: 1.5, fontWeight: 400, color: 'rgba(19,4,38,0.65)', maxWidth: 720, marginBottom: 20 }}>
          <strong style={{ fontWeight: 700 }}>This is not a legal document.</strong> For items of financial or legal importance, include them in your will or speak with a lawyer.
        </p>

        {/* Section label — Reflection */}
        <p style={{ fontFamily: afG, fontSize: 24, fontWeight: 600, color: '#1A1A1A', lineHeight: 1.2, marginBottom: 16, marginTop: 0 }}>
          Reflection
        </p>

        {/* Reflection panel */}
        <div style={{
          background: '#ffffff',
          border: '1px solid #e7e1d6',
          borderRadius: 16,
          padding: '24px 28px',
          marginBottom: 36,
        }}>
          <p style={{ fontFamily: hv, fontSize: 18, lineHeight: 1.4, fontWeight: 700, color: '#130426', margin: '0 0 16px 0' }}>
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

        {/* Section label — Your keepsakes */}
        <p style={{ fontFamily: afG, fontSize: 24, fontWeight: 600, color: '#1A1A1A', lineHeight: 1.2, marginBottom: 8, marginTop: 0 }}>
          Your keepsakes
        </p>

        {/* Transition line */}
        <p style={{ fontFamily: hv, fontSize: 15, lineHeight: 1.55, color: 'rgba(19,4,38,0.85)', marginBottom: 8, marginTop: 0 }}>
          Add anything you&rsquo;d want someone to know about the things that matter to you.
        </p>
        <AutosaveNotice style={{ marginBottom: 16 }}>Keepsakes you add will save automatically to Your Plan.</AutosaveNotice>

        {/* Dynamic entries — only render those with content or the active pending entry */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {visibleEntries.map((entry) => {
            const idx = entries.indexOf(entry)
            return (
              <EntryCard
                key={entry.id}
                entry={entry}
                isOpen={openIdx.has(idx)}
                onToggle={() => toggleEntry(idx)}
                onDelete={() => deleteEntry(idx)}
                onChange={(field, value) => updateEntry(idx, field, value)}
                onBlurCard={discardEmptyPending}
                entryRef={(el) => { entryRefs.current[idx] = el }}
                isSaving={savingEntryId === entry.id}
                isSaved={savedIndicatorId === entry.id}
                savedFading={savedIndicatorFading}
              />
            )
          })}
        </div>

        {/* Add button */}
        <div style={{ marginTop: 12 }}>
          <button
            type="button"
            onClick={addEntry}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#FFFFFF', border: '1px solid #2C3777', borderRadius: 999, padding: '10px 18px', fontFamily: hv, fontSize: 14, color: '#2C3777', cursor: 'pointer', fontWeight: 500 }}
          >
            + Add keepsake
          </button>
        </div>

      </div>
    </div>
  )
}
