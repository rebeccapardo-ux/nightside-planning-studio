'use client'

import { Suspense, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { createSupabaseBrowserClient } from '@/lib/supabase-browser'
import Breadcrumbs from '@/app/components/navigation/Breadcrumbs'
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

const QUESTIONS: Array<{
  key: keyof FormState
  label: string
  qKey: SupplementaryDocQuestion
}> = [
  { key: 'perfectDeath', label: 'My perfect death would involve:', qKey: 'q1' },
  { key: 'whatMatters', label: 'At the end of my life, this is what matters most:', qKey: 'q2' },
  { key: 'values', label: 'My most important personal values:', qKey: 'q3' },
  { key: 'unacceptable', label: 'What would make prolonging life unacceptable for me:', qKey: 'q4' },
  { key: 'worries', label: 'When I think about death, this is what I worry about:', qKey: 'q5' },
  { key: 'caregiver', label: 'What I want my caregiver/care team to know:', qKey: 'q6' },
]

type PanelEntry = {
  id: string
  title: string | null
  content: unknown
  activity: string | null
  document_type: string | null
  group: 'healthcare' | 'output' | 'manual'
}

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
// Main page — needs useSearchParams, so wrapped in Suspense below
// ---------------------------------------------------------------------------

function AdvanceDirectivePage() {
  const searchParams = useSearchParams()
  const qParam = searchParams.get('q')
  const router = useRouter()

  const expandedIndex: number | null = useMemo(() => {
    if (qParam == null) return null
    const n = parseInt(qParam)
    if (isNaN(n)) return null
    return Math.max(0, Math.min(QUESTIONS.length - 1, n - 1))
  }, [qParam])

  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const formRef = useRef<FormState>(EMPTY_FORM)
  const [entryId, setEntryId] = useState<string | null>(null)
  const entryIdRef = useRef<string | null>(null)
  const [loading, setLoading] = useState(true)

  const [saveState, setSaveState] = useState<SaveState>('idle')
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null)
  const [statusNow, setStatusNow] = useState(Date.now())
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const insertionPointRef = useRef<{ field: keyof FormState; pos: number } | null>(null)
  const itemRefs = useRef<(HTMLDivElement | null)[]>([])
  const [savingSectionIdx, setSavingSectionIdx] = useState<number | null>(null)
  const [savedSectionIdx, setSavedSectionIdx] = useState<number | null>(null)
  const [savedSectionFading, setSavedSectionFading] = useState(false)
  const savedSectionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastEditedSectionIdxRef = useRef<number | null>(null)

  useEffect(() => {
    async function load() {
      const supabase = createSupabaseBrowserClient()
      try {
        const { data: { user }, error: userError } = await supabase.auth.getUser()
        if (userError || !user) { setLoading(false); return }

        const { data: existingRows, error: loadError } = await supabase
          .from('entries')
          .select('id, content, created_at, document_type')
          .eq('user_id', user.id)
          .eq('document_type', 'advance_directive_supplement')
          .order('created_at', { ascending: false })
          .limit(1)

        if (loadError) { setLoading(false); return }

        const existing = existingRows?.[0]
        if (existing) {
          const loaded: FormState = {
            perfectDeath: existing.content?.perfectDeath || '',
            whatMatters: existing.content?.whatMatters || '',
            values: existing.content?.values || '',
            unacceptable: existing.content?.unacceptable || '',
            worries: existing.content?.worries || '',
            caregiver: existing.content?.caregiver || '',
          }
          setEntryId(existing.id)
          entryIdRef.current = existing.id
          const storedSave = localStorage.getItem(`nightside.lastSaved.${user.id}.${existing.id}`)
          const savedDate = storedSave
            ? new Date(storedSave)
            : existing.created_at ? new Date(existing.created_at) : null
          if (savedDate) setLastSavedAt(savedDate)
          setForm(loaded)
          formRef.current = loaded
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
    const interval = window.setInterval(() => setStatusNow(Date.now()), 30000)
    return () => window.clearInterval(interval)
  }, [lastSavedAt])

  useEffect(() => { window.scrollTo(0, 0) }, [])

  useEffect(() => {
    if (expandedIndex === null) return
    const el = itemRefs.current[expandedIndex]
    if (!el) return
    const timer = setTimeout(() => {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 80)
    return () => clearTimeout(timer)
  }, [expandedIndex])

  const hasAnswers = useMemo(
    () => Object.values(form).some((v) => v.trim().length > 0),
    [form],
  )

  function triggerSavedIndicator(idx: number | null) {
    if (idx === null) return
    setSavedSectionIdx(idx)
    setSavedSectionFading(false)
    if (savedSectionTimerRef.current) clearTimeout(savedSectionTimerRef.current)
    savedSectionTimerRef.current = setTimeout(() => {
      setSavedSectionFading(true)
      setTimeout(() => setSavedSectionIdx(null), 400)
    }, 3000)
  }

  function updateField(field: keyof FormState, value: string) {
    lastEditedSectionIdxRef.current = expandedIndex
    const next = { ...formRef.current, [field]: value }
    formRef.current = next
    setForm(next)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => handleSave(), 1500)
  }

  function handleCursorChange(field: keyof FormState, pos: number) {
    insertionPointRef.current = { field, pos }
  }

  function insertIntoCurrent(text: string) {
    if (expandedIndex === null) return
    const field = QUESTIONS[expandedIndex].key
    setForm((prev) => {
      const current = prev[field]
      const point = insertionPointRef.current
      if (point?.field === field) {
        const pos = Math.min(point.pos, current.length)
        const before = current.slice(0, pos)
        const after = current.slice(pos)
        const preSep = before.length > 0 && !/\n\n$/.test(before) ? '\n\n' : ''
        const postSep = after.length > 0 && !/^\n\n/.test(after) ? '\n\n' : ''
        return { ...prev, [field]: before + preSep + text + postSep + after }
      }
      return { ...prev, [field]: current ? current + '\n\n' + text : text }
    })
  }

  function toggleItem(index: number) {
    if (expandedIndex === index) {
      router.push('/app/capture/advance-directive', { scroll: false })
    } else {
      router.push(`/app/capture/advance-directive?q=${index + 1}`, { scroll: false })
    }
  }

  function goNext() {
    if (expandedIndex === null) return
    if (expandedIndex >= QUESTIONS.length - 1) {
      router.push('/app/capture/advance-directive', { scroll: false })
    } else {
      router.push(`/app/capture/advance-directive?q=${expandedIndex + 2}`, { scroll: false })
    }
  }

  function goPrev() {
    if (expandedIndex === null || expandedIndex === 0) return
    router.push(`/app/capture/advance-directive?q=${expandedIndex}`, { scroll: false })
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
        await supabase.from('container_entries').insert({ container_id: container.id, entry_id: id })
      }
    } catch (err) {
      console.error('HEALTHCARE ASSOCIATE ERROR:', err)
    }
  }

  async function handleSave() {
    const supabase = createSupabaseBrowserClient()
    try {
      setSaveState('saving')
      setSavingSectionIdx(lastEditedSectionIdxRef.current)
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      if (userError || !user) { setSaveState('error'); setSavingSectionIdx(null); return }

      if (!entryIdRef.current) {
        const { data: created, error: createError } = await supabase
          .from('entries')
          .insert({
            user_id: user.id,
            title: 'My Care Wishes',
            section: 'capture',
            activity: 'advance_directive',
            document_type: 'advance_directive_supplement',
            content: formRef.current,
          })
          .select('id, content, created_at')
          .single()

        if (createError || !created) { setSaveState('error'); return }

        setEntryId(created.id)
        entryIdRef.current = created.id
        localStorage.setItem(`nightside.lastSaved.${user.id}.${created.id}`, new Date().toISOString())
        setLastSavedAt(new Date())
        setStatusNow(Date.now())
        setSaveState('saved')
        setSavingSectionIdx(null); triggerSavedIndicator(lastEditedSectionIdxRef.current)
        associateWithHealthcare(created.id)
        window.setTimeout(() => setSaveState((c) => (c === 'saved' ? 'idle' : c)), 2000)
        return
      }

      const { error } = await supabase
        .from('entries')
        .update({ content: formRef.current })
        .eq('id', entryIdRef.current)

      if (error) { setSaveState('error'); return }

      localStorage.setItem(`nightside.lastSaved.${user.id}.${entryIdRef.current}`, new Date().toISOString())
      setLastSavedAt(new Date())
      setStatusNow(Date.now())
      setSaveState('saved')
      setSavingSectionIdx(null); triggerSavedIndicator(lastEditedSectionIdxRef.current)
      associateWithHealthcare(entryIdRef.current!)
      window.setTimeout(() => setSaveState((c) => (c === 'saved' ? 'idle' : c)), 2000)
    } catch (err) {
      console.error('UNEXPECTED SAVE ERROR:', err)
      setSaveState('error')
    }
  }

  async function handlePreviewExport() {
    if (!entryIdRef.current) return
    if (debounceRef.current) { clearTimeout(debounceRef.current); debounceRef.current = null; await handleSave() }
    router.push(`/app/entries/${entryIdRef.current}`)
  }

  const saveStatusText = useMemo(() => {
    if (!lastSavedAt) return null
    const diffMs = Math.max(statusNow - lastSavedAt.getTime(), 0)
    const diffSeconds = Math.floor(diffMs / 1000)
    const diffMinutes = Math.floor(diffSeconds / 60)
    const diffHours = Math.floor(diffMinutes / 60)
    const diffDays = Math.floor(diffHours / 24)
    const diffWeeks = Math.floor(diffDays / 7)
    if (diffSeconds < 60) return 'Saved just now'
    if (diffMinutes < 60) return `Saved ${diffMinutes}m ago`
    if (diffHours < 24) return diffHours === 1 ? 'Saved 1h ago' : `Saved ${diffHours}h ago`
    if (diffDays < 7) return diffDays === 1 ? 'Saved 1 day ago' : `Saved ${diffDays} days ago`
    return diffWeeks === 1 ? 'Saved 1 week ago' : `Saved ${diffWeeks} weeks ago`
  }, [lastSavedAt, statusNow])

  if (loading) {
    return (
      <div className="min-h-screen bg-[#BBABF4]">
        <div className="max-w-3xl mx-auto px-4 py-16 text-[#130426]/60">Loading...</div>
      </div>
    )
  }

  const hv = "'Helvetica Neue', Helvetica, Arial, sans-serif"

  const exportZone = entryId ? (
    <div className="capture-export-bar" style={{ position: 'absolute', top: 20, right: 152, zIndex: 10, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
      <ExportButton onClick={handlePreviewExport} disabled={saveState === 'saving'} />
      {saveStatusText && (
        <span style={{ fontSize: 12, fontWeight: 500, color: 'rgba(19,4,38,0.75)', fontFamily: hv }}>
          {saveStatusText}
        </span>
      )}
    </div>
  ) : null

  const isLast = expandedIndex === QUESTIONS.length - 1

  return (
    <div className="min-h-screen bg-[#BBABF4] relative">
      {exportZone}
      <div className="max-w-6xl mx-auto px-4 py-16">
        <div style={{ marginBottom: 24 }}>
          <Breadcrumbs
            theme="light"
            items={[
              { label: 'Plan', href: '/app/plan' },
              { label: 'My Care Wishes', href: '/app/capture/advance-directive' },
            ]}
          />
        </div>

        {/* h1 — full width */}
        <h1
          style={{
            fontSize: 42, fontWeight: 600, lineHeight: 0.98, letterSpacing: '-0.03em',
            color: '#130426', marginBottom: 8, fontFamily: hv,
          }}
        >
          My Care Wishes
        </h1>

        {/* Intro */}
        <div style={{ marginBottom: 36 }}>
          <div style={{ maxWidth: 620 }}>
            <p style={{ fontSize: 18, lineHeight: 1.55, fontWeight: 400, color: '#130426', marginBottom: 20, fontFamily: hv }}>
              This document is a place to express your values and preferences for your care. It will be most useful if you&apos;ve already taken time to{' '}
              <Link href="/app/reflect" className="underline underline-offset-2 hover:opacity-70 transition-opacity" style={{ color: '#130426' }}>reflect</Link>
              {' '}on your priorities and{' '}
              <Link href="/app/learn/healthcare" className="underline underline-offset-2 hover:opacity-70 transition-opacity" style={{ color: '#130426' }}>learn</Link>
              {' '}about your rights and options.
            </p>
            <p style={{ fontSize: 15, lineHeight: 1.5, fontWeight: 400, color: 'rgba(19,4,38,0.65)', marginBottom: 20, fontFamily: hv }}>
              It is <strong>not a legal directive</strong>, but can be used alongside one to provide important context. Looking for official legal forms?{' '}
              <a href={RESOURCE_HUB_URL} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 hover:opacity-70 transition-opacity" style={{ color: 'rgba(19,4,38,0.65)' }}>
                View province-specific resources →
              </a>
            </p>

            <div style={{ display: 'flex', gap: 6, marginTop: 28 }}>
              {['Expand a section', 'Relevant materials update as you work', 'Pull content into your answers'].map((text) => (
                <span key={text} className="instruction-pill" style={{ background: '#130426', border: '1px dashed rgba(248,244,235,0.60)', borderRadius: 20, padding: '7px 16px', fontFamily: hv, fontSize: 14, color: '#F8F4EB', cursor: 'default', whiteSpace: 'nowrap' }}>
                  {text}
                </span>
              ))}
            </div>
            {saveStatusText && (
              <span className="mobile-saved-status" style={{ fontFamily: hv, fontSize: 13, color: 'rgba(19,4,38,0.55)', marginTop: 16, display: 'none' }}>{saveStatusText}</span>
            )}
          </div>

        </div>

        {/* Grid — left: questions, right: materials (top-aligned with first question) */}
        <div className="lg:grid lg:grid-cols-[1fr_340px] lg:gap-12 items-start">
          {/* Left: accordion + nav */}
          <div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {QUESTIONS.map((q, i) => {
                const isExpanded = expandedIndex === i
                return (
                  <div
                    key={q.key}
                    ref={(el) => { itemRefs.current[i] = el }}
                    style={{
                      borderRadius: 16,
                      border: isExpanded ? '2px solid #130426' : '1px solid rgba(19,4,38,0.22)',
                      overflow: 'hidden',
                      background: '#FFFFFF',
                      transition: 'border 150ms ease',
                    }}
                  >
                    <div style={{ display: 'flex' }}>
                      <div style={{ width: isExpanded ? 6 : 0, background: '#F29836', flexShrink: 0, transition: 'width 200ms ease' }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <button
                          type="button"
                          onClick={() => toggleItem(i)}
                          style={{
                            width: '100%',
                            background: 'transparent',
                            border: 'none',
                            padding: 24,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'flex-start',
                            justifyContent: 'space-between',
                            gap: 16,
                            textAlign: 'left',
                          }}
                        >
                          <p style={{ fontFamily: hv, fontSize: 22, fontWeight: 500, color: '#130426', margin: 0, lineHeight: 1.2 }}>
                            {q.label}
                          </p>
                          <svg width="14" height="9" viewBox="0 0 14 9" fill="none" style={{ flexShrink: 0, transition: 'transform 200ms ease', transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)', marginTop: 6 }}>
                            <path d="M1 1.5L7 7.5L13 1.5" stroke="#130426" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        </button>
                        <div style={{
                          overflow: 'hidden',
                          maxHeight: isExpanded ? '1200px' : '0px',
                          opacity: isExpanded ? 1 : 0,
                          transition: isExpanded
                            ? 'max-height 400ms ease, opacity 300ms ease 80ms'
                            : 'opacity 250ms ease, max-height 350ms ease 60ms',
                        }}>
                          <div style={{ padding: '0 16px 20px', background: '#FFFFFF' }}>
                            <div style={{ background: '#F8F4EB', borderRadius: 12, padding: 20 }}>
                              <textarea
                                value={form[q.key]}
                                onChange={(e) => updateField(q.key, e.target.value)}
                                onSelect={(e) => handleCursorChange(q.key, e.currentTarget.selectionStart)}
                                onKeyUp={(e) => handleCursorChange(q.key, e.currentTarget.selectionStart)}
                                className="w-full focus:outline-none"
                                style={{
                                  minHeight: 200,
                                  background: '#FFFFFF',
                                  color: '#130426',
                                  borderRadius: 12,
                                  padding: '16px 20px',
                                  fontSize: 16,
                                  lineHeight: 1.6,
                                  border: 'none',
                                  resize: 'vertical',
                                  fontFamily: hv,
                                  display: 'block',
                                }}
                              />
                              {savingSectionIdx === i && (
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 6, marginTop: 8 }}>
                                  <span style={{ fontFamily: hv, fontSize: 12, fontWeight: 500, color: 'rgba(19,4,38,0.5)' }}>Saving…</span>
                                </div>
                              )}
                              {savedSectionIdx === i && (
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 6, marginTop: 8, opacity: savedSectionFading ? 0 : 1, transition: 'opacity 0.4s ease' }}>
                                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true" style={{ flexShrink: 0 }}>
                                    <circle cx="7" cy="7" r="6" stroke="rgba(19,4,38,0.5)" strokeWidth="1.3" />
                                    <path d="M4.5 7L6.2 8.8L9.5 5.5" stroke="rgba(19,4,38,0.5)" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                                  </svg>
                                  <span style={{ fontFamily: hv, fontSize: 12, fontWeight: 500, color: 'rgba(19,4,38,0.5)' }}>Saved to Your Plan</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Nav — visible only when an item is expanded */}
            {expandedIndex !== null && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 28, paddingTop: 8 }}>
                {expandedIndex > 0 ? (
                  <button
                    onClick={goPrev}
                    style={{ fontSize: 15, fontWeight: 500, color: '#130426', background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontFamily: hv }}
                  >
                    ← Previous
                  </button>
                ) : (
                  <span />
                )}
                <button
                  onClick={goNext}
                  style={{
                    fontSize: 15, fontWeight: 600,
                    color: isLast ? '#FFFFFF' : '#130426',
                    background: isLast ? '#130426' : 'rgba(19,4,38,0.10)',
                    border: 'none', borderRadius: 10, padding: '10px 20px',
                    cursor: 'pointer', fontFamily: hv,
                  }}
                >
                  {isLast ? 'Finish' : 'Next →'}
                </button>
              </div>
            )}
          </div>

          {/* Right: materials */}
          <div>
            <div className="lg:sticky lg:top-40 mt-12 lg:mt-0">
              <MaterialsPanel
                activeQuestion={expandedIndex !== null ? QUESTIONS[expandedIndex].qKey : null}
                onInsert={insertIntoCurrent}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function Wrapper() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#BBABF4]" />}>
      <AdvanceDirectivePage />
    </Suspense>
  )
}

// ---------------------------------------------------------------------------
// ExportButton
// ---------------------------------------------------------------------------

function ExportButton({ onClick, disabled }: { onClick: () => void; disabled?: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="hover:opacity-90 transition-opacity mobile-sticky-export"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        borderRadius: 999,
        padding: '10px 20px',
        fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif",
        fontSize: 14,
        fontWeight: 600,
        background: '#DB5835',
        color: '#F8F4EB',
        border: 'none',
        cursor: disabled ? 'default' : 'pointer',
        whiteSpace: 'nowrap',
        opacity: disabled ? 0.6 : 1,
      }}
    >
      <svg width="14" height="14" viewBox="0 0 13 13" fill="none" aria-hidden="true">
        <path d="M6.5 1.5v6M3.5 5.5L6.5 8.5L9.5 5.5" stroke="#F8F4EB" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M1.5 10.5h10" stroke="#F8F4EB" strokeWidth="1.4" strokeLinecap="round" />
      </svg>
      <span className="hidden md:inline">Preview &amp; </span>Export
    </button>
  )
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
    const behavior = getWorkingOutputBehavior(activityId)
    const activityMeta = ACTIVITY_META_BY_ID[activityId]
    const relevance = activityMeta?.supplementaryDocumentRelevance?.[question]
    const item: TieredItem = {
      kind: 'entry',
      data: representative,
      insertBehavior: behavior.insertionBehavior,
    }

    if (activityId === 'fears_ranking') {
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

function computeRecommendedAndOther(
  question: SupplementaryDocQuestion,
  allNotes: PanelNote[],
  outputs: OutputCard[],
  healthcareEntries: PanelEntry[],
  manualEntries: PanelEntry[],
): { recommended: TieredItem[]; other: TieredItem[] } {
  const { tier1, tier2, tier3 } = computePanelTiers(
    question, allNotes, outputs, healthcareEntries, manualEntries,
  )
  return { recommended: [...tier1, ...tier2], other: tier3 }
}

// ---------------------------------------------------------------------------
// MaterialsPanel
// ---------------------------------------------------------------------------

function MaterialsPanel({
  activeQuestion,
  onInsert,
}: {
  activeQuestion: SupplementaryDocQuestion | null
  onInsert: (text: string) => void
}) {
  const [healthcareItems, setHealthcareItems] = useState<PanelEntry[]>([])
  const [outputItems, setOutputItems] = useState<PanelEntry[]>([])
  const [manualItems, setManualItems] = useState<PanelEntry[]>([])
  const [healthcareNotes, setHealthcareNotes] = useState<PanelNote[]>([])
  const [manualNotes, setManualNotes] = useState<PanelNote[]>([])
  const [loadingPanel, setLoadingPanel] = useState(true)
  const [showBrowser, setShowBrowser] = useState(false)

  const [insertedByQuestion, setInsertedByQuestion] = useState<
    Map<SupplementaryDocQuestion, Set<string>>
  >(new Map())

  useEffect(() => {
    async function fetchPanelData() {
      try {
        const supabase = createSupabaseBrowserClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

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

            const filtered = (entries || []).filter(
              (e) => !STRUCTURED_ACTIVITIES.includes(e.activity ?? ''),
            )
            setHealthcareItems(filtered.map((e) => ({ ...e, group: 'healthcare' as const })))
          }

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

        const { data: outputs } = await supabase
          .from('entries')
          .select('id, title, content, activity, document_type')
          .eq('user_id', user.id)
          .in('activity', STRUCTURED_ACTIVITIES)
          .order('created_at', { ascending: false })

        setOutputItems((outputs || []).map((e) => ({ ...e, group: 'output' as const })))
      } catch (err) {
        console.error('PANEL FETCH ERROR:', err)
      } finally {
        setLoadingPanel(false)
      }
    }

    fetchPanelData()
  }, [])

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
    setManualItems((prev) => (prev.some((e) => e.id === entry.id) ? prev : [...prev, entry]))
  }

  function addManualNote(note: PanelNote) {
    setManualNotes((prev) => (prev.some((n) => n.id === note.id) ? prev : [...prev, note]))
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

  function markInserted(itemId: string) {
    if (!activeQuestion) return
    setInsertedByQuestion((prev) => {
      const next = new Map(prev)
      const existing = next.get(activeQuestion) ?? new Set<string>()
      next.set(activeQuestion, new Set([...existing, itemId]))
      return next
    })
  }

  function markRemoved(itemId: string) {
    if (!activeQuestion) return
    setInsertedByQuestion((prev) => {
      const next = new Map(prev)
      const existing = next.get(activeQuestion) ?? new Set<string>()
      const updated = new Set([...existing])
      updated.delete(itemId)
      next.set(activeQuestion, updated)
      return next
    })
  }

  const insertedIds: Set<string> = useMemo(
    () => activeQuestion ? (insertedByQuestion.get(activeQuestion) ?? new Set()) : new Set<string>(),
    [activeQuestion, insertedByQuestion],
  )

  const { recommended, other } = useMemo(() => {
    if (activeQuestion === null) {
      const seen = new Set<string>()
      const items: TieredItem[] = []
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
      const seenActivities = new Set(deduplicatedOutputs.map(o => o.representative.activity).filter(Boolean) as string[])
      for (const entry of [...healthcareItems, ...manualItems]) {
        if (seen.has(entry.id) || entry.document_type === 'advance_directive_supplement') continue
        if (entry.activity && seenActivities.has(entry.activity)) continue
        seen.add(entry.id)
        items.push({ kind: 'entry', data: entry, insertBehavior: 'selectable_then_insert' })
      }
      return { recommended: [] as TieredItem[], other: items }
    }
    return computeRecommendedAndOther(activeQuestion, allNotes, deduplicatedOutputs, healthcareItems, manualItems)
  }, [activeQuestion, allNotes, deduplicatedOutputs, healthcareItems, manualItems])

  const visibleRecommended = useMemo(
    () => recommended.filter(
      (item) =>
        (item.kind === 'entry' && item.data.activity === 'legacy_map') ||
        !insertedIds.has(item.data.id),
    ),
    [recommended, insertedIds],
  )

  const alreadyInserted = useMemo(
    () => recommended.filter((item) => insertedIds.has(item.data.id)),
    [recommended, insertedIds],
  )

  return (
    // Outer panel: pale Sunrise #F7E2C7
    <div style={{ background: '#F7E2C7', borderRadius: 16, padding: 16 }}>

      {/* Title row — sits on pale Sunrise */}
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12, marginBottom: 12 }}>
        <h2
          style={{
            fontSize: 20,
            lineHeight: '26px',
            fontWeight: 600,
            color: '#130426',
            margin: 0,
            whiteSpace: 'nowrap',
          }}
        >
          Relevant materials
        </h2>
        <button
          onClick={() => setShowBrowser(true)}
          className="shrink-0 transition-opacity hover:opacity-70"
          style={{
            fontSize: 12,
            lineHeight: '18px',
            fontWeight: 500,
            color: '#130426',
            textDecoration: 'underline',
            textUnderlineOffset: '3px',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: 0,
            whiteSpace: 'nowrap',
          }}
        >
          + Add materials
        </button>
      </div>

      {/* Inner panel: Light #F8F4EB */}
      <div style={{ background: '#F8F4EB', borderRadius: 10, padding: 14 }}>
        {loadingPanel ? (
          <p className="text-[12px]" style={{ color: 'rgba(19,4,38,0.50)' }}>
            Loading...
          </p>
        ) : activeQuestion === null ? (
          <FlatPanelContent items={other} onInsert={onInsert} />
        ) : (
          <PanelContent
            recommended={visibleRecommended}
            alreadyInserted={alreadyInserted}
            other={other}
            insertedIds={insertedIds}
            onInsert={onInsert}
            onInserted={markInserted}
            onRemoved={markRemoved}
            onBrowse={() => setShowBrowser(true)}
          />
        )}
      </div>

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
// Card style constants
// ---------------------------------------------------------------------------

const CARD_BASE: Record<1 | 2 | 3, React.CSSProperties> = {
  1: { background: '#FFFFFF', borderRadius: 10, padding: '10px 12px' },
  2: { background: '#FFFFFF', borderRadius: 10, padding: '10px 12px' },
  3: { background: '#FFFFFF', borderRadius: 10, padding: '10px 12px' },
}
const CARD_INSERTED: React.CSSProperties = {
  background: '#F8F4EB',
  borderRadius: 10,
  padding: '10px 12px',
}

function getCardStyle(tier: 1 | 2 | 3, isInserted: boolean): React.CSSProperties {
  return isInserted ? CARD_INSERTED : CARD_BASE[tier]
}

const TITLE_STYLE: React.CSSProperties = {
  fontSize: 14,
  lineHeight: '20px',
  fontWeight: 500,
  color: '#130426',
}
const PRIMARY_ACTION_STYLE: React.CSSProperties = {
  fontSize: 12,
  lineHeight: '17px',
  fontWeight: 500,
  color: '#130426',
  background: 'rgba(19,4,38,0.07)',
  padding: '3px 9px',
  borderRadius: 999,
  border: '1px solid rgba(19,4,38,0.15)',
  cursor: 'pointer',
}
const INSERTED_LABEL_STYLE: React.CSSProperties = {
  fontSize: 12,
  lineHeight: '17px',
  fontWeight: 500,
  color: 'rgba(19,4,38,0.45)',
}
const REMOVE_STYLE: React.CSSProperties = {
  fontSize: 12,
  fontWeight: 500,
  color: 'rgba(19,4,38,0.45)',
  background: 'none',
  border: 'none',
  cursor: 'pointer',
  textDecoration: 'underline',
  textUnderlineOffset: 2,
  padding: 0,
}

// ---------------------------------------------------------------------------
// PanelSection
// ---------------------------------------------------------------------------

const SECTION_LABEL_STYLE: React.CSSProperties = {
  fontSize: 13,
  lineHeight: '18px',
  fontWeight: 500,
  color: '#DB5835',
  textTransform: 'uppercase',
  letterSpacing: '0.06em',
  marginBottom: 10,
}

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
    <div
      style={
        isFirst
          ? { marginTop: 0 }
          : { marginTop: 8, borderTop: '1px solid rgba(219,88,53,0.20)', paddingTop: 20 }
      }
    >
      <p style={SECTION_LABEL_STYLE}>{label}</p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>{children}</div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// PanelContent — three-tier layout
// ---------------------------------------------------------------------------

const OTHER_SHOW_LIMIT = 10

function PanelContent({
  recommended,
  alreadyInserted,
  other,
  insertedIds,
  onInsert,
  onInserted,
  onRemoved,
  onBrowse,
}: {
  recommended: TieredItem[]
  alreadyInserted: TieredItem[]
  other: TieredItem[]
  insertedIds: Set<string>
  onInsert: (text: string) => void
  onInserted: (itemId: string) => void
  onRemoved: (itemId: string) => void
  onBrowse: () => void
}) {
  const [insertedExpanded, setInsertedExpanded] = useState(false)
  const [otherExpanded, setOtherExpanded] = useState(false)

  return (
    <div className="mt-2">
      {/* Recommended */}
      {recommended.length > 0 ? (
        <PanelSection label="Recommended" isFirst>
          {recommended.map((item) => (
            <TieredPanelItem
              key={item.data.id}
              item={item}
              tier={1}
              isInserted={false}
              onInsert={onInsert}
              onInserted={onInserted}
            />
          ))}
        </PanelSection>
      ) : (
        <p
          style={{
            fontSize: 13,
            lineHeight: '20px',
            fontWeight: 400,
            color: 'rgba(19,4,38,0.50)',
            marginBottom: 12,
          }}
        >
          No recommended materials for this question.
        </p>
      )}

      {/* Already inserted (collapsible) */}
      {alreadyInserted.length > 0 && (
        <div style={{ marginTop: 8, borderTop: '1px solid rgba(219,88,53,0.20)', paddingTop: 20 }}>
          <button
            onClick={() => setInsertedExpanded((v) => !v)}
            style={{
              ...SECTION_LABEL_STYLE,
              display: 'flex',
              alignItems: 'center',
              gap: 5,
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: 0,
              marginBottom: insertedExpanded ? 10 : 0,
            }}
          >
            Already inserted ({alreadyInserted.length}){' '}
            <span style={{ fontSize: 10 }}>{insertedExpanded ? '▲' : '▼'}</span>
          </button>
          {insertedExpanded && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {alreadyInserted.map((item) => (
                <TieredPanelItem
                  key={item.data.id}
                  item={item}
                  tier={2}
                  isInserted
                  onInsert={onInsert}
                  onInserted={onInserted}
                  onRemove={onRemoved}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Also relevant */}
      {other.length > 0 && (
        <div style={{ marginTop: 8, borderTop: '1px solid rgba(219,88,53,0.20)', paddingTop: 20 }}>
          <p style={SECTION_LABEL_STYLE}>Also relevant</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {(otherExpanded || other.length <= OTHER_SHOW_LIMIT
              ? other
              : other.slice(0, OTHER_SHOW_LIMIT)
            ).map((item) => (
              <TieredPanelItem
                key={item.data.id}
                item={item}
                tier={3}
                isInserted={insertedIds.has(item.data.id)}
                onInsert={onInsert}
                onInserted={onInserted}
              />
            ))}
          </div>
          {other.length > OTHER_SHOW_LIMIT && !otherExpanded && (
            <button
              onClick={() => setOtherExpanded(true)}
              style={{
                display: 'block',
                fontSize: 12,
                fontWeight: 500,
                color: 'rgba(19,4,38,0.55)',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: 0,
                marginTop: 8,
                textDecoration: 'underline',
                textUnderlineOffset: 2,
              }}
            >
              Show all ({other.length})
            </button>
          )}
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// FlatPanelContent — shown when no section is expanded
// ---------------------------------------------------------------------------

function FlatPanelContent({ items, onInsert }: { items: TieredItem[]; onInsert: (text: string) => void }) {
  const [expanded, setExpanded] = useState(false)
  const visible = expanded || items.length <= OTHER_SHOW_LIMIT ? items : items.slice(0, OTHER_SHOW_LIMIT)

  if (items.length === 0) {
    return (
      <p style={{ fontSize: 13, lineHeight: '20px', color: 'rgba(19,4,38,0.72)', padding: '4px 0', margin: 0, fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif" }}>
        No materials found.
      </p>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {visible.map((item) => (
        <TieredPanelItem
          key={item.data.id}
          item={item}
          tier={3}
          isInserted={false}
          readOnly
          onInsert={onInsert}
          onInserted={() => {}}
        />
      ))}
      {items.length > OTHER_SHOW_LIMIT && !expanded && (
        <button
          onClick={() => setExpanded(true)}
          style={{ fontSize: 12, fontWeight: 500, color: 'rgba(19,4,38,0.55)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, textDecoration: 'underline', textUnderlineOffset: 2, marginTop: 4 }}
        >
          Show all ({items.length})
        </button>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// TieredPanelItem
// ---------------------------------------------------------------------------

function TieredPanelItem({
  item,
  tier,
  isInserted,
  readOnly,
  onInsert,
  onInserted,
  onRemove,
}: {
  item: TieredItem
  tier: 1 | 2 | 3
  isInserted: boolean
  readOnly?: boolean
  onInsert: (text: string) => void
  onInserted: (itemId: string) => void
  onRemove?: (itemId: string) => void
}) {
  function handleInsert(text: string) {
    onInsert(text)
    onInserted(item.data.id)
  }

  if (item.kind === 'note') {
    return (
      <NotePanelCard
        note={item.data}
        tier={tier}
        isInserted={isInserted}
        readOnly={readOnly}
        onInsert={handleInsert}
        onRemove={onRemove ? () => onRemove(item.data.id) : undefined}
      />
    )
  }

  const entry = item.data
  const activityId = entry.activity ?? ''

  if (activityId === 'values_ranking') {
    return (
      <ValuesCard
        entry={entry}
        tier={tier}
        isInserted={isInserted}
        readOnly={readOnly}
        onInsert={onInsert}
        onInserted={() => onInserted(entry.id)}
        onRemove={onRemove ? () => onRemove(entry.id) : undefined}
      />
    )
  }
  if (activityId === 'fears_ranking') {
    return (
      <FearsCard
        entry={entry}
        tier={tier}
        isInserted={isInserted}
        readOnly={readOnly}
        onInsert={onInsert}
        onInserted={() => onInserted(entry.id)}
        onRemove={onRemove ? () => onRemove(entry.id) : undefined}
      />
    )
  }
  if (activityId === 'legacy_map') {
    const reflectionText = formatLegacyMapReflections(entry)
    if (!reflectionText) return null
    return (
      <LegacyMapCard
        entry={entry}
        tier={tier}
        isInserted={isInserted}
        readOnly={readOnly}
        onInsert={handleInsert}
        onRemove={onRemove ? () => onRemove(entry.id) : undefined}
      />
    )
  }

  return (
    <GenericEntryCard
      entry={entry}
      tier={tier}
      isInserted={isInserted}
      readOnly={readOnly}
      insertBehavior={item.insertBehavior}
      onInsert={handleInsert}
      onRemove={onRemove ? () => onRemove(entry.id) : undefined}
    />
  )
}

// ---------------------------------------------------------------------------
// Panel icons
// ---------------------------------------------------------------------------

function NoteIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0 }}>
      <rect x="2" y="4" width="12" height="11" rx="2" stroke="currentColor" strokeWidth="1.3"/>
      <circle cx="8" cy="4" r="2.5" fill="currentColor"/>
    </svg>
  )
}

function ActivityOutputIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0 }}>
      <rect x="2" y="2.5" width="12" height="11" rx="1" stroke="currentColor" strokeWidth="1.25" strokeLinejoin="round"/>
      <circle cx="5.5" cy="7" r="1.5" fill="currentColor"/>
      <circle cx="8.5" cy="9.5" r="1.5" fill="currentColor"/>
      <circle cx="11" cy="5.5" r="1.5" fill="currentColor"/>
    </svg>
  )
}

function PanelDocIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0 }}>
      <path d="M3 2.5A1.5 1.5 0 0 1 4.5 1H10l3 3v9A1.5 1.5 0 0 1 11.5 14.5h-7A1.5 1.5 0 0 1 3 13V2.5z" stroke="currentColor" strokeWidth="1.25" strokeLinejoin="round" fill="none"/>
      <path d="M10 1v3h3" stroke="currentColor" strokeWidth="1.25" strokeLinejoin="round" fill="none"/>
      <path d="M5.5 7.5h5M5.5 10h5" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round"/>
    </svg>
  )
}

// ---------------------------------------------------------------------------
// Card components
// ---------------------------------------------------------------------------

function NotePanelCard({
  note,
  tier,
  isInserted,
  readOnly,
  onInsert,
  onRemove,
}: {
  note: PanelNote
  tier: 1 | 2 | 3
  isInserted: boolean
  readOnly?: boolean
  onInsert: (text: string) => void
  onRemove?: () => void
}) {
  const raw = note.content.trim()
  const hasPrompt = note.originType === 'prompt' && !!note.promptContext

  return (
    <div style={getCardStyle(tier, isInserted)}>
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: 6,
          marginBottom: readOnly ? (hasPrompt ? 4 : 0) : (hasPrompt ? 4 : 10),
          color: '#130426',
        }}
      >
        <div style={{ flexShrink: 0, marginTop: 2 }}><NoteIcon /></div>
        <p
          style={{
            ...TITLE_STYLE,
            display: '-webkit-box',
            WebkitLineClamp: 3,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          } as React.CSSProperties}
        >
          {raw}
        </p>
      </div>

      {hasPrompt && (
        <p
          style={{
            marginLeft: 22,
            fontSize: 12,
            fontStyle: 'italic',
            color: 'rgba(19,4,38,0.50)',
            marginBottom: readOnly ? 0 : 10,
            lineHeight: 1.4,
          }}
        >
          In response to: &ldquo;{note.promptContext}&rdquo;
        </p>
      )}

      {!readOnly && (isInserted ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={INSERTED_LABEL_STYLE}>Inserted</span>
          {onRemove && (
            <button onClick={onRemove} style={REMOVE_STYLE}>
              Remove
            </button>
          )}
        </div>
      ) : (
        <button
          onClick={() => onInsert(note.content)}
          style={PRIMARY_ACTION_STYLE}
          className="hover:brightness-95 transition-all"
        >
          Insert
        </button>
      ))}
    </div>
  )
}

function ValuesCard({
  entry,
  tier,
  isInserted,
  readOnly,
  onInsert,
  onInserted,
  onRemove,
}: {
  entry: PanelEntry
  tier: 1 | 2 | 3
  isInserted: boolean
  readOnly?: boolean
  onInsert: (text: string) => void
  onInserted: () => void
  onRemove?: () => void
}) {
  const [expanded, setExpanded] = useState(false)

  const c = entry.content as Record<string, unknown>
  const essential: string[] = Array.isArray(c?.essential) ? (c.essential as string[]) : []
  const important: string[] = Array.isArray(c?.important) ? (c.important as string[]) : []
  const lessCentral: string[] = Array.isArray(c?.less_central) ? (c.less_central as string[]) : []
  const allValues = [...essential, ...important, ...lessCentral]

  function handleValueInsert(value: string) {
    onInsert(value)
    onInserted()
    setExpanded(false)
  }

  return (
    <div style={getCardStyle(tier, isInserted)}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6, marginBottom: readOnly ? 0 : 8, color: '#130426' }}>
        <div style={{ flexShrink: 0, marginTop: 2 }}><ActivityOutputIcon /></div>
        <p style={TITLE_STYLE}>Values Ranking</p>
      </div>
      {!readOnly && (
        <div style={{ display: 'flex', gap: 18, alignItems: 'center' }}>
          {isInserted ? (
            <>
              <span style={INSERTED_LABEL_STYLE}>Inserted</span>
              {onRemove && (
                <button onClick={onRemove} style={REMOVE_STYLE}>
                  Remove
                </button>
              )}
            </>
          ) : (
            <button
              onClick={() => setExpanded((v) => !v)}
              style={PRIMARY_ACTION_STYLE}
              className="hover:opacity-75 transition-opacity"
            >
              {expanded ? 'Close' : 'Select & Insert'}
            </button>
          )}
        </div>
      )}

      {!readOnly && expanded && !isInserted && (
        <div
          style={{
            marginTop: 12,
            paddingTop: 12,
            borderTop: '1px solid rgba(219,88,53,0.20)',
          }}
        >
          {allValues.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {allValues.map((value, i) => (
                <div
                  key={i}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: 12,
                  }}
                >
                  <p style={{ fontSize: 14, lineHeight: '20px', color: '#130426' }}>
                    {value}
                  </p>
                  <button
                    onClick={() => handleValueInsert(value)}
                    style={{ ...PRIMARY_ACTION_STYLE, flexShrink: 0 }}
                    className="hover:brightness-95 transition-all"
                  >
                    Insert
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p style={{ fontSize: 13, color: 'rgba(19,4,38,0.50)' }}>
              No individual values found.
            </p>
          )}
        </div>
      )}
    </div>
  )
}

function FearsCard({
  entry,
  tier,
  isInserted,
  readOnly,
  onInsert,
  onInserted,
  onRemove,
}: {
  entry: PanelEntry
  tier: 1 | 2 | 3
  isInserted: boolean
  readOnly?: boolean
  onInsert: (text: string) => void
  onInserted: () => void
  onRemove?: () => void
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
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6, marginBottom: readOnly ? 0 : 8, color: '#130426' }}>
        <div style={{ flexShrink: 0, marginTop: 2 }}><ActivityOutputIcon /></div>
        <p style={TITLE_STYLE}>Fears Ranking</p>
      </div>
      {!readOnly && (
        <div style={{ display: 'flex', gap: 18, alignItems: 'center' }}>
          {isInserted ? (
            <>
              <span style={INSERTED_LABEL_STYLE}>Inserted</span>
              {onRemove && (
                <button onClick={onRemove} style={REMOVE_STYLE}>
                  Remove
                </button>
              )}
            </>
          ) : (
            <button
              onClick={() => setExpanded((v) => !v)}
              style={PRIMARY_ACTION_STYLE}
              className="hover:opacity-75 transition-opacity"
            >
              {expanded ? 'Close' : 'Select & Insert'}
            </button>
          )}
        </div>
      )}

      {!readOnly && expanded && !isInserted && (
        <div
          style={{
            marginTop: 12,
            paddingTop: 12,
            borderTop: '1px solid rgba(219,88,53,0.20)',
          }}
        >
          {allFears.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {allFears.map((fear, i) => (
                <div
                  key={i}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: 12,
                  }}
                >
                  <p style={{ fontSize: 14, lineHeight: '20px', color: '#130426' }}>
                    {fear}
                  </p>
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
            <p style={{ fontSize: 13, color: 'rgba(19,4,38,0.50)' }}>
              No individual fears found.
            </p>
          )}
        </div>
      )}
    </div>
  )
}

function LegacyMapCard({
  entry,
  tier,
  isInserted,
  readOnly,
  onInsert,
  onRemove,
}: {
  entry: PanelEntry
  tier: 1 | 2 | 3
  isInserted: boolean
  readOnly?: boolean
  onInsert: (text: string) => void
  onRemove?: () => void
}) {
  const reflectionText = formatLegacyMapReflections(entry)

  return (
    <div style={getCardStyle(tier, isInserted)}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6, marginBottom: 4, color: '#130426' }}>
        <div style={{ flexShrink: 0, marginTop: 2 }}><ActivityOutputIcon /></div>
        <p style={TITLE_STYLE}>Legacy Map Reflections</p>
      </div>
      <p
        style={{
          fontSize: 12,
          lineHeight: '18px',
          color: 'rgba(19,4,38,0.55)',
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
          marginBottom: readOnly ? 0 : 10,
        } as React.CSSProperties}
      >
        {reflectionText}
      </p>
      {!readOnly && (isInserted ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={INSERTED_LABEL_STYLE}>Inserted</span>
          {onRemove && (
            <button onClick={onRemove} style={REMOVE_STYLE}>
              Remove
            </button>
          )}
        </div>
      ) : (
        <button
          onClick={() => onInsert(reflectionText)}
          style={PRIMARY_ACTION_STYLE}
          className="hover:brightness-95 transition-all"
        >
          Insert
        </button>
      ))}
    </div>
  )
}

