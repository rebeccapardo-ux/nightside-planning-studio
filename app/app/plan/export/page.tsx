'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createSupabaseBrowserClient } from '@/lib/supabase-browser'
import { loadDomainState, getCheckboxes, getOrient, getReadyStatus } from '@/lib/domain-state'
import { buildMaterials } from '@/lib/pdf/buildPlanData'
import type { PlanKeyDetail, PlanDomainStatus, PlanCheckboxItem, PlanMaterial, PlanPDFProps } from '@/lib/pdf/PlanPDFDocument'

const hv = "'Helvetica Neue', Helvetica, Arial, sans-serif"
const apf = "'Apfel Grotezk', sans-serif"

// ---------------------------------------------------------------------------
// Domain segment configs (from DomainStateCard)
// ---------------------------------------------------------------------------

type SegmentDef = { key: string; type: 'orient' | 'ready'; label: string; checkboxes?: string[] }

const DOMAIN_SEGMENT_CONFIGS: { match: string; displayName: string; segments: SegmentDef[] }[] = [
  { match: 'healthcare', displayName: 'Healthcare Wishes', segments: [
    { key: 'values_care_priorities',    type: 'orient', label: 'My values and priorities for care at end of life' },
    { key: 'decision_making_framework', type: 'orient', label: 'Understand how substitute decision-making for care works in my province' },
    { key: 'who_would_speak',           type: 'orient', label: 'Consider who I would want to make decisions for me if I were not able to' },
    { key: 'who_will_decide',           type: 'ready',  label: 'Who will make decisions for me', checkboxes: [
      'I have identified a substitute decision maker for my care',
      'They have agreed to take on this role',
      'I have legally documented my decision-maker',
    ]},
    { key: 'wishes_clear_shared',       type: 'ready',  label: 'My wishes are clear and shared', checkboxes: [
      'I have communicated my wishes to my decision maker',
      'I have formally documented my wishes',
    ]},
  ]},
  { match: 'deathcare', displayName: 'Deathcare', segments: [
    { key: 'final_resting_place_wishes', type: 'orient', label: "Reflect on my wishes for my body's final resting place" },
    { key: 'legal_options_province',     type: 'orient', label: 'Understand the legal options in my province' },
    { key: 'final_resting_place_wishes', type: 'ready',  label: 'Final resting place wishes', checkboxes: [
      'I have documented what I want to happen with my body after my death',
      'I have shared these wishes with people in my life',
      "If applicable, I have registered with my province's organ and tissue donation registry",
    ]},
  ]},
  { match: 'will', displayName: 'Wills & Estates', segments: [
    { key: 'legal_will_requirements',    type: 'orient', label: 'Understand the requirements for a legal will in my province' },
    { key: 'executor_choice',            type: 'orient', label: 'Consider who I want to name as executor' },
    { key: 'asset_wishes',               type: 'orient', label: 'Reflect on wishes for my assets' },
    { key: 'care_children_pets',         type: 'orient', label: 'Care of children or pets' },
    { key: 'additional_estate_planning', type: 'orient', label: 'Consider whether additional estate planning may apply to my situation' },
    { key: 'legal_will_in_place',        type: 'ready',  label: 'Legal will', checkboxes: [
      'I have a valid, up-to-date legal will',
    ]},
    { key: 'other_estate_planning',      type: 'ready',  label: 'Other estate planning needs (if applicable)', checkboxes: [
      'I have identified any additional planning needs relevant to my situation',
      'I have taken steps to address them',
    ]},
    { key: 'professional_support',       type: 'ready',  label: 'Professional support (if needed)', checkboxes: [
      'I have consulted professional support if needed',
    ]},
    { key: 'meaningful_objects',         type: 'ready',  label: 'What should happen to my belongings', checkboxes: [
      'I have documented what should happen to items that matter to me',
      'I have shared these wishes with people who may need to act',
    ]},
  ]},
  { match: 'ritual', displayName: 'Ritual & Ceremony', segments: [
    { key: 'meaningful_rituals',          type: 'orient', label: 'Reflect on rituals or ceremonies that are meaningful to me' },
    { key: 'mark_or_remember',            type: 'orient', label: 'Consider how I want my death to be marked or remembered' },
    { key: 'ritual_ceremony_preferences', type: 'ready',  label: 'Ritual and ceremony preferences', checkboxes: [
      'I have shared my preferences for ritual and ceremony with people in my life',
      'My preferences are documented somewhere accessible (if I choose to)',
    ]},
  ]},
  { match: 'legacy', displayName: 'Legacy', segments: [
    { key: 'life_story_shaped',    type: 'orient', label: 'Reflect on the story of my life and what has shaped me' },
    { key: 'how_remembered',       type: 'orient', label: 'Consider how I want to be remembered' },
    { key: 'relationships_impact', type: 'orient', label: 'Reflect on meaningful relationships and personal impact' },
    { key: 'sharing_what_matters', type: 'ready',  label: 'Sharing what matters to me', checkboxes: [
      'I have created or captured something I want to leave behind (if I choose to)',
      'I have documented my obituary wishes or what I want said about my life',
      'I have noted causes or organizations I want remembered or supported',
    ]},
  ]},
  { match: 'personal', displayName: 'Personal Admin', segments: [
    { key: 'understand_personal_admin',   type: 'orient', label: 'Understand personal admin involved in death planning' },
    { key: 'personal_information',        type: 'ready',  label: 'Personal records', checkboxes: [
      'I have documented my personal identification, legal designations, and important documents',
    ]},
    { key: 'important_contacts',          type: 'ready',  label: 'Important contacts', checkboxes: [
      'I have recorded the people someone may need to contact',
    ]},
    { key: 'financial_information',       type: 'ready',  label: 'Financial information', checkboxes: [
      'I have documented my financial accounts and insurance',
    ]},
    { key: 'devices_and_accounts',        type: 'ready',  label: 'Devices and accounts', checkboxes: [
      'I have documented my devices and account access information',
    ]},
    { key: 'social_media_digital_assets', type: 'ready',  label: 'Social media and digital assets', checkboxes: [
      'I have decided what should happen to my social media accounts and digital assets (if applicable)',
      'I have shared or documented these wishes',
    ]},
  ]},
]

