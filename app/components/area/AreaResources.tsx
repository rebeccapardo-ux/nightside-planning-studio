// AreaResources — the embedded province-specific resource list for an area page's
// "Resources" section (replaces the old external Resource Hub link-out). Server component:
// static data + external links, no interactivity of its own (collapse is native
// <details>/<summary>), so it passes cleanly as children from the server area page into the
// client CollapsibleSection. NOTE: this is the layout INSIDE the Resources section — the
// page-level section collapse (Overview/Resources/Activities/Plan) is separate and untouched.
//
// Layout: two independent, TOP-ALIGNED columns on desktop (reflow to stacked on narrow) —
//   Left  (~62%): "Canada-wide", a single-level accordion of section headers, all collapsed
//                 by default; one click opens a section's links in place (the equity group
//                 opens to all three sub-sections at once — headed groupings, not nested
//                 toggles). This fills tall as sections expand.
//   Right (~38%): "{province} resources" — the user's own short list, always visible, with
//                 the signup-province note.
// Columns are align-items:start — the right column stays put (top-aligned) when the left
// grows; it is NOT stretched to match. A thin vertical divider sits in the gutter between
// them (a 1px grid track that DOES stretch to the taller column's height); it is removed
// when the layout reflows to a single stacked column on narrow.
//
// DATA vs PAGE COPY: resources come from lib/resources.ts (data). The section intro
// paragraphs (SECTION_INTROS) and the lead line are PAGE COPY authored here.

import Link from 'next/link'
import { resourcesFor, SECTION_ORDER, type Resource } from '@/lib/resources'

const apfel = "'Apfel Grotezk', sans-serif"
const hv = "'Helvetica Neue', Helvetica, Arial, sans-serif"

// Three descending levels, differentiated by WEIGHT + HUE (not by muting — a faded tier read
// as "less important", backwards for a structural anchor):
//   Resources        (section header)  apfel 30/600 near-black   — from CollapsibleSection
//   Tier             (these)           apfel 20/600 brand PURPLE  — prominent, distinct by hue
//   Section headers  (rsum-title)      apfel 17/500 near-black    — quieter, still clickable
// #7B6FC0 is the brand purple already used for structural labels elsewhere (legacy-map). The
// tier out-ranks the section headers by size (20>17), weight (600>500), and hue. Title case
// (never all-caps — reserved for the small equity sub-labels; the province name varies too).
const tierStyle: React.CSSProperties = { fontFamily: apfel, fontSize: 20, fontWeight: 600, color: '#7B6FC0', margin: '0 0 16px', lineHeight: 1.2 }
const summaryTitleStyle: React.CSSProperties = { fontFamily: apfel, fontSize: 17, fontWeight: 500, color: '#130426', lineHeight: 1.3 }
// Sub-section headings inside the expanded equity group — a small-caps label, clearly NOT a
// clickable section header, so they read as groupings.
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
  wills_estates:
    'Guidance on wills, estates, powers of attorney, and taxes after death — Canada-wide, and specific to your province. Legal requirements vary by province. Open a category to see its resources.',
  deathcare:
    'Guidance on funeral planning, body disposition, organ donation, and financial support after a death — Canada-wide, and specific to your province. Requirements vary by province. Open a category to see its resources.',
}

