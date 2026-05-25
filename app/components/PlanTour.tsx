'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { scrollToTourTarget, TOUR_SCROLL_SETTLE_MS } from '@/lib/tour-scroll'

const apf = "'Apfel Grotezk', sans-serif"
const hv  = "'Helvetica Neue', Helvetica, Arial, sans-serif"
const ARROW_COLOR = '#FF5E1F'

const tourKey = (uid: string) => `nightside.tour.planPage:${uid}`

const STEPS = [
  {
    title: 'Welcome to Your Plan',
    body: "This is a place to gather your outputs, review your thinking, and manage key tasks. Fill things in at your own pace, and export when you're ready.",
    anchor: null as string | null,
  },
  {
    title: 'Key details',
    body: 'Your most important info at a glance — pulled from documents and contacts as you fill them in.',
    anchor: 'tour-key-details' as string | null,
  },
  {
    title: 'Areas of planning',
    body: 'Click into an area to track your progress and access the documents, reflections, and learning content for that area.',
    anchor: 'tour-areas' as string | null,
  },
  {
    title: 'Your Materials',
    body: "All your documents, activity outputs, and notes live here. Pick up where you left off, or export when you're ready.",
    anchor: 'tour-materials' as string | null,
  },
]

// ---------------------------------------------------------------------------
// Arrow geometry
// ---------------------------------------------------------------------------

function bezierTangent(p0: number, p1: number, p2: number, p3: number, t: number) {
  const mt = 1 - t
  return 3 * mt * mt * (p1 - p0) + 6 * mt * t * (p2 - p1) + 3 * t * t * (p3 - p2)
}

type ArrowDef = {
  curvePath: string
  hx: number
  hy: number
  headAngle: number // degrees
}

function targetRect(anchor: string | null): DOMRect | null {
  if (!anchor || typeof document === 'undefined') return null
  const el = document.querySelector<HTMLElement>(`[data-tour-anchor="${anchor}"]`) ||
             document.getElementById(anchor)
  return el ? el.getBoundingClientRect() : null
}

function getArrow(stepIdx: number, vw: number, vh: number): ArrowDef | null {
  if (stepIdx === 0 || vw < 600) return null

  const modalW = Math.min(400, vw - 32)
  const mhw = modalW / 2  // modal half-width
  const mhh = 138         // approximate modal half-height
  const cx = vw / 2
  const cy = vh / 2

  let sx: number, sy: number
  let cp1x: number, cp1y: number
  let cp2x: number, cp2y: number
  let ex: number, ey: number

  if (stepIdx === 1) {
    // Key details: exit modal right, arrive vertically from above the panel.
    // Endpoint reads the panel's actual top edge so the arrowhead lands
    // 8px above the panel header instead of inside the panel content.
    sx = cx + mhw + 18;  sy = cy
    const rect = targetRect(STEPS[1].anchor)
    if (rect) {
      ex = rect.left + rect.width / 2
      ey = rect.top - 8
    } else {
      ex = Math.min(vw - 60, cx + mhw + 155); ey = cy + 75
    }
    cp1x = (sx + ex) / 2;  cp1y = sy       // halfway x, same y → horizontal exit
    cp2x = ex;             cp2y = ey - 70  // directly above endpoint → vertical arrival
  } else if (stepIdx === 2) {
    // Areas of planning: exit modal left, arrive vertically above the
    // section. The anchor wraps the cards grid (not the h2), so we lift
    // ey an extra 30px so the arrowhead lands on the heading.
    sx = cx - mhw - 18;  sy = cy
    const rect = targetRect(STEPS[2].anchor)
    if (rect) {
      ex = rect.left + 100
      ey = rect.top - 30
    } else {
      ex = Math.max(60, cx - mhw - 70); ey = cy + 72
    }
    cp1x = sx - 24;  cp1y = sy + 20    // gentle exit left
    cp2x = ex;       cp2y = ey - 50    // directly above end → arrowhead points down
  } else {
    // Your Materials: bottom-center → straight down, long enough to clear the fold
    sx = cx;  sy = cy + mhh + 18
    ex = cx + 5;  ey = cy + mhh + 196
    cp1x = cx + 4;  cp1y = sy + 55
    cp2x = cx + 8;  cp2y = ey - 55
  }

  const curvePath = `M ${sx} ${sy} C ${cp1x} ${cp1y} ${cp2x} ${cp2y} ${ex} ${ey}`
  const tx = bezierTangent(sx, cp1x, cp2x, ex, 1)
  const ty = bezierTangent(sy, cp1y, cp2y, ey, 1)
  const headAngle = Math.atan2(ty, tx) * 180 / Math.PI

  return { curvePath, hx: ex, hy: ey, headAngle }
}

