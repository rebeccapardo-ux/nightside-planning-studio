'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { createSupabaseBrowserClient } from '@/lib/supabase-browser'
import { scrollToTourTarget, TOUR_SCROLL_SETTLE_MS } from '@/lib/tour-scroll'

// Visual primitives mirror PlanTour so the two tours read as the same
// pattern. Differences:
//   * Each step has an explicit DOM anchor (data-tour-anchor) that the
//     auto-scroll uses to bring the target into view.
//   * Desktop modal position varies per step so the modal never occludes
//     the area the arrow is pointing to. On mobile the modal stays
//     centered and auto-scroll handles the "where to look" problem.
//   * Steps 1 + 2 read the target element's bounding box at draw time so
//     the arrow tip actually reaches the panel rather than hanging mid-
//     air. Plan tour didn't need this because its targets sit at known
//     offsets from viewport center.
const apf = "'Apfel Grotezk', sans-serif"
const hv  = "'Helvetica Neue', Helvetica, Arial, sans-serif"
const ARROW_COLOR = '#FF5E1F'

const tourKey = (uid: string) => `nightside.tour.domain:${uid}`

type Step = {
  title: string
  body: string
  anchor: string
}

const STEPS: Step[] = [
  {
    title: 'Planning Status',
    body: 'Track your progress in this area at a glance. Your planning status updates automatically based on your activity in the panels below.',
    anchor: 'planning-status',
  },
  {
    title: 'Reflection + Learning',
    body: 'Topics to think through and read about for this area. Update your status manually as you explore each one. Relevant materials also surface here.',
    anchor: 'reflection-learning',
  },
  {
    title: 'Practical Readiness',
    body: 'Document practical decisions. Check items off as you go — your progress updates automatically. Relevant materials surface here too.',
    anchor: 'practical-readiness',
  },
  {
    title: 'Your Thoughts',
    body: "Capture thoughts about this area in the notes section below. They'll save to Your Plan and stay attached here.",
    anchor: 'your-thoughts',
  },
]

// ---------------------------------------------------------------------------
// Modal positioning per step (desktop only — mobile is always centered).
// Returns the modal's intended center (cx, cy) plus the inline style that
// should be applied to the modal element. mhw/mhh stay constant so the
// arrow math can rely on them.
// ---------------------------------------------------------------------------

const MODAL_W   = 400
const MODAL_MHH = 138 // approximate half-height for arrow math

type ModalPlacement = {
  cx: number
  cy: number
  style: React.CSSProperties
}

function getModalPlacement(stepIdx: number, vw: number, vh: number): ModalPlacement {
  const mhw = Math.min(MODAL_W, vw - 32) / 2
  const isMobile = vw < 768

  // Mobile: always center. Auto-scroll handles target visibility.
  if (isMobile) {
    return {
      cx: vw / 2,
      cy: vh / 2,
      style: { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' },
    }
  }

  // Desktop placements per the brief:
  //   step 0 (Planning Status) — modal anchored to the right side, vertically lower.
  //     Planning Status sits in the upper half of the viewport after scroll;
  //     placing the modal lower-right keeps it out of the way.
  //   step 1 (R+L)               — modal on the right; R+L sits on the left.
  //   step 2 (Practical Readiness)— modal on the left; PR sits on the right.
  //   step 3 (Your Thoughts)     — centered. Arrow points down.
  let cx: number, cy: number, style: React.CSSProperties

  if (stepIdx === 0) {
    cx = vw - mhw - 60
    cy = vh / 2 + 40
    style = { top: cy, left: cx, transform: 'translate(-50%, -50%)' }
  } else if (stepIdx === 1) {
    cx = vw - mhw - 60
    cy = vh / 2
    style = { top: cy, left: cx, transform: 'translate(-50%, -50%)' }
  } else if (stepIdx === 2) {
    cx = mhw + 60
    cy = vh / 2
    style = { top: cy, left: cx, transform: 'translate(-50%, -50%)' }
  } else {
    cx = vw / 2
    cy = vh / 2
    style = { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }
  }

  return { cx, cy, style }
}

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
  headAngle: number
}

function getTargetPoint(anchor: string): { x: number; y: number; rect: DOMRect } | null {
  if (typeof document === 'undefined') return null
  const el =
    document.querySelector<HTMLElement>(`[data-tour-anchor="${anchor}"]`) ||
    document.getElementById(anchor)
  if (!el) return null
  const rect = el.getBoundingClientRect()
  // Tip lands just above the top edge horizontally centered on the element.
  return { x: rect.left + rect.width / 2, y: rect.top + 4, rect }
}

