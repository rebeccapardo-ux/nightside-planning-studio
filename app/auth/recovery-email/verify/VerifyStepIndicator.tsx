'use client'
import { useState, useEffect, Fragment } from 'react'

// Two-step indicator for the recovery-email verify flow. It reuses the visual
// vocabulary of OnboardingStepIndicator (navy completed / orange current circles,
// filled connector, labels below) and, on success, its completion flourish.
//
// Step 1 "Open link" is already done by arriving here from the email link; step 2
// "Verify" is the action on this page. Showing it signals the page is mid-sequence,
// so the Verify button isn't misread as a "you're finished, continue" affordance —
// the two-step prefetch-safe pattern is otherwise easy to miss.
//
//  mode='confirm'  → static: step 1 done, step 2 current (the pristine landing).
//  mode='verified' → plays the onboarding-style completion flourish (step 2 lands as
//                    completed, both circles glow in sequence, brief hold) and then
//                    fades + collapses away, leaving the success copy + link in place.
//                    Timing mirrors HomeOnboardingIndicator's end-of-onboarding flourish.

const HV = "'Helvetica Neue', Helvetica, Arial, sans-serif"

const STEPS = [{ label: 'Open link' }, { label: 'Verify' }]

function Checkmark() {
  return (
    <svg width="14" height="11" viewBox="0 0 14 11" fill="none" aria-hidden="true">
      <path d="M1.5 5.5L5 9L12.5 1.5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

interface Props {
  mode: 'confirm' | 'verified'
}

export default function VerifyStepIndicator({ mode }: Props) {
  const verified = mode === 'verified'
  const [allComplete, setAllComplete] = useState(false)
  const [flourishIndex, setFlourishIndex] = useState(-1)
  const [opacity, setOpacity] = useState(1)
  const [maxH, setMaxH] = useState<number>(120)
  const [mb, setMb] = useState<number>(28)

  useEffect(() => {
    if (!verified) return
    let cancelled = false
    const timers: ReturnType<typeof setTimeout>[] = []
    const at = (ms: number, fn: () => void) => {
      const t = setTimeout(() => { if (!cancelled) fn() }, ms)
      timers.push(t)
    }

    // Mirror the onboarding completion flourish timing:
    // 500ms  → step 2 transitions to completed (navy checkmark)
    at(500, () => setAllComplete(true))
    // +600ms → glow sweeps across the two circles in sequence
    at(1100, () => setFlourishIndex(0))
    at(1170, () => setFlourishIndex(1))
    // last glow +300ms → clear the glow and hold the completed state
    at(1470, () => setFlourishIndex(-1))
    // hold 1800ms → fade + collapse away (copy/link below remain)
    at(3270, () => { setOpacity(0); setMaxH(0); setMb(0) })

    return () => { cancelled = true; timers.forEach(clearTimeout) }
  }, [verified])

  // Step 2 is the active (current, then just-completing) step in both modes.
  const displayStep = 2

  return (
    <div
      role="list"
      aria-label="Recovery email verification: step 2 of 2"
      style={{
        maxWidth: 300,
        width: '100%',
        margin: '0 auto',
        marginBottom: mb,
        maxHeight: maxH,
        opacity,
        overflow: 'hidden',
        transition: verified
          ? 'opacity 800ms ease-in-out, max-height 800ms ease-in-out, margin-bottom 800ms ease-in-out'
          : 'none',
      }}
    >
      {/* Row 1: circles + connector */}
      <div style={{ display: 'flex', alignItems: 'center', width: '100%' }}>
        {STEPS.map((step, i) => {
          const stepNum = i + 1
          const isCompleted = allComplete || stepNum < displayStep
          const isCurrent = !allComplete && stepNum === displayStep
          const isFlourish = flourishIndex === i

          let circleBg = 'transparent'
          let circleBorder = '1.5px solid rgba(19,4,38,0.5)'
          let circleBoxShadow = 'none'
          if (isCompleted) {
            circleBg = '#2C3777'
            circleBorder = '1.5px solid #2C3777'
          } else if (isCurrent) {
            circleBg = '#F29836'
            circleBorder = '2px solid #F29836'
            circleBoxShadow = '0 0 0 4px rgba(242,152,54,0.18)'
          }
          if (isFlourish) {
            const base = isCurrent || isCompleted ? '0 0 0 4px rgba(242,152,54,0.18), ' : ''
            circleBoxShadow = `${base}0 0 0 6px rgba(242,152,54,0.4), 0 0 0 12px rgba(242,152,54,0.15)`
          }

          return (
            <Fragment key={i}>
              <div
                role="listitem"
                aria-label={`Step ${stepNum}: ${step.label} — ${isCompleted ? 'completed' : 'current'}`}
                aria-current={isCurrent ? 'step' : undefined}
                style={{ flex: '0 0 44px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                <div
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: '50%',
                    background: circleBg,
                    border: circleBorder,
                    boxShadow: circleBoxShadow,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'background 500ms ease-in-out, border-color 500ms ease-in-out, box-shadow 350ms ease-in-out',
                  }}
                >
                  {isCompleted ? (
                    <Checkmark />
                  ) : (
                    <span
                      style={{
                        fontFamily: HV,
                        fontSize: 13,
                        fontWeight: 600,
                        color: isCurrent ? '#130426' : 'rgba(19,4,38,0.65)',
                        lineHeight: 1,
                        userSelect: 'none',
                      }}
                    >
                      {stepNum}
                    </span>
                  )}
                </div>
              </div>

              {i < STEPS.length - 1 && (
                // Connector is always filled — step 1 is complete in both modes.
                <div style={{ flex: 1, height: 2, background: '#2C3777', borderRadius: 1 }} />
              )}
            </Fragment>
          )
        })}
      </div>

      {/* Row 2: labels */}
      <div style={{ display: 'flex', alignItems: 'flex-start', width: '100%', marginTop: 8 }}>
        {STEPS.map((step, i) => {
          const stepNum = i + 1
          const isCurrent = !allComplete && stepNum === displayStep
          return (
            <Fragment key={i}>
              <div
                aria-hidden="true"
                style={{ flex: '0 0 44px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                <span
                  style={{
                    fontFamily: HV,
                    fontSize: 11,
                    fontWeight: isCurrent ? 600 : 400,
                    color: '#130426',
                    textAlign: 'center',
                    lineHeight: 1.25,
                    transition: 'font-weight 500ms ease-in-out',
                  }}
                >
                  {step.label}
                </span>
              </div>
              {i < STEPS.length - 1 && <div style={{ flex: 1 }} aria-hidden="true" />}
            </Fragment>
          )
        })}
      </div>
    </div>
  )
}
