import { useEffect, useLayoutEffect } from 'react'

// Run the lock as a layout effect so the body-overflow change commits BEFORE the
// browser paints the active tour — no window where the tour is visible but the page
// is still scrollable. Fall back to useEffect during SSR (useLayoutEffect would warn
// on the server); the body work no-ops there anyway via the `typeof document` guard.
const useIsomorphicLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect

// Locks page scroll while `locked` is true, restoring on unlock/unmount.
//
// Compensates for the removed scrollbar by padding the body, so locking does
// NOT reflow the page. That matters here: the tour arrows are fixed-position
// SVG computed from in-flow anchor positions — a reflow would shift the anchors
// and re-misalign the arrows, reintroducing a smaller version of the bug the
// lock is meant to fix.
//
// Intended for desktop tours (callers pass `active && isDesktop`). Mobile tours
// scroll-step intentionally and must not be locked. Callers must resolve the desktop
// gate synchronously (lazy-init their viewport state) so `locked` is already true on
// the render the tour activates — otherwise the lock lags a render behind the paint.
export function useScrollLock(locked: boolean): void {
  useIsomorphicLayoutEffect(() => {
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
