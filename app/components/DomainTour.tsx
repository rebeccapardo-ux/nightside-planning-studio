'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { createSupabaseBrowserClient } from '@/lib/supabase-browser'

// Visual primitives are copied 1:1 from PlanTour so the two tours read as the
// same pattern. Only the step content + arrow geometry differ.
const apf = "'Apfel Grotezk', sans-serif"
const hv  = "'Helvetica Neue', Helvetica, Arial, sans-serif"
const ARROW_COLOR = '#FF5E1F'

// Independent flag from PlanTour. Set once after the user sees this tour on
// any domain page; never fires again on any domain page after that.
const tourKey = (uid: string) => `nightside.tour.domain:${uid}`

const STEPS = [
  {
    title: 'Track your progress at a glance',
    body: 'This shows how engaged you are with this area overall. It updates automatically as you make progress in the panels below.',
  },
  {
    title: 'Topics to think through and read about for this area',
    body: 'Update your status manually as you explore each one. Relevant materials also surface here.',
  },
  {
    title: 'Practical decisions to make and document',
    body: 'Check items off as you go — your progress updates automatically. Relevant materials surface here too.',
  },
  {
    title: 'Capture thoughts as they come',
    body: 'Notes you take here save to Your Plan and stay attached to this area.',
  },
]

// ---------------------------------------------------------------------------
// Arrow geometry — same bezier draw + animated arrowhead as PlanTour,
// retargeted for the four domain-page sections.
// ---------------------------------------------------------------------------

function bezierTangent(p0: number, p1: number, p2: number, p3: number, t: number) {
  const mt = 1 - t
  return 3 * mt * mt * (p1 - p0) + 6 * mt * t * (p2 - p1) + 3 * t * t * (p3 - p2)
}

type ArrowDef = {
  curvePath: string
  hx: number
  hy: number
  headAngle: number
}

function getArrow(stepIdx: number, vw: number, vh: number): ArrowDef | null {
  if (vw < 600) return null

  const modalW = Math.min(400, vw - 32)
  const mhw = modalW / 2
  const mhh = 138
  const cx = vw / 2
  const cy = vh / 2

  let sx: number, sy: number
  let cp1x: number, cp1y: number
  let cp2x: number, cp2y: number
  let ex: number, ey: number

  if (stepIdx === 0) {
    // Planning Status — exit modal top, curve up, arrowhead pointing UP.
    sx = cx;          sy = cy - mhh - 18
    ex = cx + 5;      ey = Math.max(40, cy - mhh - 160)
    cp1x = cx + 4;    cp1y = sy - 55
    cp2x = cx + 8;    cp2y = ey + 55
  } else if (stepIdx === 1) {
    // Reflection + Learning panel (left of two-panel section). Exit modal
    // left, curve down-left, arrowhead arrives from above so it points DOWN.
    sx = cx - mhw - 18;  sy = cy
    ex = Math.max(60, cx - mhw - 70);  ey = cy + 72
    cp1x = sx - 24;  cp1y = sy + 20
    cp2x = ex + 18;  cp2y = ey - 50
  } else if (stepIdx === 2) {
    // Practical Readiness panel (right of two-panel section). Mirror of
    // step 1: exit modal right, curve down-right, arrowhead points DOWN.
    sx = cx + mhw + 18;  sy = cy
    ex = Math.min(vw - 60, cx + mhw + 70);  ey = cy + 72
    cp1x = sx + 24;  cp1y = sy + 20
    cp2x = ex - 18;  cp2y = ey - 50
  } else {
    // Notes section — likely below the fold. Same long downward as Plan
    // tour's "Your Materials" step.
    sx = cx;     sy = cy + mhh + 18
    ex = cx + 5; ey = cy + mhh + 196
    cp1x = cx + 4;  cp1y = sy + 55
    cp2x = cx + 8;  cp2y = ey - 55
  }

  const curvePath = `M ${sx} ${sy} C ${cp1x} ${cp1y} ${cp2x} ${cp2y} ${ex} ${ey}`
  const tx = bezierTangent(sx, cp1x, cp2x, ex, 1)
  const ty = bezierTangent(sy, cp1y, cp2y, ey, 1)
  const headAngle = Math.atan2(ty, tx) * 180 / Math.PI

  return { curvePath, hx: ex, hy: ey, headAngle }
}

