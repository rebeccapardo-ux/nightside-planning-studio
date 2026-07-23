'use client'

import { Suspense, useEffect, useId, useMemo, useRef, useState } from 'react'
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
import { ACTIVITY_META_BY_ID, ACTIVITY, STRUCTURED_ACTIVITIES, DOCUMENT_TYPE_META, DOCUMENT_TYPES, DOCUMENT_TYPE } from '@/lib/content-metadata'
import type { SupplementaryDocQuestion } from '@/lib/content-metadata'
import { type Note, fetchReflectionsByEntryIds } from '@/lib/notes'
import ActivityIcon from '@/app/components/ActivityIcon'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------


const EXCLUDED_DOMAIN_DOC_TYPES: string[] = DOCUMENT_TYPES.filter(c => c !== DOCUMENT_TYPE.FUNERAL_WISHES)

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type FormState = {
  whatMattersMost: string
  organDonationWishes: string
  organDonationSpecific: string
  organDonationNotes: string
  dispositionType: string
  burialLocation: string
  burialCasket: string
  burialEmbalming: string
  burialOtherWishes: string
  mausoleumLocation: string
  mausoleumOtherWishes: string
  cremationDirect: string
  cremationRemains: string
  cremationLocation: string
  cremationOtherWishes: string
  aquamationDirect: string
  aquamationRemains: string
  aquamationLocation: string
  aquamationOtherWishes: string
  homeFuneralPreference: string
  homeFuneralWishes: string
  bodyDonationPreregistered: string
  bodyDonationDetails: string
  bodyDonationAfterWishes: string
  dispositionOtherText: string
  memorialMarker: string
  memorialMarkerText: string
  memorialMarkerLocation: string
  memorialMarkerOtherWishes: string
  ceremonyCulturalTraditions: string
  ceremonyOfficiant: string
  ceremonyGatheringAlive: string
  ceremonyGatheringAliveDetails: string
  ceremonyFuneralWants: string
  ceremonyFuneralPublicPrivate: string
  ceremonyFuneralLocation: string
  ceremonyFuneralCoordinator: string
  ceremonyFuneralPrearranged: string
  ceremonyFuneralPrearrangedDetails: string
  ceremonyFuneralSpeakers: string
  ceremonyFuneralMusic: string
  ceremonyFuneralFlowers: string
  ceremonyFuneralDonationCause: string
  ceremonyDoNotWant: string
  ceremonyOtherWishes: string
  obituaryWants: string
  obituaryContent: string
  obituaryWriter: string
  obituaryPublications: string
  obituaryOnline: string
  charityDonationWants: string
  charityDonationDetails: string
  noteToOthers: string
}

type StringKey = keyof FormState
type SaveState = 'idle' | 'saving' | 'saved' | 'error'

type SectionKey =
  | 'what_matters_most'
  | 'organ_donation'
  | 'final_resting_place'
  | 'ceremony'
  | 'obituary'
  | 'note_to_others'

type PanelEntry = {
  id: string
  title: string | null
  content: unknown
  activity: string | null
  document_type: string | null
  group: 'domain' | 'output' | 'manual'
  reflectionText?: string // resolved from the linked reflection note (note-first; content fallback)
}

type OutputCard = { representative: PanelEntry; count: number }

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
// Data
// ---------------------------------------------------------------------------

const EMPTY_FORM: FormState = {
  whatMattersMost: '',
  organDonationWishes: '', organDonationSpecific: '', organDonationNotes: '',
  dispositionType: '',
  burialLocation: '', burialCasket: '', burialEmbalming: '', burialOtherWishes: '',
  mausoleumLocation: '', mausoleumOtherWishes: '',
  cremationDirect: '', cremationRemains: '', cremationLocation: '', cremationOtherWishes: '',
  aquamationDirect: '', aquamationRemains: '', aquamationLocation: '', aquamationOtherWishes: '',
  homeFuneralPreference: '',
  homeFuneralWishes: '',
  bodyDonationPreregistered: '', bodyDonationDetails: '', bodyDonationAfterWishes: '',
  dispositionOtherText: '',
  memorialMarker: '', memorialMarkerText: '', memorialMarkerLocation: '', memorialMarkerOtherWishes: '',
  ceremonyCulturalTraditions: '', ceremonyOfficiant: '',
  ceremonyGatheringAlive: '', ceremonyGatheringAliveDetails: '',
  ceremonyFuneralWants: '',
  ceremonyFuneralPublicPrivate: '', ceremonyFuneralLocation: '', ceremonyFuneralCoordinator: '',
  ceremonyFuneralPrearranged: '', ceremonyFuneralPrearrangedDetails: '',
  ceremonyFuneralSpeakers: '', ceremonyFuneralMusic: '',
  ceremonyFuneralFlowers: '', ceremonyFuneralDonationCause: '',
  ceremonyDoNotWant: '', ceremonyOtherWishes: '',
  obituaryWants: '', obituaryContent: '', obituaryWriter: '', obituaryPublications: '', obituaryOnline: '',
  charityDonationWants: '', charityDonationDetails: '',
  noteToOthers: '',
}

const SECTIONS: Array<{ key: SectionKey; label: string; description?: string; qKey: SupplementaryDocQuestion | null }> = [
  { key: 'what_matters_most',   label: 'What matters most', qKey: 'fw_s1' },
  { key: 'final_resting_place', label: 'Final resting place', qKey: 'fw_s3' },
  { key: 'organ_donation',      label: 'Organ and tissue donation', qKey: 'fw_s2' },
  { key: 'ceremony',            label: 'Ceremony and gathering', qKey: 'fw_s4' },
  { key: 'obituary',            label: 'Obituary and announcement', qKey: 'fw_s5' },
  { key: 'note_to_others',      label: 'A note to the people carrying this out', qKey: null },
]

// This document's section set (funeral-wishes owns fw_s1–fw_s5; note_to_others has no
// question id). A material with any supplementaryDocumentRelevance tag in this set has a
// document-level signal of appropriateness, overriding neverAutoSuggest for THIS doc.
// Fears carries no fw_s* tag, so it has no signal here and stays blocked.
const FUNERAL_DOC_QUESTIONS: SupplementaryDocQuestion[] = SECTIONS
  .map((s) => s.qKey)
  .filter((q): q is SupplementaryDocQuestion => q !== null)

// The form fields that belong to each section. Used to scope inserted-state
// derivation to the active section so per-section independence holds (inserting a
// value into one section never badges it in another). Keep in sync with FormState /
// the section layout; an unmapped field simply isn't checked (graceful, not fatal).
const SECTION_FIELDS: Record<SectionKey, StringKey[]> = {
  what_matters_most: ['whatMattersMost'],
  organ_donation: ['organDonationWishes', 'organDonationSpecific', 'organDonationNotes'],
  final_resting_place: [
    'dispositionType', 'burialLocation', 'burialCasket', 'burialEmbalming', 'burialOtherWishes',
    'mausoleumLocation', 'mausoleumOtherWishes',
    'cremationDirect', 'cremationRemains', 'cremationLocation', 'cremationOtherWishes',
    'aquamationDirect', 'aquamationRemains', 'aquamationLocation', 'aquamationOtherWishes',
    'homeFuneralPreference', 'homeFuneralWishes',
    'bodyDonationPreregistered', 'bodyDonationDetails', 'bodyDonationAfterWishes',
    'dispositionOtherText',
    'memorialMarker', 'memorialMarkerText', 'memorialMarkerLocation', 'memorialMarkerOtherWishes',
  ],
  ceremony: [
    'ceremonyCulturalTraditions', 'ceremonyOfficiant',
    'ceremonyGatheringAlive', 'ceremonyGatheringAliveDetails',
    'ceremonyFuneralWants', 'ceremonyFuneralPublicPrivate', 'ceremonyFuneralLocation', 'ceremonyFuneralCoordinator',
    'ceremonyFuneralPrearranged', 'ceremonyFuneralPrearrangedDetails',
    'ceremonyFuneralSpeakers', 'ceremonyFuneralMusic', 'ceremonyFuneralFlowers', 'ceremonyFuneralDonationCause',
    'ceremonyDoNotWant', 'ceremonyOtherWishes',
  ],
  obituary: ['obituaryWants', 'obituaryContent', 'obituaryWriter', 'obituaryPublications', 'obituaryOnline', 'charityDonationWants', 'charityDonationDetails'],
  note_to_others: ['noteToOthers'],
}

// Combined response text for the section a panel question belongs to — the source of
// truth for inserted-state in the funeral-wishes materials panel.
function fwSectionResponse(form: FormState, qKey: SupplementaryDocQuestion | null): string {
  if (!qKey) return ''
  const section = SECTIONS.find((s) => s.qKey === qKey)
  if (!section) return ''
  return SECTION_FIELDS[section.key].map((f) => form[f]).filter(Boolean).join('\n\n')
}

const DISPOSITION_OPTIONS: { key: string; label: string }[] = [
  { key: 'underground_burial', label: 'Underground burial' },
  { key: 'mausoleum',          label: 'Above-ground burial (mausoleum)' },
  { key: 'cremation',          label: 'Cremation' },
  { key: 'aquamation',         label: 'Aquamation (available in some provinces)' },
  { key: 'body_donation',      label: 'Body donation to science (requires pre-registration)' },
  { key: 'no_preference',      label: 'No preference — I leave this to the people carrying out my wishes' },
]

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

