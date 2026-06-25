'use client'

import { useEffect, useState } from 'react'
import { DOCUMENT_TYPE_META, DOCUMENT_TYPE } from '@/lib/content-metadata'
import Link from 'next/link'
import { createSupabaseBrowserClient } from '@/lib/supabase-browser'
import { loadDomainState, getCheckboxes } from '@/lib/domain-state'

const hv = "'Helvetica Neue', Helvetica, Arial, sans-serif"
const apf = "'Apfel Grotezk', sans-serif"

// Collapse preference, SHARED across the Plan sub-pages (Progress + Materials) —
// one key, read on mount, so collapsing on one page applies to the other.
const KEY_DETAILS_COLLAPSED_KEY = 'nightside.keyDetailsCollapsed'

type CareStatus = 'communicated' | 'documented' | 'both' | null
type ContactInfo = { name: string; institution: string; phone: string; email: string }
type SecondaryLine = { label: string; value: string | null; href: string }
type DocRow = {
  label: string
  done: boolean
  primaryValue: string | null
  href: string
  notRecordedLabel?: string
  secondaryLines?: SecondaryLine[]
  supplementaryLink?: { label?: string; text: string; href: string }
}

export default function PlanOverview({ domains }: { domains: { id: string; title: string; domain_code?: string | null }[] }) {
  const [syncHasWill, setSyncHasWill]   = useState(false)
  const [syncHasCDM, setSyncHasCDM]     = useState(false)
  const [syncHasEOL, setSyncHasEOL]     = useState(false)
  const [careStatus, setCareStatus]     = useState<CareStatus>(null)
  const [willLocation, setWillLocation] = useState<string | null>(null)
  const [cdmName, setCdmName]           = useState<string | null>(null)
  const [cdmPhone, setCdmPhone]         = useState<string | null>(null)
  const [cdmEmail, setCdmEmail]         = useState<string | null>(null)
  const [cdmDocLoc, setCdmDocLoc]       = useState<string | null>(null)
  const [hasAdvDir, setHasAdvDir]       = useState(false)
  const [hasFuneralWishes, setHasFuneralWishes] = useState(false)
  const [doctor, setDoctor]             = useState<ContactInfo | null>(null)
  const [lawyer, setLawyer]             = useState<ContactInfo | null>(null)
  const [restingDocumented, setRestingDocumented] = useState(false)
  const [restingShared, setRestingShared]         = useState(false)
  const [loaded, setLoaded]             = useState(false)

  // Tri-state collapse preference: true/false = explicit user choice; null = no
  // choice yet → fall back to the data-driven default (collapsed when everything's
  // filled in, expanded when there are gaps) computed below. Read once (SSR-safe).
  const [storedCollapse, setStoredCollapse] = useState<boolean | null>(() => {
    if (typeof window === 'undefined') return null
    try {
      const v = window.localStorage.getItem(KEY_DETAILS_COLLAPSED_KEY)
      return v === 'true' ? true : v === 'false' ? false : null
    } catch { return null }
  })

  const healthcareDomain = domains.find(d => d.domain_code === 'healthcare')
  const willsDomain      = domains.find(d => d.domain_code === 'wills_estates')
  const deathcareDomain  = domains.find(d => d.domain_code === 'deathcare')

  useEffect(() => {
    async function fetchData() {
      const supabase = createSupabaseBrowserClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setLoaded(true); return }

      // Pull source-of-truth domain state (also backfills legacy sources).
      const { state: domainState } = await loadDomainState(supabase)
      if (willsDomain) {
        const willVals = getCheckboxes(domainState, willsDomain.id, 'legal_will_in_place', 1)
        setSyncHasWill(willVals[0] === true)
      }
      if (healthcareDomain) {
        const cdmVals = getCheckboxes(domainState, healthcareDomain.id, 'who_will_decide', 3)
        setSyncHasCDM(cdmVals[0] || cdmVals[2])
        const eolVals = getCheckboxes(domainState, healthcareDomain.id, 'wishes_clear_shared', 2)
        const communicated = eolVals[0] === true
        const documented   = eolVals[1] === true
        setSyncHasEOL(communicated || documented)
        setCareStatus(
          communicated && documented ? 'both' :
          communicated ? 'communicated' :
          documented   ? 'documented'   : null
        )
      }

      const { data: entries } = await supabase
        .from('entries')
        .select('content, document_type')
        .eq('user_id', user.id)
        .in('document_type', [DOCUMENT_TYPE.PERSONAL_ADMIN_INFO, DOCUMENT_TYPE.IMPORTANT_CONTACTS, DOCUMENT_TYPE.ADVANCE_DIRECTIVE_SUPPLEMENT, DOCUMENT_TYPE.FUNERAL_WISHES])
        .order('created_at', { ascending: false })

      if (entries) {
        const adminEntry = entries.find(e => e.document_type === DOCUMENT_TYPE.PERSONAL_ADMIN_INFO)
        if (adminEntry) {
          const c = adminEntry.content as Record<string, unknown>
          const name = (c?.careDecisionMaker1Name as string | undefined)?.trim()
            || (c?.careDecisionMaker1 as string | undefined)?.trim()
            || null
          setCdmName(name)
          setCdmPhone((c?.careDecisionMaker1Phone as string | undefined)?.trim() || null)
          setCdmEmail((c?.careDecisionMaker1Email as string | undefined)?.trim() || null)
          setCdmDocLoc((c?.careDecisionMakerDocLocation as string | undefined)?.trim() || null)
          setWillLocation((c?.willLocation as string | undefined)?.trim() || null)
        }

        setHasAdvDir(!!entries.find(e => e.document_type === DOCUMENT_TYPE.ADVANCE_DIRECTIVE_SUPPLEMENT))
        setHasFuneralWishes(!!entries.find(e => e.document_type === DOCUMENT_TYPE.FUNERAL_WISHES))

        const contactsEntry = entries.find(e => e.document_type === DOCUMENT_TYPE.IMPORTANT_CONTACTS)
        if (contactsEntry) {
          const c = contactsEntry.content as Record<string, unknown>
          const hcList = (c?.healthcare as Record<string, string>[] | undefined) ?? []
          const legalList = (c?.legal as Record<string, string>[] | undefined) ?? []
          const firstDoctor = hcList.find(d => d?.name?.trim())
          const firstLawyer = legalList.find(l => l?.name?.trim())
          if (firstDoctor) setDoctor({ name: firstDoctor.name?.trim() || '', institution: (firstDoctor.institution ?? '').trim(), phone: firstDoctor.phone?.trim() || '', email: firstDoctor.email?.trim() || '' })
          if (firstLawyer) setLawyer({ name: firstLawyer.name?.trim() || '', institution: (firstLawyer.institution ?? '').trim(), phone: firstLawyer.phone?.trim() || '', email: firstLawyer.email?.trim() || '' })
        }
      }

      if (deathcareDomain) {
        const restVals = getCheckboxes(domainState, deathcareDomain.id, 'final_resting_place_wishes', 3)
        setRestingDocumented(restVals[0] === true)
        setRestingShared(restVals[1] === true)
      }

      setLoaded(true)
    }
    fetchData()
  }, [domains]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!loaded) return null

  const healthHref     = healthcareDomain ? `/app/domains/${healthcareDomain.id}` : '#'
  const willsHref      = willsDomain      ? `/app/domains/${willsDomain.id}`      : '#'
  const deathHref      = deathcareDomain  ? `/app/domains/${deathcareDomain.id}`  : '#'
  const adminHref           = DOCUMENT_TYPE_META.personal_admin_info.href
  const contactsHref        = DOCUMENT_TYPE_META.important_contacts.href
  const yourWishesHref      = DOCUMENT_TYPE_META.advance_directive_supplement.href
  const funeralWishesHref   = DOCUMENT_TYPE_META.funeral_wishes.href

  const careLabel = careStatus === 'documented'   ? 'Formally documented'
    : careStatus === 'communicated' ? 'Communicated to decision maker'
    : careStatus === 'both'         ? 'Documented and communicated'
    : 'Documented or communicated'

  const restingDone = restingDocumented || restingShared

  const docRows: DocRow[] = [
    {
      label: 'Legal will',
      done: syncHasWill,
      primaryValue: syncHasWill ? 'Documented' : null,
      href: syncHasWill ? `${adminHref}?section=legal` : willsHref,
      secondaryLines: syncHasWill ? [
        { label: 'Document location', value: willLocation, href: `${adminHref}?section=legal` },
      ] : undefined,
    },
    {
      label: 'Care preferences',
      done: syncHasEOL,
      primaryValue: syncHasEOL ? careLabel : null,
      href: healthHref,
      notRecordedLabel: 'Not formally recorded',
      supplementaryLink: hasAdvDir ? { label: 'Supplementary document', text: DOCUMENT_TYPE_META.advance_directive_supplement.label, href: yourWishesHref } : undefined,
    },
    {
      label: 'Final resting place wishes',
      done: restingDone,
      primaryValue: restingDocumented && restingShared ? 'Documented and shared'
        : restingDocumented ? 'Documented'
        : restingShared   ? 'Shared with people in my life'
        : null,
      href: deathHref,
      supplementaryLink: { label: 'Supplementary document', text: DOCUMENT_TYPE_META.funeral_wishes.label, href: funeralWishesHref },
    },
  ]

  const sectionLabel: React.CSSProperties = {
    fontFamily: hv, fontSize: 11, fontWeight: 600,
    color: 'rgba(19,4,38,0.65)', textTransform: 'uppercase',
    letterSpacing: '0.06em', marginBottom: 10, marginTop: 0,
  }

  const divider = <div style={{ height: 1, background: '#F0EAE0', margin: '14px 0' }} />

  function DocIcon() {
    return (
      <svg width="14" height="14" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0, display: 'inline-block', verticalAlign: '-2px', marginRight: 6 }} aria-hidden="true">
        <path d="M3 2.5A1.5 1.5 0 0 1 4.5 1H10l3 3v9A1.5 1.5 0 0 1 11.5 14.5h-7A1.5 1.5 0 0 1 3 13V2.5z" stroke="currentColor" strokeWidth="1.25" strokeLinejoin="round" fill="none"/>
        <path d="M10 1v3h3" stroke="currentColor" strokeWidth="1.25" strokeLinejoin="round" fill="none"/>
        <path d="M5.5 7.5h5M5.5 10h5" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round"/>
      </svg>
    )
  }

  function renderDocRow(row: DocRow, isLast: boolean) {
    return (
      <div
        key={row.label}
        style={{
          padding: '10px 0',
          borderBottom: isLast ? 'none' : '1px solid rgba(19,4,38,0.06)',
          display: 'flex', alignItems: 'center', gap: 10,
        }}
      >
        <div style={{ width: 8, height: 8, borderRadius: '50%', flexShrink: 0, background: row.done ? '#2C3777' : 'rgba(19,4,38,0.2)' }} />
        <Link href={row.href} className="po-row-label"
          style={{ fontFamily: hv, fontSize: 13, flex: 1 }}
        >
          {row.label}
        </Link>
        {row.primaryValue ? (
          <span style={{ fontFamily: hv, fontSize: 12, color: 'rgba(19,4,38,0.65)', flexShrink: 0 }}>
            {row.primaryValue}
          </span>
        ) : (
          <span style={{ fontFamily: hv, fontSize: 12, color: 'rgba(19,4,38,0.65)', fontStyle: 'italic', flexShrink: 0 }}>
            {row.notRecordedLabel ?? 'Not recorded'}
          </span>
        )}
      </div>
    )
  }

  type ContactField = { label: string; value: string | null }
  type ContactBlock = { header: string; href: string; name: string | null; fields: ContactField[] }

  function renderContactField({ label, value }: ContactField) {
    return (
      <p style={{ fontFamily: hv, fontSize: 12, lineHeight: 1.5, margin: 0 }}>
        <span style={{ color: 'rgba(19,4,38,0.65)' }}>{label}: </span>
        {value ? (
          <span style={{ color: 'rgba(19,4,38,0.7)' }}>{value}</span>
        ) : (
          <span style={{ color: 'rgba(19,4,38,0.65)', fontStyle: 'italic' }}>Not recorded</span>
        )}
      </p>
    )
  }

  const contactBlocks: ContactBlock[] = [
    {
      header: 'Substitute decision maker',
      href: `${adminHref}?section=legal`,
      name: cdmName,
      fields: [
        { label: 'Phone',    value: cdmPhone  },
        { label: 'Email',    value: cdmEmail  },
        { label: 'Document location', value: cdmDocLoc },
      ],
    },
    {
      header: 'Doctor',
      href: `${contactsHref}?section=healthcare`,
      name: doctor?.name || null,
      fields: [
        { label: 'Institution', value: doctor?.institution || null },
        { label: 'Phone',       value: doctor?.phone       || null },
        { label: 'Email',       value: doctor?.email       || null },
      ],
    },
    {
      header: 'Lawyer',
      href: `${contactsHref}?section=legal`,
      name: lawyer?.name || null,
      fields: [
        { label: 'Institution', value: lawyer?.institution || null },
        { label: 'Phone',       value: lawyer?.phone       || null },
        { label: 'Email',       value: lawyer?.email       || null },
      ],
    },
  ]

  // Completion count uses the SAME signals the expanded panel shows as "done": a
  // doc row's checkbox-driven `done`, and a contact's `name` present (its
  // expanded-vs-"Not recorded" split). Keeps the collapsed summary honest.
  const detailsTotal = docRows.length + contactBlocks.length
  const detailsFilled = docRows.filter((r) => r.done).length + contactBlocks.filter((b) => !!b.name).length
  const allFilled = detailsTotal > 0 && detailsFilled === detailsTotal
  const collapsed = storedCollapse ?? allFilled

  function toggleCollapse() {
    const next = !collapsed
    setStoredCollapse(next)
    try { window.localStorage.setItem(KEY_DETAILS_COLLAPSED_KEY, String(next)) } catch { /* ignore */ }
  }

  return (
    <div>
      <style>{`
        .po-row-label { text-decoration: underline; color: #2C3777; }
        .po-row-label:hover { color: #1a2255; }
        .po-contact-header { text-decoration: underline; color: #2C3777; }
        .po-contact-header:hover { color: #1a2255; }
        .kd-header:hover .kd-chevron { opacity: 0.7; }
      `}</style>

      <div style={{
        background: '#FFFFFF', border: '1.5px solid #F29836', borderRadius: 20, padding: '20px 22px',
        boxSizing: 'border-box',
      }}>

        {/* Header — collapsible (matches the Your-materials panel pattern) */}
        <button
          className="kd-header"
          onClick={toggleCollapse}
          style={{ display: 'flex', width: '100%', alignItems: 'center', gap: 8, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
        >
          <h2 style={{ fontFamily: apf, fontSize: 20, fontWeight: 400, color: '#130426', margin: 0, flex: 1, textAlign: 'left' }}>
            Key details
          </h2>
          <span className="kd-chevron" style={{ transition: 'opacity 150ms', display: 'inline-flex' }}>
            <Chevron open={!collapsed} />
          </span>
        </button>

        {/* Collapsed → completion summary only */}
        {collapsed && (
          <p style={{ fontFamily: hv, fontSize: 13, color: 'rgba(19,4,38,0.65)', margin: '6px 0 0', lineHeight: 1.4 }}>
            {detailsFilled} of {detailsTotal} filled in
          </p>
        )}

        {/* Expanded → full details */}
        {!collapsed && (
          <>
            <div style={{ height: 1, background: '#F0EAE0', margin: '12px 0 14px' }} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Wishes & documentation */}
          <div>
            <p style={sectionLabel}>Wishes &amp; documentation</p>
            {docRows.map((row, i) => renderDocRow(row, i === docRows.length - 1))}
          </div>

          {/* Contacts */}
          <div>
            {divider}
            <p style={sectionLabel}>Contacts</p>
            {contactBlocks.map((block, i) => (
              <div
                key={block.header}
                style={{
                  padding: '10px 0',
                  borderBottom: i === contactBlocks.length - 1 ? 'none' : '1px solid rgba(19,4,38,0.06)',
                }}
              >
                {block.name ? (
                  // Expanded: name is known — show title + all fields
                  <>
                    <Link href={block.href} className="po-contact-header"
                      style={{ fontFamily: hv, fontSize: 13, display: 'block', marginBottom: 4 }}
                    >
                      {block.header}
                    </Link>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                      <p style={{ fontFamily: hv, fontSize: 12, lineHeight: 1.5, margin: 0 }}>
                        <span style={{ color: 'rgba(19,4,38,0.65)' }}>Name: </span>
                        <span style={{ color: 'rgba(19,4,38,0.7)' }}>{block.name}</span>
                      </p>
                      {block.fields.map((val, j) => (
                        <div key={j}>{renderContactField(val)}</div>
                      ))}
                    </div>
                  </>
                ) : (
                  // Null state: no name — single line matching Wishes & documentation pattern
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <Link href={block.href} className="po-contact-header"
                      style={{ fontFamily: hv, fontSize: 13, flex: 1 }}
                    >
                      {block.header}
                    </Link>
                    <span style={{ fontFamily: hv, fontSize: 12, color: 'rgba(19,4,38,0.65)', fontStyle: 'italic', flexShrink: 0 }}>
                      Not recorded
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

function Chevron({ open }: { open: boolean }) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true"
      style={{ transform: open ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 200ms ease' }}>
      <path d="M4 6l4 4 4-4" stroke="#130426" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