// PAGE COPY: a small cross-pointer line under the lead, sending the reader to a RELATED area
// for adjacent material (NOT resource data, NOT a dual-domain tag — this is the ordinary
// "also relevant elsewhere" path). Author-adjustable.
const xlink: React.CSSProperties = { color: '#2C3777', textDecoration: 'underline' }
const CROSS_POINTER: Record<string, React.ReactNode> = {
  wills_estates: (
    <>For memorializing social media, see <Link href="/app/area/legacy" style={xlink}>Legacy</Link>. For account inventories and passwords, see <Link href="/app/area/personal-admin" style={xlink}>Personal Admin</Link>.</>
  ),
  deathcare: (
    <>For religious and cultural deathcare resources, see <Link href="/app/area/ritual-and-ceremony" style={xlink}>Ritual &amp; Ceremony</Link>.</>
  ),
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
    <li style={{ marginBottom: r.note ? 7 : 4 }}>
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
// once. Sub-sections get GENEROUS top space (>> the space between links) so each reads as a
// distinct cluster. Sections in data but absent from the order config fall through last.
function renderCanadaWide(resources: Resource[], domainCode: string, intros: Record<string, string>) {
  const bySection = new Map<string, Resource[]>()
  for (const r of resources) {
    const arr = bySection.get(r.section) ?? []
    arr.push(r)
    bySection.set(r.section, arr)
  }
  const rendered = new Set<string>()
  const rows: React.ReactNode[] = []
  const flat = (name: string) => {
    const rs = bySection.get(name)
    if (!rs || rs.length === 0) return
    rendered.add(name)
    rows.push(<CollapsibleRow key={name} title={name}>{intros[name] && <p style={introStyle}>{intros[name]}</p>}<ResourceList resources={rs} /></CollapsibleRow>)
  }

  for (const node of SECTION_ORDER[domainCode] ?? []) {
    if (typeof node === 'string') { flat(node); continue }
    const present = node.sections.filter((s) => (bySection.get(s)?.length ?? 0) > 0)
    if (present.length === 0) continue
    rows.push(
      <CollapsibleRow key={node.group} title={node.group}>
        {present.map((sub, i) => {
          const rs = bySection.get(sub)!
          rendered.add(sub)
          return (
            // Big gap ABOVE each sub-section (after the first) separates the clusters.
            <div key={sub} style={{ marginTop: i > 0 ? 30 : 0 }}>
              <p style={subHeadStyle}>{sub}</p>
              {intros[sub] && <p style={introStyle}>{intros[sub]}</p>}
              <ResourceList resources={rs} />
            </div>
          )
        })}
      </CollapsibleRow>,
    )
  }
  for (const [name] of bySection) if (!rendered.has(name)) flat(name)
  return rows
}

export default function AreaResources({ domainCode, province }: { domainCode: string; province?: string }) {
  const { canadaWide, provincial } = resourcesFor(domainCode, province)
  if (canadaWide.length === 0 && provincial.length === 0) return null

  const intros = SECTION_INTROS[domainCode] ?? {}
  const showProvince = !!province && provincial.length > 0

  const canadaWideBlock = canadaWide.length > 0 && (
    <section>
      <h2 style={tierStyle}>Canada-wide</h2>
      {/* borderTop closes the top of the first row; each row carries a borderBottom. */}
      <div style={{ borderTop: '1px solid rgba(19,4,38,0.12)' }}>
        {renderCanadaWide(canadaWide, domainCode, intros)}
      </div>
    </section>
  )

  const provinceBlock = showProvince && (
    <section>
      <h2 style={tierStyle}>{province} resources</h2>
      <p style={{ fontFamily: hv, fontSize: 13, color: 'rgba(19,4,38,0.6)', lineHeight: 1.5, margin: '0 0 16px' }}>
        Based on the province you set at signup. To change it, visit{' '}
        <Link href="/app/account" style={{ color: '#2C3777', textDecoration: 'underline' }}>My Account</Link>.
      </p>
      <ResourceList resources={provincial} />
    </section>
  )

  return (
    <div>
      <style>{`
        .area-resource-link:hover { text-decoration: underline; }
        .rsec { border-bottom: 1px solid rgba(19,4,38,0.12); }
        .rsum { display: flex; align-items: center; justify-content: space-between; gap: 12px; cursor: pointer; padding: 15px 2px; list-style: none; }
        .rsum::-webkit-details-marker { display: none; }
        .rsum:hover .rsum-title { color: #2C3777; }
        .rchevron { flex-shrink: 0; transition: transform 200ms ease; }
        details[open] > .rsum .rchevron { transform: rotate(180deg); }
        /* Two independent, top-aligned columns (align-items:start → the columns never stretch
           to match each other) with a thin vertical divider in the gutter. The divider is a
           1px grid track that DOES stretch (align-self:stretch), so it runs the full height of
           the taller column — the left one, when its sections are expanded — while the columns
           stay top-aligned. Same hairline token as the section-row dividers. Reflows to a
           single stacked column on narrow, where the divider is removed. */
        .resources-cols { display: grid; grid-template-columns: minmax(0, 1.6fr) 1px minmax(0, 1fr); column-gap: 32px; align-items: start; }
        .resources-divider { align-self: stretch; background: rgba(19,4,38,0.12); }
        @media (max-width: 860px) { .resources-cols { grid-template-columns: 1fr; column-gap: 0; row-gap: 32px; } .resources-divider { display: none; } }
      `}</style>

      {LEAD[domainCode] && (
        <p style={{ fontFamily: hv, fontSize: 15, color: 'rgba(19,4,38,0.7)', lineHeight: 1.55, margin: CROSS_POINTER[domainCode] ? '8px 0 10px' : '8px 0 26px', maxWidth: 760 }}>{LEAD[domainCode]}</p>
      )}

      {CROSS_POINTER[domainCode] && (
        <p style={{ fontFamily: hv, fontSize: 13.5, fontStyle: 'italic', color: 'rgba(19,4,38,0.6)', lineHeight: 1.55, margin: '0 0 26px', maxWidth: 760 }}>{CROSS_POINTER[domainCode]}</p>
      )}

      {showProvince ? (
        <div className="resources-cols">
          <div>{canadaWideBlock}</div>
          <div className="resources-divider" aria-hidden="true" />
          <div>{provinceBlock}</div>
        </div>
      ) : (
        <div style={{ maxWidth: 760 }}>{canadaWideBlock}</div>
      )}
    </div>
  )
}
