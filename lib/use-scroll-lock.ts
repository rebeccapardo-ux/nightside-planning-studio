import { useEffect } from 'react'

// Locks page scroll while `locked` is true, restoring on unlock/unmount.
//
// Compensates for the removed scrollbar by padding the body, so locking does
// NOT reflow the page. That matters here: the tour arrows are fixed-position
// SVG computed from in-flow anchor positions — a reflow would shift the anchors
// and re-misalign the arrows, reintroducing a smaller version of the bug the
// lock is meant to fix.
//
// Intended for desktop tours (callers pass `active && isDesktop`). Mobile tours
// scroll-step intentionally and must not be locked.
export function useScrollLock(locked: boolean): void {
  useEffect(() => {
    if (!locked || typeof document === 'undefined') return

    const body = document.body
    const prevOverflow = body.style.overflow
    const prevPaddingRight = body.style.paddingRight

    const scrollbarW = window.innerWidth - document.documentElement.clientWidth
    body.style.overflow = 'hidden'
    if (scrollbarW > 0) {
      const current = parseFloat(window.getComputedStyle(body).paddingRight) || 0
      body.style.paddingRight = `${current + scrollbarW}px`
    }

    return () => {
      body.style.overflow = prevOverflow
      body.style.paddingRight = prevPaddingRight
    }
  }, [locked])
}
