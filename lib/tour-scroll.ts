// Scroll helper used by DomainTour. Brings the step's
// target element into view at roughly the upper fifth of the viewport so
// the modal and arrow have room below. Respects prefers-reduced-motion.
//
// `anchor` accepts either a `data-tour-anchor` value or an element id.
// Pass null/undefined to scroll to the top.

export function scrollToTourTarget(anchor: string | null | undefined): void {
  if (typeof window === 'undefined') return
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  const behavior: ScrollBehavior = reduced ? 'auto' : 'smooth'

  if (!anchor) {
    window.scrollTo({ top: 0, behavior })
    return
  }

  const target =
    document.querySelector<HTMLElement>(`[data-tour-anchor="${anchor}"]`) ||
    document.getElementById(anchor)
  if (!target) {
    window.scrollTo({ top: 0, behavior })
    return
  }

  const rect = target.getBoundingClientRect()
  const offset = window.innerHeight * 0.20
  const targetY = window.scrollY + rect.top - offset
  window.scrollTo({ top: Math.max(0, targetY), behavior })
}

// Approximate time to wait after kicking off a smooth scroll before the
// new arrow should be drawn. Most engines settle within ~300–450ms; we
// use 500ms as a safe upper bound. With reduced-motion the scroll is
// instant, so the wait is essentially unnecessary but harmless.
export const TOUR_SCROLL_SETTLE_MS = 500