// ---------------------------------------------------------------------------
// Arrow component — remounts on key change to restart draw animation
// ---------------------------------------------------------------------------

function Arrow({ def }: { def: ArrowDef }) {
  const { curvePath, hx, hy, headAngle } = def
  return (
    <svg
      style={{
        position: 'fixed', inset: 0, width: '100%', height: '100%',
        pointerEvents: 'none', zIndex: 1002, overflow: 'visible',
      }}
    >
      {/* Draw-on curve */}
      <path
        d={curvePath}
        stroke={ARROW_COLOR}
        strokeWidth={6.5}
        fill="none"
        strokeLinecap="round"
        pathLength={1}
        style={{
          strokeDasharray: '1',
          strokeDashoffset: '1',
          animation: 'tour-draw 700ms cubic-bezier(0.4,0,0.2,1) 100ms forwards',
        }}
      />

      {/* Arrowhead — appears after draw, then pulses */}
      <g transform={`translate(${hx}, ${hy}) rotate(${headAngle})`}>
        <g
          style={{
            opacity: 0,
            animation: 'tour-tip-in 200ms ease 780ms forwards, tour-tip-pulse 1.4s ease-in-out 1100ms infinite',
          }}
        >
          <path
            d="M -16,-8 L 0,0 L -16,8"
            stroke={ARROW_COLOR}
            strokeWidth={6.5}
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </g>
      </g>
    </svg>
  )
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function PlanTour({ userId }: { userId: string }) {
  const [active, setActive]             = useState(false)
  const [stepIdx, setStepIdx]           = useState(0)
  const [btnHover, setBtnHover]         = useState<'back' | 'next' | null>(null)
  const [arrowKey, setArrowKey]         = useState(0)
  const [arrowVisible, setArrowVisible] = useState(true)
  const [vw, setVw]                     = useState(0)
  const [vh, setVh]                     = useState(0)
  const mounted = useRef(true)

  useEffect(() => {
    mounted.current = true
    return () => { mounted.current = false }
  }, [])

  // Track viewport size while tour is open
  useEffect(() => {
    if (!active) return
    const update = () => { setVw(window.innerWidth); setVh(window.innerHeight) }
    update()
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [active])

  // Wait for page ready: PlanOverview loaded + no welcome modal open
  useEffect(() => {
    if (!userId) return
    if (localStorage.getItem(tourKey(userId)) === 'done') return

    let timer: ReturnType<typeof setTimeout>

    function checkReady() {
      if (!mounted.current) return
      const keyDetailsEl = document.getElementById('tour-key-details')
      const dialogEl     = document.querySelector('[role="dialog"]')
      if (keyDetailsEl && !dialogEl) {
        if (mounted.current) setActive(true)
      } else {
        timer = setTimeout(checkReady, 350)
      }
    }

    timer = setTimeout(checkReady, 900)
    return () => clearTimeout(timer)
  }, [userId])

  const dismiss = useCallback(() => {
    localStorage.setItem(tourKey(userId), 'done')
    setActive(false)
  }, [userId])

  // Fade out current arrow, switch step, remount the arrow. Auto-scroll
  // runs only on mobile (<768px); desktop keeps the original no-scroll
  // behavior since its arrow geometry assumes a stable viewport.
  const goToStep = useCallback((newIdx: number) => {
    const isMobile = typeof window !== 'undefined' && window.innerWidth < 768
    setArrowVisible(false)
    if (isMobile) scrollToTourTarget(STEPS[newIdx].anchor)
    setTimeout(() => {
      setStepIdx(newIdx)
      setArrowKey(k => k + 1)
      setArrowVisible(true)
    }, isMobile ? TOUR_SCROLL_SETTLE_MS : 200)
  }, [])

  const next = useCallback(() => {
    if (stepIdx === STEPS.length - 1) { dismiss(); return }
    goToStep(stepIdx + 1)
  }, [stepIdx, dismiss, goToStep])

  const back = useCallback(() => {
    if (stepIdx > 0) goToStep(stepIdx - 1)
  }, [stepIdx, goToStep])

  if (!active) return null

  const step    = STEPS[stepIdx]
  const isLast  = stepIdx === STEPS.length - 1
  const isFirst = stepIdx === 0
  const arrowDef = vw > 0 ? getArrow(stepIdx, vw, vh) : null

  return (
    <div
      role="presentation"
      style={{ position: 'fixed', inset: 0, zIndex: 1000 }}
      onKeyDown={e => { if (e.key === 'Escape') dismiss() }}
    >
      <style>{`
        @keyframes tour-draw {
          from { stroke-dashoffset: 1; }
          to   { stroke-dashoffset: 0; }
        }
        @keyframes tour-tip-in {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes tour-tip-pulse {
          0%, 100% { opacity: 1; }
          50%      { opacity: 0.45; }
        }
      `}</style>

      {/* Uniform dim overlay */}
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(19,4,38,0.62)' }} />

      {/* Arrow layer */}
      {arrowDef && (
        <div style={{ opacity: arrowVisible ? 1 : 0, transition: 'opacity 200ms ease' }}>
          <Arrow key={arrowKey} def={arrowDef} />
        </div>
      )}

      {/* Centered modal */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label={step.title}
        style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          zIndex: 1001,
          width: 400,
          maxWidth: 'calc(100vw - 32px)',
          background: '#F8F4EB',
          border: '1px solid rgba(19,4,38,0.1)',
          borderRadius: 16,
          padding: '28px',
          boxShadow: '0 8px 40px rgba(0,0,0,0.25)',
          boxSizing: 'border-box',
        }}
      >
        {/* Step counter */}
        <p style={{
          fontFamily: hv,
          fontSize: 12,
          fontWeight: 600,
          color: 'rgba(19,4,38,0.55)',
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
          margin: '0 0 10px',
        }}>
          {stepIdx + 1} of {STEPS.length}
        </p>

        {/* Title */}
        <h3 style={{
          fontFamily: apf,
          fontSize: 22,
          fontWeight: 400,
          color: '#130426',
          margin: '0 0 12px',
          lineHeight: 1.2,
        }}>
          {step.title}
        </h3>

        {/* Body */}
        <p style={{
          fontFamily: hv,
          fontSize: 15,
          lineHeight: 1.65,
          color: 'rgba(19,4,38,0.78)',
          margin: '0 0 24px',
          whiteSpace: 'pre-line',
        }}>
          {step.body}
        </p>

        {/* Navigation row */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <button
            onClick={dismiss}
            style={{
              fontFamily: hv,
              fontSize: 13,
              fontWeight: 500,
              color: 'rgba(19,4,38,0.55)',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: 0,
              textDecoration: 'underline',
              textUnderlineOffset: 2,
            }}
          >
            Skip tour
          </button>

          <div style={{ display: 'flex', gap: 8 }}>
            {!isFirst && (
              <button
                onClick={back}
                onMouseEnter={() => setBtnHover('back')}
                onMouseLeave={() => setBtnHover(null)}
                style={{
                  fontFamily: hv,
                  fontSize: 14,
                  fontWeight: 500,
                  color: '#2C3777',
                  background: btnHover === 'back' ? 'rgba(44,55,119,0.06)' : 'transparent',
                  border: '1px solid #2C3777',
                  borderRadius: 999,
                  padding: '8px 16px',
                  cursor: 'pointer',
                  transition: 'background 150ms ease',
                }}
              >
                ← Back
              </button>
            )}
            <button
              onClick={next}
              onMouseEnter={() => setBtnHover('next')}
              onMouseLeave={() => setBtnHover(null)}
              style={{
                fontFamily: hv,
                fontSize: 14,
                fontWeight: 500,
                color: '#F8F4EB',
                background: btnHover === 'next' ? '#3d4e8f' : '#2C3777',
                border: 'none',
                borderRadius: 999,
                padding: '8px 20px',
                cursor: 'pointer',
                transition: 'background 150ms ease',
              }}
            >
              {isLast ? 'Got it' : 'Next →'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
