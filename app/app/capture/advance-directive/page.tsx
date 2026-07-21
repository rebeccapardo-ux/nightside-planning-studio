'use client'

import { Suspense, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { createSupabaseBrowserClient } from '@/lib/supabase-browser'
import { SECTION_SCROLL_MARGIN_TOP, holdSavingIndicator, MATERIALS_PANEL_TOOLTIP } from '@/lib/ui'
import AlertIcon from '@/app/components/AlertIcon'
import AutosaveNotice from '@/app/components/AutosaveNotice'
import DocHeaderBanner, { docBannerIntro, docBannerNote } from '@/app/components/capture/DocHeaderBanner'
import SlidePanel from '@/app/components/SlidePanel'
import InfoTooltip from '@/app/components/InfoTooltip'
import MaterialsNullState from '@/app/components/MaterialsNullState'
import { getNoteSupDocTier, getWorkingOutputBehavior, isInsertedIntoResponse, hasAnySupDocTag, noteHasSupDocSignal } from '@/lib/content-surfacing'
import { ACTIVITY_META_BY_ID, ACTIVITY, STRUCTURED_ACTIVITIES, DOCUMENT_TYPE_META, DOCUMENT_TYPE } from '@/lib/content-metadata'
import type { SupplementaryDocQuestion } from '@/lib/content-metadata'
import { type Note, fetchReflectionsByEntryIds } from '@/lib/notes'
import ActivityIcon from '@/app/components/ActivityIcon'

const PROVINCE_RESOURCES_URL = 'https://thenightside.net/province-specific'


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

// This document's question set (advance-directive owns q1–q6). A material with any
// supplementaryDocumentRelevance tag in this set has a document-level signal of
// appropriateness, which overrides neverAutoSuggest for THIS doc (see hasAnySupDocTag).
const ADVANCE_DOC_QUESTIONS: SupplementaryDocQuestion[] = QUESTIONS.map((q) => q.qKey)

// Current response text for a question — the source of truth for inserted-state in
// the materials panel (see isInsertedIntoResponse).
function questionResponse(form: FormState, qKey: SupplementaryDocQuestion | null): string {
  if (!qKey) return ''
  const field = QUESTIONS.find((q) => q.qKey === qKey)?.key
  return field ? form[field] : ''
}

type PanelEntry = {
  id: string
  title: string | null
  content: unknown
  activity: string | null
  document_type: string | null
  group: 'healthcare' | 'output' | 'manual'
  reflectionText?: string // resolved from the linked reflection note (note-first; content fallback)
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

  // Mobile drawer for Relevant Materials (≤ lg). Desktop keeps the right rail.
  const materialsData = useMaterialsData()
  const [drawerQuestion, setDrawerQuestion] = useState<SupplementaryDocQuestion | null>(null)
  const [insertToast, setInsertToast] = useState(false)
  const insertToastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const recommendedCountByQuestion = useMemo(() => {
    const counts = new Map<SupplementaryDocQuestion, number>()
    for (const q of QUESTIONS) {
      const { recommended } = computeRecommendedAndOther(
        q.qKey,
        materialsData.allNotes,
        materialsData.deduplicatedOutputs,
        materialsData.healthcareItems,
        materialsData.manualItems,
      )
      counts.set(q.qKey, recommended.length)
    }
    return counts
  }, [materialsData.allNotes, materialsData.deduplicatedOutputs, materialsData.healthcareItems, materialsData.manualItems])

  function openMaterialsDrawer(qKey: SupplementaryDocQuestion) {
    setDrawerQuestion(qKey)
  }

  function closeMaterialsDrawer() {
    setDrawerQuestion(null)
  }

  function handleDrawerInsert(text: string) {
    insertIntoCurrent(text)
    if (insertToastTimerRef.current) clearTimeout(insertToastTimerRef.current)
    setInsertToast(true)
    insertToastTimerRef.current = setTimeout(() => setInsertToast(false), 2500)
  }

  useEffect(() => () => {
    if (insertToastTimerRef.current) clearTimeout(insertToastTimerRef.current)
  }, [])

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
          .eq('document_type', DOCUMENT_TYPE.ADVANCE_DIRECTIVE_SUPPLEMENT)
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

  // Collapsed sections aren't rendered ({isExpanded && …}), so layout is final on
  // the next render — a simple delayed scroll lands correctly, same as the
  // practical docs. (No animation; an animated collapse would race the scroll.)
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

  async function associateWithHealthcare(id: string) {
    try {
      const supabase = createSupabaseBrowserClient()
      const { data: container } = await supabase
        .from('containers')
        .select('id')
        .eq('type', 'domain')
        .eq('domain_code', 'healthcare')
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
      const startedAt = Date.now()
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
            document_type: DOCUMENT_TYPE.ADVANCE_DIRECTIVE_SUPPLEMENT,
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
        await holdSavingIndicator(startedAt)
        setSaveState('saved')
        setSavingSectionIdx(null); triggerSavedIndicator(lastEditedSectionIdxRef.current)
        associateWithHealthcare(created.id)
        window.setTimeout(() => setSaveState((c) => (c === 'saved' ? 'idle' : c)), 3400)
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
      await holdSavingIndicator(startedAt)
      setSaveState('saved')
      setSavingSectionIdx(null); triggerSavedIndicator(lastEditedSectionIdxRef.current)
      associateWithHealthcare(entryIdRef.current!)
      window.setTimeout(() => setSaveState((c) => (c === 'saved' ? 'idle' : c)), 3400)
    } catch (err) {
      console.error('UNEXPECTED SAVE ERROR:', err)
      setSaveState('error')
    }
  }

  async function handlePreviewExport() {
    if (!entryIdRef.current) return
    if (debounceRef.current) { clearTimeout(debounceRef.current); debounceRef.current = null; await handleSave() }
    // Non-sensitive document: skip the snapshot, go straight to the export preview.
    router.push(`/app/entries/${entryIdRef.current}/export`)
  }

  const saveStatusText = useMemo(() => {
    if (saveState === 'error') return "Couldn't save"
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
  }, [lastSavedAt, statusNow, saveState])

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8F4EB]">
        <div className="max-w-3xl mx-auto px-4 py-16 text-[#130426]/60">Loading...</div>
      </div>
    )
  }

  const hv = "'Helvetica Neue', Helvetica, Arial, sans-serif"

  const exportZone = entryId ? (
    <div className="capture-export-bar" style={{ position: 'absolute', top: 20, right: 152, zIndex: 10, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
      <ExportButton onClick={handlePreviewExport} disabled={saveState === 'saving'} />
      {saveStatusText && (
        <span style={{ fontSize: 12, fontWeight: 500, color: saveState === 'error' ? '#8B0000' : '#F8F4EB', fontFamily: hv }}>
          {saveState === 'error' && <AlertIcon color="#8B0000" />}{saveStatusText}
        </span>
      )}
    </div>
  ) : null


  return (
    <div className="min-h-screen bg-[#F8F4EB] relative">
      {exportZone}
      <DocHeaderBanner title="My Care Wishes" crumbLabel="My Care Wishes" maxWidth={1152}>
        <p style={docBannerIntro}>
          This document is a place to express your values and preferences for your care. It will be most useful if you&apos;ve already taken time to reflect on your priorities and learn about your rights and options.
        </p>
        <p style={docBannerNote}>
          It is <strong>not a legal directive</strong>, but can be used alongside one to provide important context. Looking for official legal forms?{' '}
          <a href={PROVINCE_RESOURCES_URL} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 hover:opacity-70 transition-opacity" style={{ color: 'inherit' }}>
            View province-specific resources →
          </a>
        </p>
      </DocHeaderBanner>
      <div className="max-w-6xl mx-auto px-4 pt-10 pb-16">
        <AutosaveNotice style={{ marginBottom: 8 }}>Your answers will save automatically to Your materials.</AutosaveNotice>
        {saveStatusText && (
          <span className="mobile-saved-status" style={{ fontFamily: hv, fontSize: 13, color: saveState === 'error' ? '#8B0000' : 'rgba(19,4,38,0.65)', marginTop: 16, display: 'none' }}>{saveState === 'error' && <AlertIcon color="#8B0000" />}{saveStatusText}</span>
        )}

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
                      // Active/expanded box gets the landing-card drop shadow (Activities /
                      // Plan-by-area cards use the same 6px hard offset). Collapsed = no shadow.
                      boxShadow: isExpanded ? '6px 6px 0 rgba(0,0,0,0.75)' : 'none',
                      scrollMarginTop: SECTION_SCROLL_MARGIN_TOP,
                      transition: 'border 150ms ease, box-shadow 150ms ease',
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
                        {isExpanded && (
                          <div style={{ padding: '0 16px 20px', background: '#FFFFFF' }}>
                            <div style={{ background: 'transparent', padding: 0 }}>
                              {(() => {
                                const count = recommendedCountByQuestion.get(q.qKey) ?? 0
                                if (count === 0) return null
                                return (
                                  <div className="lg:hidden" style={{ marginBottom: 14 }}>
                                    <button
                                      type="button"
                                      onClick={() => openMaterialsDrawer(q.qKey)}
                                      style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: 5,
                                        padding: '3px 8px',
                                        background: '#EEEDFE',
                                        border: '1.5px solid #7F77DD',
                                        borderRadius: 6,
                                        fontSize: 13,
                                        fontWeight: 500,
                                        color: '#3C3489',
                                        cursor: 'pointer',
                                        fontFamily: hv,
                                        lineHeight: 1.4,
                                      }}
                                      className="hover:opacity-80 transition-opacity"
                                    >
                                      <svg width="12" height="13" viewBox="0 0 12 13" fill="none" aria-hidden>
                                        <rect x="1.5" y="3" width="9" height="9.5" rx="1.5" stroke="currentColor" strokeWidth="1.2" />
                                        <circle cx="6" cy="3" r="2" fill="currentColor" />
                                      </svg>
                                      See relevant materials · {count} suggested →
                                    </button>
                                  </div>
                                )
                              })()}
                              <textarea
                                aria-label={q.label}
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
                                  border: '1px solid #130426',
                                  resize: 'vertical',
                                  fontFamily: hv,
                                  display: 'block',
                                }}
                              />
                              {savingSectionIdx === i && (
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 6, marginTop: 8 }}>
                                  <span style={{ fontFamily: hv, fontSize: 12, fontWeight: 500, color: 'rgba(19,4,38,0.65)' }}>Saving…</span>
                                </div>
                              )}
                              {savedSectionIdx === i && (
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 6, marginTop: 8, opacity: savedSectionFading ? 0 : 1, transition: 'opacity 0.4s ease' }}>
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
                    </div>
                  </div>
                )
              })}
            </div>

          </div>

          {/* Right: materials — desktop only. Mobile uses inline trigger + SlidePanel drawer. */}
          <div className="hidden lg:block">
            <div className="lg:sticky lg:top-40 mt-12 lg:mt-0">
              <MaterialsPanel
                activeQuestion={expandedIndex !== null ? QUESTIONS[expandedIndex].qKey : null}
                responseText={questionResponse(form, expandedIndex !== null ? QUESTIONS[expandedIndex].qKey : null)}
                onInsert={insertIntoCurrent}
                data={materialsData}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Mobile-only Relevant Materials drawer */}
      <SlidePanel
        open={drawerQuestion !== null}
        onClose={closeMaterialsDrawer}
        title="Relevant materials"
        headerAction={<InfoTooltip text={MATERIALS_PANEL_TOOLTIP} />}
      >
        {drawerQuestion !== null && (
          <MaterialsPanel
            activeQuestion={drawerQuestion}
            responseText={questionResponse(form, drawerQuestion)}
            onInsert={handleDrawerInsert}
            data={materialsData}
            variant="drawer"
          />
        )}
        {insertToast && (
          <div
            role="status"
            aria-live="polite"
            style={{
              position: 'fixed',
              bottom: 28,
              left: '50%',
              transform: 'translateX(-50%)',
              background: '#130426',
              color: '#F8F4EB',
              fontFamily: hv,
              fontSize: 14,
              fontWeight: 500,
              padding: '10px 18px',
              borderRadius: 999,
              boxShadow: '0 8px 24px rgba(0,0,0,0.24)',
              zIndex: 60,
              whiteSpace: 'nowrap',
              maxWidth: '92vw',
              pointerEvents: 'none',
            }}
          >
            Inserted into your answer.
          </div>
        )}
      </SlidePanel>
    </div>
  )
}

