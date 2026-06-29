'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createSupabaseBrowserClient } from '@/lib/supabase-browser'
import { loadDomainState, getCheckboxes } from '@/lib/domain-state'
import { DOCUMENT_TYPE, DOCUMENT_TYPE_META } from '@/lib/content-metadata'
import { AREAS, type KeyDetailsRowId } from '@/lib/areas'

const hv = "'Helvetica Neue', Helvetica, Arial, sans-serif"

// Per-area Key Details panel for an area page's Plan section. Same data sources and
// link logic as the cross-domain PlanOverview, but: renders only this area's rows
// (single column, no collapse), and rows that linked to a domain page now link to
// the corresponding /app/area/[slug] page (rows linking to documents keep those).
// NOTE: temporarily duplicates PlanOverview's data load; once PlanOverview is deleted
// (Phase 4) this is the only Key Details surface. (Phase-2 cleanup: shared data hook.)

type ContactInfo = { name: string; institution: string; phone: string; email: string }
type CareStatus = 'communicated' | 'documented' | 'both' | null

const sectionLabel: React.CSSProperties = {
  fontFamily: hv, fontSize: 11, fontWeight: 600, color: 'rgba(19,4,38,0.65)',
  textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 10px',
}
const rowLink: React.CSSProperties = { fontFamily: hv, fontSize: 13, color: '#2C3777', textDecoration: 'underline', textUnderlineOffset: 3 }
const valueText: React.CSSProperties = { fontFamily: hv, fontSize: 12, color: 'rgba(19,4,38,0.65)' }
const notRec: React.CSSProperties = { ...valueText, fontStyle: 'italic' }

function areaHref(domainCode: string): string {
  const a = AREAS.find((x) => x.domainCode === domainCode)
  return a ? `/app/area/${a.slug}` : '/app'
}

