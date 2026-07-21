'use client'

import Breadcrumbs from '@/app/components/navigation/Breadcrumbs'
import { useSectionCollapse } from './useSectionCollapse'
import { areaBandInnerStyle } from './areaBand'
import { BANNER_CLASS, BANNER_STYLE } from '@/app/components/pageBanner'

const apfel = "'Apfel Grotezk', sans-serif"
const hv = "'Helvetica Neue', Helvetica, Arial, sans-serif"

// Area-page header: navy band (breadcrumb + title + intro) and, beneath it, the full-width
// overview band.
//
// Two modes for that band:
//  • DEFAULT ("Overview") — a single peer section: an "Overview" header (matching the page's
//    other section headers, with a chevron toggle) whose content is the area's basics. Used by
//    every area with no province ACP summary.
//  • GROUPED ("What you need to know") — when `acpContent` is passed (Healthcare, province with
//    an ACP summary): a NON-collapsible grouping header with TWO collapsible sub-sections
//    beneath it — "The basics" (the same basics content) and "Advance care planning in
//    {Province}" (the ACP summary). Two sub-sections justify the collapse; the parent is a
//    label, not a third accordion.
//
// Default state COLLAPSED on first visit (so the page isn't overwhelming); thereafter each
// (sub-)section independently remembers the user's choice (see useSectionCollapse).
export default function AreaHeader({
  slug, title, intro, children, bandBg = '#ECE7F7', acpTitle, acpContent,
}: {
  slug: string; title: string; intro: string; children: React.ReactNode; bandBg?: string
  acpTitle?: string; acpContent?: React.ReactNode
}) {
  const grouped = !!acpContent

  return (
    <>
      {/* Navy page banner — the shared app banner treatment (full-bleed, 96px left inset,
          generous top/bottom), identical to the activity-page banners. Deliberately NOT
          centered like the content bands below: the title hugs the left inset the same way
          the activity banners do. */}
      <div className={`${BANNER_CLASS} md:pr-8`} style={BANNER_STYLE}>
        <div style={{ marginBottom: 24 }}>
          <Breadcrumbs
            theme="navy"
            items={[
              { label: 'Plan by area', href: '/app' },
              { label: title },
            ]}
          />
        </div>
        <h1 className="ns-title-activity text-white">{title}</h1>
        <p style={{ fontFamily: hv, fontSize: 17, lineHeight: 1.6, color: 'rgba(255,255,255,0.85)', maxWidth: 520, margin: '20px 0 0' }}>{intro}</p>
      </div>

      {/* Overview band — light-lavender, full-bleed (sibling of the navy block). */}
      {children && (
        grouped ? (
          <div style={{ background: bandBg, borderTop: '1px solid rgba(19,4,38,0.12)' }}>
            <div style={{ ...areaBandInnerStyle, paddingTop: 28, paddingBottom: 40 }}>
              {/* Grouping header — a label, NOT collapsible. */}
              <h2 style={{ fontFamily: apfel, fontSize: 30, fontWeight: 600, color: '#130426', margin: '0 0 8px' }}>What you need to know</h2>
              <OverviewSubSection storageKey={`nightside.areaSection.${slug}.overview.basics`} title="The basics">
                {children}
              </OverviewSubSection>
              <OverviewSubSection storageKey={`nightside.areaSection.${slug}.overview.acp`} title={acpTitle ?? 'Advance care planning'}>
                {acpContent}
              </OverviewSubSection>
            </div>
          </div>
        ) : (
          <OverviewBand slug={slug} bandBg={bandBg}>{children}</OverviewBand>
        )
      )}
    </>
  )
}

// The default single "Overview" collapsible band (unchanged behaviour).
function OverviewBand({ slug, bandBg, children }: { slug: string; bandBg: string; children: React.ReactNode }) {
  const [open, toggle] = useSectionCollapse(`nightside.areaSection.${slug}.overview`)
  return (
    <div style={{ background: bandBg, borderTop: '1px solid rgba(19,4,38,0.12)' }}>
      <style>{`.ah-header:hover .ah-chevron { opacity: 0.65; }`}</style>
      <div style={{ ...areaBandInnerStyle, paddingTop: open ? 28 : 24, paddingBottom: open ? 48 : 24 }}>
        <button
          type="button"
          className="ah-header"
          onClick={toggle}
          aria-expanded={open}
          style={{ display: 'flex', alignItems: 'center', gap: 12, width: '100%', background: 'none', border: 'none', padding: 0, cursor: 'pointer', textAlign: 'left' }}
        >
          <h2 style={{ fontFamily: apfel, fontSize: 30, fontWeight: 600, color: '#130426', margin: 0 }}>Overview</h2>
          <span className="ah-chevron" style={{ display: 'inline-flex', transition: 'opacity 150ms' }}>
            <Chevron open={open} />
          </span>
        </button>
        {open && <div style={{ maxWidth: 760, marginTop: 20 }}>{children}</div>}
      </div>
    </div>
  )
}

// One collapsible sub-section under "What you need to know" — a mid-level header (20/600,
// below the 30/600 grouping header) with the same chevron, and a top divider so the two read
// as an accordion pair. Collapsed by default on first visit.
function OverviewSubSection({ storageKey, title, children }: { storageKey: string; title: string; children: React.ReactNode }) {
  const [open, toggle] = useSectionCollapse(storageKey)
  return (
    <div style={{ borderTop: '1px solid rgba(19,4,38,0.12)' }}>
      <style>{`.ah-sub:hover .ah-chevron { opacity: 0.65; }`}</style>
      <button
        type="button"
        className="ah-sub"
        onClick={toggle}
        aria-expanded={open}
        style={{ display: 'flex', alignItems: 'center', gap: 12, width: '100%', background: 'none', border: 'none', padding: '18px 0', cursor: 'pointer', textAlign: 'left' }}
      >
        <h3 style={{ fontFamily: apfel, fontSize: 20, fontWeight: 600, color: '#130426', margin: 0 }}>{title}</h3>
        <span className="ah-chevron" style={{ display: 'inline-flex', transition: 'opacity 150ms' }}>
          <Chevron open={open} />
        </span>
      </button>
      {open && <div style={{ maxWidth: 760, paddingBottom: 26 }}>{children}</div>}
    </div>
  )
}

// Matches the chevron used by CollapsibleSection (Relevant activities / Plan) so the sections
// toggle identically.
function Chevron({ open }: { open: boolean }) {
  return (
    <svg width="20" height="20" viewBox="0 0 16 16" fill="none" aria-hidden="true"
      style={{ transform: open ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 200ms ease' }}>
      <path d="M4 6l4 4 4-4" stroke="#130426" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