export default function Wrapper() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#F8F4EB]" />}>
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
      className="transition-opacity mobile-sticky-export"
      onMouseEnter={(e) => { e.currentTarget.style.background = '#EAE4D8' }}
      onMouseLeave={(e) => { e.currentTarget.style.background = '#F8F4EB' }}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        borderRadius: 999,
        padding: '10px 20px',
        fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif",
        fontSize: 14,
        fontWeight: 600,
        background: '#F8F4EB',
        color: '#130426',
        border: 'none',
        cursor: disabled ? 'default' : 'pointer',
        whiteSpace: 'nowrap',
        opacity: disabled ? 0.6 : 1,
      }}
    >
      <svg width="14" height="14" viewBox="0 0 13 13" fill="none" aria-hidden="true">
        <path d="M6.5 1.5v6M3.5 5.5L6.5 8.5L9.5 5.5" stroke="#130426" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M1.5 10.5h10" stroke="#130426" strokeWidth="1.4" strokeLinecap="round" />
      </svg>
      Export
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
    const activityMeta = ACTIVITY_META_BY_ID[activityId]
    const relevance = activityMeta?.supplementaryDocumentRelevance?.[question]
    // neverAutoSuggest blocks AMBIENT surfacing, but a tag for ANY question in this
    // document is a document-level signal of appropriateness: the material then surfaces
    // normally here — tier by tag, tier-3 where untagged (e.g. Fears, tagged q5, shows as
    // "Also relevant" at the other questions). With no tag for this doc it stays blocked.
    if (activityMeta?.neverAutoSuggest && !hasAnySupDocTag(activityMeta.supplementaryDocumentRelevance, ADVANCE_DOC_QUESTIONS)) continue
    const behavior = getWorkingOutputBehavior(activityId)
    const item: TieredItem = {
      kind: 'entry',
      data: representative,
      insertBehavior: behavior.insertionBehavior,
    }
    if (relevance === 'primary') tier1.push(item)
    else if (relevance === 'secondary') tier2.push(item)
    else tier3.push(item)
  }

  const seenEntryIds = new Set<string>(outputs.map((o) => o.representative.id))
  for (const entry of [...healthcareEntries, ...manualEntries]) {
    if (seenEntryIds.has(entry.id)) continue
    if (entry.document_type === DOCUMENT_TYPE.ADVANCE_DIRECTIVE_SUPPLEMENT) continue
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
  // Recommended = primary (tier1). Also relevant = secondary for THIS question (tier2)
  // first, then the document-signal tail (tier3) — same section, ordered by relevance.
  return { recommended: tier1, other: [...tier2, ...tier3] }
}

