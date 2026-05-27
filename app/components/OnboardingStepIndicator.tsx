'use client'
import { useState, useEffect, Fragment } from 'react'

const STEPS = [
  { label: 'Sign up' },
  { label: 'Confirm\nemail' },
  { label: 'Pay' },
  { label: 'Legacy\nContact' },
  { label: 'Ready\nto plan' },
]

function Checkmark() {
  return (
    <svg width="14" height="11" viewBox="0 0 14 11" fill="none" aria-hidden="true">
      <path d="M1.5 5.5L5 9L12.5 1.5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

interface Props {
  currentStep: number
  allComplete?: boolean
  flourishIndex?: number
}

export default function OnboardingStepIndicator({ currentStep, allComplete = false, flourishIndex = -1 }: Props) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 80)
    return () => clearTimeout(t)
  }, [])

  const displayStep = mounted ? currentStep : 0

  const totalSteps = STEPS.length

  return (
    <div
      role="list"
      aria-label={`Onboarding: step ${currentStep} of 5`}
      style={{
        maxWidth: 640,
        width: '100%',
        margin: '0 auto',
        padding: '0 16px',
        boxSizing: 'border-box',
      }}
    >
      {/* Row 1: circles + lines */}
      <div style={{ display: 'flex', alignItems: 'center', width: '100%' }}>
        {STEPS.map((step, i) => {
          const stepNum = i + 1
          const isCompleted = allComplete || stepNum < displayStep
          const isCurrent = !allComplete && stepNum === displayStep
          const isUpcoming = !allComplete && stepNum > displayStep
          const isFlourishTarget = flourishIndex === i

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

          if (isFlourishTarget) {
            const baseGlow = isCurrent
              ? '0 0 0 4px rgba(242,152,54,0.18)'
              : isCompleted
              ? '0 0 0 4px rgba(242,152,54,0.18)'
              : ''
            circleBoxShadow = `${baseGlow ? baseGlow + ', ' : ''}0 0 0 6px rgba(242,152,54,0.4), 0 0 0 12px rgba(242,152,54,0.15)`
          }

          let numberColor = 'rgba(19,4,38,0.65)'
          if (isCurrent) numberColor = '#130426'

          let stepLabel = ''
          if (isCompleted) stepLabel = 'completed'
          else if (isCurrent) stepLabel = 'current'
          else stepLabel = 'upcoming'

          const lineIndex = i // line after circle i connects to circle i+1
          const lineIsFilled = allComplete || (i + 1) < displayStep

          return (
            <Fragment key={i}>
              {/* Circle wrapper */}
              <div
                role="listitem"
                aria-label={`Step ${stepNum}: ${step.label.replace('\n', ' ')} — ${stepLabel}`}
                aria-current={isCurrent ? 'step' : undefined}
                style={{
                  flex: '0 0 56px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
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
                        fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif",
                        fontSize: 13,
                        fontWeight: 600,
                        color: numberColor,
                        lineHeight: 1,
                        transition: 'color 500ms ease-in-out',
                        userSelect: 'none',
                      }}
                    >
                      {stepNum}
                    </span>
                  )}
                </div>
              </div>

              {/* Connecting line (not after last circle) */}
              {i < totalSteps - 1 && (
                <div
                  style={{
                    flex: 1,
                    height: 2,
                    background: 'rgba(19,4,38,0.18)',
                    position: 'relative',
                    overflow: 'hidden',
                    borderRadius: 1,
                  }}
                >
                  <div
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      bottom: 0,
                      width: lineIsFilled ? '100%' : '0%',
                      background: '#2C3777',
                      borderRadius: 1,
                      transition: `width 500ms ease-in-out ${lineIndex * 60}ms`,
                    }}
                  />
                </div>
              )}
            </Fragment>
          )
        })}
      </div>

      {/* Row 2: labels */}
      <div style={{ display: 'flex', alignItems: 'flex-start', width: '100%', marginTop: 8 }}>
        {STEPS.map((step, i) => {
          const stepNum = i + 1
          const isCompleted = allComplete || stepNum < displayStep
          const isCurrent = !allComplete && stepNum === displayStep

          let labelColor = 'rgba(19,4,38,0.65)'
          let labelWeight: number | string = 400
          if (isCompleted) {
            labelColor = '#130426'
            labelWeight = 400
          } else if (isCurrent) {
            labelColor = '#130426'
            labelWeight = 600
          }

          return (
            <Fragment key={i}>
              {/* Label wrapper — matches circle wrapper width */}
              <div
                aria-hidden="true"
                style={{
                  flex: '0 0 56px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <span
                  style={{
                    fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif",
                    fontSize: 10,
                    fontWeight: labelWeight,
                    color: labelColor,
                    whiteSpace: 'pre-line',
                    textAlign: 'center',
                    lineHeight: 1.25,
                    display: 'block',
                    transition: 'color 500ms ease-in-out, font-weight 500ms ease-in-out',
                  }}
                >
                  {step.label}
                </span>
              </div>

              {/* Gap spacer — matches line flex: 1 */}
              {i < STEPS.length - 1 && (
                <div style={{ flex: 1 }} aria-hidden="true" />
              )}
            </Fragment>
          )
        })}
      </div>
    </div>
  )
}
