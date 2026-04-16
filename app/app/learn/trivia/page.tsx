'use client'

import { useState } from 'react'
import Link from 'next/link'
import { TRIVIA_CARDS, type TriviaCard } from '@/lib/trivia-data'
import { createNote } from '@/lib/notes'

type View =
  | { kind: 'deck' }
  | { kind: 'card'; card: TriviaCard }

export default function TriviaPage() {
  const [view, setView] = useState<View>({ kind: 'deck' })
  const [seenIds, setSeenIds] = useState<Set<number>>(new Set())

  function selectCard(card: TriviaCard) {
    setSeenIds((prev) => new Set([...prev, card.id]))
    setView({ kind: 'card', card })
  }

  function backToDeck() {
    setView({ kind: 'deck' })
  }

  function nextCard() {
    if (view.kind !== 'card') return
    const currentIndex = TRIVIA_CARDS.findIndex((c) => c.id === view.card.id)
    const next = TRIVIA_CARDS[(currentIndex + 1) % TRIVIA_CARDS.length]
    selectCard(next)
  }

  if (view.kind === 'card') {
    return (
      <CardView
        card={view.card}
        onBack={backToDeck}
        onNext={nextCard}
        total={TRIVIA_CARDS.length}
      />
    )
  }

  return (
    <DeckView
      seenIds={seenIds}
      onSelect={selectCard}
    />
  )
}

// ---------------------------------------------------------------------------
// Deck view
// ---------------------------------------------------------------------------