function FuneralWishesPage() {
  const searchParams = useSearchParams()
  const sParam = searchParams.get('s')
  const router = useRouter()

  const expandedIndex: number | null = useMemo(() => {
    if (sParam == null) return null
    const n = parseInt(sParam)
    if (isNaN(n)) return null
    return Math.max(0, Math.min(SECTIONS.length - 1, n - 1))
  }, [sParam])

  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const formRef = useRef<FormState>(EMPTY_FORM)
  const [entryId, setEntryId] = useState<string | null>(null)
  const entryIdRef = useRef<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [saveState, setSaveState] = useState<SaveState>('idle')
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null)
  const [statusNow, setStatusNow] = useState(Date.now())
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const insertionPointRef = useRef<{ field: StringKey; pos: number } | null>(null)
  const itemRefs = useRef<(HTMLDivElement | null)[]>([])
  const [savingSectionIdx, setSavingSectionIdx] = useState<number | null>(null)
  const [savedSectionIdx, setSavedSectionIdx] = useState<number | null>(null)
  const [savedSectionFading, setSavedSectionFading] = useState(false)
  const savedSectionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastEditedSectionIdxRef = useRef<number | null>(null)

  // Mobile drawer for Relevant Materials (≤ lg). Desktop keeps the right rail.
  const materialsData = useFWMaterialsData()
  const [drawerQuestion, setDrawerQuestion] = useState<SupplementaryDocQuestion | null>(null)
  const [insertToast, setInsertToast] = useState(false)
  const insertToastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const recommendedCountByQuestion = useMemo(() => {
    const counts = new Map<SupplementaryDocQuestion, number>()
    for (const s of SECTIONS) {
      if (s.qKey === null) continue
      const { recommended } = computeRecommendedAndOther(
        s.qKey,
        materialsData.allNotes,
        materialsData.deduplicatedOutputs,
        materialsData.allDomainAndManualItems,
      )
      counts.set(s.qKey, recommended.length)
    }
    return counts
  }, [materialsData.allNotes, materialsData.deduplicatedOutputs, materialsData.allDomainAndManualItems])

  function openMaterialsDrawer(qKey: SupplementaryDocQuestion) {
    setDrawerQuestion(qKey)
  }

  function closeMaterialsDrawer() {
    setDrawerQuestion(null)
  }

  useEffect(() => { window.scrollTo(0, 0) }, [])

  // Auto-scroll when a section expands. Collapsed sections aren't rendered
  // ({isExpanded && …}), so layout is final on the next render — a simple delayed
  // scroll lands correctly, same as the practical docs. (No animation; an animated
  // collapse would race the scroll.)
  useEffect(() => {
    if (expandedIndex === null) return
    const el = itemRefs.current[expandedIndex]
    if (!el) return
    const timer = setTimeout(() => {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 80)
    return () => clearTimeout(timer)
  }, [expandedIndex])

  // Load entry from DB
  useEffect(() => {
    async function load() {
      const supabase = createSupabaseBrowserClient()
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        const { data: rows } = await supabase
          .from('entries')
          .select('id, content, created_at')
          .eq('user_id', user.id)
          .eq('document_type', DOCUMENT_TYPE.FUNERAL_WISHES)
          .order('created_at', { ascending: false })
          .limit(1)

        const existing = rows?.[0]
        if (existing) {
          const c = (existing.content ?? {}) as Record<string, unknown>
          const loaded: FormState = {
            whatMattersMost: (c.whatMattersMost as string) || '',
            organDonationWishes: (c.organDonationWishes as string) || '',
            organDonationSpecific: (c.organDonationSpecific as string) || '',
            organDonationNotes: (c.organDonationNotes as string) || '',
            // Migrate from old dispositionTypes array to single dispositionType string
            dispositionType: (() => {
              if (c.dispositionType) return (c.dispositionType as string)
              if (Array.isArray(c.dispositionTypes)) {
                const without = (c.dispositionTypes as string[]).filter(t => t !== 'home_funeral')
                return without[0] || ''
              }
              return ''
            })(),
            burialLocation: (c.burialLocation as string) || '',
            burialCasket: (c.burialCasket as string) || '',
            burialEmbalming: (c.burialEmbalming as string) || '',
            burialOtherWishes: (c.burialOtherWishes as string) || '',
            mausoleumLocation: (c.mausoleumLocation as string) || '',
            mausoleumOtherWishes: (c.mausoleumOtherWishes as string) || '',
            cremationDirect: (c.cremationDirect as string) || '',
            cremationRemains: (c.cremationRemains as string) || '',
            cremationLocation: (c.cremationLocation as string) || '',
            cremationOtherWishes: (c.cremationOtherWishes as string) || '',
            aquamationDirect: (c.aquamationDirect as string) || '',
            aquamationRemains: (c.aquamationRemains as string) || '',
            aquamationLocation: (c.aquamationLocation as string) || '',
            aquamationOtherWishes: (c.aquamationOtherWishes as string) || '',
            homeFuneralPreference: (() => {
              if (c.homeFuneralPreference) return (c.homeFuneralPreference as string)
              if (Array.isArray(c.dispositionTypes) && (c.dispositionTypes as string[]).includes('home_funeral')) return 'yes'
              return ''
            })(),
            homeFuneralWishes: (c.homeFuneralWishes as string) || '',
            bodyDonationPreregistered: (c.bodyDonationPreregistered as string) || '',
            bodyDonationDetails: (c.bodyDonationDetails as string) || '',
            bodyDonationAfterWishes: (c.bodyDonationAfterWishes as string) || '',
            dispositionOtherText: (c.dispositionOtherText as string) || '',
            memorialMarker: (c.memorialMarker as string) || '',
            memorialMarkerText: (c.memorialMarkerText as string) || '',
            memorialMarkerLocation: (c.memorialMarkerLocation as string) || '',
            memorialMarkerOtherWishes: (c.memorialMarkerOtherWishes as string) || '',
            ceremonyCulturalTraditions: (c.ceremonyCulturalTraditions as string) || '',
            ceremonyOfficiant: (c.ceremonyOfficiant as string) || '',
            ceremonyGatheringAlive: (c.ceremonyGatheringAlive as string) || '',
            ceremonyGatheringAliveDetails: (c.ceremonyGatheringAliveDetails as string) || '',
            ceremonyFuneralWants: (c.ceremonyFuneralWants as string) || '',
            ceremonyFuneralPublicPrivate: (c.ceremonyFuneralPublicPrivate as string) || '',
            ceremonyFuneralLocation: (c.ceremonyFuneralLocation as string) || '',
            ceremonyFuneralCoordinator: (c.ceremonyFuneralCoordinator as string) || '',
            ceremonyFuneralPrearranged: (c.ceremonyFuneralPrearranged as string) || '',
            ceremonyFuneralPrearrangedDetails: (c.ceremonyFuneralPrearrangedDetails as string) || '',
            ceremonyFuneralSpeakers: (c.ceremonyFuneralSpeakers as string) || '',
            ceremonyFuneralMusic: (c.ceremonyFuneralMusic as string) || '',
            ceremonyFuneralFlowers: (c.ceremonyFuneralFlowers as string) || '',
            ceremonyFuneralDonationCause: (c.ceremonyFuneralDonationCause as string) || '',
            ceremonyDoNotWant: (c.ceremonyDoNotWant as string) || '',
            ceremonyOtherWishes: (c.ceremonyOtherWishes as string) || '',
            obituaryWants: (c.obituaryWants as string) || '',
            obituaryContent: (c.obituaryContent as string) || '',
            obituaryWriter: (c.obituaryWriter as string) || '',
            obituaryPublications: (c.obituaryPublications as string) || '',
            obituaryOnline: (c.obituaryOnline as string) || '',
            charityDonationWants: (c.charityDonationWants as string) || '',
            charityDonationDetails: (c.charityDonationDetails as string) || '',
            noteToOthers: (c.noteToOthers as string) || '',
          }
          setEntryId(existing.id)
          entryIdRef.current = existing.id
          const storedSave = localStorage.getItem(`nightside.lastSaved.${user.id}.${existing.id}`)
          const savedDate = storedSave ? new Date(storedSave) : existing.created_at ? new Date(existing.created_at) : null
          if (savedDate) setLastSavedAt(savedDate)
          setForm(loaded)
          formRef.current = loaded
        }
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

  function updateField(field: StringKey, value: string) {
    const next = { ...formRef.current, [field]: value }
    formRef.current = next
    setForm(next)
    triggerSave()
  }

  function handleCursorChange(field: StringKey, pos: number) {
    insertionPointRef.current = { field, pos }
  }

  function insertIntoCurrent(text: string) {
    const point = insertionPointRef.current
    if (!point) return
    const field = point.field
    setForm(prev => {
      const current = prev[field]
      const pos = Math.min(point.pos, current.length)
      const before = current.slice(0, pos)
      const after = current.slice(pos)
      const preSep = before.length > 0 && !/\n\n$/.test(before) ? '\n\n' : ''
      const postSep = after.length > 0 && !/^\n\n/.test(after) ? '\n\n' : ''
      const updated = { ...prev, [field]: before + preSep + text + postSep + after }
      formRef.current = updated
      triggerSave()
      return updated
    })
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

  function triggerSave() {
    lastEditedSectionIdxRef.current = expandedIndex
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => handleSave(), 1500)
  }

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

  function toggleItem(index: number) {
    if (expandedIndex === index) {
      router.push('/app/capture/funeral-wishes', { scroll: false })
    } else {
      router.push(`/app/capture/funeral-wishes?s=${index + 1}`, { scroll: false })
    }
  }

  async function associateWithDeathcare(id: string) {
    try {
      const supabase = createSupabaseBrowserClient()
      const { data: container } = await supabase
        .from('containers').select('id').eq('type', 'domain').eq('domain_code', 'deathcare').maybeSingle()
      if (!container) return
      const { data: existing } = await supabase
        .from('container_entries').select('entry_id')
        .eq('container_id', container.id).eq('entry_id', id).maybeSingle()
      if (!existing) {
        await supabase.from('container_entries').insert({ container_id: container.id, entry_id: id })
      }
    } catch {}
  }

  async function handleSave() {
    const supabase = createSupabaseBrowserClient()
    try {
      setSaveState('saving')
      setSavingSectionIdx(lastEditedSectionIdxRef.current)
      const startedAt = Date.now()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setSaveState('error'); setSavingSectionIdx(null); return }

      const content = formRef.current
      const hasFuneralWishes = content.dispositionType !== '' || content.memorialMarker !== ''
      const hasOrganDonation = content.organDonationWishes !== ''
      const metaUpdates: Record<string, unknown> = {}
      if (hasFuneralWishes) metaUpdates.sync_has_funeral_wishes = true
      if (hasOrganDonation) metaUpdates.sync_has_organ_donation_wishes = true
      if (Object.keys(metaUpdates).length > 0) {
        supabase.auth.updateUser({ data: metaUpdates }).catch(() => {})
      }

      if (!entryIdRef.current) {
        const { data: created, error } = await supabase
          .from('entries')
          .insert({ user_id: user.id, title: DOCUMENT_TYPE_META.funeral_wishes.label, section: 'capture', document_type: DOCUMENT_TYPE.FUNERAL_WISHES, content })
          .select('id, created_at').single()
        if (error || !created) { setSaveState('error'); return }
        setEntryId(created.id)
        entryIdRef.current = created.id
        localStorage.setItem(`nightside.lastSaved.${user.id}.${created.id}`, new Date().toISOString())
        await holdSavingIndicator(startedAt)
        setLastSavedAt(new Date()); setStatusNow(Date.now()); setSaveState('saved')
        setSavingSectionIdx(null); triggerSavedIndicator(lastEditedSectionIdxRef.current)
        associateWithDeathcare(created.id)
        window.setTimeout(() => setSaveState(s => s === 'saved' ? 'idle' : s), 3400)
        return
      }

      const { error } = await supabase.from('entries').update({ content }).eq('id', entryIdRef.current)
      if (error) { setSaveState('error'); return }
      localStorage.setItem(`nightside.lastSaved.${user.id}.${entryIdRef.current}`, new Date().toISOString())
      await holdSavingIndicator(startedAt)
      setLastSavedAt(new Date()); setStatusNow(Date.now()); setSaveState('saved')
      setSavingSectionIdx(null); triggerSavedIndicator(lastEditedSectionIdxRef.current)
      associateWithDeathcare(entryIdRef.current!)
      window.setTimeout(() => setSaveState(s => s === 'saved' ? 'idle' : s), 3400)
    } catch { setSaveState('error') }
  }

  async function handlePreviewExport() {
    if (!entryIdRef.current) return
    if (debounceRef.current) { clearTimeout(debounceRef.current); debounceRef.current = null; await handleSave() }
    // Non-sensitive document: skip the snapshot, go straight to the export preview.
    router.push(`/app/entries/${entryIdRef.current}/export`)
  }

  const saveStatusText = (() => {
    if (saveState === 'error') return "Couldn't save"
    if (!lastSavedAt) return null
    const diff = Math.max(statusNow - lastSavedAt.getTime(), 0)
    const s = Math.floor(diff / 1000), m = Math.floor(s / 60), h = Math.floor(m / 60)
    const d = Math.floor(h / 24), w = Math.floor(d / 7)
    if (s < 60) return 'Saved just now'
    if (m < 60) return `Saved ${m}m ago`
    if (h < 24) return h === 1 ? 'Saved 1h ago' : `Saved ${h}h ago`
    if (d < 7) return d === 1 ? 'Saved 1 day ago' : `Saved ${d} days ago`
    return w === 1 ? 'Saved 1 week ago' : `Saved ${w} weeks ago`
  })()

  if (loading) {
    return <div className="min-h-screen bg-[#F8F4EB]"><div className="max-w-3xl mx-auto px-4 py-16 text-[#130426]/60">Loading...</div></div>
  }

  const inDisposition = (key: string) => form.dispositionType === key

  const activePanelQuestion = expandedIndex !== null ? SECTIONS[expandedIndex].qKey : null

  const exportZone = entryId ? (
    <div className="capture-export-bar" style={{ position: 'absolute', top: 20, right: 152, zIndex: 10, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
      <ExportButton onClick={handlePreviewExport} disabled={saveState === 'saving'} />
      {saveStatusText && (
        <span style={{ fontSize: 12, fontWeight: 500, color: saveState === 'error' ? '#8B0000' : '#F8F4EB', fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif" }}>
          {saveState === 'error' && <AlertIcon color="#8B0000" />}{saveStatusText}
        </span>
      )}
    </div>
  ) : null

  return (
    <div className="min-h-screen bg-[#F8F4EB] relative">
      {exportZone}
      <DocHeaderBanner title="Wishes for My Body, Funeral & Ceremony" crumbLabel="Wishes for My Body, Funeral & Ceremony" docCategory="wishes" maxWidth={1152}>
        <p style={docBannerIntro}>
          This document is a place to record your wishes for what happens to your body, any funeral or ceremony, and how you&apos;d like to be remembered. It will be most useful if you&apos;ve already taken time to reflect on your priorities and learn about your rights and options.
        </p>
        <p style={docBannerNote}>
          This is <strong>not a legal document.</strong> Wishes for body disposition should also be included in your legal will. Regulations vary by province;{' '}
          <Link href="/app/area/deathcare" className="underline underline-offset-2 hover:opacity-70 transition-opacity" style={{ color: 'inherit' }}>
            view province-specific resources →
          </Link>
        </p>
      </DocHeaderBanner>
      <div className="max-w-6xl mx-auto px-4 pt-10 pb-16">
        <AutosaveNotice style={{ marginBottom: 8 }}>Your answers will save automatically to Your materials.</AutosaveNotice>
        {saveStatusText && (
          <span className="mobile-saved-status" style={{ fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif", fontSize: 13, color: saveState === 'error' ? '#8B0000' : 'rgba(19,4,38,0.65)', marginTop: 16, display: 'none' }}>{saveState === 'error' && <AlertIcon color="#8B0000" />}{saveStatusText}</span>
        )}

        <div className="lg:grid lg:grid-cols-[1fr_340px] lg:gap-12 items-start">
          {/* LEFT: accordion */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {SECTIONS.map((section, i) => {
              const isExpanded = expandedIndex === i

              return (
                <div
                  key={section.key}
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
                        <div>
                          <p style={{ fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif", fontSize: 22, fontWeight: 500, color: '#130426', margin: 0, lineHeight: 1.2 }}>
                            {section.label}
                          </p>
                          {section.description && (
                            <p style={{ fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif", fontSize: 14, color: '#130426', margin: '6px 0 0', lineHeight: 1.5 }}>
                              {section.description}
                            </p>
                          )}
                        </div>
                        <svg width="14" height="9" viewBox="0 0 14 9" fill="none" style={{ flexShrink: 0, transition: 'transform 200ms ease', transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)', marginTop: 6 }}>
                          <path d="M1 1.5L7 7.5L13 1.5" stroke="#130426" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </button>
                      {isExpanded && (
                        <div style={{ padding: '0 16px 20px', background: '#FFFFFF' }}>
                        <div style={{ background: 'transparent', padding: 0, display: 'flex', flexDirection: 'column', gap: 28 }}>

                          {(() => {
                            if (!section.qKey) return null
                            const count = recommendedCountByQuestion.get(section.qKey) ?? 0
                            if (count === 0) return null
                            return (
                              <div className="lg:hidden" style={{ marginBottom: -12 }}>
                                <button
                                  type="button"
                                  onClick={() => openMaterialsDrawer(section.qKey!)}
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
                                    fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif",
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

                          {section.key === 'what_matters_most' && (
                            <TF
                              label="What is most important to you about how you are remembered and honored?"
                              value={form.whatMattersMost}
                              onChange={v => updateField('whatMattersMost', v)}
                              rows={6}
                              fieldKey="whatMattersMost"
                              onCursorChange={handleCursorChange}
                            />
                          )}

                          {section.key === 'final_resting_place' && (
                            <>
                              <p style={{ fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif", fontSize: 17, fontWeight: 500, color: '#130426', margin: 0 }}>
                                What would you like done with your body?
                              </p>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                {DISPOSITION_OPTIONS.map(({ key, label }) => (
                                  <RadioOption key={key} label={label} checked={inDisposition(key)} onChange={() => updateField('dispositionType', key)} />
                                ))}
                              </div>
                              <FadeIn visible={form.dispositionType === 'underground_burial'}>
                                <TF label="Where (location or cemetery preferences):" value={form.burialLocation} onChange={v => updateField('burialLocation', v)} fieldKey="burialLocation" onCursorChange={handleCursorChange} />
                                <TF label="Casket preferences:" value={form.burialCasket} onChange={v => updateField('burialCasket', v)} fieldKey="burialCasket" onCursorChange={handleCursorChange} />
                                <RadioGroup label="Embalming:" value={form.burialEmbalming} onChange={v => updateField('burialEmbalming', v)} options={[{ value: 'yes', label: 'Yes' }, { value: 'no', label: 'No' }, { value: 'no_preference', label: 'No preference' }]} />
                                <HelperText italic>Embalming is not legally required.</HelperText>
                                <TF label="Any other wishes:" value={form.burialOtherWishes} onChange={v => updateField('burialOtherWishes', v)} fieldKey="burialOtherWishes" onCursorChange={handleCursorChange} />
                              </FadeIn>
                              <FadeIn visible={form.dispositionType === 'mausoleum'}>
                                <TF label="Where (location preferences):" value={form.mausoleumLocation} onChange={v => updateField('mausoleumLocation', v)} fieldKey="mausoleumLocation" onCursorChange={handleCursorChange} />
                                <TF label="Any other wishes:" value={form.mausoleumOtherWishes} onChange={v => updateField('mausoleumOtherWishes', v)} fieldKey="mausoleumOtherWishes" onCursorChange={handleCursorChange} />
                              </FadeIn>
                              <FadeIn visible={form.dispositionType === 'cremation'}>
                                <RadioGroup label="Direct cremation (no ceremony before):" value={form.cremationDirect} onChange={v => updateField('cremationDirect', v)} options={[{ value: 'yes', label: 'Yes' }, { value: 'no', label: 'No' }, { value: 'no_preference', label: 'No preference' }]} />
                                <TF label="Who should receive the remains:" value={form.cremationRemains} onChange={v => updateField('cremationRemains', v)} fieldKey="cremationRemains" onCursorChange={handleCursorChange} />
                                <TF label="Where should the remains go:" value={form.cremationLocation} onChange={v => updateField('cremationLocation', v)} fieldKey="cremationLocation" onCursorChange={handleCursorChange} />
                                <TF label="Any other wishes:" value={form.cremationOtherWishes} onChange={v => updateField('cremationOtherWishes', v)} fieldKey="cremationOtherWishes" onCursorChange={handleCursorChange} />
                              </FadeIn>
                              <FadeIn visible={form.dispositionType === 'aquamation'}>
                                <HelperText italic>Aquamation is available in some provinces. <Link href="/app/area/deathcare" style={{ color: 'rgba(19,4,38,0.65)', textDecoration: 'underline' }}>learn more</Link></HelperText>
                                <RadioGroup label="Direct aquamation (no ceremony before):" value={form.aquamationDirect} onChange={v => updateField('aquamationDirect', v)} options={[{ value: 'yes', label: 'Yes' }, { value: 'no', label: 'No' }, { value: 'no_preference', label: 'No preference' }]} />
                                <TF label="Who should receive the remains:" value={form.aquamationRemains} onChange={v => updateField('aquamationRemains', v)} fieldKey="aquamationRemains" onCursorChange={handleCursorChange} />
                                <TF label="Where should the remains go:" value={form.aquamationLocation} onChange={v => updateField('aquamationLocation', v)} fieldKey="aquamationLocation" onCursorChange={handleCursorChange} />
                                <TF label="Any other wishes:" value={form.aquamationOtherWishes} onChange={v => updateField('aquamationOtherWishes', v)} fieldKey="aquamationOtherWishes" onCursorChange={handleCursorChange} />
                              </FadeIn>
                              <FadeIn visible={form.dispositionType === 'body_donation'}>
                                <RadioGroup label="Have you pre-registered:" value={form.bodyDonationPreregistered} onChange={v => updateField('bodyDonationPreregistered', v)} options={[{ value: 'yes', label: 'Yes' }, { value: 'no', label: 'No' }, { value: 'not_yet', label: 'Not yet' }]} />
                                <FadeIn visible={form.bodyDonationPreregistered === 'yes'}>
                                  <TF label="With whom / details:" value={form.bodyDonationDetails} onChange={v => updateField('bodyDonationDetails', v)} fieldKey="bodyDonationDetails" onCursorChange={handleCursorChange} />
                                </FadeIn>
                                <TF label="Any wishes for after donation is complete:" value={form.bodyDonationAfterWishes} onChange={v => updateField('bodyDonationAfterWishes', v)} fieldKey="bodyDonationAfterWishes" onCursorChange={handleCursorChange} />
                              </FadeIn>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                                <RadioGroup
                                  label="Would you like a memorial marker or plaque?"
                                  value={form.memorialMarker}
                                  onChange={v => updateField('memorialMarker', v)}
                                  options={[{ value: 'yes', label: 'Yes' }, { value: 'no', label: 'No' }, { value: 'no_preference', label: 'No preference' }]}
                                />
                                <FadeIn visible={form.memorialMarker === 'yes'}>
                                  <TF label="What should it say?" value={form.memorialMarkerText} onChange={v => updateField('memorialMarkerText', v)} fieldKey="memorialMarkerText" onCursorChange={handleCursorChange} />
                                  <TF label="Where should it be located?" value={form.memorialMarkerLocation} onChange={v => updateField('memorialMarkerLocation', v)} fieldKey="memorialMarkerLocation" onCursorChange={handleCursorChange} />
                                  <TF label="Any other wishes:" value={form.memorialMarkerOtherWishes} onChange={v => updateField('memorialMarkerOtherWishes', v)} fieldKey="memorialMarkerOtherWishes" onCursorChange={handleCursorChange} />
                                </FadeIn>
                              </div>
                            </>
                          )}

                          {section.key === 'organ_donation' && (
                            <>
                              <RadioGroup
                                label="Do you wish to donate your organs and/or tissue?"
                                value={form.organDonationWishes}
                                onChange={v => updateField('organDonationWishes', v)}
                                options={[
                                  { value: 'yes_all',       label: 'Yes — all organs and tissue' },
                                  { value: 'yes_some',      label: 'Yes — some organs or tissue only' },
                                  { value: 'no',            label: 'No' },
                                  { value: 'not_sure',      label: 'Not sure' },
                                  { value: 'no_preference', label: 'No preference' },
                                ]}
                              />
                              <FadeIn visible={form.organDonationWishes === 'yes_some'}>
                                <TF
                                  label="Which organs or tissue would you like to donate?"
                                  value={form.organDonationSpecific}
                                  onChange={v => updateField('organDonationSpecific', v)}
                                  fieldKey="organDonationSpecific"
                                  onCursorChange={handleCursorChange}
                                />
                              </FadeIn>
                              <HelperText italic important>
                                To make your donation wishes legally effective, you need to register with your provincial organ and tissue donation registry. Indicating your wishes here does not constitute registration. This is separate from body disposition — you can donate organs regardless of your other wishes.{' '}
                                <Link href="/app/area/deathcare" style={{ color: '#130426', textDecoration: 'underline' }}>Learn more about organ donation in your province →</Link>
                              </HelperText>
                              <FadeIn visible={['yes_all', 'yes_some', 'not_sure'].includes(form.organDonationWishes)}>
                                <TF
                                  label="Any other wishes or notes about donation:"
                                  value={form.organDonationNotes}
                                  onChange={v => updateField('organDonationNotes', v)}
                                  fieldKey="organDonationNotes"
                                  onCursorChange={handleCursorChange}
                                />
                              </FadeIn>
                            </>
                          )}

                          {section.key === 'ceremony' && (
                            <>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                                <RadioGroup label="Would you like a home funeral?" value={form.homeFuneralPreference} onChange={v => updateField('homeFuneralPreference', v)} options={[{ value: 'yes', label: 'Yes' }, { value: 'no', label: 'No' }, { value: 'no_preference', label: 'No preference' }]} />
                                <HelperText italic>Regulations vary by province — <Link href="/app/area/deathcare" style={{ color: 'rgba(19,4,38,0.65)', textDecoration: 'underline' }}>learn more</Link>.</HelperText>
                                <FadeIn visible={form.homeFuneralPreference === 'yes'}>
                                  <TF label="Any specific wishes:" value={form.homeFuneralWishes} onChange={v => updateField('homeFuneralWishes', v)} fieldKey="homeFuneralWishes" onCursorChange={handleCursorChange} />
                                </FadeIn>
                              </div>
                              <TF label="Are there religious, spiritual, or cultural traditions important to you?" value={form.ceremonyCulturalTraditions} onChange={v => updateField('ceremonyCulturalTraditions', v)} placeholder="This might include prayers, rituals, music, readings, or other practices." fieldKey="ceremonyCulturalTraditions" onCursorChange={handleCursorChange} />
                              <TF label="Is there a religious, spiritual, or cultural figure you would like present or officiating?" value={form.ceremonyOfficiant} onChange={v => updateField('ceremonyOfficiant', v)} fieldKey="ceremonyOfficiant" onCursorChange={handleCursorChange} />
                              <RadioGroup label="Would you like a gathering or ceremony while you are still alive?" value={form.ceremonyGatheringAlive} onChange={v => updateField('ceremonyGatheringAlive', v)} options={[{ value: 'yes', label: 'Yes' }, { value: 'no', label: 'No' }, { value: 'no_preference', label: 'No preference' }]} />
                              <FadeIn visible={form.ceremonyGatheringAlive === 'yes'}>
                                <TF label="What kind of gathering, and what matters most to you about it?" value={form.ceremonyGatheringAliveDetails} onChange={v => updateField('ceremonyGatheringAliveDetails', v)} fieldKey="ceremonyGatheringAliveDetails" onCursorChange={handleCursorChange} />
                              </FadeIn>
                              <RadioGroup label="Would you like a funeral, memorial, or celebration of life after your death?" value={form.ceremonyFuneralWants} onChange={v => updateField('ceremonyFuneralWants', v)} options={[{ value: 'yes', label: 'Yes' }, { value: 'no', label: 'No' }, { value: 'no_preference', label: 'No preference' }, { value: 'leave_to_others', label: 'Leave it to the people carrying this out' }]} />
                              <FadeIn visible={form.ceremonyFuneralWants === 'yes'}>
                                <RadioGroup label="Public or private:" value={form.ceremonyFuneralPublicPrivate} onChange={v => updateField('ceremonyFuneralPublicPrivate', v)} options={[{ value: 'public', label: 'Public' }, { value: 'private', label: 'Private' }, { value: 'no_preference', label: 'No preference' }]} />
                                <TF label="Location preferences:" value={form.ceremonyFuneralLocation} onChange={v => updateField('ceremonyFuneralLocation', v)} fieldKey="ceremonyFuneralLocation" onCursorChange={handleCursorChange} />
                                <TF label="Who should coordinate arrangements:" value={form.ceremonyFuneralCoordinator} onChange={v => updateField('ceremonyFuneralCoordinator', v)} fieldKey="ceremonyFuneralCoordinator" onCursorChange={handleCursorChange} />
                                <RadioGroup label="Have you made pre-arrangements with a funeral home:" value={form.ceremonyFuneralPrearranged} onChange={v => updateField('ceremonyFuneralPrearranged', v)} options={[{ value: 'yes', label: 'Yes' }, { value: 'no', label: 'No' }]} />
                                <FadeIn visible={form.ceremonyFuneralPrearranged === 'yes'}>
                                  <TF label="Details:" value={form.ceremonyFuneralPrearrangedDetails} onChange={v => updateField('ceremonyFuneralPrearrangedDetails', v)} fieldKey="ceremonyFuneralPrearrangedDetails" onCursorChange={handleCursorChange} />
                                </FadeIn>
                                <TF label="Who should speak or participate:" value={form.ceremonyFuneralSpeakers} onChange={v => updateField('ceremonyFuneralSpeakers', v)} fieldKey="ceremonyFuneralSpeakers" onCursorChange={handleCursorChange} />
                                <TF label="Music preferences:" value={form.ceremonyFuneralMusic} onChange={v => updateField('ceremonyFuneralMusic', v)} fieldKey="ceremonyFuneralMusic" onCursorChange={handleCursorChange} />
                                <RadioGroup label="Flowers or charitable donation:" value={form.ceremonyFuneralFlowers} onChange={v => updateField('ceremonyFuneralFlowers', v)} options={[{ value: 'flowers', label: 'Flowers' }, { value: 'donation', label: 'Charitable donation instead of flowers' }, { value: 'both', label: 'Both welcome' }, { value: 'no_preference', label: 'No preference' }]} />
                                <FadeIn visible={form.ceremonyFuneralFlowers === 'donation'}>
                                  <TF label="Which cause or organization:" value={form.ceremonyFuneralDonationCause} onChange={v => updateField('ceremonyFuneralDonationCause', v)} fieldKey="ceremonyFuneralDonationCause" onCursorChange={handleCursorChange} />
                                </FadeIn>
                              </FadeIn>
                              <TF label="Is there anything you specifically do NOT want?" value={form.ceremonyDoNotWant} onChange={v => updateField('ceremonyDoNotWant', v)} fieldKey="ceremonyDoNotWant" onCursorChange={handleCursorChange} />
                              <TF label="Any other wishes for ceremony or gathering:" value={form.ceremonyOtherWishes} onChange={v => updateField('ceremonyOtherWishes', v)} fieldKey="ceremonyOtherWishes" onCursorChange={handleCursorChange} />
                            </>
                          )}

                          {section.key === 'obituary' && (
                            <>
                              <RadioGroup label="Would you like an obituary?" value={form.obituaryWants} onChange={v => updateField('obituaryWants', v)} options={[{ value: 'yes', label: 'Yes' }, { value: 'no', label: 'No' }, { value: 'leave_to_others', label: 'Leave it to others' }, { value: 'no_preference', label: 'No preference' }]} />
                              <FadeIn visible={form.obituaryWants === 'yes'}>
                                <TF label="What should it include:" value={form.obituaryContent} onChange={v => updateField('obituaryContent', v)} fieldKey="obituaryContent" onCursorChange={handleCursorChange} />
                                <TF label="Who should write it:" value={form.obituaryWriter} onChange={v => updateField('obituaryWriter', v)} fieldKey="obituaryWriter" onCursorChange={handleCursorChange} />
                                <TF label="Where should it be published:" value={form.obituaryPublications} onChange={v => updateField('obituaryPublications', v)} fieldKey="obituaryPublications" onCursorChange={handleCursorChange} />
                                <TF label="Any preferences for how your death is announced online or on social media?" value={form.obituaryOnline} onChange={v => updateField('obituaryOnline', v)} fieldKey="obituaryOnline" onCursorChange={handleCursorChange} />
                                <HelperText italic>
                                  For preferences about what happens to your social media accounts after death, see{' '}
                                  <a href="/app/capture/devices-and-accounts" style={{ color: 'rgba(19,4,38,0.65)', textDecoration: 'underline' }}>Devices &amp; Accounts</a> in Your materials.
                                </HelperText>
                              </FadeIn>
                              <RadioGroup label="Would you like people to donate to a cause or organization in your memory, instead of or in addition to flowers or other gestures?" value={form.charityDonationWants} onChange={v => updateField('charityDonationWants', v)} options={[{ value: 'yes', label: 'Yes' }, { value: 'no', label: 'No' }, { value: 'no_preference', label: 'No preference' }]} />
                              <FadeIn visible={form.charityDonationWants === 'yes'}>
                                <TF label="Which cause or organization?" value={form.charityDonationDetails} onChange={v => updateField('charityDonationDetails', v)} fieldKey="charityDonationDetails" onCursorChange={handleCursorChange} />
                              </FadeIn>
                            </>
                          )}

                          {section.key === 'note_to_others' && (
                            <>
                              <HelperText>This is optional. It can be addressed to whoever will be coordinating these arrangements — a family member, friend, executor, or anyone else. It will be included in your export.</HelperText>
                              <TF
                                label=""
                                ariaLabel="Note to others"
                                value={form.noteToOthers}
                                onChange={v => updateField('noteToOthers', v)}
                                rows={6}
                                fieldKey="noteToOthers"
                                onCursorChange={handleCursorChange}
                              />
                            </>
                          )}

                          {savingSectionIdx === i && (
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 6 }}>
                              <span style={{ fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif", fontSize: 12, fontWeight: 500, color: 'rgba(19,4,38,0.65)' }}>Saving…</span>
                            </div>
                          )}
                          {savedSectionIdx === i && (
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 6, opacity: savedSectionFading ? 0 : 1, transition: 'opacity 0.4s ease' }}>
                              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true" style={{ flexShrink: 0 }}>
                                <circle cx="7" cy="7" r="6" stroke="rgba(19,4,38,0.65)" strokeWidth="1.3" />
                                <path d="M4.5 7L6.2 8.8L9.5 5.5" stroke="rgba(19,4,38,0.65)" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                              </svg>
                              <span style={{ fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif", fontSize: 12, fontWeight: 500, color: 'rgba(19,4,38,0.65)' }}>Saved to Your materials</span>
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

          {/* RIGHT: panel — desktop only. Mobile uses inline trigger + SlidePanel drawer. */}
          <div className="hidden lg:block">
            <div className="lg:sticky lg:top-40 mt-12 lg:mt-0">
              <FWMaterialsPanel
                activeQuestion={activePanelQuestion}
                responseText={fwSectionResponse(form, activePanelQuestion)}
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
          <FWMaterialsPanel
            activeQuestion={drawerQuestion}
            responseText={fwSectionResponse(form, drawerQuestion)}
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
              fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif",
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
      <FuneralWishesPage />
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
      style={{ display: 'flex', alignItems: 'center', gap: 6, borderRadius: 999, padding: '10px 20px', fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif", fontSize: 14, fontWeight: 600, background: '#F8F4EB', color: '#130426', border: 'none', cursor: disabled ? 'default' : 'pointer', whiteSpace: 'nowrap', opacity: disabled ? 0.6 : 1 }}
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
// FadeIn
// ---------------------------------------------------------------------------

function FadeIn({ visible, children }: { visible: boolean; children: React.ReactNode }) {
  return (
    <div style={{
      maxHeight: visible ? '3000px' : '0',
      opacity: visible ? 1 : 0,
      overflow: 'hidden',
      transition: visible
        ? 'max-height 300ms ease, opacity 250ms ease 50ms'
        : 'opacity 200ms ease, max-height 250ms ease 50ms',
    }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16, paddingTop: 8 }}>
        {children}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Field components
// ---------------------------------------------------------------------------

function TF({
  label,
  value,
  onChange,
  placeholder,
  rows = 4,
  fieldKey,
  onCursorChange,
  ariaLabel,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
  rows?: number
  fieldKey?: StringKey
  onCursorChange?: (field: StringKey, pos: number) => void
  ariaLabel?: string
}) {
  const [active, setActive] = useState(false)
  const reactId = useId()
  const id = fieldKey ?? reactId
  return (
    <div
      className="rounded-xl p-2 -mx-2 transition-all duration-200"
      style={active ? { border: '2px solid #BBABF4', background: 'rgba(255,255,255,0.28)', boxShadow: '0 0 0 2px rgba(187,171,244,0.18)' } : { border: '2px solid transparent' }}
    >
      {label && (
        <label htmlFor={id} style={{ display: 'block', fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif", fontSize: 17, fontWeight: active ? 600 : 500, color: active ? '#130426' : '#130426', marginBottom: 10, lineHeight: 1.4, transition: 'font-weight 100ms ease' }}>
          {label}
        </label>
      )}
      <textarea
        id={id}
        aria-label={!label && ariaLabel ? ariaLabel : undefined}
        value={value}
        onChange={e => onChange(e.target.value)}
        onFocus={e => { setActive(true); fieldKey && onCursorChange?.(fieldKey, e.currentTarget.selectionStart) }}
        onBlur={() => setActive(false)}
        onSelect={e => fieldKey && onCursorChange?.(fieldKey, e.currentTarget.selectionStart)}
        onKeyUp={e => fieldKey && onCursorChange?.(fieldKey, e.currentTarget.selectionStart)}
        placeholder={placeholder}
        rows={rows}
        className="w-full bg-white text-[#130426] placeholder:text-[#130426]/65 px-4 py-3 rounded-lg focus:outline-none resize-y"
        style={{ fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif", fontSize: 14, border: '1px solid #130426' }}
      />
    </div>
  )
}

function RadioGroup({ label, value, onChange, options }: {
  label: string
  value: string
  onChange: (v: string) => void
  options: { value: string; label: string }[]
}) {
  return (
    <div>
      <p style={{ fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif", fontSize: 17, fontWeight: 500, color: '#130426', marginBottom: 12 }}>{label}</p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {options.map(opt => (
          <label key={opt.value} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, cursor: 'pointer' }}>
            <input type="radio" name={label} value={opt.value} checked={value === opt.value} onChange={() => onChange(opt.value)} style={{ marginTop: 3, accentColor: '#2C3777', flexShrink: 0 }} />
            <span style={{ fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif", fontSize: 14, color: '#130426', lineHeight: 1.5 }}>{opt.label}</span>
          </label>
        ))}
      </div>
    </div>
  )
}

function CheckboxOption({ label, checked, onChange }: { label: string; checked: boolean; onChange: () => void }) {
  return (
    <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, cursor: 'pointer' }}>
      <input type="checkbox" checked={checked} onChange={onChange} style={{ marginTop: 3, accentColor: '#2C3777', flexShrink: 0 }} />
      <span style={{ fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif", fontSize: 14, color: '#130426', lineHeight: 1.5 }}>{label}</span>
    </label>
  )
}

function RadioOption({ label, checked, onChange }: { label: string; checked: boolean; onChange: () => void }) {
  return (
    <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, cursor: 'pointer' }}>
      <input type="radio" name="disposition_type" checked={checked} onChange={onChange} style={{ marginTop: 3, accentColor: '#2C3777', flexShrink: 0 }} />
      <span style={{ fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif", fontSize: 14, color: '#130426', lineHeight: 1.5 }}>{label}</span>
    </label>
  )
}


function HelperText({ children, italic, important: imp }: { children: React.ReactNode; italic?: boolean; important?: boolean }) {
  return (
    <p style={{ fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif", fontSize: 13, color: 'rgba(19,4,38,0.72)', lineHeight: 1.65, fontStyle: italic ? 'italic' : 'normal', margin: 0 }}>
      {children}
    </p>
  )
}

// ---------------------------------------------------------------------------
// Panel tier computation
// ---------------------------------------------------------------------------

function panelNoteToNote(note: PanelNote): Note {
  return { id: note.id, content: note.content, created_at: '', updated_at: '', origin_type: (note.originType as Note['origin_type']) ?? undefined, prompt_context: note.promptContext }
}

function computePanelTiers(
  question: SupplementaryDocQuestion,
  allNotes: PanelNote[],
  outputs: OutputCard[],
  domainAndManualItems: PanelEntry[],
): { tier1: TieredItem[]; tier2: TieredItem[]; tier3: TieredItem[] } {
  const tier1: TieredItem[] = [], tier2: TieredItem[] = [], tier3: TieredItem[] = []

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
    // neverAutoSuggest blocks AMBIENT surfacing; a tag for ANY section in this document
    // is a document-level signal that surfaces the material normally here (tier by tag,
    // tier-3 where untagged). Fears has no fw_s* tag, so no signal → stays blocked.
    if (activityMeta?.neverAutoSuggest && !hasAnySupDocTag(activityMeta.supplementaryDocumentRelevance, FUNERAL_DOC_QUESTIONS)) continue
    const behavior = getWorkingOutputBehavior(activityId)
    const item: TieredItem = { kind: 'entry', data: representative, insertBehavior: behavior.insertionBehavior }
    if (relevance === 'primary') tier1.push(item)
    else if (relevance === 'secondary') tier2.push(item)
    else tier3.push(item)
  }

  const seenIds = new Set<string>(outputs.map(o => o.representative.id))
  const seenActivities = new Set<string>(outputs.map(o => o.representative.activity).filter((a): a is string => !!a))
  for (const entry of domainAndManualItems) {
    if (seenIds.has(entry.id)) continue
    if (entry.document_type === DOCUMENT_TYPE.FUNERAL_WISHES) continue
    if (entry.activity && seenActivities.has(entry.activity)) continue
    seenIds.add(entry.id)
    tier3.push({ kind: 'entry', data: entry, insertBehavior: 'selectable_then_insert' })
  }

  return { tier1, tier2, tier3 }
}

function computeRecommendedAndOther(
  question: SupplementaryDocQuestion,
  allNotes: PanelNote[],
  outputs: OutputCard[],
  domainAndManualItems: PanelEntry[],
): { recommended: TieredItem[]; other: TieredItem[] } {
  const { tier1, tier2, tier3 } = computePanelTiers(question, allNotes, outputs, domainAndManualItems)
  // Recommended = primary (tier1). Also relevant = secondary for THIS question (tier2)
  // first, then the document-signal tail (tier3) — same section, ordered by relevance.
  return { recommended: tier1, other: [...tier2, ...tier3] }
}

// ---------------------------------------------------------------------------
// FWMaterialsPanel
// ---------------------------------------------------------------------------

function useFWMaterialsData() {
  const [domainNotes, setDomainNotes] = useState<PanelNote[]>([])
  const [promptNotes, setPromptNotes] = useState<PanelNote[]>([])
  const [domainItems, setDomainItems] = useState<PanelEntry[]>([])
  const [outputItems, setOutputItems] = useState<PanelEntry[]>([])
  const [manualItems, setManualItems] = useState<PanelEntry[]>([])
  const [manualNotes, setManualNotes] = useState<PanelNote[]>([])
  const [loadingPanel, setLoadingPanel] = useState(true)

  useEffect(() => {
    async function fetchPanelData() {
      try {
        const supabase = createSupabaseBrowserClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        const { data: containers } = await supabase.from('containers').select('id, domain_code').eq('type', 'domain')
        const relevantContainerIds = (containers || []).filter(c => ['deathcare', 'legacy', 'ritual'].includes(c.domain_code ?? '')).map(c => c.id)

        if (relevantContainerIds.length > 0) {
          const { data: noteLinks } = await supabase.from('container_notes').select('note_id').in('container_id', relevantContainerIds)
          if (noteLinks && noteLinks.length > 0) {
            const noteIds = [...new Set(noteLinks.map(l => l.note_id))]
            const { data: notesData } = await supabase.from('notes').select('id, content, origin_type, prompt_context').in('id', noteIds).order('created_at', { ascending: false })
            setDomainNotes((notesData || []).map(n => ({ id: n.id, content: n.content, originType: n.origin_type ?? null, promptContext: n.prompt_context ?? null })))
          }
          const { data: entryLinks } = await supabase.from('container_entries').select('entry_id').in('container_id', relevantContainerIds)
          if (entryLinks && entryLinks.length > 0) {
            const entryIds = [...new Set(entryLinks.map(l => l.entry_id))]
            const { data: entries } = await supabase.from('entries').select('id, title, content, activity, document_type').in('id', entryIds).eq('user_id', user.id).order('created_at', { ascending: false })
            const filtered = (entries || []).filter(e => !STRUCTURED_ACTIVITIES.includes(e.activity ?? '') && e.document_type !== DOCUMENT_TYPE.FUNERAL_WISHES && !EXCLUDED_DOMAIN_DOC_TYPES.includes(e.document_type ?? ''))
            setDomainItems(filtered.map(e => ({ ...e, group: 'domain' as const })))
          }
        }

        const { data: allPromptNotesData } = await supabase.from('notes').select('id, content, origin_type, prompt_context').eq('user_id', user.id).eq('origin_type', 'prompt').not('prompt_context', 'is', null).order('created_at', { ascending: false })
        setPromptNotes((allPromptNotesData || []).map(n => ({ id: n.id, content: n.content, originType: n.origin_type ?? null, promptContext: n.prompt_context ?? null })))

        const { data: outputs } = await supabase.from('entries').select('id, title, content, activity, document_type').eq('user_id', user.id).in('activity', STRUCTURED_ACTIVITIES).order('created_at', { ascending: false })
        const reflectionByEntryId = await fetchReflectionsByEntryIds((outputs || []).map(e => e.id))
        setOutputItems((outputs || []).map(e => ({ ...e, group: 'output' as const, reflectionText: reflectionByEntryId[e.id] })))
      } catch (err) {
        console.error('FW PANEL FETCH ERROR:', err)
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
    return Array.from(byActivity.values()).map(items => ({ representative: items[0], count: items.length }))
  }, [outputItems])

  const allNotes = useMemo(() => {
    const seen = new Set<string>(); const result: PanelNote[] = []
    const manualIds = new Set(manualNotes.map(n => n.id))
    for (const n of [...promptNotes, ...domainNotes, ...manualNotes]) {
      if (seen.has(n.id)) continue
      // Auto-surfaced notes need a document-level signal (a reflect-prompt note whose
      // prompt is tagged for some fw_s section). Free-form/notepad/other notes have no
      // such signal and don't auto-surface. Manually-added notes bypass the filter.
      if (!manualIds.has(n.id) && !noteHasSupDocSignal(panelNoteToNote(n), FUNERAL_DOC_QUESTIONS)) continue
      seen.add(n.id); result.push(n)
    }
    return result
  }, [promptNotes, domainNotes, manualNotes])

  const allDomainAndManualItems = useMemo(() => {
    const seen = new Set<string>(); const result: PanelEntry[] = []
    for (const e of [...domainItems, ...manualItems]) {
      if (!seen.has(e.id)) { seen.add(e.id); result.push(e) }
    }
    return result
  }, [domainItems, manualItems])

  const existingEntryIds = useMemo(() => new Set([...domainItems, ...outputItems, ...manualItems].map(e => e.id)), [domainItems, outputItems, manualItems])
  const existingNoteIds = useMemo(() => new Set([...promptNotes, ...domainNotes, ...manualNotes].map(n => n.id)), [promptNotes, domainNotes, manualNotes])

  function addManualItem(entry: PanelEntry) {
    setManualItems(prev => prev.some(e => e.id === entry.id) ? prev : [...prev, entry])
  }
  function addManualNote(note: PanelNote) {
    setManualNotes(prev => prev.some(n => n.id === note.id) ? prev : [...prev, note])
  }

  return {
    loadingPanel,
    deduplicatedOutputs, allNotes, allDomainAndManualItems,
    existingEntryIds, existingNoteIds,
    addManualItem, addManualNote,
  }
}

type FWMaterialsData = ReturnType<typeof useFWMaterialsData>

function FWMaterialsPanel({
  activeQuestion,
  responseText,
  onInsert,
  data,
  variant = 'panel',
}: {
  activeQuestion: SupplementaryDocQuestion | null
  // Active section's combined response text; inserted-state derives from it.
  responseText: string
  onInsert: (text: string) => void
  data: FWMaterialsData
  variant?: 'panel' | 'drawer'
}) {
  const [showBrowser, setShowBrowser] = useState(false)
  const {
    loadingPanel,
    deduplicatedOutputs, allNotes, allDomainAndManualItems,
    existingEntryIds, existingNoteIds,
    addManualItem, addManualNote,
  } = data

  const { recommended, other } = useMemo(() => {
    if (activeQuestion === null) {
      const seen = new Set<string>(); const items: TieredItem[] = []
      for (const note of allNotes) {
        if (!seen.has(note.id)) { seen.add(note.id); items.push({ kind: 'note', data: note }) }
      }
      for (const { representative } of deduplicatedOutputs) {
        const meta = ACTIVITY_META_BY_ID[representative.activity ?? '']
        // Flat overview: a neverAutoSuggest material shows only with a document-level
        // signal (a tag for any fw_s* section). Fears has none here, so it stays blocked.
        if (meta?.neverAutoSuggest && !hasAnySupDocTag(meta.supplementaryDocumentRelevance, FUNERAL_DOC_QUESTIONS)) continue
        if (!seen.has(representative.id)) {
          seen.add(representative.id)
          const behavior = getWorkingOutputBehavior(representative.activity ?? '')
          items.push({ kind: 'entry', data: representative, insertBehavior: behavior.insertionBehavior })
        }
      }
      const seenActivities = new Set(deduplicatedOutputs.map(o => o.representative.activity).filter(Boolean) as string[])
      for (const entry of allDomainAndManualItems) {
        if (seen.has(entry.id) || entry.document_type === DOCUMENT_TYPE.FUNERAL_WISHES) continue
        if (entry.activity && seenActivities.has(entry.activity)) continue
        seen.add(entry.id)
        items.push({ kind: 'entry', data: entry, insertBehavior: 'selectable_then_insert' })
      }
      return { recommended: [], other: items }
    }
    return computeRecommendedAndOther(activeQuestion, allNotes, deduplicatedOutputs, allDomainAndManualItems)
  }, [activeQuestion, allNotes, deduplicatedOutputs, allDomainAndManualItems])

  const browser = showBrowser ? (
    <FWMaterialsBrowser
      existingEntryIds={existingEntryIds}
      existingNoteIds={existingNoteIds}
      onAdd={item => { if (item.kind === 'entry') addManualItem(item.data); else addManualNote(item.data) }}
      onClose={() => setShowBrowser(false)}
    />
  ) : null

  // Panel is truly empty only when neither tier has anything. Manually-added
  // materials land in `other`, so this stays false whenever the user added something.
  const isEmpty = recommended.length === 0 && other.length === 0

  const innerContent = loadingPanel ? (
    <p style={{ fontSize: 12, color: 'rgba(19,4,38,0.50)' }}>Loading...</p>
  ) : isEmpty ? (
    <MaterialsNullState />
  ) : activeQuestion === null ? (
    <FWFlatPanelContent items={other} onInsert={onInsert} />
  ) : (
    <FWPanelContent recommended={recommended} other={other} responseText={responseText} onInsert={onInsert} />
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
    <div style={{ background: '#E7E1D6', borderRadius: 16, padding: 16, border: '1px solid rgba(19,4,38,0.12)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
          <h2 style={{ fontSize: 20, lineHeight: '26px', fontWeight: 600, color: '#130426', margin: 0, whiteSpace: 'nowrap' }}>
            Relevant materials
          </h2>
          <InfoTooltip text={MATERIALS_PANEL_TOOLTIP} />
        </div>
        <button
          onClick={() => setShowBrowser(true)}
          className="shrink-0 transition-opacity hover:opacity-70"
          style={{ fontSize: 12, lineHeight: '18px', fontWeight: 500, color: '#130426', textDecoration: 'underline', textUnderlineOffset: '3px', background: 'none', border: 'none', cursor: 'pointer', padding: 0, whiteSpace: 'nowrap' }}
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
// Panel card constants
// ---------------------------------------------------------------------------

const CARD_STYLE: React.CSSProperties = { background: '#FFFFFF', borderRadius: 10, padding: '10px 12px', border: '1px solid #130426' }
const TITLE_STYLE: React.CSSProperties = { fontSize: 14, lineHeight: '20px', fontWeight: 500, color: '#130426' }
const PRIMARY_ACTION_STYLE: React.CSSProperties = { fontSize: 12, fontWeight: 500, color: '#130426', background: 'rgba(19,4,38,0.07)', padding: '3px 9px', borderRadius: 999, border: '1px solid rgba(19,4,38,0.15)', cursor: 'pointer' }
const INSERTED_LABEL_STYLE: React.CSSProperties = { fontSize: 12, lineHeight: '17px', fontWeight: 500, color: 'rgba(19,4,38,0.45)' }
const SECTION_LABEL_STYLE: React.CSSProperties = { fontSize: 14, lineHeight: '18px', fontWeight: 700, color: '#130426', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }

const FW_FLAT_SHOW_LIMIT = 10

function FWFlatPanelContent({ items, onInsert }: { items: TieredItem[]; onInsert: (text: string) => void }) {
  const [expanded, setExpanded] = useState(false)
  const visible = expanded || items.length <= FW_FLAT_SHOW_LIMIT ? items : items.slice(0, FW_FLAT_SHOW_LIMIT)

  if (items.length === 0) {
    // Defensive fallback — the panel-level isEmpty check normally intercepts first.
    return <MaterialsNullState />
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {visible.map((item) => (
        <FWTieredPanelItem key={item.data.id} item={item} responseText="" readOnly onInsert={onInsert} />
      ))}
      {items.length > FW_FLAT_SHOW_LIMIT && !expanded && (
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

function FWPanelSection({ label, isFirst, children }: { label: string; isFirst?: boolean; children: React.ReactNode }) {
  return (
    <div style={isFirst ? { marginTop: 0 } : { marginTop: 8, borderTop: '1px solid rgba(219,88,53,0.20)', paddingTop: 20 }}>
      <p style={SECTION_LABEL_STYLE}>{label}</p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>{children}</div>
    </div>
  )
}

const OTHER_SHOW_LIMIT = 10

function FWPanelContent({ recommended, other, responseText, onInsert }: {
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
      {(otherExpanded || other.length <= OTHER_SHOW_LIMIT ? other : other.slice(0, OTHER_SHOW_LIMIT)).map(item => (
        <FWTieredPanelItem key={item.data.id} item={item} responseText={responseText} onInsert={onInsert} />
      ))}
      {other.length > OTHER_SHOW_LIMIT && !otherExpanded && (
        <button onClick={() => setOtherExpanded(true)} style={{ fontSize: 12, fontWeight: 500, color: 'rgba(19,4,38,0.65)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, textDecoration: 'underline', textUnderlineOffset: 2, marginTop: 4 }}>
          Show all ({other.length})
        </button>
      )}
    </>
  )

  return (
    <div className="mt-2">
      {hasRecommended && (
        <FWPanelSection label="Most relevant" isFirst>
          {recommended.map(item => <FWTieredPanelItem key={item.data.id} item={item} responseText={responseText} onInsert={onInsert} />)}
        </FWPanelSection>
      )}
      {hasOther && (hasRecommended ? (
        // Both tiers present — the "Also relevant" subheader makes the contrast meaningful.
        <FWPanelSection label="Also relevant">
          {otherList}
        </FWPanelSection>
      ) : (
        // Only one tier — list directly under the panel header, no subheader/divider/apology.
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {otherList}
        </div>
      ))}
    </div>
  )
}

function FWTieredPanelItem({ item, responseText, readOnly, onInsert }: { item: TieredItem; responseText: string; readOnly?: boolean; onInsert: (text: string) => void }) {
  if (item.kind === 'note') return <FWNotePanelCard note={item.data} responseText={responseText} readOnly={readOnly} onInsert={onInsert} />
  const { data: entry, insertBehavior } = item
  const activityId = entry.activity ?? ''
  if (activityId === ACTIVITY.VALUES_RANKING) return <FWValuesCard entry={entry} responseText={responseText} readOnly={readOnly} onInsert={onInsert} />
  if (activityId === ACTIVITY.FEARS_RANKING) return <FWFearsCard entry={entry} responseText={responseText} readOnly={readOnly} onInsert={onInsert} />
  if (activityId === ACTIVITY.LEGACY_MAP) {
    const text = formatLegacyMapReflections(entry)
    if (!text) return null
    return <FWLegacyMapCard entry={entry} responseText={responseText} readOnly={readOnly} onInsert={onInsert} />
  }
  return <FWGenericEntryCard entry={entry} insertBehavior={insertBehavior} responseText={responseText} readOnly={readOnly} onInsert={onInsert} />
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
// Panel card components
// ---------------------------------------------------------------------------

function FWNotePanelCard({ note, responseText, readOnly, onInsert }: { note: PanelNote; responseText: string; readOnly?: boolean; onInsert: (text: string) => void }) {
  const hasPrompt = note.originType === 'prompt' && !!note.promptContext
  const inserted = isInsertedIntoResponse(responseText, note.content)
  return (
    <div style={CARD_STYLE}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6, marginBottom: readOnly ? (hasPrompt ? 4 : 0) : (hasPrompt ? 4 : 10), color: '#130426' }}>
        <div style={{ flexShrink: 0, marginTop: 2 }}><NoteIcon /></div>
        <p style={{ ...TITLE_STYLE, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' } as React.CSSProperties}>
          {note.content.trim()}
        </p>
      </div>
      {hasPrompt && (
        <p style={{ marginLeft: 22, fontSize: 12, fontStyle: 'italic', color: 'rgba(19,4,38,0.50)', marginBottom: readOnly ? 0 : 10, lineHeight: 1.4 }}>
          In response to: &ldquo;{note.promptContext}&rdquo;
        </p>
      )}
      {!readOnly && (inserted ? (
        <span style={INSERTED_LABEL_STYLE}>Inserted</span>
      ) : (
        <button onClick={() => onInsert(note.content)} style={PRIMARY_ACTION_STYLE} className="hover:brightness-95 transition-all">Insert</button>
      ))}
    </div>
  )
}

function FWValuesCard({ entry, responseText, readOnly, onInsert }: { entry: PanelEntry; responseText: string; readOnly?: boolean; onInsert: (text: string) => void }) {
  const [expanded, setExpanded] = useState(false)
  const c = entry.content as Record<string, unknown>
  const allValues = [
    ...((Array.isArray(c?.essential) ? c.essential : []) as string[]),
    ...((Array.isArray(c?.important) ? c.important : []) as string[]),
    ...((Array.isArray(c?.less_central) ? c.less_central : []) as string[]),
  ]
  return (
    <div style={CARD_STYLE}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6, marginBottom: readOnly ? 0 : 8, color: '#130426' }}>
        <div style={{ flexShrink: 0, marginTop: 2 }}><ActivityIcon slug={entry.activity ?? ''} size={16} color="#130426" /></div>
        <p style={TITLE_STYLE}>Values Ranking</p>
      </div>
      {!readOnly && (
        <>
          <button onClick={() => setExpanded(v => !v)} style={PRIMARY_ACTION_STYLE} className="hover:opacity-75 transition-opacity">
            {expanded ? 'Close' : 'Select & Insert'}
          </button>
          {expanded && (
            <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid rgba(219,88,53,0.20)' }}>
              {allValues.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {allValues.map((value, i) => {
                    // Per-item, derived from this section's response. Inserting never
                    // collapses the card; a value already present shows a badge so it
                    // can't be inserted twice (and stays independent across sections).
                    const inserted = isInsertedIntoResponse(responseText, value)
                    return (
                      <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
                        <p style={{ fontSize: 14, lineHeight: '20px', color: '#130426' }}>{value}</p>
                        {inserted ? (
                          <span style={{ ...INSERTED_LABEL_STYLE, flexShrink: 0 }}>Inserted</span>
                        ) : (
                          <button onClick={() => onInsert(value)} style={{ ...PRIMARY_ACTION_STYLE, flexShrink: 0 }} className="hover:brightness-95 transition-all">Insert</button>
                        )}
                      </div>
                    )
                  })}
                </div>
              ) : (
                <p style={{ fontSize: 13, color: 'rgba(19,4,38,0.50)' }}>No individual values found.</p>
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}

function FWFearsCard({ entry, responseText, readOnly, onInsert }: { entry: PanelEntry; responseText: string; readOnly?: boolean; onInsert: (text: string) => void }) {
  const [expanded, setExpanded] = useState(false)
  const c = entry.content as Record<string, unknown>
  const allFears = [
    ...((Array.isArray(c?.essential) ? c.essential : []) as string[]),
    ...((Array.isArray(c?.important) ? c.important : []) as string[]),
  ]
  return (
    <div style={CARD_STYLE}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6, marginBottom: readOnly ? 0 : 8, color: '#130426' }}>
        <div style={{ flexShrink: 0, marginTop: 2 }}><ActivityIcon slug={entry.activity ?? ''} size={16} color="#130426" /></div>
        <p style={TITLE_STYLE}>Fears Ranking</p>
      </div>
      {!readOnly && (
        <>
          <button onClick={() => setExpanded(v => !v)} style={PRIMARY_ACTION_STYLE} className="hover:opacity-75 transition-opacity">
            {expanded ? 'Close' : 'Select & Insert'}
          </button>
          {expanded && (
            <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid rgba(219,88,53,0.20)' }}>
              {allFears.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {allFears.map((fear, i) => {
                    const inserted = isInsertedIntoResponse(responseText, fear)
                    return (
                      <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
                        <p style={{ fontSize: 14, lineHeight: '20px', color: '#130426' }}>{fear}</p>
                        {inserted ? (
                          <span style={{ ...INSERTED_LABEL_STYLE, flexShrink: 0 }}>Inserted</span>
                        ) : (
                          <button onClick={() => onInsert(fear)} style={{ ...PRIMARY_ACTION_STYLE, flexShrink: 0 }} className="hover:brightness-95 transition-all">Insert</button>
                        )}
                      </div>
                    )
                  })}
                </div>
              ) : (
                <p style={{ fontSize: 13, color: 'rgba(19,4,38,0.50)' }}>No individual fears found.</p>
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}

function FWLegacyMapCard({ entry, responseText, readOnly, onInsert }: { entry: PanelEntry; responseText: string; readOnly?: boolean; onInsert: (text: string) => void }) {
  const reflectionText = formatLegacyMapReflections(entry)
  const inserted = isInsertedIntoResponse(responseText, reflectionText)
  return (
    <div style={CARD_STYLE}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6, marginBottom: 4, color: '#130426' }}>
        <div style={{ flexShrink: 0, marginTop: 2 }}><ActivityIcon slug={entry.activity ?? ''} size={16} color="#130426" /></div>
        <p style={TITLE_STYLE}>Legacy Map Reflections</p>
      </div>
      <p style={{ fontSize: 12, lineHeight: '18px', color: 'rgba(19,4,38,0.65)', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', marginBottom: readOnly ? 0 : 10 } as React.CSSProperties}>
        {reflectionText}
      </p>
      {!readOnly && (inserted ? (
        <span style={INSERTED_LABEL_STYLE}>Inserted</span>
      ) : (
        <button onClick={() => onInsert(reflectionText)} style={PRIMARY_ACTION_STYLE} className="hover:brightness-95 transition-all">Insert</button>
      ))}
    </div>
  )
}

function FWGenericEntryCard({ entry, insertBehavior, responseText, readOnly, onInsert }: { entry: PanelEntry; insertBehavior: 'insertable' | 'selectable_then_insert' | 'view_only'; responseText: string; readOnly?: boolean; onInsert: (text: string) => void }) {
  const title = fwGetDisplayTitle(entry)
  const insertText = fwFormatForInsert(entry)
  const inserted = isInsertedIntoResponse(responseText, insertText)
  return (
    <div style={CARD_STYLE}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6, marginBottom: readOnly ? 0 : 8, color: '#130426' }}>
        <div style={{ flexShrink: 0, marginTop: 2 }}><PanelDocIcon /></div>
        <p style={TITLE_STYLE}>{title}</p>
      </div>
      {!readOnly && insertBehavior !== 'view_only' && insertText && (
        inserted ? (
          <span style={INSERTED_LABEL_STYLE}>Inserted</span>
        ) : (
          <button onClick={() => onInsert(insertText)} style={PRIMARY_ACTION_STYLE} className="hover:brightness-95 transition-all">Insert</button>
        )
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// FWMaterialsBrowser modal
// ---------------------------------------------------------------------------

function FWMaterialsBrowser({ existingEntryIds, existingNoteIds, onAdd, onClose }: {
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
        const { data } = await supabase.from('entries').select('id, title, content, activity, document_type').eq('user_id', user.id).order('created_at', { ascending: false })
        setAllEntries((data || []).map(e => ({ ...e, group: 'manual' as const })))
        const { data: notesData } = await supabase.from('notes').select('id, content, origin_type, prompt_context').eq('user_id', user.id).order('created_at', { ascending: false })
        setAllNotes((notesData || []).map(n => ({ id: n.id, content: n.content, originType: n.origin_type ?? null, promptContext: n.prompt_context ?? null })))
      } catch (err) { console.error('FW BROWSER FETCH ERROR:', err) }
      finally { setLoadingBrowser(false) }
    }
    fetchAll()
  }, [])

  const available = allEntries.filter(e => !existingEntryIds.has(e.id) && e.document_type !== DOCUMENT_TYPE.FUNERAL_WISHES)
  const availableNotes = allNotes.filter(n => !existingNoteIds.has(n.id))

  return (
    // Backdrop click-to-close; the accessible close path is the Close button inside.
    // eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center" style={{ background: 'rgba(26,15,46,0.85)' }} onClick={onClose}>
      {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions */}
      <div className="rounded-2xl p-6 max-w-lg w-full mx-4 max-h-[70vh] flex flex-col" style={{ background: '#1A0F2E' }} onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5 shrink-0">
          <h3 className="text-[16px] font-semibold text-white">Add from My Materials</h3>
          <button onClick={onClose} className="text-sm transition-colors hover:text-white" style={{ color: 'rgba(255,255,255,0.75)' }}>Close</button>
        </div>
        <div className="overflow-y-auto flex-1">
          {loadingBrowser ? (
            <p className="text-sm" style={{ color: 'rgba(255,255,255,0.75)' }}>Loading...</p>
          ) : available.length === 0 && availableNotes.length === 0 ? (
            <p className="text-sm" style={{ color: 'rgba(255,255,255,0.75)' }}>No additional materials found.</p>
          ) : (
            <div className="space-y-2">
              {availableNotes.map(note => (
                <div key={note.id} className="flex items-start justify-between gap-3 rounded-lg p-3" style={{ background: 'rgba(255,255,255,0.06)' }}>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-medium text-white line-clamp-2 leading-snug">{note.content}</p>
                    <p className="text-[11px] mt-0.5" style={{ color: 'rgba(255,255,255,0.75)' }}>{note.originType === 'prompt' ? 'Note · Prompt response' : 'Note · Freeform'}</p>
                  </div>
                  <button onClick={() => { onAdd({ kind: 'note', data: note }); onClose() }} className="shrink-0 text-[12px] font-semibold transition-colors hover:text-white" style={{ color: 'rgba(255,255,255,0.75)' }}>Add</button>
                </div>
              ))}
              {available.map(entry => (
                <div key={entry.id} className="flex items-start justify-between gap-3 rounded-lg p-3" style={{ background: 'rgba(255,255,255,0.06)' }}>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-medium text-white truncate">{fwGetDisplayTitle(entry)}</p>
                    <p className="text-[11px] mt-0.5" style={{ color: 'rgba(255,255,255,0.75)' }}>{fwGetTypeLabel(entry)}</p>
                  </div>
                  <button onClick={() => { onAdd({ kind: 'entry', data: entry }); onClose() }} className="shrink-0 text-[12px] font-semibold transition-colors hover:text-white" style={{ color: 'rgba(255,255,255,0.75)' }}>Add</button>
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

function hasSectionProgress(key: SectionKey, form: FormState): boolean {
  if (key === 'what_matters_most') return form.whatMattersMost.trim() !== ''
  if (key === 'organ_donation') return form.organDonationWishes !== '' || form.organDonationNotes.trim() !== ''
  if (key === 'final_resting_place') return form.dispositionType !== '' || form.memorialMarker !== ''
  if (key === 'ceremony') return (
    form.ceremonyCulturalTraditions.trim() !== '' ||
    form.ceremonyOfficiant.trim() !== '' ||
    form.ceremonyGatheringAlive !== '' ||
    form.ceremonyFuneralWants !== '' ||
    form.ceremonyDoNotWant.trim() !== '' ||
    form.ceremonyOtherWishes.trim() !== ''
  )
  if (key === 'obituary') return form.obituaryWants !== '' || form.charityDonationWants !== ''
  if (key === 'note_to_others') return form.noteToOthers.trim() !== ''
  return false
}

function fwGetDisplayTitle(entry: PanelEntry): string {
  if (entry.activity === ACTIVITY.VALUES_RANKING) return 'Values Ranking'
  if (entry.activity === ACTIVITY.FEARS_RANKING) return 'Fears Ranking'
  if (entry.activity === ACTIVITY.LEGACY_MAP) return 'Legacy Map'
  if (entry.document_type === DOCUMENT_TYPE.FUNERAL_WISHES) return DOCUMENT_TYPE_META.funeral_wishes.label
  if (entry.document_type === DOCUMENT_TYPE.ADVANCE_DIRECTIVE_SUPPLEMENT) return DOCUMENT_TYPE_META.advance_directive_supplement.label
  if (entry.title?.trim()) return entry.title.trim()
  if (entry.document_type === DOCUMENT_TYPE.PERSONAL_ADMIN_INFO) return DOCUMENT_TYPE_META.personal_admin_info.label
  if (entry.document_type === DOCUMENT_TYPE.IMPORTANT_CONTACTS) return DOCUMENT_TYPE_META.important_contacts.label
  if (entry.document_type === DOCUMENT_TYPE.DEVICES_AND_ACCOUNTS) return DOCUMENT_TYPE_META.devices_and_accounts.label
  if (entry.document_type === DOCUMENT_TYPE.FINANCIAL_INFORMATION) return DOCUMENT_TYPE_META.financial_information.label
  return 'Untitled'
}

function fwGetTypeLabel(entry: PanelEntry): string {
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

function fwFormatForInsert(entry: PanelEntry): string {
  const c = entry.content
  if (!c) return ''
  if (typeof c === 'string') return c
  if (typeof c !== 'object') return ''
  const obj = c as Record<string, unknown>
  if (entry.activity === ACTIVITY.VALUES_RANKING) {
    const parts: string[] = []
    if (Array.isArray(obj.essential) && obj.essential.length) parts.push((obj.essential as string[]).join(', '))
    if (Array.isArray(obj.important) && obj.important.length) parts.push((obj.important as string[]).join(', '))
    return parts.join('\n\n')
  }
  if (entry.activity === ACTIVITY.FEARS_RANKING) {
    const parts: string[] = []
    if (Array.isArray(obj.essential) && obj.essential.length) parts.push(`Primary concerns: ${(obj.essential as string[]).join(', ')}`)
    if (Array.isArray(obj.important) && obj.important.length) parts.push(`Also worried about: ${(obj.important as string[]).join(', ')}`)
    const r = entry.reflectionText ?? (typeof obj.reflection === 'string' ? obj.reflection : '')
    if (r.trim()) parts.push(r.trim())
    return parts.join('\n\n')
  }
  const textFields = Object.values(obj).filter(v => typeof v === 'string' && (v as string).trim())
  return textFields.join('\n\n')
}
