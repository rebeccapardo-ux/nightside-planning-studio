'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import AlertIcon from '@/app/components/AlertIcon'
import AutosaveNotice from '@/app/components/AutosaveNotice'
import DocHeaderBanner, { docBannerIntro, docBannerNote } from '@/app/components/capture/DocHeaderBanner'
import {
  fetchKeepsakeInventory,
  createKeepsakeInventory,
  saveKeepsakeInventory,
  type KeepsakeEntry,
} from '@/lib/keepsakes'
import { createSupabaseBrowserClient } from '@/lib/supabase-browser'
import { holdSavingIndicator } from '@/lib/ui'

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
        // Only when focus leaves the entire card (not moving between fields inside
        // it) AND the entry is still empty: discard it. Clearing a field while the
        // cursor is still in the card never makes it vanish — it goes only when you
        // actually leave an empty card.
        if (isEntryEmpty(entry) && !e.currentTarget.contains(e.relatedTarget as Node)) {
          onDelete()
        }
      }}
      style={{ background: '#E7E1D6', border: '1px solid rgba(19,4,38,0.14)', borderRadius: 12, overflow: 'hidden' }}
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
                <span style={{ fontFamily: hv, fontSize: 12, fontWeight: 500, color: 'rgba(19,4,38,0.65)' }}>Saved to Your materials</span>
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
  const [loading, setLoading] = useState(true)
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null)
  const [statusNow, setStatusNow] = useState(() => Date.now())
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const docIdRef = useRef<string | null>(null)
  const userIdRef = useRef<string | null>(null)
  const router = useRouter()
  const [savedDocId, setSavedDocId] = useState<string | null>(null)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const entryRefs = useRef<(HTMLDivElement | null)[]>([])

  const lastEditedEntryIdRef = useRef<string | null>(null)
  const [savingEntryId, setSavingEntryId] = useState<string | null>(null)
  const [savedIndicatorId, setSavedIndicatorId] = useState<string | null>(null)
  const [savedIndicatorFading, setSavedIndicatorFading] = useState(false)
  const savedFadeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => { window.scrollTo(0, 0) }, [])

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
        // Default to collapsed on load, consistent with every other document
        // (the practical docs via openSection, the wishes docs via expandedIndex).
        // Keepsakes was the sole outlier that opened every entry on load.
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
    if (saveStatus === 'error') return "Couldn't save"
    if (!lastSavedAt) return null
    const diff = Math.max(statusNow - lastSavedAt.getTime(), 0)
    const s = Math.floor(diff / 1000), m = Math.floor(s / 60), h = Math.floor(m / 60), d = Math.floor(h / 24), w = Math.floor(d / 7)
    if (s < 60) return 'Saved just now'
    if (m < 60) return `Saved ${m}m ago`
    if (h < 24) return h === 1 ? 'Saved 1h ago' : `Saved ${h}h ago`
    if (d < 7) return d === 1 ? 'Saved 1 day ago' : `Saved ${d} days ago`
    return w === 1 ? 'Saved 1 week ago' : `Saved ${w} weeks ago`
  }, [lastSavedAt, statusNow, saveStatus])

  const scheduleSave = useCallback((nextEntries: KeepsakeEntry[]) => {
    const saveable = nextEntries.filter((e) => !isEntryEmpty(e))
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(async () => {
      const targetId = lastEditedEntryIdRef.current
      setSavingEntryId(targetId)
      setSaveStatus('saving')
      const startedAt = Date.now()
      // Capture the lib results — a failed save must not show a false "Saved".
      let ok = true
      try {
        if (docIdRef.current) {
          ok = await saveKeepsakeInventory(docIdRef.current, saveable)
        } else if (saveable.length > 0) {
          const inv = await createKeepsakeInventory(saveable)
          if (inv) { docIdRef.current = inv.id; setSavedDocId(inv.id) }
          else ok = false
        }
      } catch {
        ok = false
      }
      await holdSavingIndicator(startedAt)
      setSavingEntryId(null)
      if (!ok) {
        setSaveStatus('error')
        return
      }
      if (saveable.length > 0) {
        setSaveStatus('saved')
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
      } else {
        setSaveStatus('idle')
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
    // Non-sensitive document: skip the snapshot, go straight to the export preview.
    router.push(`/app/entries/${id}/export`)
  }

  function addEntry() {
    // Reuse an existing empty draft instead of stacking another empty card. The
    // blur-discard alone can't catch Add→Add here: this surface doesn't autofocus
    // the new card, so the first card is never focused and never blurs. (This guard
    // was in the original Keepsakes pattern; it was wrongly dropped in the Push 1
    // render-filter correction.)
    const existingIdx = entries.findIndex((e) => isEntryEmpty(e))
    if (existingIdx !== -1) {
      setOpenIdx((old) => new Set([...old, existingIdx]))
      setTimeout(() => entryRefs.current[existingIdx]?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 50)
      return
    }
    const newEntry = makeEntry()
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
      lastEditedEntryIdRef.current = next[idx]?.id ?? null
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

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8F4EB]">
        <div style={{ maxWidth: 720, margin: '0 auto', padding: '48px 24px', fontFamily: hv, fontSize: 14, color: '#2C3777' }}>
          Loading…
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#F8F4EB] relative">
      {savedDocId && hasAnyContent && (
        <div className="capture-export-bar" style={{ position: 'absolute', top: 20, right: 152, zIndex: 10, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
          <button
            type="button"
            onClick={handlePreviewExport}
            className="transition-opacity mobile-sticky-export"
            onMouseEnter={(e) => { e.currentTarget.style.background = '#EAE4D8' }}
            onMouseLeave={(e) => { e.currentTarget.style.background = '#F8F4EB' }}
            style={{ display: 'flex', alignItems: 'center', gap: 6, borderRadius: 999, padding: '10px 20px', fontFamily: hv, fontSize: 14, fontWeight: 600, background: '#F8F4EB', color: '#130426', border: 'none', cursor: 'pointer', whiteSpace: 'nowrap' }}
          >
            <svg width="14" height="14" viewBox="0 0 13 13" fill="none" aria-hidden="true">
              <path d="M6.5 1.5v6M3.5 5.5L6.5 8.5L9.5 5.5" stroke="#130426" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M1.5 10.5h10" stroke="#130426" strokeWidth="1.4" strokeLinecap="round" />
            </svg>
            Export
          </button>
          {saveStatusText && (
            <span style={{ fontSize: 12, fontWeight: 500, color: saveStatus === 'error' ? '#8B0000' : '#F8F4EB', fontFamily: hv }}>{saveStatus === 'error' && <AlertIcon color="#8B0000" />}{saveStatusText}</span>
          )}
        </div>
      )}
      {/* Error must surface even when the export bar is hidden — e.g. a brand-new
          keepsake whose first save fails offline (savedDocId never gets set). */}
      {saveStatus === 'error' && !(savedDocId && hasAnyContent) && (
        <div style={{ position: 'absolute', top: 20, right: 152, zIndex: 10 }}>
          <span style={{ fontSize: 12, fontWeight: 500, color: '#8B0000', fontFamily: hv }}><AlertIcon color="#8B0000" />Couldn&apos;t save</span>
        </div>
      )}
      <DocHeaderBanner title="Keepsakes Inventory" crumbLabel="Keepsakes Inventory" docCategory="practical">
        <p style={docBannerIntro}>
          This is where you can record objects that matter to you, and any guidance you want to share about them.
        </p>
        <p style={docBannerNote}>
          <strong style={{ fontWeight: 700 }}>This is not a legal document.</strong> For items of financial or legal importance, include them in your will or speak with a lawyer.
        </p>
      </DocHeaderBanner>

      <div style={{ maxWidth: 720, marginLeft: 'max(0px, calc((100% - 1152px) / 2))', marginRight: 'auto', padding: '40px 24px 96px' }}>

        {/* Section label — Reflection */}
        <p style={{ fontFamily: afG, fontSize: 24, fontWeight: 600, color: '#1A1A1A', lineHeight: 1.2, marginBottom: 16, marginTop: 0 }}>
          Reflection
        </p>

        {/* Reflection prompts — directly on the cream page (no panel; these are guidance, not a
            grouped object). Body-copy color, not navy (navy read like hyperlinks). */}
        <div style={{ marginBottom: 36 }}>
          <p style={{ fontFamily: hv, fontSize: 18, lineHeight: 1.4, fontWeight: 700, color: '#130426', margin: '0 0 16px 0' }}>
            Think of an object you have from someone who is no longer here.
          </p>
          <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 10 }}>
            {REFLECTION_PROMPTS.map((prompt) => (
              <li key={prompt} style={{ display: 'flex', gap: 8 }}>
                <span style={{ color: 'rgba(19,4,38,0.85)', flexShrink: 0 }}>·</span>
                <span style={{ fontFamily: hv, fontSize: 16, lineHeight: 1.6, fontWeight: 400, color: 'rgba(19,4,38,0.85)' }}>{prompt}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Section label — Your keepsakes (extra top space to separate from Reflection above) */}
        <p style={{ fontFamily: afG, fontSize: 24, fontWeight: 600, color: '#1A1A1A', lineHeight: 1.2, marginBottom: 8, marginTop: 24 }}>
          Your keepsakes
        </p>

        {/* Transition line */}
        <p style={{ fontFamily: hv, fontSize: 15, lineHeight: 1.55, color: 'rgba(19,4,38,0.85)', marginBottom: 8, marginTop: 0 }}>
          Add anything you&rsquo;d want someone to know about the things that matter to you.
        </p>
        <AutosaveNotice style={{ marginBottom: 16 }}>Keepsakes you add will save automatically to Your materials.</AutosaveNotice>

        {/* No wrapping panel — each keepsake is an individual card, not one grouped section.
            The contrast that used to come from a dark-cream panel now lives on each card
            (#E7E1D6 warm-neutral greige fill, see EntryCard): a functional contrast surface
            (neutral, not a hue) that separates the card from the cream page AND gives the white
            input boxes real contrast (cream-on-cream was too subtle). */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {entries.map((entry, idx) => {
            return (
              <EntryCard
                key={entry.id}
                entry={entry}
                isOpen={openIdx.has(idx)}
                onToggle={() => toggleEntry(idx)}
                onDelete={() => deleteEntry(idx)}
                onChange={(field, value) => updateEntry(idx, field, value)}
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
