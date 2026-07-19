// AreaResources — the embedded province-specific resource list for an area page's
// "Resources" section (replaces the old external Resource Hub link-out). Server component:
// static data + external links, no interactivity of its own (collapse is native
// <details>/<summary>), so it passes cleanly as children from the server area page into the
// client CollapsibleSection. NOTE: this is the layout INSIDE the Resources section — the
// page-level section collapse (Overview/Resources/Activities/Plan) is separate and untouched.
//
// Layout: the overwhelm was the VOLUME of visible link text, so Canada-wide is a
// single-level accordion — a short, scannable menu of section headers, all collapsed by
// default. One click opens a section's links in place. The equity cluster is ONE click too:
// opening it reveals all three sub-sections at once (they're headed groupings inside the
// expanded content, NOT separate toggles — no nested collapse). The "{province} resources"
// tier stays a plain visible list (short, and it's the user's own content).
//
// Collapse is native <details>/<summary> — no 'use client', keyboard-accessible for free.
//
// DATA vs PAGE COPY: resources come from lib/resources.ts (data). The section intro
// paragraphs (SECTION_INTROS) and the lead line are PAGE COPY authored here.

import Link from 'next/link'
import { resourcesFor, SECTION_ORDER, type Resource } from '@/lib/resources'

const apfel = "'Apfel Grotezk', sans-serif"
const hv = "'Helvetica Neue', Helvetica, Arial, sans-serif"

const tierStyle: React.CSSProperties = { fontFamily: apfel, fontSize: 24, fontWeight: 700, color: '#130426', margin: '0 0 16px', lineHeight: 1.2 }
const summaryTitleStyle: React.CSSProperties = { fontFamily: apfel, fontSize: 17, fontWeight: 600, color: '#130426', lineHeight: 1.3 }
// Sub-section headings inside the expanded equity group — a label treatment, clearly NOT a
// clickable section header (which are apfel/title-case), so they read as groupings.
const subHeadStyle: React.CSSProperties = { fontFamily: hv, fontSize: 12.5, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'rgba(19,4,38,0.75)', margin: '0 0 8px' }
const introStyle: React.CSSProperties = { fontFamily: hv, fontSize: 13.5, color: 'rgba(19,4,38,0.7)', lineHeight: 1.55, margin: '0 0 10px', maxWidth: 640 }
const linkStyle: React.CSSProperties = { fontFamily: hv, fontSize: 15, color: '#2C3777', textDecoration: 'none', lineHeight: 1.5 }
const noteStyle: React.CSSProperties = { fontFamily: hv, fontSize: 13, color: 'rgba(19,4,38,0.55)', lineHeight: 1.5, margin: '2px 0 0' }

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
    'Guidance, templates, and services for planning your care — Canada-wide, and specific to your province. Legal requirements vary by province. Open a category to see its resources.',
}