export default function AreaKeyDetails({ rows }: { rows: KeyDetailsRowId[] }) {
  const [careStatus, setCareStatus] = useState<CareStatus>(null)
  const [syncHasEOL, setSyncHasEOL] = useState(false)
  const [hasAdvDir, setHasAdvDir]   = useState(false)
  const [cdm, setCdm]       = useState<ContactInfo | null>(null)
  const [cdmDocLoc, setCdmDocLoc] = useState<string | null>(null)
  const [doctor, setDoctor] = useState<ContactInfo | null>(null)
  const [lawyer, setLawyer] = useState<ContactInfo | null>(null)
  const [syncHasWill, setSyncHasWill] = useState(false)
  const [restingDocumented, setRestingDocumented] = useState(false)
  const [restingShared, setRestingShared] = useState(false)

  useEffect(() => {
    let cancelled = false
    void (async () => {
      const supabase = createSupabaseBrowserClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: containers } = await supabase.from('containers').select('id, domain_code').eq('type', 'domain').eq('user_id', user.id)
      const byCode = (code: string) => (containers ?? []).find((c) => c.domain_code === code)?.id
      const { state } = await loadDomainState(supabase)
      if (cancelled) return

      const hcId = byCode('healthcare')
      if (hcId) {
        const eol = getCheckboxes(state, hcId, 'wishes_clear_shared', 2)
        const communicated = eol[0] === true, documented = eol[1] === true
        setSyncHasEOL(communicated || documented)
        setCareStatus(communicated && documented ? 'both' : communicated ? 'communicated' : documented ? 'documented' : null)
      }
      const willId = byCode('wills_estates')
      if (willId) setSyncHasWill(getCheckboxes(state, willId, 'legal_will_in_place', 1)[0] === true)
      const deathId = byCode('deathcare')
      if (deathId) {
        const rest = getCheckboxes(state, deathId, 'final_resting_place_wishes', 3)
        setRestingDocumented(rest[0] === true); setRestingShared(rest[1] === true)
      }

      const { data: entries } = await supabase.from('entries')
        .select('content, document_type').eq('user_id', user.id)
        .in('document_type', [DOCUMENT_TYPE.PERSONAL_ADMIN_INFO, DOCUMENT_TYPE.IMPORTANT_CONTACTS, DOCUMENT_TYPE.ADVANCE_DIRECTIVE_SUPPLEMENT])
        .order('created_at', { ascending: false })
      if (cancelled || !entries) return

      const admin = entries.find((e) => e.document_type === DOCUMENT_TYPE.PERSONAL_ADMIN_INFO)
      if (admin) {
        const c = admin.content as Record<string, unknown>
        const name = (c?.careDecisionMaker1Name as string | undefined)?.trim() || null
        if (name || c?.careDecisionMaker1Phone || c?.careDecisionMaker1Email) {
          setCdm({ name: name ?? '', institution: '', phone: (c?.careDecisionMaker1Phone as string | undefined)?.trim() || '', email: (c?.careDecisionMaker1Email as string | undefined)?.trim() || '' })
        }
        setCdmDocLoc((c?.careDecisionMakerDocLocation as string | undefined)?.trim() || null)
      }
      setHasAdvDir(!!entries.find((e) => e.document_type === DOCUMENT_TYPE.ADVANCE_DIRECTIVE_SUPPLEMENT))
      const contacts = entries.find((e) => e.document_type === DOCUMENT_TYPE.IMPORTANT_CONTACTS)
      if (contacts) {
        const c = contacts.content as Record<string, unknown>
        const hc = (c?.healthcare as Record<string, string>[] | undefined)?.find((d) => d?.name?.trim())
        const lg = (c?.legal as Record<string, string>[] | undefined)?.find((l) => l?.name?.trim())
        if (hc) setDoctor({ name: hc.name?.trim() || '', institution: (hc.institution ?? '').trim(), phone: hc.phone?.trim() || '', email: hc.email?.trim() || '' })
        if (lg) setLawyer({ name: lg.name?.trim() || '', institution: (lg.institution ?? '').trim(), phone: lg.phone?.trim() || '', email: lg.email?.trim() || '' })
      }
    })()
    return () => { cancelled = true }
  }, [])

  const adminHref    = DOCUMENT_TYPE_META.personal_admin_info.href
  const contactsHref = DOCUMENT_TYPE_META.important_contacts.href

  // ── Row builders (data + destination; destinations preserve current link logic) ──
  const careLabel = careStatus === 'both' ? 'Documented and communicated'
    : careStatus === 'communicated' ? 'Communicated to substitute decision-maker for care'
    : careStatus === 'documented' ? 'Documented' : null
  const restingLabel = restingDocumented && restingShared ? 'Documented and shared'
    : restingDocumented ? 'Documented' : restingShared ? 'Shared with people in my life' : null

  const docRows: Record<string, { label: string; value: string | null; href: string; supplementary?: { text: string; href: string } }> = {
    care_preferences: {
      label: 'Care preferences',
      value: syncHasEOL ? careLabel : null,
      href: areaHref('healthcare'),
      supplementary: hasAdvDir ? { text: DOCUMENT_TYPE_META.advance_directive_supplement.label, href: DOCUMENT_TYPE_META.advance_directive_supplement.href } : undefined,
    },
    final_resting_place: { label: 'Final resting place wishes', value: restingLabel, href: areaHref('deathcare') },
    legal_will: { label: 'Legal will', value: syncHasWill ? 'Documented' : null, href: syncHasWill ? `${adminHref}?section=legal` : areaHref('wills_estates') },
  }

  const contactRows: Record<string, { header: string; href: string; contact: ContactInfo | null; docLoc?: string | null }> = {
    sdm_for_care: { header: 'Substitute decision-maker for care', href: `${adminHref}?section=legal`, contact: cdm, docLoc: cdmDocLoc },
    doctor: { header: 'Doctor', href: `${contactsHref}?section=healthcare`, contact: doctor },
    lawyer: { header: 'Lawyer', href: `${contactsHref}?section=legal`, contact: lawyer },
  }

  const docIds = rows.filter((r) => r in docRows)
  const contactIds = rows.filter((r) => r in contactRows)

  return (
    <div style={{ background: '#FFFFFF', border: '1.5px solid #F29836', borderRadius: 16, padding: '22px 24px' }}>
      <h3 style={{ fontFamily: hv, fontSize: 18, fontWeight: 700, color: '#130426', margin: '0 0 18px' }}>Key details</h3>

      {docIds.length > 0 && (
        <div style={{ marginBottom: contactIds.length > 0 ? 22 : 0 }}>
          <p style={sectionLabel}>Wishes &amp; documentation</p>
          {docIds.map((id) => {
            const row = docRows[id]
            return (
              <div key={id} style={{ padding: '8px 0', borderTop: '1px solid rgba(19,4,38,0.06)', display: 'flex', flexWrap: 'wrap', alignItems: 'baseline', gap: 10 }}>
                <Link href={row.href} style={rowLink}>{row.label}</Link>
                {row.value ? <span style={valueText}>{row.value}</span> : <span style={notRec}>Not recorded</span>}
                {row.supplementary && (
                  <Link href={row.supplementary.href} style={{ ...valueText, textDecoration: 'underline', color: '#2C3777' }}>{row.supplementary.text}</Link>
                )}
              </div>
            )
          })}
        </div>
      )}

      {contactIds.length > 0 && (
        <div>
          <p style={sectionLabel}>Contacts</p>
          {contactIds.map((id) => {
            const row = contactRows[id]
            return (
              <div key={id} style={{ padding: '10px 0', borderTop: '1px solid rgba(19,4,38,0.06)' }}>
                {row.contact?.name ? (
                  <>
                    <Link href={row.href} style={{ ...rowLink, display: 'block', marginBottom: 4 }}>{row.header}</Link>
                    <p style={{ ...valueText, margin: 0 }}>Name: {row.contact.name}</p>
                    {row.contact.institution && <p style={{ ...valueText, margin: 0 }}>Institution: {row.contact.institution}</p>}
                    {row.contact.phone && <p style={{ ...valueText, margin: 0 }}>Phone: {row.contact.phone}</p>}
                    {row.contact.email && <p style={{ ...valueText, margin: 0 }}>Email: {row.contact.email}</p>}
                  </>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <Link href={row.href} style={rowLink}>{row.header}</Link>
                    <span style={notRec}>Not recorded</span>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
