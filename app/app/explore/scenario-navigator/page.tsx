'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import {
  SCENARIOS,
  SOURCES,
  type Scenario,
  type ScenarioChoice,
} from '@/lib/scenario-navigator-data'
import { createNote, updateNote } from '@/lib/notes'
import VoiceNoteButton from '@/app/components/VoiceNoteButton'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type ViewState =
  | { kind: 'selection' }
  | { kind: 'scenario'; scenarioId: string }
  | { kind: 'outcome'; scenarioId: string; choiceId: string }

const CARD_STYLES = [
  { bg: 'bg-[#BBABF4]', text: 'text-[#130426]', pill: 'bg-[#130426] text-[#f8f4eb]' },
  { bg: 'bg-[#f8f4eb]',  text: 'text-[#130426]', pill: 'bg-[#2C3777] text-[#f8f4eb]' },
  { bg: 'bg-[#f29836]',  text: 'text-[#130426]', pill: 'bg-[#130426] text-[#f8f4eb]' },
  { bg: 'bg-[#2C3777]',  text: 'text-[#f8f4eb]', pill: 'bg-[#f8f4eb] text-[#130426]' },
]

// ---------------------------------------------------------------------------
// ALS-specific constants
// ---------------------------------------------------------------------------

const ALS_CHOICE_STYLES: Record<string, { bg: string; border: string; titleColor: string; bodyColor: string; ctaBg: string; ctaColor: string; hoverBorder: string }> = {
  'ventilator': {
    bg: '#BBABF4', border: 'none',
    titleColor: '#1A1A1A', bodyColor: 'rgba(26,26,26,0.72)',
    ctaBg: '#130426', ctaColor: '#F8F4EB', hoverBorder: '2px solid #2C3777',
  },
  'palliative-care': {
    bg: '#DB5835', border: 'none',
    titleColor: '#FFFFFF', bodyColor: 'rgba(255,255,255,0.82)',
    ctaBg: '#F8F4EB', ctaColor: '#1A1A1A', hoverBorder: '2px solid #F8F4EB',
  },
  'non-invasive-support': {
    bg: '#2C3777', border: 'none',
    titleColor: '#FFFFFF', bodyColor: 'rgba(255,255,255,0.78)',
    ctaBg: '#F8F4EB', ctaColor: '#130426', hoverBorder: '2px solid #BBABF4',
  },
}

const ALS_CONSEQUENCE_PREVIEWS: Record<string, string> = {
  'ventilator': 'Requires intensive medical support and ongoing machine-assisted breathing.',
  'palliative-care': 'Centers comfort, symptom relief, and quality of life.',
  'non-invasive-support': 'Uses breathing and communication supports without invasive ventilation.',
}

// ---------------------------------------------------------------------------
// CPR-specific constants
// ---------------------------------------------------------------------------

const CPR_CHOICE_STYLES: Record<string, { bg: string; border: string; titleColor: string; bodyColor: string; ctaBg: string; ctaColor: string; hoverBorder: string }> = {
  'full-resuscitation': {
    bg: '#2C3777', border: 'none',
    titleColor: '#FFFFFF', bodyColor: 'rgba(255,255,255,0.78)',
    ctaBg: '#F8F4EB', ctaColor: '#130426', hoverBorder: '2px solid #BBABF4',
  },
  'limited-interventions': {
    bg: '#BBABF4', border: 'none',
    titleColor: '#1A1A1A', bodyColor: 'rgba(26,26,26,0.72)',
    ctaBg: '#130426', ctaColor: '#F8F4EB', hoverBorder: '2px solid #2C3777',
  },
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function ScenarioNavigatorPage() {
  const [view, setView] = useState<ViewState>({ kind: 'selection' })

  // Push a history entry on every internal navigation so the browser Back
  // button steps through view states rather than leaving the page entirely.
  function goTo(next: ViewState) {
    window.scrollTo(0, 0)
    window.history.pushState(next, '')
    setView(next)
  }

  useEffect(() => {
    function handlePopState(e: PopStateEvent) {
      const state = e.state as ViewState | null
      setView(state ?? { kind: 'selection' })
      window.scrollTo(0, 0)
    }
    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [])

  if (view.kind === 'selection') {
    return <SelectionView onSelectScenario={(id) => goTo({ kind: 'scenario', scenarioId: id })} />
  }

  const scenario = SCENARIOS.find((s) => s.id === view.scenarioId)

  if (!scenario) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-[#f8f4eb]">
        <button onClick={() => goTo({ kind: 'selection' })} className="text-[#f8f4eb] hover:text-[#BBABF4] transition-colors">
          ← All scenarios
        </button>
        <p className="mt-6 text-[#f8f4eb]">Scenario not found.</p>
      </div>
    )
  }

  if (view.kind === 'scenario') {
    return (
      <ScenarioView
        scenario={scenario}
        onSelectChoice={(choiceId) => goTo({ kind: 'outcome', scenarioId: scenario.id, choiceId })}
        onBack={() => goTo({ kind: 'selection' })}
      />
    )
  }

  const choice = scenario.choices.find((c) => c.id === view.choiceId)

  if (!choice) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-[#f8f4eb]">
        <button onClick={() => goTo({ kind: 'scenario', scenarioId: scenario.id })} className="text-[#f8f4eb] hover:text-[#BBABF4] transition-colors">
          ← Back to scenario
        </button>
        <p className="mt-6 text-[#f8f4eb]">Choice not found.</p>
      </div>
    )
  }

  return (
    <OutcomeView
      scenario={scenario}
      choice={choice}
      onBackToScenario={() => goTo({ kind: 'scenario', scenarioId: scenario.id })}
      onBackToAll={() => goTo({ kind: 'selection' })}
      onSelectChoice={(choiceId) => goTo({ kind: 'outcome', scenarioId: scenario.id, choiceId })}
    />
  )
}

// ---------------------------------------------------------------------------
// SelectionView
// ---------------------------------------------------------------------------

