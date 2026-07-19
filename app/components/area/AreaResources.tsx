// AreaResources — the embedded province-specific resource list for an area page's
// "Resources" section (replaces the old external Resource Hub link-out). Server component:
// static data + external links, no interactivity, so it passes cleanly as children from the
// server area page into the client CollapsibleSection. (This file is the layout INSIDE the
// Resources section — the page-level section collapse is separate and untouched.)
//
// Two tiers, always both visible (not tabs, not gated): "Canada-wide" and "{their province}
// resources" — the user only ever sees their own province's slice.
//
// Layout (Canada-wide): flat top-level sections tile as a GRID of white panels (3-up on
// desktop, reflowing to 2/1), TOP-ALIGNED so headers line up and short panels never stretch
// to match tall neighbours (align-items:start — no equal-height rows). A nestable group
// (e.g. Healthcare's equity cluster) is pulled OUT of the row into its own FULL-WIDTH panel
// below, with its sub-sections in a mini-grid inside — removing the tall outlier from the
// row-alignment problem. The province tier is short (≤5/province), so it's a plain list.
//
// DATA vs PAGE COPY: resources come from lib/resources.ts (data). The section intro
// paragraphs (SECTION_INTROS) and the lead line are PAGE COPY authored here.

import Link from 'next/link'
import { resourcesFor, SECTION_ORDER, type Resource } from '@/lib/resources'

const apfel = "'Apfel Grotezk', sans-serif"
const hv = "'Helvetica Neue', Helvetica, Arial, sans-serif"

// ── Type scale (one deliberate level between each) ──────────────────────────────
const tierStyle: React.CSSProperties = { fontFamily: apfel, fontSize: 24, fontWeight: 700, color: '#130426', margin: '0 0 20px', lineHeight: 1.2 }
const groupStyle: React.CSSProperties = { fontFamily: apfel, fontSize: 18, fontWeight: 600, color: '#130426', margin: '0 0 18px', lineHeight: 1.25 }
const sectionStyle: React.CSSProperties = { fontFamily: apfel, fontSize: 16, fontWeight: 600, color: '#130426', margin: '0 0 12px', lineHeight: 1.3 }
const introStyle: React.CSSProperties = { fontFamily: hv, fontSize: 13.5, color: 'rgba(19,4,38,0.7)', lineHeight: 1.55, margin: '0 0 12px' }
const linkStyle: React.CSSProperties = { fontFamily: hv, fontSize: 15, color: '#2C3777', textDecoration: 'none', lineHeight: 1.5 }
const noteStyle: React.CSSProperties = { fontFamily: hv, fontSize: 13, color: 'rgba(19,4,38,0.55)', lineHeight: 1.5, margin: '2px 0 0' }

// White panel cards — same treatment as the area-page activity cards (white on the section
// band), so panels read as bounded units and the boundary separates section from links.
const panelStyle: React.CSSProperties = { background: '#FFFFFF', border: '1px solid rgba(19,4,38,0.1)', borderRadius: 14, padding: '20px 22px' }
const groupCardStyle: React.CSSProperties = { background: '#FFFFFF', border: '1px solid rgba(19,4,38,0.1)', borderRadius: 14, padding: '24px 26px', marginBottom: 20 }

// PAGE COPY: section intro paragraphs, per domain → section name.
const SECTION_INTROS: Record<string, Record<string, string>> = {
  healthcare: {
    '2SLGBTQ+ resources':
      'LGBTQ+ individuals may face unique barriers, including legal challenges with chosen family and bias in medical settings. These resources help affirm your identity and ensure your wishes are upheld.',
    'Indigenous resources':
      'Many Indigenous communities have unique traditions around death, grief, and burial, but these are not always recognized within mainstream systems. Find resources on cultural approaches and practices below.',
  },
}

// PAGE COPY: the short lead under the Resources heading, per domain. Author-adjustable.
const LEAD: Record<string, string> = {
  healthcare:
    'Guidance, templates, and services for planning your care — Canada-wide, and specific to your province. Legal requirements vary by province.',
}

function ResourceLink({ r }: { r: Resource }) {
  return (
    <li style={{ marginBottom: r.note ? 8 : 4 }}>
      <a href={r.url} target="_blank" rel="noopener noreferrer" className="area-resource-link" style={linkStyle}>
        {r.label}
        <span aria-hidden="true" style={{ opacity: 0.5, fontSize: 12, marginLeft: 4 }}>↗</span>
      </a>
      {r.note && <p style={noteStyle}>{r.note}</p>}
    </li>
  )
}

function ResourceList({ resources }: { resources: Resource[] }) {
  return (
    <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
      {resources.map((r) => <ResourceLink key={r.url} r={r} />)}
    </ul>
  )
}

