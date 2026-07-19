// AreaResources — the embedded province-specific resource list for an area page's
// "Resources" section (replaces the old external Resource Hub link-out). Server component:
// renders static data + external links, no interactivity, so it passes cleanly as children
// from the server area page into the client CollapsibleSection.
//
// Two tiers the user sees: "Canada-wide" and "{their province} resources" — never a grid
// or cross-province comparison (they only ever see their own province's slice). Canada-wide
// sections follow the per-domain SECTION_ORDER tree (flat sections + nestable groups, e.g.
// Healthcare's equity cluster). The province tier is a flat list here (Healthcare); the
// component also handles sub-sectioned province tiers for future domains.
//
// Visual hierarchy (scannability): TIER header (largest/heaviest) > GROUP header (equity
// parent — larger than its sections + an indented, bordered container so its children
// clearly belong to it) > SECTION header (heading font/dark, distinct from the navy links).
// Whitespace does the chunking: links are tight within a section, sections are spaced apart.
//
// DATA vs PAGE COPY: the resources come from lib/resources.ts (data). The section intro
// paragraphs below (SECTION_INTROS) and the lead line are PAGE COPY authored here — not
// stored per-resource. Cross-pointer copy (none for Healthcare) also belongs here.

import Link from 'next/link'
import { resourcesFor, SECTION_ORDER, type Resource } from '@/lib/resources'

const apfel = "'Apfel Grotezk', sans-serif"
const hv = "'Helvetica Neue', Helvetica, Arial, sans-serif"

// ── Type scale (one deliberate level between each) ──────────────────────────────
const tierStyle: React.CSSProperties = { fontFamily: apfel, fontSize: 24, fontWeight: 700, color: '#130426', margin: '0 0 20px', lineHeight: 1.2 }
const groupStyle: React.CSSProperties = { fontFamily: apfel, fontSize: 18, fontWeight: 600, color: '#130426', margin: '0 0 16px', lineHeight: 1.25 }
const sectionStyle: React.CSSProperties = { fontFamily: apfel, fontSize: 16, fontWeight: 600, color: '#130426', margin: '0 0 10px', lineHeight: 1.3 }
const introStyle: React.CSSProperties = { fontFamily: hv, fontSize: 14, color: 'rgba(19,4,38,0.7)', lineHeight: 1.6, margin: '0 0 12px', maxWidth: 620 }
const linkStyle: React.CSSProperties = { fontFamily: hv, fontSize: 15, color: '#2C3777', textDecoration: 'none', lineHeight: 1.5 }
const noteStyle: React.CSSProperties = { fontFamily: hv, fontSize: 13, color: 'rgba(19,4,38,0.55)', lineHeight: 1.5, margin: '2px 0 0' }

// PAGE COPY: section intro paragraphs, per domain → section name. Only sections that need
// framing carry one; the rest render with no intro.
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

// A section = its header (skipped when the section name is empty, e.g. a flat tier) + an
// optional intro paragraph + the tight link list. Generous space below chunks it off from
// the next section.
function SectionBlock({ title, intro, resources }: { title: string; intro?: string; resources: Resource[] }) {
  return (
    <div style={{ marginBottom: 30 }}>
      {title && <h4 style={sectionStyle}>{title}</h4>}
      {intro && <p style={introStyle}>{intro}</p>}
      <ResourceList resources={resources} />
    </div>
  )
}

// Render Canada-wide resources grouped by section, in the domain's SECTION_ORDER (flat
// sections + nestable groups). Sections present in data but absent from the order config
// fall through at the end, so nothing is silently dropped.
function renderCanadaWide(resources: Resource[], domainCode: string, intros: Record<string, string>) {
  const bySection = new Map<string, Resource[]>()
  for (const r of resources) {
    const arr = bySection.get(r.section) ?? []
    arr.push(r)
    bySection.set(r.section, arr)
  }
  const rendered = new Set<string>()
  const blocks: React.ReactNode[] = []

  const sectionBlock = (name: string) => {
    const rs = bySection.get(name)
    if (!rs || rs.length === 0) return null
    rendered.add(name)
    return <SectionBlock key={name} title={name} intro={intros[name]} resources={rs} />
  }

  for (const node of SECTION_ORDER[domainCode] ?? []) {
    if (typeof node === 'string') {
      const b = sectionBlock(node)
      if (b) blocks.push(b)
    } else {
      const children = node.sections.map(sectionBlock).filter(Boolean)
      if (children.length > 0) {
        // Parent grouping: heavier header + an indented, left-bordered container so the
        // sub-sections read as belonging to it.
        blocks.push(
          <div key={node.group} style={{ marginBottom: 30 }}>
            <h3 style={groupStyle}>{node.group}</h3>
            <div style={{ paddingLeft: 18, borderLeft: '2px solid rgba(19,4,38,0.1)' }}>{children}</div>
          </div>,
        )
      }
    }
  }
  for (const [name, rs] of bySection) {
    if (!rendered.has(name) && rs.length > 0) blocks.push(<SectionBlock key={name} title={name} intro={intros[name]} resources={rs} />)
  }
  return blocks
}

export default function AreaResources({ domainCode, province }: { domainCode: string; province?: string }) {
  const { canadaWide, provincial } = resourcesFor(domainCode, province)
  if (canadaWide.length === 0 && provincial.length === 0) return null

  const intros = SECTION_INTROS[domainCode] ?? {}
  const showProvince = !!province && provincial.length > 0

  return (
    <div>
      <style>{`.area-resource-link:hover { text-decoration: underline; }`}</style>

      {LEAD[domainCode] && (
        <p style={{ fontFamily: hv, fontSize: 15, color: 'rgba(19,4,38,0.7)', lineHeight: 1.55, margin: '8px 0 28px', maxWidth: 620 }}>{LEAD[domainCode]}</p>
      )}

      {canadaWide.length > 0 && (
        <section style={{ marginBottom: showProvince ? 48 : 0 }}>
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
          <ResourceList resources={provincial} />
        </section>
      )}
    </div>
  )
}
