'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createSupabaseBrowserClient } from '@/lib/supabase-browser'

const hv = "'Helvetica Neue', Helvetica, Arial, sans-serif"
const apf = "'Apfel Grotezk', sans-serif"

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

export default function PlanOverview({ domains }: { domains: { id: string; title: string }[] }) {
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

  const healthcareDomain = domains.find(d => d.title.toLowerCase().includes('healthcare'))
  const willsDomain      = domains.find(d => d.title.toLowerCase().includes('will'))
  const deathcareDomain  = domains.find(d => d.title.toLowerCase().includes('death'))

  useEffect(() => {
    async function fetchData() {
      const supabase = createSupabaseBrowserClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setLoaded(true); return }

      const meta = user.user_metadata ?? {}
      setSyncHasWill(!!meta.sync_has_will)
      setSyncHasCDM(!!meta.sync_has_care_decision_maker)
      setSyncHasEOL(!!meta.sync_has_eol_wishes_doc)
      setCareStatus((meta.sync_care_preferences_status as CareStatus) ?? null)

      const { data: entries } = await supabase
        .from('entries')
        .select('content, document_type')
        .eq('user_id', user.id)
        .in('document_type', ['personal_admin_info', 'important_contacts', 'advance_directive_supplement', 'funeral_wishes'])
        .order('created_at', { ascending: false })

      if (entries) {
        const adminEntry = entries.find(e => e.document_type === 'personal_admin_info')
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

        setHasAdvDir(!!entries.find(e => e.document_type === 'advance_directive_supplement'))
        setHasFuneralWishes(!!entries.find(e => e.document_type === 'funeral_wishes'))

        const contactsEntry = entries.find(e => e.document_type === 'important_contacts')
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
        const did = deathcareDomain.id
        setRestingDocumented(localStorage.getItem(`checkbox_${did}_final_resting_place_wishes_0`) === 'true')
        setRestingShared(localStorage.getItem(`checkbox_${did}_final_resting_place_wishes_1`) === 'true')
      }

      setLoaded(true)
    }
    fetchData()
  }, [domains]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!loaded) return null

  const healthHref     = healthcareDomain ? `/app/domains/${healthcareDomain.id}` : '#'
  const willsHref      = willsDomain      ? `/app/domains/${willsDomain.id}`      : '#'
  const deathHref      = deathcareDomain  ? `/app/domains/${deathcareDomain.id}`  : '#'
  const adminHref           = '/app/capture/personal-admin'
  const contactsHref        = '/app/capture/important-contacts'
  const yourWishesHref      = '/app/capture/advance-directive'
  const funeralWishesHref   = '/app/capture/funeral-wishes'

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
      supplementaryLink: hasAdvDir ? { label: 'Supplementary document', text: 'My Care Wishes', href: yourWishesHref } : undefined,
    },
    {
      label: 'Final resting place wishes',
      done: restingDone,
      primaryValue: restingDocumented && restingShared ? 'Documented and shared'
        : restingDocumented ? 'Documented'
        : restingShared   ? 'Shared with people in my life'
        : null,
      href: deathHref,
      supplementaryLink: { label: 'Supplementary document', text: 'Wishes for My Body, Funeral & Ceremony', href: funeralWishesHref },
    },
  ]

  const sectionLabel: React.CSSProperties = {
    fontFamily: hv, fontSize: 11, fontWeight: 600,
    color: 'rgba(19,4,38,0.45)', textTransform: 'uppercase',
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
          <span style={{ fontFamily: hv, fontSize: 12, color: 'rgba(19,4,38,0.5)', fontStyle: 'italic', flexShrink: 0 }}>
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
        <span style={{ color: 'rgba(19,4,38,0.55)' }}>{label}: </span>
        {value ? (
          <span style={{ color: 'rgba(19,4,38,0.7)' }}>{value}</span>
        ) : (
          <span style={{ color: 'rgba(19,4,38,0.45)', fontStyle: 'italic' }}>Not recorded</span>
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

  return (
    <div style={{ height: '100%' }}>
      <style>{`
        .po-row-label { text-decoration: underline; color: #2C3777; }
        .po-row-label:hover { color: #1a2255; }
        .po-contact-header { text-decoration: underline; color: #2C3777; }
        .po-contact-header:hover { color: #1a2255; }
      `}</style>

      <div style={{
        background: '#FFFFFF', border: '1.5px solid #F29836', borderRadius: 20, padding: '20px 22px',
        height: '100%', boxSizing: 'border-box',
        display: 'flex', flexDirection: 'column',
      }}>

        {/* Section heading */}
        <h2 style={{ fontFamily: apf, fontSize: 20, fontWeight: 400, color: '#130426', margin: '0 0 12px' }}>
          Key details
        </h2>
        <div style={{ height: 1, background: '#F0EAE0', marginBottom: 14 }} />

        {/* Flexible content area: wishes at top, contacts below */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 16 }}>

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
                        <span style={{ color: 'rgba(19,4,38,0.55)' }}>Name: </span>
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
                    <span style={{ fontFamily: hv, fontSize: 12, color: 'rgba(19,4,38,0.45)', fontStyle: 'italic', flexShrink: 0 }}>
                      Not recorded
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>

        </div>
      </div>
    </div>
  )
}