// ---------------------------------------------------------------------------
// useMaterialsData — page-level hook so both desktop right rail and mobile
// drawer share one data source, and so trigger counts can be computed before the
// drawer opens. Inserted-state is NOT held here — it's derived from the response
// field (see isInsertedIntoResponse), so there's no session state to manage.
// ---------------------------------------------------------------------------

function useMaterialsData() {
  const [healthcareItems, setHealthcareItems] = useState<PanelEntry[]>([])
  const [outputItems, setOutputItems] = useState<PanelEntry[]>([])
  const [manualItems, setManualItems] = useState<PanelEntry[]>([])
  const [promptNotes, setPromptNotes] = useState<PanelNote[]>([])
  const [manualNotes, setManualNotes] = useState<PanelNote[]>([])
  const [loadingPanel, setLoadingPanel] = useState(true)

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
          .eq('domain_code', 'healthcare')
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

        }

        // All reflect-prompt notes — surfaced here, then doc-signal-filtered in allNotes
        // (only notes whose prompt is tagged for a q* question appear). Mirrors funeral-
        // wishes so q*-tagged prompts surface regardless of domain linkage. (Previously
        // scoped to healthcare-domain-linked notes only, which hid most tagged prompts.)
        const { data: allPromptNotesData } = await supabase
          .from('notes')
          .select('id, content, origin_type, prompt_context')
          .eq('user_id', user.id)
          .eq('origin_type', 'prompt')
          .not('prompt_context', 'is', null)
          .order('created_at', { ascending: false })
        setPromptNotes(
          (allPromptNotesData || []).map((n) => ({
            id: n.id,
            content: n.content,
            originType: n.origin_type ?? null,
            promptContext: n.prompt_context ?? null,
          })),
        )

        const { data: outputs } = await supabase
          .from('entries')
          .select('id, title, content, activity, document_type')
          .eq('user_id', user.id)
          .in('activity', STRUCTURED_ACTIVITIES)
          .order('created_at', { ascending: false })

        const reflectionByEntryId = await fetchReflectionsByEntryIds((outputs || []).map((e) => e.id))
        setOutputItems((outputs || []).map((e) => ({ ...e, group: 'output' as const, reflectionText: reflectionByEntryId[e.id] })))
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

  const existingEntryIds = useMemo(
    () => new Set([...healthcareItems, ...outputItems, ...manualItems].map((e) => e.id)),
    [healthcareItems, outputItems, manualItems],
  )

  const existingNoteIds = useMemo(
    () => new Set([...promptNotes, ...manualNotes].map((n) => n.id)),
    [promptNotes, manualNotes],
  )

  const allNotes = useMemo(() => {
    const seen = new Set<string>()
    const result: PanelNote[] = []
    const manualIds = new Set(manualNotes.map((n) => n.id))
    for (const n of [...promptNotes, ...manualNotes]) {
      if (seen.has(n.id)) continue
      // Auto-surfaced notes need a document-level signal (a reflect-prompt note whose
      // prompt is tagged for some q* question). Free-form/notepad/other notes have no
      // such signal and don't auto-surface. Manually-added notes bypass the filter.
      if (!manualIds.has(n.id) && !noteHasSupDocSignal(panelNoteToNote(n), ADVANCE_DOC_QUESTIONS)) continue
      seen.add(n.id); result.push(n)
    }
    return result
  }, [promptNotes, manualNotes])

  function addManualItem(entry: PanelEntry) {
    setManualItems((prev) => (prev.some((e) => e.id === entry.id) ? prev : [...prev, entry]))
  }

  function addManualNote(note: PanelNote) {
    setManualNotes((prev) => (prev.some((n) => n.id === note.id) ? prev : [...prev, note]))
  }

  return {
    healthcareItems, outputItems, manualItems, promptNotes, manualNotes,
    loadingPanel,
    deduplicatedOutputs, allNotes,
    existingEntryIds, existingNoteIds,
    addManualItem, addManualNote,
  }
}

