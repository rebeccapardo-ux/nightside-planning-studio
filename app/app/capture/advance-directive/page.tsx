'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { createSupabaseBrowserClient } from '@/lib/supabase-browser'
import Link from 'next/link'
import { getNoteSupDocTier, getWorkingOutputBehavior } from '@/lib/content-surfacing'
import { ACTIVITY_META_BY_ID } from '@/lib/content-metadata'
import type { SupplementaryDocQuestion } from '@/lib/content-metadata'
import type { Note } from '@/lib/notes'

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

type TieredItem =
  | { kind: 'note'; data: PanelNote }
  | { kind: 'entry'; data: PanelEntry; insertBehavior: 'insertable' | 'selectable_then_insert' | 'view_only' }

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
            <h1 className="ns-title-activity text-[#130426]">
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
              isActive={focusedField === 'perfectDeath'}
              onChange={(v) => updateField('perfectDeath', v)}
              onFocus={() => setFocusedField('perfectDeath')}
              onCursorChange={(pos) => handleCursorChange('perfectDeath', pos)}
            />

            <Field
              label="At the end of my life, this is what matters most:"
              value={form.whatMatters}
              isActive={focusedField === 'whatMatters'}
              onChange={(v) => updateField('whatMatters', v)}
              onFocus={() => setFocusedField('whatMatters')}
              onCursorChange={(pos) => handleCursorChange('whatMatters', pos)}
            />

            <Field
              label="My most important personal values:"
              value={form.values}
              isActive={focusedField === 'values'}
              onChange={(v) => updateField('values', v)}
              onFocus={() => setFocusedField('values')}
              onCursorChange={(pos) => handleCursorChange('values', pos)}
            />

            <Field
              label="What would make prolonging life unacceptable for me:"
              value={form.unacceptable}
              isActive={focusedField === 'unacceptable'}
              onChange={(v) => updateField('unacceptable', v)}
              onFocus={() => setFocusedField('unacceptable')}
              onCursorChange={(pos) => handleCursorChange('unacceptable', pos)}
            />

            <Field
              label="When I think about death, this is what I worry about:"
              value={form.worries}
              isActive={focusedField === 'worries'}
              onChange={(v) => updateField('worries', v)}
              onFocus={() => setFocusedField('worries')}
              onCursorChange={(pos) => handleCursorChange('worries', pos)}
            />

            <Field
              label="What I want my caregiver/care team to know:"
              value={form.caregiver}
              isActive={focusedField === 'caregiver'}
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
  isActive,
  onChange,
  onFocus,
  onCursorChange,
}: {
  label: string
  value: string
  isActive: boolean
  onChange: (v: string) => void
  onFocus?: () => void
  onCursorChange?: (pos: number) => void
}) {
  function trackCursor(e: React.SyntheticEvent<HTMLTextAreaElement>) {
    onCursorChange?.((e.currentTarget).selectionStart)
  }

  return (
    <div
      className="rounded-xl p-2 -mx-2 transition-all duration-200"
      style={isActive ? {
        border: '2px solid #BBABF4',
        background: 'rgba(255,255,255,0.28)',
        boxShadow: '0 0 0 2px rgba(187,171,244,0.18)',
      } : {
        border: '2px solid transparent',
      }}
    >
      <label
        className="block text-sm mb-2 transition-colors duration-200"
        style={{ fontWeight: isActive ? 600 : 400, color: isActive ? '#130426' : 'rgba(19,4,38,0.65)' }}
      >
        {label}
      </label>
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
// Field → supplementary doc question mapping
// ---------------------------------------------------------------------------

const FIELD_TO_QUESTION: Record<keyof FormState, SupplementaryDocQuestion> = {
  perfectDeath: 'q1',
  whatMatters: 'q2',
  values: 'q3',
  unacceptable: 'q4',
  worries: 'q5',
  caregiver: 'q6',
}

// ---------------------------------------------------------------------------
// Tier computation
// ---------------------------------------------------------------------------

function panelNoteToNote(note: PanelNote): Note {
  return {
    id: note.id,
    content: note.content,
    created_at: '',
    updated_at: '',
    origin_type: (note.originType as Note['origin_type']) ?? undefined,
    prompt_context: note.promptContext,
  }
}

function computePanelTiers(
  question: SupplementaryDocQuestion,
  allNotes: PanelNote[],
  outputs: OutputCard[],
  healthcareEntries: PanelEntry[],
  manualEntries: PanelEntry[],
): { tier1: TieredItem[]; tier2: TieredItem[]; tier3: TieredItem[] } {
  const tier1: TieredItem[] = []
  const tier2: TieredItem[] = []
  const tier3: TieredItem[] = []

  for (const note of allNotes) {
    const tier = getNoteSupDocTier(panelNoteToNote(note), question)
    const item: TieredItem = { kind: 'note', data: note }
    if (tier === 1) tier1.push(item)
    else if (tier === 2) tier2.push(item)
    else tier3.push(item)
  }

  for (const { representative } of outputs) {
    const activityId = representative.activity ?? ''
    const activityMeta = ACTIVITY_META_BY_ID[activityId]
    const behavior = getWorkingOutputBehavior(activityId)
    const relevance = activityMeta?.supplementaryDocumentRelevance?.[question]
    const item: TieredItem = { kind: 'entry', data: representative, insertBehavior: behavior.insertionBehavior }

    if (activityId === 'fears_ranking') {
      // Fears surface by question relevance but always use mediation UI
      if (relevance === 'primary') tier1.push(item)
      else if (relevance === 'secondary') tier2.push(item)
      else tier3.push(item)
    } else if (!behavior.canAutoSurface) {
      tier3.push(item)
    } else {
      if (relevance === 'primary') tier1.push(item)
      else if (relevance === 'secondary') tier2.push(item)
      else tier3.push(item)
    }
  }

  const seenEntryIds = new Set<string>(outputs.map((o) => o.representative.id))
  for (const entry of [...healthcareEntries, ...manualEntries]) {
    if (seenEntryIds.has(entry.id)) continue
    if (entry.document_type === 'advance_directive_supplement') continue
    seenEntryIds.add(entry.id)
    tier3.push({ kind: 'entry', data: entry, insertBehavior: 'selectable_then_insert' })
  }

  return { tier1, tier2, tier3 }
}

// ---------------------------------------------------------------------------
// MaterialsPanel
// ---------------------------------------------------------------------------

function MaterialsPanel({
  focusedField,
  onInsert,
}: {
  focusedField: keyof FormState | null
  onInsert: (text: string) => void
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

  const allNotes = useMemo(() => {
    const seen = new Set<string>()
    const result: PanelNote[] = []
    for (const n of [...healthcareNotes, ...manualNotes]) {
      if (!seen.has(n.id)) { seen.add(n.id); result.push(n) }
    }
    return result
  }, [healthcareNotes, manualNotes])

  const activeQuestion = focusedField ? FIELD_TO_QUESTION[focusedField] : null

  const [insertedByQuestion, setInsertedByQuestion] = useState<Map<SupplementaryDocQuestion, Set<string>>>(new Map())

  function markInserted(itemId: string) {
    if (!activeQuestion) return
    setInsertedByQuestion((prev) => {
      const next = new Map(prev)
      const existing = next.get(activeQuestion) ?? new Set<string>()
      next.set(activeQuestion, new Set([...existing, itemId]))
      return next
    })
  }

  const insertedIds: Set<string> = useMemo(() => {
    if (!activeQuestion) return new Set()
    return insertedByQuestion.get(activeQuestion) ?? new Set()
  }, [activeQuestion, insertedByQuestion])

  const tieredItems = useMemo(() => {
    if (!activeQuestion) return null
    return computePanelTiers(activeQuestion, allNotes, deduplicatedOutputs, healthcareItems, manualItems)
  }, [activeQuestion, allNotes, deduplicatedOutputs, healthcareItems, manualItems])

  // All materials combined for the default (no-question) browsing state
  const defaultItems = useMemo<TieredItem[]>(() => {
    const items: TieredItem[] = []
    const seen = new Set<string>()
    for (const note of allNotes) {
      if (!seen.has(note.id)) { seen.add(note.id); items.push({ kind: 'note', data: note }) }
    }
    for (const { representative } of deduplicatedOutputs) {
      if (!seen.has(representative.id)) {
        seen.add(representative.id)
        const behavior = getWorkingOutputBehavior(representative.activity ?? '')
        items.push({ kind: 'entry', data: representative, insertBehavior: behavior.insertionBehavior })
      }
    }
    for (const entry of [...healthcareItems, ...manualItems]) {
      if (!seen.has(entry.id) && entry.document_type !== 'advance_directive_supplement') {
        seen.add(entry.id)
        items.push({ kind: 'entry', data: entry, insertBehavior: 'selectable_then_insert' })
      }
    }
    return items
  }, [allNotes, deduplicatedOutputs, healthcareItems, manualItems])

  return (
    <div className="rounded-2xl bg-[#2C3777] p-5">
      <div className="flex items-start justify-between gap-3" style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 18, lineHeight: '24px', fontWeight: 700, color: '#F4F0FF', letterSpacing: '0.02em', margin: 0 }}>
          Relevant Materials
        </h2>
        <button
          onClick={() => setShowBrowser(true)}
          className="shrink-0 transition-all"
          style={{ fontSize: 14, lineHeight: '20px', fontWeight: 500, color: '#EDE7FF', textDecoration: 'underline', textUnderlineOffset: '3px', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
        >
          + Add from My Materials
        </button>
      </div>

      {loadingPanel ? (
        <p className="text-[12px] mt-2" style={{ color: 'rgba(255,255,255,0.55)' }}>Loading...</p>
      ) : !activeQuestion ? (
        // No field focused — default browsing state
        <div>
          <p style={{ fontSize: 14, lineHeight: '22px', fontWeight: 500, color: '#D9D1F3', marginBottom: 16 }}>
            Select a question to see the most relevant materials for that section.
          </p>
          {defaultItems.length > 0 && (
            <>
              <p style={{ fontSize: 15, lineHeight: '22px', fontWeight: 600, color: '#E6E0FA', marginTop: 8, marginBottom: 12 }}>
                Available in this document
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {defaultItems.map((item) => (
                  <TieredPanelItem
                    key={item.data.id}
                    item={item}
                    tier={3}
                    isInserted={false}
                    onInsert={onInsert}
                    onInserted={() => {}}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      ) : (
        // Field focused — all cases handled inside TieredPanelSections
        <TieredPanelSections
          tier1={tieredItems?.tier1 ?? []}
          tier2={tieredItems?.tier2 ?? []}
          tier3={tieredItems?.tier3 ?? []}
          onInsert={onInsert}
          onBrowse={() => setShowBrowser(true)}
          insertedIds={insertedIds}
          onInserted={markInserted}
        />
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
// Panel card style constants
// ---------------------------------------------------------------------------

const CARD_BASE: Record<1 | 2 | 3, React.CSSProperties> = {
  1: { background: '#48539A', border: '1px solid rgba(255,255,255,0.08)', boxShadow: '0 4px 12px rgba(0,0,0,0.10)', borderRadius: 16, padding: 14 },
  2: { background: '#43508E', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 16, padding: 14 },
  3: { background: '#3F4B86', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 16, padding: 14 },
}
const CARD_INSERTED: React.CSSProperties = { background: '#38457A', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16, padding: 14 }

function getCardStyle(tier: 1 | 2 | 3, isInserted: boolean): React.CSSProperties {
  return isInserted ? CARD_INSERTED : CARD_BASE[tier]
}

const TITLE_STYLE: React.CSSProperties = { fontSize: 14, lineHeight: '21px', fontWeight: 600, color: '#FFFFFF' }
const TYPE_LABEL_STYLE: React.CSSProperties = { fontSize: 12, lineHeight: '18px', fontWeight: 500, color: '#B9B1D8', flexShrink: 0 }
const PRIMARY_ACTION_STYLE: React.CSSProperties = {
  fontSize: 13, lineHeight: '18px', fontWeight: 600, color: '#130426',
  background: '#C6B4FF', padding: '4px 10px', borderRadius: 999, border: 'none', cursor: 'pointer',
}
const SECONDARY_ACTION_STYLE: React.CSSProperties = { fontSize: 13, lineHeight: '18px', fontWeight: 500, color: '#EDE7FF', marginLeft: 10 }
const INSERTED_LABEL_STYLE: React.CSSProperties = { fontSize: 13, lineHeight: '18px', fontWeight: 500, color: '#A9A3C5' }

// ---------------------------------------------------------------------------
// TieredPanelSections — renders Most Relevant / Also Related / Other Added Materials
// ---------------------------------------------------------------------------

function PanelSection({
  label,
  isFirst,
  children,
}: {
  label: string
  isFirst?: boolean
  children: React.ReactNode
}) {
  return (
    <div style={{ marginTop: isFirst ? 0 : 16 }}>
      <p style={{ fontSize: 15, lineHeight: '22px', fontWeight: 600, color: '#E6E0FA', marginBottom: 12 }}>
        {label}
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {children}
      </div>
    </div>
  )
}

function TieredPanelSections({
  tier1,
  tier2,
  tier3,
  onInsert,
  onBrowse,
  insertedIds,
  onInserted,
}: {
  tier1: TieredItem[]
  tier2: TieredItem[]
  tier3: TieredItem[]
  onInsert: (text: string) => void
  onBrowse: () => void
  insertedIds: Set<string>
  onInserted: (itemId: string) => void
}) {
  // Remove inserted items from contextual sections (legacy map always shows)
  const filteredTier1 = tier1.filter(
    (item) => (item.kind === 'entry' && item.data.activity === 'legacy_map') || !insertedIds.has(item.data.id),
  )
  const filteredTier2 = tier2.filter(
    (item) => (item.kind === 'entry' && item.data.activity === 'legacy_map') || !insertedIds.has(item.data.id),
  )

  const hasMatches = filteredTier1.length > 0 || filteredTier2.length > 0

  return (
    <div className="mt-2">
      {hasMatches ? (
        <>
          {filteredTier1.length > 0 && (
            <PanelSection label="Most relevant" isFirst>
              {filteredTier1.map((item) => (
                <TieredPanelItem
                  key={item.data.id}
                  item={item}
                  tier={1}
                  isInserted={insertedIds.has(item.data.id)}
                  onInsert={onInsert}
                  onInserted={onInserted}
                />
              ))}
            </PanelSection>
          )}

          {filteredTier2.length > 0 && (
            <PanelSection label="Also related" isFirst={filteredTier1.length === 0}>
              {filteredTier2.map((item) => (
                <TieredPanelItem
                  key={item.data.id}
                  item={item}
                  tier={2}
                  isInserted={insertedIds.has(item.data.id)}
                  onInsert={onInsert}
                  onInserted={onInserted}
                />
              ))}
            </PanelSection>
          )}
        </>
      ) : (
        <p style={{ fontSize: 15, lineHeight: '22px', fontWeight: 500, color: '#D9D1F3', marginBottom: 12 }}>
          No strong matches for this question.
        </p>
      )}

      {tier3.length > 0 && (
        <PanelSection label="Other materials you've added" isFirst={!hasMatches}>
          {tier3.map((item) => (
            <TieredPanelItem
              key={item.data.id}
              item={item}
              tier={3}
              isInserted={insertedIds.has(item.data.id)}
              onInsert={onInsert}
              onInserted={onInserted}
            />
          ))}
        </PanelSection>
      )}

      <button
        onClick={onBrowse}
        className="hover:underline transition-all"
        style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#EDE7FF', background: 'none', border: 'none', cursor: 'pointer', padding: 0, marginTop: 16 }}
      >
        + Add from My Materials
      </button>
    </div>
  )
}

// ---------------------------------------------------------------------------
// TieredPanelItem — routes to the right card by material type
// ---------------------------------------------------------------------------

function TieredPanelItem({
  item,
  tier,
  isInserted,
  onInsert,
  onInserted,
}: {
  item: TieredItem
  tier: 1 | 2 | 3
  isInserted: boolean
  onInsert: (text: string) => void
  onInserted: (itemId: string) => void
}) {
  function handleInsert(text: string) {
    onInsert(text)
    onInserted(item.data.id)
  }

  if (item.kind === 'note') {
    return <NotePanelCard note={item.data} tier={tier} isInserted={isInserted} onInsert={handleInsert} />
  }

  const entry = item.data
  const activityId = entry.activity ?? ''

  if (activityId === 'values_ranking') {
    return <ValuesCard entry={entry} tier={tier} isInserted={isInserted} onInsert={handleInsert} />
  }
  if (activityId === 'fears_ranking') {
    return (
      <FearsCard
        entry={entry}
        tier={tier}
        isInserted={isInserted}
        onInsert={onInsert}
        onInserted={() => onInserted(entry.id)}
      />
    )
  }
  if (activityId === 'legacy_map') return <LegacyMapCard entry={entry} tier={tier} />

  return <GenericEntryCard entry={entry} tier={tier} isInserted={isInserted} insertBehavior={item.insertBehavior} onInsert={handleInsert} />
}

// ---------------------------------------------------------------------------
// Card components
// ---------------------------------------------------------------------------

function NotePanelCard({
  note,
  tier,
  isInserted,
  onInsert,
}: {
  note: PanelNote
  tier: 1 | 2 | 3
  isInserted: boolean
  onInsert: (text: string) => void
}) {
  const raw = note.content.trim()
  const typeLabel = note.originType === 'prompt' ? 'Prompt response' : 'Note'

  return (
    <div style={getCardStyle(tier, isInserted)}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, marginBottom: 20 }}>
        <p style={{ ...TITLE_STYLE, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' } as React.CSSProperties}>
          {raw}
        </p>
        <span style={TYPE_LABEL_STYLE}>{typeLabel}</span>
      </div>
      {isInserted ? (
        <span style={INSERTED_LABEL_STYLE}>Inserted</span>
      ) : (
        <button onClick={() => onInsert(note.content)} style={PRIMARY_ACTION_STYLE} className="hover:brightness-95 transition-all">
          Insert
        </button>
      )}
    </div>
  )
}

function ValuesCard({
  entry,
  tier,
  isInserted,
  onInsert,
}: {
  entry: PanelEntry
  tier: 1 | 2 | 3
  isInserted: boolean
  onInsert: (text: string) => void
}) {
  const text = formatValuesForInsert(entry)

  return (
    <div style={getCardStyle(tier, isInserted)}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, marginBottom: 20 }}>
        <p style={TITLE_STYLE}>Values Ranking</p>
        <span style={TYPE_LABEL_STYLE}>Output</span>
      </div>
      <div style={{ display: 'flex', gap: 18 }}>
        {isInserted ? (
          <span style={INSERTED_LABEL_STYLE}>Inserted</span>
        ) : text ? (
          <button onClick={() => onInsert(text)} style={PRIMARY_ACTION_STYLE} className="hover:brightness-95 transition-all">
            Insert
          </button>
        ) : null}
        <a href={`/app/entries/${entry.id}`} target="_blank" rel="noopener noreferrer" style={SECONDARY_ACTION_STYLE} className="hover:underline transition-all">
          View
        </a>
      </div>
    </div>
  )
}

function FearsCard({
  entry,
  tier,
  isInserted,
  onInsert,
  onInserted,
}: {
  entry: PanelEntry
  tier: 1 | 2 | 3
  isInserted: boolean
  onInsert: (text: string) => void
  onInserted: () => void
}) {
  const [expanded, setExpanded] = useState(false)

  const c = entry.content as Record<string, unknown>
  const essential: string[] = Array.isArray(c?.essential) ? (c.essential as string[]) : []
  const important: string[] = Array.isArray(c?.important) ? (c.important as string[]) : []
  const allFears = [...essential, ...important]

  function handleFearInsert(fear: string) {
    onInsert(fear)
    onInserted()
    setExpanded(false)
  }

  return (
    <div style={getCardStyle(tier, isInserted)}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, marginBottom: 20 }}>
        <p style={TITLE_STYLE}>Fears Ranking</p>
        <span style={TYPE_LABEL_STYLE}>Output</span>
      </div>
      <div style={{ display: 'flex', gap: 18 }}>
        {isInserted ? (
          <span style={INSERTED_LABEL_STYLE}>Inserted</span>
        ) : (
          <button
            onClick={() => setExpanded((v) => !v)}
            style={PRIMARY_ACTION_STYLE}
            className="hover:opacity-75 transition-opacity"
          >
            {expanded ? 'Close' : 'Select & Insert'}
          </button>
        )}
        <a href={`/app/entries/${entry.id}`} target="_blank" rel="noopener noreferrer" style={SECONDARY_ACTION_STYLE} className="hover:underline transition-all">
          View
        </a>
      </div>

      {expanded && !isInserted && (
        <div style={{ marginTop: 20, paddingTop: 20, borderTop: '1px solid rgba(255,255,255,0.10)' }}>
          {allFears.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {allFears.map((fear, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
                  <p style={{ fontSize: 16, lineHeight: '22px', color: 'rgba(255,255,255,0.82)' }}>{fear}</p>
                  <button
                    onClick={() => handleFearInsert(fear)}
                    style={{ ...PRIMARY_ACTION_STYLE, flexShrink: 0 }}
                    className="hover:brightness-95 transition-all"
                  >
                    Insert
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.50)' }}>No individual fears found.</p>
          )}
        </div>
      )}
    </div>
  )
}

function LegacyMapCard({ entry, tier }: { entry: PanelEntry; tier: 1 | 2 | 3 }) {
  return (
    <div style={getCardStyle(tier, false)}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, marginBottom: 20 }}>
        <p style={TITLE_STYLE}>Legacy Map</p>
        <span style={TYPE_LABEL_STYLE}>Output</span>
      </div>
      <a href={`/app/entries/${entry.id}`} target="_blank" rel="noopener noreferrer" style={SECONDARY_ACTION_STYLE} className="hover:underline transition-all">
        View
      </a>
    </div>
  )
}

function GenericEntryCard({
  entry,
  tier,
  isInserted,
  insertBehavior,
  onInsert,
}: {
  entry: PanelEntry
  tier: 1 | 2 | 3
  isInserted: boolean
  insertBehavior: 'insertable' | 'selectable_then_insert' | 'view_only'
  onInsert: (text: string) => void
}) {
  const title = getDisplayTitle(entry)
  const insertText = formatForInsert(entry)

  const typeLabel = entry.document_type ? 'Document' : entry.activity ? 'Output' : 'Note'

  return (
    <div style={getCardStyle(tier, isInserted)}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, marginBottom: 20 }}>
        <p style={TITLE_STYLE}>{title}</p>
        <span style={TYPE_LABEL_STYLE}>{typeLabel}</span>
      </div>
      <div style={{ display: 'flex', gap: 18 }}>
        {isInserted ? (
          <span style={INSERTED_LABEL_STYLE}>Inserted</span>
        ) : insertBehavior !== 'view_only' && insertText ? (
          <button onClick={() => onInsert(insertText)} style={PRIMARY_ACTION_STYLE} className="hover:brightness-95 transition-all">
            Insert
          </button>
        ) : null}
        <a href={`/app/entries/${entry.id}`} target="_blank" rel="noopener noreferrer" style={SECONDARY_ACTION_STYLE} className="hover:underline transition-all">
          View
        </a>
      </div>
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

  const available = allEntries.filter(
    (e) => !existingEntryIds.has(e.id) && e.document_type !== 'advance_directive_supplement',
  )
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


function formatValuesForInsert(entry: PanelEntry): string {
  const obj = entry.content as Record<string, unknown>
  if (!obj) return ''
  const parts: string[] = []
  if (Array.isArray(obj.essential) && obj.essential.length)
    parts.push((obj.essential as string[]).join(', '))
  if (Array.isArray(obj.important) && obj.important.length)
    parts.push((obj.important as string[]).join(', '))
  return parts.join('\n\n')
}

function formatForInsert(entry: PanelEntry): string {
  const c = entry.content
  if (!c) return ''
  if (typeof c === 'string') return c
  if (typeof c !== 'object') return ''
  const obj = c as Record<string, unknown>

  if (entry.activity === 'values_ranking') {
    return formatValuesForInsert(entry)
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
