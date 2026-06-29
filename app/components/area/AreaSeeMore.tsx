'use client'

import { useState } from 'react'

const apfel = "'Apfel Grotezk', sans-serif"

// The "See more ▾ / See less ▴" pill under an area's intro, plus the full-width
// Learn-content band it toggles. Default: EXPANDED on first visit to this area,
// COLLAPSED thereafter — tracked per-area in localStorage (per-device; seeing the
// orientation content again on a new device is acceptable). The band itself renders
// full-width (passed as children, on a light background); the page positions it.
export default function AreaSeeMore({ slug, children }: { slug: string; children: React.ReactNode }) {
  const storageKey = `nightside.areaSeen.${slug}`
  // Lazy, SSR-guarded init: first visit (no flag) → expanded; subsequent → collapsed.
  const [open, setOpen] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false
    try { return window.localStorage.getItem(storageKey) !== 'seen' } catch { return false }
  })

  function toggle() {
    setOpen((prev) => {
      const next = !prev
      // Once toggled, mark this area as seen so future visits default collapsed.
      try { window.localStorage.setItem(storageKey, 'seen') } catch { /* private mode */ }
      return next
    })
  }

  return (
    <>
      <button
        type="button"
        onClick={toggle}
        aria-expanded={open}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 8, marginTop: 18,
          background: 'rgba(255,255,255,0.14)', color: '#FFFFFF', border: '1px solid rgba(255,255,255,0.3)',
          borderRadius: 999, padding: '8px 18px', fontFamily: apfel, fontSize: 15, fontWeight: 600, cursor: 'pointer',
        }}
      >
        {open ? 'See less ▴' : 'See more ▾'}
      </button>
      {open && (
        <div style={{ background: '#ECE7F7' }}>
          <div className="max-w-6xl mx-auto" style={{ padding: '48px 40px' }}>
            <div style={{ maxWidth: 760 }}>{children}</div>
          </div>
        </div>
      )}
    </>
  )
}
