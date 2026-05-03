'use client'

import Link from 'next/link'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'next/navigation'
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

const CARD_W = 'w-[100px]'
const CARD_H = 'h-[136px]'
const CARD_SIZE = `${CARD_W} ${CARD_H}`

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

  const cardSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const reflectionDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  // Ref so autosave closures always see the latest savedEntryId
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

  // Load saved entry on mount — always fetch the most recent, not just by URL param
  useEffect(() => {
    async function loadSavedEntry() {
      const supabase = createSupabaseBrowserClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setLoadingSavedEntry(false); return }

      let data: { id: string; content: unknown; activity: string | null } | null = null

      if (entryIdFromUrl) {
        const result = await supabase
          .from('entries')
          .select('id, content, activity')
          .eq('id', entryIdFromUrl)
          .single()
        if (!result.error && result.data?.activity === 'fears_ranking') data = result.data
      } else {
        const result = await supabase
          .from('entries')
          .select('id, content, activity')
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
        const restoredCount = typeof content.sorted_count === 'number'
          ? content.sorted_count
          : essential.length + important.length + less_central.length
        setIndex(restoredCount)
      }
      setLoadingSavedEntry(false)
    }
    loadSavedEntry()
  }, [entryIdFromUrl])

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
        return 'Choose a card in Essential to move out.'
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

  const saveStatusText = saveStatus === 'saving' ? 'Saving…'
    : saveStatus === 'saved' && lastSavedAt
      ? (() => {
          const diff = Math.floor((statusNow - lastSavedAt.getTime()) / 1000)
          return diff < 60 ? 'Last saved just now' : `Last saved ${Math.floor(diff / 60)} min ago`
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
      <div className="mx-auto max-w-[1320px] px-6 pb-14 pt-5 md:px-10">

        {/* Header with save status */}
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
          <section className="max-w-4xl">
            <h1 className="text-[34px] font-semibold leading-[0.98] tracking-[-0.03em] md:text-[42px]">
              Fears Ranking
            </h1>
            <p className="mt-2 max-w-[520px] text-[16px] leading-[1.4] text-white/86 md:text-[17px]">
              Clarify what you most want to avoid, so your wishes are easier to communicate.
            </p>
          </section>
          {saveStatusText ? (
            <p style={{ fontFamily: hv, fontSize: 13, color: 'rgba(255,255,255,0.78)', paddingTop: 6 }}>
              {saveStatusText}
            </p>
          ) : null}
        </div>

        <section className="mt-5 grid items-start gap-x-16 gap-y-0 lg:grid-cols-[500px_560px]">
          <div className="flex flex-col items-center pt-6 lg:items-center">
            <div className="flex items-start justify-center gap-4">
              <div className="flex flex-col items-center">
                <div className={`relative ${CARD_SIZE}`}>
                  <div className={`absolute left-2 top-2 rounded-[18px] border-2 border-[#170327] bg-[#ece5f7] ${CARD_SIZE}`} />
                  <div className={`absolute left-1 top-1 rounded-[18px] border-2 border-[#170327] bg-[#f3ecfb] ${CARD_SIZE}`} />
                  <div className={`absolute left-0 top-0 flex items-center justify-center rounded-[18px] border-2 border-[#170327] bg-[#f8f4eb] ${CARD_SIZE}`}>
                    <span className="text-[11px] uppercase tracking-[0.14em] text-[#170327]/62">
                      Deck
                    </span>
                  </div>
                </div>
                <p className="mt-2 text-[13px] text-[#f8f4eb]/72">
                  {Math.max(remainingCount, 0)} left
                </p>
              </div>

              <div className="flex flex-col items-center">
                <button
                  type="button"
                  onClick={handleCurrentCardClick}
                  className={`rounded-[18px] border-2 p-3 text-left transition ${CARD_SIZE} ${
                    currentCardIsActive
                      ? 'border-[#f29836] bg-[#170327] text-[#f8f4eb] shadow-[0_0_0_2px_rgba(242,152,54,0.22)]'
                      : 'border-[#170327] bg-[#170327]/94 text-[#f8f4eb] hover:bg-[#170327]'
                  }`}
                >
                  <div className="flex h-full items-center justify-center px-2">
                    <span className="max-w-[84px] text-center text-[16px] leading-[1.28] tracking-[-0.01em]">
                      {current ?? 'Done'}
                    </span>
                  </div>
                </button>
                <p className="mt-2 text-[13px] text-[#f8f4eb]/72">
                  {sortedCount} sorted
                </p>
              </div>
            </div>

            <div className="mt-6 flex min-h-[48px] flex-wrap items-center justify-center gap-3">
              <p className="text-[16px] font-medium leading-[1.3] text-[#f8f4eb] md:text-[17px]">
                {liveInstruction}
              </p>
            </div>

            {errorMessage && (
              <p className="mt-2.5 text-[14px] leading-relaxed text-[#ffd2a6]">
                {errorMessage}
              </p>
            )}
          </div>

          <div className="max-w-[560px] pt-4">
            <div className="rounded-[20px] border border-[#f29836]/70 px-5 py-4">
              <h2 className="text-[20px] font-semibold leading-none tracking-[-0.02em] text-[#f8f4eb] md:text-[22px]">
                How it works
              </h2>
              <div className="mt-3 space-y-2 text-[14px] leading-[1.34] text-[#f8f4eb]/92 md:text-[15px]">
                <p>You'll sort cards into three groups: Essential, Important, and Less important.</p>
                <p>Only 5 cards can be placed in Essential. If Essential is full, you'll choose one to move out before adding a new one.</p>
                <p>You can move cards at any time — nothing is locked in. To move a card from its slot, select the card you want to move, then select the new slot you want to move it to.</p>
              </div>
            </div>
          </div>
        </section>

        {/* Reset ranking affordance */}
        {sortedCount > 0 && (
          <div style={{ textAlign: 'right', marginTop: 12, marginBottom: 4 }}>
            {resetConfirm ? (
              <span style={{ fontFamily: hv, fontSize: 13, color: 'rgba(255,255,255,0.78)' }}>
                This will clear your saved ranking.{' '}
                <button
                  onClick={handleReset}
                  style={{ fontFamily: hv, fontSize: 13, color: 'rgba(255,255,255,0.88)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, textDecoration: 'underline' }}
                >
                  Reset
                </button>
                {' '}
                <button
                  onClick={() => setResetConfirm(false)}
                  style={{ fontFamily: hv, fontSize: 13, color: 'rgba(255,255,255,0.56)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                >
                  Cancel
                </button>
              </span>
            ) : (
              <button
                onClick={() => setResetConfirm(true)}
                style={{ fontFamily: hv, fontSize: 13, color: 'rgba(255,255,255,0.56)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                className="hover:opacity-80 transition-opacity"
              >
                Reset ranking
              </button>
            )}
          </div>
        )}

        <div className="mt-3 space-y-2.5">
          <BucketSection
            title="Essential"
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
            title="Important"
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
            title="Less important"
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

        {/* Reflection textarea */}
        <section className="mt-4 rounded-[24px] bg-[#f4efe4] px-6 py-5 text-[#170327] md:px-8 md:py-6">
          <label className="block text-[11px] uppercase tracking-[0.16em] text-[#170327]/62">
            Optional note
          </label>
          <textarea
            value={reflection}
            onChange={(e) => handleReflectionChange(e.target.value)}
            onBlur={() => {
              if (reflectionDebounceRef.current) clearTimeout(reflectionDebounceRef.current)
              if (reflection.trim()) autoSaveReflection(reflection)
            }}
            placeholder="What stands out to you about these choices?"
            className="mt-3 min-h-[140px] w-full rounded-[18px] border border-[#170327]/14 bg-white px-4 py-3.5 text-[15px] leading-relaxed text-[#170327] placeholder:text-[#170327]/38 focus:border-[#2f3f8f]/35 focus:outline-none"
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
                style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontSize: 13, fontFamily: hv, color: 'rgba(26,26,26,0.72)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
              >
                <svg width="11" height="15" viewBox="0 0 12 16" fill="none" aria-hidden>
                  <rect x="2.5" y="0.5" width="7" height="9" rx="3.5" fill="currentColor" />
                  <path d="M0.5 8c0 2.76 2.24 5 5.5 5s5.5-2.24 5.5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" fill="none" />
                  <line x1="6" y1="13" x2="6" y2="15.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                  <line x1="3.5" y1="15.5" x2="8.5" y2="15.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
                Record a voice note
              </button>
            )}
          </div>
        </section>

        {/* Navigation links — outside the reflection box */}
        <div style={{ marginTop: 16, display: 'flex', gap: 20 }}>
          <a
            href="/app/materials"
            style={{ fontFamily: hv, fontSize: 14, color: 'rgba(255,255,255,0.78)', textDecoration: 'underline' }}
          >
            Go to Your Plan
          </a>
          <Link
            href="/app/explore/values-ranking"
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
                  <span className="max-w-[84px] text-center text-[13px] leading-[1.22]">
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
