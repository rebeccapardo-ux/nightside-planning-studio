'use client'

import { Suspense } from 'react'
import Link from 'next/link'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Breadcrumbs from '@/app/components/navigation/Breadcrumbs'
import { createSupabaseBrowserClient } from '@/lib/supabase-browser'
import VoiceNoteButton from '@/app/components/VoiceNoteButton'

type Bucket = 'essential' | 'important' | 'less_central'

const CARD_RENAMES: Record<string, string> = {
  'Reflecting on my life and accomplishments': 'Reflecting on my life',
}
const normalizeCard = (s: string) => CARD_RENAMES[s] ?? s

const VALUES = [
  'Being kept clean',
  'Not dying alone',
  'Maintaining dignity',
  'Preventing family conflict',
  'Having my identity respected',
  'Having a chance to say goodbye',
  'Being able to communicate verbally',
  'Not having difficulty breathing',
  'Being mentally cogent',
  'Prayer/spiritual support',
  'Not being anxious',
  'Having physical touch',
  'Being free from pain',
  'Having companionship',
  'Access to nature',
  'Having financial/logistic affairs organized',
  'Having funeral/memorial plans organized',
  'Knowing what to expect with my body',
  'Having my loved ones prepared',
  'Reflecting on my life',
  'Not burdening my loved ones',
  'Dying at home',
  'Having a care team I trust',
  'Addressing unfinished business in relationships',
  'Being able to talk about death/my fears',
  'Being able to write',
  'Feeling I have lived a complete life',
  'Living as long as possible',
  'Quality of life',
  'Independence',
  'Time with pets',
  'Birthdays and special occasions',
  'Religious/spiritual traditions',
  'Letters/objects to be given to others after my death',
  'Being able to enjoy food',
  'Time with loved ones',
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

// Column slot cards: containerType: 'inline-size' is set on the button so cqw is relative to the card's actual rendered width.
// Factor = 92 / (longestWordLen * 0.50) ensures the longest word occupies ≤92% of the card's inline size without splitting.
// For short words (≤10 chars), 16px is safe at all expected viewport widths.
function getCardFontStyle(value: string): { fontSize: string | number } {
  const words = value.split(/[\s/]+/)
  const longestWord = words.reduce((a, b) => a.length > b.length ? a : b, '')
  const len = longestWord.length
  if (len <= 10) return { fontSize: 16 }
  const factor = +(92 / (len * 0.5)).toFixed(1)
  return { fontSize: `clamp(10px, ${factor}cqw, 16px)` }
}

// Fixed-width contexts (current-card slot, sticky preview): compute a static font size given the known text area.
function getFixedCardFontSize(value: string, textAreaPx: number): number {
  const words = value.split(/[\s/]+/)
  const longestWord = words.reduce((a, b) => a.length > b.length ? a : b, '')
  const len = longestWord.length
  return Math.max(10, Math.min(16, Math.floor((textAreaPx * 0.92) / (len * 0.5))))
}

function ValuesRankingContent() {
  const searchParams = useSearchParams()
  const entryIdFromUrl = searchParams.get('entry')
  const router = useRouter()

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

  const cardSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const reflectionDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const reflectionSavedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const savedEntryIdRef = useRef<string | null>(null)
  const deckModuleRef = useRef<HTMLDivElement>(null)

  const current = VALUES[index] ?? null
  const sortedCount =
    assignments.essential.length +
    assignments.important.length +
    assignments.less_central.length

  const remainingCount = VALUES.length - sortedCount
  const isDone = index >= VALUES.length

  const importantSlots = Math.max(assignments.important.length + 2, MIN_COL_SLOTS)
  const lessCentralSlots = Math.max(assignments.less_central.length + 2, MIN_COL_SLOTS)

  const currentCardIsActive = moveMode.type === 'none' && cardRevealed && !!current

  // Load saved entry on mount — always fetch the most recent, not just by URL param
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
        if (!result.error && result.data?.activity === 'values_ranking') data = result.data
      } else {
        const result = await supabase
          .from('entries')
          .select('id, content, activity, created_at')
          .eq('user_id', user.id)
          .eq('activity', 'values_ranking')
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
        setReflection(typeof content.reflection === 'string' ? content.reflection : '')
        setSavedEntryId(data.id)
        savedEntryIdRef.current = data.id
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
      body: JSON.stringify({ eventName: 'activity_opened', metadata: { activity: 'values_ranking' } }),
    }).catch(() => {})
  }, [])

  // Autosave card state 1500ms after assignments change
  useEffect(() => {
    if (!isDirty) return
    if (cardSaveTimerRef.current) clearTimeout(cardSaveTimerRef.current)
    cardSaveTimerRef.current = setTimeout(() => { autoSaveCardState() }, 1500)
    return () => { if (cardSaveTimerRef.current) clearTimeout(cardSaveTimerRef.current) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assignments, isDirty])

  // Refresh timestamp display every 60s
  useEffect(() => {
    if (!lastSavedAt) return
    const interval = setInterval(() => setStatusNow(Date.now()), 60000)
    return () => clearInterval(interval)
  }, [lastSavedAt])

  // Track whether deck module is visible in viewport
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
    if (!user) return

    setSaveStatus('saving')
    const currentEntryId = savedEntryIdRef.current
    const payload = {
      title: 'Values Ranking',
      user_id: user.id,
      section: 'explore',
      activity: 'values_ranking',
      content: {
        essential: assignments.essential,
        important: assignments.important,
        less_central: assignments.less_central,
        reflection: reflection.trim(),
        is_complete: isDone,
        sorted_count: sortedCount,
        total_count: VALUES.length,
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
          body: JSON.stringify({ eventName: 'activity_contributed', metadata: { activity: 'values_ranking' } }),
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
    if (value.trim()) {
      reflectionDebounceRef.current = setTimeout(() => { reflectionDebounceRef.current = null; autoSaveReflection(value) }, 1500)
    }
  }

  async function autoSaveReflection(value: string) {
    const supabase = createSupabaseBrowserClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const currentEntryId = savedEntryIdRef.current
    setReflectionSaveStatus('saving')

    try {
      if (currentEntryId) {
        const { error } = await supabase
          .from('entries')
          .update({
            content: {
              essential: assignments.essential,
              important: assignments.important,
              less_central: assignments.less_central,
              reflection: value.trim(),
              is_complete: isDone,
              sorted_count: sortedCount,
              total_count: VALUES.length,
            },
          })
          .eq('id', currentEntryId)
        if (error) throw error
      } else {
        const { data, error } = await supabase
          .from('entries')
          .insert({
            title: 'Values Ranking',
            user_id: user.id,
            section: 'explore',
            activity: 'values_ranking',
            content: {
              essential: assignments.essential,
              important: assignments.important,
              less_central: assignments.less_central,
              reflection: value.trim(),
              is_complete: isDone,
              sorted_count: sortedCount,
              total_count: VALUES.length,
            },
          })
          .select('id')
          .single()
        if (error) throw error
        setSavedEntryId(data.id)
        savedEntryIdRef.current = data.id
      }
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

  const liveInstruction = useMemo(() => {
    if (isDone) return 'All values have been placed.'
    if (!cardRevealed && moveMode.type === 'none') return ''
    if (moveMode.type === 'moving_existing') return 'Place this card in a new slot.'
    if (moveMode.type === 'making_room_for_incoming') {
      if (!moveMode.selected) return 'Choose a card in Essential to move out.'
      return 'Choose a new slot for this card.'
    }
    return 'Select a column below to place this card.'
  }, [moveMode, isDone, cardRevealed])

  function advance() {
    setIndex((prev) => prev + 1)
    setErrorMessage(null)
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
        setErrorMessage('First choose a card in Essential to move out.')
        return
      }
      if (bucket === 'essential') {
        setErrorMessage('Choose an empty slot in Important or Less important.')
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
        setErrorMessage('Choose a card in Essential to move out.')
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
    router.push(`/app/entries/${id}`)
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
      : saveStatus === 'error' ? "Couldn't save — check your connection"
      : ''

  if (loadingSavedEntry) {
    return (
      <div className="mx-auto max-w-[1200px] px-6 py-8 text-[#f8f4eb]/70 md:px-10">
        Loading…
      </div>
    )
  }

  return (
    <div className="min-h-screen" style={{ background: '#2C3777' }}>

      {/* Dark editorial banner */}
      <div style={{ background: '#130426', padding: '64px 148px 60px 96px', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 24 }}>

        {/* Left: breadcrumbs + title + description + tips */}
        <div style={{ flex: 1 }}>
          <div style={{ marginBottom: 18 }}>
            <Breadcrumbs
              theme="navy"
              items={[
                { label: 'Reflect', href: '/app/reflect' },
                { label: 'Values & Fears Ranking', href: '/app/reflect/values-and-fears' },
                { label: 'Values Ranking' },
              ]}
            />
          </div>
          <h1 className="text-[34px] font-semibold leading-[0.98] tracking-[-0.03em] md:text-[42px]" style={{ color: '#ffffff', marginBottom: 16 }}>
            Values Ranking
          </h1>
          <p style={{ fontFamily: hv, fontSize: 16, color: 'rgba(255,255,255,0.8)', maxWidth: 560, marginBottom: 20, lineHeight: 1.55 }}>
            Many things can feel equally important in theory. Forced ranking helps clarify what matters most by asking you to make comparisons and notice your instinctive reactions.
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
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8, marginTop: -44, flexShrink: 0 }}>
          {savedEntryId && (
            <button
              type="button"
              onClick={handlePreviewExport}
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
          {saveStatusText && (
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

      {/* Blue activity workspace */}
      <div style={{ background: '#2C3777' }}>
        <div style={{ maxWidth: 1400, margin: '0 auto', paddingTop: 28, paddingLeft: 32, paddingRight: 32, paddingBottom: 48 }}>

          {/* Deck / card module — centered, compact */}
          <div ref={deckModuleRef} style={{ display: 'flex', justifyContent: 'center', marginBottom: 20 }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 28 }}>

              {/* Deck + current card */}
              <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start', flexShrink: 0 }}>

                {/* Deck + count */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
                <div style={{ position: 'relative', width: 120, height: 168, flexShrink: 0 }}>
                  {isDone ? (
                    <div style={{ position: 'absolute', inset: 0, borderRadius: 20, border: '2px solid rgba(23,3,39,0.2)', background: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <span style={{ fontFamily: hv, fontSize: 14, fontWeight: 600, letterSpacing: '-0.01em', color: '#170327' }}>Done</span>
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
                <p style={{ fontFamily: hv, fontSize: 13, fontWeight: 500, color: 'rgba(255,255,255,0.65)', margin: 0, textAlign: 'center' }}>
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
                        border: currentCardIsActive ? '2px solid #DB5835' : '1px solid rgba(19,4,38,0.10)',
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
                        background: 'rgba(255,255,255,0.08)',
                        boxShadow: '0 0 18px rgba(219,88,53,0.28)',
                        transform: 'translateY(-2px)',
                        cursor: 'pointer',
                        transition: 'opacity 200ms, box-shadow 200ms, transform 200ms',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}
                    >
                      <span style={{ fontFamily: hv, fontSize: 17, fontWeight: 500, color: 'rgba(248,244,235,0.85)' }}>Draw</span>
                    </button>
                  ) : (
                    <div style={{
                      position: 'absolute', inset: 0, borderRadius: 20,
                      border: '1.5px dashed rgba(255,255,255,0.45)',
                      background: 'rgba(255,255,255,0.08)',
                    }} />
                  )}
                </div>

              </div>

              {/* Text + controls */}
              <div style={{ paddingTop: 14, minWidth: 220 }}>

                {/* Instructions */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
                  {[
                    'Draw a card',
                    'Place it in the column that feels right',
                    'Click any placed card to move it',
                  ].map((line) => (
                    <div key={line} style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                      <span style={{ fontFamily: hv, fontSize: 16, color: 'rgba(255,255,255,0.45)', lineHeight: 1.45, flexShrink: 0 }}>•</span>
                      <span style={{ fontFamily: hv, fontSize: 16, lineHeight: 1.45, color: 'rgba(255,255,255,0.82)' }}>{line}</span>
                    </div>
                  ))}
                  {isDone && (
                    <p style={{ fontFamily: hv, fontSize: 14, lineHeight: 1.45, color: 'rgba(255,255,255,0.6)', margin: '4px 0 0' }}>
                      All values have been placed.
                    </p>
                  )}
                </div>

                {/* Error */}
                {errorMessage && (
                  <p style={{ fontFamily: hv, fontSize: 13, color: '#ffd2a6', margin: '-12px 0 16px' }}>
                    {errorMessage}
                  </p>
                )}

                {/* Reset */}
                {resetConfirm ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <p style={{ fontFamily: hv, fontSize: 13, color: 'rgba(255,255,255,0.6)', margin: 0 }}>
                      This will clear your saved ranking.
                    </p>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button
                        onClick={handleReset}
                        style={{ display: 'inline-flex', alignItems: 'center', padding: '12px 20px', borderRadius: 999, border: '1px solid rgba(255,255,255,0.28)', background: 'transparent', color: '#ffffff', fontFamily: hv, fontWeight: 500, fontSize: 14, cursor: 'pointer' }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.08)' }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
                      >
                        Confirm reset
                      </button>
                      <button
                        onClick={() => setResetConfirm(false)}
                        style={{ display: 'inline-flex', alignItems: 'center', padding: '12px 20px', borderRadius: 999, border: '1px solid rgba(255,255,255,0.18)', background: 'transparent', color: 'rgba(255,255,255,0.55)', fontFamily: hv, fontSize: 14, cursor: 'pointer' }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)' }}
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
                    style={{ display: 'inline-flex', alignItems: 'center', padding: '8px 14px', borderRadius: 999, border: '1px solid rgba(255,255,255,0.28)', background: 'transparent', color: '#ffffff', fontFamily: hv, fontWeight: 500, fontSize: 13, cursor: sortedCount === 0 ? 'default' : 'pointer', opacity: sortedCount === 0 ? 0.35 : 1, transition: 'opacity 200ms' }}
                    onMouseEnter={(e) => { if (sortedCount > 0) e.currentTarget.style.background = 'rgba(255,255,255,0.08)' }}
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
              title="Essential"
              bucket="essential"
              values={assignments.essential}
              slotCount={ESSENTIAL_SLOTS}
              maxCards={ESSENTIAL_SLOTS}
              moveMode={moveMode}
              cardRevealed={cardRevealed}
              onEmptySlotClick={handleEmptySlotClick}
              onFilledCardClick={handleFilledCardClick}
              sectionBg="#EE9732"
              emptySlotBg="rgba(255,255,255,0.32)"
              emptySlotBorder="1.5px dashed rgba(255,255,255,0.65)"
              centeredPartialRows
            />
            <ColumnSection
              title="Important"
              bucket="important"
              values={assignments.important}
              slotCount={importantSlots}
              moveMode={moveMode}
              cardRevealed={cardRevealed}
              onEmptySlotClick={handleEmptySlotClick}
              onFilledCardClick={handleFilledCardClick}
              sectionBg="#BBABF4"
              emptySlotBg="rgba(255,255,255,0.20)"
              emptySlotBorder="1.5px dashed rgba(255,255,255,0.54)"
            />
            <ColumnSection
              title="Less Important"
              bucket="less_central"
              values={assignments.less_central}
              slotCount={lessCentralSlots}
              moveMode={moveMode}
              cardRevealed={cardRevealed}
              onEmptySlotClick={handleEmptySlotClick}
              onFilledCardClick={handleFilledCardClick}
              sectionBg="#F8F4EB"
              emptySlotBg="rgba(19,4,38,0.09)"
              emptySlotBorder="1.5px dashed rgba(19,4,38,0.22)"
            />
          </div>

          {/* Reflection */}
          <section className="mt-8 rounded-[24px] bg-[#f4efe4] px-6 py-5 text-[#170327] md:px-8 md:py-6">
            <p style={{ fontFamily: hv, fontSize: 14, lineHeight: 1.5, color: 'rgba(0,0,0,0.6)', marginBottom: 8 }}>
              Once you've placed a few cards, you might start to notice patterns.
            </p>
            <p className="text-[18px] font-semibold leading-snug tracking-[-0.01em] text-[#1A1A1A]" style={{ marginBottom: 12 }}>
              What stands out to you about these choices?
            </p>
            <textarea
              value={reflection}
              onChange={(e) => handleReflectionChange(e.target.value)}
              onBlur={() => {
                if (reflectionDebounceRef.current) {
                  clearTimeout(reflectionDebounceRef.current)
                  reflectionDebounceRef.current = null
                  if (reflection.trim()) autoSaveReflection(reflection)
                }
              }}
              placeholder="Share your thoughts…"
              className="min-h-[120px] w-full rounded-[18px] border border-[#170327]/14 bg-white px-4 py-3.5 text-[15px] leading-relaxed text-[#170327] placeholder:text-[#170327]/38 focus:border-[#2C3777]/35 focus:outline-none"
            />
            <div style={{ fontFamily: hv, fontSize: 13, color: 'rgba(26,26,26,0.72)', marginTop: 6, minHeight: 18, display: 'flex', alignItems: 'center', gap: 6 }}>
              {reflectionSaveStatus === 'saving' && <span>Saving…</span>}
              {reflectionSaveStatus === 'saved' && (
                <>
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true" style={{ flexShrink: 0 }}>
                    <circle cx="7" cy="7" r="6" stroke="rgba(26,26,26,0.72)" strokeWidth="1.3" />
                    <path d="M4.5 7L6.2 8.8L9.5 5.5" stroke="rgba(26,26,26,0.72)" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  <span>Saved to Your Plan</span>
                </>
              )}
              {reflectionSaveStatus === 'error' && <span style={{ color: '#DB5835' }}>Couldn't save — check your connection</span>}
            </div>
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
              href="/app/reflect/fears-ranking"
              style={{ fontFamily: hv, fontSize: 14, color: 'rgba(255,255,255,0.78)', textDecoration: 'underline' }}
            >
              Go to Fears Ranking
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
                You can approach this in different ways. Some people move quickly and follow instinctive reactions, while others prefer to reflect carefully before placing each card.
              </p>
              <p style={{ fontSize: 14, lineHeight: 1.5, color: 'rgba(19,4,38,0.72)', marginBottom: 12 }}>
                The goal isn't to create a perfect hierarchy, but to notice what feels easy, difficult, surprising, or emotionally charged.
              </p>
              <p style={{ fontSize: 14, lineHeight: 1.5, color: 'rgba(19,4,38,0.72)', marginBottom: 8 }}>
                If you get stuck between two values, try asking:
              </p>
              <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 12px 0' }}>
                {[
                  'Which would matter most in a difficult or uncertain situation?',
                  'Which would feel hardest to lose?',
                  'Which most shapes how I want to live or be cared for?',
                ].map((item, i, arr) => (
                  <li key={i} style={{ fontSize: 14, lineHeight: 1.5, color: 'rgba(19,4,38,0.72)', marginBottom: i < arr.length - 1 ? 8 : 0, display: 'flex', gap: 8 }}>
                    <span style={{ flexShrink: 0, color: 'rgba(19,4,38,0.35)' }}>—</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
              <p style={{ fontSize: 14, lineHeight: 1.5, color: 'rgba(19,4,38,0.72)' }}>
                This activity can also be useful to do with a partner, family member, or friend. Comparing rankings can help surface differences in priorities, assumptions, or communication styles.
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
    // 6-column grid: each item spans 2 tracks, giving identical cell widths to a 3-col grid.
    // Partial last row is centered by offsetting start columns by 1 track.
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
        <h2 style={{ fontFamily: hv, fontSize: 20, fontWeight: 600, letterSpacing: '-0.02em', lineHeight: 1.2, color: '#170327', margin: 0 }}>
          {title}
        </h2>
        {maxCards && (
          <span style={{ fontFamily: hv, fontSize: 13, fontWeight: 500, color: 'rgba(19,4,38,0.78)', whiteSpace: 'nowrap' }}>
            Max {maxCards}
          </span>
        )}
      </div>

      {cardGrid}
    </section>
  )
}

export default function ValuesRankingPage() {
  return (
    <Suspense>
      <ValuesRankingContent />
    </Suspense>
  )
}