function Arrow({ def }: { def: ArrowDef }) {
  const { curvePath, hx, hy, headAngle } = def
  return (
    <svg
      style={{
        position: 'fixed', inset: 0, width: '100%', height: '100%',
        pointerEvents: 'none', zIndex: 1002, overflow: 'visible',
      }}
    >
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

export default function DomainTour() {
  const [userId, setUserId]             = useState<string | null>(null)
  const [active, setActive]             = useState(false)
  const [stepIdx, setStepIdx]           = useState(0)
  const [btnHover, setBtnHover]         = useState<'back' | 'next' | null>(null)
  const [arrowKey, setArrowKey]         = useState(0)
  const [arrowVisible, setArrowVisible] = useState(true)
  const [vw, setVw]                     = useState(0)
  const [vh, setVh]                     = useState(0)
  const mounted = useRef(true)
  const primaryBtnRef = useRef<HTMLButtonElement | null>(null)

  useEffect(() => {
    mounted.current = true
    return () => { mounted.current = false }
  }, [])

  // Resolve the user once. If unauthed, the tour never activates.
  useEffect(() => {
    const supabase = createSupabaseBrowserClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (mounted.current) setUserId(user?.id ?? null)
    })
  }, [])

  useEffect(() => {
    if (!active) return
    const update = () => { setVw(window.innerWidth); setVh(window.innerHeight) }
    update()
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [active])

  // Wait until the domain page's main content is rendered (loading gate
  // released, anchor element present) and no other modal is open.
  useEffect(() => {
    if (!userId) return
    if (localStorage.getItem(tourKey(userId)) === 'done') return

    let timer: ReturnType<typeof setTimeout>

    function checkReady() {
      if (!mounted.current) return
      const anchor   = document.querySelector('[data-tour-anchor="domain-ready"]')
      const dialogEl = document.querySelector('[role="dialog"]')
      if (anchor && !dialogEl) {
        if (mounted.current) setActive(true)
      } else {
        timer = setTimeout(checkReady, 350)
      }
    }

    timer = setTimeout(checkReady, 900)
    return () => clearTimeout(timer)
  }, [userId])

  // Move keyboard focus to the primary CTA on each step transition.
  useEffect(() => {
    if (!active) return
    const id = setTimeout(() => primaryBtnRef.current?.focus(), 30)
    return () => clearTimeout(id)
  }, [active, stepIdx])

  const dismiss = useCallback(() => {
    if (userId) localStorage.setItem(tourKey(userId), 'done')
    setActive(false)
  }, [userId])

  const goToStep = useCallback((newIdx: number) => {
    setArrowVisible(false)
    setTimeout(() => {
      setStepIdx(newIdx)
      setArrowKey(k => k + 1)
      setArrowVisible(true)
    }, 200)
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
        @media (prefers-reduced-motion: reduce) {
          path[style*="tour-draw"] { animation: none !important; stroke-dashoffset: 0 !important; }
          g[style*="tour-tip"]     { animation: none !important; opacity: 1 !important; }
        }
      `}</style>

      <div style={{ position: 'absolute', inset: 0, background: 'rgba(19,4,38,0.62)' }} />

      {arrowDef && (
        <div style={{ opacity: arrowVisible ? 1 : 0, transition: 'opacity 200ms ease' }}>
          <Arrow key={arrowKey} def={arrowDef} />
        </div>
      )}

      <div
        role="dialog"
        aria-modal="true"
        aria-label={step.title}
        aria-live="polite"
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
              ref={primaryBtnRef}
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
