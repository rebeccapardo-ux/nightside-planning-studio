'use client'

import Breadcrumbs from '@/app/components/navigation/Breadcrumbs'
import { useSectionCollapse } from './useSectionCollapse'
import { areaBandInnerStyle } from './areaBand'
import { BANNER_TOP_CLASS, BANNER_PADDING_BOTTOM } from '@/app/components/pageBanner'

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
      {/* Navy page banner — content-aligned (centered via areaBandInnerStyle) so the title
          lines up with the page content beneath it. Shares the VERTICAL treatment with the
          activity banners — the same top (BANNER_TOP_CLASS) and 60px bottom
          (BANNER_PADDING_BOTTOM) — for a generous, consistent feel; the horizontal is
          intentionally content-aligned rather than the activity banners' 96px left inset. */}
      <div style={{ background: 'var(--section-accent)', color: 'var(--section-on-accent)' }}>
        <div className={BANNER_TOP_CLASS} style={areaBandInnerStyle}>
          <Breadcrumbs
            theme="light"
            items={[
              { label: 'Plan by area', href: '/app' },
              { label: title },
            ]}
          />
        </div>
        <div style={{ ...areaBandInnerStyle, paddingTop: 24, paddingBottom: BANNER_PADDING_BOTTOM }}>
          <h1 className="ns-title-activity">{title}</h1>
          <p style={{ fontFamily: hv, fontSize: 17, lineHeight: 1.6, color: 'var(--section-on-accent)', maxWidth: 520, margin: '20px 0 0' }}>{intro}</p>
        </div>
      </div>

      {/* Overview band — light-lavender, full-bleed (sibling of the navy block). */}
      {children && (
        grouped ? (
          <GroupedOverviewBand slug={slug} bandBg={bandBg} acpTitle={acpTitle} basics={children} acp={acpContent} />
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
      <div style={{ ...areaBandInnerStyle, paddingTop: open ? 28 : 16, paddingBottom: open ? 48 : 16 }}>
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

// "What you need to know" — a single collapsible TOP-LEVEL section (collapsed by default, like
// Resources / Relevant Activities / Plan), so on landing every top-level header is scannable
// together. When expanded, BOTH sub-sections render open in one click — their headers show as
// signposts and their content flows. Deliberately ONE level of collapse (this parent): the
// sub-sections are static (SubSectionStatic), never independently collapsible — no
// accordion-inside-an-accordion.
function GroupedOverviewBand({ slug, bandBg, acpTitle, basics, acp }: {
  slug: string; bandBg: string; acpTitle?: string; basics: React.ReactNode; acp: React.ReactNode
}) {
  const [open, toggle] = useSectionCollapse(`nightside.areaSection.${slug}.overview`)
  return (
    <div style={{ background: bandBg, borderTop: '1px solid rgba(19,4,38,0.12)' }}>
      <style>{`.ah-header:hover .ah-chevron { opacity: 0.65; }`}</style>
      <div style={{ ...areaBandInnerStyle, paddingTop: open ? 28 : 16, paddingBottom: open ? 40 : 16 }}>
        <button
          type="button"
          className="ah-header"
          onClick={toggle}
          aria-expanded={open}
          style={{ display: 'flex', alignItems: 'center', gap: 12, width: '100%', background: 'none', border: 'none', padding: 0, cursor: 'pointer', textAlign: 'left' }}
        >
          <h2 style={{ fontFamily: apfel, fontSize: 30, fontWeight: 600, color: '#130426', margin: 0 }}>What you need to know</h2>
          <span className="ah-chevron" style={{ display: 'inline-flex', transition: 'opacity 150ms' }}>
            <Chevron open={open} />
          </span>
        </button>
        {open && (
          <div style={{ marginTop: 20 }}>
            <SubSectionStatic title="The basics">{basics}</SubSectionStatic>
            <SubSectionStatic title={acpTitle ?? 'Advance care planning'}>{acp}</SubSectionStatic>
          </div>
        )}
      </div>
    </div>
  )
}

// A sub-section inside "What you need to know": a signpost header (20/600, below the 30/600
// parent) + its content, always rendered together — NOT collapsible. A top divider separates
// the two sub-sections.
function SubSectionStatic({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ borderTop: '1px solid rgba(19,4,38,0.12)', paddingTop: 18 }}>
      <h3 style={{ fontFamily: apfel, fontSize: 20, fontWeight: 600, color: '#130426', margin: '0 0 12px' }}>{title}</h3>
      <div style={{ maxWidth: 760, paddingBottom: 26 }}>{children}</div>
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