function GenericEntryCard({
  entry,
  tier,
  isInserted,
  readOnly,
  insertBehavior,
  onInsert,
  onRemove,
}: {
  entry: PanelEntry
  tier: 1 | 2 | 3
  isInserted: boolean
  readOnly?: boolean
  insertBehavior: 'insertable' | 'selectable_then_insert' | 'view_only'
  onInsert: (text: string) => void
  onRemove?: () => void
}) {
  const title = getDisplayTitle(entry)
  const insertText = formatForInsert(entry)

  return (
    <div style={getCardStyle(tier, isInserted)}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6, marginBottom: readOnly ? 0 : 8, color: '#130426' }}>
        <div style={{ flexShrink: 0, marginTop: 2 }}><PanelDocIcon /></div>
        <p style={TITLE_STYLE}>{title}</p>
      </div>
      {!readOnly && (
        <div style={{ display: 'flex', gap: 18, alignItems: 'center' }}>
          {isInserted ? (
            <>
              <span style={INSERTED_LABEL_STYLE}>Inserted</span>
              {onRemove && (
                <button onClick={onRemove} style={REMOVE_STYLE}>
                  Remove
                </button>
              )}
            </>
          ) : insertBehavior !== 'view_only' && insertText ? (
            <button
              onClick={() => onInsert(insertText)}
              style={PRIMARY_ACTION_STYLE}
              className="hover:brightness-95 transition-all"
            >
              Insert
            </button>
          ) : null}
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
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        const { data } = await supabase
          .from('entries')
          .select('id, title, content, activity, document_type')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })

        setAllEntries((data || []).map((e) => ({ ...e, group: 'manual' as const })))

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
            <p className="text-sm" style={{ color: 'rgba(255,255,255,0.75)' }}>
              Loading...
            </p>
          ) : available.length === 0 && availableNotes.length === 0 ? (
            <p className="text-sm" style={{ color: 'rgba(255,255,255,0.75)' }}>
              No additional materials found.
            </p>
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
                    onClick={() => { onAdd({ kind: 'note', data: note }); onClose() }}
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
                    onClick={() => { onAdd({ kind: 'entry', data: entry }); onClose() }}
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
  if (entry.document_type === 'advance_directive_supplement') return 'My Care Wishes'
  if (entry.title?.trim()) return entry.title.trim()
  if (entry.activity === 'values_ranking') return 'Values Ranking'
  if (entry.activity === 'fears_ranking') return 'Fears Ranking'
  if (entry.activity === 'legacy_map') return 'Legacy Map'
  if (entry.document_type === 'personal_admin_info') return 'Personal Admin Information'
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

function formatLegacyMapReflections(entry: PanelEntry): string {
  const obj = entry.content as Record<string, unknown>
  if (!obj) return ''
  const parts: string[] = []
  if (typeof obj.themes === 'string' && obj.themes.trim()) parts.push(obj.themes.trim())
  if (typeof obj.surprises === 'string' && obj.surprises.trim()) parts.push(obj.surprises.trim())
  if (typeof obj.valuesToPassOn === 'string' && obj.valuesToPassOn.trim()) parts.push(obj.valuesToPassOn.trim())
  if (typeof obj.legacyProjects === 'string' && obj.legacyProjects.trim()) parts.push(obj.legacyProjects.trim())
  return parts.join('\n\n')
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

  if (entry.activity === 'values_ranking') return formatValuesForInsert(entry)

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

  const parts = Object.entries(obj)
    .filter(([, v]) => typeof v === 'string' && (v as string).trim())
    .map(([, v]) => (v as string).trim())
  return parts.join('\n\n')
}
