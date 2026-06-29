'use client'

import Link from 'next/link'
import { useState } from 'react'

const apfel = "'Apfel Grotezk', sans-serif"
const hv = "'Helvetica Neue', Helvetica, Arial, sans-serif"

// Area-page header: navy band (breadcrumb + title + intro) and, beneath it, the
// full-width Learn-content band. The See-more/less toggle is anchored to the band
// (NOT the navy header) so it reads as expanding the region directly below: a
// light-lavender bar with a visible top edge sits flush under the navy banner, the
// toggle right-aligned in it. Collapsed → just that bar ("See more ▾"); expanded →
// the same bar ("See less ▴") followed by the content (≤760px reading width). The
// band is a SIBLING of the navy block, hence full-bleed, with no header text inside
// (the top edge + button position do the anchoring). Default state: EXPANDED on first
// visit to this area, COLLAPSED thereafter (per-area localStorage, per-device).
export default function AreaHeader({
  slug, title, intro, children,
}: { slug: string; title: string; intro: string; children: React.ReactNode }) {
  const storageKey = `nightside.areaSeen.${slug}`
  const [open, setOpen] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false
    try { return window.localStorage.getItem(storageKey) !== 'seen' } catch { return false }
  })
  function toggle() {
    setOpen((prev) => {
      const next = !prev
      try { window.localStorage.setItem(storageKey, 'seen') } catch { /* private mode */ }
      return next
    })
  }

  return (
    <>
      <div style={{ background: 'radial-gradient(circle at 20% 20%, #1a0535 0%, #130426 70%)' }}>
        <div className="max-w-6xl mx-auto pt-16 md:pt-6" style={{ paddingLeft: 40, paddingRight: 40 }}>
          <p style={{ fontFamily: hv, fontSize: 13, color: 'rgba(255,255,255,0.7)', margin: 0 }}>
            <Link href="/app" style={{ color: 'rgba(255,255,255,0.7)', textDecoration: 'none' }}>Plan by area</Link>
            {' / '}{title}
          </p>
        </div>
        <div className="max-w-6xl mx-auto" style={{ padding: '12px 40px 40px' }}>
          <h1 className="ns-title-activity text-white">{title}</h1>
          <p style={{ fontFamily: hv, fontSize: 17, lineHeight: 1.6, color: 'rgba(255,255,255,0.85)', maxWidth: 640, margin: '16px 0 0' }}>{intro}</p>
        </div>
      </div>

      {/* Learn band — toggle anchored to the band's top edge (sibling of navy block) */}
      {children && (
        <div style={{ background: '#ECE7F7', borderTop: '1px solid rgba(19,4,38,0.12)' }}>
          <div className="max-w-6xl mx-auto" style={{ padding: open ? '14px 40px 48px' : '14px 40px' }}>
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={toggle}
                aria-expanded={open}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(19,4,38,0.06)', color: '#130426', border: '1px solid rgba(19,4,38,0.15)', borderRadius: 999, padding: '8px 18px', fontFamily: apfel, fontSize: 15, fontWeight: 600, cursor: 'pointer' }}
              >
                {open ? 'See less ▴' : 'See more ▾'}
              </button>
            </div>
            {open && <div style={{ maxWidth: 760, marginTop: 12 }}>{children}</div>}
          </div>
        </div>
      )}
    </>
  )
}
