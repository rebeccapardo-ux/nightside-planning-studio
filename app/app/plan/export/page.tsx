'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createSupabaseBrowserClient } from '@/lib/supabase-browser'
import { loadDomainState } from '@/lib/domain-state'
import { buildMaterials, buildKeyDetails, buildDomainStatuses } from '@/lib/pdf/buildPlanData'
import type { PlanKeyDetail, PlanDomainStatus, PlanMaterial, PlanPDFProps } from '@/lib/pdf/PlanPDFDocument'

const hv = "'Helvetica Neue', Helvetica, Arial, sans-serif"
const apf = "'Apfel Grotezk', sans-serif"

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
  const [exportError, setExportError]         = useState<string | null>(null)

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
          .select('id, title, domain_code')
          .eq('type', 'domain')
          .order('title'),
        loadDomainState(supabase),
      ])

      const allEntries = entries ?? []
      const allDomains = domainContainers ?? []

      setKeyDetails(buildKeyDetails(domainState, allDomains, allEntries))
      setDomainStatuses(buildDomainStatuses(domainState, allDomains))

      // Build materials list
      setMaterials(buildMaterials(allEntries, name))

      setLoading(false)
    }
    load()
  }, [])

  async function handleDownload(mode: 'summary' | 'full') {
    const setDownloading = mode === 'summary' ? setSummaryLoading : setFullLoading
    setDownloading(true)
    setExportError(null)
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
      // Full PDF is a full plan export → notify primary + recovery (fire-and-forget;
      // the PDF is client-side so the server otherwise never sees it). Summary is a
      // lighter artifact and does not notify.
      if (mode === 'full') {
        fetch('/api/plan/export-recorded', { method: 'POST' }).catch(() => {})
      }
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
    } catch (e) {
      console.error('PDF export error:', e)
      setExportError("Couldn't generate your export. Please try again.")
    } finally {
      setDownloading(false)
    }
  }

  async function handleJsonDownload() {
    setJsonLoading(true)
    setExportError(null)
    try {
      const res = await fetch('/api/plan/export-json', { credentials: 'same-origin' })
      if (!res.ok) {
        console.error('JSON export failed:', res.status)
        setExportError("Couldn't generate your export. Please try again.")
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
    } catch (e) {
      console.error('JSON export error:', e)
      setExportError("Couldn't generate your export. Please try again.")
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
            {exportError && (
              <p style={{ fontFamily: hv, fontSize: 12, color: 'rgba(219,88,53,0.9)', margin: 0, textAlign: 'right' }}>
                {exportError}
              </p>
            )}
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
            // Already ordered by DOMAIN_STRUCTURES (DOMAIN_DISPLAY_ORDER) — no re-sort needed
            return (
              <SummarySection title="Practical Readiness">
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px 24px', alignItems: 'start' }}>
                  {domainStatuses.map((domain, i) => (
                    <div key={i}>
                      <p style={{ fontFamily: hv, fontSize: 13, fontWeight: 600, color: '#130426', margin: '0 0 4px' }}>{domain.title}</p>
                      <p style={{ fontFamily: hv, fontSize: 12, color: 'rgba(19,4,38,0.65)', margin: '0 0 8px' }}>{domain.label}</p>
                      {domain.topicsStarted > 0 && domain.readinessGroups.map((group, gi) => (
                        <div key={gi} style={{ marginTop: 6 }}>
                          <p style={{ fontFamily: hv, fontSize: 12, fontWeight: 600, color: 'rgba(19,4,38,0.7)', margin: '0 0 3px' }}>{group.title}</p>
                          {group.items.map((item, j) => (
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
