'use client'

import { Suspense } from 'react'
import { BANNER_CLASS, BANNER_STYLE } from '@/app/components/pageBanner'
import { ACTIVITY } from '@/lib/content-metadata'
import Link from 'next/link'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Breadcrumbs from '@/app/components/navigation/Breadcrumbs'
import { createSupabaseBrowserClient } from '@/lib/supabase-browser'
import { createReflectionNote, fetchReflectionNote, updateNote, deleteNote } from '@/lib/notes'
import { holdSavingIndicator } from '@/lib/ui'
import VoiceNoteButton from '@/app/components/VoiceNoteButton'
import ErrorMessagePill from '@/app/components/ErrorMessagePill'
import AutosaveNotice from '@/app/components/AutosaveNotice'

type Bucket = 'essential' | 'important' | 'less_central'

const CARD_RENAMES: Record<string, string> = {
  'Feeling unprepared for changes to body, mind, or spirit that come with dying': 'Feeling unprepared for changes that come with dying',
}
const normalizeCard = (s: string) => CARD_RENAMES[s] ?? s

const FEARS = [
  'Being in unmanageable pain',
  'Not being able to make my own decisions',
  'Overly aggressive medical intervention',
  'Being alone',
  'Feeling confused or disoriented',
  'Being a burden on loved ones',
  'Losing my sight or hearing',
  'Not being able to communicate verbally',
  'Being dependent on others, e.g. for eating',
  'Being incontinent',
  'Feeling regret',
  'Feeling like I have unresolved conflicts',
  'Prolonged emotional/psychological suffering',
  'Feeling like financial/logistic affairs are not organized',
  'Not receiving enough attention/compassion from caregivers',
  'Feeling betrayed by my body',
  'Being negatively remembered or misunderstood after death',
  'Leaving loved ones financially strained/unprepared',
  'Losing a sense of purpose or meaning in life',
  'Having doctors disregard my wishes',
  'Feeling judged about my choices',
  'Having spiritual or existential fear',
  'Feeling embarrassed by physical changes',
  'Feeling a lack of closure in my life journey',
  'Having unresolved/unspoken truths that remain hidden',
  'Not having time to say goodbye/feeling rushed in dying',
  'Being dependent on life-support machines',
  'Not having my stories/memories documented',
  'Losing access to routines that bring comfort',
  'Being physically restrained or immobilized in a medical setting',
  "Feeling pressured into making choices I don't want",
  'Feeling emotionally abandoned',
  'Not being able to express emotions',
  'Feeling unprepared for changes that come with dying',
  'Having a diminished sense of humor or joy',
  'Losing mobility',
  'Having a slow death',
]

type Assignments = Record<Bucket, string[]>

const EMPTY: Assignments = {
  essential: [],
  important: [],
  less_central: [],
}

const ESSENTIAL_SLOTS = 5
const MIN_COL_SLOTS = 6

type MoveMode =
  | { type: 'none' }
  | { type: 'moving_existing'; value: string; from: Bucket }
  | { type: 'making_room_for_incoming'; selected?: string }

type SavedRankingContent = {
  essential?: string[]
  important?: string[]
  less_central?: string[]
  reflection?: string
  is_complete?: boolean
  sorted_count?: number
  total_count?: number
}

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error'

const hv = "'Helvetica Neue', Helvetica, Arial, sans-serif"

function getCardFontStyle(value: string): { fontSize: string | number } {
  const words = value.split(/[\s/]+/)
  const longestWord = words.reduce((a, b) => a.length > b.length ? a : b, '')
  const len = longestWord.length
  if (len <= 10) return { fontSize: 16 }
  const factor = +(92 / (len * 0.5)).toFixed(1)
  return { fontSize: `clamp(10px, ${factor}cqw, 16px)` }
}

function getFixedCardFontSize(value: string, textAreaPx: number): number {
  const words = value.split(/[\s/]+/)
  const longestWord = words.reduce((a, b) => a.length > b.length ? a : b, '')
  const len = longestWord.length
  return Math.max(10, Math.min(16, Math.floor((textAreaPx * 0.92) / (len * 0.5))))
}

function FearsRankingContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const entryIdFromUrl = searchParams.get('entry')

  const [index, setIndex] = useState(0)
  const [assignments, setAssignments] = useState<Assignments>(EMPTY)
  const [moveMode, setMoveMode] = useState<MoveMode>({ type: 'none' })
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [reflection, setReflection] = useState('')
  const [savedEntryId, setSavedEntryId] = useState<string | null>(null)
  const [loadingSavedEntry, setLoadingSavedEntry] = useState(true)
  const [isDirty, setIsDirty] = useState(false)
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle')
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null)
  const [statusNow, setStatusNow] = useState(Date.now())
  const [reflectionSaveStatus, setReflectionSaveStatus] = useState<SaveStatus>('idle')
  const [resetConfirm, setResetConfirm] = useState(false)
  const [tipsOpen, setTipsOpen] = useState(false)
  const [cardRevealed, setCardRevealed] = useState(false)
  const [deckModuleVisible, setDeckModuleVisible] = useState(true)
  const [expandedBucket, setExpandedBucket] = useState<Bucket | null>(null)
  const [pulseTrigger, setPulseTrigger] = useState<{ bucket: Bucket; tick: number } | null>(null)
  const bucketRefs = useRef<Partial<Record<Bucket, HTMLButtonElement | null>>>({})
  const countRefs = useRef<Partial<Record<Bucket, HTMLSpanElement | null>>>({})
  const [mobileMovePicker, setMobileMovePicker] = useState<string | null>(null)

  const cardSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const reflectionDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const reflectionSavedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const savedEntryIdRef = useRef<string | null>(null)
  // The reflection is a NOTE linked to this entry (not entries.content.reflection).
  const savedReflectionNoteIdRef = useRef<string | null>(null)
  const deckModuleRef = useRef<HTMLDivElement>(null)

  const current = FEARS[index] ?? null
  const sortedCount =
    assignments.essential.length +
    assignments.important.length +
    assignments.less_central.length

  const remainingCount = FEARS.length - sortedCount
  const isDone = index >= FEARS.length

  const importantSlots = Math.max(assignments.important.length + 2, MIN_COL_SLOTS)
  const lessCentralSlots = Math.max(assignments.less_central.length + 2, MIN_COL_SLOTS)

  const currentCardIsActive = moveMode.type === 'none' && cardRevealed && !!current

  useEffect(() => {
    async function loadSavedEntry() {
      const supabase = createSupabaseBrowserClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setLoadingSavedEntry(false); return }

      let data: { id: string; content: unknown; activity: string | null; created_at: string | null } | null = null

      if (entryIdFromUrl) {
        const result = await supabase
          .from('entries')
          .select('id, content, activity, created_at')
          .eq('id', entryIdFromUrl)
          .single()
        if (!result.error && result.data?.activity === ACTIVITY.FEARS_RANKING) data = result.data
      } else {
        const result = await supabase
          .from('entries')
          .select('id, content, activity, created_at')
          .eq('user_id', user.id)
          .eq('activity', ACTIVITY.FEARS_RANKING)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle()
        if (!result.error && result.data) data = result.data
      }

      if (data) {
        const content = (data.content ?? {}) as SavedRankingContent
        const essential = (Array.isArray(content.essential) ? content.essential : []).map(normalizeCard)
        const important = (Array.isArray(content.important) ? content.important : []).map(normalizeCard)
        const less_central = (Array.isArray(content.less_central) ? content.less_central : []).map(normalizeCard)
        setAssignments({ essential, important, less_central })
        setSavedEntryId(data.id)
        savedEntryIdRef.current = data.id
        // Reflection lives in a linked note — the single source of truth. Hydrate text +
        // note id so re-edits update the same row. No content fallback: if the note was
        // deleted (e.g. from the Plan grid), the textbox must clear rather than resurrect
        // stale entries.content (migration 20260619 moved all reflections into notes).
        const reflectionNote = await fetchReflectionNote(data.id)
        if (reflectionNote) {
          setReflection(reflectionNote.content)
          savedReflectionNoteIdRef.current = reflectionNote.id
        } else {
          setReflection('')
        }
        const storedSave = localStorage.getItem(`nightside.lastSaved.${user.id}.${data.id}`)
        if (storedSave) { setLastSavedAt(new Date(storedSave)); setSaveStatus('saved') }
        else if (data.created_at) { setLastSavedAt(new Date(data.created_at)); setSaveStatus('saved') }
        const restoredCount = typeof content.sorted_count === 'number'
          ? content.sorted_count
          : essential.length + important.length + less_central.length
        setIndex(restoredCount)
      }
      setLoadingSavedEntry(false)
    }
    loadSavedEntry()
  }, [entryIdFromUrl])

  useEffect(() => {
    fetch('/api/analytics/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ eventName: 'activity_opened', metadata: { activity: ACTIVITY.FEARS_RANKING } }),
    }).catch(() => {})
  }, [])

  useEffect(() => {
    if (!isDirty) return
    if (cardSaveTimerRef.current) clearTimeout(cardSaveTimerRef.current)
    cardSaveTimerRef.current = setTimeout(() => { autoSaveCardState() }, 1500)
    return () => { if (cardSaveTimerRef.current) clearTimeout(cardSaveTimerRef.current) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assignments, isDirty])

  useEffect(() => {
    if (!lastSavedAt) return
    const interval = setInterval(() => setStatusNow(Date.now()), 60000)
    return () => clearInterval(interval)
  }, [lastSavedAt])

  useEffect(() => {
    const el = deckModuleRef.current
    if (!el) return
    const observer = new IntersectionObserver(
      ([entry]) => setDeckModuleVisible(entry.isIntersecting),
      { threshold: 0 }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  async function autoSaveCardState() {
    const supabase = createSupabaseBrowserClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setSaveStatus('error'); return }

    setSaveStatus('saving')
    const currentEntryId = savedEntryIdRef.current
    const payload = {
      title: 'Fears Ranking',
      user_id: user.id,
      section: 'explore',
      activity: ACTIVITY.FEARS_RANKING,
      content: {
        essential: assignments.essential,
        important: assignments.important,
        less_central: assignments.less_central,
        is_complete: isDone,
        sorted_count: sortedCount,
        total_count: FEARS.length,
      },
    }

    try {
      if (currentEntryId) {
        const { error } = await supabase.from('entries').update(payload).eq('id', currentEntryId)
        if (error) throw error
      } else {
        const { data, error } = await supabase.from('entries').insert(payload).select('id').single()
        if (error) throw error
        setSavedEntryId(data.id)
        savedEntryIdRef.current = data.id
        fetch('/api/analytics/track', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ eventName: 'activity_contributed', metadata: { activity: ACTIVITY.FEARS_RANKING } }),
        }).catch(() => {})
      }
      setIsDirty(false)
      setSaveStatus('saved')
      const now = new Date()
      if (savedEntryIdRef.current) localStorage.setItem(`nightside.lastSaved.${user.id}.${savedEntryIdRef.current}`, now.toISOString())
      setLastSavedAt(now)
      setStatusNow(now.getTime())
    } catch {
      setSaveStatus('error')
    }
  }

  function handleReflectionChange(value: string) {
    setReflection(value)
    setReflectionSaveStatus('idle')
    if (reflectionDebounceRef.current) clearTimeout(reflectionDebounceRef.current)
    reflectionDebounceRef.current = setTimeout(() => { reflectionDebounceRef.current = null; autoSaveReflection(value) }, 1500)
  }

  async function autoSaveReflection(value: string) {
    const trimmed = value.trim()
    setReflectionSaveStatus('saving')
    const startedAt = Date.now()

    try {
      // Cleared → remove the note (if any) rather than leave a stale one.
      if (!trimmed) {
        if (savedReflectionNoteIdRef.current) {
          await deleteNote(savedReflectionNoteIdRef.current)
          savedReflectionNoteIdRef.current = null
        }
        await holdSavingIndicator(startedAt)
        setReflectionSaveStatus('idle')
        return
      }

      // The note links to the activity entry — ensure the entry exists first.
      if (!savedEntryIdRef.current) await autoSaveCardState()
      const entryId = savedEntryIdRef.current
      if (!entryId) { setReflectionSaveStatus('error'); return }

      if (savedReflectionNoteIdRef.current) {
        const ok = await updateNote(savedReflectionNoteIdRef.current, trimmed)
        if (!ok) throw new Error('updateNote failed')
      } else {
        const note = await createReflectionNote(trimmed, entryId)
        if (!note) throw new Error('createReflectionNote failed')
        savedReflectionNoteIdRef.current = note.id
      }

      await holdSavingIndicator(startedAt)
      setReflectionSaveStatus('saved')
      if (reflectionSavedTimerRef.current) clearTimeout(reflectionSavedTimerRef.current)
      reflectionSavedTimerRef.current = setTimeout(() => setReflectionSaveStatus('idle'), 3000)
    } catch {
      setReflectionSaveStatus('error')
    }
  }

  async function handleReset() {
    setResetConfirm(false)
    const entryToDelete = savedEntryIdRef.current
    setAssignments(EMPTY)
    setIndex(0)
    setCardRevealed(false)
    setReflection('')
    setIsDirty(false)
    setSavedEntryId(null)
    savedEntryIdRef.current = null
    setSaveStatus('idle')
    setLastSavedAt(null)
    if (entryToDelete) {
      const supabase = createSupabaseBrowserClient()
      await supabase.from('entries').delete().eq('id', entryToDelete)
    }
  }

  // liveInstruction kept for error/move state text only
  const liveInstruction = useMemo(() => {
    if (moveMode.type === 'moving_existing') return 'Place this card in a new slot.'
    if (moveMode.type === 'making_room_for_incoming') {
      if (!moveMode.selected) return 'Choose a card in Most pressing to move out.'
      return 'Choose a new slot for this card.'
    }
    return null
  }, [moveMode])

  function advance() {
    setIndex((prev) => prev + 1)
    setErrorMessage(null)
    setIsDirty(true)
  }

  function handleMobilePlace(bucket: Bucket) {
    if (!current || !cardRevealed) return
    if (bucket === 'essential' && assignments.essential.length >= ESSENTIAL_SLOTS) {
      setErrorMessage('Most pressing is full. Open it and move a card out first.')
      return
    }
    setAssignments((prev) => ({ ...prev, [bucket]: [...prev[bucket], current] }))
    setCardRevealed(false)
    advance()
    setPulseTrigger((prev) => ({ bucket, tick: (prev?.tick ?? 0) + 1 }))
  }

  // Bucket placement animation — Web Animations API so it restarts on every
  // placement (including consecutive taps on the same bucket, which a CSS
  // class toggle can't restart). Skips animation if prefers-reduced-motion.
  useEffect(() => {
    if (!pulseTrigger) return
    if (typeof window === 'undefined') return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const btn = bucketRefs.current[pulseTrigger.bucket]
    const ct = countRefs.current[pulseTrigger.bucket]
    btn?.animate(
      [
        { transform: 'scale(1)', filter: 'brightness(1)' },
        { transform: 'scale(1.08)', filter: 'brightness(1.12)', offset: 0.4 },
        { transform: 'scale(1)', filter: 'brightness(1)' },
      ],
      { duration: 380, easing: 'cubic-bezier(0.34, 1.56, 0.64, 1)' },
    )
    ct?.animate(
      [
        { transform: 'scale(1)' },
        { transform: 'scale(1.35)', offset: 0.4 },
        { transform: 'scale(1)' },
      ],
      { duration: 320, easing: 'ease-out' },
    )
  }, [pulseTrigger])

  function handleMobileMove(fromBucket: Bucket, value: string, toBucket: Bucket) {
    if (fromBucket === toBucket) return
    if (toBucket === 'essential' && assignments.essential.length >= ESSENTIAL_SLOTS) {
      setErrorMessage('Most pressing is full.')
      return
    }
    setAssignments((prev) => ({
      ...prev,
      [fromBucket]: prev[fromBucket].filter((v) => v !== value),
      [toBucket]: [...prev[toBucket], value],
    }))
    setMobileMovePicker(null)
    setIsDirty(true)
  }

  function removeFromBucket(bucket: Bucket, value: string, prev: Assignments) {
    return {
      ...prev,
      [bucket]: prev[bucket].filter((v) => v !== value),
    }
  }

  function handleCurrentCardClick() {
    if (moveMode.type === 'none') return
    setMoveMode({ type: 'none' })
    setErrorMessage(null)
  }

  function handleEmptySlotClick(bucket: Bucket) {
    setErrorMessage(null)

    if (moveMode.type === 'none' && !cardRevealed) return

    if (moveMode.type === 'moving_existing') {
      if (bucket === moveMode.from) {
        setErrorMessage('Choose an empty slot in a different row.')
        return
      }
      setAssignments((prev) => {
        const cleaned = removeFromBucket(moveMode.from, moveMode.value, prev)
        return { ...cleaned, [bucket]: [...cleaned[bucket], moveMode.value] }
      })
      setMoveMode({ type: 'none' })
      return
    }

    if (moveMode.type === 'making_room_for_incoming') {
      if (!moveMode.selected) {
        setErrorMessage('First choose a card in Most pressing to move out.')
        return
      }
      if (bucket === 'essential') {
        setErrorMessage('Choose an empty slot in Somewhat pressing or Less pressing.')
        return
      }
      if (!current) {
        setErrorMessage('No incoming card to place.')
        return
      }
      const evicted = moveMode.selected!
      setAssignments((prev) => ({
        essential: [...prev.essential.filter((v) => v !== evicted), current],
        important: bucket === 'important'
          ? [...prev.important, evicted]
          : prev.important.filter((v) => v !== evicted),
        less_central: bucket === 'less_central'
          ? [...prev.less_central, evicted]
          : prev.less_central.filter((v) => v !== evicted),
      }))
      setMoveMode({ type: 'none' })
      setCardRevealed(false)
      advance()
      return
    }

    if (!current) return
    if (bucket === 'essential' && assignments.essential.length >= ESSENTIAL_SLOTS) {
      setMoveMode({ type: 'making_room_for_incoming' })
      return
    }
    setAssignments((prev) => ({ ...prev, [bucket]: [...prev[bucket], current] }))
    setCardRevealed(false)
    advance()
  }

  function handleFilledCardClick(bucket: Bucket, value: string) {
    setErrorMessage(null)

    if (moveMode.type === 'making_room_for_incoming') {
      if (bucket !== 'essential') {
        setErrorMessage('Choose a card in Most pressing to move out.')
        return
      }
      setMoveMode({
        type: 'making_room_for_incoming',
        selected: moveMode.selected === value ? undefined : value,
      })
      return
    }

    if (moveMode.type === 'moving_existing') {
      if (moveMode.value === value) {
        setMoveMode({ type: 'none' })
        return
      }
      setMoveMode({ type: 'moving_existing', value, from: bucket })
      return
    }

    setMoveMode({ type: 'moving_existing', value, from: bucket })
  }

  async function handlePreviewExport() {
    const id = savedEntryIdRef.current
    if (!id) return
    if (cardSaveTimerRef.current) {
      clearTimeout(cardSaveTimerRef.current)
      cardSaveTimerRef.current = null
      await autoSaveCardState()
    }
    // Activity output: skip the snapshot, go straight to the export preview.
    router.push(`/app/entries/${id}/export`)
  }

  const saveStatusText = saveStatus === 'saving' ? 'Saving…'
    : saveStatus === 'saved' && lastSavedAt
      ? (() => {
          const diff = Math.floor((statusNow - lastSavedAt.getTime()) / 1000)
          if (diff < 60) return 'Saved just now'
          const mins = Math.floor(diff / 60)
          if (mins < 60) return `Saved ${mins}m ago`
          const hours = Math.floor(mins / 60)
          if (hours < 24) return `Saved ${hours}h ago`
          const days = Math.floor(hours / 24)
          if (days < 7) return `Saved ${days}d ago`
          return `Saved ${Math.floor(days / 7)}w ago`
        })()
      : saveStatus === 'error' ? "Couldn't save"
      : ''

  if (loadingSavedEntry) {
    return (
      <div className="min-h-screen" style={{ background: '#F8F4EB' }}>
        <div style={{ background: '#2C3777', minHeight: 180 }} />
      </div>
    )
  }

  return (
    <div className="min-h-screen" style={{ background: '#F8F4EB' }}>

      {/* Dark editorial banner */}
      <div className={`${BANNER_CLASS} md:pr-[148px] activity-banner-row`} style={{ ...BANNER_STYLE, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 24 }}>

        {/* Left: breadcrumbs + title + description + tips */}
        <div style={{ flex: 1 }}>
          <div style={{ marginBottom: 18 }}>
            <Breadcrumbs
              theme="navy"
              items={[
                { label: 'Activities', href: '/app/activities' },
                { label: 'Values & Fears Ranking', href: '/app/activities/values-and-fears' },
                { label: 'Fears Ranking' },
              ]}
            />
          </div>
          <h1 className="ns-title-activity text-white">
            Fears Ranking
          </h1>
          <p style={{ fontFamily: hv, fontSize: 16, color: 'rgba(255,255,255,0.8)', maxWidth: 560, marginBottom: 20, lineHeight: 1.55 }}>
            Fear around death can often feel vague and shapeless. But underneath it are usually specific things: pain, being alone, confusion, losing the things you love to do, not being able to afford care. Naming which of those weigh on you most is the first step toward addressing them. Once a fear is specific, you can communicate it to the people around you and build it into a plan. This helps ensure you&apos;re met with care and support exactly where you&apos;re most afraid.
          </p>
          <button
            type="button"
            onClick={() => setTipsOpen(true)}
            style={{ fontFamily: hv, fontSize: 14, color: 'rgba(255,255,255,0.82)', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline', padding: 0 }}
            onMouseEnter={(e) => { e.currentTarget.style.color = '#ffffff' }}
            onMouseLeave={(e) => { e.currentTarget.style.color = 'rgba(255,255,255,0.82)' }}
          >
            Tips for using this activity ›
          </button>
        </div>

        {/* Right: export + saved status */}
        <div className="activity-banner-aside" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8, marginTop: -4, flexShrink: 0 }}>
          {savedEntryId && (
            <button
              type="button"
              onClick={handlePreviewExport}
              className="mobile-sticky-export"
              style={{ display: 'flex', alignItems: 'center', gap: 6, borderRadius: 999, padding: '10px 20px', fontFamily: hv, fontSize: 14, fontWeight: 600, background: '#F29836', color: '#130426', border: 'none', cursor: 'pointer', whiteSpace: 'nowrap' }}
              onMouseEnter={(e) => { e.currentTarget.style.background = '#e08a25' }}
              onMouseLeave={(e) => { e.currentTarget.style.background = '#F29836' }}
            >
              <svg width="14" height="14" viewBox="0 0 13 13" fill="none" aria-hidden="true">
                <path d="M6.5 1.5v6M3.5 5.5L6.5 8.5L9.5 5.5" stroke="#130426" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M1.5 10.5h10" stroke="#130426" strokeWidth="1.4" strokeLinecap="round" />
              </svg>
              Export
            </button>
          )}
          {saveStatus === 'error' ? (
            <ErrorMessagePill variant="inline">Couldn&apos;t save</ErrorMessagePill>
          ) : saveStatusText && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <svg width="12" height="12" viewBox="0 0 14 14" fill="none" aria-hidden="true" style={{ flexShrink: 0 }}>
                <circle cx="7" cy="7" r="6" stroke="#ffffff" strokeWidth="1.3" />
                <path d="M4.5 7L6.2 8.8L9.5 5.5" stroke="#ffffff" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <span style={{ fontFamily: hv, fontSize: 11, color: '#ffffff', whiteSpace: 'nowrap' }}>{saveStatusText}</span>
            </div>
          )}
        </div>

      </div>

      {/* Blue activity workspace — desktop only */}
      <div className="hidden md:block" style={{ background: '#F8F4EB' }}>
        <div className="px-5 md:px-8" style={{ maxWidth: 1400, margin: '0 auto', paddingTop: 28, paddingBottom: 48 }}>

          {/* Deck / card module */}
          <div ref={deckModuleRef} style={{ display: 'flex', justifyContent: 'center', marginBottom: 20 }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 28 }}>

              {/* Deck + current card */}
              <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start', flexShrink: 0 }}>

                {/* Deck + count */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
                  <div style={{ position: 'relative', width: 120, height: 168, flexShrink: 0 }}>
                    {isDone ? (
                      <div style={{ position: 'absolute', inset: 0, borderRadius: 20, border: '2px solid rgba(23,3,39,0.2)', background: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <span style={{ fontFamily: hv, fontSize: 14, fontWeight: 600, letterSpacing: '-0.01em', color: '#130426' }}>Done</span>
                      </div>
                    ) : (
                      <>
                        <div style={{ position: 'absolute', left: 7, top: 6, width: 120, height: 168, borderRadius: 20, background: '#ddd8cf', border: '1.5px solid rgba(19,4,38,0.45)' }} />
                        <div style={{ position: 'absolute', left: 4, top: 3, width: 120, height: 168, borderRadius: 20, background: '#eae5dc', border: '1.5px solid rgba(19,4,38,0.45)' }} />
                        <div
                          style={{
                            position: 'absolute', inset: 0, borderRadius: 20,
                            border: '1.5px solid rgba(248,244,235,0.20)',
                            background: 'rgba(19,4,38,0.96)',
                          }}
                        />
                      </>
                    )}
                  </div>

                  {/* Count — below deck */}
                  <p style={{ fontFamily: hv, fontSize: 13, fontWeight: 500, color: 'rgba(19,4,38,0.65)', margin: 0, textAlign: 'center' }}>
                    {Math.max(remainingCount, 0)} cards left
                  </p>
                </div>

                {/* Current card slot */}
                <div style={{ width: 120, height: 168, position: 'relative', flexShrink: 0 }}>
                    {cardRevealed && current ? (
                      <button
                        type="button"
                        onClick={handleCurrentCardClick}
                        style={{
                          position: 'absolute', inset: 0, borderRadius: 20,
                          background: '#F8F4EB',
                          color: '#130426',
                          border: currentCardIsActive ? '2px solid #DB5835' : '1px solid rgba(19,4,38,0.22)',
                          boxShadow: currentCardIsActive
                            ? '0 0 18px rgba(219,88,53,0.22), 0 2px 6px rgba(0,0,0,0.05)'
                            : '0 2px 6px rgba(0,0,0,0.05)',
                          transform: currentCardIsActive ? 'translateY(-2px)' : 'none',
                          cursor: moveMode.type !== 'none' ? 'pointer' : 'default',
                          opacity: moveMode.type !== 'none' ? 0.5 : 1,
                          transition: 'opacity 200ms, box-shadow 200ms, border-color 200ms, transform 200ms',
                          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 14,
                        }}
                      >
                        <span style={{
                          maxWidth: 92, textAlign: 'center', lineHeight: 1.25,
                          fontFamily: hv, fontWeight: 500, fontSize: getFixedCardFontSize(current, 92), color: '#130426',
                        }}>
                          {current.replace(/\//g, '/​')}
                        </span>
                      </button>
                    ) : !isDone ? (
                      <button
                        type="button"
                        onClick={() => setCardRevealed(true)}
                        style={{
                          position: 'absolute', inset: 0, borderRadius: 20,
                          border: '2px solid #DB5835',
                          background: 'rgba(19,4,38,0.05)',
                          boxShadow: '0 0 18px rgba(219,88,53,0.28)',
                          transform: 'translateY(-2px)',
                          cursor: 'pointer',
                          transition: 'opacity 200ms, box-shadow 200ms, transform 200ms',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}
                      >
                        <span style={{ fontFamily: hv, fontSize: 17, fontWeight: 500, color: '#130426' }}>Draw</span>
                      </button>
                    ) : (
                      <div style={{
                        position: 'absolute', inset: 0, borderRadius: 20,
                        border: '1.5px dashed rgba(19,4,38,0.28)',
                        background: 'rgba(19,4,38,0.05)',
                      }} />
                    )}
                </div>

              </div>

              {/* Text + controls */}
              <div style={{ paddingTop: 14, minWidth: 220 }}>

                {/* Instructions */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 12 }}>
                  {[
                    'Draw a card',
                    'Click any open slot to place it',
                    'Click any placed card to move it',
                  ].map((line) => (
                    <div key={line} style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                      <span style={{ fontFamily: hv, fontSize: 16, color: 'rgba(19,4,38,0.45)', lineHeight: 1.45, flexShrink: 0 }}>•</span>
                      <span style={{ fontFamily: hv, fontSize: 16, lineHeight: 1.45, color: 'rgba(19,4,38,0.82)' }}>{line}</span>
                    </div>
                  ))}
                  {isDone && (
                    <p style={{ fontFamily: hv, fontSize: 14, lineHeight: 1.45, color: 'rgba(19,4,38,0.6)', margin: '4px 0 0' }}>
                      All cards have been placed.
                    </p>
                  )}
                </div>
                <AutosaveNotice theme="light" style={{ marginBottom: 20 }}>Your work saves automatically to Your materials.</AutosaveNotice>

                {/* Move-mode instruction */}
                {liveInstruction && (
                  <p style={{ fontFamily: hv, fontSize: 14, color: 'rgba(19,4,38,0.75)', margin: '-8px 0 16px' }}>
                    {liveInstruction}
                  </p>
                )}

                {/* Error */}
                {errorMessage && (
                  <p style={{ fontFamily: hv, fontSize: 13, color: '#C0392B', margin: '-12px 0 16px' }}>
                    {errorMessage}
                  </p>
                )}

                {/* Reset */}
                {resetConfirm ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <p style={{ fontFamily: hv, fontSize: 13, color: 'rgba(19,4,38,0.6)', margin: 0 }}>
                      This will clear your saved ranking.
                    </p>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button
                        onClick={handleReset}
                        style={{ display: 'inline-flex', alignItems: 'center', padding: '12px 20px', borderRadius: 999, border: '1px solid rgba(19,4,38,0.28)', background: 'transparent', color: '#130426', fontFamily: hv, fontWeight: 500, fontSize: 14, cursor: 'pointer' }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(19,4,38,0.05)' }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
                      >
                        Confirm reset
                      </button>
                      <button
                        onClick={() => setResetConfirm(false)}
                        style={{ display: 'inline-flex', alignItems: 'center', padding: '12px 20px', borderRadius: 999, border: '1px solid rgba(19,4,38,0.18)', background: 'transparent', color: 'rgba(19,4,38,0.55)', fontFamily: hv, fontSize: 14, cursor: 'pointer' }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(19,4,38,0.05)' }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    disabled={sortedCount === 0}
                    onClick={() => setResetConfirm(true)}
                    style={{ display: 'inline-flex', alignItems: 'center', padding: '8px 14px', borderRadius: 999, border: '1px solid rgba(19,4,38,0.28)', background: 'transparent', color: '#130426', fontFamily: hv, fontWeight: 500, fontSize: 13, cursor: sortedCount === 0 ? 'default' : 'pointer', opacity: sortedCount === 0 ? 0.35 : 1, transition: 'opacity 200ms' }}
                    onMouseEnter={(e) => { if (sortedCount > 0) e.currentTarget.style.background = 'rgba(19,4,38,0.05)' }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
                  >
                    Reset all cards
                  </button>
                )}
              </div>

            </div>
          </div>

          {/* 3-column sorting grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 20, alignItems: 'start' }}>
            <ColumnSection
              title="Most pressing"
              bucket="essential"
              values={assignments.essential}
              slotCount={ESSENTIAL_SLOTS}
              maxCards={ESSENTIAL_SLOTS}
              moveMode={moveMode}
              cardRevealed={cardRevealed}
              onEmptySlotClick={handleEmptySlotClick}
              onFilledCardClick={handleFilledCardClick}
              sectionBg="#DB5835"
              emptySlotBg="rgba(255,255,255,0.32)"
              emptySlotBorder="1.5px dashed rgba(255,255,255,0.65)"
              centeredPartialRows
            />
            <ColumnSection
              title="Somewhat pressing"
              bucket="important"
              values={assignments.important}
              slotCount={importantSlots}
              moveMode={moveMode}
              cardRevealed={cardRevealed}
              onEmptySlotClick={handleEmptySlotClick}
              onFilledCardClick={handleFilledCardClick}
              sectionBg="#F29836"
              emptySlotBg="rgba(255,255,255,0.20)"
              emptySlotBorder="1.5px dashed rgba(255,255,255,0.54)"
            />
            <ColumnSection
              title="Less pressing"
              bucket="less_central"
              values={assignments.less_central}
              slotCount={lessCentralSlots}
              moveMode={moveMode}
              cardRevealed={cardRevealed}
              onEmptySlotClick={handleEmptySlotClick}
              onFilledCardClick={handleFilledCardClick}
              sectionBg="#BBABF4"
              emptySlotBg="rgba(19,4,38,0.09)"
              emptySlotBorder="1.5px dashed rgba(19,4,38,0.22)"
            />
          </div>

          {/* Reflection */}
          <section className="mt-8 rounded-[24px] border border-[#130426] bg-[#f4efe4] px-6 py-5 text-[#130426] md:px-8 md:py-6">
            <p style={{ fontFamily: hv, fontSize: 14, lineHeight: 1.5, color: 'rgba(0,0,0,0.6)', marginBottom: 8 }}>
              Once you've placed a few cards, you might start to notice patterns.
            </p>
            <p className="text-[18px] font-semibold leading-snug tracking-[-0.01em] text-[#1A1A1A]" style={{ marginBottom: 12 }}>
              What patterns, reactions, or connections to past experiences do you notice as you look at your ranking?
            </p>
            <textarea
              value={reflection}
              onChange={(e) => handleReflectionChange(e.target.value)}
              onBlur={() => {
                if (reflectionDebounceRef.current) {
                  clearTimeout(reflectionDebounceRef.current)
                  reflectionDebounceRef.current = null
                  autoSaveReflection(reflection)
                }
              }}
              placeholder="Share your thoughts…"
              className="min-h-[120px] w-full rounded-[18px] border border-[#130426]/14 bg-white px-4 py-3.5 text-[15px] leading-relaxed text-[#130426] placeholder:text-[#130426]/65 focus:border-[#2C3777]/35 focus:outline-none"
            />
            <div style={{ fontFamily: hv, fontSize: 13, color: 'rgba(26,26,26,0.72)', marginTop: 6, minHeight: 18, display: 'flex', alignItems: 'center', gap: 6 }}>
              {reflectionSaveStatus === 'saving' && <span>Saving…</span>}
              {reflectionSaveStatus === 'saved' && (
                <>
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true" style={{ flexShrink: 0 }}>
                    <circle cx="7" cy="7" r="6" stroke="rgba(26,26,26,0.72)" strokeWidth="1.3" />
                    <path d="M4.5 7L6.2 8.8L9.5 5.5" stroke="rgba(26,26,26,0.72)" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  <span>Saved to Your materials</span>
                </>
              )}
              {reflectionSaveStatus === 'error' && <ErrorMessagePill variant="inline">Couldn&apos;t save</ErrorMessagePill>}
            </div>
            <AutosaveNotice style={{ marginBottom: 24 }} />
            <div style={{ marginTop: 8 }}>
              <VoiceNoteButton
                saveMode={{ kind: 'freeform' }}
                theme="light"
                onSaved={() => {}}
              />
            </div>
          </section>

          {/* Navigation links */}
          <div style={{ marginTop: 16 }}>
            <Link
              href="/app/activities/values-ranking"
              style={{ fontFamily: hv, fontSize: 14, color: 'rgba(19,4,38,0.78)', textDecoration: 'underline' }}
            >
              Go to Values Ranking
            </Link>
          </div>

        </div>
      </div>

      {/* Mobile-only workspace */}
      <div className="md:hidden" style={{ background: '#F8F4EB', paddingTop: 24, paddingBottom: 40 }}>
        <div className="px-5">

          {/* Disclosure copy */}
          <p style={{ fontFamily: hv, fontSize: 13, fontStyle: 'italic', color: 'rgba(19,4,38,0.65)', lineHeight: 1.5, marginBottom: 8 }}>
            To see all your placements side-by-side, open this activity on a larger screen.
          </p>
          <AutosaveNotice theme="light" style={{ fontSize: 13, marginBottom: 22 }}>Your work saves automatically to Your materials.</AutosaveNotice>

          {/* Drawn card area */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, marginBottom: 22 }}>
            {isDone ? (
              <div style={{
                width: '50%', maxWidth: 180, aspectRatio: '3 / 4', borderRadius: 18,
                border: '1.5px solid rgba(19,4,38,0.2)',
                background: 'rgba(19,4,38,0.05)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 18,
              }}>
                <span style={{ fontFamily: hv, fontSize: 16, fontWeight: 500, color: '#130426', textAlign: 'center' }}>
                  All cards placed
                </span>
              </div>
            ) : cardRevealed && current ? (
              <>
                <div style={{
                  width: '50%', maxWidth: 180, aspectRatio: '3 / 4', borderRadius: 18,
                  background: '#FFFFFF',
                  border: '2px solid #F29836',
                  boxShadow: '0 8px 24px rgba(19,4,38,0.25)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
                }}>
                  <span style={{ fontFamily: hv, fontSize: 19, fontWeight: 600, color: '#130426', textAlign: 'center', lineHeight: 1.3 }}>
                    {current.replace(/\//g, '/​')}
                  </span>
                </div>
                <p style={{ fontFamily: hv, fontSize: 13, color: 'rgba(19,4,38,0.65)', margin: 0 }}>
                  {Math.max(FEARS.length - index - 1, 0)} cards left
                </p>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => setCardRevealed(true)}
                  style={{
                    width: '50%', maxWidth: 180, aspectRatio: '3 / 4', borderRadius: 18,
                    border: '2px solid #F29836',
                    background: 'rgba(19,4,38,0.05)',
                    boxShadow: '0 4px 14px rgba(0,0,0,0.18)',
                    cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontFamily: hv, fontSize: 17, fontWeight: 500, color: '#130426',
                  }}
                >
                  Draw card
                </button>
                <p style={{ fontFamily: hv, fontSize: 13, color: 'rgba(19,4,38,0.65)', margin: 0 }}>
                  {Math.max(FEARS.length - index, 0)} cards left
                </p>
              </>
            )}
          </div>

          {/* State copy — bridge between drawn card and buckets */}
          {cardRevealed && current && !isDone && expandedBucket === null && (
            <p style={{ fontFamily: hv, fontSize: 14, fontStyle: 'italic', color: 'rgba(19,4,38,0.72)', textAlign: 'center', margin: '0 0 18px 0' }}>
              Where does this belong?
            </p>
          )}

          {/* Error */}
          {errorMessage && (
            <p style={{ fontFamily: hv, fontSize: 13, color: '#C0392B', margin: '0 0 14px', textAlign: 'center' }}>
              {errorMessage}
            </p>
          )}

          {/* Three bucket cards */}
          {expandedBucket === null && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 22 }}>
              {([
                { key: 'essential' as Bucket, label: 'Most pressing', bg: '#DB5835', count: `${assignments.essential.length}/${ESSENTIAL_SLOTS}` },
                { key: 'important' as Bucket, label: 'Somewhat pressing', bg: '#F29836', count: `${assignments.important.length}` },
                { key: 'less_central' as Bucket, label: 'Less pressing', bg: '#BBABF4', count: `${assignments.less_central.length}` },
              ]).map((b) => {
                const placeable = cardRevealed && !!current
                return (
                  <div
                    key={b.key}
                    style={{
                      flex: '1 1 30%', minWidth: 95,
                      background: b.bg,
                      borderRadius: 14,
                      overflow: 'hidden',
                      display: 'flex', flexDirection: 'column',
                      outline: placeable ? '2px dashed #F29836' : 'none',
                      outlineOffset: 3,
                      transition: 'outline-color 160ms',
                    }}
                  >
                    {/* Body — place card (when drawn) OR expand */}
                    <button
                      ref={(el) => { bucketRefs.current[b.key] = el }}
                      type="button"
                      onClick={() => {
                        if (placeable) {
                          handleMobilePlace(b.key)
                        } else {
                          setExpandedBucket(b.key)
                        }
                      }}
                      style={{
                        width: '100%',
                        background: 'none', color: b.bg === '#DB5835' ? '#F8F4EB' : '#130426',
                        border: 'none',
                        padding: '14px 10px',
                        display: 'flex', flexDirection: 'column', alignItems: 'flex-start', justifyContent: 'space-between',
                        minHeight: 95,
                        cursor: 'pointer',
                        textAlign: 'left',
                      }}
                    >
                      <span style={{ fontFamily: hv, fontSize: 14, fontWeight: 600, letterSpacing: '-0.01em', color: b.bg === '#DB5835' ? '#F8F4EB' : '#130426', lineHeight: 1.2 }}>
                        {b.label}
                      </span>
                      <span
                        ref={(el) => { countRefs.current[b.key] = el }}
                        style={{ fontFamily: hv, fontSize: 22, fontWeight: 600, color: b.bg === '#DB5835' ? '#F8F4EB' : '#130426', lineHeight: 1, display: 'inline-block', transformOrigin: 'center', marginTop: 10 }}
                      >
                        {b.count}
                      </span>
                    </button>
                    {/* Footer — view (sibling of body, not nested) */}
                    <button
                      type="button"
                      onClick={() => setExpandedBucket(b.key)}
                      style={{
                        width: '100%',
                        minHeight: 48,
                        background: 'none',
                        border: 'none',
                        borderTop: b.bg === '#DB5835' ? '1px solid rgba(248,244,235,0.25)' : '1px solid rgba(19,4,38,0.12)',
                        color: b.bg === '#DB5835' ? '#F8F4EB' : '#130426',
                        fontFamily: hv, fontSize: 13, fontWeight: 500,
                        cursor: 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                      }}
                    >
                      View
                      <svg width="10" height="6" viewBox="0 0 10 6" fill="none" aria-hidden="true">
                        <path d="M1 1L5 5L9 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </button>
                  </div>
                )
              })}
            </div>
          )}

          {/* Expanded bucket review */}
          {expandedBucket !== null && (() => {
            const labelFor: Record<Bucket, string> = {
              essential: 'Most pressing',
              important: 'Somewhat pressing',
              less_central: 'Less pressing',
            }
            const bgFor: Record<Bucket, string> = {
              essential: '#DB5835',
              important: '#F29836',
              less_central: '#BBABF4',
            }
            const bucket = expandedBucket
            const items = assignments[bucket]
            const otherBuckets: Bucket[] = (['essential', 'important', 'less_central'] as Bucket[]).filter((b) => b !== bucket)
            return (
              <div style={{ background: bgFor[bucket], borderRadius: 18, padding: 16, marginBottom: 22 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                  <span style={{ fontFamily: hv, fontSize: 16, fontWeight: 600, color: bucket === 'essential' ? '#F8F4EB' : '#130426' }}>
                    {labelFor[bucket]} · {items.length}{bucket === 'essential' ? `/${ESSENTIAL_SLOTS}` : ''}
                  </span>
                  <button
                    type="button"
                    onClick={() => { setExpandedBucket(null); setMobileMovePicker(null) }}
                    aria-label="Collapse"
                    style={{ background: 'none', border: 'none', color: bucket === 'essential' ? '#F8F4EB' : '#130426', cursor: 'pointer', width: 48, height: 48, padding: 0, margin: '-12px -12px -12px 0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  >
                    <svg width="14" height="9" viewBox="0 0 14 9" fill="none" aria-hidden="true">
                      <path d="M1 7.5L7 1.5L13 7.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </button>
                </div>
                {items.length === 0 ? (
                  <p style={{ fontFamily: hv, fontSize: 14, color: 'rgba(19,4,38,0.65)', margin: 0 }}>
                    No cards placed here yet.
                  </p>
                ) : (
                  <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {items.map((value) => (
                      <li key={value} style={{ background: '#ffffff', borderRadius: 12, padding: '12px 12px 10px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                          <span style={{ fontFamily: hv, fontSize: 14, fontWeight: 500, color: '#130426', lineHeight: 1.3, flex: 1 }}>
                            {value}
                          </span>
                          <button
                            type="button"
                            onClick={() => setMobileMovePicker(mobileMovePicker === value ? null : value)}
                            style={{ fontFamily: hv, fontSize: 12, fontWeight: 500, color: '#130426', background: 'rgba(19,4,38,0.08)', border: 'none', borderRadius: 999, padding: '6px 10px', cursor: 'pointer', whiteSpace: 'nowrap' }}
                          >
                            Move to…
                          </button>
                        </div>
                        {mobileMovePicker === value && (
                          <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                            {otherBuckets.map((target) => (
                              <button
                                key={target}
                                type="button"
                                onClick={() => handleMobileMove(bucket, value, target)}
                                style={{ fontFamily: hv, fontSize: 12, fontWeight: 500, color: '#130426', background: '#ffffff', border: '1px solid rgba(19,4,38,0.18)', borderRadius: 999, padding: '6px 12px', cursor: 'pointer' }}
                              >
                                {labelFor[target]}
                              </button>
                            ))}
                          </div>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )
          })()}

          {/* Reset button (mobile) */}
          {resetConfirm ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 22 }}>
              <p style={{ fontFamily: hv, fontSize: 13, color: 'rgba(19,4,38,0.6)', margin: 0 }}>
                This will clear your saved ranking.
              </p>
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  onClick={handleReset}
                  style={{ flex: 1, padding: '12px 16px', borderRadius: 999, border: '1px solid rgba(19,4,38,0.28)', background: 'transparent', color: '#130426', fontFamily: hv, fontWeight: 500, fontSize: 14, cursor: 'pointer' }}
                >
                  Confirm reset
                </button>
                <button
                  onClick={() => setResetConfirm(false)}
                  style={{ flex: 1, padding: '12px 16px', borderRadius: 999, border: '1px solid rgba(19,4,38,0.18)', background: 'transparent', color: 'rgba(19,4,38,0.55)', fontFamily: hv, fontSize: 14, cursor: 'pointer' }}
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              disabled={sortedCount === 0}
              onClick={() => setResetConfirm(true)}
              style={{ width: '100%', padding: '12px 16px', borderRadius: 999, border: '1px solid rgba(19,4,38,0.28)', background: 'transparent', color: '#130426', fontFamily: hv, fontWeight: 500, fontSize: 14, cursor: sortedCount === 0 ? 'default' : 'pointer', opacity: sortedCount === 0 ? 0.35 : 1, marginBottom: 22 }}
            >
              Reset all cards
            </button>
          )}

          {/* Reflection (mobile) — visible once at least one card is placed */}
          {sortedCount > 0 && (
            <section className="rounded-[24px] border border-[#130426] bg-[#f4efe4] px-5 py-5 text-[#130426]">
              <p style={{ fontFamily: hv, fontSize: 14, lineHeight: 1.5, color: 'rgba(0,0,0,0.6)', marginBottom: 8 }}>
                Once you've placed a few cards, you might start to notice patterns.
              </p>
              <p className="text-[18px] font-semibold leading-snug tracking-[-0.01em] text-[#1A1A1A]" style={{ marginBottom: 12 }}>
                What patterns, reactions, or connections to past experiences do you notice as you look at your ranking?
              </p>
              <textarea
                value={reflection}
                onChange={(e) => handleReflectionChange(e.target.value)}
                onBlur={() => {
                  if (reflectionDebounceRef.current) {
                    clearTimeout(reflectionDebounceRef.current)
                    reflectionDebounceRef.current = null
                    autoSaveReflection(reflection)
                  }
                }}
                placeholder="Share your thoughts…"
                className="min-h-[120px] w-full rounded-[18px] border border-[#130426]/14 bg-white px-4 py-3.5 text-[15px] leading-relaxed text-[#130426] placeholder:text-[#130426]/65 focus:border-[#2C3777]/35 focus:outline-none"
              />
              <div style={{ fontFamily: hv, fontSize: 13, color: 'rgba(26,26,26,0.72)', marginTop: 6, minHeight: 18, display: 'flex', alignItems: 'center', gap: 6 }}>
                {reflectionSaveStatus === 'saving' && <span>Saving…</span>}
                {reflectionSaveStatus === 'saved' && (
                  <>
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true" style={{ flexShrink: 0 }}>
                      <circle cx="7" cy="7" r="6" stroke="rgba(26,26,26,0.72)" strokeWidth="1.3" />
                      <path d="M4.5 7L6.2 8.8L9.5 5.5" stroke="rgba(26,26,26,0.72)" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    <span>Saved to Your materials</span>
                  </>
                )}
                {reflectionSaveStatus === 'error' && <ErrorMessagePill variant="inline">Couldn&apos;t save</ErrorMessagePill>}
              </div>
              <AutosaveNotice style={{ marginBottom: 24 }} />
              <div style={{ marginTop: 8 }}>
                <VoiceNoteButton
                  saveMode={{ kind: 'freeform' }}
                  theme="light"
                  onSaved={() => {}}
                />
              </div>
            </section>
          )}

          {/* Mobile nav link */}
          <div style={{ marginTop: 20 }}>
            <Link
              href="/app/activities/values-ranking"
              style={{ fontFamily: hv, fontSize: 14, color: 'rgba(19,4,38,0.78)', textDecoration: 'underline' }}
            >
              Go to Values Ranking
            </Link>
          </div>

        </div>
      </div>

      {/* Tips modal */}
      {tipsOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/55 px-4">
          <div className="w-full max-w-xl rounded-2xl p-6 shadow-2xl" style={{ background: '#F8F4EB' }}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-xl font-semibold" style={{ color: '#130426' }}>Tips for using this activity</h2>
              <button
                onClick={() => setTipsOpen(false)}
                className="transition-opacity hover:opacity-60 text-xl leading-none"
                style={{ color: '#130426' }}
              >
                ×
              </button>
            </div>
            <div style={{ fontFamily: hv }}>
              <p style={{ fontSize: 14, lineHeight: 1.5, color: 'rgba(19,4,38,0.72)', marginBottom: 12 }}>
                You can approach this in different ways. Some people move quickly and follow instinctive reactions, while others prefer to sit with each fear before placing it.
              </p>
              <p style={{ fontSize: 14, lineHeight: 1.5, color: 'rgba(19,4,38,0.72)', marginBottom: 8 }}>
                If something feels difficult to place, try asking:
              </p>
              <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 12px 0' }}>
                {[
                  'Which concern feels hardest to imagine living with?',
                  'Which fear feels most persistent or emotionally present?',
                  'What might this fear be pointing to underneath?',
                ].map((item, i, arr) => (
                  <li key={i} style={{ fontSize: 14, lineHeight: 1.5, color: 'rgba(19,4,38,0.72)', marginBottom: i < arr.length - 1 ? 8 : 0, display: 'flex', gap: 8 }}>
                    <span style={{ flexShrink: 0, color: 'rgba(19,4,38,0.35)' }}>—</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
              <p style={{ fontSize: 14, lineHeight: 1.5, color: 'rgba(19,4,38,0.72)', marginBottom: 12 }}>
                You can revisit this activity over time. Your responses may shift as your experiences, relationships, or circumstances change.
              </p>
              <p style={{ fontSize: 14, lineHeight: 1.5, color: 'rgba(19,4,38,0.72)' }}>
                This activity can also be useful to do with others. Comparing rankings may help surface differences in priorities, assumptions, or unspoken concerns.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Sticky active card — only visible once deck module scrolls out of view */}
      {cardRevealed && current && (
        <div style={{
          position: 'fixed', top: 152, right: 24, zIndex: 55,
          width: 104, height: 146, borderRadius: 18,
          background: '#F8F4EB',
          border: '2px solid #DB5835',
          boxShadow: '0 0 12px rgba(219,88,53,0.18), 0 2px 8px rgba(0,0,0,0.08)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: 12, cursor: 'default', pointerEvents: 'none',
          opacity: deckModuleVisible ? 0 : 1,
          transition: 'opacity 200ms ease',
        }}>
          <span style={{
            maxWidth: 80, textAlign: 'center', lineHeight: 1.25,
            fontFamily: hv, fontWeight: 500, fontSize: getFixedCardFontSize(current, 80), color: '#130426',
          }}>
            {current.replace(/\//g, '/​')}
          </span>
        </div>
      )}

    </div>
  )
}

function ColumnSection({
  title,
  bucket,
  values,
  slotCount,
  maxCards,
  moveMode,
  cardRevealed,
  onEmptySlotClick,
  onFilledCardClick,
  sectionBg,
  emptySlotBg,
  emptySlotBorder,
  centeredPartialRows,
}: {
  title: string
  bucket: Bucket
  values: string[]
  slotCount: number
  maxCards?: number
  moveMode: MoveMode
  cardRevealed: boolean
  onEmptySlotClick: (bucket: Bucket) => void
  onFilledCardClick: (bucket: Bucket, value: string) => void
  sectionBg: string
  emptySlotBg: string
  emptySlotBorder: string
  centeredPartialRows?: boolean
}) {
  const slots = Array.from({ length: Math.max(slotCount, values.length) })

  const isAvailableForPlacement =
    (cardRevealed && moveMode.type === 'none') ||
    (moveMode.type === 'moving_existing' && bucket !== moveMode.from) ||
    (moveMode.type === 'making_room_for_incoming' &&
      !!moveMode.selected &&
      bucket !== 'essential')

  function renderSlotAt(i: number) {
    const value = values[i]

    if (value) {
      const isSelectedForMove =
        moveMode.type === 'moving_existing' &&
        moveMode.value === value &&
        moveMode.from === bucket

      const isSelectedForEssentialSwap =
        moveMode.type === 'making_room_for_incoming' &&
        moveMode.selected === value &&
        bucket === 'essential'

      const isHighlighted = isSelectedForMove || isSelectedForEssentialSwap

      return (
        <button
          key={`${bucket}-${value}`}
          type="button"
          onClick={() => onFilledCardClick(bucket, value)}
          style={{
            width: '100%',
            maxWidth: 128,
            height: 152,
            borderRadius: 14,
            border: isHighlighted ? '2px solid #DB5835' : '1px solid rgba(19,4,38,0.10)',
            background: '#F8F4EB',
            color: '#130426',
            boxShadow: isHighlighted
              ? '0 0 18px rgba(219,88,53,0.22), 0 2px 8px rgba(0,0,0,0.06)'
              : '0 2px 8px rgba(0,0,0,0.06)',
            transform: isHighlighted ? 'translateY(-2px)' : 'none',
            padding: '10px 6px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            flexShrink: 0,
            transition: 'border-color 160ms, box-shadow 160ms, transform 160ms',
            containerType: 'inline-size',
          } as React.CSSProperties}
        >
          <span style={{
            textAlign: 'center',
            lineHeight: 1.25,
            fontFamily: hv,
            fontWeight: 500,
            ...getCardFontStyle(value),
            color: '#130426',
            width: '100%',
          }}>
            {value.replace(/\//g, '/​')}
          </span>
        </button>
      )
    }

    if (isAvailableForPlacement) {
      return (
        <button
          key={`${bucket}-empty-${i}`}
          type="button"
          onClick={() => onEmptySlotClick(bucket)}
          style={{
            width: '100%',
            maxWidth: 128,
            height: 152,
            borderRadius: 14,
            border: '2px solid #DB5835',
            boxShadow: '0 0 0 2px rgba(219,88,53,0.12)',
            background: emptySlotBg,
            flexShrink: 0,
            cursor: 'pointer',
            transition: 'border-color 160ms ease, box-shadow 160ms ease',
          }}
          aria-label={`Empty ${title} slot`}
        />
      )
    }

    return (
      <button
        key={`${bucket}-empty-${i}`}
        type="button"
        onClick={() => onEmptySlotClick(bucket)}
        style={{
          width: '100%',
          maxWidth: 128,
          height: 152,
          borderRadius: 14,
          border: emptySlotBorder,
          background: emptySlotBg,
          flexShrink: 0,
          cursor: 'default',
        }}
        aria-label={`Empty ${title} slot`}
      />
    )
  }

  const COLS = 3
  const cardGrid = centeredPartialRows ? (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, minmax(0, 1fr))', gap: 10, alignItems: 'start' }}>
      {slots.map((_, i) => {
        const row = Math.floor(i / COLS)
        const col = i % COLS
        const fullRows = Math.floor(slots.length / COLS)
        const remainder = slots.length % COLS
        const isPartialRow = row === fullRows && remainder > 0

        let gridColumn: string
        if (isPartialRow && remainder === 1) {
          gridColumn = '3 / 5'
        } else if (isPartialRow) {
          gridColumn = `${col * 2 + 2} / ${col * 2 + 4}`
        } else {
          gridColumn = `${col * 2 + 1} / ${col * 2 + 3}`
        }

        return (
          <div key={i} style={{ gridColumn, display: 'flex', justifyContent: 'center' }}>
            {renderSlotAt(i)}
          </div>
        )
      })}
    </div>
  ) : (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 10, alignItems: 'start', justifyItems: 'center', width: '100%' }}>
      {slots.map((_, i) => renderSlotAt(i))}
    </div>
  )

  return (
    <section style={{ background: sectionBg, borderRadius: 18, padding: '28px 10px 32px' }}>

      {/* Column header */}
      <div style={{ marginBottom: 18, display: 'flex', alignItems: 'baseline', gap: 10 }}>
        <h2 style={{ fontFamily: hv, fontSize: 20, fontWeight: 600, letterSpacing: '-0.02em', lineHeight: 1.2, color: sectionBg === '#DB5835' ? '#F8F4EB' : '#130426', margin: 0 }}>
          {title}
        </h2>
        {maxCards && (
          <span style={{ fontFamily: hv, fontSize: 13, fontWeight: 500, color: sectionBg === '#DB5835' ? 'rgba(248,244,235,0.85)' : 'rgba(19,4,38,0.78)', whiteSpace: 'nowrap' }}>
            Max {maxCards}
          </span>
        )}
      </div>

      {cardGrid}
    </section>
  )
}

export default function FearsRankingPage() {
  return (
    <Suspense>
      <FearsRankingContent />
    </Suspense>
  )
}