const DOMAIN_DISPLAY_ORDER = ['healthcare', 'deathcare', 'legacy', 'will', 'personal', 'ritual']

function getDomainSegments(title: string): SegmentDef[] {
  const lower = title.toLowerCase()
  for (const config of DOMAIN_SEGMENT_CONFIGS) {
    if (lower.includes(config.match)) return config.segments
  }
  return []
}

function qualitativeLabel(started: number, total: number): string {
  if (started === 0 || total === 0) return 'Not yet started'
  const pct = started / total
  if (pct >= 1)    return 'Deeply explored'
  if (pct >= 0.67) return 'Well underway'
  if (pct >= 0.34) return 'Taking shape'
  return 'Just beginning'
}

const ALL_POSSIBLE_MATERIAL_TITLES = [
  'My Care Wishes',
  'Wishes for My Body, Funeral & Ceremony',
  'Personal Admin Information',
  'Important Contacts',
  'Financial Information',
  'Devices & Accounts',
  'Keepsakes Inventory',
  'Values Ranking',
  'Fears Ranking',
  'Legacy Map',
]

// ---------------------------------------------------------------------------
// Main page component
// ---------------------------------------------------------------------------

export default function PlanExportPage() {
  const [loading, setLoading]                 = useState(true)
  const [userName, setUserName]               = useState('')
  const [firstName, setFirstName]             = useState('')
  const [lastName, setLastName]               = useState('')
  const [keyDetails, setKeyDetails]           = useState<PlanKeyDetail[]>([])
  const [domainStatuses, setDomainStatuses]   = useState<PlanDomainStatus[]>([])
  const [materials, setMaterials]             = useState<PlanMaterial[]>([])
  const [summaryLoading, setSummaryLoading]   = useState(false)
  const [fullLoading, setFullLoading]         = useState(false)
  const [jsonLoading, setJsonLoading]         = useState(false)

  useEffect(() => {
    async function load() {
      const supabase = createSupabaseBrowserClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setLoading(false); return }

      const _first = (user.user_metadata?.first_name as string | undefined)?.trim() ?? ''
      const _last  = (user.user_metadata?.last_name  as string | undefined)?.trim() ?? ''
      const name   = [_first, _last].filter(Boolean).join(' ')
        || (user.user_metadata?.full_name as string | undefined)?.trim()
        || user.email
        || ''
      setUserName(name)
      setFirstName(_first)
      setLastName(_last)

      const [{ data: entries }, { data: domainContainers }, { state: domainState }] = await Promise.all([
        supabase
          .from('entries')
          .select('id, title, content, created_at, activity, document_type')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false }),
        supabase
          .from('containers')
          .select('id, title')
          .eq('type', 'domain')
          .order('title'),
        loadDomainState(supabase),
      ])

      const allEntries = entries ?? []
      const allDomains = domainContainers ?? []

      // Derive syncHasWill / syncHasEOL / careStatus from the JSONB-backed
      // domain_state (no longer from user_metadata).
      const willsDomain      = allDomains.find(d => d.title.toLowerCase().includes('will'))
      const healthcareDomain = allDomains.find(d => d.title.toLowerCase().includes('health'))
      const willVals = willsDomain      ? getCheckboxes(domainState, willsDomain.id,      'legal_will_in_place', 1) : [false]
      const eolVals  = healthcareDomain ? getCheckboxes(domainState, healthcareDomain.id, 'wishes_clear_shared', 2) : [false, false]
      const syncHasWill = willVals[0] === true
      const communicated = eolVals[0] === true
      const documented   = eolVals[1] === true
      const syncHasEOL  = communicated || documented
      const careStatus: string | null =
        communicated && documented ? 'both' :
        communicated ? 'communicated' :
        documented   ? 'documented'   : null

      const adminEntry     = allEntries.find(e => e.document_type === 'personal_admin_info')
      const contactsEntry  = allEntries.find(e => e.document_type === 'important_contacts')

      // Extract admin content for key details
      let willLocation: string | null = null
      let cdmName: string | null = null
      let cdmPhone: string | null = null
      let cdmEmail: string | null = null
      let cdmDocLoc: string | null = null
      if (adminEntry) {
        const c = adminEntry.content as Record<string, unknown>
        willLocation = (c?.willLocation as string | undefined)?.trim() || null
        cdmName = ((c?.careDecisionMaker1Name as string | undefined)?.trim() || (c?.careDecisionMaker1 as string | undefined)?.trim() || null)
        cdmPhone = (c?.careDecisionMaker1Phone as string | undefined)?.trim() || null
        cdmEmail = (c?.careDecisionMaker1Email as string | undefined)?.trim() || null
        cdmDocLoc = (c?.careDecisionMakerDocLocation as string | undefined)?.trim() || null
      }

      type ContactInfo = { name: string; institution: string; phone: string; email: string }
      let doctor: ContactInfo | null = null
      let lawyer: ContactInfo | null = null
      if (contactsEntry) {
        const c = contactsEntry.content as Record<string, unknown>
        const hcList = (c?.healthcare as Record<string, string>[] | undefined) ?? []
        const legalList = (c?.legal as Record<string, string>[] | undefined) ?? []
        const firstDoctor = hcList.find(d => d?.name?.trim())
        const firstLawyer = legalList.find(l => l?.name?.trim())
        if (firstDoctor) doctor = { name: firstDoctor.name?.trim() || '', institution: (firstDoctor.institution ?? '').trim(), phone: firstDoctor.phone?.trim() || '', email: firstDoctor.email?.trim() || '' }
        if (firstLawyer) lawyer = { name: firstLawyer.name?.trim() || '', institution: (firstLawyer.institution ?? '').trim(), phone: firstLawyer.phone?.trim() || '', email: firstLawyer.email?.trim() || '' }
      }

      // Resting place from domain_state (deathcare domain)
      const deathcareDomain = allDomains.find(d => d.title.toLowerCase().includes('death'))
      let restingDocumented = false
      let restingShared = false
      if (deathcareDomain) {
        const restVals = getCheckboxes(domainState, deathcareDomain.id, 'final_resting_place_wishes', 3)
        restingDocumented = restVals[0] === true
        restingShared     = restVals[1] === true
      }

      // Build key details
      const careLabel = syncHasEOL ? (
        careStatus === 'documented'   ? 'Formally documented' :
        careStatus === 'communicated' ? 'Communicated to decision maker' :
        careStatus === 'both'         ? 'Documented and communicated' :
        'Documented or communicated'
      ) : null

      const restingValue = (restingDocumented && restingShared) ? 'Documented and shared'
        : restingDocumented ? 'Documented'
        : restingShared     ? 'Shared with people in my life'
        : null

      const kd: PlanKeyDetail[] = [
        {
          label: 'Legal will',
          value: syncHasWill ? 'Documented' : null,
          details: willLocation ? [`Document location: ${willLocation}`] : [],
        },
        {
          label: 'Care preferences',
          value: careLabel,
          details: [],
        },
        {
          label: 'Final resting place',
          value: restingValue,
          details: [],
        },
        {
          label: 'Substitute decision maker',
          value: cdmName,
          details: [
            cdmPhone ? `Phone: ${cdmPhone}` : null,
            cdmEmail ? `Email: ${cdmEmail}` : null,
            cdmDocLoc ? `Document location: ${cdmDocLoc}` : null,
          ].filter((d): d is string => d !== null),
        },
        {
          label: 'Doctor',
          value: doctor?.name ?? null,
          details: [
            doctor?.institution ? doctor.institution : null,
            doctor?.phone ? `Phone: ${doctor.phone}` : null,
            doctor?.email ? `Email: ${doctor.email}` : null,
          ].filter((d): d is string => d !== null),
        },
        {
          label: 'Lawyer',
          value: lawyer?.name ?? null,
          details: [
            lawyer?.institution ? lawyer.institution : null,
            lawyer?.phone ? `Phone: ${lawyer.phone}` : null,
            lawyer?.email ? `Email: ${lawyer.email}` : null,
          ].filter((d): d is string => d !== null),
        },
      ]
      setKeyDetails(kd)

      // Build domain statuses from DOMAIN_SEGMENT_CONFIGS (canonical list of all 6 domains)
      // Match to DB domains where they exist; status comes from JSONB domain_state.
      const ds: PlanDomainStatus[] = DOMAIN_SEGMENT_CONFIGS.map(config => {
        const dbDomain = allDomains.find(d => d.title.toLowerCase().includes(config.match))

        // Topic-level engagement for qualitative status label
        const topicsStarted = config.segments.filter(seg => {
          if (!dbDomain) return false
          const status = seg.type === 'orient'
            ? getOrient(domainState, dbDomain.id, seg.key)
            : getReadyStatus(domainState, dbDomain.id, seg.key)
          return status === 'complete' || status === 'in_progress'
        }).length

        // Individual checkbox items for display
        const checkboxItems: PlanCheckboxItem[] = []
        for (const seg of config.segments) {
          if (seg.type !== 'ready' || !seg.checkboxes) continue
          const vals = dbDomain
            ? getCheckboxes(domainState, dbDomain.id, seg.key, seg.checkboxes.length)
            : seg.checkboxes.map(() => false)
          for (let i = 0; i < seg.checkboxes.length; i++) {
            checkboxItems.push({ label: seg.checkboxes[i], checked: vals[i] === true })
          }
        }

        return {
          title: dbDomain?.title ?? config.displayName,
          label: qualitativeLabel(topicsStarted, config.segments.length),
          topicsStarted,
          totalTopics: config.segments.length,
          checkboxItems,
        }
      })
      setDomainStatuses(ds)

      // Build materials list
      setMaterials(buildMaterials(allEntries, name))

      setLoading(false)
    }
    load()
  }, [])

  async function handleDownload(mode: 'summary' | 'full') {
    const setDownloading = mode === 'summary' ? setSummaryLoading : setFullLoading
    setDownloading(true)
    try {
      const { pdf } = await import('@react-pdf/renderer')
      const { default: PlanPDFDocument } = await import('@/lib/pdf/PlanPDFDocument')

      const today = new Date()
      const exportDate = today.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })
      const todayStr = today.toISOString().slice(0, 10)

      const planProps: PlanPDFProps = {
        userName,
        exportDate,
        keyDetails,
        domainStatuses,
        materials,
        mode,
      }

      const blob = await pdf(<PlanPDFDocument planProps={planProps} />).toBlob()
      fetch('/api/analytics/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventName: 'export_generated', metadata: { mode } }),
      }).catch(() => {})
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      const safeName = [firstName, lastName].filter(Boolean).join('-') || 'plan'
      a.download = mode === 'summary'
        ? `${safeName}-plan-summary-${todayStr}.pdf`
        : `${safeName}-full-plan-${todayStr}.pdf`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } finally {
      setDownloading(false)
    }
  }

  async function handleJsonDownload() {
    setJsonLoading(true)
    try {
      const res = await fetch('/api/plan/export-json', { credentials: 'same-origin' })
      if (!res.ok) {
        console.error('JSON export failed:', res.status)
        return
      }
      const blob = await res.blob()
      fetch('/api/analytics/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventName: 'export_generated', metadata: { mode: 'json' } }),
      }).catch(() => {})
      const todayStr = new Date().toISOString().slice(0, 10)
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `nightside-plan-${todayStr}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } finally {
      setJsonLoading(false)
    }
  }

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: '#F8F4EB', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ fontFamily: hv, fontSize: 14, color: 'rgba(19,4,38,0.45)' }}>Loading your plan…</p>
      </div>
    )
  }

  const today = new Date().toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })

  return (
    <div style={{ minHeight: '100vh', background: '#F8F4EB' }}>
      <div style={{ maxWidth: 860, margin: '0 auto', padding: '64px 24px 80px' }}>

        {/* Chrome */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 40 }}>
          <Link
            href="/app/plan"
            style={{ fontFamily: hv, fontSize: 13, color: 'rgba(19,4,38,0.65)', textDecoration: 'none' }}
          >
            ← Back to Plan
          </Link>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => handleDownload('summary')}
                disabled={summaryLoading}
                style={{
                  fontFamily: hv, fontSize: 13, fontWeight: 500,
                  color: summaryLoading ? '#999' : '#1A1A1A',
                  background: '#F5F5F5', border: '1px solid #DDDDDD',
                  borderRadius: 6, padding: '8px 16px',
                  cursor: summaryLoading ? 'default' : 'pointer',
                }}
              >
                {summaryLoading ? 'Generating…' : 'Download summary only (PDF)'}
              </button>
              <button
                type="button"
                onClick={() => handleDownload('full')}
                disabled={fullLoading}
                style={{
                  fontFamily: hv, fontSize: 13, fontWeight: 500,
                  color: fullLoading ? '#999' : '#FFFFFF',
                  background: fullLoading ? '#888' : '#130426',
                  border: '1px solid #130426',
                  borderRadius: 6, padding: '8px 16px',
                  cursor: fullLoading ? 'default' : 'pointer',
                }}
              >
                {fullLoading ? 'Generating…' : `Download full plan (${materials.length} material${materials.length !== 1 ? 's' : ''}) (PDF)`}
              </button>
              <button
                type="button"
                onClick={handleJsonDownload}
                disabled={jsonLoading}
                title="A structured data file of your plan, for technical use or for keeping a complete record."
                style={{
                  fontFamily: hv, fontSize: 13, fontWeight: 500,
                  color: jsonLoading ? '#999' : '#130426',
                  background: jsonLoading ? '#E8E2F8' : '#DBD2F6',
                  border: '1px solid #BBABF4',
                  borderRadius: 6, padding: '8px 16px',
                  cursor: jsonLoading ? 'default' : 'pointer',
                }}
              >
                {jsonLoading ? 'Generating…' : 'Download JSON'}
              </button>
            </div>
            <p
              style={{
                fontFamily: hv,
                fontSize: 12,
                fontStyle: 'italic',
                color: 'rgba(19,4,38,0.6)',
                margin: 0,
                maxWidth: 360,
                textAlign: 'right',
                lineHeight: 1.5,
              }}
            >
              JSON: a structured data file of your plan, for technical use or for keeping a complete record.
            </p>
          </div>
        </div>

        {/* Summary preview card */}
        <div style={{
          background: '#FFFFFF',
          border: '1px solid rgba(19,4,38,0.10)',
          borderRadius: 12,
          padding: '40px 48px',
          marginBottom: 40,
          boxShadow: '0 2px 16px rgba(0,0,0,0.06)',
        }}>

          {/* Preview header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/The-Nightside-Wordmark-Black.svg" alt="Nightside" style={{ height: 20 }} />
            <span style={{ fontFamily: hv, fontSize: 12, color: 'rgba(19,4,38,0.4)' }}>{userName}</span>
          </div>
          <div style={{ height: 1, background: 'rgba(0,0,0,0.10)', marginBottom: 24 }} />

          <h1 style={{ fontFamily: apf, fontSize: 32, fontWeight: 400, color: '#1A1A1A', margin: '0 0 4px' }}>Your Plan</h1>
          <p style={{ fontFamily: hv, fontSize: 13, color: '#999999', margin: '0 0 32px' }}>{userName} · {today}</p>

          {/* Summary page label */}
          <p style={{ fontFamily: apf, fontSize: 22, fontWeight: 400, color: '#130426', margin: '0 0 20px' }}>Summary</p>

          {/* Key Details */}
          <SummarySection title="Key Details">
            {keyDetails.map((row, i) => (
              <div key={i} style={{ paddingBottom: 8, marginBottom: 8, borderBottom: i < keyDetails.length - 1 ? '1px solid rgba(0,0,0,0.06)' : 'none' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                  <span style={{ fontFamily: hv, fontSize: 13, color: '#555555' }}>{row.label}</span>
                  <span style={{ fontFamily: hv, fontSize: 13, color: row.value ? '#1A1A1A' : '#CCCCCC', fontStyle: row.value ? 'normal' : 'italic' }}>
                    {row.value ?? 'Not recorded'}
                  </span>
                </div>
                {row.details?.map((d, j) => (
                  <p key={j} style={{ fontFamily: hv, fontSize: 11.5, color: '#999999', margin: '2px 0 0 12px' }}>{d}</p>
                ))}
              </div>
            ))}
          </SummarySection>

          {/* Planning Status */}
          {(() => {
            // Already ordered by DOMAIN_SEGMENT_CONFIGS (DOMAIN_DISPLAY_ORDER) — no re-sort needed
            return (
              <SummarySection title="Practical Readiness">
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px 24px', alignItems: 'start' }}>
                  {domainStatuses.map((domain, i) => (
                    <div key={i}>
                      <p style={{ fontFamily: hv, fontSize: 13, fontWeight: 600, color: '#130426', margin: '0 0 4px' }}>{domain.title}</p>
                      <p style={{ fontFamily: hv, fontSize: 12, color: 'rgba(19,4,38,0.65)', margin: '0 0 8px' }}>{domain.label}</p>
                      {domain.topicsStarted > 0 && [...domain.checkboxItems].sort((a, b) => (a.checked === b.checked ? 0 : a.checked ? -1 : 1)).map((item, j) => (
                        <div key={j} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '3px 0' }}>
                          {item.checked ? (
                            <div style={{ width: 13, height: 13, background: '#2C3777', borderRadius: 3, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              <svg width="8" height="6" viewBox="0 0 8 6" fill="none">
                                <path d="M1 3L3 5L7 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                              </svg>
                            </div>
                          ) : (
                            <div style={{ width: 13, height: 13, border: '1.5px solid rgba(19,4,38,0.25)', borderRadius: 3, flexShrink: 0 }} />
                          )}
                          <span style={{ fontFamily: hv, fontSize: 12, color: item.checked ? '#130426' : 'rgba(19,4,38,0.65)' }}>
                            {item.label}
                          </span>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              </SummarySection>
            )
          })()}

          {/* What's included */}
          {(() => {
            const includedTitles = new Set(materials.map(m => m.title))
            const includedCount = includedTitles.size
            const totalCount = ALL_POSSIBLE_MATERIAL_TITLES.length
            return (
              <SummarySection title={`What's included (${includedCount} of ${totalCount} materials)`}>
                {[...ALL_POSSIBLE_MATERIAL_TITLES].sort((a, b) => {
                  const aIn = includedTitles.has(a) ? 0 : 1
                  const bIn = includedTitles.has(b) ? 0 : 1
                  return aIn - bIn
                }).map((title, i) => {
                  const included = includedTitles.has(title)
                  return (
                    <div key={i} style={{ display: 'flex', gap: 9, alignItems: 'center', marginBottom: 7 }}>
                      {included ? (
                        <div style={{ width: 13, height: 13, background: '#130426', borderRadius: 3, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <svg width="8" height="6" viewBox="0 0 8 6" fill="none">
                            <path d="M1 3L3 5L7 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        </div>
                      ) : (
                        <div style={{ width: 13, height: 13, border: '1.5px solid #CCCCCC', borderRadius: 3, flexShrink: 0 }} />
                      )}
                      <span style={{ fontFamily: hv, fontSize: 13, color: '#1A1A1A' }}>
                        {title}
                      </span>
                      {!included && (
                        <span style={{ fontFamily: hv, fontSize: 13, color: '#999999', fontStyle: 'italic' }}>
                          — Not yet started
                        </span>
                      )}
                    </div>
                  )
                })}
              </SummarySection>
            )
          })()}

          {/* Footer */}
          <div style={{ marginTop: 32, paddingTop: 16, borderTop: '1px solid rgba(0,0,0,0.08)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontFamily: hv, fontSize: 11, color: '#BBBBBB' }}>Generated from Nightside Planning Studio</span>
            <span style={{ fontFamily: hv, fontSize: 11, color: '#CCCCCC' }}>p. 1</span>
          </div>
        </div>


      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Small sub-components
// ---------------------------------------------------------------------------

function SummarySection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 28 }}>
      <p style={{ fontFamily: hv, fontSize: 10, fontWeight: 600, letterSpacing: '0.07em', color: '#AAAAAA', textTransform: 'uppercase', margin: '0 0 8px' }}>
        {title}
      </p>
      <div style={{ height: 1, background: 'rgba(0,0,0,0.08)', marginBottom: 12 }} />
      {children}
    </div>
  )
}
