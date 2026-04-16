'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { createSupabaseBrowserClient } from '@/lib/supabase-browser'
import Link from 'next/link'

const RESOURCE_HUB_URL = 'https://thenightside.net/resources'

const STRUCTURED_ACTIVITIES = ['values_ranking', 'fears_ranking', 'legacy_map']

type FormState = {
  perfectDeath: string
  whatMatters: string
  values: string
  unacceptable: string
  worries: string
  caregiver: string
}

type SaveState = 'idle' | 'saving' | 'saved' | 'error'

const EMPTY_FORM: FormState = {
  perfectDeath: '',
  whatMatters: '',
  values: '',
  unacceptable: '',
  worries: '',
  caregiver: '',
}

type PanelEntry = {
  id: string
  title: string | null
  content: unknown
  activity: string | null
  document_type: string | null
  group: 'healthcare' | 'output' | 'manual'
}

// Deduplicated output: one card per activity type, with count
type OutputCard = {
  representative: PanelEntry
  count: number
}

type PanelNote = {
  id: string
  content: string
  originType: string | null
  promptContext: string | null
}

type ListItem =
  | { kind: 'entry'; data: PanelEntry }
  | { kind: 'note'; data: PanelNote }

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export default function AdvanceDirectivePage() {
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [entryId, setEntryId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const [saveState, setSaveState] = useState<SaveState>('idle')
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null)
  const [statusNow, setStatusNow] = useState(Date.now())

  const [focusedField, setFocusedField] = useState<keyof FormState | null>(null)
  // Tracks cursor position in last-focused field (ref = no re-render on every keystroke)
  const insertionPointRef = useRef<{ field: keyof FormState; pos: number } | null>(null)

  useEffect(() => {
    async function load() {
      const supabase = createSupabaseBrowserClient()

      try {
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser()

        if (userError) {
          console.error('AUTH ERROR:', userError)
          return
        }

        if (!user) {
          console.error('No authenticated user found.')
          return
        }

        const { data: existingRows, error: loadError } = await supabase
          .from('entries')
          .select('id, content, created_at, document_type')
          .eq('user_id', user.id)
          .eq('document_type', 'advance_directive_supplement')
          .order('created_at', { ascending: false })
          .limit(1)

        if (loadError) {
          console.error('LOAD ERROR:', loadError)
          return
        }

        const existing = existingRows?.[0]

        if (existing) {
          setEntryId(existing.id)
          setForm({
            perfectDeath: existing.content?.perfectDeath || '',
            whatMatters: existing.content?.whatMatters || '',
            values: existing.content?.values || '',
            unacceptable: existing.content?.unacceptable || '',
            worries: existing.content?.worries || '',
            caregiver: existing.content?.caregiver || '',
          })

          if (existing.created_at) {
            setLastSavedAt(new Date(existing.created_at))
          }
        }
      } catch (err) {
        console.error('UNEXPECTED LOAD ERROR:', err)
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [])

  useEffect(() => {
    if (!lastSavedAt) return

    const interval = window.setInterval(() => {
      setStatusNow(Date.now())
    }, 30000)

    return () => window.clearInterval(interval)
  }, [lastSavedAt])

  function updateField(field: keyof FormState, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  function handleCursorChange(field: keyof FormState, pos: number) {
    insertionPointRef.current = { field, pos }
  }

  function insertIntoField(field: keyof FormState, text: string) {
    setForm((prev) => {
      const current = prev[field]
      return { ...prev, [field]: current ? current + '\n\n' + text : text }
    })
  }

  function insertIntoFocused(text: string) {
    if (!focusedField) return
    setForm((prev) => {
      const current = prev[focusedField]
      const point = insertionPointRef.current
      if (point?.field === focusedField) {
        const pos = Math.min(point.pos, current.length)
        const before = current.slice(0, pos)
        const after = current.slice(pos)
        const preSep = before.length > 0 && !/\n\n$/.test(before) ? '\n\n' : ''
        const postSep = after.length > 0 && !/^\n\n/.test(after) ? '\n\n' : ''
        return { ...prev, [focusedField]: before + preSep + text + postSep + after }
      }
      // Fallback: append at end
      return { ...prev, [focusedField]: current ? current + '\n\n' + text : text }
    })
  }

  async function associateWithHealthcare(id: string) {
    try {
      const supabase = createSupabaseBrowserClient()
      const { data: container } = await supabase
        .from('containers')
        .select('id')
        .eq('type', 'domain')
        .ilike('title', '%healthcare%')
        .maybeSingle()

      if (!container) return

      const { data: existing } = await supabase
        .from('container_entries')
        .select('entry_id')
        .eq('container_id', container.id)
        .eq('entry_id', id)
        .maybeSingle()

      if (!existing) {
        await supabase
          .from('container_entries')
          .insert({ container_id: container.id, entry_id: id })
      }
    } catch (err) {
      console.error('HEALTHCARE ASSOCIATE ERROR:', err)
    }
  }

  async function handleSave() {
    const supabase = createSupabaseBrowserClient()

    try {
      setSaveState('saving')

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser()

      if (userError) {
        console.error('SAVE AUTH ERROR:', userError)
        setSaveState('error')
        return
      }

      if (!user) {
        console.error('No authenticated user found during save.')
        setSaveState('error')
        return
      }

      if (!entryId) {
        const payload = {
          user_id: user.id,
          title: 'Advance Directive Supplement',
          section: 'capture',
          activity: 'advance_directive',
          document_type: 'advance_directive_supplement',
          content: form,
        }

        const { data: created, error: createError } = await supabase
          .from('entries')
          .insert(payload)
          .select('id, content, created_at')
          .single()

        if (createError) {
          console.error('SAVE-CREATE ERROR:', createError)
          setSaveState('error')
          return
        }

        if (created) {
          setEntryId(created.id)
          setLastSavedAt(new Date())
          setStatusNow(Date.now())
          setSaveState('saved')
          associateWithHealthcare(created.id)

          window.setTimeout(() => {
            setSaveState((current) => (current === 'saved' ? 'idle' : current))
          }, 2000)
        }

        return
      }

      const { error } = await supabase
        .from('entries')
        .update({ content: form })
        .eq('id', entryId)

      if (error) {
        console.error('SAVE ERROR:', error)
        setSaveState('error')
        return
      }

      setLastSavedAt(new Date())
      setStatusNow(Date.now())
      setSaveState('saved')
      associateWithHealthcare(entryId)

      window.setTimeout(() => {
        setSaveState((current) => (current === 'saved' ? 'idle' : current))
      }, 2000)
    } catch (err) {
      console.error('UNEXPECTED SAVE ERROR:', err)
      setSaveState('error')
    }
  }

  const saveButtonLabel = useMemo(() => {
    if (saveState === 'saving') return 'Saving...'
    if (saveState === 'saved') return 'Saved'
    if (saveState === 'error') return 'Try saving again'
    return 'Save progress'
  }, [saveState])

  const saveStatusText = useMemo(() => {
    if (!lastSavedAt) return null

    const diffMs = Math.max(statusNow - lastSavedAt.getTime(), 0)
    const diffSeconds = Math.floor(diffMs / 1000)
    const diffMinutes = Math.floor(diffSeconds / 60)
    const diffHours = Math.floor(diffMinutes / 60)
    const diffDays = Math.floor(diffHours / 24)

    if (diffSeconds < 10) return 'Saved just now'
    if (diffSeconds < 60) return `Saved ${diffSeconds}s ago`
    if (diffMinutes < 60) return `Last updated ${diffMinutes}m ago`
    if (diffHours < 24) return `Last updated ${diffHours}h ago`
    return `Last updated ${diffDays}d ago`
  }, [lastSavedAt, statusNow])

  if (loading) {
    return (
      <div className="min-h-screen bg-[#BBABF4]">
        <div className="max-w-3xl mx-auto px-4 py-16 text-[#130426]/60">
          Loading...
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#BBABF4]">
    <div className="max-w-6xl mx-auto px-4 py-16">
      <div className="lg:grid lg:grid-cols-[1fr_340px] lg:gap-12 items-start">

        {/* LEFT: form */}
        <div>
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-[#130426] mb-5">
              Advance Directive Supplement
            </h1>

            {/* Explanatory block — always visible */}
            <div className="rounded-xl bg-[#130426]/[0.08] border border-[#130426]/[0.12] px-5 py-4 mb-4">
              <p className="text-[#130426]/85 text-sm leading-relaxed mb-1">
                This document helps you express your values, preferences, and what matters to you in your care.
              </p>
              <p className="text-[#130426]/85 text-sm leading-relaxed mb-1">
                It is not a legal directive, but can be used alongside one to provide important context.
              </p>
              <p className="text-[#130426]/85 text-sm leading-relaxed mb-3">
                You can revisit, edit, or export it in{' '}
                <Link href="/app/materials" className="underline underline-offset-2 hover:text-[#130426]/70 transition-colors">My Materials</Link>.
              </p>
              <a
                href={RESOURCE_HUB_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-[#130426] underline underline-offset-2 hover:text-[#130426]/70 transition-colors"
              >
                Looking for official legal forms? View province-specific resources →
              </a>
            </div>
          </div>

          <div className="space-y-6">
            <Field
              label="My perfect death would involve:"
              value={form.perfectDeath}
              onChange={(v) => updateField('perfectDeath', v)}
              onFocus={() => setFocusedField('perfectDeath')}
              onCursorChange={(pos) => handleCursorChange('perfectDeath', pos)}
            />

            <Field
              label="At the end of my life, this is what matters most:"
              value={form.whatMatters}
              onChange={(v) => updateField('whatMatters', v)}
              onFocus={() => setFocusedField('whatMatters')}
              onCursorChange={(pos) => handleCursorChange('whatMatters', pos)}
            />

            <Field
              label="My most important personal values:"
              value={form.values}
              onChange={(v) => updateField('values', v)}
              onFocus={() => setFocusedField('values')}
              onCursorChange={(pos) => handleCursorChange('values', pos)}
            />

            <Field
              label="What would make prolonging life unacceptable for me:"
              value={form.unacceptable}
              onChange={(v) => updateField('unacceptable', v)}
              onFocus={() => setFocusedField('unacceptable')}
              onCursorChange={(pos) => handleCursorChange('unacceptable', pos)}
            />

            <Field
              label="When I think about death, this is what I worry about:"
              value={form.worries}
              onChange={(v) => updateField('worries', v)}
              onFocus={() => setFocusedField('worries')}
              onCursorChange={(pos) => handleCursorChange('worries', pos)}
            />

            <Field
              label="What I want my caregiver/care team to know:"
              value={form.caregiver}
              onChange={(v) => updateField('caregiver', v)}
              onFocus={() => setFocusedField('caregiver')}
              onCursorChange={(pos) => handleCursorChange('caregiver', pos)}
            />

            <div className="pt-2 space-y-2">
              <button
                onClick={handleSave}
                disabled={saveState === 'saving'}
                className="px-6 py-3 bg-[#f29836] text-[#130426] rounded font-semibold hover:bg-[#f29836]/90 transition disabled:opacity-50"
              >
                {saveButtonLabel}
              </button>

              {(saveStatusText || saveState === 'error') && (
                <div className="space-y-1">
                  {saveStatusText && (
                    <p className="text-sm text-[#130426]/80">{saveStatusText}</p>
                  )}

                  {saveState === 'error' ? (
                    <p className="text-sm text-[#130426]">
                      Your changes did not save. Please try again.
                    </p>
                  ) : (
                    <p className="text-sm text-[#130426]/60">
                      You can return to this anytime in{' '}
                      <Link href="/app/materials" className="underline">
                        My Materials
                      </Link>
                      .
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* RIGHT: materials panel */}
        <div className="lg:sticky lg:top-40 mt-12 lg:mt-0">
          <MaterialsPanel
            focusedField={focusedField}
            onInsert={insertIntoFocused}
            onInsertInto={insertIntoField}
          />
        </div>

      </div>
    </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Field component
// ---------------------------------------------------------------------------

function Field({
  label,
  value,
  onChange,
  onFocus,
  onCursorChange,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  onFocus?: () => void
  onCursorChange?: (pos: number) => void
}) {
  function trackCursor(e: React.SyntheticEvent<HTMLTextAreaElement>) {
    onCursorChange?.((e.currentTarget).selectionStart)
  }

  return (
    <div>
      <label className="block text-[#130426]/80 text-sm mb-2">{label}</label>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={onFocus}
        onSelect={trackCursor}
        onKeyUp={trackCursor}
        rows={4}
        className="w-full bg-[#f8f4eb] text-[#130426] placeholder:text-[#130426]/40 px-4 py-3 rounded-lg focus:outline-none"
      />
    </div>
  )
}

// ---------------------------------------------------------------------------
// MaterialsPanel
// ---------------------------------------------------------------------------

function MaterialsPanel({
  focusedField,
  onInsert,
  onInsertInto,
}: {
  focusedField: keyof FormState | null
  onInsert: (text: string) => void
  onInsertInto: (field: keyof FormState, text: string) => void
}) {
  const [healthcareItems, setHealthcareItems] = useState<PanelEntry[]>([])
  const [outputItems, setOutputItems] = useState<PanelEntry[]>([])
  const [manualItems, setManualItems] = useState<PanelEntry[]>([])
  const [healthcareNotes, setHealthcareNotes] = useState<PanelNote[]>([])
  const [manualNotes, setManualNotes] = useState<PanelNote[]>([])
  const [loadingPanel, setLoadingPanel] = useState(true)
  const [showBrowser, setShowBrowser] = useState(false)

  useEffect(() => {
    async function fetchPanelData() {
      try {
        const supabase = createSupabaseBrowserClient()
        const {
          data: { user },
        } = await supabase.auth.getUser()
        if (!user) return

        // Healthcare-linked entries — exclude structured outputs
        const { data: container } = await supabase
          .from('containers')
          .select('id')
          .eq('type', 'domain')
          .ilike('title', '%healthcare%')
          .maybeSingle()

        if (container) {
          const { data: links } = await supabase
            .from('container_entries')
            .select('entry_id')
            .eq('container_id', container.id)

          if (links && links.length > 0) {
            const ids = links.map((l) => l.entry_id)
            const { data: entries } = await supabase
              .from('entries')
              .select('id, title, content, activity, document_type')
              .in('id', ids)
              .eq('user_id', user.id)
              .order('created_at', { ascending: false })

            // Exclude structured outputs from healthcare group
            const filtered = (entries || []).filter(
              (e) => !STRUCTURED_ACTIVITIES.includes(e.activity ?? ''),
            )
            setHealthcareItems(
              filtered.map((e) => ({ ...e, group: 'healthcare' as const })),
            )
          }

          // Also fetch healthcare-linked notes
          const { data: noteLinks } = await supabase
            .from('container_notes')
            .select('note_id')
            .eq('container_id', container.id)

          if (noteLinks && noteLinks.length > 0) {
            const noteIds = noteLinks.map((l) => l.note_id)
            const { data: notesData } = await supabase
              .from('notes')
              .select('id, content, origin_type, prompt_context')
              .in('id', noteIds)
              .order('created_at', { ascending: false })

            setHealthcareNotes(
              (notesData || []).map((n) => ({
                id: n.id,
                content: n.content,
                originType: n.origin_type ?? null,
                promptContext: n.prompt_context ?? null,
              })),
            )
          }
        }

        // Structured outputs only
        const { data: outputs } = await supabase
          .from('entries')
          .select('id, title, content, activity, document_type')
          .eq('user_id', user.id)
          .in('activity', STRUCTURED_ACTIVITIES)
          .order('created_at', { ascending: false })

        setOutputItems(
          (outputs || []).map((e) => ({ ...e, group: 'output' as const })),
        )
      } catch (err) {
        console.error('PANEL FETCH ERROR:', err)
      } finally {
        setLoadingPanel(false)
      }
    }

    fetchPanelData()
  }, [])

  // Deduplicate outputs: one card per activity type
  const deduplicatedOutputs: OutputCard[] = useMemo(() => {
    const byActivity = new Map<string, PanelEntry[]>()
    for (const item of outputItems) {
      const key = item.activity ?? 'unknown'
      if (!byActivity.has(key)) byActivity.set(key, [])
      byActivity.get(key)!.push(item)
    }
    return Array.from(byActivity.values()).map((items) => ({
      representative: items[0],
      count: items.length,
    }))
  }, [outputItems])

  function addManualItem(entry: PanelEntry) {
    setManualItems((prev) => {
      if (prev.some((e) => e.id === entry.id)) return prev
      return [...prev, entry]
    })
  }

  function addManualNote(note: PanelNote) {
    setManualNotes((prev) => {
      if (prev.some((n) => n.id === note.id)) return prev
      return [...prev, note]
    })
  }

  const existingEntryIds = useMemo(
    () => new Set([...healthcareItems, ...outputItems, ...manualItems].map((e) => e.id)),
    [healthcareItems, outputItems, manualItems],
  )

  const existingNoteIds = useMemo(
    () => new Set([...healthcareNotes, ...manualNotes].map((n) => n.id)),
    [healthcareNotes, manualNotes],
  )

  // Flat list: entries + notes, deduped
  const allListItems: ListItem[] = useMemo(() => {
    const seenEntries = new Set<string>()
    const seenNotes = new Set<string>()
    const combined: ListItem[] = []

    for (const item of [
      ...healthcareItems,
      ...deduplicatedOutputs.map((d) => d.representative),
      ...manualItems,
    ]) {
      if (!seenEntries.has(item.id)) {
        seenEntries.add(item.id)
        combined.push({ kind: 'entry', data: item })
      }
    }

    for (const note of [...healthcareNotes, ...manualNotes]) {
      if (!seenNotes.has(note.id)) {
        seenNotes.add(note.id)
        combined.push({ kind: 'note', data: note })
      }
    }

    return combined
  }, [healthcareItems, deduplicatedOutputs, manualItems, healthcareNotes, manualNotes])

  const hasAny = allListItems.length > 0

  return (
    <div className="rounded-2xl bg-[#2C3777] p-5">
      {/* Panel header */}
      <div className="flex items-start justify-between gap-3 mb-2">
        <h2 className="text-[15px] font-semibold uppercase tracking-widest text-white">
          Relevant materials
        </h2>
        <button
          onClick={() => setShowBrowser(true)}
          className="shrink-0 text-[11px] hover:text-white underline underline-offset-2 transition-colors"
          style={{ color: 'rgba(255,255,255,0.75)' }}
        >
          + Add from My Materials
        </button>
      </div>
      {loadingPanel ? (
        <p className="text-[12px] mt-4" style={{ color: 'rgba(255,255,255,0.55)' }}>Loading...</p>
      ) : !hasAny ? (
        <div className="mt-4">
          <p className="text-[13px] text-white/60 leading-relaxed mb-4">
            No related materials yet.
          </p>
          <button
            onClick={() => setShowBrowser(true)}
            className="text-[12px] font-semibold rounded-lg px-3 py-1.5 transition-colors hover:opacity-90"
            style={{ background: '#F4F1EA', color: '#1A0F2E' }}
          >
            Add from My Materials
          </button>
        </div>
      ) : (
        <div className="space-y-2 mt-4">
          {allListItems.map((item) => (
            <UnifiedPanelItem
              key={item.data.id}
              item={item}
              focusedField={focusedField}
              onInsert={onInsert}
              onInsertInto={onInsertInto}
            />
          ))}
        </div>
      )}

      {showBrowser && (
        <MaterialsBrowser
          existingEntryIds={existingEntryIds}
          existingNoteIds={existingNoteIds}
          onAdd={(item) => {
            if (item.kind === 'entry') addManualItem(item.data)
            else addManualNote(item.data)
          }}
          onClose={() => setShowBrowser(false)}
        />
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// UnifiedPanelItem — single card style for all materials in this panel
// ---------------------------------------------------------------------------

const FIELD_OPTIONS: { key: keyof FormState; short: string }[] = [
  { key: 'perfectDeath',  short: 'My perfect death would involve' },
  { key: 'whatMatters',   short: 'What matters most' },
  { key: 'values',        short: 'My most important values' },
  { key: 'unacceptable',  short: 'What would make life unacceptable' },
  { key: 'worries',       short: 'What I worry about' },
  { key: 'caregiver',     short: 'What my care team should know' },
]

function getItemDisplayTitle(item: ListItem): string {
  if (item.kind === 'note') {
    const t = item.data.content.trim()
    return t.length > 72 ? t.slice(0, 72).trimEnd() + '…' : t
  }
  return getDisplayTitle(item.data)
}

function getItemTypeLabel(item: ListItem): string | null {
  if (item.kind === 'note') return 'Note'
  if (STRUCTURED_ACTIVITIES.includes(item.data.activity ?? '')) return 'Output'
  return null
}

function getItemInsertText(item: ListItem): string {
  if (item.kind === 'note') return item.data.content
  return formatForInsert(item.data)
}

function UnifiedPanelItem({
  item,
  focusedField,
  onInsert,
  onInsertInto,
}: {
  item: ListItem
  focusedField: keyof FormState | null
  onInsert: (text: string) => void
  onInsertInto: (field: keyof FormState, text: string) => void
}) {
  const [showChooser, setShowChooser] = useState(false)

  const title = getItemDisplayTitle(item)
  const typeLabel = getItemTypeLabel(item)
  const insertText = getItemInsertText(item)
  const viewHref = item.kind === 'entry' ? `/app/entries/${item.data.id}` : null

  function handleInsert() {
    if (focusedField) {
      onInsert(insertText)
      setShowChooser(false)
    } else {
      setShowChooser((prev) => !prev)
    }
  }

  function handleChoose(field: keyof FormState) {
    onInsertInto(field, insertText)
    setShowChooser(false)
  }

  return (
    <div className="rounded-lg px-3 py-2.5" style={{ background: 'rgba(255,255,255,0.08)' }}>
      <div className="flex items-baseline justify-between gap-2 mb-2">
        <p className="text-[13px] font-medium text-white leading-snug">{title}</p>
        {typeLabel && (
          <span className="shrink-0 text-[10px]" style={{ color: 'rgba(255,255,255,0.65)' }}>{typeLabel}</span>
        )}
      </div>
      <div className="flex items-center gap-3">
        <button
          onClick={handleInsert}
          className="text-[12px] font-semibold text-white hover:opacity-75 transition-opacity"
        >
          Insert
        </button>
        {viewHref && (
          <a
            href={viewHref}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[12px] hover:text-white transition-colors"
            style={{ color: 'rgba(255,255,255,0.70)' }}
          >
            View
          </a>
        )}
      </div>

      {showChooser && (
        <div className="mt-3 pt-3 border-t border-white/10">
          <p className="text-[11px] font-semibold text-white mb-2">
            Where would you like to add this?
          </p>
          <div className="space-y-0.5">
            {FIELD_OPTIONS.map(({ key, short }) => (
              <button
                key={key}
                onClick={() => handleChoose(key)}
                className="block w-full text-left text-[11px] px-2 py-1 rounded hover:bg-white/10 transition-colors"
                style={{ color: 'rgba(255,255,255,0.75)' }}
              >
                {short}
              </button>
            ))}
          </div>
          <button
            onClick={() => setShowChooser(false)}
            className="mt-2 text-[10px] hover:text-white transition-colors"
            style={{ color: 'rgba(255,255,255,0.65)' }}
          >
            Cancel
          </button>
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// MaterialsBrowser modal
// ---------------------------------------------------------------------------

function MaterialsBrowser({
  existingEntryIds,
  existingNoteIds,
  onAdd,
  onClose,
}: {
  existingEntryIds: Set<string>
  existingNoteIds: Set<string>
  onAdd: (item: ListItem) => void
  onClose: () => void
}) {
  const [allEntries, setAllEntries] = useState<PanelEntry[]>([])
  const [allNotes, setAllNotes] = useState<PanelNote[]>([])
  const [loadingBrowser, setLoadingBrowser] = useState(true)

  useEffect(() => {
    async function fetchAll() {
      try {
        const supabase = createSupabaseBrowserClient()
        const {
          data: { user },
        } = await supabase.auth.getUser()
        if (!user) return

        const { data } = await supabase
          .from('entries')
          .select('id, title, content, activity, document_type')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })

        setAllEntries(
          (data || []).map((e) => ({ ...e, group: 'manual' as const })),
        )

        const { data: notesData } = await supabase
          .from('notes')
          .select('id, content, origin_type, prompt_context')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })

        setAllNotes(
          (notesData || []).map((n) => ({
            id: n.id,
            content: n.content,
            originType: n.origin_type ?? null,
            promptContext: n.prompt_context ?? null,
          })),
        )
      } catch (err) {
        console.error('BROWSER FETCH ERROR:', err)
      } finally {
        setLoadingBrowser(false)
      }
    }

    fetchAll()
  }, [])

  const available = allEntries.filter((e) => !existingEntryIds.has(e.id))
  const availableNotes = allNotes.filter((n) => !existingNoteIds.has(n.id))

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
      style={{ background: 'rgba(26,15,46,0.85)' }}
      onClick={onClose}
    >
      <div
        className="rounded-2xl p-6 max-w-lg w-full mx-4 max-h-[70vh] flex flex-col"
        style={{ background: '#1A0F2E' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5 shrink-0">
          <h3 className="text-[16px] font-semibold text-white">Add from My Materials</h3>
          <button
            onClick={onClose}
            className="text-sm transition-colors hover:text-white"
            style={{ color: 'rgba(255,255,255,0.75)' }}
          >
            Close
          </button>
        </div>

        <div className="overflow-y-auto flex-1">
          {loadingBrowser ? (
            <p className="text-sm" style={{ color: 'rgba(255,255,255,0.75)' }}>Loading...</p>
          ) : available.length === 0 && availableNotes.length === 0 ? (
            <p className="text-sm" style={{ color: 'rgba(255,255,255,0.75)' }}>No additional materials found.</p>
          ) : (
            <div className="space-y-2">
              {availableNotes.map((note) => (
                <div
                  key={note.id}
                  className="flex items-start justify-between gap-3 rounded-lg p-3"
                  style={{ background: 'rgba(255,255,255,0.06)' }}
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-medium text-white line-clamp-2 leading-snug">
                      {note.content}
                    </p>
                    <p className="text-[11px] mt-0.5" style={{ color: 'rgba(255,255,255,0.75)' }}>
                      {note.originType === 'prompt' ? 'Note · Prompt response' : 'Note · Freeform'}
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      onAdd({ kind: 'note', data: note })
                      onClose()
                    }}
                    className="shrink-0 text-[12px] font-semibold transition-colors hover:text-white"
                    style={{ color: 'rgba(255,255,255,0.75)' }}
                  >
                    Add
                  </button>
                </div>
              ))}
              {available.map((entry) => (
                <div
                  key={entry.id}
                  className="flex items-start justify-between gap-3 rounded-lg p-3"
                  style={{ background: 'rgba(255,255,255,0.06)' }}
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-medium text-white truncate">
                      {getDisplayTitle(entry)}
                    </p>
                    <p className="text-[11px] mt-0.5" style={{ color: 'rgba(255,255,255,0.75)' }}>
                      {getTypeLabel(entry)}
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      onAdd({ kind: 'entry', data: entry })
                      onClose()
                    }}
                    className="shrink-0 text-[12px] font-semibold transition-colors hover:text-white"
                    style={{ color: 'rgba(255,255,255,0.75)' }}
                  >
                    Add
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getDisplayTitle(entry: PanelEntry): string {
  if (entry.title?.trim()) return entry.title.trim()
  if (entry.activity === 'values_ranking') return 'Values Ranking'
  if (entry.activity === 'fears_ranking') return 'Fears Ranking'
  if (entry.activity === 'legacy_map') return 'Legacy Map'
  if (entry.document_type === 'advance_directive_supplement') return 'Advance Directive Supplement'
  if (entry.document_type === 'personal_admin_info') return 'Personal Admin Info'
  if (entry.document_type === 'important_contacts') return 'Important Contacts'
  if (entry.document_type === 'devices_and_accounts') return 'Devices & Accounts'
  if (entry.document_type === 'financial_information') return 'Financial Information'
  return 'Untitled'
}

function getTypeLabel(entry: PanelEntry): string {
  if (entry.activity === 'values_ranking') return 'Working output · Values Ranking'
  if (entry.activity === 'fears_ranking') return 'Working output · Fears Ranking'
  if (entry.activity === 'legacy_map') return 'Working output · Legacy Map'
  if (entry.document_type) return `Document · ${entry.document_type.replace(/_/g, ' ')}`
  return 'Entry'
}


function formatForInsert(entry: PanelEntry): string {
  const c = entry.content
  if (!c) return ''
  if (typeof c === 'string') return c
  if (typeof c !== 'object') return ''
  const obj = c as Record<string, unknown>

  if (entry.activity === 'values_ranking') {
    const parts: string[] = []
    if (Array.isArray(obj.essential) && obj.essential.length)
      parts.push(`Most central to me: ${(obj.essential as string[]).join(', ')}`)
    if (Array.isArray(obj.important) && obj.important.length)
      parts.push(`Also important: ${(obj.important as string[]).join(', ')}`)
    if (typeof obj.reflection === 'string' && obj.reflection.trim())
      parts.push(obj.reflection.trim())
    return parts.join('\n\n')
  }

  if (entry.activity === 'fears_ranking') {
    const parts: string[] = []
    if (Array.isArray(obj.essential) && obj.essential.length)
      parts.push(`Primary concerns: ${(obj.essential as string[]).join(', ')}`)
    if (Array.isArray(obj.important) && obj.important.length)
      parts.push(`Also worried about: ${(obj.important as string[]).join(', ')}`)
    if (typeof obj.reflection === 'string' && obj.reflection.trim())
      parts.push(obj.reflection.trim())
    return parts.join('\n\n')
  }

  if (entry.activity === 'legacy_map') {
    const parts: string[] = []
    if (Array.isArray(obj.moments)) {
      const lines = (obj.moments as Record<string, unknown>[])
        .filter((m) => typeof m.title === 'string')
        .map((m) => `${m.title}${m.note ? ': ' + m.note : ''}`)
      if (lines.length) parts.push(lines.join('\n'))
    }
    if (typeof obj.themes === 'string' && obj.themes.trim())
      parts.push(`Themes: ${obj.themes.trim()}`)
    if (typeof obj.valuesToPassOn === 'string' && obj.valuesToPassOn.trim())
      parts.push(`Values to pass on: ${obj.valuesToPassOn.trim()}`)
    return parts.join('\n\n')
  }

  // Generic: concatenate non-empty string fields
  const parts = Object.entries(obj)
    .filter(([, v]) => typeof v === 'string' && (v as string).trim())
    .map(([, v]) => (v as string).trim())
  return parts.join('\n\n')
}
