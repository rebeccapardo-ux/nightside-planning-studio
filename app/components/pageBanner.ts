import type React from 'react'

// SINGLE SOURCE for the app's page banner — the full-bleed navy header band carrying the
// breadcrumb, title (.ns-title-activity), and intro. Used by the area banner (AreaHeader) AND
// all six activity banners, so the generous banner treatment — the 96px left inset (md:pl-24),
// the pt-16 / md:pt-6 top, the 60px bottom, the navy background — is defined ONCE and can't
// drift. It was previously copy-pasted inline into six activity pages; that 6-copy drift is
// closed by pointing them all here.
//
// The RIGHT side varies by page and stays with the caller: most banners append `md:pr-8`;
// the three with a right-side control (legacy-map / values-ranking / fears-ranking) append
// `md:pr-[148px] activity-banner-row` + a flex row style. Everything else comes from here.
export const BANNER_CLASS = 'px-5 md:pl-24 pt-16 md:pt-6'
export const BANNER_STYLE: React.CSSProperties = { background: '#2C3777', paddingBottom: 60 }
