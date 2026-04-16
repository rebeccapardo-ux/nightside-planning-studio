'use client'

import Link from 'next/link'
import { KeyboardEvent, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { createSupabaseBrowserClient } from '@/lib/supabase-browser'

type Bucket = 'essential' | 'important' | 'less_central'

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
  'Reflecting on my life and accomplishments',
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

export default function ValuesRankingPage() {
  const searchParams = useSearchParams()
  const entryIdFromUrl = searchParams.get('entry')

  const [index, setIndex] = useState(0)
  const [assignments, setAssignments] = useState<Assignments>(EMPTY)
  const [moveMode, setMoveMode] = useState<MoveMode>({ type: 'none' })
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [reflection, setReflection] = useState('')
  const [saving, setSaving] = useState(false)
  const [saveMessage, setSaveMessage] = useState<string | null>(null)
  const [savedEntryId, setSavedEntryId] = useState<string | null>(null)
  const [loadingSavedEntry, setLoadingSavedEntry] = useState(true)
  const [isDirty, setIsDirty] = useState(false)

  const current = VALUES[index] ?? null
  const sortedCount =
    assignments.essential.length +
    assignments.important.length +
    assignments.less_central.length

  const remainingCount = VALUES.length - sortedCount
  const isDone = index >= VALUES.length

  const importantSlots = Math.max(assignments.important.length + 4, MIN_OTHER_SLOTS)
  const lessCentralSlots = Math.max(
    assignments.less_central.length + 4,
    MIN_OTHER_SLOTS
  )

  const currentCardIsActive = moveMode.type === 'none' && !!current

  useEffect(() => {
    async function loadSavedEntry() {
      if (!entryIdFromUrl) {
        setLoadingSavedEntry(false)
        return
      }

      const supabase = createSupabaseBrowserClient()

      const { data, error } = await supabase
        .from('entries')
        .select('id, content, activity')
        .eq('id', entryIdFromUrl)
        .single()

      if (error || !data || data.activity !== 'values_ranking') {
        setLoadingSavedEntry(false)
        return
      }

      const content = (data.content ?? {}) as SavedRankingContent
      const essential = Array.isArray(content.essential) ? content.essential : []
      const important = Array.isArray(content.important) ? content.important : []
      const less_central = Array.isArray(content.less_central)
        ? content.less_central
        : []

      setAssignments({
        essential,
        important,
        less_central,
      })

      setReflection(typeof content.reflection === 'string' ? content.reflection : '')
      setSavedEntryId(data.id)

      const restoredCount =
        typeof content.sorted_count === 'number'
          ? content.sorted_count
          : essential.length + important.length + less_central.length

      setIndex(restoredCount)
      setLoadingSavedEntry(false)
    }

    loadSavedEntry()
  }, [entryIdFromUrl])

  const liveInstruction = useMemo(() => {
    if (!current && moveMode.type === 'none') {
      return 'All values have been placed.'
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
    setSaveMessage(null)
  }

  function handleEmptySlotClick(bucket: Bucket) {
    setErrorMessage(null)
    setSaveMessage(null)

    if (moveMode.type === 'moving_existing') {
      if (bucket === moveMode.from) {
        setErrorMessage('Choose an empty slot in a different row.')
        return
      }

      setAssignments((prev) => {
        const cleaned = removeFromBucket(moveMode.from, moveMode.value, prev)
        return {
          ...cleaned,
          [bucket]: [...cleaned[bucket], moveMode.value],
        }
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
        essential: [
          ...prev.essential.filter((v) => v !== moveMode.selected),
          current,
        ],
        important:
          bucket === 'important'
            ? [...prev.important, moveMode.selected]
            : prev.important.filter((v) => v !== moveMode.selected),
        less_central:
          bucket === 'less_central'
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

    setAssignments((prev) => ({
      ...prev,
      [bucket]: [...prev[bucket], current],
    }))

    advance()
  }

  function handleFilledCardClick(bucket: Bucket, value: string) {
    setErrorMessage(null)
    setSaveMessage(null)

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

  async function handleSave() {
    setErrorMessage(null)
    setSaveMessage(null)

    if (moveMode.type !== 'none') {
      setErrorMessage('Finish the current move before saving.')
      return
    }

    if (sortedCount === 0 && reflection.trim() === '') {
      setErrorMessage('Place at least one card or write a note before saving.')
      return
    }

    setSaving(true)

    const supabase = createSupabaseBrowserClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      setSaving(false)
      setErrorMessage('You are not logged in.')
      return
    }

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

    if (savedEntryId) {
      const { error } = await supabase
        .from('entries')
        .update(payload)
        .eq('id', savedEntryId)

      setSaving(false)

      if (error) {
        console.error('VALUES RANKING UPDATE ERROR:', JSON.stringify(error, null, 2))
        setErrorMessage('There was a problem updating your ranking.')
        return
      }

      setSaveMessage('Saved to My Materials.')
      setIsDirty(false)
      return
    }

    const { data, error } = await supabase
      .from('entries')
      .insert(payload)
      .select('id')
      .single()

    setSaving(false)

    if (error) {
      console.error('VALUES RANKING SAVE ERROR:', JSON.stringify(error, null, 2))
      setErrorMessage('There was a problem saving your ranking.')
      return
    }

    setSavedEntryId(data.id)
    setSaveMessage('Saved to My Materials.')
    setIsDirty(false)
  }

  async function handleReflectionKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      await handleSave()
    }
  }

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
        <section className="max-w-4xl">
          <h1 className="text-[34px] font-semibold leading-[0.98] tracking-[-0.03em] md:text-[42px]">
            Values Ranking
          </h1>
          <p className="mt-2 max-w-[520px] text-[16px] leading-[1.4] text-white/86 md:text-[17px]">
            Clarify what matters most to you, so your wishes are easier to communicate.
          </p>
        </section>

        <section className="mt-5 grid items-start gap-x-16 gap-y-0 lg:grid-cols-[500px_560px]">
          <div className="flex flex-col items-center pt-6 lg:items-center">
            <div className="flex items-start justify-center gap-4">
              <div className="flex flex-col items-center">
                <div className={`relative ${CARD_SIZE}`}>
                  <div
                    className={`absolute left-2 top-2 rounded-[18px] border-2 border-[#170327] bg-[#ece5f7] ${CARD_SIZE}`}
                  />
                  <div
                    className={`absolute left-1 top-1 rounded-[18px] border-2 border-[#170327] bg-[#f3ecfb] ${CARD_SIZE}`}
                  />
                  <div
                    className={`absolute left-0 top-0 flex items-center justify-center rounded-[18px] border-2 border-[#170327] bg-[#f8f4eb] ${CARD_SIZE}`}
                  >
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

            <div className="mt-6 flex min-h-[72px] flex-wrap items-center justify-center gap-3">
              <p className="text-[16px] font-medium leading-[1.3] text-[#f8f4eb] md:text-[17px]">
                {liveInstruction}
              </p>

              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="rounded-full bg-[#f29836] px-4 py-2 text-[14px] font-medium text-[#170327] transition hover:bg-[#f0a347] disabled:cursor-not-allowed disabled:opacity-45"
              >
                {saving ? 'Saving…' : 'Save progress'}
              </button>

              {saveMessage && (
                <p className="text-[14px] text-[#f8f4eb]/88">
                  {saveMessage}
                </p>
              )}
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
                <p>
                  You’ll sort cards into three groups: Essential, Important, and Less important.
                </p>
                <p>
                  Only 5 cards can be placed in Essential. If Essential is full, you’ll choose one to move out before adding a new one.
                </p>
                <p>
                  You can move cards at any time — nothing is locked in. To move a card from its slot, select the card you want to move, then select the new slot you want to move it to.
                </p>
              </div>
            </div>
          </div>
        </section>

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

        <section className="mt-4 rounded-[24px] bg-[#f4efe4] px-6 py-5 text-[#170327] md:px-8 md:py-6">
          <label className="block text-[11px] uppercase tracking-[0.16em] text-[#170327]/62">
            Optional note
          </label>

          <textarea
            value={reflection}
            onChange={(e) => setReflection(e.target.value)}
            onKeyDown={handleReflectionKeyDown}
            placeholder="What stands out to you about these choices? Press Enter to save. Use Shift+Enter for a new line."
            className="mt-3 min-h-[140px] w-full rounded-[18px] border border-[#170327]/14 bg-white px-4 py-3.5 text-[15px] leading-relaxed text-[#170327] placeholder:text-[#170327]/38 focus:border-[#2f3f8f]/35 focus:outline-none"
          />

          <div className="mt-4 flex flex-wrap items-center gap-4">
            <button
              type="button"
              onClick={() => {
                if (isDirty && !window.confirm('You have unsaved changes. Leave without saving?')) return
                window.location.href = '/app/materials'
              }}
              className="text-[14px] text-[#170327]/78 transition hover:text-[#170327]"
            >
              Go to My Materials
            </button>

            <Link
              href="/app/explore/fears-ranking"
              className="text-[14px] text-[#170327]/78 transition hover:text-[#170327]"
            >
              Go to Fears Ranking
            </Link>
          </div>
        </section>
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
                  isSelectedForMove || isSelectedForEssentialSwap
                    ? cardHighlight
                    : cardFilled
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