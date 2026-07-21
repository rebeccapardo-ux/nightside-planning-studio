'use client'

import { useEffect, useRef, useState } from 'react'
import { BANNER_CLASS, BANNER_STYLE } from '@/app/components/pageBanner'
import Link from 'next/link'
import { TRIVIA_CARDS, type TriviaCard } from '@/lib/trivia-data'
import { createNote, updateNote } from '@/lib/notes'
import VoiceNoteButton from '@/app/components/VoiceNoteButton'
import Breadcrumbs from '@/app/components/navigation/Breadcrumbs'
import AutosaveNotice from '@/app/components/AutosaveNotice'

const hv = "'Helvetica Neue', Helvetica, Arial, sans-serif"
// Matches the Reflection Prompts grid-card text (HelveticaNeue-Medium @ 500).
const fontHelveticaMedium = "'HelveticaNeue-Medium', 'Helvetica Neue', Helvetica, Arial, sans-serif"

type View =
  | { kind: 'deck' }
  | { kind: 'card'; card: TriviaCard }

export default function TriviaPage() {
  const [view, setView] = useState<View>({ kind: 'deck' })
  const [seenIds, setSeenIds] = useState<Set<number>>(new Set())
  const hasEngagedRef = useRef(false)

  useEffect(() => {
    fetch('/api/analytics/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ eventName: 'activity_opened', metadata: { activity: 'deathcare_trivia' } }),
    }).catch(() => {})
  }, [])

  // Deck ↔ card is view state (not a route change), so mirror it into browser
  // history: opening a card pushes an entry, and Back/Forward restore the view via
  // popstate. The pushed entry carries the card id so Forward re-opens the right card.
  useEffect(() => {
    function onPopState(e: PopStateEvent) {
      const id = (e.state as { triviaCardId?: number } | null)?.triviaCardId
      const card = typeof id === 'number' ? TRIVIA_CARDS.find((c) => c.id === id) : undefined
      setView(card ? { kind: 'card', card } : { kind: 'deck' })
      window.scrollTo(0, 0)
    }
    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
  }, [])

  function selectCard(card: TriviaCard) {
    setSeenIds((prev) => new Set([...prev, card.id]))
    // Push a history entry on deck → card so browser Back returns to the deck grid
    // (instead of leaving the trivia page). Card → card (Next) replaces in place, so
    // the stack stays one entry deep and Back from any card still lands on the deck.
    if (typeof window !== 'undefined') {
      const nextState = { ...window.history.state, triviaCardId: card.id }
      if (view.kind === 'deck') window.history.pushState(nextState, '')
      else window.history.replaceState(nextState, '')
    }
    setView({ kind: 'card', card })
    window.scrollTo(0, 0)
  }

  function backToDeck() {
    // Step back through history when there's a pushed card entry (keeps history
    // clean; popstate restores the deck); otherwise fall back to a direct change.
    if (typeof window !== 'undefined' && (window.history.state as { triviaCardId?: number } | null)?.triviaCardId != null) {
      window.history.back()
    } else {
      setView({ kind: 'deck' })
      window.scrollTo(0, 0)
    }
  }

  function nextCard() {
    if (view.kind !== 'card') return
    const currentIndex = TRIVIA_CARDS.findIndex((c) => c.id === view.card.id)
    const next = TRIVIA_CARDS[(currentIndex + 1) % TRIVIA_CARDS.length]
    selectCard(next)
  }

  return (
    <div className="min-h-screen" style={{ background: '#F8F4EB' }}>
      {view.kind === 'card' ? (
        <CardView
          card={view.card}
          onBack={backToDeck}
          onNext={nextCard}
          total={TRIVIA_CARDS.length}
          onFirstFlip={() => {
            if (!hasEngagedRef.current) {
              hasEngagedRef.current = true
              fetch('/api/analytics/track', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ eventName: 'activity_engaged', metadata: { activity: 'deathcare_trivia' } }),
              }).catch(() => {})
            }
          }}
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
  const [tipsOpen, setTipsOpen] = useState(false)

  return (
    <div>

      {/* Midnight banner — full width */}
      <div className={`${BANNER_CLASS} md:pr-8`} style={BANNER_STYLE}>
        <div style={{ marginBottom: 24 }}>
          <Breadcrumbs
            theme="navy"
            items={[
              { label: 'Activities', href: '/app/activities' },
              { label: 'Deathcare Trivia' },
            ]}
          />
        </div>
        <h1 className="ns-title-activity text-white">
          Deathcare Trivia
        </h1>
        <p style={{ fontFamily: hv, fontSize: 17, color: 'rgba(255,255,255,0.85)', maxWidth: 520, marginTop: 20, marginBottom: 0, lineHeight: 1.5 }}>
          Explore questions and facts about death, dying, grief, and end-of-life care.
        </p>
        <p style={{ fontFamily: hv, fontSize: 17, color: 'rgba(255,255,255,0.85)', maxWidth: 520, marginTop: 16, marginBottom: 0, lineHeight: 1.5 }}>
          Understanding your options, rights, and the realities of deathcare can help you make more informed decisions, communicate your preferences more clearly, and advocate for the kinds of care and support you want.
        </p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center', marginTop: 28 }}>
          {['Pick a card to start', 'Flip to reveal answers', 'Play solo or in a group'].map((text) => (
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
                These cards are designed to spark curiosity, reflection, and conversation.
              </p>
              <p style={{ fontSize: 14, lineHeight: 1.5, color: 'rgba(19,4,38,0.72)', marginBottom: 12 }}>
                These cards work well alone or as a way to spark conversation with a partner, family member, friend, or group — a low-pressure way to learn together and bring up topics that can be hard to broach directly.
              </p>
              <p style={{ fontSize: 14, lineHeight: 1.5, color: 'rgba(19,4,38,0.72)', marginBottom: 12 }}>
                Pay attention to what surprises you, challenges something you assumed, or makes you want to learn more.
              </p>
              <p style={{ fontSize: 14, lineHeight: 1.5, color: 'rgba(19,4,38,0.72)' }}>
                Some topics may connect to personal experiences, cultural beliefs, caregiving, grief, or conversations you've had with others over time.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Card grid */}
      <div className="mx-auto max-w-[1320px] px-6 pb-14 md:px-10">
        <div style={{ marginTop: 40 }}>
          <p style={{ textAlign: 'center', fontFamily: hv, fontSize: 16, color: 'rgba(19,4,38,0.9)', marginBottom: 16 }}>
            {unseenCount === 0
              ? "You've been through the full deck."
              : seenIds.size > 0
              ? `${unseenCount} card${unseenCount === 1 ? '' : 's'} remaining — select one to continue.`
              : 'Select any card to begin.'}
          </p>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 items-stretch">
            {TRIVIA_CARDS.map((card) => {
              const seen = seenIds.has(card.id)
              return (
                <button
                  key={card.id}
                  onClick={() => onSelect(card)}
                  style={{
                    aspectRatio: '3/4',
                    background: '#FFFFFF',
                    border: '1px solid rgba(26,26,26,0.12)',
                    boxShadow: seen ? 'none' : '0 8px 20px rgba(19,4,38,0.18), inset 0 1px 0 rgba(255,255,255,0.07)',
                  }}
                  className={`h-full w-full rounded-2xl px-5 py-6 text-left transition-all duration-150 flex flex-col justify-center
                    ${seen
                      ? 'opacity-25 cursor-default'
                      : 'hover:-translate-y-1.5 hover:shadow-[0_12px_28px_rgba(19,4,38,0.28)] active:translate-y-0 cursor-pointer'
                    }
                  `}
                >
                  <p style={{ fontFamily: fontHelveticaMedium, fontSize: '18px', lineHeight: 1.45, fontWeight: 500, color: '#1A1A1A', margin: 0 }}>
                    {card.question}
                  </p>
                </button>
              )
            })}
          </div>
        </div>
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
  onFirstFlip,
}: {
  card: TriviaCard
  onBack: () => void
  onNext: () => void
  total: number
  onFirstFlip?: () => void
}) {
  const [flipped, setFlipped] = useState(false)
  const [noteText, setNoteText] = useState('')
  const [noteStatus, setNoteStatus] = useState<'idle' | 'saving' | 'saved'>('idle')
  const noteSavedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
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
      if (noteSavedTimerRef.current) clearTimeout(noteSavedTimerRef.current)
      noteSavedTimerRef.current = setTimeout(() => setNoteStatus('idle'), 3000)
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
    if (noteSavedTimerRef.current) { clearTimeout(noteSavedTimerRef.current); noteSavedTimerRef.current = null }
    savedNoteIdRef.current = null
    if (noteDebounceRef.current) clearTimeout(noteDebounceRef.current)
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-16">
      <div style={{ marginBottom: 40 }}>
        <Breadcrumbs
          theme="light"
          items={[
            { label: 'Activities', href: '/app/activities' },
            { label: 'Deathcare Trivia', onClick: onBack },
            { label: card.crumb },
          ]}
        />
      </div>

      {/* Card wrapper — 3D perspective */}
      <div className="flex flex-col items-center">
        <div
          style={{ perspective: '1200px' }}
          className="w-full max-w-[360px] rounded-2xl shadow-[0_8px_20px_rgba(19,4,38,0.18)]"
        >
          <div
            style={{
              transformStyle: 'preserve-3d',
              transform: flipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
              transition: 'transform 0.5s ease',
              display: 'grid',
            }}
          >
            {/* Front — question */}
            <div
              style={{ backfaceVisibility: 'hidden', gridArea: '1/1', minHeight: '480px', border: '1px solid rgba(26,26,26,0.12)' }}
              className="rounded-2xl bg-white px-8 py-10 flex flex-col justify-between"
            >
              <div className="flex-1 flex items-center">
                <p className="text-[#130426] text-xl font-semibold leading-snug whitespace-pre-line">
                  {card.question}
                </p>
              </div>
              <button
                onClick={() => { setFlipped(true); onFirstFlip?.() }}
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
                gridArea: '1/1',
                minHeight: '480px',
              }}
              className="rounded-2xl bg-[#2C3777] px-8 py-10 flex flex-col justify-between"
            >
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-dusk-light mb-4">Answer</p>
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
                        noteDebounceRef.current = setTimeout(() => { noteDebounceRef.current = null; autoSaveNote(e.target.value) }, 1500)
                      }
                    }}
                    onBlur={() => {
                      if (noteDebounceRef.current) {
                        clearTimeout(noteDebounceRef.current)
                        noteDebounceRef.current = null
                        autoSaveNote(noteText)
                      }
                    }}
                    placeholder="Capture anything that comes up…"
                    rows={2}
                    className="w-full text-[#130426] placeholder:text-[#130426]/65 leading-relaxed resize-none outline-none overflow-hidden"
                    style={{ fontSize: 16, background: '#FFFFFF', border: '1px solid #2C3777', borderRadius: 10, padding: 12 }}
                  />
                  <AutosaveNotice theme="dark" style={{ marginTop: 8 }} />
                  <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.78)', minHeight: 18, display: 'flex', alignItems: 'center', gap: 6 }}>
                    {noteStatus === 'saving' && <span>Saving…</span>}
                    {noteStatus === 'saved' && (
                      <>
                        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true" style={{ flexShrink: 0 }}>
                          <circle cx="7" cy="7" r="6" stroke="rgba(255,255,255,0.78)" strokeWidth="1.3" />
                          <path d="M4.5 7L6.2 8.8L9.5 5.5" stroke="rgba(255,255,255,0.78)" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                        <span>Saved to Your materials</span>
                      </>
                    )}
                  </div>
                  <div style={{ marginTop: 4 }}>
                    <VoiceNoteButton
                      saveMode={{ kind: 'freeform' }}
                      theme="dark"
                      onSaved={() => {}}
                    />
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