function SelectionView({ onSelectScenario }: { onSelectScenario: (id: string) => void }) {
  return (
    <div className="max-w-5xl mx-auto px-4 py-16">
      <Link href="/app/reflect" className="text-[#f8f4eb] hover:text-[#BBABF4] transition-colors text-sm">
        ← Back to Reflect
      </Link>
      <div className="mt-8 mb-12">
        <h1 className="ns-title-activity text-[#f8f4eb]">Scenario Navigator</h1>
        <p className="ns-lead-activity text-[#f8f4eb]" style={{ marginTop: '12px' }}>
          Work through realistic situations to see how your values and preferences might apply in practice. Explore any path — nothing locks you in.
        </p>
      </div>
      <div className="grid gap-6 md:grid-cols-2">
        {SCENARIOS.map((scenario, i) => {
          const style = CARD_STYLES[i % CARD_STYLES.length]
          return (
            <button key={scenario.id} type="button" onClick={() => onSelectScenario(scenario.id)}
              className={`rounded-2xl px-8 py-8 text-left transition hover:opacity-90 ${style.bg}`}
            >
              <h2 className={`text-2xl font-bold mb-3 ${style.text}`}>{scenario.title}</h2>
              <p className={`leading-relaxed text-base mb-6 ${style.text}`}>{scenario.tileOverview}</p>
              <span className={`inline-block text-sm font-semibold rounded-full px-5 py-2 ${style.pill}`}>Explore →</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// ScenarioView — delegates to ALS-specific design for late-stage-als
// ---------------------------------------------------------------------------

function ScenarioView({ scenario, onSelectChoice, onBack }: {
  scenario: Scenario
  onSelectChoice: (choiceId: string) => void
  onBack: () => void
}) {
  if (scenario.id === 'late-stage-als') {
    return <ALSScenarioContent scenario={scenario} onSelectChoice={onSelectChoice} onBack={onBack} />
  }

  if (scenario.id === 'cpr-decision') {
    return <CPRScenarioContent scenario={scenario} onSelectChoice={onSelectChoice} onBack={onBack} />
  }

  if (scenario.id === 'pancreatic-cancer') {
    return <PancreaticScenarioContent scenario={scenario} onSelectChoice={onSelectChoice} onBack={onBack} />
  }

  if (scenario.id === 'cognitive-decline') {
    return <CognitiveDeclineScenarioContent scenario={scenario} onSelectChoice={onSelectChoice} onBack={onBack} />
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-16">
      <button onClick={onBack} className="text-[#f8f4eb] hover:text-[#BBABF4] transition-colors text-sm">
        ← All scenarios
      </button>
      <div className="mt-8 mb-10">
        <p className="text-xs uppercase tracking-widest text-[#BBABF4] mb-3 font-semibold">Scenario</p>
        <h1 className="ns-title-internal text-[#f8f4eb]" style={{ marginBottom: '24px' }}>{scenario.title}</h1>
        <p className="text-[#f8f4eb] leading-relaxed text-base">{scenario.fullOverview}</p>
      </div>
      <div>
        <h2 className="text-lg font-bold text-[#f8f4eb] mb-5">Choose a path to explore</h2>
        <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${scenario.choices.length}, minmax(0, 1fr))` }}>
          {scenario.choices.map((choice) => (
            <button key={choice.id} type="button" onClick={() => onSelectChoice(choice.id)}
              className="flex flex-col rounded-2xl bg-[#BBABF4] px-7 py-6 text-left transition hover:opacity-90"
            >
              <span className="block text-[#130426] font-semibold leading-relaxed flex-1 mb-4">{choice.label}</span>
              <span className="mt-auto inline-block rounded-full bg-[#130426] text-[#f8f4eb] text-sm font-semibold px-4 py-1.5">Choose →</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Pancreatic cancer-specific constants
// ---------------------------------------------------------------------------

const PANCREATIC_CHOICE_STYLES: Record<string, { bg: string; border: string; titleColor: string; bodyColor: string; ctaBg: string; ctaColor: string; hoverBorder: string }> = {
  'aggressive-treatment': {
    bg: '#2C3777', border: 'none',
    titleColor: '#FFFFFF', bodyColor: 'rgba(255,255,255,0.78)',
    ctaBg: '#F8F4EB', ctaColor: '#130426', hoverBorder: '2px solid #BBABF4',
  },
  'comfort-care': {
    bg: '#BBABF4', border: 'none',
    titleColor: '#1A1A1A', bodyColor: 'rgba(26,26,26,0.72)',
    ctaBg: '#130426', ctaColor: '#F8F4EB', hoverBorder: '2px solid #2C3777',
  },
  'clinical-trial': {
    bg: '#F29836', border: 'none',
    titleColor: '#1A1A1A', bodyColor: 'rgba(26,26,26,0.72)',
    ctaBg: '#130426', ctaColor: '#F8F4EB', hoverBorder: '2px solid #DB5835',
  },
}

// ---------------------------------------------------------------------------
// PancreaticScenarioContent — cream editorial layout for pancreatic-cancer scenario page
// ---------------------------------------------------------------------------

function PancreaticScenarioContent({ scenario, onSelectChoice, onBack }: {
  scenario: Scenario
  onSelectChoice: (choiceId: string) => void
  onBack: () => void
}) {
  const [hovered, setHovered] = useState<string | null>(null)
  const [pressed, setPressed] = useState<string | null>(null)
  const hv = "'Helvetica Neue', Helvetica, Arial, sans-serif"
  const apfel = "'ApfelGrotezk', sans-serif"

  return (
    <div style={{ background: '#F8F4EB', minHeight: '100vh' }}>

      {/* Hero band */}
      <div style={{ background: '#130426', padding: '56px 24px' }}>
        <div style={{ maxWidth: 760, margin: '0 auto' }}>
          <button onClick={onBack} style={{ fontFamily: hv, fontSize: 14, color: 'rgba(255,255,255,0.78)', background: 'none', border: 'none', cursor: 'pointer', marginBottom: 28, padding: 0, display: 'block' }}>
            ← All scenarios
          </button>
          <p style={{ fontFamily: hv, fontSize: 12, fontWeight: 500, letterSpacing: '0.04em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.78)', marginBottom: 16 }}>
            Scenario
          </p>
          <h1 style={{ fontFamily: apfel, fontSize: 48, fontWeight: 500, lineHeight: 1.1, color: '#FFFFFF', margin: 0 }}>
            {scenario.title}
          </h1>
        </div>
      </div>

      {/* Editorial description */}
      <div style={{ maxWidth: 760, margin: '0 auto', padding: '56px 24px 0' }}>
        {scenario.fullOverview.split('\n\n').map((para, i) => (
          <p key={i} style={{ fontFamily: hv, fontSize: 18, lineHeight: 1.6, color: '#1A1A1A', marginBottom: 20 }}>
            {para}
          </p>
        ))}
      </div>

      {/* Choice section */}
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 24px 80px' }}>
        <h2 style={{ fontFamily: hv, fontSize: 22, fontWeight: 600, color: '#1A1A1A', marginTop: 64, marginBottom: 28 }}>
          Choose a path to explore
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 24 }}
          className="!grid-cols-1 sm:!grid-cols-3">
          {scenario.choices.map((choice) => {
            const cs = PANCREATIC_CHOICE_STYLES[choice.id] ?? PANCREATIC_CHOICE_STYLES['aggressive-treatment']
            const isHov = hovered === choice.id
            const isPre = pressed === choice.id
            return (
              <button
                key={choice.id}
                type="button"
                onClick={() => onSelectChoice(choice.id)}
                onMouseEnter={() => setHovered(choice.id)}
                onMouseLeave={() => { setHovered(null); setPressed(null) }}
                onMouseDown={() => setPressed(choice.id)}
                onMouseUp={() => setPressed(null)}
                style={{
                  display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
                  minHeight: 180, padding: 24, borderRadius: 16, textAlign: 'left', cursor: 'pointer',
                  background: cs.bg,
                  border: isHov && !isPre ? cs.hoverBorder : cs.border || 'none',
                  boxSizing: 'border-box',
                  transform: isHov && !isPre ? 'translateY(-2px)' : 'translateY(0)',
                  boxShadow: isHov && !isPre ? '0 8px 24px rgba(0,0,0,0.08)' : '0 1px 2px rgba(0,0,0,0.02)',
                  transition: 'transform 140ms ease, box-shadow 140ms ease, border 140ms ease',
                }}
              >
                <div>
                  <p style={{ fontFamily: hv, fontSize: 18, fontWeight: 600, lineHeight: 1.35, color: cs.titleColor, margin: 0 }}>
                    {choice.label}
                  </p>
                </div>
                <div style={{ marginTop: 20 }}>
                  <span style={{ display: 'inline-block', padding: '8px 20px', borderRadius: 999, fontSize: 14, fontWeight: 500, background: cs.ctaBg, color: cs.ctaColor }}>
                    Choose →
                  </span>
                </div>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// PancreaticOutcomeContent — cream editorial layout for pancreatic-cancer outcome pages
// ---------------------------------------------------------------------------

function PancreaticOutcomeContent({ scenario, choice, onBackToScenario, onBackToAll, onSelectChoice, noteText, noteSaved, handleNoteChange, handleNoteBlur, openSourceId, toggleSource, otherChoices }: {
  scenario: Scenario
  choice: ScenarioChoice
  onBackToScenario: () => void
  onBackToAll: () => void
  onSelectChoice: (choiceId: string) => void
  noteText: string
  noteSaved: boolean
  handleNoteChange: (val: string) => void
  handleNoteBlur: () => void
  openSourceId: string | null
  toggleSource: (id: string) => void
  otherChoices: ScenarioChoice[]
}) {
  const hv = "'Helvetica Neue', Helvetica, Arial, sans-serif"
  const apfel = "'ApfelGrotezk', sans-serif"
  const [showVoice, setShowVoice] = useState(false)

  return (
    <div style={{ background: '#F8F4EB', minHeight: '100vh' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '48px 24px 96px' }}>

        {/* Breadcrumb */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 40, fontSize: 14, fontFamily: hv, flexWrap: 'wrap' }}>
          <button onClick={onBackToAll} style={{ color: 'rgba(26,26,26,0.55)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
            All scenarios
          </button>
          <span style={{ color: 'rgba(26,26,26,0.35)' }}>/</span>
          <button onClick={onBackToScenario} style={{ color: 'rgba(26,26,26,0.55)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontFamily: hv, fontSize: 14 }}
            className="hover:text-[#1A1A1A] transition-colors">
            {scenario.title}
          </button>
          <span style={{ color: 'rgba(26,26,26,0.35)' }}>/</span>
          <span style={{ color: '#1A1A1A', fontWeight: 500 }}>{choice.outcomeTitle}</span>
        </div>

        {/* "You chose" + title */}
        <div style={{ marginBottom: 48 }}>
          <p style={{ fontFamily: hv, fontSize: 12, fontWeight: 500, letterSpacing: '0.04em', textTransform: 'uppercase', color: '#130426', marginBottom: 12 }}>
            You chose
          </p>
          <h1 style={{ fontFamily: apfel, fontSize: 48, fontWeight: 500, lineHeight: 1.1, color: '#1A1A1A', margin: 0 }}>
            {choice.label}
          </h1>
        </div>

        {/* Two-column: left = narrative + DYK, right = reflection */}
        <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: 48, alignItems: 'start' }}
          className="!grid-cols-1 sm:!grid-cols-[1.5fr_1fr]">

          {/* Left column */}
          <div>
            {choice.summary.length > 0 && (
              <div style={{ marginBottom: 32 }}>
                {choice.summary.map((para, i) => (
                  <p key={i} style={{ fontFamily: hv, fontSize: 18, lineHeight: 1.6, color: '#1A1A1A', marginBottom: 20 }}>
                    {para}
                  </p>
                ))}
              </div>
            )}

            {choice.didYouKnow.length > 0 && (
              <div style={{ background: '#FFFFFF', border: '1px solid rgba(26,26,26,0.12)', borderRadius: 16, padding: 24 }}>
                <p style={{ fontFamily: hv, fontSize: 12, fontWeight: 500, letterSpacing: '0.04em', textTransform: 'uppercase', color: '#DB5835', marginBottom: 16 }}>
                  Did you know?
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  {choice.didYouKnow.map((block, i) => {
                    const source = block.sourceId ? SOURCES[block.sourceId] : null
                    const isOpen = source && openSourceId === block.sourceId
                    return (
                      <div key={i}>
                        <p style={{ fontFamily: hv, fontSize: 16, lineHeight: 1.55, color: 'rgba(26,26,26,0.72)', margin: 0 }}>
                          {block.text}
                          {source && (
                            <button type="button" onClick={() => toggleSource(block.sourceId!)}
                              style={{ marginLeft: 6, fontSize: 12, color: '#2C3777', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline', textUnderlineOffset: 2, fontFamily: hv }}>
                              source
                            </button>
                          )}
                        </p>
                        {isOpen && (
                          <div style={{ marginTop: 10, background: '#F8F4EB', borderRadius: 8, padding: '12px 14px' }}>
                            <p style={{ fontFamily: hv, fontSize: 13, color: '#130426', marginBottom: 8 }}>{source.shortLabel}</p>
                            <Link href="/app/explore/scenario-navigator/sources" style={{ fontFamily: hv, fontSize: 13, color: '#2C3777', fontWeight: 600 }}>
                              View all sources →
                            </Link>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Right column — Reflection */}
          {choice.reflectionQuestions.length > 0 && (
            <div style={{ background: 'rgba(26,26,26,0.035)', border: '1px solid rgba(26,26,26,0.12)', borderRadius: 16, padding: 24, marginTop: -8 }}>
              <h3 style={{ fontFamily: hv, fontSize: 22, fontWeight: 500, color: '#1A1A1A', marginBottom: 16 }}>
                Reflection
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {choice.reflectionQuestions.map((q, i) => (
                  <p key={i} style={{ fontFamily: hv, fontSize: 16, lineHeight: 1.55, color: '#1A1A1A', margin: 0 }}>{q}</p>
                ))}
              </div>
              <textarea
                value={noteText}
                onChange={(e) => handleNoteChange(e.target.value)}
                onBlur={handleNoteBlur}
                placeholder="Write anything that comes up for you…"
                rows={4}
                style={{
                  display: 'block', width: '100%', background: '#FFFFFF',
                  border: '1px solid rgba(26,26,26,0.16)', borderRadius: 12,
                  padding: 16, fontSize: 15, lineHeight: 1.5, color: '#1A1A1A',
                  resize: 'none', outline: 'none', boxSizing: 'border-box',
                  fontFamily: hv, marginTop: 22,
                }}
                className="placeholder:text-[#1A1A1A]/36 focus:border-[#2C3777] focus:shadow-[0_0_0_3px_rgba(44,55,119,0.18)] transition-shadow"
              />
              <p style={{ fontFamily: hv, fontSize: 13, color: 'rgba(26,26,26,0.72)', marginTop: 6, minHeight: 18 }}>
                {noteSaved ? 'Saved' : ''}
              </p>
              <div style={{ marginTop: 12 }}>
                {showVoice ? (
                  <VoiceNoteButton
                    saveMode={{ kind: 'freeform' }}
                    theme="light"
                    autoStart
                    onSaved={() => setShowVoice(false)}
                    onDelete={() => setShowVoice(false)}
                  />
                ) : (
                  <button
                    type="button"
                    onClick={() => setShowVoice(true)}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontFamily: hv, fontSize: 13, color: 'rgba(26,26,26,0.55)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                  >
                    <svg width="11" height="15" viewBox="0 0 12 16" fill="none" aria-hidden>
                      <rect x="2.5" y="0.5" width="7" height="9" rx="3.5" fill="currentColor" />
                      <path d="M0.5 8c0 2.76 2.24 5 5.5 5s5.5-2.24 5.5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" fill="none" />
                      <line x1="6" y1="13" x2="6" y2="15.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                      <line x1="3.5" y1="15.5" x2="8.5" y2="15.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                    </svg>
                    Record a voice response instead
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Action section */}
        <div style={{ borderTop: '2px solid rgba(26,26,26,0.22)', marginTop: 80, paddingTop: 48 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '5fr 4fr', gap: 24 }}
            className="!grid-cols-1 sm:!grid-cols-[5fr_4fr]">

            {otherChoices.length > 0 && (
              <div style={{ background: '#BBABF4', borderRadius: 20, padding: 28 }}>
                <h3 style={{ fontFamily: hv, fontSize: 22, fontWeight: 500, color: '#1A1A1A', marginBottom: 20 }}>
                  Explore other paths
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                  {otherChoices.map((c) => (
                    <button key={c.id} type="button" onClick={() => onSelectChoice(c.id)}
                      style={{
                        fontFamily: hv, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        gap: 12, textAlign: 'left', fontSize: 16, fontWeight: 500,
                        lineHeight: 1.45, color: '#130426', background: '#FFFFFF',
                        border: '1px solid transparent', borderRadius: 12, cursor: 'pointer',
                        padding: 16, boxShadow: '0 1px 2px rgba(0,0,0,0.04)', width: '100%',
                      }}
                      className="hover:border-[#2C3777] hover:shadow-md transition-all"
                    >
                      <span>{c.label}</span>
                      <span style={{ flexShrink: 0, color: 'rgba(19,4,38,0.45)', fontSize: 14 }}>→</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {choice.resources.length > 0 && (
              <div style={{ background: '#F29836', borderRadius: 20, padding: 32, display: 'flex', flexDirection: 'column' }}>
                <h3 style={{ fontFamily: hv, fontSize: 22, fontWeight: 500, color: '#1A1A1A', marginBottom: 12 }}>
                  Additional resources
                </h3>
                <p style={{ fontFamily: hv, fontSize: 15, lineHeight: 1.55, color: 'rgba(26,26,26,0.75)', flex: 1, marginBottom: 0 }}>
                  Guidance and clinical information for this situation.
                </p>
                {choice.resources.map((r, i) => r.url ? (
                  <a key={i} href={r.url} target="_blank" rel="noopener noreferrer"
                    style={{
                      display: 'inline-flex', alignItems: 'center', height: 48,
                      background: '#2C3777', color: '#FFFFFF', fontFamily: hv,
                      fontSize: 14, fontWeight: 500, paddingLeft: 24, paddingRight: 24,
                      borderRadius: 999, textDecoration: 'none', marginTop: 32,
                      width: 'fit-content',
                    }}>
                    View resource →
                  </a>
                ) : (
                  <span key={i} style={{ fontFamily: hv, fontSize: 14, color: '#1A1A1A', marginTop: 32 }}>{r.label}</span>
                ))}
              </div>
            )}

          </div>

          <div style={{ marginTop: 22 }}>
            <button type="button" onClick={onBackToAll}
              style={{ fontFamily: hv, fontSize: 14, fontWeight: 500, color: '#FFFFFF', background: '#2C3777', border: 'none', borderRadius: 999, padding: '10px 20px', cursor: 'pointer' }}
              className="hover:opacity-85 transition-opacity"
            >
              ← All scenarios
            </button>
          </div>
        </div>

      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Cognitive decline-specific constants
// ---------------------------------------------------------------------------

const COGNITIVE_DECLINE_CHOICE_STYLES: Record<string, { bg: string; border: string; titleColor: string; bodyColor: string; ctaBg: string; ctaColor: string; hoverBorder: string }> = {
  'aggressive-treatment': {
    bg: '#2C3777', border: 'none',
    titleColor: '#FFFFFF', bodyColor: 'rgba(255,255,255,0.78)',
    ctaBg: '#F8F4EB', ctaColor: '#130426', hoverBorder: '2px solid #BBABF4',
  },
  'comfort-care': {
    bg: '#BBABF4', border: 'none',
    titleColor: '#1A1A1A', bodyColor: 'rgba(26,26,26,0.72)',
    ctaBg: '#130426', ctaColor: '#F8F4EB', hoverBorder: '2px solid #2C3777',
  },
  'long-term-care': {
    bg: '#DB5835', border: 'none',
    titleColor: '#FFFFFF', bodyColor: 'rgba(255,255,255,0.82)',
    ctaBg: '#F8F4EB', ctaColor: '#1A1A1A', hoverBorder: '2px solid #F8F4EB',
  },
}

// ---------------------------------------------------------------------------
// CognitiveDeclineScenarioContent — cream editorial layout for cognitive-decline scenario page
// ---------------------------------------------------------------------------

function CognitiveDeclineScenarioContent({ scenario, onSelectChoice, onBack }: {
  scenario: Scenario
  onSelectChoice: (choiceId: string) => void
  onBack: () => void
}) {
  const [hovered, setHovered] = useState<string | null>(null)
  const [pressed, setPressed] = useState<string | null>(null)
  const hv = "'Helvetica Neue', Helvetica, Arial, sans-serif"
  const apfel = "'ApfelGrotezk', sans-serif"

  return (
    <div style={{ background: '#F8F4EB', minHeight: '100vh' }}>

      {/* Hero band */}
      <div style={{ background: '#F29836', padding: '56px 24px' }}>
        <div style={{ maxWidth: 760, margin: '0 auto' }}>
          <button onClick={onBack} style={{ fontFamily: hv, fontSize: 14, color: 'rgba(26,26,26,0.72)', background: 'none', border: 'none', cursor: 'pointer', marginBottom: 28, padding: 0, display: 'block' }}>
            ← All scenarios
          </button>
          <p style={{ fontFamily: hv, fontSize: 12, fontWeight: 500, letterSpacing: '0.04em', textTransform: 'uppercase', color: 'rgba(26,26,26,0.72)', marginBottom: 16 }}>
            Scenario
          </p>
          <h1 style={{ fontFamily: apfel, fontSize: 48, fontWeight: 500, lineHeight: 1.1, color: '#1A1A1A', margin: 0 }}>
            {scenario.title}
          </h1>
        </div>
      </div>

      {/* Editorial description */}
      <div style={{ maxWidth: 760, margin: '0 auto', padding: '56px 24px 0' }}>
        {scenario.fullOverview.split('\n\n').map((para, i) => (
          <p key={i} style={{ fontFamily: hv, fontSize: 18, lineHeight: 1.6, color: '#1A1A1A', marginBottom: 20 }}>
            {para}
          </p>
        ))}
      </div>

      {/* Choice section */}
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 24px 80px' }}>
        <h2 style={{ fontFamily: hv, fontSize: 22, fontWeight: 600, color: '#1A1A1A', marginTop: 64, marginBottom: 28 }}>
          Choose a path to explore
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 24 }}
          className="!grid-cols-1 sm:!grid-cols-3">
          {scenario.choices.map((choice) => {
            const cs = COGNITIVE_DECLINE_CHOICE_STYLES[choice.id] ?? COGNITIVE_DECLINE_CHOICE_STYLES['aggressive-treatment']
            const isHov = hovered === choice.id
            const isPre = pressed === choice.id
            return (
              <button
                key={choice.id}
                type="button"
                onClick={() => onSelectChoice(choice.id)}
                onMouseEnter={() => setHovered(choice.id)}
                onMouseLeave={() => { setHovered(null); setPressed(null) }}
                onMouseDown={() => setPressed(choice.id)}
                onMouseUp={() => setPressed(null)}
                style={{
                  display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
                  minHeight: 180, padding: 24, borderRadius: 16, textAlign: 'left', cursor: 'pointer',
                  background: cs.bg,
                  border: isHov && !isPre ? cs.hoverBorder : cs.border || 'none',
                  boxSizing: 'border-box',
                  transform: isHov && !isPre ? 'translateY(-2px)' : 'translateY(0)',
                  boxShadow: isHov && !isPre ? '0 8px 24px rgba(0,0,0,0.08)' : '0 1px 2px rgba(0,0,0,0.02)',
                  transition: 'transform 140ms ease, box-shadow 140ms ease, border 140ms ease',
                }}
              >
                <div>
                  <p style={{ fontFamily: hv, fontSize: 18, fontWeight: 600, lineHeight: 1.35, color: cs.titleColor, margin: 0 }}>
                    {choice.label}
                  </p>
                </div>
                <div style={{ marginTop: 20 }}>
                  <span style={{ display: 'inline-block', padding: '8px 20px', borderRadius: 999, fontSize: 14, fontWeight: 500, background: cs.ctaBg, color: cs.ctaColor }}>
                    Choose →
                  </span>
                </div>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// CognitiveDeclineOutcomeContent — cream editorial layout for cognitive-decline outcome pages
// ---------------------------------------------------------------------------

function CognitiveDeclineOutcomeContent({ scenario, choice, onBackToScenario, onBackToAll, onSelectChoice, noteText, noteSaved, handleNoteChange, handleNoteBlur, openSourceId, toggleSource, otherChoices }: {
  scenario: Scenario
  choice: ScenarioChoice
  onBackToScenario: () => void
  onBackToAll: () => void
  onSelectChoice: (choiceId: string) => void
  noteText: string
  noteSaved: boolean
  handleNoteChange: (val: string) => void
  handleNoteBlur: () => void
  openSourceId: string | null
  toggleSource: (id: string) => void
  otherChoices: ScenarioChoice[]
}) {
  const hv = "'Helvetica Neue', Helvetica, Arial, sans-serif"
  const apfel = "'ApfelGrotezk', sans-serif"
  const [showVoice, setShowVoice] = useState(false)

  return (
    <div style={{ background: '#F8F4EB', minHeight: '100vh' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '48px 24px 96px' }}>

        {/* Breadcrumb */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 40, fontSize: 14, fontFamily: hv, flexWrap: 'wrap' }}>
          <button onClick={onBackToAll} style={{ color: 'rgba(26,26,26,0.55)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
            All scenarios
          </button>
          <span style={{ color: 'rgba(26,26,26,0.35)' }}>/</span>
          <button onClick={onBackToScenario} style={{ color: 'rgba(26,26,26,0.55)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontFamily: hv, fontSize: 14 }}
            className="hover:text-[#1A1A1A] transition-colors">
            {scenario.title}
          </button>
          <span style={{ color: 'rgba(26,26,26,0.35)' }}>/</span>
          <span style={{ color: '#1A1A1A', fontWeight: 500 }}>{choice.outcomeTitle}</span>
        </div>

        {/* "You chose" + title */}
        <div style={{ marginBottom: 48 }}>
          <p style={{ fontFamily: hv, fontSize: 12, fontWeight: 500, letterSpacing: '0.04em', textTransform: 'uppercase', color: '#F29836', marginBottom: 12 }}>
            You chose
          </p>
          <h1 style={{ fontFamily: apfel, fontSize: 48, fontWeight: 500, lineHeight: 1.1, color: '#1A1A1A', margin: 0 }}>
            {choice.label}
          </h1>
        </div>

        {/* Two-column: left = narrative + DYK, right = reflection */}
        <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: 48, alignItems: 'start' }}
          className="!grid-cols-1 sm:!grid-cols-[1.5fr_1fr]">

          {/* Left column */}
          <div>
            {choice.summary.length > 0 && (
              <div style={{ marginBottom: 32 }}>
                {choice.summary.map((para, i) => (
                  <p key={i} style={{ fontFamily: hv, fontSize: 18, lineHeight: 1.6, color: '#1A1A1A', marginBottom: 20 }}>
                    {para}
                  </p>
                ))}
              </div>
            )}

            {choice.didYouKnow.length > 0 && (
              <div style={{ background: '#FFFFFF', border: '1px solid rgba(26,26,26,0.12)', borderRadius: 16, padding: 24 }}>
                <p style={{ fontFamily: hv, fontSize: 12, fontWeight: 500, letterSpacing: '0.04em', textTransform: 'uppercase', color: '#DB5835', marginBottom: 16 }}>
                  Did you know?
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  {choice.didYouKnow.map((block, i) => {
                    const source = block.sourceId ? SOURCES[block.sourceId] : null
                    const isOpen = source && openSourceId === block.sourceId
                    return (
                      <div key={i}>
                        <p style={{ fontFamily: hv, fontSize: 16, lineHeight: 1.55, color: 'rgba(26,26,26,0.72)', margin: 0 }}>
                          {block.text}
                          {source && (
                            <button type="button" onClick={() => toggleSource(block.sourceId!)}
                              style={{ marginLeft: 6, fontSize: 12, color: '#2C3777', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline', textUnderlineOffset: 2, fontFamily: hv }}>
                              source
                            </button>
                          )}
                        </p>
                        {isOpen && (
                          <div style={{ marginTop: 10, background: '#F8F4EB', borderRadius: 8, padding: '12px 14px' }}>
                            <p style={{ fontFamily: hv, fontSize: 13, color: '#130426', marginBottom: 8 }}>{source.shortLabel}</p>
                            <Link href="/app/explore/scenario-navigator/sources" style={{ fontFamily: hv, fontSize: 13, color: '#2C3777', fontWeight: 600 }}>
                              View all sources →
                            </Link>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Right column — Reflection */}
          {choice.reflectionQuestions.length > 0 && (
            <div style={{ background: 'rgba(26,26,26,0.035)', border: '1px solid rgba(26,26,26,0.12)', borderRadius: 16, padding: 24, marginTop: -8 }}>
              <h3 style={{ fontFamily: hv, fontSize: 22, fontWeight: 500, color: '#1A1A1A', marginBottom: 16 }}>
                Reflection
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {choice.reflectionQuestions.map((q, i) => (
                  <p key={i} style={{ fontFamily: hv, fontSize: 16, lineHeight: 1.55, color: '#1A1A1A', margin: 0 }}>{q}</p>
                ))}
              </div>
              <textarea
                value={noteText}
                onChange={(e) => handleNoteChange(e.target.value)}
                onBlur={handleNoteBlur}
                placeholder="Write anything that comes up for you…"
                rows={4}
                style={{
                  display: 'block', width: '100%', background: '#FFFFFF',
                  border: '1px solid rgba(26,26,26,0.16)', borderRadius: 12,
                  padding: 16, fontSize: 15, lineHeight: 1.5, color: '#1A1A1A',
                  resize: 'none', outline: 'none', boxSizing: 'border-box',
                  fontFamily: hv, marginTop: 22,
                }}
                className="placeholder:text-[#1A1A1A]/36 focus:border-[#2C3777] focus:shadow-[0_0_0_3px_rgba(44,55,119,0.18)] transition-shadow"
              />
              <p style={{ fontFamily: hv, fontSize: 13, color: 'rgba(26,26,26,0.72)', marginTop: 6, minHeight: 18 }}>
                {noteSaved ? 'Saved' : ''}
              </p>
              <div style={{ marginTop: 12 }}>
                {showVoice ? (
                  <VoiceNoteButton
                    saveMode={{ kind: 'freeform' }}
                    theme="light"
                    autoStart
                    onSaved={() => setShowVoice(false)}
                    onDelete={() => setShowVoice(false)}
                  />
                ) : (
                  <button
                    type="button"
                    onClick={() => setShowVoice(true)}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontFamily: hv, fontSize: 13, color: 'rgba(26,26,26,0.55)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                  >
                    <svg width="11" height="15" viewBox="0 0 12 16" fill="none" aria-hidden>
                      <rect x="2.5" y="0.5" width="7" height="9" rx="3.5" fill="currentColor" />
                      <path d="M0.5 8c0 2.76 2.24 5 5.5 5s5.5-2.24 5.5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" fill="none" />
                      <line x1="6" y1="13" x2="6" y2="15.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                      <line x1="3.5" y1="15.5" x2="8.5" y2="15.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                    </svg>
                    Record a voice response instead
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Action section */}
        <div style={{ borderTop: '2px solid rgba(26,26,26,0.22)', marginTop: 80, paddingTop: 48 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '5fr 4fr', gap: 24 }}
            className="!grid-cols-1 sm:!grid-cols-[5fr_4fr]">

            {otherChoices.length > 0 && (
              <div style={{ background: '#BBABF4', borderRadius: 20, padding: 28 }}>
                <h3 style={{ fontFamily: hv, fontSize: 22, fontWeight: 500, color: '#1A1A1A', marginBottom: 20 }}>
                  Explore other paths
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                  {otherChoices.map((c) => (
                    <button key={c.id} type="button" onClick={() => onSelectChoice(c.id)}
                      style={{
                        fontFamily: hv, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        gap: 12, textAlign: 'left', fontSize: 16, fontWeight: 500,
                        lineHeight: 1.45, color: '#130426', background: '#FFFFFF',
                        border: '1px solid transparent', borderRadius: 12, cursor: 'pointer',
                        padding: 16, boxShadow: '0 1px 2px rgba(0,0,0,0.04)', width: '100%',
                      }}
                      className="hover:border-[#2C3777] hover:shadow-md transition-all"
                    >
                      <span>{c.label}</span>
                      <span style={{ flexShrink: 0, color: 'rgba(19,4,38,0.45)', fontSize: 14 }}>→</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {choice.resources.length > 0 && (
              <div style={{ background: '#F29836', borderRadius: 20, padding: 32, display: 'flex', flexDirection: 'column' }}>
                <h3 style={{ fontFamily: hv, fontSize: 22, fontWeight: 500, color: '#1A1A1A', marginBottom: 12 }}>
                  Additional resources
                </h3>
                <p style={{ fontFamily: hv, fontSize: 15, lineHeight: 1.55, color: 'rgba(26,26,26,0.75)', flex: 1, marginBottom: 0 }}>
                  Guidance and clinical information for this situation.
                </p>
                {choice.resources.map((r, i) => r.url ? (
                  <a key={i} href={r.url} target="_blank" rel="noopener noreferrer"
                    style={{
                      display: 'inline-flex', alignItems: 'center', height: 48,
                      background: '#2C3777', color: '#FFFFFF', fontFamily: hv,
                      fontSize: 14, fontWeight: 500, paddingLeft: 24, paddingRight: 24,
                      borderRadius: 999, textDecoration: 'none', marginTop: 32,
                      width: 'fit-content',
                    }}>
                    View resource →
                  </a>
                ) : (
                  <span key={i} style={{ fontFamily: hv, fontSize: 14, color: '#1A1A1A', marginTop: 32 }}>{r.label}</span>
                ))}
              </div>
            )}

          </div>

          <div style={{ marginTop: 22 }}>
            <button type="button" onClick={onBackToAll}
              style={{ fontFamily: hv, fontSize: 14, fontWeight: 500, color: '#FFFFFF', background: '#2C3777', border: 'none', borderRadius: 999, padding: '10px 20px', cursor: 'pointer' }}
              className="hover:opacity-85 transition-opacity"
            >
              ← All scenarios
            </button>
          </div>
        </div>

      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// CPRScenarioContent — cream editorial layout for cpr-decision scenario page
// ---------------------------------------------------------------------------

function CPRScenarioContent({ scenario, onSelectChoice, onBack }: {
  scenario: Scenario
  onSelectChoice: (choiceId: string) => void
  onBack: () => void
}) {
  const [hovered, setHovered] = useState<string | null>(null)
  const [pressed, setPressed] = useState<string | null>(null)
  const hv = "'Helvetica Neue', Helvetica, Arial, sans-serif"
  const apfel = "'ApfelGrotezk', sans-serif"

  return (
    <div style={{ background: '#F8F4EB', minHeight: '100vh' }}>

      {/* Hero band */}
      <div style={{ background: '#DB5835', padding: '56px 24px' }}>
        <div style={{ maxWidth: 760, margin: '0 auto' }}>
          <button onClick={onBack} style={{ fontFamily: hv, fontSize: 14, color: 'rgba(255,255,255,0.78)', background: 'none', border: 'none', cursor: 'pointer', marginBottom: 28, padding: 0, display: 'block' }}>
            ← All scenarios
          </button>
          <p style={{ fontFamily: hv, fontSize: 12, fontWeight: 500, letterSpacing: '0.04em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.78)', marginBottom: 16 }}>
            Scenario
          </p>
          <h1 style={{ fontFamily: apfel, fontSize: 48, fontWeight: 500, lineHeight: 1.1, color: '#FFFFFF', margin: 0 }}>
            {scenario.title}
          </h1>
        </div>
      </div>

      {/* Editorial description */}
      <div style={{ maxWidth: 760, margin: '0 auto', padding: '56px 24px 0' }}>
        {scenario.fullOverview.split('\n\n').map((para, i) => (
          <p key={i} style={{ fontFamily: hv, fontSize: 18, lineHeight: 1.6, color: '#1A1A1A', marginBottom: 20 }}>
            {para}
          </p>
        ))}
      </div>

      {/* Choice section */}
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 24px 80px' }}>
        <h2 style={{ fontFamily: hv, fontSize: 22, fontWeight: 600, color: '#1A1A1A', marginTop: 64, marginBottom: 28 }}>
          Choose a path to explore
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 24 }}
          className="!grid-cols-1 sm:!grid-cols-2">
          {scenario.choices.map((choice) => {
            const cs = CPR_CHOICE_STYLES[choice.id] ?? CPR_CHOICE_STYLES['full-resuscitation']
            const isHov = hovered === choice.id
            const isPre = pressed === choice.id
            return (
              <button
                key={choice.id}
                type="button"
                onClick={() => onSelectChoice(choice.id)}
                onMouseEnter={() => setHovered(choice.id)}
                onMouseLeave={() => { setHovered(null); setPressed(null) }}
                onMouseDown={() => setPressed(choice.id)}
                onMouseUp={() => setPressed(null)}
                style={{
                  display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
                  minHeight: 180, padding: 24, borderRadius: 16, textAlign: 'left', cursor: 'pointer',
                  background: cs.bg,
                  border: isHov && !isPre ? cs.hoverBorder : cs.border || 'none',
                  boxSizing: 'border-box',
                  transform: isHov && !isPre ? 'translateY(-2px)' : 'translateY(0)',
                  boxShadow: isHov && !isPre ? '0 8px 24px rgba(0,0,0,0.08)' : '0 1px 2px rgba(0,0,0,0.02)',
                  transition: 'transform 140ms ease, box-shadow 140ms ease, border 140ms ease',
                }}
              >
                <div>
                  <p style={{ fontFamily: hv, fontSize: 18, fontWeight: 600, lineHeight: 1.35, color: cs.titleColor, margin: 0 }}>
                    {choice.label}
                  </p>
                </div>
                <div style={{ marginTop: 20 }}>
                  <span style={{ display: 'inline-block', padding: '8px 20px', borderRadius: 999, fontSize: 14, fontWeight: 500, background: cs.ctaBg, color: cs.ctaColor }}>
                    Choose →
                  </span>
                </div>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// CPROutcomeContent — cream editorial layout for cpr-decision outcome pages
// ---------------------------------------------------------------------------

function CPROutcomeContent({ scenario, choice, onBackToScenario, onBackToAll, onSelectChoice, noteText, noteSaved, handleNoteChange, handleNoteBlur, openSourceId, toggleSource, otherChoices }: {
  scenario: Scenario
  choice: ScenarioChoice
  onBackToScenario: () => void
  onBackToAll: () => void
  onSelectChoice: (choiceId: string) => void
  noteText: string
  noteSaved: boolean
  handleNoteChange: (val: string) => void
  handleNoteBlur: () => void
  openSourceId: string | null
  toggleSource: (id: string) => void
  otherChoices: ScenarioChoice[]
}) {
  const hv = "'Helvetica Neue', Helvetica, Arial, sans-serif"
  const apfel = "'ApfelGrotezk', sans-serif"
  const [showVoice, setShowVoice] = useState(false)

  return (
    <div style={{ background: '#F8F4EB', minHeight: '100vh' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '48px 24px 96px' }}>

        {/* Breadcrumb */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 40, fontSize: 14, fontFamily: hv, flexWrap: 'wrap' }}>
          <button onClick={onBackToAll} style={{ color: 'rgba(26,26,26,0.55)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
            All scenarios
          </button>
          <span style={{ color: 'rgba(26,26,26,0.35)' }}>/</span>
          <button onClick={onBackToScenario} style={{ color: 'rgba(26,26,26,0.55)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontFamily: hv, fontSize: 14 }}
            className="hover:text-[#1A1A1A] transition-colors">
            {scenario.title}
          </button>
          <span style={{ color: 'rgba(26,26,26,0.35)' }}>/</span>
          <span style={{ color: '#1A1A1A', fontWeight: 500 }}>{choice.outcomeTitle}</span>
        </div>

        {/* "You chose" + title */}
        <div style={{ marginBottom: 48 }}>
          <p style={{ fontFamily: hv, fontSize: 12, fontWeight: 500, letterSpacing: '0.04em', textTransform: 'uppercase', color: '#DB5835', marginBottom: 12 }}>
            You chose
          </p>
          <h1 style={{ fontFamily: apfel, fontSize: 48, fontWeight: 500, lineHeight: 1.1, color: '#1A1A1A', margin: 0 }}>
            {choice.label}
          </h1>
        </div>

        {/* Two-column: left = narrative + DYK, right = reflection */}
        <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: 48, alignItems: 'start' }}
          className="!grid-cols-1 sm:!grid-cols-[1.5fr_1fr]">

          {/* Left column */}
          <div>
            {choice.summary.length > 0 && (
              <div style={{ marginBottom: 32 }}>
                {choice.summary.map((para, i) => (
                  <p key={i} style={{ fontFamily: hv, fontSize: 18, lineHeight: 1.6, color: '#1A1A1A', marginBottom: 20 }}>
                    {para}
                  </p>
                ))}
              </div>
            )}

            {choice.didYouKnow.length > 0 && (
              <div style={{ background: '#FFFFFF', border: '1px solid rgba(26,26,26,0.12)', borderRadius: 16, padding: 24 }}>
                <p style={{ fontFamily: hv, fontSize: 12, fontWeight: 500, letterSpacing: '0.04em', textTransform: 'uppercase', color: '#DB5835', marginBottom: 16 }}>
                  Did you know?
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  {choice.didYouKnow.map((block, i) => {
                    const source = block.sourceId ? SOURCES[block.sourceId] : null
                    const isOpen = source && openSourceId === block.sourceId
                    return (
                      <div key={i}>
                        <p style={{ fontFamily: hv, fontSize: 16, lineHeight: 1.55, color: 'rgba(26,26,26,0.72)', margin: 0 }}>
                          {block.text}
                          {source && (
                            <button type="button" onClick={() => toggleSource(block.sourceId!)}
                              style={{ marginLeft: 6, fontSize: 12, color: '#2C3777', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline', textUnderlineOffset: 2, fontFamily: hv }}>
                              source
                            </button>
                          )}
                        </p>
                        {isOpen && (
                          <div style={{ marginTop: 10, background: '#F8F4EB', borderRadius: 8, padding: '12px 14px' }}>
                            <p style={{ fontFamily: hv, fontSize: 13, color: '#130426', marginBottom: 8 }}>{source.shortLabel}</p>
                            <Link href="/app/explore/scenario-navigator/sources" style={{ fontFamily: hv, fontSize: 13, color: '#2C3777', fontWeight: 600 }}>
                              View all sources →
                            </Link>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Right column — Reflection */}
          {choice.reflectionQuestions.length > 0 && (
            <div style={{ background: 'rgba(26,26,26,0.035)', border: '1px solid rgba(26,26,26,0.12)', borderRadius: 16, padding: 24, marginTop: -8 }}>
              <h3 style={{ fontFamily: hv, fontSize: 22, fontWeight: 500, color: '#1A1A1A', marginBottom: 16 }}>
                Reflection
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {choice.reflectionQuestions.map((q, i) => (
                  <p key={i} style={{ fontFamily: hv, fontSize: 16, lineHeight: 1.55, color: '#1A1A1A', margin: 0 }}>{q}</p>
                ))}
              </div>
              <textarea
                value={noteText}
                onChange={(e) => handleNoteChange(e.target.value)}
                onBlur={handleNoteBlur}
                placeholder="Write anything that comes up for you…"
                rows={4}
                style={{
                  display: 'block', width: '100%', background: '#FFFFFF',
                  border: '1px solid rgba(26,26,26,0.16)', borderRadius: 12,
                  padding: 16, fontSize: 15, lineHeight: 1.5, color: '#1A1A1A',
                  resize: 'none', outline: 'none', boxSizing: 'border-box',
                  fontFamily: hv, marginTop: 22,
                }}
                className="placeholder:text-[#1A1A1A]/36 focus:border-[#2C3777] focus:shadow-[0_0_0_3px_rgba(44,55,119,0.18)] transition-shadow"
              />
              <p style={{ fontFamily: hv, fontSize: 13, color: 'rgba(26,26,26,0.72)', marginTop: 6, minHeight: 18 }}>
                {noteSaved ? 'Saved' : ''}
              </p>
              <div style={{ marginTop: 12 }}>
                {showVoice ? (
                  <VoiceNoteButton
                    saveMode={{ kind: 'freeform' }}
                    theme="light"
                    autoStart
                    onSaved={() => setShowVoice(false)}
                    onDelete={() => setShowVoice(false)}
                  />
                ) : (
                  <button
                    type="button"
                    onClick={() => setShowVoice(true)}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontFamily: hv, fontSize: 13, color: 'rgba(26,26,26,0.55)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                  >
                    <svg width="11" height="15" viewBox="0 0 12 16" fill="none" aria-hidden>
                      <rect x="2.5" y="0.5" width="7" height="9" rx="3.5" fill="currentColor" />
                      <path d="M0.5 8c0 2.76 2.24 5 5.5 5s5.5-2.24 5.5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" fill="none" />
                      <line x1="6" y1="13" x2="6" y2="15.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                      <line x1="3.5" y1="15.5" x2="8.5" y2="15.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                    </svg>
                    Record a voice response instead
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Action section */}
        <div style={{ borderTop: '2px solid rgba(26,26,26,0.22)', marginTop: 80, paddingTop: 48 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '5fr 4fr', gap: 24 }}
            className="!grid-cols-1 sm:!grid-cols-[5fr_4fr]">

            {otherChoices.length > 0 && (
              <div style={{ background: '#BBABF4', borderRadius: 20, padding: 28 }}>
                <h3 style={{ fontFamily: hv, fontSize: 22, fontWeight: 500, color: '#1A1A1A', marginBottom: 20 }}>
                  Explore other paths
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                  {otherChoices.map((c) => (
                    <button key={c.id} type="button" onClick={() => onSelectChoice(c.id)}
                      style={{
                        fontFamily: hv, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        gap: 12, textAlign: 'left', fontSize: 16, fontWeight: 500,
                        lineHeight: 1.45, color: '#130426', background: '#FFFFFF',
                        border: '1px solid transparent', borderRadius: 12, cursor: 'pointer',
                        padding: 16, boxShadow: '0 1px 2px rgba(0,0,0,0.04)', width: '100%',
                      }}
                      className="hover:border-[#2C3777] hover:shadow-md transition-all"
                    >
                      <span>{c.label}</span>
                      <span style={{ flexShrink: 0, color: 'rgba(19,4,38,0.45)', fontSize: 14 }}>→</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {choice.resources.length > 0 && (
              <div style={{ background: '#F29836', borderRadius: 20, padding: 32, display: 'flex', flexDirection: 'column' }}>
                <h3 style={{ fontFamily: hv, fontSize: 22, fontWeight: 500, color: '#1A1A1A', marginBottom: 12 }}>
                  Additional resources
                </h3>
                <p style={{ fontFamily: hv, fontSize: 15, lineHeight: 1.55, color: 'rgba(26,26,26,0.75)', flex: 1, marginBottom: 0 }}>
                  Guidance and clinical information for this situation.
                </p>
                {choice.resources.map((r, i) => r.url ? (
                  <a key={i} href={r.url} target="_blank" rel="noopener noreferrer"
                    style={{
                      display: 'inline-flex', alignItems: 'center', height: 48,
                      background: '#2C3777', color: '#FFFFFF', fontFamily: hv,
                      fontSize: 14, fontWeight: 500, paddingLeft: 24, paddingRight: 24,
                      borderRadius: 999, textDecoration: 'none', marginTop: 32,
                      width: 'fit-content',
                    }}>
                    View resource →
                  </a>
                ) : (
                  <span key={i} style={{ fontFamily: hv, fontSize: 14, color: '#1A1A1A', marginTop: 32 }}>{r.label}</span>
                ))}
              </div>
            )}

          </div>

          <div style={{ marginTop: 22 }}>
            <button type="button" onClick={onBackToAll}
              style={{ fontFamily: hv, fontSize: 14, fontWeight: 500, color: '#FFFFFF', background: '#2C3777', border: 'none', borderRadius: 999, padding: '10px 20px', cursor: 'pointer' }}
              className="hover:opacity-85 transition-opacity"
            >
              ← All scenarios
            </button>
          </div>
        </div>

      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// ALSScenarioContent — cream editorial layout for late-stage-als scenario page
// ---------------------------------------------------------------------------

function ALSScenarioContent({ scenario, onSelectChoice, onBack }: {
  scenario: Scenario
  onSelectChoice: (choiceId: string) => void
  onBack: () => void
}) {
  const [hovered, setHovered] = useState<string | null>(null)
  const [pressed, setPressed] = useState<string | null>(null)
  const hv = "'Helvetica Neue', Helvetica, Arial, sans-serif"
  const apfel = "'ApfelGrotezk', sans-serif"

  return (
    <div style={{ background: '#F8F4EB', minHeight: '100vh' }}>

      {/* Hero band */}
      <div style={{ background: '#2C3777', padding: '56px 24px' }}>
        <div style={{ maxWidth: 760, margin: '0 auto' }}>
          <button onClick={onBack} style={{ fontFamily: hv, fontSize: 14, color: 'rgba(255,255,255,0.78)', background: 'none', border: 'none', cursor: 'pointer', marginBottom: 28, padding: 0, display: 'block' }}>
            ← All scenarios
          </button>
          <p style={{ fontFamily: hv, fontSize: 12, fontWeight: 500, letterSpacing: '0.04em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.78)', marginBottom: 16 }}>
            Scenario
          </p>
          <h1 style={{ fontFamily: apfel, fontSize: 48, fontWeight: 500, lineHeight: 1.1, color: '#FFFFFF', margin: 0 }}>
            {scenario.title}
          </h1>
        </div>
      </div>

      {/* Editorial description */}
      <div style={{ maxWidth: 760, margin: '0 auto', padding: '56px 24px 0' }}>
        {scenario.fullOverview.split('\n\n').map((para, i) => (
          <p key={i} style={{ fontFamily: hv, fontSize: 18, lineHeight: 1.6, color: '#1A1A1A', marginBottom: 20 }}>
            {para}
          </p>
        ))}
      </div>

      {/* Choice section */}
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 24px 80px' }}>
        <h2 style={{ fontFamily: hv, fontSize: 22, fontWeight: 600, color: '#1A1A1A', marginTop: 64, marginBottom: 28 }}>
          Choose a path to explore
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 24 }}
          className="!grid-cols-1 sm:!grid-cols-3">
          {scenario.choices.map((choice) => {
            const cs = ALS_CHOICE_STYLES[choice.id] ?? ALS_CHOICE_STYLES['palliative-care']
            const isHov = hovered === choice.id
            const isPre = pressed === choice.id
            const preview = ALS_CONSEQUENCE_PREVIEWS[choice.id]
            return (
              <button
                key={choice.id}
                type="button"
                onClick={() => onSelectChoice(choice.id)}
                onMouseEnter={() => setHovered(choice.id)}
                onMouseLeave={() => { setHovered(null); setPressed(null) }}
                onMouseDown={() => setPressed(choice.id)}
                onMouseUp={() => setPressed(null)}
                style={{
                  display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
                  minHeight: 180, padding: 24, borderRadius: 16, textAlign: 'left', cursor: 'pointer',
                  background: cs.bg,
                  border: isHov && !isPre ? cs.hoverBorder : cs.border || 'none',
                  boxSizing: 'border-box',
                  transform: isHov && !isPre ? 'translateY(-2px)' : 'translateY(0)',
                  boxShadow: isHov && !isPre ? '0 8px 24px rgba(0,0,0,0.08)' : '0 1px 2px rgba(0,0,0,0.02)',
                  transition: 'transform 140ms ease, box-shadow 140ms ease, border 140ms ease',
                }}
              >
                <div>
                  <p style={{ fontFamily: hv, fontSize: 18, fontWeight: 600, lineHeight: 1.35, color: cs.titleColor, margin: 0 }}>
                    {choice.label}
                  </p>
                </div>
                <div style={{ marginTop: 20 }}>
                  <span style={{ display: 'inline-block', padding: '8px 20px', borderRadius: 999, fontSize: 14, fontWeight: 500, background: cs.ctaBg, color: cs.ctaColor }}>
                    Choose →
                  </span>
                </div>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// OutcomeView — delegates to ALS-specific design for late-stage-als
// ---------------------------------------------------------------------------

function OutcomeView({ scenario, choice, onBackToScenario, onBackToAll, onSelectChoice }: {
  scenario: Scenario
  choice: ScenarioChoice
  onBackToScenario: () => void
  onBackToAll: () => void
  onSelectChoice: (choiceId: string) => void
}) {
  const [openSourceId, setOpenSourceId] = useState<string | null>(null)
  const [noteText, setNoteText] = useState('')
  const [noteSaved, setNoteSaved] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const noteTextRef = useRef('')
  const savedNoteIdRef = useRef<string | null>(null)

  function toggleSource(sourceId: string) {
    setOpenSourceId((prev) => (prev === sourceId ? null : sourceId))
  }

  async function saveNote() {
    const trimmed = noteTextRef.current.trim()
    if (!trimmed) return
    if (savedNoteIdRef.current) {
      await updateNote(savedNoteIdRef.current, trimmed)
    } else {
      const note = await createNote(trimmed)
      if (note) savedNoteIdRef.current = note.id
    }
    setNoteSaved(true)
    setTimeout(() => setNoteSaved(false), 2500)
  }

  function handleNoteChange(val: string) {
    setNoteText(val)
    noteTextRef.current = val
    setNoteSaved(false)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (val.trim()) debounceRef.current = setTimeout(() => {
      debounceRef.current = null
      saveNote()
    }, 1500)
  }

  async function handleNoteBlur() {
    if (!debounceRef.current) return
    clearTimeout(debounceRef.current)
    debounceRef.current = null
    await saveNote()
  }

  const otherChoices = scenario.choices.filter((c) => c.id !== choice.id)

  if (scenario.id === 'late-stage-als') {
    return (
      <ALSOutcomeContent
        scenario={scenario}
        choice={choice}
        onBackToScenario={onBackToScenario}
        onBackToAll={onBackToAll}
        onSelectChoice={onSelectChoice}
        noteText={noteText}
        noteSaved={noteSaved}
        handleNoteChange={handleNoteChange}
        handleNoteBlur={handleNoteBlur}
        openSourceId={openSourceId}
        toggleSource={toggleSource}
        otherChoices={otherChoices}
      />
    )
  }

  if (scenario.id === 'cpr-decision') {
    return (
      <CPROutcomeContent
        scenario={scenario}
        choice={choice}
        onBackToScenario={onBackToScenario}
        onBackToAll={onBackToAll}
        onSelectChoice={onSelectChoice}
        noteText={noteText}
        noteSaved={noteSaved}
        handleNoteChange={handleNoteChange}
        handleNoteBlur={handleNoteBlur}
        openSourceId={openSourceId}
        toggleSource={toggleSource}
        otherChoices={otherChoices}
      />
    )
  }

  if (scenario.id === 'pancreatic-cancer') {
    return (
      <PancreaticOutcomeContent
        scenario={scenario}
        choice={choice}
        onBackToScenario={onBackToScenario}
        onBackToAll={onBackToAll}
        onSelectChoice={onSelectChoice}
        noteText={noteText}
        noteSaved={noteSaved}
        handleNoteChange={handleNoteChange}
        handleNoteBlur={handleNoteBlur}
        openSourceId={openSourceId}
        toggleSource={toggleSource}
        otherChoices={otherChoices}
      />
    )
  }

  if (scenario.id === 'cognitive-decline') {
    return (
      <CognitiveDeclineOutcomeContent
        scenario={scenario}
        choice={choice}
        onBackToScenario={onBackToScenario}
        onBackToAll={onBackToAll}
        onSelectChoice={onSelectChoice}
        noteText={noteText}
        noteSaved={noteSaved}
        handleNoteChange={handleNoteChange}
        handleNoteBlur={handleNoteBlur}
        openSourceId={openSourceId}
        toggleSource={toggleSource}
        otherChoices={otherChoices}
      />
    )
  }

  // ── Default outcome view ──────────────────────────────────────────────────
  return (
    <div className="max-w-5xl mx-auto px-4 py-16">
      <div className="flex items-center gap-3 mb-10 text-sm flex-wrap">
        <button onClick={onBackToAll} className="text-[#f8f4eb] hover:text-[#BBABF4] transition-colors">All scenarios</button>
        <span className="text-[#f8f4eb]">/</span>
        <button onClick={onBackToScenario} className="text-[#f8f4eb] hover:text-[#BBABF4] transition-colors">{scenario.title}</button>
        <span className="text-[#f8f4eb]">/</span>
        <span className="text-[#BBABF4]">{choice.outcomeTitle}</span>
      </div>
      <div className="mb-10">
        <p className="text-xs uppercase tracking-widest text-[#BBABF4] mb-3 font-semibold">You chose</p>
        <h1 className="ns-title-internal text-[#f8f4eb]">{choice.label}</h1>
      </div>
      <div className="grid gap-6 md:grid-cols-2 mb-8">
        <div className="space-y-6">
          {choice.summary.length > 0 && (
            <section>
              <h2 className="text-xl font-bold text-[#f8f4eb] mb-4">Summary of Outcome</h2>
              <div className="space-y-4">
                {choice.summary.map((para, i) => <p key={i} className="text-[#f8f4eb] leading-relaxed">{para}</p>)}
              </div>
            </section>
          )}
          {choice.didYouKnow.length > 0 && (
            <section className="rounded-2xl bg-[#2C3777] px-8 py-7">
              <p className="text-xs uppercase tracking-widest text-[#BBABF4] mb-4 font-semibold">Did you know?</p>
              <div className="space-y-5">
                {choice.didYouKnow.map((block, i) => {
                  const source = block.sourceId ? SOURCES[block.sourceId] : null
                  const isOpen = source && openSourceId === block.sourceId
                  return (
                    <div key={i}>
                      <p className="text-[#f8f4eb] leading-relaxed">
                        {block.text}
                        {source && (
                          <button type="button" onClick={() => toggleSource(block.sourceId!)} className="ml-2 text-xs text-[#BBABF4] hover:text-[#f8f4eb] underline underline-offset-2 transition-colors">source</button>
                        )}
                      </p>
                      {isOpen && (
                        <div className="mt-3 rounded-lg bg-[#f8f4eb] px-4 py-3">
                          <p className="text-sm text-[#130426] leading-relaxed mb-2">{source.shortLabel}</p>
                          <Link href="/app/explore/scenario-navigator/sources" className="text-sm text-[#2C3777] font-semibold hover:underline">View all sources →</Link>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </section>
          )}
        </div>
        <div className="space-y-6">
          {choice.reflectionQuestions.length > 0 && (
            <section className="rounded-2xl px-8 py-7" style={{ background: '#F8F4EB' }}>
              <h2 style={{ fontSize: 18, fontWeight: 600, color: '#130426', marginBottom: 16 }}>Reflection</h2>
              <div className="mb-6" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {choice.reflectionQuestions.map((q, i) => <p key={i} className="text-[#130426] leading-relaxed">{q}</p>)}
              </div>
              <label className="block text-xs uppercase tracking-widest text-[#130426]/60 mb-2 font-semibold">Your notes</label>
              <textarea
                value={noteText}
                onChange={(e) => handleNoteChange(e.target.value)}
                onBlur={handleNoteBlur}
                placeholder="What does this bring up for you?"
                rows={4}
                className="w-full bg-white text-[#130426] placeholder:text-[#130426]/35 px-3 py-2.5 rounded-lg text-sm leading-relaxed focus:outline-none resize-none border border-[#130426]/10"
              />
              {noteSaved && <p className="mt-1.5 text-xs text-[#130426]" style={{ color: 'rgba(26,26,26,0.72)', fontSize: 13 }}>Saved</p>}
            </section>
          )}
          {choice.resources.length > 0 && (
            <section>
              <h2 className="text-xl font-bold text-[#f8f4eb] mb-4">Additional Resources</h2>
              <ul className="space-y-2">
                {choice.resources.map((r, i) => (
                  <li key={i}>
                    {r.url ? <a href={r.url} target="_blank" rel="noopener noreferrer" className="text-[#f29836] hover:underline">{r.label}</a>
                      : <span className="text-[#f8f4eb]">{r.label}</span>}
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      </div>
      {otherChoices.length > 0 && (
        <div className="pt-8 border-t border-[#f8f4eb]/10">
          <p className="text-sm text-[#BBABF4] font-semibold mb-4">You could also explore:</p>
          <div className="flex flex-col gap-3">
            {otherChoices.map((c) => (
              <button key={c.id} type="button" onClick={() => onSelectChoice(c.id)} className="text-left text-[#f8f4eb] hover:text-[#BBABF4] transition-colors text-sm">
                → {c.label}
              </button>
            ))}
          </div>
        </div>
      )}
      <div className="pt-6 flex flex-wrap gap-4">
        <button type="button" onClick={onBackToAll} className="rounded-full bg-[#f8f4eb] text-[#130426] px-6 py-2.5 text-sm font-semibold hover:bg-[#BBABF4] transition-colors">
          ← All scenarios
        </button>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// ALSOutcomeContent — cream editorial layout for late-stage-als outcome pages
// ---------------------------------------------------------------------------

function ALSOutcomeContent({ scenario, choice, onBackToScenario, onBackToAll, onSelectChoice, noteText, noteSaved, handleNoteChange, handleNoteBlur, openSourceId, toggleSource, otherChoices }: {
  scenario: Scenario
  choice: ScenarioChoice
  onBackToScenario: () => void
  onBackToAll: () => void
  onSelectChoice: (choiceId: string) => void
  noteText: string
  noteSaved: boolean
  handleNoteChange: (val: string) => void
  handleNoteBlur: () => void
  openSourceId: string | null
  toggleSource: (id: string) => void
  otherChoices: ScenarioChoice[]
}) {
  const hv = "'Helvetica Neue', Helvetica, Arial, sans-serif"
  const apfel = "'ApfelGrotezk', sans-serif"
  const [showVoice, setShowVoice] = useState(false)

  return (
    <div style={{ background: '#F8F4EB', minHeight: '100vh' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '48px 24px 96px' }}>

        {/* Breadcrumb — full width above columns */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 40, fontSize: 14, fontFamily: hv, flexWrap: 'wrap' }}>
          <button onClick={onBackToAll} style={{ color: 'rgba(26,26,26,0.55)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
            All scenarios
          </button>
          <span style={{ color: 'rgba(26,26,26,0.35)' }}>/</span>
          <button onClick={onBackToScenario} style={{ color: 'rgba(26,26,26,0.55)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontFamily: hv, fontSize: 14 }}
            className="hover:text-[#1A1A1A] transition-colors">
            {scenario.title}
          </button>
          <span style={{ color: 'rgba(26,26,26,0.35)' }}>/</span>
          <span style={{ color: '#1A1A1A', fontWeight: 500 }}>{choice.outcomeTitle}</span>
        </div>

        {/* "You chose" + title — full width above columns */}
        <div style={{ marginBottom: 48 }}>
          <p style={{ fontFamily: hv, fontSize: 12, fontWeight: 500, letterSpacing: '0.04em', textTransform: 'uppercase', color: '#2C3777', marginBottom: 12 }}>
            You chose
          </p>
          <h1 style={{ fontFamily: apfel, fontSize: 48, fontWeight: 500, lineHeight: 1.1, color: '#1A1A1A', margin: 0 }}>
            {choice.label}
          </h1>
        </div>

        {/* Two-column: left = narrative + DYK, right = reflection module */}
        <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: 48, alignItems: 'start' }}
          className="!grid-cols-1 sm:!grid-cols-[1.5fr_1fr]">

          {/* Left column */}
          <div>
            {/* Outcome narrative */}
            {choice.summary.length > 0 && (
              <div style={{ marginBottom: 32 }}>
                {choice.summary.map((para, i) => (
                  <p key={i} style={{ fontFamily: hv, fontSize: 18, lineHeight: 1.6, color: '#1A1A1A', marginBottom: 20 }}>
                    {para}
                  </p>
                ))}
              </div>
            )}

            {/* Did you know */}
            {choice.didYouKnow.length > 0 && (
              <div style={{ background: '#FFFFFF', border: '1px solid rgba(26,26,26,0.12)', borderRadius: 16, padding: 24 }}>
                <p style={{ fontFamily: hv, fontSize: 12, fontWeight: 500, letterSpacing: '0.04em', textTransform: 'uppercase', color: '#DB5835', marginBottom: 16 }}>
                  Did you know?
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  {choice.didYouKnow.map((block, i) => {
                    const source = block.sourceId ? SOURCES[block.sourceId] : null
                    const isOpen = source && openSourceId === block.sourceId
                    return (
                      <div key={i}>
                        <p style={{ fontFamily: hv, fontSize: 16, lineHeight: 1.55, color: 'rgba(26,26,26,0.72)', margin: 0 }}>
                          {block.text}
                          {source && (
                            <button type="button" onClick={() => toggleSource(block.sourceId!)}
                              style={{ marginLeft: 6, fontSize: 12, color: '#2C3777', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline', textUnderlineOffset: 2, fontFamily: hv }}>
                              source
                            </button>
                          )}
                        </p>
                        {isOpen && (
                          <div style={{ marginTop: 10, background: '#F8F4EB', borderRadius: 8, padding: '12px 14px' }}>
                            <p style={{ fontFamily: hv, fontSize: 13, color: '#130426', marginBottom: 8 }}>{source.shortLabel}</p>
                            <Link href="/app/explore/scenario-navigator/sources" style={{ fontFamily: hv, fontSize: 13, color: '#2C3777', fontWeight: 600 }}>
                              View all sources →
                            </Link>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Right column — Reflection aside panel */}
          {choice.reflectionQuestions.length > 0 && (
            <div style={{ background: 'rgba(26,26,26,0.035)', border: '1px solid rgba(26,26,26,0.12)', borderRadius: 16, padding: 24, marginTop: -8 }}>
              {/* Reflection heading */}
              <h3 style={{ fontFamily: hv, fontSize: 22, fontWeight: 500, color: '#1A1A1A', marginBottom: 16 }}>
                Reflection
              </h3>

              {/* Reflection questions */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {choice.reflectionQuestions.map((q, i) => (
                  <p key={i} style={{ fontFamily: hv, fontSize: 16, lineHeight: 1.55, color: '#1A1A1A', margin: 0 }}>{q}</p>
                ))}
              </div>

              {/* Textarea */}
              <textarea
                value={noteText}
                onChange={(e) => handleNoteChange(e.target.value)}
                onBlur={handleNoteBlur}
                placeholder="Write anything that comes up for you…"
                rows={4}
                style={{
                  display: 'block', width: '100%', background: '#FFFFFF',
                  border: '1px solid rgba(26,26,26,0.16)', borderRadius: 12,
                  padding: 16, fontSize: 15, lineHeight: 1.5, color: '#1A1A1A',
                  resize: 'none', outline: 'none', boxSizing: 'border-box',
                  fontFamily: hv, marginTop: 22,
                }}
                className="placeholder:text-[#1A1A1A]/36 focus:border-[#2C3777] focus:shadow-[0_0_0_3px_rgba(44,55,119,0.18)] transition-shadow"
              />

              {/* Save confirmation + link */}
              <p style={{ fontFamily: hv, fontSize: 13, color: 'rgba(26,26,26,0.72)', marginTop: 6, minHeight: 18 }}>
                {noteSaved ? 'Saved' : ''}
              </p>

              {/* Voice option */}
              <div style={{ marginTop: 12 }}>
                {showVoice ? (
                  <VoiceNoteButton
                    saveMode={{ kind: 'freeform' }}
                    theme="light"
                    autoStart
                    onSaved={() => setShowVoice(false)}
                    onDelete={() => setShowVoice(false)}
                  />
                ) : (
                  <button
                    type="button"
                    onClick={() => setShowVoice(true)}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontFamily: hv, fontSize: 13, color: 'rgba(26,26,26,0.55)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                  >
                    <svg width="11" height="15" viewBox="0 0 12 16" fill="none" aria-hidden>
                      <rect x="2.5" y="0.5" width="7" height="9" rx="3.5" fill="currentColor" />
                      <path d="M0.5 8c0 2.76 2.24 5 5.5 5s5.5-2.24 5.5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" fill="none" />
                      <line x1="6" y1="13" x2="6" y2="15.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                      <line x1="3.5" y1="15.5" x2="8.5" y2="15.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                    </svg>
                    Record a voice response instead
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Action section — 2px divider, 2fr/1fr grid */}
        <div style={{ borderTop: '2px solid rgba(26,26,26,0.22)', marginTop: 80, paddingTop: 48 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '5fr 4fr', gap: 24 }}
            className="!grid-cols-1 sm:!grid-cols-[5fr_4fr]">

            {/* Left — Explore other paths */}
            {otherChoices.length > 0 && (
              <div style={{ background: '#BBABF4', borderRadius: 20, padding: 28 }}>
                <h3 style={{ fontFamily: hv, fontSize: 22, fontWeight: 500, color: '#1A1A1A', marginBottom: 20 }}>
                  Explore other paths
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                  {otherChoices.map((c) => (
                    <button key={c.id} type="button" onClick={() => onSelectChoice(c.id)}
                      style={{
                        fontFamily: hv, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        gap: 12, textAlign: 'left', fontSize: 16, fontWeight: 500,
                        lineHeight: 1.45, color: '#130426', background: '#FFFFFF',
                        border: '1px solid transparent', borderRadius: 12, cursor: 'pointer',
                        padding: 16, boxShadow: '0 1px 2px rgba(0,0,0,0.04)', width: '100%',
                      }}
                      className="hover:border-[#2C3777] hover:shadow-md transition-all"
                    >
                      <span>{c.label}</span>
                      <span style={{ flexShrink: 0, color: 'rgba(19,4,38,0.45)', fontSize: 14 }}>→</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Right — Additional resources */}
            {choice.resources.length > 0 && (
              <div style={{ background: '#F29836', borderRadius: 20, padding: 32, display: 'flex', flexDirection: 'column' }}>
                <h3 style={{ fontFamily: hv, fontSize: 22, fontWeight: 500, color: '#1A1A1A', marginBottom: 12 }}>
                  Additional resources
                </h3>
                <p style={{ fontFamily: hv, fontSize: 15, lineHeight: 1.55, color: 'rgba(26,26,26,0.75)', flex: 1, marginBottom: 0 }}>
                  Province-specific guidance and clinical information for this situation.
                </p>
                {choice.resources.map((r, i) => r.url ? (
                  <a key={i} href={r.url} target="_blank" rel="noopener noreferrer"
                    style={{
                      display: 'inline-flex', alignItems: 'center', height: 48,
                      background: '#2C3777', color: '#FFFFFF', fontFamily: hv,
                      fontSize: 14, fontWeight: 500, paddingLeft: 24, paddingRight: 24,
                      borderRadius: 999, textDecoration: 'none', marginTop: 32,
                      width: 'fit-content',
                    }}>
                    View resource →
                  </a>
                ) : (
                  <span key={i} style={{ fontFamily: hv, fontSize: 14, color: '#1A1A1A', marginTop: 32 }}>{r.label}</span>
                ))}
              </div>
            )}

          </div>

          {/* Back — navy, left-aligned */}
          <div style={{ marginTop: 22 }}>
            <button type="button" onClick={onBackToAll}
              style={{ fontFamily: hv, fontSize: 14, fontWeight: 500, color: '#FFFFFF', background: '#2C3777', border: 'none', borderRadius: 999, padding: '10px 20px', cursor: 'pointer' }}
              className="hover:opacity-85 transition-opacity"
            >
              ← All scenarios
            </button>
          </div>
        </div>

      </div>
    </div>
  )
}
