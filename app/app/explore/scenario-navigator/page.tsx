'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  SCENARIOS,
  SOURCES,
  type Scenario,
  type ScenarioChoice,
} from '@/lib/scenario-navigator-data'

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
// Page
// ---------------------------------------------------------------------------

export default function ScenarioNavigatorPage() {
  const [view, setView] = useState<ViewState>({ kind: 'selection' })

  function goTo(next: ViewState) {
    window.scrollTo(0, 0)
    setView(next)
  }

  if (view.kind === 'selection') {
    return (
      <SelectionView
        onSelectScenario={(id) => goTo({ kind: 'scenario', scenarioId: id })}
      />
    )
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
        onSelectChoice={(choiceId) =>
          goTo({ kind: 'outcome', scenarioId: scenario.id, choiceId })
        }
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
      onBackToScenario={() =>
        goTo({ kind: 'scenario', scenarioId: scenario.id })
      }
      onBackToAll={() => goTo({ kind: 'selection' })}
    />
  )
}

// ---------------------------------------------------------------------------
// SelectionView
// ---------------------------------------------------------------------------

function SelectionView({
  onSelectScenario,
}: {
  onSelectScenario: (id: string) => void
}) {
  return (
    <div className="max-w-5xl mx-auto px-4 py-16">
      <Link href="/app/explore" className="text-[#f8f4eb] hover:text-[#BBABF4] transition-colors text-sm">
        ← Back to Explore
      </Link>

      <div className="mt-8 mb-12">
        <h1 className="text-6xl font-bold text-[#f8f4eb] mb-4 underline decoration-[#f29836] decoration-[3px] underline-offset-[8px]">
          Scenario Navigator
        </h1>
        <p className="text-[#f8f4eb] max-w-2xl leading-relaxed">
          Work through realistic situations to see how your values and
          preferences might apply in practice. Explore any path — nothing locks
          you in.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {SCENARIOS.map((scenario, i) => {
          const style = CARD_STYLES[i % CARD_STYLES.length]
          return (
            <button
              key={scenario.id}
              type="button"
              onClick={() => onSelectScenario(scenario.id)}
              className={`rounded-2xl px-8 py-8 text-left transition hover:opacity-90 ${style.bg}`}
            >
              <h2 className={`text-2xl font-bold mb-3 ${style.text}`}>{scenario.title}</h2>
              <p className={`leading-relaxed text-base mb-6 ${style.text}`}>
                {scenario.tileOverview}
              </p>
              <span className={`inline-block text-sm font-semibold rounded-full px-5 py-2 ${style.pill}`}>
                Explore →
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// ScenarioView
// ---------------------------------------------------------------------------

function ScenarioView({
  scenario,
  onSelectChoice,
  onBack,
}: {
  scenario: Scenario
  onSelectChoice: (choiceId: string) => void
  onBack: () => void
}) {
  return (
    <div className="max-w-3xl mx-auto px-4 py-16">
      <button onClick={onBack} className="text-[#f8f4eb] hover:text-[#BBABF4] transition-colors text-sm">
        ← All scenarios
      </button>

      <div className="mt-8 mb-10">
        <p className="text-xs uppercase tracking-widest text-[#BBABF4] mb-3 font-semibold">
          Scenario
        </p>
        <h1 className="text-5xl font-bold text-[#f8f4eb] mb-6">{scenario.title}</h1>
        <p className="text-[#f8f4eb] leading-relaxed text-base">{scenario.fullOverview}</p>
      </div>

      <div>
        <h2 className="text-lg font-bold text-[#f8f4eb] mb-5">Choose a path to explore</h2>
        <div className="flex flex-wrap gap-4">
          {scenario.choices.map((choice) => (
            <button
              key={choice.id}
              type="button"
              onClick={() => onSelectChoice(choice.id)}
              className="flex-1 min-w-[200px] rounded-2xl bg-[#BBABF4] px-7 py-6 text-left transition hover:opacity-90"
            >
              <span className="block text-[#130426] font-semibold leading-relaxed mb-4">{choice.label}</span>
              <span className="inline-block rounded-full bg-[#130426] text-[#f8f4eb] text-sm font-semibold px-4 py-1.5">
                Choose →
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// OutcomeView
// ---------------------------------------------------------------------------

function OutcomeView({
  scenario,
  choice,
  onBackToScenario,
  onBackToAll,
}: {
  scenario: Scenario
  choice: ScenarioChoice
  onBackToScenario: () => void
  onBackToAll: () => void
}) {
  const [openSourceId, setOpenSourceId] = useState<string | null>(null)
  const [noteText, setNoteText] = useState('')

  function toggleSource(sourceId: string) {
    setOpenSourceId((prev) => (prev === sourceId ? null : sourceId))
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-16">
      {/* Breadcrumb nav */}
      <div className="flex items-center gap-3 mb-10 text-sm flex-wrap">
        <button onClick={onBackToAll} className="text-[#f8f4eb] hover:text-[#BBABF4] transition-colors">
          All scenarios
        </button>
        <span className="text-[#f8f4eb]">/</span>
        <button onClick={onBackToScenario} className="text-[#f8f4eb] hover:text-[#BBABF4] transition-colors">
          {scenario.title}
        </button>
        <span className="text-[#f8f4eb]">/</span>
        <span className="text-[#BBABF4]">{choice.outcomeTitle}</span>
      </div>

      {/* Choice label */}
      <div className="mb-10">
        <p className="text-xs uppercase tracking-widest text-[#BBABF4] mb-3 font-semibold">
          You chose
        </p>
        <h1 className="text-4xl font-bold text-[#f8f4eb]">{choice.label}</h1>
      </div>

      {/* Two-column layout for main content */}
      <div className="grid gap-6 md:grid-cols-2 mb-8">
        {/* Left column: Summary + Did you know */}
        <div className="space-y-6">
          {choice.summary.length > 0 && (
            <section>
              <h2 className="text-xl font-bold text-[#f8f4eb] mb-4">Summary of Outcome</h2>
              <div className="space-y-4">
                {choice.summary.map((para, i) => (
                  <p key={i} className="text-[#f8f4eb] leading-relaxed">
                    {para}
                  </p>
                ))}
              </div>
            </section>
          )}

          {choice.didYouKnow.length > 0 && (
            <section className="rounded-2xl bg-[#2C3777] px-8 py-7">
              <p className="text-xs uppercase tracking-widest text-[#BBABF4] mb-4 font-semibold">
                Did you know?
              </p>
              <div className="space-y-5">
                {choice.didYouKnow.map((block, i) => {
                  const source = block.sourceId ? SOURCES[block.sourceId] : null
                  const isOpen = source && openSourceId === block.sourceId
                  return (
                    <div key={i}>
                      <p className="text-[#f8f4eb] leading-relaxed">
                        {block.text}
                        {source && (
                          <button
                            type="button"
                            onClick={() => toggleSource(block.sourceId!)}
                            className="ml-2 text-xs text-[#BBABF4] hover:text-[#f8f4eb] underline underline-offset-2 transition-colors"
                          >
                            source
                          </button>
                        )}
                      </p>
                      {isOpen && (
                        <div className="mt-3 rounded-lg bg-[#f8f4eb] px-4 py-3">
                          <p className="text-sm text-[#130426] leading-relaxed mb-2">
                            {source.shortLabel}
                          </p>
                          <Link
                            href="/app/explore/scenario-navigator/sources"
                            className="text-sm text-[#2C3777] font-semibold hover:underline"
                          >
                            View all sources →
                          </Link>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </section>
          )}
        </div>

        {/* Right column: Reflection + Resources */}
        <div className="space-y-6">
          {choice.reflectionQuestions.length > 0 && (
            <section className="rounded-2xl bg-[#f8f4eb] px-8 py-7">
              <h2 className="text-xl font-bold text-[#130426] mb-4">Reflection</h2>
              <ul className="space-y-3 mb-6">
                {choice.reflectionQuestions.map((q, i) => (
                  <li key={i} className="text-[#130426] leading-relaxed">
                    • {q}
                  </li>
                ))}
              </ul>
              <label className="block text-xs uppercase tracking-widest text-[#130426]/60 mb-2 font-semibold">
                Your notes
              </label>
              <textarea
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                placeholder="Jot something down…"
                rows={4}
                className="w-full bg-white text-[#130426] placeholder:text-[#130426]/35 px-3 py-2.5 rounded-lg text-sm leading-relaxed focus:outline-none resize-none border border-[#130426]/10"
              />
            </section>
          )}

          {choice.resources.length > 0 && (
            <section>
              <h2 className="text-xl font-bold text-[#f8f4eb] mb-4">Additional Resources</h2>
              <ul className="space-y-2">
                {choice.resources.map((r, i) => (
                  <li key={i}>
                    {r.url ? (
                      <a
                        href={r.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[#f29836] hover:underline"
                      >
                        {r.label}
                      </a>
                    ) : (
                      <span className="text-[#f8f4eb]">{r.label}</span>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      </div>

      {/* Bottom navigation */}
      <div className="pt-8 flex flex-wrap gap-4">
        <button
          type="button"
          onClick={onBackToScenario}
          className="rounded-full bg-[#2C3777] text-[#f8f4eb] px-6 py-2.5 text-sm font-semibold hover:bg-[#BBABF4] hover:text-[#130426] transition-colors"
        >
          ← Try a different path
        </button>
        <button
          type="button"
          onClick={onBackToAll}
          className="rounded-full bg-[#f8f4eb] text-[#130426] px-6 py-2.5 text-sm font-semibold hover:bg-[#BBABF4] transition-colors"
        >
          ← Choose another scenario
        </button>
      </div>
    </div>
  )
}