function DeckView({
  seenIds,
  onSelect,
}: {
  seenIds: Set<number>
  onSelect: (card: TriviaCard) => void
}) {
  const unseenCount = TRIVIA_CARDS.length - seenIds.size

  return (
    <div className="max-w-4xl mx-auto px-4 py-16">
      <Link href="/app/learn" className="text-[#f8f4eb] hover:text-[#BBABF4] transition-colors text-sm">
        ← Back to Learn
      </Link>

      <div className="mt-8 mb-10">
        <h1 className="text-6xl font-bold text-[#f8f4eb] mb-4 underline decoration-[#f29836] decoration-[3px] underline-offset-[8px]">
          Deathcare Trivia
        </h1>
        <p className="text-[#f8f4eb] leading-relaxed">
          Pick any card from the deck.
        </p>
        {seenIds.size > 0 && unseenCount > 0 && (
          <p className="text-[#BBABF4] text-sm mt-2">
            {unseenCount} card{unseenCount === 1 ? '' : 's'} remaining
          </p>
        )}
        {unseenCount === 0 && (
          <p className="text-[#BBABF4] text-sm mt-2">You've been through the full deck.</p>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {TRIVIA_CARDS.map((card) => {
          const seen = seenIds.has(card.id)
          return (
            <button
              key={card.id}
              onClick={() => onSelect(card)}
              style={{
                minHeight: '180px',
                background: 'linear-gradient(145deg, #354a9e 0%, #1e2b6b 100%)',
                border: '1px solid rgba(187,171,244,0.12)',
                boxShadow: seen ? 'none' : '0 4px 10px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.07)',
              }}
              className={`rounded-2xl px-6 py-8 text-left transition-all duration-150
                ${seen
                  ? 'opacity-25 cursor-default'
                  : 'hover:-translate-y-1.5 hover:shadow-[0_8px_24px_rgba(0,0,0,0.5)] active:translate-y-0 cursor-pointer'
                }
              `}
            >
              <p className="text-[#BBABF4] text-lg font-bold leading-snug">
                {card.question}
              </p>
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Card view — 3D flip
// ---------------------------------------------------------------------------

function CardView({
  card,
  onBack,
  onNext,
  total,
}: {
  card: TriviaCard
  onBack: () => void
  onNext: () => void
  total: number
}) {
  const [flipped, setFlipped] = useState(false)
  const [noteText, setNoteText] = useState('')
  const [noteState, setNoteState] = useState<'idle' | 'open' | 'saving' | 'saved'>('idle')

  async function handleSaveNote() {
    if (!noteText.trim()) return
    setNoteState('saving')
    await createNote(noteText.trim())
    setNoteText('')
    setNoteState('saved')
    setTimeout(() => setNoteState('idle'), 2000)
  }

  // Reset flip state when card changes
  const [lastCardId, setLastCardId] = useState(card.id)
  if (card.id !== lastCardId) {
    setLastCardId(card.id)
    setFlipped(false)
    setNoteState('idle')
    setNoteText('')
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-16">
      <button
        onClick={onBack}
        className="text-[#f8f4eb] hover:text-[#BBABF4] transition-colors text-sm mb-10"
      >
        ← Back to deck
      </button>

      {/* Card wrapper — 3D perspective */}
      <div className="flex flex-col items-center">
        <div
          style={{ perspective: '1200px' }}
          className="w-full max-w-[360px]"
        >
          <div
            style={{
              transformStyle: 'preserve-3d',
              transform: flipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
              transition: 'transform 0.5s ease',
              minHeight: '480px',
              position: 'relative',
            }}
          >
            {/* Front — question */}
            <div
              style={{ backfaceVisibility: 'hidden' }}
              className="absolute inset-0 rounded-2xl bg-[#f8f4eb] px-8 py-10 flex flex-col justify-between"
            >
              <div className="flex-1 flex items-center">
                <p className="text-[#130426] text-xl font-semibold leading-snug whitespace-pre-line">
                  {card.question}
                </p>
              </div>
              <button
                onClick={() => setFlipped(true)}
                className="mt-8 w-full rounded-full bg-[#130426] text-[#f8f4eb] py-3 text-sm font-semibold hover:bg-[#2C3777] transition-colors"
              >
                See answer
              </button>
            </div>

            {/* Back — answer */}
            <div
              style={{
                backfaceVisibility: 'hidden',
                transform: 'rotateY(180deg)',
              }}
              className="absolute inset-0 rounded-2xl bg-[#2C3777] px-8 py-10 flex flex-col justify-between overflow-hidden"
            >
              <div className="flex-1 overflow-y-auto pr-1">
                <p className="text-xs font-bold uppercase tracking-widest text-[#BBABF4] mb-4">Answer</p>
                <p className="text-[#f8f4eb] text-lg leading-relaxed whitespace-pre-line">
                  {card.answer}
                </p>
              </div>

              <div className="mt-6 space-y-3 pt-4 border-t border-[#f8f4eb]/10">
                {/* Primary actions */}
                <div className="flex gap-3">
                  <button
                    onClick={onNext}
                    className="flex-1 rounded-full bg-[#f29836] text-[#130426] py-2.5 text-sm font-semibold hover:bg-[#DB5835] transition-colors"
                  >
                    Next card →
                  </button>
                  <button
                    onClick={onBack}
                    className="flex-1 rounded-full bg-[#f8f4eb]/10 text-[#f8f4eb] py-2.5 text-sm font-semibold hover:bg-[#f8f4eb]/20 transition-colors"
                  >
                    Back to deck
                  </button>
                </div>

                {/* Notepad — subtle, non-intrusive */}
                {noteState === 'saved' ? (
                  <p className="text-xs text-[#BBABF4] text-center">Saved to your Materials.</p>
                ) : noteState === 'open' || noteState === 'saving' ? (
                  <div className="space-y-1">
                    <textarea
                      autoFocus
                      value={noteText}
                      onChange={(e) => setNoteText(e.target.value)}
                      placeholder="Write a note — saved to your materials"
                      rows={2}
                      className="w-full rounded-lg bg-[#f8f4eb] text-[#130426] placeholder:text-[#130426]/40 px-3 py-2 text-sm leading-relaxed resize-none outline-none overflow-hidden"
                    />
                    <div className="flex items-center justify-between">
                      <p className="text-xs text-app-tertiary">Saved to your materials</p>
                      <div className="flex gap-3 items-center">
                        <button
                          onClick={handleSaveNote}
                          disabled={!noteText.trim() || noteState === 'saving'}
                          className="text-xs font-semibold text-[#f8f4eb] hover:text-[#BBABF4] transition-colors disabled:opacity-40"
                        >
                          {noteState === 'saving' ? 'Saving…' : 'Save note'}
                        </button>
                        <button
                          onClick={() => { setNoteState('idle'); setNoteText('') }}
                          className="text-xs text-[#f8f4eb]/60 hover:text-[#f8f4eb] transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => setNoteState('open')}
                    className="w-full text-xs text-[#BBABF4] hover:text-[#f8f4eb] transition-colors py-1"
                  >
                    + Add a note
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
