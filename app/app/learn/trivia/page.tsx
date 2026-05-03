'use client'

import { useRef, useState } from 'react'
import Link from 'next/link'
import { TRIVIA_CARDS, type TriviaCard } from '@/lib/trivia-data'
import { createNote, updateNote } from '@/lib/notes'
import VoiceNoteButton from '@/app/components/VoiceNoteButton'
import Breadcrumbs from '@/app/components/navigation/Breadcrumbs'

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

  return (
    <div className="min-h-screen" style={{ background: 'linear-gradient(180deg, #BBABF4 0%, #F8F4EB 100%)' }}>
      {view.kind === 'card' ? (
        <CardView
          card={view.card}
          onBack={backToDeck}
          onNext={nextCard}
          total={TRIVIA_CARDS.length}
        />
      ) : (
        <DeckView
          seenIds={seenIds}
          onSelect={selectCard}
        />
      )}
    </div>
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
      <div style={{ marginBottom: 24 }}>
        <Breadcrumbs
          theme="light"
          items={[
            { label: 'Learn', href: '/app/learn' },
            { label: 'Deathcare Trivia' },
          ]}
        />
      </div>

      <div className="mb-10">
        <h1 className="ns-title-activity text-[#f8f4eb]">
          Deathcare Trivia
        </h1>
        <p className="ns-lead-activity" style={{ marginTop: '12px', color: '#1A1A1A' }}>
          Pick any card from the deck.
        </p>
        {seenIds.size > 0 && unseenCount > 0 && (
          <p className="text-sm mt-2" style={{ color: 'rgba(19,4,38,0.55)' }}>
            {unseenCount} card{unseenCount === 1 ? '' : 's'} remaining
          </p>
        )}
        {unseenCount === 0 && (
          <p className="text-sm mt-2" style={{ color: 'rgba(19,4,38,0.55)' }}>You've been through the full deck.</p>
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
                border: '1px solid rgba(255,255,255,0.18)',
                boxShadow: seen ? 'none' : '0 8px 20px rgba(19,4,38,0.18), inset 0 1px 0 rgba(255,255,255,0.07)',
              }}
              className={`rounded-2xl px-6 py-8 text-left transition-all duration-150
                ${seen
                  ? 'opacity-25 cursor-default'
                  : 'hover:-translate-y-1.5 hover:shadow-[0_12px_28px_rgba(19,4,38,0.28)] active:translate-y-0 cursor-pointer'
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
  const [noteStatus, setNoteStatus] = useState<'idle' | 'saving' | 'saved'>('idle')
  const [showVoice, setShowVoice] = useState(false)
  const noteDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const savedNoteIdRef = useRef<string | null>(null)

  async function autoSaveNote(text: string) {
    if (!text.trim()) return
    setNoteStatus('saving')
    try {
      if (savedNoteIdRef.current) {
        await updateNote(savedNoteIdRef.current, text.trim())
      } else {
        const note = await createNote(text.trim())
        if (note) savedNoteIdRef.current = note.id
      }
      setNoteStatus('saved')
    } catch {
      setNoteStatus('idle')
    }
  }

  // Reset flip state when card changes
  const [lastCardId, setLastCardId] = useState(card.id)
  if (card.id !== lastCardId) {
    setLastCardId(card.id)
    setFlipped(false)
    setNoteText('')
    setNoteStatus('idle')
    setShowVoice(false)
    savedNoteIdRef.current = null
    if (noteDebounceRef.current) clearTimeout(noteDebounceRef.current)
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-16">
      <div style={{ marginBottom: 40 }}>
        <Breadcrumbs
          theme="light"
          items={[
            { label: 'Learn', href: '/app/learn' },
            { label: 'Deathcare Trivia', onClick: onBack },
            { label: card.question.length > 48 ? card.question.slice(0, 48) + '…' : card.question },
          ]}
        />
      </div>

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

                {/* Note */}
                <div className="space-y-1">
                  <textarea
                    value={noteText}
                    onChange={(e) => {
                      setNoteText(e.target.value)
                      setNoteStatus('idle')
                      if (noteDebounceRef.current) clearTimeout(noteDebounceRef.current)
                      if (e.target.value.trim()) {
                        noteDebounceRef.current = setTimeout(() => autoSaveNote(e.target.value), 1500)
                      }
                    }}
                    onBlur={() => {
                      if (noteDebounceRef.current) { clearTimeout(noteDebounceRef.current); noteDebounceRef.current = null }
                      autoSaveNote(noteText)
                    }}
                    placeholder="Write a note about this card…"
                    rows={2}
                    className="w-full rounded-lg bg-[#f8f4eb] text-[#130426] placeholder:text-[#130426]/40 px-3 py-2 text-sm leading-relaxed resize-none outline-none overflow-hidden"
                    style={{ fontSize: 16 }}
                  />
                  <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.78)', minHeight: 18 }}>
                    {noteStatus === 'saving' ? 'Saving…' : noteStatus === 'saved' ? 'Saved' : ''}
                  </p>
                  <div style={{ marginTop: 4 }}>
                    {showVoice ? (
                      <VoiceNoteButton
                        saveMode={{ kind: 'freeform' }}
                        theme="dark"
                        autoStart
                        onSaved={() => {}}
                        onDelete={() => setShowVoice(false)}
                        buttonLabel="Record a voice note"
                      />
                    ) : (
                      <button
                        type="button"
                        onClick={() => setShowVoice(true)}
                        style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'rgba(255,255,255,0.78)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
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
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
