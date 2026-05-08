'use client'

import Link from 'next/link'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Breadcrumbs from '@/app/components/navigation/Breadcrumbs'
import { createSupabaseBrowserClient } from '@/lib/supabase-browser'
import VoiceNoteButton from '@/app/components/VoiceNoteButton'

type Bucket = 'essential' | 'important' | 'less_central'

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
  'Feeling unprepared for changes to body, mind, or spirit that come with dying',
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
const MIN_OTHER_SLOTS = 8

const CARD_W = 'w-[112px]'
const CARD_H = 'h-[152px]'
const CARD_SIZE = `${CARD_W} ${CARD_H}`

const HERO_CARD_SIZE = 'w-[124px] h-[168px]'

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

export default function FearsRankingPage() {
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
  const [voiceActive, setVoiceActive] = useState(false)
  const [tipsOpen, setTipsOpen] = useState(false)

  const cardSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const reflectionDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const savedEntryIdRef = useRef<string | null>(null)

  const current = FEARS[index] ?? null
  const sortedCount =
    assignments.essential.length +
    assignments.important.length +
    assignments.less_central.length

  const remainingCount = FEARS.length - sortedCount
  const isDone = index >= FEARS.length

  const importantSlots = Math.max(assignments.important.length + 4, MIN_OTHER_SLOTS)
  const lessCentralSlots = Math.max(
    assignments.less_central.length + 4,
    MIN_OTHER_SLOTS
  )

  const currentCardIsActive = moveMode.type === 'none' && !!current

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
        if (!result.error && result.data?.activity === 'fears_ranking') data = result.data
      } else {
        const result = await supabase
          .from('entries')
          .select('id, content, activity, created_at')
          .eq('user_id', user.id)
          .eq('activity', 'fears_ranking')
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle()
        if (!result.error && result.data) data = result.data
      }

      if (data) {
        const content = (data.content ?? {}) as SavedRankingContent
        const essential = Array.isArray(content.essential) ? content.essential : []
        const important = Array.isArray(content.important) ? content.important : []
        const less_central = Array.isArray(content.less_central) ? content.less_central : []
        setAssignments({ essential, important, less_central })
        setReflection(typeof content.reflection === 'string' ? content.reflection : '')
        setSavedEntryId(data.id)
        savedEntryIdRef.current = data.id
        if (data.created_at) { setLastSavedAt(new Date(data.created_at)); setSaveStatus('saved') }
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

  async function autoSaveCardState() {
    const supabase = createSupabaseBrowserClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    setSaveStatus('saving')
    const currentEntryId = savedEntryIdRef.current
    const payload = {
      title: 'Fears Ranking',
      user_id: user.id,
      section: 'explore',
      activity: 'fears_ranking',
      content: {
        essential: assignments.essential,
        important: assignments.important,
        less_central: assignments.less_central,
        reflection: reflection.trim(),
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
      }
      setIsDirty(false)
      setSaveStatus('saved')
      const now = new Date()
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
      reflectionDebounceRef.current = setTimeout(() => autoSaveReflection(value), 1500)
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
              total_count: FEARS.length,
            },
          })
          .eq('id', currentEntryId)
        if (error) throw error
      } else {
        const { data, error } = await supabase
          .from('entries')
          .insert({
            title: 'Fears Ranking',
            user_id: user.id,
            section: 'explore',
            activity: 'fears_ranking',
            content: {
              essential: assignments.essential,
              important: assignments.important,
              less_central: assignments.less_central,
              reflection: value.trim(),
              is_complete: isDone,
              sorted_count: sortedCount,
              total_count: FEARS.length,
            },
          })
          .select('id')
          .single()
        if (error) throw error
        setSavedEntryId(data.id)
        savedEntryIdRef.current = data.id
      }
      setReflectionSaveStatus('saved')
    } catch {
      setReflectionSaveStatus('error')
    }
  }

  async function handleReset() {
    setResetConfirm(false)
    const entryToDelete = savedEntryIdRef.current
    setAssignments(EMPTY)
    setIndex(0)
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
    if (!current && moveMode.type === 'none') {
      return 'All fears have been placed.'
    }
    if (moveMode.type === 'moving_existing') {
      return 'Place this card in a new slot.'
    }
    if (moveMode.type === 'making_room_for_incoming') {
      if (!moveMode.selected) {
        return 'Choose a card in Most pressing to move out.'
      }
      return 'Choose a new slot for this card.'
    }
    return 'Select a slot below to place this card.'
  }, [moveMode, current])

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
      setAssignments((prev) => ({
        essential: [...prev.essential.filter((v) => v !== moveMode.selected), current],
        important: bucket === 'important'
          ? [...prev.important, moveMode.selected]
          : prev.important.filter((v) => v !== moveMode.selected),
        less_central: bucket === 'less_central'
          ? [...prev.less_central, moveMode.selected]
          : prev.less_central.filter((v) => v !== moveMode.selected),
      }))
      setMoveMode({ type: 'none' })
      advance()
      return
    }

    if (!current) return
    if (bucket === 'essential' && assignments.essential.length >= ESSENTIAL_SLOTS) {
      setMoveMode({ type: 'making_room_for_incoming' })
      return
    }
    setAssignments((prev) => ({ ...prev, [bucket]: [...prev[bucket], current] }))
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
    router.push(`/app/entries/${id}`)
  }

  const saveStatusText = saveStatus === 'saving' ? 'Saving…'
    : saveStatus === 'saved' && lastSavedAt
      ? (() => {
          const diff = Math.floor((statusNow - lastSavedAt.getTime()) / 1000)
          if (diff < 60) return 'Saved'
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
    <div className="min-h-screen bg-[#2f3f8f] text-white">

      {/* Midnight banner — full width */}
      <div style={{ background: '#130426', padding: '64px 148px 60px 96px', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 24 }}>

        {/* Left: breadcrumbs + title + description + pills */}
        <div style={{ flex: 1 }}>
          <div style={{ marginBottom: 24 }}>
            <Breadcrumbs
              theme="navy"
              items={[
                { label: 'Reflect', href: '/app/reflect' },
                { label: 'Values & Fears Ranking', href: '/app/reflect/values-and-fears' },
                { label: 'Fears Ranking' },
              ]}
            />
          </div>
          <h1 className="text-[34px] font-semibold leading-[0.98] tracking-[-0.03em] md:text-[42px]" style={{ color: '#ffffff', marginBottom: 0 }}>
            Fears Ranking
          </h1>
          <p style={{ fontFamily: hv, fontSize: 17, color: 'rgba(255,255,255,0.85)', maxWidth: 520, marginTop: 20, marginBottom: 0, lineHeight: 1.5 }}>
            Many fears can feel equally present in the abstract. Forced ranking helps clarify which concerns feel most pressing or emotionally charged.
          </p>
          <p style={{ fontFamily: hv, fontSize: 17, color: 'rgba(255,255,255,0.85)', maxWidth: 520, marginTop: 16, marginBottom: 0, lineHeight: 1.5 }}>
            These reactions can help clarify what matters most to you, guide planning decisions, and make it easier to communicate the kinds of care and support you would want from others.
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center', marginTop: 28 }}>
            {['Sort cards into 3 groups', 'Place up to 5 cards in Most pressing', 'To move a card: select it, then select the new slot'].map((text) => (
              <span key={text} style={{ background: 'transparent', border: '1px dashed rgba(255,255,255,0.45)', borderRadius: 20, padding: '4px 12px', fontFamily: hv, fontSize: 14, color: '#ffffff', cursor: 'default' }}>
                {text}
              </span>
            ))}
            <button
              type="button"
              onClick={() => setTipsOpen(true)}
              style={{ fontFamily: hv, fontSize: 15, color: 'rgba(255,255,255,0.75)', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'none', marginLeft: 12, padding: 0 }}
              onMouseEnter={(e) => { e.currentTarget.style.textDecoration = 'underline' }}
              onMouseLeave={(e) => { e.currentTarget.style.textDecoration = 'none' }}
            >
              More tips ›
            </button>
          </div>
        </div>

        {/* Right: export + saved status (not sticky) */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8, marginTop: -32, flexShrink: 0 }}>
          {savedEntryId && (
            <button
              type="button"
              onClick={handlePreviewExport}
              style={{ display: 'flex', alignItems: 'center', gap: 6, borderRadius: 999, padding: '10px 20px', fontFamily: hv, fontSize: 14, fontWeight: 600, background: '#F29836', color: '#130426', border: 'none', cursor: 'pointer', whiteSpace: 'nowrap' }}
              onMouseEnter={(e) => { e.currentTarget.style.background = '#e08a25' }}
              onMouseLeave={(e) => { e.currentTarget.style.background = '#F29836' }}
            >
              <svg width="14" height="14" viewBox="0 0 13 13" fill="none">
                <path d="M6.5 1.5v6M3.5 5.5L6.5 8.5L9.5 5.5" stroke="#130426" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M1.5 10.5h10" stroke="#130426" strokeWidth="1.4" strokeLinecap="round" />
              </svg>
              Export
            </button>
          )}
          {saveStatusText && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <svg width="12" height="12" viewBox="0 0 14 14" fill="none" style={{ flexShrink: 0 }}>
                <circle cx="7" cy="7" r="6" stroke="#ffffff" strokeWidth="1.3" />
                <path d="M4.5 7L6.2 8.8L9.5 5.5" stroke="#ffffff" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <span style={{ fontFamily: hv, fontSize: 11, color: '#ffffff', whiteSpace: 'nowrap' }}>{saveStatusText}</span>
            </div>
          )}
        </div>

      </div>

      {/* Tips modal */}
      {tipsOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/55 px-4">
          <div className="w-full max-w-xl rounded-2xl border border-[#f8f4eb]/10 bg-[#16120f] p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-xl font-semibold text-[#f8f4eb]">Tips for using this activity</h2>
              <button
                onClick={() => setTipsOpen(false)}
                className="text-[#f8f4eb]/60 hover:text-[#f8f4eb] transition-colors text-xl leading-none"
              >
                ×
              </button>
            </div>
            <div style={{ fontFamily: hv }}>
              <p style={{ fontSize: 14, lineHeight: 1.5, color: 'rgba(248,244,235,0.75)', marginBottom: 12 }}>
                You can approach this in different ways. Some people move quickly and follow instinctive reactions, while others prefer to sit with each fear before placing it.
              </p>
              <p style={{ fontSize: 14, lineHeight: 1.5, color: 'rgba(248,244,235,0.75)', marginBottom: 8 }}>
                If something feels difficult to place, try asking:
              </p>
              <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 12px 0' }}>
                {[
                  'Which concern feels hardest to imagine living with?',
                  'Which fear feels most persistent or emotionally present?',
                  'What might this fear be pointing to underneath?',
                ].map((item, i, arr) => (
                  <li key={i} style={{ fontSize: 14, lineHeight: 1.5, color: 'rgba(248,244,235,0.75)', marginBottom: i < arr.length - 1 ? 8 : 0, display: 'flex', gap: 8 }}>
                    <span style={{ flexShrink: 0, color: 'rgba(248,244,235,0.4)' }}>—</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
              <p style={{ fontSize: 14, lineHeight: 1.5, color: 'rgba(248,244,235,0.75)', marginBottom: 12 }}>
                You can revisit this activity over time. Your responses may shift as your experiences, relationships, or circumstances change.
              </p>
              <p style={{ fontSize: 14, lineHeight: 1.5, color: 'rgba(248,244,235,0.75)' }}>
                This activity can also be useful to do with others. Comparing rankings may help surface differences in priorities, assumptions, or unspoken concerns.
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="mx-auto max-w-[1320px] px-6 pb-14 md:px-10">

        {/* Interaction cluster — centered */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: 40 }}>

          {/* Card area */}
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'flex-start', gap: 24, marginBottom: 6 }}>
            <div className="flex flex-col items-center">
              <div className={`relative ${HERO_CARD_SIZE}`}>
                <div className={`absolute left-2 top-2 rounded-[18px] border-2 border-[#170327] bg-[#ece5f7] ${HERO_CARD_SIZE}`} />
                <div className={`absolute left-1 top-1 rounded-[18px] border-2 border-[#170327] bg-[#f3ecfb] ${HERO_CARD_SIZE}`} />
                <div className={`absolute left-0 top-0 flex items-center justify-center rounded-[18px] border-2 border-[#170327] bg-[#f8f4eb] ${HERO_CARD_SIZE}`}>
                  <span className="text-[11px] uppercase tracking-[0.14em] text-[#170327]/62">
                    Deck
                  </span>
                </div>
              </div>
              <p style={{ marginTop: 8, marginBottom: 12, fontSize: 14, color: 'rgba(255,255,255,0.7)', textAlign: 'center', fontFamily: hv }}>
                {Math.max(remainingCount, 0)} left
              </p>
            </div>

            <div className="flex flex-col items-center">
              <button
                type="button"
                onClick={handleCurrentCardClick}
                className={`rounded-[18px] border-2 p-3 text-left transition ${HERO_CARD_SIZE} ${
                  currentCardIsActive
                    ? 'border-[#f29836] bg-[#170327] text-[#f8f4eb] shadow-[0_0_0_2px_rgba(242,152,54,0.22)]'
                    : 'border-[#170327] bg-[#170327]/94 text-[#f8f4eb] hover:bg-[#170327]'
                }`}
              >
                <div className="flex h-full items-center justify-center px-2">
                  <span className="max-w-[92px] text-center text-[15px] leading-[1.2] tracking-[-0.01em]">
                    {current ?? 'Done'}
                  </span>
                </div>
              </button>
              <p style={{ marginTop: 8, marginBottom: 12, fontSize: 14, color: 'rgba(255,255,255,0.7)', textAlign: 'center', fontFamily: hv }}>
                {sortedCount} sorted
              </p>
            </div>
          </div>

          {/* Instruction text */}
          <p style={{ textAlign: 'center', fontFamily: hv, fontSize: 16, color: 'rgba(255,255,255,0.9)', marginTop: 12, marginBottom: 12 }}>
            {liveInstruction}
          </p>

          {errorMessage && (
            <p style={{ textAlign: 'center', fontFamily: hv, fontSize: 14, color: '#ffd2a6', marginBottom: 8 }}>
              {errorMessage}
            </p>
          )}

          {/* Reset button */}
          {resetConfirm ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, marginTop: 24 }}>
              <p style={{ fontFamily: hv, fontSize: 15, lineHeight: '22px', color: 'rgba(255,255,255,0.75)', margin: 0 }}>
                This will clear your saved ranking.
              </p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <button
                  onClick={handleReset}
                  style={{ background: '#F29836', color: '#130426', border: 'none', borderRadius: 999, padding: '8px 16px', fontFamily: hv, fontWeight: 600, fontSize: 14, lineHeight: '18px', cursor: 'pointer' }}
                  onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.9' }}
                  onMouseLeave={(e) => { e.currentTarget.style.opacity = '1' }}
                >
                  Reset cards
                </button>
                <button
                  onClick={() => setResetConfirm(false)}
                  style={{ background: 'transparent', color: '#FFFFFF', border: '1px solid rgba(255,255,255,0.35)', borderRadius: 999, padding: '8px 16px', fontFamily: hv, fontWeight: 500, fontSize: 14, lineHeight: '18px', cursor: 'pointer' }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.5)' }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.35)' }}
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            sortedCount > 0 && (
              <button
                type="button"
                onClick={() => setResetConfirm(true)}
                style={{ background: 'rgba(255,255,255,0.12)', border: 'none', color: '#FFFFFF', padding: '8px 14px', borderRadius: 999, fontFamily: hv, fontSize: 13, cursor: 'pointer', margin: '0 auto 24px auto' }}
                className="hover:bg-white/20 transition-colors"
              >
                Reset all cards
              </button>
            )
          )}

        </div>

        <div className="mt-3 space-y-2.5">
          <BucketSection
            title="Most pressing"
            bucket="essential"
            values={assignments.essential}
            slotCount={ESSENTIAL_SLOTS}
            moveMode={moveMode}
            onEmptySlotClick={handleEmptySlotClick}
            onFilledCardClick={handleFilledCardClick}
            sectionBg="bg-[#b8a7ea]"
            titleColor="text-[#170327]"
            cardFilled="bg-[#170327] text-[#f8f4eb] border-[#170327]"
            cardEmpty="bg-[#efe8ff] border-[#170327]/18"
            cardHighlight="border-[#f29836] bg-[#f29836] text-[#170327] shadow-[0_0_0_2px_rgba(242,152,54,0.18)]"
          />
          <BucketSection
            title="Somewhat pressing"
            bucket="important"
            values={assignments.important}
            slotCount={importantSlots}
            moveMode={moveMode}
            onEmptySlotClick={handleEmptySlotClick}
            onFilledCardClick={handleFilledCardClick}
            sectionBg="bg-[#f4efe4]"
            titleColor="text-[#170327]"
            cardFilled="bg-[#170327] text-[#f8f4eb] border-[#170327]"
            cardEmpty="bg-white border-[#170327]/16"
            cardHighlight="border-[#f29836] bg-[#f29836] text-[#170327] shadow-[0_0_0_2px_rgba(242,152,54,0.12)]"
          />
          <BucketSection
            title="Less pressing"
            bucket="less_central"
            values={assignments.less_central}
            slotCount={lessCentralSlots}
            moveMode={moveMode}
            onEmptySlotClick={handleEmptySlotClick}
            onFilledCardClick={handleFilledCardClick}
            sectionBg="bg-[#1a2d6e]"
            titleColor="text-[#f8f4eb]"
            cardFilled="bg-[#170327] text-[#f8f4eb] border-[#170327]"
            cardEmpty="bg-[#243b8a] border-[#f8f4eb]/18"
            cardHighlight="border-[#f29836] bg-[#f29836] text-[#170327] shadow-[0_0_0_2px_rgba(242,152,54,0.18)]"
          />
        </div>

        {/* Reflection */}
        <section className="mt-8 rounded-[24px] bg-[#f4efe4] px-6 py-5 text-[#170327] md:px-8 md:py-6">
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
              if (reflectionDebounceRef.current) clearTimeout(reflectionDebounceRef.current)
              if (reflection.trim()) autoSaveReflection(reflection)
            }}
            placeholder="Share your thoughts…"
            className="min-h-[120px] w-full rounded-[18px] border border-[#170327]/14 bg-white px-4 py-3.5 text-[15px] leading-relaxed text-[#170327] placeholder:text-[#170327]/38 focus:border-[#2f3f8f]/35 focus:outline-none"
          />
          <p style={{ fontFamily: hv, fontSize: 13, color: 'rgba(26,26,26,0.72)', marginTop: 6, minHeight: 18 }}>
            {reflectionSaveStatus === 'saving' ? 'Saving…'
              : reflectionSaveStatus === 'saved' ? 'Saved'
              : reflectionSaveStatus === 'error' ? "Couldn't save — check your connection"
              : ''}
          </p>
          <div style={{ marginTop: 8 }}>
            {voiceActive ? (
              <VoiceNoteButton
                saveMode={{ kind: 'freeform' }}
                theme="light"
                autoStart
                onSaved={() => {}}
                onDelete={() => setVoiceActive(false)}
                buttonLabel="Record a voice note"
              />
            ) : (
              <button
                type="button"
                onClick={() => setVoiceActive(true)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  width: '100%',
                  padding: '11px 16px',
                  borderRadius: 10,
                  cursor: 'pointer',
                  background: 'rgba(44,55,119,0.06)',
                  border: '1.5px solid rgba(44,55,119,0.2)',
                  boxSizing: 'border-box' as const,
                }}
              >
                <svg width="18" height="18" viewBox="0 0 12 16" fill="none" aria-hidden style={{ flexShrink: 0 }}>
                  <rect x="2.5" y="0.5" width="7" height="9" rx="3.5" fill="#2d3a6b" />
                  <path d="M0.5 8c0 2.76 2.24 5 5.5 5s5.5-2.24 5.5-5" stroke="#2d3a6b" strokeWidth="1.5" strokeLinecap="round" fill="none" />
                  <line x1="6" y1="13" x2="6" y2="15.5" stroke="#2d3a6b" strokeWidth="1.5" strokeLinecap="round" />
                  <line x1="3.5" y1="15.5" x2="8.5" y2="15.5" stroke="#2d3a6b" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
                <span style={{ fontFamily: hv, fontSize: 14, fontWeight: 700, color: '#2d3a6b' }}>Record a voice note</span>
                <span style={{ fontFamily: hv, fontSize: 11, fontWeight: 600, borderRadius: 100, padding: '3px 10px', background: 'rgba(44,55,119,0.12)', color: '#2d3a6b', border: '1px solid rgba(44,55,119,0.25)' }}>auto-transcribed</span>
              </button>
            )}
          </div>
        </section>

        {/* Navigation links */}
        <div style={{ marginTop: 16, display: 'flex', gap: 20 }}>
          <a
            href="/app/plan"
            style={{ fontFamily: hv, fontSize: 14, color: 'rgba(255,255,255,0.78)', textDecoration: 'underline' }}
          >
            Go to Your Plan
          </a>
          <Link
            href="/app/reflect/values-ranking"
            style={{ fontFamily: hv, fontSize: 14, color: 'rgba(255,255,255,0.78)', textDecoration: 'underline' }}
          >
            Go to Values Ranking
          </Link>
        </div>

      </div>
    </div>
  )
}