type MaterialsData = ReturnType<typeof useMaterialsData>

// ---------------------------------------------------------------------------
// MaterialsPanel — presentation. Reads from MaterialsData; supports two
// visual variants ('panel' = desktop right rail with own chrome; 'drawer'
// = mobile drawer body without outer chrome since SlidePanel provides it).
// ---------------------------------------------------------------------------

function MaterialsPanel({
  activeQuestion,
  responseText,
  onInsert,
  data,
  variant = 'panel',
}: {
  activeQuestion: SupplementaryDocQuestion | null
  // Current text of the active question's response field. Inserted-state is derived
  // from this (see isInsertedIntoResponse) rather than tracked in session state.
  responseText: string
  onInsert: (text: string) => void
  data: MaterialsData
  variant?: 'panel' | 'drawer'
}) {
  const [showBrowser, setShowBrowser] = useState(false)
  const {
    healthcareItems, manualItems,
    loadingPanel,
    deduplicatedOutputs, allNotes,
    existingEntryIds, existingNoteIds,
    addManualItem, addManualNote,
  } = data

  const { recommended, other } = useMemo(() => {
    if (activeQuestion === null) {
      const seen = new Set<string>()
      const items: TieredItem[] = []
      for (const note of allNotes) {
        if (!seen.has(note.id)) { seen.add(note.id); items.push({ kind: 'note', data: note }) }
      }
      for (const { representative } of deduplicatedOutputs) {
        const meta = ACTIVITY_META_BY_ID[representative.activity ?? '']
        // Flat (no-section) overview: a neverAutoSuggest material shows here only if it
        // has a document-level signal (a tag for any question in this doc) — then it's
        // one of the doc's relevant materials. Otherwise it stays blocked.
        if (meta?.neverAutoSuggest && !hasAnySupDocTag(meta.supplementaryDocumentRelevance, ADVANCE_DOC_QUESTIONS)) continue
        if (!seen.has(representative.id)) {
          seen.add(representative.id)
          const behavior = getWorkingOutputBehavior(representative.activity ?? '')
          items.push({ kind: 'entry', data: representative, insertBehavior: behavior.insertionBehavior })
        }
      }
      const seenActivities = new Set(deduplicatedOutputs.map(o => o.representative.activity).filter(Boolean) as string[])
      for (const entry of [...healthcareItems, ...manualItems]) {
        if (seen.has(entry.id) || entry.document_type === DOCUMENT_TYPE.ADVANCE_DIRECTIVE_SUPPLEMENT) continue
        if (entry.activity && seenActivities.has(entry.activity)) continue
        seen.add(entry.id)
        items.push({ kind: 'entry', data: entry, insertBehavior: 'selectable_then_insert' })
      }
      return { recommended: [] as TieredItem[], other: items }
    }
    return computeRecommendedAndOther(activeQuestion, allNotes, deduplicatedOutputs, healthcareItems, manualItems)
  }, [activeQuestion, allNotes, deduplicatedOutputs, healthcareItems, manualItems])

  const browser = showBrowser ? (
    <MaterialsBrowser
      existingEntryIds={existingEntryIds}
      existingNoteIds={existingNoteIds}
      onAdd={(item) => {
        if (item.kind === 'entry') addManualItem(item.data)
        else addManualNote(item.data)
      }}
      onClose={() => setShowBrowser(false)}
    />
  ) : null

  // Panel is truly empty only when neither tier has anything. Manually-added
  // materials land in `other`, so this stays false whenever the user added something.
  const isEmpty = recommended.length === 0 && other.length === 0

  const innerContent = loadingPanel ? (
    <p className="text-[12px]" style={{ color: 'rgba(19,4,38,0.50)' }}>
      Loading...
    </p>
  ) : isEmpty ? (
    <MaterialsNullState />
  ) : activeQuestion === null ? (
    <FlatPanelContent items={other} onInsert={onInsert} />
  ) : (
    <PanelContent
      recommended={recommended}
      other={other}
      responseText={responseText}
      onInsert={onInsert}
    />
  )

  if (variant === 'drawer') {
    return (
      <>
        <button
          onClick={() => setShowBrowser(true)}
          className="shrink-0 transition-opacity hover:opacity-70"
          style={{
            display: 'inline-block',
            fontSize: 13,
            lineHeight: '18px',
            fontWeight: 500,
            color: '#130426',
            textDecoration: 'underline',
            textUnderlineOffset: '3px',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: 0,
            marginBottom: 16,
            whiteSpace: 'nowrap',
          }}
        >
          + Add materials
        </button>
        {innerContent}
        {browser}
      </>
    )
  }

  return (
    // Outer panel: pale Sunrise #F7E2C7
    <div style={{ background: '#F7E2C7', borderRadius: 16, padding: 16, border: '1px solid rgba(19,4,38,0.12)' }}>

      {/* Title row — sits on pale Sunrise */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
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
          <InfoTooltip text={MATERIALS_PANEL_TOOLTIP} />
        </div>
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

      {/* Item cards sit directly on the outer Sunrise panel (no inner cream backing). */}
      <div>
        {innerContent}
      </div>

      {browser}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Card style constants
// ---------------------------------------------------------------------------

const CARD_BASE: Record<1 | 2 | 3, React.CSSProperties> = {
  1: { background: '#FFFFFF', borderRadius: 10, padding: '10px 12px', border: '1px solid #130426' },
  2: { background: '#FFFFFF', borderRadius: 10, padding: '10px 12px', border: '1px solid #130426' },
  3: { background: '#FFFFFF', borderRadius: 10, padding: '10px 12px', border: '1px solid #130426' },
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
// ---------------------------------------------------------------------------
// PanelSection
// ---------------------------------------------------------------------------

const SECTION_LABEL_STYLE: React.CSSProperties = {
  fontSize: 14,
  lineHeight: '18px',
  fontWeight: 700,
  color: '#130426',
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
  other,
  responseText,
  onInsert,
}: {
  recommended: TieredItem[]
  other: TieredItem[]
  responseText: string
  onInsert: (text: string) => void
}) {
  const [otherExpanded, setOtherExpanded] = useState(false)
  const hasRecommended = recommended.length > 0
  const hasOther = other.length > 0

  // Neither tier — defer to the shared null state (the panel-level isEmpty check
  // normally intercepts this first; kept here as a defensive fallback).
  if (!hasRecommended && !hasOther) {
    return <div className="mt-2"><MaterialsNullState /></div>
  }

  // "Also relevant" list body — reused with or without its subheader.
  const otherList = (
    <>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {(otherExpanded || other.length <= OTHER_SHOW_LIMIT
          ? other
          : other.slice(0, OTHER_SHOW_LIMIT)
        ).map((item) => (
          <TieredPanelItem
            key={item.data.id}
            item={item}
            tier={3}
            responseText={responseText}
            onInsert={onInsert}
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
            color: 'rgba(19,4,38,0.65)',
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
    </>
  )

  return (
    <div className="mt-2">
      {hasRecommended && (
        <PanelSection label="Most relevant" isFirst>
          {recommended.map((item) => (
            <TieredPanelItem
              key={item.data.id}
              item={item}
              tier={1}
              responseText={responseText}
              onInsert={onInsert}
            />
          ))}
        </PanelSection>
      )}

      {hasOther && (hasRecommended ? (
        // Both tiers present — the "Also relevant" subheader makes the contrast meaningful.
        <div style={{ marginTop: 8, borderTop: '1px solid rgba(219,88,53,0.20)', paddingTop: 20 }}>
          <p style={SECTION_LABEL_STYLE}>Also relevant</p>
          {otherList}
        </div>
      ) : (
        // Only one tier — no contrast to draw, so list the materials directly under the
        // panel header (no subheader, no divider, no "no recommended" apology).
        otherList
      ))}
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
    // Defensive fallback — the panel-level isEmpty check normally intercepts first.
    return <MaterialsNullState />
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {visible.map((item) => (
        <TieredPanelItem
          key={item.data.id}
          item={item}
          tier={3}
          responseText=""
          readOnly
          onInsert={onInsert}
        />
      ))}
      {items.length > OTHER_SHOW_LIMIT && !expanded && (
        <button
          onClick={() => setExpanded(true)}
          style={{ fontSize: 12, fontWeight: 500, color: 'rgba(19,4,38,0.65)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, textDecoration: 'underline', textUnderlineOffset: 2, marginTop: 4 }}
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
  responseText,
  readOnly,
  onInsert,
}: {
  item: TieredItem
  tier: 1 | 2 | 3
  responseText: string
  readOnly?: boolean
  onInsert: (text: string) => void
}) {
  if (item.kind === 'note') {
    return (
      <NotePanelCard
        note={item.data}
        tier={tier}
        responseText={responseText}
        readOnly={readOnly}
        onInsert={onInsert}
      />
    )
  }

  const entry = item.data
  const activityId = entry.activity ?? ''

  if (activityId === ACTIVITY.VALUES_RANKING) {
    return (
      <ValuesCard entry={entry} tier={tier} responseText={responseText} readOnly={readOnly} onInsert={onInsert} />
    )
  }
  if (activityId === ACTIVITY.FEARS_RANKING) {
    return (
      <FearsCard entry={entry} tier={tier} responseText={responseText} readOnly={readOnly} onInsert={onInsert} />
    )
  }
  if (activityId === ACTIVITY.LEGACY_MAP) {
    const reflectionText = formatLegacyMapReflections(entry)
    if (!reflectionText) return null
    return (
      <LegacyMapCard entry={entry} tier={tier} responseText={responseText} readOnly={readOnly} onInsert={onInsert} />
    )
  }

  return (
    <GenericEntryCard
      entry={entry}
      tier={tier}
      responseText={responseText}
      readOnly={readOnly}
      insertBehavior={item.insertBehavior}
      onInsert={onInsert}
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
  responseText,
  readOnly,
  onInsert,
}: {
  note: PanelNote
  tier: 1 | 2 | 3
  responseText: string
  readOnly?: boolean
  onInsert: (text: string) => void
}) {
  const raw = note.content.trim()
  const hasPrompt = note.originType === 'prompt' && !!note.promptContext
  const inserted = isInsertedIntoResponse(responseText, note.content)

  return (
    <div style={CARD_BASE[tier]}>
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

      {!readOnly && (inserted ? (
        <span style={INSERTED_LABEL_STYLE}>Inserted</span>
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
  responseText,
  readOnly,
  onInsert,
}: {
  entry: PanelEntry
  tier: 1 | 2 | 3
  responseText: string
  readOnly?: boolean
  onInsert: (text: string) => void
}) {
  const [expanded, setExpanded] = useState(false)

  const c = entry.content as Record<string, unknown>
  const essential: string[] = Array.isArray(c?.essential) ? (c.essential as string[]) : []
  const important: string[] = Array.isArray(c?.important) ? (c.important as string[]) : []
  const lessCentral: string[] = Array.isArray(c?.less_central) ? (c.less_central as string[]) : []
  const allValues = [...essential, ...important, ...lessCentral]

  return (
    <div style={CARD_BASE[tier]}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6, marginBottom: readOnly ? 0 : 8, color: '#130426' }}>
        <div style={{ flexShrink: 0, marginTop: 2 }}><ActivityIcon slug={entry.activity ?? ''} size={16} color="#130426" /></div>
        <p style={TITLE_STYLE}>Values Ranking</p>
      </div>
      {!readOnly && (
        <button
          onClick={() => setExpanded((v) => !v)}
          style={PRIMARY_ACTION_STYLE}
          className="hover:opacity-75 transition-opacity"
        >
          {expanded ? 'Close' : 'Select & Insert'}
        </button>
      )}

      {!readOnly && expanded && (
        <div
          style={{
            marginTop: 12,
            paddingTop: 12,
            borderTop: '1px solid rgba(219,88,53,0.20)',
          }}
        >
          {allValues.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {allValues.map((value, i) => {
                // Per-item inserted state derived from the response — inserting one
                // value never collapses the card, and an already-present value shows a
                // badge instead of an Insert button (so it can't be inserted twice).
                const inserted = isInsertedIntoResponse(responseText, value)
                return (
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
                    {inserted ? (
                      <span style={{ ...INSERTED_LABEL_STYLE, flexShrink: 0 }}>Inserted</span>
                    ) : (
                      <button
                        onClick={() => onInsert(value)}
                        style={{ ...PRIMARY_ACTION_STYLE, flexShrink: 0 }}
                        className="hover:brightness-95 transition-all"
                      >
                        Insert
                      </button>
                    )}
                  </div>
                )
              })}
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
  responseText,
  readOnly,
  onInsert,
}: {
  entry: PanelEntry
  tier: 1 | 2 | 3
  responseText: string
  readOnly?: boolean
  onInsert: (text: string) => void
}) {
  const [expanded, setExpanded] = useState(false)

  const c = entry.content as Record<string, unknown>
  const essential: string[] = Array.isArray(c?.essential) ? (c.essential as string[]) : []
  const important: string[] = Array.isArray(c?.important) ? (c.important as string[]) : []
  const allFears = [...essential, ...important]

  return (
    <div style={CARD_BASE[tier]}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6, marginBottom: readOnly ? 0 : 8, color: '#130426' }}>
        <div style={{ flexShrink: 0, marginTop: 2 }}><ActivityIcon slug={entry.activity ?? ''} size={16} color="#130426" /></div>
        <p style={TITLE_STYLE}>Fears Ranking</p>
      </div>
      {!readOnly && (
        <button
          onClick={() => setExpanded((v) => !v)}
          style={PRIMARY_ACTION_STYLE}
          className="hover:opacity-75 transition-opacity"
        >
          {expanded ? 'Close' : 'Select & Insert'}
        </button>
      )}

      {!readOnly && expanded && (
        <div
          style={{
            marginTop: 12,
            paddingTop: 12,
            borderTop: '1px solid rgba(219,88,53,0.20)',
          }}
        >
          {allFears.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {allFears.map((fear, i) => {
                const inserted = isInsertedIntoResponse(responseText, fear)
                return (
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
                    {inserted ? (
                      <span style={{ ...INSERTED_LABEL_STYLE, flexShrink: 0 }}>Inserted</span>
                    ) : (
                      <button
                        onClick={() => onInsert(fear)}
                        style={{ ...PRIMARY_ACTION_STYLE, flexShrink: 0 }}
                        className="hover:brightness-95 transition-all"
                      >
                        Insert
                      </button>
                    )}
                  </div>
                )
              })}
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
  responseText,
  readOnly,
  onInsert,
}: {
  entry: PanelEntry
  tier: 1 | 2 | 3
  responseText: string
  readOnly?: boolean
  onInsert: (text: string) => void
}) {
  const reflectionText = formatLegacyMapReflections(entry)
  const inserted = isInsertedIntoResponse(responseText, reflectionText)

  return (
    <div style={CARD_BASE[tier]}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6, marginBottom: 4, color: '#130426' }}>
        <div style={{ flexShrink: 0, marginTop: 2 }}><ActivityIcon slug={entry.activity ?? ''} size={16} color="#130426" /></div>
        <p style={TITLE_STYLE}>Legacy Map Reflections</p>
      </div>
      <p
        style={{
          fontSize: 12,
          lineHeight: '18px',
          color: 'rgba(19,4,38,0.65)',
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
          marginBottom: readOnly ? 0 : 10,
        } as React.CSSProperties}
      >
        {reflectionText}
      </p>
      {!readOnly && (inserted ? (
        <span style={INSERTED_LABEL_STYLE}>Inserted</span>
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
  responseText,
  readOnly,
  insertBehavior,
  onInsert,
}: {
  entry: PanelEntry
  tier: 1 | 2 | 3
  responseText: string
  readOnly?: boolean
  insertBehavior: 'insertable' | 'selectable_then_insert' | 'view_only'
  onInsert: (text: string) => void
}) {
  const title = getDisplayTitle(entry)
  const insertText = formatForInsert(entry)
  const inserted = isInsertedIntoResponse(responseText, insertText)

  return (
    <div style={CARD_BASE[tier]}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6, marginBottom: readOnly ? 0 : 8, color: '#130426' }}>
        <div style={{ flexShrink: 0, marginTop: 2 }}><PanelDocIcon /></div>
        <p style={TITLE_STYLE}>{title}</p>
      </div>
      {!readOnly && insertBehavior !== 'view_only' && insertText && (
        inserted ? (
          <span style={INSERTED_LABEL_STYLE}>Inserted</span>
        ) : (
          <button
            onClick={() => onInsert(insertText)}
            style={PRIMARY_ACTION_STYLE}
            className="hover:brightness-95 transition-all"
          >
            Insert
          </button>
        )
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
    (e) => !existingEntryIds.has(e.id) && e.document_type !== DOCUMENT_TYPE.ADVANCE_DIRECTIVE_SUPPLEMENT,
  )
  const availableNotes = allNotes.filter((n) => !existingNoteIds.has(n.id))

  return (
    // Backdrop click-to-close; the accessible close path is the Close button inside.
    // eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
      style={{ background: 'rgba(26,15,46,0.85)' }}
      onClick={onClose}
    >
      {/* Guard: clicks inside the modal shouldn't trigger the backdrop close (not a control). */}
      {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions */}
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
  if (entry.document_type === DOCUMENT_TYPE.ADVANCE_DIRECTIVE_SUPPLEMENT) return DOCUMENT_TYPE_META.advance_directive_supplement.label
  if (entry.title?.trim()) return entry.title.trim()
  if (entry.activity === ACTIVITY.VALUES_RANKING) return 'Values Ranking'
  if (entry.activity === ACTIVITY.FEARS_RANKING) return 'Fears Ranking'
  if (entry.activity === ACTIVITY.LEGACY_MAP) return 'Legacy Map'
  if (entry.document_type === DOCUMENT_TYPE.PERSONAL_ADMIN_INFO) return DOCUMENT_TYPE_META.personal_admin_info.label
  if (entry.document_type === DOCUMENT_TYPE.IMPORTANT_CONTACTS) return DOCUMENT_TYPE_META.important_contacts.label
  if (entry.document_type === DOCUMENT_TYPE.DEVICES_AND_ACCOUNTS) return DOCUMENT_TYPE_META.devices_and_accounts.label
  if (entry.document_type === DOCUMENT_TYPE.FINANCIAL_INFORMATION) return DOCUMENT_TYPE_META.financial_information.label
  return 'Untitled'
}

function getTypeLabel(entry: PanelEntry): string {
  if (entry.activity === ACTIVITY.VALUES_RANKING) return 'Working output · Values Ranking'
  if (entry.activity === ACTIVITY.FEARS_RANKING) return 'Working output · Fears Ranking'
  if (entry.activity === ACTIVITY.LEGACY_MAP) return 'Working output · Legacy Map'
  if (entry.document_type) return `Document · ${entry.document_type.replace(/_/g, ' ')}`
  return 'Entry'
}

function formatLegacyMapReflections(entry: PanelEntry): string {
  // Note-first: the reflection lives in the linked note (entry.reflectionText). Fall back to
  // legacy content fields for un-migrated entries (pre-backfill / pre-deploy).
  if (entry.reflectionText && entry.reflectionText.trim()) return entry.reflectionText.trim()
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

  if (entry.activity === ACTIVITY.VALUES_RANKING) return formatValuesForInsert(entry)

  if (entry.activity === ACTIVITY.FEARS_RANKING) {
    const parts: string[] = []
    if (Array.isArray(obj.essential) && obj.essential.length)
      parts.push(`Primary concerns: ${(obj.essential as string[]).join(', ')}`)
    if (Array.isArray(obj.important) && obj.important.length)
      parts.push(`Also worried about: ${(obj.important as string[]).join(', ')}`)
    const r = entry.reflectionText ?? (typeof obj.reflection === 'string' ? obj.reflection : '')
    if (r.trim()) parts.push(r.trim())
    return parts.join('\n\n')
  }

  if (entry.activity === ACTIVITY.LEGACY_MAP) {
    const parts: string[] = []
    if (Array.isArray(obj.moments)) {
      const lines = (obj.moments as Record<string, unknown>[])
        .filter((m) => typeof m.title === 'string')
        .map((m) => `${m.title}${m.note ? ': ' + m.note : ''}`)
      if (lines.length) parts.push(lines.join('\n'))
    }
    const reflection = entry.reflectionText ?? (typeof obj.themes === 'string' ? obj.themes : '')
    if (reflection.trim()) parts.push(reflection.trim())
    if (typeof obj.valuesToPassOn === 'string' && obj.valuesToPassOn.trim())
      parts.push(`Values to pass on: ${obj.valuesToPassOn.trim()}`)
    return parts.join('\n\n')
  }

  const parts = Object.entries(obj)
    .filter(([, v]) => typeof v === 'string' && (v as string).trim())
    .map(([, v]) => (v as string).trim())
  return parts.join('\n\n')
}