// Section header (skipped for an empty name, e.g. a flat tier) + optional intro + the tight
// link list. No card/margins here — the panel or grid cell provides those.
function SectionContent({ title, intro, resources }: { title: string; intro?: string; resources: Resource[] }) {
  return (
    <div>
      {title && <h4 style={sectionStyle}>{title}</h4>}
      {intro && <p style={introStyle}>{intro}</p>}
      <ResourceList resources={resources} />
    </div>
  )
}

// Canada-wide: flat top-level sections accumulate into a grid of panels; a group flushes the
// current row, then renders full-width with its sub-sections in a mini-grid. Sections in the
// data but absent from the order config fall through as a trailing grid (nothing dropped).
function renderCanadaWide(resources: Resource[], domainCode: string, intros: Record<string, string>) {
  const bySection = new Map<string, Resource[]>()
  for (const r of resources) {
    const arr = bySection.get(r.section) ?? []
    arr.push(r)
    bySection.set(r.section, arr)
  }
  const rendered = new Set<string>()
  const blocks: React.ReactNode[] = []
  let row: React.ReactNode[] = []

  const flushRow = () => {
    if (row.length === 0) return
    blocks.push(<div key={`row-${blocks.length}`} className="resource-grid" style={{ marginBottom: 20 }}>{row}</div>)
    row = []
  }
  const contentFor = (name: string) => {
    const rs = bySection.get(name)
    if (!rs || rs.length === 0) return null
    rendered.add(name)
    return <SectionContent key={name} title={name} intro={intros[name]} resources={rs} />
  }

  for (const node of SECTION_ORDER[domainCode] ?? []) {
    if (typeof node === 'string') {
      const c = contentFor(node)
      if (c) row.push(<div key={node} style={panelStyle}>{c}</div>)
    } else {
      flushRow()
      const subs = node.sections.map(contentFor).filter(Boolean)
      if (subs.length > 0) {
        blocks.push(
          <div key={node.group} style={groupCardStyle}>
            <h3 style={groupStyle}>{node.group}</h3>
            <div className="resource-subgrid">{subs}</div>
          </div>,
        )
      }
    }
  }
  flushRow()

  const leftover: React.ReactNode[] = []
  for (const [name, rs] of bySection) {
    if (!rendered.has(name) && rs.length > 0) {
      leftover.push(<div key={name} style={panelStyle}><SectionContent title={name} intro={intros[name]} resources={rs} /></div>)
    }
  }
  if (leftover.length > 0) blocks.push(<div key="row-leftover" className="resource-grid">{leftover}</div>)
  return blocks
}

export default function AreaResources({ domainCode, province }: { domainCode: string; province?: string }) {
  const { canadaWide, provincial } = resourcesFor(domainCode, province)
  if (canadaWide.length === 0 && provincial.length === 0) return null

  const intros = SECTION_INTROS[domainCode] ?? {}
  const showProvince = !!province && provincial.length > 0

  return (
    <div>
      <style>{`
        .area-resource-link:hover { text-decoration: underline; }
        /* Top-aligned (align-items:start → no equal-height stretch); reflows 3 → 2 → 1. */
        .resource-grid    { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 16px; align-items: start; }
        .resource-subgrid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 20px 28px; align-items: start; }
        @media (max-width: 860px) { .resource-grid, .resource-subgrid { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
        @media (max-width: 560px) { .resource-grid, .resource-subgrid { grid-template-columns: 1fr; } }
      `}</style>

      {LEAD[domainCode] && (
        <p style={{ fontFamily: hv, fontSize: 15, color: 'rgba(19,4,38,0.7)', lineHeight: 1.55, margin: '8px 0 28px', maxWidth: 720 }}>{LEAD[domainCode]}</p>
      )}

      {canadaWide.length > 0 && (
        <section style={{ marginBottom: showProvince ? 44 : 0 }}>
          <h2 style={tierStyle}>Canada-wide</h2>
          {renderCanadaWide(canadaWide, domainCode, intros)}
        </section>
      )}

      {showProvince && (
        <section>
          <h2 style={{ ...tierStyle, marginBottom: 6 }}>{province} resources</h2>
          <p style={{ fontFamily: hv, fontSize: 13, color: 'rgba(19,4,38,0.6)', lineHeight: 1.5, margin: '0 0 18px', maxWidth: 620 }}>
            Based on the province you set at signup. To change it, visit{' '}
            <Link href="/app/account" style={{ color: '#2C3777', textDecoration: 'underline' }}>My Account</Link>.
          </p>
          {/* Short per-province list (≤5) — a plain bounded panel, no grid needed. */}
          <div style={{ ...panelStyle, maxWidth: 620 }}>
            <ResourceList resources={provincial} />
          </div>
        </section>
      )}
    </div>
  )
}