function BucketSection({
  title,
  bucket,
  values,
  slotCount,
  moveMode,
  onEmptySlotClick,
  onFilledCardClick,
  sectionBg,
  titleColor,
  cardFilled,
  cardEmpty,
  cardHighlight,
}: {
  title: string
  bucket: Bucket
  values: string[]
  slotCount: number
  moveMode: MoveMode
  onEmptySlotClick: (bucket: Bucket) => void
  onFilledCardClick: (bucket: Bucket, value: string) => void
  sectionBg: string
  titleColor: string
  cardFilled: string
  cardEmpty: string
  cardHighlight: string
}) {
  const slots = Array.from({ length: slotCount })

  return (
    <section className={`rounded-[24px] ${sectionBg} px-4 py-3 md:px-5 md:py-3.5`}>
      <div className="mb-2">
        <h2 className={`text-[20px] font-semibold leading-tight tracking-[-0.02em] ${titleColor}`}>
          {title}
        </h2>
      </div>

      <div className="grid grid-cols-4 gap-2 sm:grid-cols-5 lg:grid-cols-7 xl:grid-cols-9 2xl:grid-cols-10">
        {slots.map((_, i) => {
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

            return (
              <button
                key={`${bucket}-${value}`}
                type="button"
                onClick={() => onFilledCardClick(bucket, value)}
                className={`rounded-[18px] border-2 p-2 text-left transition ${CARD_SIZE} ${
                  isSelectedForMove || isSelectedForEssentialSwap ? cardHighlight : cardFilled
                }`}
              >
                <div className="flex h-full items-center justify-center px-1.5">
                  <span className="max-w-[92px] text-center text-[14px] leading-[1.22]">
                    {value}
                  </span>
                </div>
              </button>
            )
          }

          const highlightedEmpty =
            (moveMode.type === 'moving_existing' && bucket !== moveMode.from) ||
            (moveMode.type === 'making_room_for_incoming' &&
              !!moveMode.selected &&
              bucket !== 'essential')

          return (
            <button
              key={`${bucket}-empty-${i}`}
              type="button"
              onClick={() => onEmptySlotClick(bucket)}
              className={`rounded-[18px] border-2 border-dashed transition ${CARD_SIZE} ${
                highlightedEmpty ? cardHighlight : cardEmpty
              }`}
              aria-label={`Empty ${title} slot`}
            />
          )
        })}
      </div>
    </section>
  )
}