function getArrow(stepIdx: number, vw: number, vh: number, modal: ModalPlacement): ArrowDef | null {
  if (vw < 768) return null

  const { cx, cy } = modal
  const mhw = Math.min(MODAL_W, vw - 32) / 2
  const mhh = MODAL_MHH
  const anchor = STEPS[stepIdx].anchor
  const tgt = getTargetPoint(anchor)

  let sx: number, sy: number
  let cp1x: number, cp1y: number
  let cp2x: number, cp2y: number
  let ex: number, ey: number

  // Curve recipe (steps 0–2): cubic bezier with the same vertical-
  // arrival trick PlanTour uses — cp2x = ex (directly above the
  // endpoint) forces the curve's end tangent to be straight down so the
  // arrowhead points cleanly onto the target. For the swoosh shape,
  // both control points sit at the same "peak" y above the line from
  // start to end, which arcs the path up before it drops onto the
  // target. cp1's x is offset along the path so the start tangent
  // exits the modal in the natural direction (up, left, or right
  // depending on which side of the modal we're on).
  //
  // Step 3 is a straight downward arrow, verbatim from Plan tour's
  // "Your Materials" step for below-the-fold content.

  if (stepIdx === 0) {
    // Planning Status — modal lower-right, PS above and to the left.
    // Exit modal top-left going up, drop onto the PS header.
    sx = cx - mhw + 60;                                   sy = cy - mhh
    if (tgt) { ex = tgt.x;                                ey = Math.max(40, tgt.y - 8) }
    else     { ex = Math.max(80, cx - mhw - 80);          ey = Math.max(40, cy - 220) }
    cp1x = sx - 30;          cp1y = sy - 80               // up-left of start (upward exit)
    cp2x = ex;               cp2y = ey - 60               // directly above end → straight-down arrival
  } else if (stepIdx === 1) {
    // Reflection + Learning — modal on right, R+L panel below-left.
    // Exit modal left, arc up then down onto the panel's top edge.
    sx = cx - mhw - 18;                                   sy = cy
    if (tgt) { ex = tgt.rect.left + tgt.rect.width * 0.25; ey = Math.max(60, tgt.y - 8) }
    else     { ex = Math.max(80, cx - mhw - 380);         ey = cy + 100 }
    const peakY = Math.min(sy, ey) - 80                   // arc peak — well above the lower of start/end
    cp1x = sx + (ex - sx) * 0.3;  cp1y = peakY            // 30% toward target, at peak
    cp2x = ex;                    cp2y = peakY            // directly above end, same height → vertical arrival
  } else if (stepIdx === 2) {
    // Practical Readiness — modal on left, PR panel below-right. Mirror
    // of step 1. Endpoint targets the header text area (left quarter
    // of the panel rect, just above the top edge).
    sx = cx + mhw + 18;                                   sy = cy
    if (tgt) { ex = tgt.rect.left + tgt.rect.width * 0.25; ey = Math.max(60, tgt.y - 8) }
    else     { ex = Math.min(vw - 80, cx + mhw + 380);    ey = cy + 100 }
    const peakY = Math.min(sy, ey) - 80
    cp1x = sx + (ex - sx) * 0.3;  cp1y = peakY
    cp2x = ex;                    cp2y = peakY
  } else {
    // Your Thoughts — straight down to below-the-fold notes section.
    // Same shape as PlanTour's final step.
    sx = cx;             sy = cy + mhh + 18
    ex = cx + 5;         ey = cy + mhh + 196
    cp1x = cx + 4;       cp1y = sy + 55
    cp2x = cx + 8;       cp2y = ey - 55
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
    window.addEventListener('scroll', update, { passive: true })
    return () => {
      window.removeEventListener('resize', update)
      window.removeEventListener('scroll', update)
    }
  }, [active])

  useEffect(() => {
    if (!userId) return
    if (localStorage.getItem(tourKey(userId)) === 'done') return

    let timer: ReturnType<typeof setTimeout>

    function checkReady() {
      if (!mounted.current) return
      const anchor   = document.querySelector('[data-tour-anchor="domain-ready"]')
      const dialogEl = document.querySelector('[role="dialog"]')
      if (anchor && !dialogEl) {
        if (mounted.current) {
          // Mobile: bring step 0's target into view before activating so
          // the first modal renders against a settled page. Desktop: no
          // scroll — assumes the user is at the top of the page after
          // navigation and the desktop arrow geometry handles where
          // targets sit relative to the modal.
          const isMobile = window.innerWidth < 768
          if (isMobile) {
            scrollToTourTarget(STEPS[0].anchor)
            setTimeout(() => { if (mounted.current) setActive(true) }, TOUR_SCROLL_SETTLE_MS)
          } else {
            setActive(true)
          }
        }
      } else {
        timer = setTimeout(checkReady, 350)
      }
    }

    timer = setTimeout(checkReady, 900)
    return () => clearTimeout(timer)
  }, [userId])

  useEffect(() => {
    if (!active) return
    const id = setTimeout(() => primaryBtnRef.current?.focus(), 30)
    return () => clearTimeout(id)
  }, [active, stepIdx])

  const dismiss = useCallback(() => {
    if (userId) localStorage.setItem(tourKey(userId), 'done')
    setActive(false)
    // On mobile, auto-scroll progressively moved the user down through
    // the page during the tour. Return them to the top so the end of
    // the tour doesn't leave them stranded mid-page.
    if (typeof window !== 'undefined' && window.innerWidth < 768) {
      scrollToTourTarget(null)
    }
  }, [userId])

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
  const modal   = vw > 0 ? getModalPlacement(stepIdx, vw, vh) : null
  const arrowDef = (vw > 0 && modal) ? getArrow(stepIdx, vw, vh, modal) : null

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
          ...(modal?.style ?? { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }),
          zIndex: 1001,
          width: MODAL_W,
          maxWidth: 'calc(100vw - 32px)',
          background: '#F8F4EB',
          border: '1px solid rgba(19,4,38,0.1)',
          borderRadius: 16,
          padding: '28px',
          boxShadow: '0 8px 40px rgba(0,0,0,0.25)',
          boxSizing: 'border-box',
          transition: 'top 250ms ease, left 250ms ease',
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
