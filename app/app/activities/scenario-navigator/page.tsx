'use client'

import { useEffect, useRef, useState } from 'react'
import { BANNER_TOP_CLASS, BANNER_STYLE, BANNER_INNER_STYLE } from '@/app/components/pageBanner'
import { ACTIVITY } from '@/lib/content-metadata'
import Link from 'next/link'
import {
  SCENARIOS,
  SOURCES,
  type Scenario,
  type ScenarioChoice,
} from '@/lib/scenario-navigator-data'
import { createNote, updateNote } from '@/lib/notes'
import { holdSavingIndicator } from '@/lib/ui'
import VoiceNoteButton from '@/app/components/VoiceNoteButton'
import Breadcrumbs from '@/app/components/navigation/Breadcrumbs'
import AutosaveNotice from '@/app/components/AutosaveNotice'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type ViewState =
  | { kind: 'selection' }
  | { kind: 'scenario'; scenarioId: string }
  | { kind: 'outcome'; scenarioId: string; choiceId: string }

// ---------------------------------------------------------------------------
// ALS-specific constants
// ---------------------------------------------------------------------------

const ALS_CHOICE_STYLES: Record<string, { bg: string; border: string; titleColor: string; bodyColor: string; ctaBg: string; ctaColor: string; hoverBorder: string }> = {
  'ventilator': {
    bg: 'var(--color-surface)', border: '1.5px solid var(--section-accent)',
    titleColor: 'var(--color-midnight)', bodyColor: 'rgba(19,4,38,0.72)',
    ctaBg: 'var(--color-midnight)', ctaColor: 'var(--color-cream)', hoverBorder: 'var(--section-accent)',
  },
  'palliative-care': {
    bg: 'var(--color-surface)', border: '1.5px solid var(--section-accent)',
    titleColor: 'var(--color-midnight)', bodyColor: 'rgba(19,4,38,0.72)',
    ctaBg: 'var(--color-midnight)', ctaColor: 'var(--color-cream)', hoverBorder: 'var(--section-accent)',
  },
  'non-invasive-support': {
    bg: 'var(--color-surface)', border: '1.5px solid var(--section-accent)',
    titleColor: 'var(--color-midnight)', bodyColor: 'rgba(19,4,38,0.72)',
    ctaBg: 'var(--color-midnight)', ctaColor: 'var(--color-cream)', hoverBorder: 'var(--section-accent)',
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
    bg: 'var(--color-surface)', border: '1.5px solid var(--section-accent)',
    titleColor: 'var(--color-midnight)', bodyColor: 'rgba(19,4,38,0.72)',
    ctaBg: 'var(--color-midnight)', ctaColor: 'var(--color-cream)', hoverBorder: 'var(--section-accent)',
  },
  'limited-interventions': {
    bg: 'var(--color-surface)', border: '1.5px solid var(--section-accent)',
    titleColor: 'var(--color-midnight)', bodyColor: 'rgba(19,4,38,0.72)',
    ctaBg: 'var(--color-midnight)', ctaColor: 'var(--color-cream)', hoverBorder: 'var(--section-accent)',
  },
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function ScenarioNavigatorPage() {
  const [view, setView] = useState<ViewState>({ kind: 'selection' })
  const hasEngagedRef = useRef(false)

  useEffect(() => {
    fetch('/api/analytics/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ eventName: 'activity_opened', metadata: { activity: ACTIVITY.SCENARIO_NAVIGATOR } }),
    }).catch(() => {})
  }, [])

  // Push a history entry on every internal navigation so the browser Back
  // button steps through view states rather than leaving the page entirely.
  function goTo(next: ViewState) {
    window.scrollTo(0, 0)
    window.history.pushState(next, '')
    setView(next)
    if (next.kind === 'outcome' && !hasEngagedRef.current) {
      hasEngagedRef.current = true
      fetch('/api/analytics/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventName: 'activity_engaged', metadata: { activity: ACTIVITY.SCENARIO_NAVIGATOR } }),
      }).catch(() => {})
    }
  }

  useEffect(() => {
    function isValidViewState(s: unknown): s is ViewState {
      if (!s || typeof s !== 'object') return false
      const kind = (s as { kind?: unknown }).kind
      return kind === 'selection' || kind === 'scenario' || kind === 'outcome'
    }
    function handlePopState(e: PopStateEvent) {
      setView(isValidViewState(e.state) ? e.state : { kind: 'selection' })
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

const hv = "'Helvetica Neue', Helvetica, Arial, sans-serif"

function SelectionView({ onSelectScenario }: { onSelectScenario: (id: string) => void }) {
  const [tipsOpen, setTipsOpen] = useState(false)

  return (
    <div className="min-h-screen bg-[#F8F4EB] text-[#130426]">

      {/* Sunrise banner — section-themed via BANNER_STYLE (bg var(--section-accent)). */}
      <div className={BANNER_TOP_CLASS} style={{ ...BANNER_STYLE, ...BANNER_INNER_STYLE }}>
        <div style={{ marginBottom: 24 }}>
          <Breadcrumbs
            theme="light"
            items={[
              { label: 'Activities', href: '/app/activities' },
              { label: 'Scenario Navigator' },
            ]}
          />
        </div>
        <h1 className="ns-title-activity">
          Scenario Navigator
        </h1>
        <p style={{ fontFamily: hv, fontSize: 17, color: 'var(--section-on-accent)', maxWidth: 520, marginTop: 20, marginBottom: 0, lineHeight: 1.5 }}>
          Work through realistic situations to explore how different decisions might feel in practice.
        </p>
        <p style={{ fontFamily: hv, fontSize: 17, color: 'var(--section-on-accent)', maxWidth: 520, marginTop: 16, marginBottom: 0, lineHeight: 1.5 }}>
          You don&apos;t need to arrive with your decisions made. Each scenario lets you try a choice on, so you can see where it leads and notice how it sits with you. Then you can back up and explore a different path to feel the difference.
        </p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center', marginTop: 28 }}>
          {['Choose any scenario to start', 'Explore different paths to compare outcomes', 'Notes save to Your materials'].map((text) => (
            <span key={text} style={{ background: 'transparent', border: '1px dashed var(--section-on-accent)', borderRadius: 20, padding: '4px 12px', fontFamily: hv, fontSize: 14, color: 'var(--section-on-accent)', cursor: 'default' }}>
              {text}
            </span>
          ))}
          <button
            type="button"
            onClick={() => setTipsOpen(true)}
            style={{ fontFamily: hv, fontSize: 15, color: 'var(--section-on-accent)', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'none', marginLeft: 12, padding: 0 }}
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
                Different paths may feel emotionally, practically, or ethically difficult in different ways. Pay attention to moments that feel surprising, uncomfortable, reassuring, or especially important to you.
              </p>
              <p style={{ fontSize: 14, lineHeight: 1.5, color: 'rgba(19,4,38,0.72)', marginBottom: 12 }}>
                You may notice that your reactions are shaped by personal experiences, caregiving roles, medical situations you've witnessed, cultural expectations, or conversations you've had with others over time.
              </p>
              <p style={{ fontSize: 14, lineHeight: 1.5, color: 'rgba(19,4,38,0.72)' }}>
                This activity can also be useful to do with a partner, family member, or substitute decision-maker to surface differences in assumptions, preferences, or expectations.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Scenario cards grid */}
      <div className="mx-auto max-w-[1320px] px-6 pb-14 md:px-10">
        <div className="grid gap-6 md:grid-cols-2" style={{ maxWidth: 900, marginTop: 40, marginLeft: 'auto', marginRight: 'auto' }}>
          {SCENARIOS.map((scenario) => {
            return (
              <button key={scenario.id} type="button" onClick={() => onSelectScenario(scenario.id)}
                className="rounded-2xl px-8 py-8 text-left transition hover:shadow-[0_10px_28px_rgba(19,4,38,0.18)]"
                style={{ background: 'var(--color-surface)', border: '1.5px solid var(--section-accent)' }}
              >
                <h2 className="text-2xl font-bold mb-3" style={{ color: 'var(--color-midnight)' }}>{scenario.title}</h2>
                <p className="leading-relaxed text-base mb-6" style={{ color: 'var(--color-midnight)' }}>{scenario.tileOverview}</p>
                <span className="inline-block text-sm font-semibold rounded-full px-5 py-2" style={{ background: 'var(--color-midnight)', color: 'var(--color-cream)' }}>Explore →</span>
              </button>
            )
          })}
        </div>
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
      <div style={{ marginBottom: 32 }}>
        <Breadcrumbs
          theme="navy"
          items={[
            { label: 'Activities', href: '/app/activities' },
            { label: 'Scenario Navigator', onClick: onBack },
            { label: scenario.title },
          ]}
        />
      </div>
      <div className="mt-8 mb-10">
        <p className="text-xs uppercase tracking-widest text-[#BBABF4] mb-3 font-semibold">Scenario</p>
        <h1 className="ns-title-internal text-[#f8f4eb]" style={{ marginBottom: '24px' }}>{scenario.title}</h1>
        <p className="text-[#f8f4eb] leading-relaxed text-base">{scenario.fullOverview}</p>
      </div>
      <div>
        <h2 className="text-lg font-bold text-[#f8f4eb] mb-5">Choose a path to explore</h2>
        <div className="grid gap-4 sn-stack" style={{ gridTemplateColumns: `repeat(${scenario.choices.length}, minmax(0, 1fr))` }}>
          {scenario.choices.map((choice) => (
            <button key={choice.id} type="button" onClick={() => onSelectChoice(choice.id)}
              className="flex flex-col rounded-2xl px-7 py-6 text-left transition-shadow hover:shadow-[0_10px_28px_rgba(19,4,38,0.22)]"
              style={{ background: 'var(--color-surface)', border: '1.5px solid var(--section-accent)' }}
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
    bg: 'var(--color-surface)', border: '1.5px solid var(--section-accent)',
    titleColor: 'var(--color-midnight)', bodyColor: 'rgba(19,4,38,0.72)',
    ctaBg: 'var(--color-midnight)', ctaColor: 'var(--color-cream)', hoverBorder: 'var(--section-accent)',
  },
  'comfort-care': {
    bg: 'var(--color-surface)', border: '1.5px solid var(--section-accent)',
    titleColor: 'var(--color-midnight)', bodyColor: 'rgba(19,4,38,0.72)',
    ctaBg: 'var(--color-midnight)', ctaColor: 'var(--color-cream)', hoverBorder: 'var(--section-accent)',
  },
  'clinical-trial': {
    bg: 'var(--color-surface)', border: '1.5px solid var(--section-accent)',
    titleColor: 'var(--color-midnight)', bodyColor: 'rgba(19,4,38,0.72)',
    ctaBg: 'var(--color-midnight)', ctaColor: 'var(--color-cream)', hoverBorder: 'var(--section-accent)',
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

      {/* Hero band — realigned to the activity-banner standard (sunrise, full-bleed 96px inset,
          ns-title-activity), matching the other activity banners. */}
      <div className={BANNER_TOP_CLASS} style={{ ...BANNER_STYLE, ...BANNER_INNER_STYLE }}>
        <div style={{ marginBottom: 18 }}>
          <Breadcrumbs
            theme="light"
            items={[
              { label: 'Activities', href: '/app/activities' },
              { label: 'Scenario Navigator', onClick: onBack },
              { label: scenario.title },
            ]}
          />
        </div>
        <p style={{ fontFamily: hv, fontSize: 12, fontWeight: 500, letterSpacing: '0.04em', textTransform: 'uppercase', color: 'var(--section-on-accent)', opacity: 0.7, marginBottom: 12 }}>
          Scenario
        </p>
        <h1 className="ns-title-activity" style={{ margin: 0 }}>
          {scenario.title}
        </h1>
      </div>

      {/* Editorial description */}
      <div style={{ maxWidth: 760, margin: '0 auto', padding: '56px 24px 0' }}>
        <p style={{ fontFamily: hv, fontSize: 18, lineHeight: 1.6, color: '#1A1A1A', marginBottom: 20 }}>
          You have been living with Stage IV pancreatic cancer, which has spread to other organs. After several rounds of chemotherapy, your health has significantly declined. You can no longer make or communicate decisions about your care.
        </p>
        <p style={{ fontFamily: hv, fontSize: 18, lineHeight: 1.6, color: '#1A1A1A', marginBottom: 20 }}>
          Your medical team has told your substitute decision-maker that further treatment is unlikely to cure the cancer or meaningfully extend your life, but options remain: continuing aggressive treatment, shifting to comfort-focused care, or enrolling in a clinical trial that may offer experimental options — each with different implications for how you spend your remaining time.
        </p>
        <p style={{ fontFamily: hv, fontSize: 18, lineHeight: 1.6, color: '#1A1A1A', marginBottom: 20 }}>
          <strong>If you could not speak for yourself, what would you want your substitute decision-maker to choose?</strong>
        </p>
      </div>

      {/* Choice section */}
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 24px 80px' }}>
        <h2 style={{ fontFamily: hv, fontSize: 22, fontWeight: 400, color: '#1A1A1A', marginTop: 64, marginBottom: 28, textAlign: 'center' }}>
          Choose a path to explore:
        </h2>
        <div className="sn-stack grid grid-cols-1 gap-6 sm:grid-cols-3">
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
                  border: cs.border,
                  boxSizing: 'border-box',
                  // No outline (rest or hover) and no lift — hover is *only* a soft drop
                  // shadow blooming in, so there's no border-width reflow ("fidgety") anymore.
                  boxShadow: isHov && !isPre ? '0 10px 28px rgba(19,4,38,0.22)' : 'none',
                  transition: 'box-shadow 160ms ease',
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

function PancreaticOutcomeContent({ scenario, choice, onBackToScenario, onBackToAll, onSelectChoice, noteText, noteSaved, noteSaving, handleNoteChange, handleNoteBlur, openSourceId, toggleSource, otherChoices }: {
  scenario: Scenario
  choice: ScenarioChoice
  onBackToScenario: () => void
  onBackToAll: () => void
  onSelectChoice: (choiceId: string) => void
  noteText: string
  noteSaved: boolean
  noteSaving: boolean
  handleNoteChange: (val: string) => void
  handleNoteBlur: () => void
  openSourceId: string | null
  toggleSource: (id: string) => void
  otherChoices: ScenarioChoice[]
}) {
  const hv = "'Helvetica Neue', Helvetica, Arial, sans-serif"
  const apfel = "'ApfelGrotezk', sans-serif"
  return (
    <div style={{ background: '#F8F4EB', minHeight: '100vh' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '48px 24px 96px' }}>

        <div style={{ marginBottom: 40 }}>
          <Breadcrumbs
            theme="light"
            items={[
              { label: 'Activities', href: '/app/activities' },
              { label: 'Scenario Navigator', onClick: onBackToAll },
              { label: scenario.title, onClick: onBackToScenario },
              { label: choice.outcomeTitle ?? choice.label },
            ]}
          />
        </div>

        {/* "This Path" + title */}
        <div style={{ marginBottom: 48 }}>
          <p style={{ fontFamily: hv, fontSize: 12, fontWeight: 500, letterSpacing: '0.04em', textTransform: 'uppercase', color: '#130426', marginBottom: 12 }}>
            This Path
          </p>
          <h1 style={{ fontFamily: apfel, fontSize: 48, fontWeight: 500, lineHeight: 1.1, color: '#1A1A1A', margin: 0 }}>
            {choice.label}
          </h1>
        </div>

        {/* Two-column: left = narrative + DYK, right = reflection */}
        <div className="sn-stack grid grid-cols-1 gap-12 items-start sm:grid-cols-[1.5fr_1fr]">

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
                <p style={{ fontFamily: hv, fontSize: 14, fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase', color: '#130426', marginBottom: 16 }}>
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
                              style={{ marginLeft: 6, fontSize: 12, color: 'var(--color-night)', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline', textUnderlineOffset: 2, fontFamily: hv }}>
                              source
                            </button>
                          )}
                        </p>
                        {isOpen && (
                          <div style={{ marginTop: 10, background: '#F8F4EB', borderRadius: 8, padding: '12px 14px' }}>
                            <p style={{ fontFamily: hv, fontSize: 13, color: '#130426', marginBottom: 8 }}>{source.shortLabel}</p>
                            <Link href="/app/activities/scenario-navigator/sources" style={{ fontFamily: hv, fontSize: 13, color: 'var(--color-night)', fontWeight: 600 }}>
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
                placeholder="Capture anything that comes up…"
                rows={4}
                style={{
                  display: 'block', width: '100%', background: '#FFFFFF',
                  border: '1px solid var(--color-night)', borderRadius: 12,
                  padding: 12, fontSize: 15, lineHeight: 1.5, color: '#1A1A1A',
                  resize: 'none', outline: 'none', boxSizing: 'border-box',
                  fontFamily: hv, marginTop: 22,
                }}
                className="placeholder:text-[#1A1A1A]/65 focus:border-night focus:shadow-[0_0_0_3px_rgba(44,55,119,0.18)] transition-shadow"
              />
              <div style={{ minHeight: 18, marginTop: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
                {noteSaving && (
                  <span style={{ fontFamily: hv, fontSize: 13, color: 'rgba(26,26,26,0.72)' }}>Saving…</span>
                )}
                {noteSaved && !noteSaving && (
                  <>
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true" style={{ flexShrink: 0 }}>
                      <circle cx="7" cy="7" r="6" stroke="rgba(26,26,26,0.72)" strokeWidth="1.3" />
                      <path d="M4.5 7L6.2 8.8L9.5 5.5" stroke="rgba(26,26,26,0.72)" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    <span style={{ fontFamily: hv, fontSize: 13, color: 'rgba(26,26,26,0.72)' }}>Saved to Your materials</span>
                  </>
                )}
              </div>
              <AutosaveNotice style={{ marginBottom: 24 }} />
              <div style={{ marginTop: 10 }}>
                <VoiceNoteButton
                  saveMode={{ kind: 'freeform' }}
                  theme="light"
                  onSaved={() => {}}
                />
              </div>
            </div>
          )}
        </div>

        {/* Action section */}
        <div style={{ borderTop: '2px solid rgba(26,26,26,0.22)', marginTop: 80, paddingTop: 48 }}>
          <div className="sn-stack grid grid-cols-1 gap-6 sm:grid-cols-[5fr_4fr]">

            {otherChoices.length > 0 && (
              <div style={{ background: 'var(--color-surface)', border: '1.5px solid var(--section-accent)', borderRadius: 20, padding: 28 }}>
                <h3 style={{ fontFamily: hv, fontSize: 22, fontWeight: 500, color: 'var(--color-midnight)', marginBottom: 20 }}>
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
                      className="hover:border-night hover:shadow-md transition-all"
                    >
                      <span>{c.label}</span>
                      <span style={{ flexShrink: 0, color: 'rgba(19,4,38,0.45)', fontSize: 14 }}>→</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {choice.resources.length > 0 && (
              <div style={{ background: 'var(--color-surface)', border: '1.5px solid var(--section-accent)', borderRadius: 20, padding: 32, display: 'flex', flexDirection: 'column' }}>
                <h3 style={{ fontFamily: hv, fontSize: 22, fontWeight: 500, color: 'var(--color-midnight)', marginBottom: 12 }}>
                  Additional resources
                </h3>
                {choice.resources.map((r, i) => r.url ? (
                  <a key={i} href={r.url} target="_blank" rel="noopener noreferrer"
                    style={{
                      display: 'inline-flex', alignItems: 'center',
                      paddingTop: 12, paddingBottom: 12,
                      background: 'var(--color-midnight)', color: 'var(--color-cream)', fontFamily: hv,
                      fontSize: 14, fontWeight: 500, paddingLeft: 24, paddingRight: 24,
                      borderRadius: 999, textDecoration: 'none', marginTop: 32,
                      alignSelf: 'flex-start',
                    }}>
                    {r.label} →
                  </a>
                ) : (
                  <span key={i} style={{ fontFamily: hv, fontSize: 14, color: '#1A1A1A', marginTop: 32 }}>{r.label}</span>
                ))}
              </div>
            )}

          </div>

          <div style={{ marginTop: 22 }}>
            <button type="button" onClick={onBackToAll}
              style={{ fontFamily: hv, fontSize: 14, fontWeight: 500, color: 'var(--color-cream)', background: 'var(--color-midnight)', border: 'none', borderRadius: 999, padding: '10px 20px', cursor: 'pointer' }}
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
    bg: 'var(--color-surface)', border: '1.5px solid var(--section-accent)',
    titleColor: 'var(--color-midnight)', bodyColor: 'rgba(19,4,38,0.72)',
    ctaBg: 'var(--color-midnight)', ctaColor: 'var(--color-cream)', hoverBorder: 'var(--section-accent)',
  },
  'comfort-care': {
    bg: 'var(--color-surface)', border: '1.5px solid var(--section-accent)',
    titleColor: 'var(--color-midnight)', bodyColor: 'rgba(19,4,38,0.72)',
    ctaBg: 'var(--color-midnight)', ctaColor: 'var(--color-cream)', hoverBorder: 'var(--section-accent)',
  },
  'long-term-care': {
    bg: 'var(--color-surface)', border: '1.5px solid var(--section-accent)',
    titleColor: 'var(--color-midnight)', bodyColor: 'rgba(19,4,38,0.72)',
    ctaBg: 'var(--color-midnight)', ctaColor: 'var(--color-cream)', hoverBorder: 'var(--section-accent)',
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

      {/* Hero band — realigned to the activity-banner standard (sunrise, full-bleed 96px inset,
          ns-title-activity), matching the other activity banners. */}
      <div className={BANNER_TOP_CLASS} style={{ ...BANNER_STYLE, ...BANNER_INNER_STYLE }}>
        <div style={{ marginBottom: 18 }}>
          <Breadcrumbs
            theme="light"
            items={[
              { label: 'Activities', href: '/app/activities' },
              { label: 'Scenario Navigator', onClick: onBack },
              { label: scenario.title },
            ]}
          />
        </div>
        <p style={{ fontFamily: hv, fontSize: 12, fontWeight: 500, letterSpacing: '0.04em', textTransform: 'uppercase', color: 'var(--section-on-accent)', opacity: 0.7, marginBottom: 12 }}>
          Scenario
        </p>
        <h1 className="ns-title-activity" style={{ margin: 0 }}>
          {scenario.title}
        </h1>
      </div>

      {/* Editorial description */}
      <div style={{ maxWidth: 760, margin: '0 auto', padding: '56px 24px 0' }}>
        <p style={{ fontFamily: hv, fontSize: 18, lineHeight: 1.6, color: '#1A1A1A', marginBottom: 20 }}>
          You were diagnosed with Alzheimer&apos;s disease several years ago. Your condition has progressed to the point where you can no longer recognize close family members, communicate your needs, or make decisions about your own care. You need assistance with eating, bathing, and moving around. You are physically stable for now, but new health issues — infections, falls, difficulty swallowing — are increasingly likely.
        </p>
        <p style={{ fontFamily: hv, fontSize: 18, lineHeight: 1.6, color: '#1A1A1A', marginBottom: 20 }}>
          Your substitute decision-maker must now make ongoing decisions about how aggressively to treat each new medical issue as it arises, and where you will receive care.
        </p>
        <p style={{ fontFamily: hv, fontSize: 18, lineHeight: 1.6, color: '#1A1A1A', marginBottom: 20 }}>
          <strong>If you could not speak for yourself, what would you want your substitute decision-maker to choose?</strong>
        </p>
      </div>

      {/* Choice section */}
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 24px 80px' }}>
        <h2 style={{ fontFamily: hv, fontSize: 22, fontWeight: 400, color: '#1A1A1A', marginTop: 64, marginBottom: 28, textAlign: 'center' }}>
          Choose a path to explore:
        </h2>
        <div className="sn-stack grid grid-cols-1 gap-6 sm:grid-cols-3">
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
                  border: cs.border,
                  boxSizing: 'border-box',
                  // No outline (rest or hover) and no lift — hover is *only* a soft drop
                  // shadow blooming in, so there's no border-width reflow ("fidgety") anymore.
                  boxShadow: isHov && !isPre ? '0 10px 28px rgba(19,4,38,0.22)' : 'none',
                  transition: 'box-shadow 160ms ease',
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

function CognitiveDeclineOutcomeContent({ scenario, choice, onBackToScenario, onBackToAll, onSelectChoice, noteText, noteSaved, noteSaving, handleNoteChange, handleNoteBlur, openSourceId, toggleSource, otherChoices }: {
  scenario: Scenario
  choice: ScenarioChoice
  onBackToScenario: () => void
  onBackToAll: () => void
  onSelectChoice: (choiceId: string) => void
  noteText: string
  noteSaved: boolean
  noteSaving: boolean
  handleNoteChange: (val: string) => void
  handleNoteBlur: () => void
  openSourceId: string | null
  toggleSource: (id: string) => void
  otherChoices: ScenarioChoice[]
}) {
  const hv = "'Helvetica Neue', Helvetica, Arial, sans-serif"
  const apfel = "'ApfelGrotezk', sans-serif"
  return (
    <div style={{ background: '#F8F4EB', minHeight: '100vh' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '48px 24px 96px' }}>

        <div style={{ marginBottom: 40 }}>
          <Breadcrumbs
            theme="light"
            items={[
              { label: 'Activities', href: '/app/activities' },
              { label: 'Scenario Navigator', onClick: onBackToAll },
              { label: scenario.title, onClick: onBackToScenario },
              { label: choice.outcomeTitle ?? choice.label },
            ]}
          />
        </div>

        {/* "This Path" + title */}
        <div style={{ marginBottom: 48 }}>
          <p style={{ fontFamily: hv, fontSize: 12, fontWeight: 500, letterSpacing: '0.04em', textTransform: 'uppercase', color: '#130426', marginBottom: 12 }}>
            This Path
          </p>
          <h1 style={{ fontFamily: apfel, fontSize: 48, fontWeight: 500, lineHeight: 1.1, color: '#1A1A1A', margin: 0 }}>
            {choice.label}
          </h1>
        </div>

        {/* Two-column: left = narrative + DYK, right = reflection */}
        <div className="sn-stack grid grid-cols-1 gap-12 items-start sm:grid-cols-[1.5fr_1fr]">

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
                <p style={{ fontFamily: hv, fontSize: 14, fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase', color: '#130426', marginBottom: 16 }}>
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
                              style={{ marginLeft: 6, fontSize: 12, color: 'var(--color-night)', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline', textUnderlineOffset: 2, fontFamily: hv }}>
                              source
                            </button>
                          )}
                        </p>
                        {isOpen && (
                          <div style={{ marginTop: 10, background: '#F8F4EB', borderRadius: 8, padding: '12px 14px' }}>
                            <p style={{ fontFamily: hv, fontSize: 13, color: '#130426', marginBottom: 8 }}>{source.shortLabel}</p>
                            <Link href="/app/activities/scenario-navigator/sources" style={{ fontFamily: hv, fontSize: 13, color: 'var(--color-night)', fontWeight: 600 }}>
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
                placeholder="Capture anything that comes up…"
                rows={4}
                style={{
                  display: 'block', width: '100%', background: '#FFFFFF',
                  border: '1px solid var(--color-night)', borderRadius: 12,
                  padding: 12, fontSize: 15, lineHeight: 1.5, color: '#1A1A1A',
                  resize: 'none', outline: 'none', boxSizing: 'border-box',
                  fontFamily: hv, marginTop: 22,
                }}
                className="placeholder:text-[#1A1A1A]/65 focus:border-night focus:shadow-[0_0_0_3px_rgba(44,55,119,0.18)] transition-shadow"
              />
              <div style={{ minHeight: 18, marginTop: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
                {noteSaving && (
                  <span style={{ fontFamily: hv, fontSize: 13, color: 'rgba(26,26,26,0.72)' }}>Saving…</span>
                )}
                {noteSaved && !noteSaving && (
                  <>
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true" style={{ flexShrink: 0 }}>
                      <circle cx="7" cy="7" r="6" stroke="rgba(26,26,26,0.72)" strokeWidth="1.3" />
                      <path d="M4.5 7L6.2 8.8L9.5 5.5" stroke="rgba(26,26,26,0.72)" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    <span style={{ fontFamily: hv, fontSize: 13, color: 'rgba(26,26,26,0.72)' }}>Saved to Your materials</span>
                  </>
                )}
              </div>
              <AutosaveNotice style={{ marginBottom: 24 }} />
              <div style={{ marginTop: 10 }}>
                <VoiceNoteButton
                  saveMode={{ kind: 'freeform' }}
                  theme="light"
                  onSaved={() => {}}
                />
              </div>
            </div>
          )}
        </div>

        {/* Action section */}
        <div style={{ borderTop: '2px solid rgba(26,26,26,0.22)', marginTop: 80, paddingTop: 48 }}>
          <div className="sn-stack grid grid-cols-1 gap-6 sm:grid-cols-[5fr_4fr]">

            {otherChoices.length > 0 && (
              <div style={{ background: 'var(--color-surface)', border: '1.5px solid var(--section-accent)', borderRadius: 20, padding: 28 }}>
                <h3 style={{ fontFamily: hv, fontSize: 22, fontWeight: 500, color: 'var(--color-midnight)', marginBottom: 20 }}>
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
                      className="hover:border-night hover:shadow-md transition-all"
                    >
                      <span>{c.label}</span>
                      <span style={{ flexShrink: 0, color: 'rgba(19,4,38,0.45)', fontSize: 14 }}>→</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {choice.resources.length > 0 && (
              <div style={{ background: 'var(--color-surface)', border: '1.5px solid var(--section-accent)', borderRadius: 20, padding: 32, display: 'flex', flexDirection: 'column' }}>
                <h3 style={{ fontFamily: hv, fontSize: 22, fontWeight: 500, color: 'var(--color-midnight)', marginBottom: 12 }}>
                  Additional resources
                </h3>
                {choice.resources.map((r, i) => r.url ? (
                  <a key={i} href={r.url} target="_blank" rel="noopener noreferrer"
                    style={{
                      display: 'inline-flex', alignItems: 'center',
                      paddingTop: 12, paddingBottom: 12,
                      background: 'var(--color-midnight)', color: 'var(--color-cream)', fontFamily: hv,
                      fontSize: 14, fontWeight: 500, paddingLeft: 24, paddingRight: 24,
                      borderRadius: 999, textDecoration: 'none', marginTop: 32,
                      alignSelf: 'flex-start',
                    }}>
                    {r.label} →
                  </a>
                ) : (
                  <span key={i} style={{ fontFamily: hv, fontSize: 14, color: '#1A1A1A', marginTop: 32 }}>{r.label}</span>
                ))}
              </div>
            )}

          </div>

          <div style={{ marginTop: 22 }}>
            <button type="button" onClick={onBackToAll}
              style={{ fontFamily: hv, fontSize: 14, fontWeight: 500, color: 'var(--color-cream)', background: 'var(--color-midnight)', border: 'none', borderRadius: 999, padding: '10px 20px', cursor: 'pointer' }}
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

      {/* Hero band — realigned to the activity-banner standard (sunrise, full-bleed 96px inset,
          ns-title-activity), matching the other activity banners. */}
      <div className={BANNER_TOP_CLASS} style={{ ...BANNER_STYLE, ...BANNER_INNER_STYLE }}>
        <div style={{ marginBottom: 18 }}>
          <Breadcrumbs
            theme="light"
            items={[
              { label: 'Activities', href: '/app/activities' },
              { label: 'Scenario Navigator', onClick: onBack },
              { label: scenario.title },
            ]}
          />
        </div>
        <p style={{ fontFamily: hv, fontSize: 12, fontWeight: 500, letterSpacing: '0.04em', textTransform: 'uppercase', color: 'var(--section-on-accent)', opacity: 0.7, marginBottom: 12 }}>
          Scenario
        </p>
        <h1 className="ns-title-activity" style={{ margin: 0 }}>
          {scenario.title}
        </h1>
      </div>

      {/* Editorial description */}
      <div style={{ maxWidth: 760, margin: '0 auto', padding: '56px 24px 0' }}>
        <p style={{ fontFamily: hv, fontSize: 18, lineHeight: 1.6, color: '#1A1A1A', marginBottom: 20 }}>
          You are generally healthy with no major conditions when you experience a sudden cardiac arrest. You collapse without warning. Emergency responders arrive within minutes.
        </p>
        <p style={{ fontFamily: hv, fontSize: 18, lineHeight: 1.6, color: '#1A1A1A', marginBottom: 20 }}>
          They can attempt full resuscitation — chest compressions, electric shocks to restart your heart, a breathing tube, and ICU admission. This is an aggressive intervention. It may save your life, and it carries significant physical risks. Without intervention, you will not survive.
        </p>
        <p style={{ fontFamily: hv, fontSize: 18, lineHeight: 1.6, color: '#1A1A1A', marginBottom: 20 }}>
          <strong>If you could not speak for yourself in this moment, what would you want your substitute decision-maker to choose?</strong>
        </p>
      </div>

      {/* Choice section */}
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 24px 80px' }}>
        <h2 style={{ fontFamily: hv, fontSize: 22, fontWeight: 400, color: '#1A1A1A', marginTop: 64, marginBottom: 28, textAlign: 'center' }}>
          Choose a path to explore:
        </h2>
        <div className="sn-stack grid grid-cols-1 gap-6 sm:grid-cols-2">
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
                  border: cs.border,
                  boxSizing: 'border-box',
                  // No outline (rest or hover) and no lift — hover is *only* a soft drop
                  // shadow blooming in, so there's no border-width reflow ("fidgety") anymore.
                  boxShadow: isHov && !isPre ? '0 10px 28px rgba(19,4,38,0.22)' : 'none',
                  transition: 'box-shadow 160ms ease',
                }}
              >
                <div>
                  <p style={{ fontFamily: hv, fontSize: 18, fontWeight: 600, lineHeight: 1.35, color: cs.titleColor, margin: 0, whiteSpace: 'pre-line' }}>
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

function CPROutcomeContent({ scenario, choice, onBackToScenario, onBackToAll, onSelectChoice, noteText, noteSaved, noteSaving, handleNoteChange, handleNoteBlur, openSourceId, toggleSource, otherChoices }: {
  scenario: Scenario
  choice: ScenarioChoice
  onBackToScenario: () => void
  onBackToAll: () => void
  onSelectChoice: (choiceId: string) => void
  noteText: string
  noteSaved: boolean
  noteSaving: boolean
  handleNoteChange: (val: string) => void
  handleNoteBlur: () => void
  openSourceId: string | null
  toggleSource: (id: string) => void
  otherChoices: ScenarioChoice[]
}) {
  const hv = "'Helvetica Neue', Helvetica, Arial, sans-serif"
  const apfel = "'ApfelGrotezk', sans-serif"
  return (
    <div style={{ background: '#F8F4EB', minHeight: '100vh' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '48px 24px 96px' }}>

        <div style={{ marginBottom: 40 }}>
          <Breadcrumbs
            theme="light"
            items={[
              { label: 'Activities', href: '/app/activities' },
              { label: 'Scenario Navigator', onClick: onBackToAll },
              { label: scenario.title, onClick: onBackToScenario },
              { label: choice.outcomeTitle ?? choice.label },
            ]}
          />
        </div>

        {/* "This Path" + title */}
        <div style={{ marginBottom: 48 }}>
          <p style={{ fontFamily: hv, fontSize: 12, fontWeight: 500, letterSpacing: '0.04em', textTransform: 'uppercase', color: '#130426', marginBottom: 12 }}>
            This Path
          </p>
          <h1 style={{ fontFamily: apfel, fontSize: 48, fontWeight: 500, lineHeight: 1.1, color: '#1A1A1A', margin: 0 }}>
            {choice.label}
          </h1>
        </div>

        {/* Two-column: left = narrative + DYK, right = reflection */}
        <div className="sn-stack grid grid-cols-1 gap-12 items-start sm:grid-cols-[1.5fr_1fr]">

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
                <p style={{ fontFamily: hv, fontSize: 14, fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase', color: '#130426', marginBottom: 16 }}>
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
                              style={{ marginLeft: 6, fontSize: 12, color: 'var(--color-night)', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline', textUnderlineOffset: 2, fontFamily: hv }}>
                              source
                            </button>
                          )}
                        </p>
                        {isOpen && (
                          <div style={{ marginTop: 10, background: '#F8F4EB', borderRadius: 8, padding: '12px 14px' }}>
                            <p style={{ fontFamily: hv, fontSize: 13, color: '#130426', marginBottom: 8 }}>{source.shortLabel}</p>
                            <Link href="/app/activities/scenario-navigator/sources" style={{ fontFamily: hv, fontSize: 13, color: 'var(--color-night)', fontWeight: 600 }}>
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
                placeholder="Capture anything that comes up…"
                rows={4}
                style={{
                  display: 'block', width: '100%', background: '#FFFFFF',
                  border: '1px solid var(--color-night)', borderRadius: 12,
                  padding: 12, fontSize: 15, lineHeight: 1.5, color: '#1A1A1A',
                  resize: 'none', outline: 'none', boxSizing: 'border-box',
                  fontFamily: hv, marginTop: 22,
                }}
                className="placeholder:text-[#1A1A1A]/65 focus:border-night focus:shadow-[0_0_0_3px_rgba(44,55,119,0.18)] transition-shadow"
              />
              <div style={{ minHeight: 18, marginTop: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
                {noteSaving && (
                  <span style={{ fontFamily: hv, fontSize: 13, color: 'rgba(26,26,26,0.72)' }}>Saving…</span>
                )}
                {noteSaved && !noteSaving && (
                  <>
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true" style={{ flexShrink: 0 }}>
                      <circle cx="7" cy="7" r="6" stroke="rgba(26,26,26,0.72)" strokeWidth="1.3" />
                      <path d="M4.5 7L6.2 8.8L9.5 5.5" stroke="rgba(26,26,26,0.72)" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    <span style={{ fontFamily: hv, fontSize: 13, color: 'rgba(26,26,26,0.72)' }}>Saved to Your materials</span>
                  </>
                )}
              </div>
              <AutosaveNotice style={{ marginBottom: 24 }} />
              <div style={{ marginTop: 10 }}>
                <VoiceNoteButton
                  saveMode={{ kind: 'freeform' }}
                  theme="light"
                  onSaved={() => {}}
                />
              </div>
            </div>
          )}
        </div>

        {/* Action section */}
        <div style={{ borderTop: '2px solid rgba(26,26,26,0.22)', marginTop: 80, paddingTop: 48 }}>
          <div className="sn-stack grid grid-cols-1 gap-6 sm:grid-cols-[5fr_4fr]">

            {otherChoices.length > 0 && (
              <div style={{ background: 'var(--color-surface)', border: '1.5px solid var(--section-accent)', borderRadius: 20, padding: 28 }}>
                <h3 style={{ fontFamily: hv, fontSize: 22, fontWeight: 500, color: 'var(--color-midnight)', marginBottom: 20 }}>
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
                      className="hover:border-night hover:shadow-md transition-all"
                    >
                      <span>{c.label}</span>
                      <span style={{ flexShrink: 0, color: 'rgba(19,4,38,0.45)', fontSize: 14 }}>→</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {choice.resources.length > 0 && (
              <div style={{ background: 'var(--color-surface)', border: '1.5px solid var(--section-accent)', borderRadius: 20, padding: 32, display: 'flex', flexDirection: 'column' }}>
                <h3 style={{ fontFamily: hv, fontSize: 22, fontWeight: 500, color: 'var(--color-midnight)', marginBottom: 12 }}>
                  Additional resources
                </h3>
                {choice.resources.map((r, i) => r.url ? (
                  <a key={i} href={r.url} target="_blank" rel="noopener noreferrer"
                    style={{
                      display: 'inline-flex', alignItems: 'center',
                      paddingTop: 12, paddingBottom: 12,
                      background: 'var(--color-midnight)', color: 'var(--color-cream)', fontFamily: hv,
                      fontSize: 14, fontWeight: 500, paddingLeft: 24, paddingRight: 24,
                      borderRadius: 999, textDecoration: 'none', marginTop: 32,
                      alignSelf: 'flex-start',
                    }}>
                    {r.label} →
                  </a>
                ) : (
                  <span key={i} style={{ fontFamily: hv, fontSize: 14, color: '#1A1A1A', marginTop: 32 }}>{r.label}</span>
                ))}
              </div>
            )}

          </div>

          <div style={{ marginTop: 22 }}>
            <button type="button" onClick={onBackToAll}
              style={{ fontFamily: hv, fontSize: 14, fontWeight: 500, color: 'var(--color-cream)', background: 'var(--color-midnight)', border: 'none', borderRadius: 999, padding: '10px 20px', cursor: 'pointer' }}
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

      {/* Hero band — realigned to the activity-banner standard (sunrise, full-bleed 96px inset,
          ns-title-activity), matching the other activity banners. */}
      <div className={BANNER_TOP_CLASS} style={{ ...BANNER_STYLE, ...BANNER_INNER_STYLE }}>
        <div style={{ marginBottom: 18 }}>
          <Breadcrumbs
            theme="light"
            items={[
              { label: 'Activities', href: '/app/activities' },
              { label: 'Scenario Navigator', onClick: onBack },
              { label: scenario.title },
            ]}
          />
        </div>
        <p style={{ fontFamily: hv, fontSize: 12, fontWeight: 500, letterSpacing: '0.04em', textTransform: 'uppercase', color: 'var(--section-on-accent)', opacity: 0.7, marginBottom: 12 }}>
          Scenario
        </p>
        <h1 className="ns-title-activity" style={{ margin: 0 }}>
          {scenario.title}
        </h1>
      </div>

      {/* Editorial description */}
      <div style={{ maxWidth: 760, margin: '0 auto', padding: '56px 24px 0' }}>
        <p style={{ fontFamily: hv, fontSize: 18, lineHeight: 1.6, color: '#1A1A1A', marginBottom: 20 }}>
          You have been living with ALS for several years. The disease has progressed to the point where you can no longer speak, swallow, or move independently. You rely on a feeding tube for nutrition and need full assistance with daily activities. Your respiratory muscles are weakening; breathing is becoming increasingly difficult, and your medical team has told your substitute decision-maker that you will likely need more breathing support soon.
        </p>
        <p style={{ fontFamily: hv, fontSize: 18, lineHeight: 1.6, color: '#1A1A1A', marginBottom: 20 }}>
          You cannot communicate your wishes in this moment. Your substitute decision-maker must decide how to proceed, knowing that each path involves a different set of tradeoffs between length of life, comfort, and the level of medical intervention required.
        </p>
        <p style={{ fontFamily: hv, fontSize: 18, lineHeight: 1.6, color: '#1A1A1A', marginBottom: 20 }}>
          <strong>If you could not speak for yourself, what would you want your substitute decision-maker to choose?</strong>
        </p>
      </div>

      {/* Choice section */}
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 24px 80px' }}>
        <h2 style={{ fontFamily: hv, fontSize: 22, fontWeight: 400, color: '#1A1A1A', marginTop: 64, marginBottom: 28, textAlign: 'center' }}>
          Choose a path to explore:
        </h2>
        <div className="sn-stack grid grid-cols-1 gap-6 sm:grid-cols-3">
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
                  border: cs.border,
                  boxSizing: 'border-box',
                  // No outline (rest or hover) and no lift — hover is *only* a soft drop
                  // shadow blooming in, so there's no border-width reflow ("fidgety") anymore.
                  boxShadow: isHov && !isPre ? '0 10px 28px rgba(19,4,38,0.22)' : 'none',
                  transition: 'box-shadow 160ms ease',
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
  const [noteSaving, setNoteSaving] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const noteTextRef = useRef('')
  const savedNoteIdRef = useRef<string | null>(null)

  function toggleSource(sourceId: string) {
    setOpenSourceId((prev) => (prev === sourceId ? null : sourceId))
  }

  async function saveNote() {
    const trimmed = noteTextRef.current.trim()
    if (!trimmed) return
    setNoteSaving(true)
    const startedAt = Date.now()
    if (savedNoteIdRef.current) {
      await updateNote(savedNoteIdRef.current, trimmed)
    } else {
      const note = await createNote(trimmed)
      if (note) savedNoteIdRef.current = note.id
    }
    await holdSavingIndicator(startedAt)
    setNoteSaving(false)
    setNoteSaved(true)
    setTimeout(() => setNoteSaved(false), 2500)
  }

  function handleNoteChange(val: string) {
    setNoteText(val)
    noteTextRef.current = val
    setNoteSaved(false)
    setNoteSaving(false)
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
        noteSaving={noteSaving}
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
        noteSaving={noteSaving}
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
        noteSaving={noteSaving}
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
        noteSaving={noteSaving}
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
      <div style={{ marginBottom: 40 }}>
        <Breadcrumbs
          theme="navy"
          items={[
            { label: 'Activities', href: '/app/activities' },
            { label: 'Scenario Navigator', onClick: onBackToAll },
            { label: scenario.title, onClick: onBackToScenario },
            { label: choice.outcomeTitle ?? choice.label },
          ]}
        />
      </div>
      <div className="mb-10">
        <p className="text-xs uppercase tracking-widest text-[#BBABF4] mb-3 font-semibold">This Path</p>
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
            <section className="rounded-2xl bg-night px-8 py-7">
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
                          <Link href="/app/activities/scenario-navigator/sources" className="text-sm text-[#2C3777] font-semibold hover:underline">View all sources →</Link>
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
                className="w-full bg-white text-[#130426] placeholder:text-[#130426]/65 px-3 py-2.5 rounded-lg text-sm leading-relaxed focus:outline-none resize-none border border-[#130426]/10"
              />
              <div style={{ minHeight: 18, marginTop: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
                {noteSaving && (
                  <span style={{ fontSize: 13, color: 'rgba(26,26,26,0.72)' }}>Saving…</span>
                )}
                {noteSaved && !noteSaving && (
                  <>
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true" style={{ flexShrink: 0 }}>
                      <circle cx="7" cy="7" r="6" stroke="rgba(26,26,26,0.72)" strokeWidth="1.3" />
                      <path d="M4.5 7L6.2 8.8L9.5 5.5" stroke="rgba(26,26,26,0.72)" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    <span style={{ fontSize: 13, color: 'rgba(26,26,26,0.72)' }}>Saved to Your materials</span>
                  </>
                )}
              </div>
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

function ALSOutcomeContent({ scenario, choice, onBackToScenario, onBackToAll, onSelectChoice, noteText, noteSaved, noteSaving, handleNoteChange, handleNoteBlur, openSourceId, toggleSource, otherChoices }: {
  scenario: Scenario
  choice: ScenarioChoice
  onBackToScenario: () => void
  onBackToAll: () => void
  onSelectChoice: (choiceId: string) => void
  noteText: string
  noteSaved: boolean
  noteSaving: boolean
  handleNoteChange: (val: string) => void
  handleNoteBlur: () => void
  openSourceId: string | null
  toggleSource: (id: string) => void
  otherChoices: ScenarioChoice[]
}) {
  const hv = "'Helvetica Neue', Helvetica, Arial, sans-serif"
  const apfel = "'ApfelGrotezk', sans-serif"
  return (
    <div style={{ background: '#F8F4EB', minHeight: '100vh' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '48px 24px 96px' }}>

        <div style={{ marginBottom: 40 }}>
          <Breadcrumbs
            theme="light"
            items={[
              { label: 'Activities', href: '/app/activities' },
              { label: 'Scenario Navigator', onClick: onBackToAll },
              { label: scenario.title, onClick: onBackToScenario },
              { label: choice.outcomeTitle ?? choice.label },
            ]}
          />
        </div>

        {/* "This Path" + title — full width above columns */}
        <div style={{ marginBottom: 48 }}>
          <p style={{ fontFamily: hv, fontSize: 12, fontWeight: 500, letterSpacing: '0.04em', textTransform: 'uppercase', color: '#130426', marginBottom: 12 }}>
            This Path
          </p>
          <h1 style={{ fontFamily: apfel, fontSize: 48, fontWeight: 500, lineHeight: 1.1, color: '#1A1A1A', margin: 0 }}>
            {choice.label}
          </h1>
        </div>

        {/* Two-column: left = narrative + DYK, right = reflection module */}
        <div className="sn-stack grid grid-cols-1 gap-12 items-start sm:grid-cols-[1.5fr_1fr]">

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
                <p style={{ fontFamily: hv, fontSize: 14, fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase', color: '#130426', marginBottom: 16 }}>
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
                              style={{ marginLeft: 6, fontSize: 12, color: 'var(--color-night)', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline', textUnderlineOffset: 2, fontFamily: hv }}>
                              source
                            </button>
                          )}
                        </p>
                        {isOpen && (
                          <div style={{ marginTop: 10, background: '#F8F4EB', borderRadius: 8, padding: '12px 14px' }}>
                            <p style={{ fontFamily: hv, fontSize: 13, color: '#130426', marginBottom: 8 }}>{source.shortLabel}</p>
                            <Link href="/app/activities/scenario-navigator/sources" style={{ fontFamily: hv, fontSize: 13, color: 'var(--color-night)', fontWeight: 600 }}>
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
                placeholder="Capture anything that comes up…"
                rows={4}
                style={{
                  display: 'block', width: '100%', background: '#FFFFFF',
                  border: '1px solid var(--color-night)', borderRadius: 12,
                  padding: 12, fontSize: 15, lineHeight: 1.5, color: '#1A1A1A',
                  resize: 'none', outline: 'none', boxSizing: 'border-box',
                  fontFamily: hv, marginTop: 22,
                }}
                className="placeholder:text-[#1A1A1A]/65 focus:border-night focus:shadow-[0_0_0_3px_rgba(44,55,119,0.18)] transition-shadow"
              />

              {/* Save confirmation + link */}
              <div style={{ minHeight: 18, marginTop: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
                {noteSaving && (
                  <span style={{ fontFamily: hv, fontSize: 13, color: 'rgba(26,26,26,0.72)' }}>Saving…</span>
                )}
                {noteSaved && !noteSaving && (
                  <>
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true" style={{ flexShrink: 0 }}>
                      <circle cx="7" cy="7" r="6" stroke="rgba(26,26,26,0.72)" strokeWidth="1.3" />
                      <path d="M4.5 7L6.2 8.8L9.5 5.5" stroke="rgba(26,26,26,0.72)" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    <span style={{ fontFamily: hv, fontSize: 13, color: 'rgba(26,26,26,0.72)' }}>Saved to Your materials</span>
                  </>
                )}
              </div>

              {/* Voice option */}
              <AutosaveNotice style={{ marginBottom: 24 }} />
              <div style={{ marginTop: 10 }}>
                <VoiceNoteButton
                  saveMode={{ kind: 'freeform' }}
                  theme="light"
                  onSaved={() => {}}
                />
              </div>
            </div>
          )}
        </div>

        {/* Action section — 2px divider, 2fr/1fr grid */}
        <div style={{ borderTop: '2px solid rgba(26,26,26,0.22)', marginTop: 80, paddingTop: 48 }}>
          <div className="sn-stack grid grid-cols-1 gap-6 sm:grid-cols-[5fr_4fr]">

            {/* Left — Explore other paths */}
            {otherChoices.length > 0 && (
              <div style={{ background: 'var(--color-surface)', border: '1.5px solid var(--section-accent)', borderRadius: 20, padding: 28 }}>
                <h3 style={{ fontFamily: hv, fontSize: 22, fontWeight: 500, color: 'var(--color-midnight)', marginBottom: 20 }}>
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
                      className="hover:border-night hover:shadow-md transition-all"
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
              <div style={{ background: 'var(--color-surface)', border: '1.5px solid var(--section-accent)', borderRadius: 20, padding: 32, display: 'flex', flexDirection: 'column' }}>
                <h3 style={{ fontFamily: hv, fontSize: 22, fontWeight: 500, color: 'var(--color-midnight)', marginBottom: 12 }}>
                  Additional resources
                </h3>
                {choice.resources.map((r, i) => r.url ? (
                  <a key={i} href={r.url} target="_blank" rel="noopener noreferrer"
                    style={{
                      display: 'inline-flex', alignItems: 'center',
                      paddingTop: 12, paddingBottom: 12,
                      background: 'var(--color-midnight)', color: 'var(--color-cream)', fontFamily: hv,
                      fontSize: 14, fontWeight: 500, paddingLeft: 24, paddingRight: 24,
                      borderRadius: 999, textDecoration: 'none', marginTop: 32,
                      alignSelf: 'flex-start',
                    }}>
                    {r.label} →
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
              style={{ fontFamily: hv, fontSize: 14, fontWeight: 500, color: 'var(--color-cream)', background: 'var(--color-midnight)', border: 'none', borderRadius: 999, padding: '10px 20px', cursor: 'pointer' }}
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