function Chevron() {
  return (
    <svg className="rchevron" width="18" height="18" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M4 6l4 4 4-4" stroke="#130426" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function ResourceLink({ r }: { r: Resource }) {
  return (
    <li style={{ marginBottom: r.note ? 8 : 5 }}>
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

// One collapsible Canada-wide section (native <details>, collapsed by default). `children`
// is the expanded content — a link list, or (for the equity group) the stacked sub-sections.
function CollapsibleRow({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <details className="rsec">
      <summary className="rsum">
        <span className="rsum-title" style={summaryTitleStyle}>{title}</span>
        <Chevron />
      </summary>
      <div style={{ padding: '2px 2px 18px 20px' }}>{children}</div>
    </details>
  )
}

// Build the Canada-wide accordion rows from SECTION_ORDER. A flat section → a row that
// expands to its links. A group node → a single row that expands to ALL its sub-sections at
// once (headed groupings, not nested toggles). Sections in data but absent from the order
// config fall through as trailing rows (nothing dropped).
function renderCanadaWide(resources: Resource[], domainCode: string, intros: Record<string, string>) {
  const bySection = new Map<string, Resource[]>()
  for (const r of resources) {
    const arr = bySection.get(r.section) ?? []
    arr.push(r)
    bySection.set(r.section, arr)
  }
  const rendered = new Set<string>()
  const rows: React.ReactNode[] = []

  for (const node of SECTION_ORDER[domainCode] ?? []) {
    if (typeof node === 'string') {
      const rs = bySection.get(node)
      if (!rs || rs.length === 0) continue
      rendered.add(node)
      rows.push(<CollapsibleRow key={node} title={node}>{intros[node] && <p style={introStyle}>{intros[node]}</p>}<ResourceList resources={rs} /></CollapsibleRow>)
    } else {
      const present = node.sections.filter((s) => (bySection.get(s)?.length ?? 0) > 0)
      if (present.length === 0) continue
      rows.push(
        <CollapsibleRow key={node.group} title={node.group}>
          {present.map((sub, i) => {
            const rs = bySection.get(sub)!
            rendered.add(sub)
            return (
              <div key={sub} style={{ marginBottom: i < present.length - 1 ? 20 : 0 }}>
                <p style={subHeadStyle}>{sub}</p>
                {intros[sub] && <p style={introStyle}>{intros[sub]}</p>}
                <ResourceList resources={rs} />
              </div>
            )
          })}
        </CollapsibleRow>,
      )
    }
  }
  for (const [name, rs] of bySection) {
    if (!rendered.has(name) && rs.length > 0) {
      rows.push(<CollapsibleRow key={name} title={name}>{intros[name] && <p style={introStyle}>{intros[name]}</p>}<ResourceList resources={rs} /></CollapsibleRow>)
    }
  }
  return rows
}

export default function AreaResources({ domainCode, province }: { domainCode: string; province?: string }) {
  const { canadaWide, provincial } = resourcesFor(domainCode, province)
  if (canadaWide.length === 0 && provincial.length === 0) return null

  const intros = SECTION_INTROS[domainCode] ?? {}
  const showProvince = !!province && provincial.length > 0

  return (
    <div style={{ maxWidth: 760 }}>
      <style>{`
        .area-resource-link:hover { text-decoration: underline; }
        .rsec { border-bottom: 1px solid rgba(19,4,38,0.12); }
        .rsum { display: flex; align-items: center; justify-content: space-between; gap: 12px; cursor: pointer; padding: 15px 2px; list-style: none; }
        .rsum::-webkit-details-marker { display: none; }
        .rsum:hover .rsum-title { color: #2C3777; }
        .rchevron { flex-shrink: 0; transition: transform 200ms ease; }
        details[open] > .rsum .rchevron { transform: rotate(180deg); }
      `}</style>

      {LEAD[domainCode] && (
        <p style={{ fontFamily: hv, fontSize: 15, color: 'rgba(19,4,38,0.7)', lineHeight: 1.55, margin: '8px 0 24px' }}>{LEAD[domainCode]}</p>
      )}

      {canadaWide.length > 0 && (
        <section style={{ marginBottom: showProvince ? 40 : 0 }}>
          <h2 style={tierStyle}>Canada-wide</h2>
          {/* borderTop closes the top of the first row; each row carries a borderBottom. */}
          <div style={{ borderTop: '1px solid rgba(19,4,38,0.12)' }}>
            {renderCanadaWide(canadaWide, domainCode, intros)}
          </div>
        </section>
      )}

      {showProvince && (
        <section>
          <h2 style={{ ...tierStyle, marginBottom: 6 }}>{province} resources</h2>
          <p style={{ fontFamily: hv, fontSize: 13, color: 'rgba(19,4,38,0.6)', lineHeight: 1.5, margin: '0 0 16px' }}>
            Based on the province you set at signup. To change it, visit{' '}
            <Link href="/app/account" style={{ color: '#2C3777', textDecoration: 'underline' }}>My Account</Link>.
          </p>
          {/* Province content stays visible (short, user's own) — plain list, no collapse. */}
          <ResourceList resources={provincial} />
        </section>
      )}
    </div>
  )
}
