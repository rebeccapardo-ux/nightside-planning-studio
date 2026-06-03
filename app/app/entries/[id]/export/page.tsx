import { notFound } from 'next/navigation'
import { ACTIVITY, isStructuredActivity, DOCUMENT_TYPE_META, DOCUMENT_TYPE } from '@/lib/content-metadata'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import DownloadPDFButton from './DownloadPDFButton'
import FinancialExportClient from './FinancialExportClient'
import PersonalAdminExportClient from './PersonalAdminExportClient'
import DevicesAccountsExportClient from './DevicesAccountsExportClient'
import type { PDFData, PDFContactEntry } from '@/lib/pdf/types'

const hv = "'Helvetica Neue', Helvetica, Arial, sans-serif"
const apfel = "'Apfel Grotezk', sans-serif"

type ExportPageProps = {
  params: Promise<{ id: string }>
}

type EntryRow = {
  id: string
  title: string | null
  content: unknown
  created_at: string | null
  activity: string | null
  document_type: string | null
}

type RankingContent = {
  essential: string[]
  important: string[]
  less_central: string[]
  reflection?: string
}

type LegacyMoment = { id: string; title: string; note: string; xPercent: number }
type LegacyMapContent = {
  moments: LegacyMoment[]
  themes: string
  surprises: string
  valuesToPassOn: string
  legacyProjects: string
}

type ContactFields = { name: string; phone: string; email: string; address: string }
type NewContact = { id: string; name: string; role: string; phone: string; email: string; address: string }
type KeepsakeItem = { id: string; object: string; recipient: string; meaning: string }

// ---------------------------------------------------------------------------
// Legacy Map path geometry
// ---------------------------------------------------------------------------

const LM_VB_W = 1000
const LM_VB_H = 200
const LM_MID_Y = 100
const LM_AMP_Y = 50

function lmPathPoint(xPct: number): { x: number; y: number } {
  const t = (Math.min(Math.max(xPct, 5), 95) - 5) / 90
  return { x: 50 + t * 900, y: LM_MID_Y + LM_AMP_Y * Math.sin(t * 2 * Math.PI) }
}

const LM_PATH_D = (() => {
  const pts: string[] = []
  for (let i = 0; i <= 300; i++) {
    const t = i / 300
    pts.push(`${(50 + t * 900).toFixed(1)},${(LM_MID_Y + LM_AMP_Y * Math.sin(t * 2 * Math.PI)).toFixed(1)}`)
  }
  return `M ${pts.join(' L ')}`
})()

// New geometry for landscape export preview (viewBox 0 0 460 200)
const LM_NEW_MID_Y = 80
const LM_NEW_AMP_Y = 45

function lmNewPoint(xPct: number): { x: number; y: number } {
  const t = Math.max(0, Math.min(1, xPct / 100))
  return { x: 16 + t * 428, y: LM_NEW_MID_Y + LM_NEW_AMP_Y * Math.sin(t * 2 * Math.PI) }
}

const LM_NEW_PATH_D = (() => {
  const pts: string[] = []
  for (let i = 0; i <= 300; i++) {
    const t = i / 300
    pts.push(`${(16 + t * 428).toFixed(1)},${(LM_NEW_MID_Y + LM_NEW_AMP_Y * Math.sin(t * 2 * Math.PI)).toFixed(1)}`)
  }
  return `M ${pts.join(' L ')}`
})()

function lmWrapTitle(title: string, maxCharsPerLine: number): string[] {
  const words = title.split(' ')
  const lines: string[] = []
  let current = ''
  for (const word of words) {
    const test = current ? `${current} ${word}` : word
    if (test.length > maxCharsPerLine && current) {
      lines.push(current)
      current = word
    } else {
      current = test
    }
  }
  if (current) lines.push(current)
  return lines
}

function lmCircleColor(i: number, total: number): string {
  if (total <= 1) return '#F29836'
  if (i < total / 3) return '#BBABF4'
  if (i < (2 * total) / 3) return '#F29836'
  return '#DB5835'
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default async function ExportPage({ params }: ExportPageProps) {
  const { id } = await params
  const supabase = await createSupabaseServerClient()

  const { data: { user } } = await supabase.auth.getUser()
  // proxy.ts middleware enforces auth on /app/*; this branch is unreachable.
  // The throw preserves type narrowing for user.id / user.user_metadata below.
  // (notFound() is still used legitimately further down for missing-entry cases.)
  if (!user) throw new Error('Unreachable: auth middleware bypassed on /app/entries/[id]/export')

  const _firstName = (user.user_metadata?.first_name as string | undefined)?.trim() ?? ''
  const _lastName  = (user.user_metadata?.last_name  as string | undefined)?.trim() ?? ''
  const userName   = [_firstName, _lastName].filter(Boolean).join(' ')
    || (user.user_metadata?.full_name as string | undefined)?.trim()
    || user.email
    || ''

  const { data: entry, error } = await supabase
    .from('entries')
    .select('id, title, content, created_at, activity, document_type')
    .eq('id', id)
    .eq('user_id', user.id)
    .single<EntryRow>()

  if (error || !entry) notFound()

  const isActivity = isStructuredActivity(entry.activity)
  const isDocument = !!entry.document_type
  if (!isActivity && !isDocument) notFound()

  const createdDate = formatDate(entry.created_at)
  const displayTitle = getDisplayTitle(entry)
  const filename = getExportFilename(entry)

  if (entry.activity === ACTIVITY.LEGACY_MAP) {
    const mapContent = getLegacyMapContent(entry)
    if (!mapContent) notFound()
    const monthYear = entry.created_at
      ? new Date(entry.created_at).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })
      : new Date().toLocaleDateString(undefined, { month: 'long', year: 'numeric' })
    const pdfData: PDFData = {
      kind: 'legacy_map',
      displayTitle,
      createdDate,
      filename,
      moments: mapContent.moments.map(m => ({ title: m.title, note: m.note || undefined, xPercent: m.xPercent })),
      themes: mapContent.themes || undefined,
      surprises: mapContent.surprises || undefined,
      valuesToPassOn: mapContent.valuesToPassOn || undefined,
      legacyProjects: mapContent.legacyProjects || undefined,
      intro: LEGACY_MAP_INTRO,
      userName,
      monthYear,
    }
    return <LegacyMapExportPage id={id} mapContent={mapContent} createdDate={createdDate} displayTitle={displayTitle} userName={userName} monthYear={monthYear} pdfData={pdfData} />
  }

  if (entry.activity === ACTIVITY.VALUES_RANKING) {
    const ranking = getRankingContent(entry)
    if (!ranking) notFound()
    const pdfData: PDFData = {
      kind: 'values_ranking',
      displayTitle,
      createdDate,
      filename,
      groups: [
        { label: 'ESSENTIAL',      items: ranking.essential },
        { label: 'IMPORTANT',      items: ranking.important },
        { label: 'LESS IMPORTANT', items: ranking.less_central },
      ].filter(g => g.items.length > 0),
      reflection: ranking.reflection,
      intro: VALUES_INTRO,
      userName,
    }
    return <ValuesRankingExportPage id={id} ranking={ranking} createdDate={createdDate} pdfData={pdfData} userName={userName} />
  }

  if (entry.activity === ACTIVITY.FEARS_RANKING) {
    const ranking = getRankingContent(entry)
    if (!ranking) notFound()
    const pdfData: PDFData = {
      kind: 'fears_ranking',
      displayTitle,
      createdDate,
      filename,
      groups: [
        { label: 'MOST PRESSING',      items: ranking.essential },
        { label: 'SOMEWHAT PRESSING',  items: ranking.important },
        { label: 'LESS PRESSING',      items: ranking.less_central },
      ].filter(g => g.items.length > 0),
      reflection: ranking.reflection,
      intro: FEARS_INTRO,
      userName,
    }
    return <FearsRankingExportPage id={id} ranking={ranking} createdDate={createdDate} pdfData={pdfData} userName={userName} />
  }

  return <DocumentExportPage id={id} entry={entry} createdDate={createdDate} displayTitle={displayTitle} filename={filename} userName={userName} />
}

const VALUES_INTRO = 'This document captures how you sorted and reflected on different personal values in relation to care, identity, and what matters most to you.'

const FEARS_INTRO = 'This document reflects how different fears and concerns felt to you at a particular moment in time.'

const LEGACY_MAP_INTRO = 'This document maps meaningful moments and reflections from across your life.'

// ---------------------------------------------------------------------------
// Shared chrome
// ---------------------------------------------------------------------------

const PRINT_STYLES = `
  @media print {
    nav, .no-print { display: none !important; }
    body { background: white !important; }
    @page { size: A4; margin: 40px; }
  }
`

const PRINT_STYLES_LANDSCAPE = `
  @media print {
    nav, .no-print { display: none !important; }
    body { background: white !important; }
    @page { size: A4 landscape; margin: 0; }
  }
`

function ExportHeader({ title, userName }: { title: string; userName?: string }) {
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/The-Nightside-Wordmark-Black.svg" alt="Nightside" style={{ height: 22 }} />
        {userName && (
          <span style={{ fontFamily: hv, fontSize: 13, fontWeight: 400, color: 'rgba(19,4,38,0.65)' }}>{userName}</span>
        )}
      </div>
      <div style={{ height: 1, background: 'rgba(0,0,0,0.14)', marginBottom: 16 }} />
    </div>
  )
}

function ExportFooter() {
  return (
    <div style={{ marginTop: 48, paddingTop: 20, borderTop: '1px solid rgba(0,0,0,0.12)', textAlign: 'center' as const }}>
      <p style={{ fontFamily: hv, fontSize: 11, color: '#6B6B6B', lineHeight: 1.5 }}>
        This document was generated from your materials in Nightside Planning Studio.
      </p>
    </div>
  )
}

function BackAndExport({ id, pdfData }: { id: string; pdfData: PDFData }) {
  return (
    <div className="no-print" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 }}>
      <a href={`/app/entries/${id}`} style={{ fontFamily: hv, fontSize: 13, color: '#6B6B6B', textDecoration: 'none' }}>
        ← Back
      </a>
      <DownloadPDFButton data={pdfData} />
    </div>
  )
}

// ---------------------------------------------------------------------------
// Values Ranking export
// ---------------------------------------------------------------------------

function ValuesRankingExportPage({ id, ranking, createdDate, pdfData, userName }: {
  id: string
  ranking: RankingContent
  createdDate: string | null
  pdfData: PDFData
  userName?: string
}) {
  const groups = [
    { key: 'essential' as const, label: 'ESSENTIAL',      items: ranking.essential },
    { key: 'important' as const, label: 'IMPORTANT',      items: ranking.important },
    { key: 'less',               label: 'LESS IMPORTANT', items: ranking.less_central },
  ].filter(g => g.items.length > 0)

  return (
    <>
      <style>{PRINT_STYLES}</style>
      <div className="bg-white min-h-screen">
        <div style={{ maxWidth: 640, margin: '0 auto', padding: '48px 40px' }}>
          <BackAndExport id={id} pdfData={pdfData} />
          <ExportHeader title="Values Ranking" userName={userName} />

          <div style={{ marginBottom: 16 }}>
            <h1 style={{ fontFamily: apfel, fontSize: 28, fontWeight: 400, color: '#1A1A1A', marginBottom: 6 }}>Values Ranking</h1>
            {createdDate && (
              <p style={{ fontFamily: hv, fontSize: 12, color: '#6B6B6B' }}>Generated {createdDate}</p>
            )}
            <p style={{ fontFamily: hv, fontSize: 12, color: '#6B6B6B', marginTop: 6, lineHeight: 1.5 }}>
              This is a generated record of your responses. It is not a legal document.
            </p>
          </div>
          <p style={{ fontFamily: hv, fontSize: 13, color: '#3A3A3A', lineHeight: 1.65, marginBottom: 20 }}>
            {VALUES_INTRO}
          </p>
          <div style={{ height: 1, background: 'rgba(0,0,0,0.14)', marginBottom: 24 }} />

          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {groups.map(({ key, label, items }) => (
              <div key={key} style={{ background: '#F5F5F5', borderRadius: 6, padding: 16 }}>
                <p style={{ fontFamily: hv, fontSize: 12, fontWeight: 500, letterSpacing: '0.08em', color: '#444444', textTransform: 'uppercase' as const, marginBottom: 10 }}>
                  {label}
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                  {items.map((item) => (
                    <div key={item} style={{ background: '#FFFFFF', border: '1px solid #CCCCCC', borderRadius: 4, padding: '10px 12px', minHeight: 60, fontFamily: hv, fontSize: 13, color: '#1A1A1A', lineHeight: 1.5 }}>
                      {item}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {ranking.reflection?.trim() && (
            <div style={{ marginTop: 28, paddingTop: 20, borderTop: '1px solid rgba(0,0,0,0.10)' }}>
              <p style={{ fontFamily: hv, fontSize: 10, fontWeight: 500, letterSpacing: '0.08em', color: '#6B6B6B', textTransform: 'uppercase' as const, marginBottom: 8 }}>
                Reflection note
              </p>
              <p style={{ fontFamily: hv, fontSize: 13, color: '#1A1A1A', lineHeight: 1.55, whiteSpace: 'pre-wrap' }}>
                {ranking.reflection.trim()}
              </p>
            </div>
          )}

          <ExportFooter />
        </div>
      </div>
    </>
  )
}

// ---------------------------------------------------------------------------
// Fears Ranking export
// ---------------------------------------------------------------------------

function FearsRankingExportPage({ id, ranking, createdDate, pdfData, userName }: {
  id: string
  ranking: RankingContent
  createdDate: string | null
  pdfData: PDFData
  userName?: string
}) {
  const groups = [
    { key: 'essential' as const, label: 'MOST PRESSING',     items: ranking.essential },
    { key: 'important' as const, label: 'SOMEWHAT PRESSING', items: ranking.important },
    { key: 'less',               label: 'LESS PRESSING',     items: ranking.less_central },
  ].filter(g => g.items.length > 0)

  return (
    <>
      <style>{PRINT_STYLES}</style>
      <div className="bg-white min-h-screen">
        <div style={{ maxWidth: 640, margin: '0 auto', padding: '48px 40px' }}>
          <BackAndExport id={id} pdfData={pdfData} />
          <ExportHeader title="Fears Ranking" userName={userName} />

          <div style={{ marginBottom: 16 }}>
            <h1 style={{ fontFamily: apfel, fontSize: 28, fontWeight: 400, color: '#1A1A1A', marginBottom: 6 }}>Fears Ranking</h1>
            {createdDate && (
              <p style={{ fontFamily: hv, fontSize: 12, color: '#6B6B6B' }}>Generated {createdDate}</p>
            )}
            <p style={{ fontFamily: hv, fontSize: 12, color: '#6B6B6B', marginTop: 6, lineHeight: 1.5 }}>
              This is a generated record of your responses. It is not a legal document.
            </p>
          </div>
          <p style={{ fontFamily: hv, fontSize: 13, color: '#3A3A3A', lineHeight: 1.65, marginBottom: 20 }}>
            {FEARS_INTRO}
          </p>
          <div style={{ height: 1, background: 'rgba(0,0,0,0.14)', marginBottom: 24 }} />

          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {groups.map(({ key, label, items }) => (
              <div key={key} style={{ background: '#F5F5F5', borderRadius: 6, padding: 16 }}>
                <p style={{ fontFamily: hv, fontSize: 12, fontWeight: 500, letterSpacing: '0.08em', color: '#444444', textTransform: 'uppercase' as const, marginBottom: 10 }}>
                  {label}
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                  {items.map((item) => (
                    <div key={item} style={{ background: '#FFFFFF', border: '1px solid #CCCCCC', borderRadius: 4, padding: '10px 12px', minHeight: 60, fontFamily: hv, fontSize: 13, color: '#1A1A1A', lineHeight: 1.5 }}>
                      {item}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {ranking.reflection?.trim() && (
            <div style={{ marginTop: 28, paddingTop: 20, borderTop: '1px solid rgba(0,0,0,0.10)' }}>
              <p style={{ fontFamily: hv, fontSize: 10, fontWeight: 500, letterSpacing: '0.08em', color: '#6B6B6B', textTransform: 'uppercase' as const, marginBottom: 8 }}>
                Reflection note
              </p>
              <p style={{ fontFamily: hv, fontSize: 13, color: '#1A1A1A', lineHeight: 1.55, whiteSpace: 'pre-wrap' }}>
                {ranking.reflection.trim()}
              </p>
            </div>
          )}

          <ExportFooter />
        </div>
      </div>
    </>
  )
}

// ---------------------------------------------------------------------------
// Legacy Map export
// ---------------------------------------------------------------------------

function LegacyMapExportPage({ id, mapContent, createdDate, displayTitle, userName, monthYear, pdfData }: {
  id: string
  mapContent: LegacyMapContent
  createdDate: string | null
  displayTitle: string
  userName: string
  monthYear: string
  pdfData: PDFData
}) {
  const sorted = [...mapContent.moments].sort((a, b) => a.xPercent - b.xPercent)
  const n = sorted.length
  const reflection = mapContent.legacyProjects

  return (
    <>
      <style>{PRINT_STYLES_LANDSCAPE}</style>
      <div style={{ background: '#ffffff', minHeight: '100vh', padding: '40px 24px', display: 'flex', flexDirection: 'column' as const, alignItems: 'center' }}>
        {/* Back + Download — no-print */}
        <div className="no-print" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, width: '100%', maxWidth: 1000 }}>
          <a href={`/app/entries/${id}`} style={{ fontFamily: hv, fontSize: 13, color: '#6B6B6B', textDecoration: 'none' }}>← Back</a>
          <DownloadPDFButton data={pdfData} />
        </div>

        {/* Landscape document card */}
        <div
          style={{
            background: '#ffffff',
            aspectRatio: '1.414 / 1',
            maxWidth: 1000,
            width: '100%',
            padding: '40px 48px',
            fontFamily: hv,
            boxSizing: 'border-box' as const,
            display: 'flex',
            flexDirection: 'column' as const,
            boxShadow: '0 4px 24px rgba(0,0,0,0.10)',
          }}
        >
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', borderBottom: '1.5px solid #2C3777', paddingBottom: 14, marginBottom: 18, flexShrink: 0 }}>
            <span style={{ fontSize: 24, fontWeight: 300, color: '#130426' }}>{userName || 'Your Legacy Map'}</span>
            <div style={{ textAlign: 'right' as const }}>
              <div style={{ fontSize: 12, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase' as const, color: '#F29836' }}>Legacy Map</div>
            </div>
          </div>

          {/* Body grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 160px', gap: 28, alignItems: 'start', flex: 1, minHeight: 0 }}>
            {/* Left column */}
            <div style={{ display: 'flex', flexDirection: 'column' as const }}>
              {/* Map SVG */}
              {n > 0 && (
                <svg viewBox="0 0 460 200" style={{ width: '100%', display: 'block', overflow: 'visible' }} aria-hidden="true">
                  <defs>
                    <linearGradient id="lm-export-grad" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#BBABF4" />
                      <stop offset="50%" stopColor="#F29836" />
                      <stop offset="100%" stopColor="#DB5835" />
                    </linearGradient>
                  </defs>
                  <text x="16" y="175" fontSize="9" fill="rgba(19,4,38,0.65)">Birth</text>
                  <text x="444" y="175" fontSize="9" fill="rgba(19,4,38,0.65)" textAnchor="end">Now</text>
                  <path d={LM_NEW_PATH_D} fill="none" stroke="url(#lm-export-grad)" strokeWidth="2.5" strokeLinecap="round" />
                  {sorted.map((m, i) => {
                    const pt = lmNewPoint(m.xPercent)
                    const color = lmCircleColor(i, n)
                    const labelW = Math.min(Math.max(m.title.length * 4 + 12, 28), 130)
                    const charsPerLine = Math.floor((labelW - 8) / 4.2)
                    const lines = lmWrapTitle(m.title, charsPerLine)
                    const lineH = 9
                    const rectH = lines.length * lineH + 4
                    const isUpper = pt.y < LM_NEW_MID_Y
                    const labelX = Math.min(Math.max(pt.x - labelW / 2, 8), 444 - labelW)
                    const labelY = isUpper ? pt.y + 14 : pt.y - (rectH + 4)
                    return (
                      <g key={m.id}>
                        <circle cx={pt.x} cy={pt.y} r={10} fill="#ffffff" stroke={color} strokeWidth="1.5" />
                        <text x={pt.x} y={pt.y + 3.5} fontSize="10" fontWeight="600" fill="#2C3777" textAnchor="middle">{i + 1}</text>
                        <rect x={labelX} y={labelY} width={labelW} height={rectH} rx={3} fill="#f8f4eb" />
                        <text x={labelX + labelW / 2} y={labelY + 9} fontSize="7.5" fill="#130426" textAnchor="middle">
                          {lines.map((line, li) => (
                            <tspan key={li} x={labelX + labelW / 2} dy={li === 0 ? 0 : lineH}>{line}</tspan>
                          ))}
                        </text>
                      </g>
                    )
                  })}
                </svg>
              )}
              {n === 0 && <p style={{ fontFamily: hv, fontSize: 13, color: '#6B6B6B' }}>No moments added yet.</p>}

              {/* Reflections */}
              {reflection?.trim() && (
                <div style={{ borderTop: '0.5px solid #e8e4d8', paddingTop: 14, marginTop: 16 }}>
                  <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase' as const, color: '#7B6FC0', marginBottom: 8 }}>Reflections</div>
                  <div style={{ fontSize: 11, fontStyle: 'italic', color: '#130426', lineHeight: 1.7 }}>{reflection}</div>
                </div>
              )}
            </div>

            {/* Right column — notes */}
            <div style={{ borderLeft: '1px solid #e8e4d8', paddingLeft: 20 }}>
              <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase' as const, color: '#7B6FC0', marginBottom: 12 }}>Moments</div>
              {sorted.some(m => m.note?.trim()) ? sorted.map((m, i) =>
                m.note?.trim() ? (
                  <div key={m.id} style={{ marginBottom: 12 }}>
                    <div style={{ fontSize: 11, fontWeight: 600, color: '#2C3777', marginBottom: 2 }}>{i + 1} · {m.title}</div>
                    <div style={{ fontSize: 10, color: 'rgba(19,4,38,0.65)', lineHeight: 1.5 }}>{m.note}</div>
                  </div>
                ) : null
              ) : (
                <div style={{ fontSize: 12, color: 'rgba(19,4,38,0.65)', fontStyle: 'italic' }}>No notes added.</div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div style={{ borderTop: '0.5px solid #e8e4d8', paddingTop: 10, marginTop: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/The-Nightside-Wordmark-Black.svg" alt="Nightside" style={{ height: 14, filter: 'brightness(0) saturate(100%) invert(5%) sepia(60%) saturate(2000%) hue-rotate(240deg) brightness(40%)' }} />
            <span style={{ fontSize: 10, color: 'rgba(19,4,38,0.65)' }}>Generated {monthYear}</span>
          </div>
        </div>
      </div>
    </>
  )
}

// ---------------------------------------------------------------------------
// Document export router
// ---------------------------------------------------------------------------

function DocumentExportPage({ id, entry, createdDate, displayTitle, filename, userName }: {
  id: string
  entry: EntryRow
  createdDate: string | null
  displayTitle: string
  filename: string
  userName?: string
}) {
  if (entry.document_type === DOCUMENT_TYPE.IMPORTANT_CONTACTS) {
    return <ImportantContactsExportPage id={id} entry={entry} createdDate={createdDate} displayTitle={displayTitle} filename={filename} userName={userName} />
  }
  if (entry.document_type === DOCUMENT_TYPE.KEEPSAKE_INVENTORY) {
    return <KeepsakeInventoryExportPage id={id} entry={entry} createdDate={createdDate} displayTitle={displayTitle} filename={filename} userName={userName} />
  }
  if (entry.document_type === DOCUMENT_TYPE.FINANCIAL_INFORMATION) {
    return <FinancialExportClient id={id} content={entry.content} createdDate={createdDate} displayTitle={displayTitle} filename={filename} userName={userName} />
  }
  if (entry.document_type === DOCUMENT_TYPE.PERSONAL_ADMIN_INFO) {
    return <PersonalAdminExportClient id={id} content={entry.content} createdDate={createdDate} displayTitle={displayTitle} filename={filename} userName={userName} />
  }
  if (entry.document_type === DOCUMENT_TYPE.DEVICES_AND_ACCOUNTS) {
    return <DevicesAccountsExportClient id={id} content={entry.content} createdDate={createdDate} displayTitle={displayTitle} filename={filename} userName={userName} />
  }
  if (entry.document_type === DOCUMENT_TYPE.ADVANCE_DIRECTIVE_SUPPLEMENT) {
    return <AdvanceDirectiveExportPage id={id} entry={entry} createdDate={createdDate} displayTitle={displayTitle} filename={filename} userName={userName} />
  }
  if (entry.document_type === DOCUMENT_TYPE.FUNERAL_WISHES) {
    return <FuneralWishesExportPage id={id} entry={entry} createdDate={createdDate} displayTitle={displayTitle} filename={filename} userName={userName} />
  }
  return <GenericDocumentExportPage id={id} entry={entry} createdDate={createdDate} displayTitle={displayTitle} filename={filename} userName={userName} />
}

// ---------------------------------------------------------------------------
// Advance Directive / Your Wishes
// ---------------------------------------------------------------------------

const AD_FIELDS: { key: string; label: string }[] = [
  { key: 'perfectDeath', label: 'My perfect death would involve:' },
  { key: 'whatMatters',  label: 'At the end of my life, this is what matters most:' },
  { key: 'values',       label: 'My most important personal values:' },
  { key: 'unacceptable', label: 'What would make prolonging life unacceptable for me:' },
  { key: 'worries',      label: 'When I think about death, this is what I worry about:' },
  { key: 'caregiver',    label: 'What I want my caregiver/care team to know:' },
]

function AdvanceDirectiveExportPage({ id, entry, createdDate, displayTitle, filename, userName }: {
  id: string
  entry: EntryRow
  createdDate: string | null
  displayTitle: string
  filename: string
  userName?: string
}) {
  const c = (entry.content && typeof entry.content === 'object' ? entry.content : {}) as Record<string, string | undefined>
  const fields = AD_FIELDS.filter(f => c[f.key]?.trim()).map(f => ({ label: f.label, value: c[f.key]! }))

  const AD_INTRO = 'This document helps you express your values, preferences, and what matters to you in your care. It is not a legal directive, but can be used alongside one to provide important context.'

  const pdfData: PDFData = { kind: 'generic', displayTitle, createdDate, filename, fields, intro: AD_INTRO, userName }

  return (
    <>
      <style>{PRINT_STYLES}</style>
      <div className="bg-white min-h-screen">
        <div style={{ maxWidth: 600, margin: '0 auto', padding: '48px 56px' }}>
          <BackAndExport id={id} pdfData={pdfData} />
          <ExportHeader title={displayTitle} userName={userName} />

          <div style={{ marginBottom: 16 }}>
            <h1 style={{ fontFamily: apfel, fontSize: 26, fontWeight: 400, color: '#1A1A1A', marginBottom: 6 }}>{displayTitle}</h1>
            {createdDate && <p style={{ fontFamily: hv, fontSize: 12, color: '#6B6B6B' }}>Last saved {createdDate}</p>}
            <p style={{ fontFamily: hv, fontSize: 12, color: '#6B6B6B', marginTop: 6, lineHeight: 1.5 }}>
              This is a record of your responses at the time of your last save. It is not a legal document.
            </p>
          </div>
          <p style={{ fontFamily: hv, fontSize: 13, color: '#3A3A3A', lineHeight: 1.65, marginBottom: 20 }}>
            {AD_INTRO}
          </p>
          <div style={{ height: 1, background: 'rgba(0,0,0,0.14)', marginBottom: 28 }} />

          {fields.length === 0 ? (
            <p style={{ fontFamily: hv, fontSize: 13, color: '#6B6B6B' }}>No content saved yet.</p>
          ) : (
            <div>
              {fields.map(({ label, value }, i) => (
                <div key={label} style={{ marginBottom: i < fields.length - 1 ? 28 : 0 }}>
                  <p style={{ fontFamily: hv, fontSize: 10, fontWeight: 500, letterSpacing: '0.06em', color: '#6B6B6B', textTransform: 'uppercase' as const, marginBottom: 4 }}>
                    {label}
                  </p>
                  <p style={{ fontFamily: hv, fontSize: 14, color: '#1A1A1A', lineHeight: 1.65, whiteSpace: 'pre-wrap' }}>{value}</p>
                </div>
              ))}
            </div>
          )}

          <ExportFooter />
        </div>
      </div>
    </>
  )
}

// ---------------------------------------------------------------------------
// Funeral Wishes
// ---------------------------------------------------------------------------

const FW_EXPORT_SECTIONS: { title: string; fields: { key: string; label: string }[] }[] = [
  { title: 'What Matters Most', fields: [
    { key: 'whatMattersMost', label: 'What matters most to me' },
  ]},
  { title: 'Organ & Tissue Donation', fields: [
    { key: 'organDonationWishes', label: 'My donation wishes' },
    { key: 'organDonationSpecific', label: 'Specific organs or tissues' },
    { key: 'organDonationNotes', label: 'Other notes' },
  ]},
  { title: 'Final Resting Place', fields: [
    { key: 'dispositionTypes', label: 'How I want my body to be handled' },
    { key: 'burialLocation', label: 'Burial: location' },
    { key: 'burialCasket', label: 'Burial: casket preferences' },
    { key: 'burialEmbalming', label: 'Burial: embalming preference' },
    { key: 'burialOtherWishes', label: 'Burial: other wishes' },
    { key: 'mausoleumLocation', label: 'Above-ground burial: location' },
    { key: 'mausoleumOtherWishes', label: 'Above-ground burial: other wishes' },
    { key: 'cremationDirect', label: 'Cremation: direct cremation' },
    { key: 'cremationRemains', label: 'Cremation: what to do with my remains' },
    { key: 'cremationLocation', label: 'Cremation: location for remains' },
    { key: 'cremationOtherWishes', label: 'Cremation: other wishes' },
    { key: 'aquamationDirect', label: 'Aquamation: direct aquamation' },
    { key: 'aquamationRemains', label: 'Aquamation: what to do with my remains' },
    { key: 'aquamationLocation', label: 'Aquamation: location for remains' },
    { key: 'aquamationOtherWishes', label: 'Aquamation: other wishes' },
    { key: 'homeFuneralWishes', label: 'Home funeral wishes' },
    { key: 'bodyDonationPreregistered', label: 'Body donation: pre-registered' },
    { key: 'bodyDonationDetails', label: 'Body donation: details' },
    { key: 'bodyDonationAfterWishes', label: 'Body donation: wishes for remains afterward' },
    { key: 'dispositionOtherText', label: 'Other disposition details' },
    { key: 'memorialMarker', label: 'Memorial marker preference' },
    { key: 'memorialMarkerText', label: 'Memorial marker: what it should say' },
    { key: 'memorialMarkerLocation', label: 'Memorial marker: location' },
    { key: 'memorialMarkerOtherWishes', label: 'Memorial marker: other wishes' },
  ]},
  { title: 'Ceremony', fields: [
    { key: 'ceremonyCulturalTraditions', label: 'Cultural or religious traditions' },
    { key: 'ceremonyOfficiant', label: 'Officiant preference' },
    { key: 'ceremonyGatheringAlive', label: 'Gathering while I am still alive' },
    { key: 'ceremonyGatheringAliveDetails', label: 'Gathering while alive: details' },
    { key: 'ceremonyFuneralWants', label: 'Do I want a funeral or memorial service' },
    { key: 'ceremonyFuneralPublicPrivate', label: 'Public or private' },
    { key: 'ceremonyFuneralLocation', label: 'Where it should take place' },
    { key: 'ceremonyFuneralCoordinator', label: 'Who should coordinate' },
    { key: 'ceremonyFuneralPrearranged', label: 'Have I pre-arranged with a funeral home' },
    { key: 'ceremonyFuneralPrearrangedDetails', label: 'Pre-arrangement details' },
    { key: 'ceremonyFuneralSpeakers', label: 'Who should speak' },
    { key: 'ceremonyFuneralMusic', label: 'Music' },
    { key: 'ceremonyFuneralFlowers', label: 'Flowers preference' },
    { key: 'ceremonyFuneralDonationCause', label: 'Charitable cause for donations' },
    { key: 'ceremonyDoNotWant', label: 'Things I do not want' },
    { key: 'ceremonyOtherWishes', label: 'Other ceremony wishes' },
  ]},
  { title: 'Obituary', fields: [
    { key: 'obituaryWants', label: 'Do I want an obituary' },
    { key: 'obituaryContent', label: 'What to include' },
    { key: 'obituaryWriter', label: 'Who should write it' },
    { key: 'obituaryPublications', label: 'Where to publish' },
    { key: 'obituaryOnline', label: 'Online presence' },
  ]},
  { title: 'Note to Others', fields: [
    { key: 'noteToOthers', label: 'My note to others' },
  ]},
]

function FuneralWishesExportPage({ id, entry, createdDate, displayTitle, filename, userName }: {
  id: string
  entry: EntryRow
  createdDate: string | null
  displayTitle: string
  filename: string
  userName?: string
}) {
  const c = (entry.content && typeof entry.content === 'object' ? entry.content : {}) as Record<string, unknown>

  // Flatten to { label, value } pairs for PDF
  const allFields: { label: string; value: string }[] = []
  for (const section of FW_EXPORT_SECTIONS) {
    const sectionFields = section.fields.filter(f => {
      if (f.key === 'dispositionTypes') return Array.isArray(c.dispositionTypes) && (c.dispositionTypes as string[]).length > 0
      return typeof c[f.key] === 'string' && (c[f.key] as string).trim()
    })
    if (sectionFields.length === 0) continue
    allFields.push({ label: `— ${section.title} —`, value: '' })
    for (const f of sectionFields) {
      const value = f.key === 'dispositionTypes'
        ? (c.dispositionTypes as string[]).join(', ')
        : c[f.key] as string
      allFields.push({ label: f.label, value })
    }
  }

  const FW_INTRO = 'This document captures your wishes for your body, funeral, memorial service, and how you want to be remembered. It is not a legal document, but can be an important guide for the people who care for you.'

  const pdfData: PDFData = { kind: 'generic', displayTitle, createdDate, filename, fields: allFields.filter(f => f.value), intro: FW_INTRO, userName }

  return (
    <>
      <style>{PRINT_STYLES}</style>
      <div className="bg-white min-h-screen">
        <div style={{ maxWidth: 600, margin: '0 auto', padding: '48px 56px' }}>
          <BackAndExport id={id} pdfData={pdfData} />
          <ExportHeader title={displayTitle} userName={userName} />

          <div style={{ marginBottom: 16 }}>
            <h1 style={{ fontFamily: apfel, fontSize: 26, fontWeight: 400, color: '#1A1A1A', marginBottom: 6 }}>{displayTitle}</h1>
            {createdDate && <p style={{ fontFamily: hv, fontSize: 12, color: '#6B6B6B' }}>Last saved {createdDate}</p>}
            <p style={{ fontFamily: hv, fontSize: 12, color: '#6B6B6B', marginTop: 6, lineHeight: 1.5 }}>
              This is a record of your responses at the time of your last save. It is not a legal document.
            </p>
          </div>
          <p style={{ fontFamily: hv, fontSize: 13, color: '#3A3A3A', lineHeight: 1.65, marginBottom: 20 }}>
            {FW_INTRO}
          </p>
          <div style={{ height: 1, background: 'rgba(0,0,0,0.14)', marginBottom: 28 }} />

          {FW_EXPORT_SECTIONS.map(section => {
            const visibleFields = section.fields.filter(f => {
              if (f.key === 'dispositionTypes') return Array.isArray(c.dispositionTypes) && (c.dispositionTypes as string[]).length > 0
              return typeof c[f.key] === 'string' && (c[f.key] as string).trim()
            })
            if (visibleFields.length === 0) return null
            return (
              <div key={section.title} style={{ marginBottom: 32 }}>
                <p style={{ fontFamily: hv, fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', color: '#3A3A3A', textTransform: 'uppercase' as const, marginBottom: 16 }}>
                  {section.title}
                </p>
                {visibleFields.map((f, i) => {
                  const value = f.key === 'dispositionTypes'
                    ? (c.dispositionTypes as string[]).join(', ')
                    : c[f.key] as string
                  return (
                    <div key={f.key} style={{ marginBottom: i < visibleFields.length - 1 ? 20 : 0 }}>
                      <p style={{ fontFamily: hv, fontSize: 10, fontWeight: 500, letterSpacing: '0.06em', color: '#6B6B6B', textTransform: 'uppercase' as const, marginBottom: 4 }}>
                        {f.label}
                      </p>
                      <p style={{ fontFamily: hv, fontSize: 14, color: '#1A1A1A', lineHeight: 1.65, whiteSpace: 'pre-wrap' }}>{value}</p>
                    </div>
                  )
                })}
              </div>
            )
          })}

          <ExportFooter />
        </div>
      </div>
    </>
  )
}

// ---------------------------------------------------------------------------
// Generic document
// ---------------------------------------------------------------------------

function GenericDocumentExportPage({ id, entry, createdDate, displayTitle, filename, userName }: {
  id: string
  entry: EntryRow
  createdDate: string | null
  displayTitle: string
  filename: string
  userName?: string
}) {
  const content = entry.content
  const rawFields = (content && typeof content === 'object'
    ? Object.entries(content as Record<string, unknown>)
        .filter(([, v]) => typeof v === 'string' && (v as string).trim().length > 0) as [string, string][]
    : [])

  const pdfData: PDFData = {
    kind: 'generic',
    displayTitle,
    createdDate,
    filename,
    fields: rawFields.map(([key, value]) => ({ label: camelCaseToLabel(key), value })),
    userName,
  }

  return (
    <>
      <style>{PRINT_STYLES}</style>
      <div className="bg-white min-h-screen">
        <div style={{ maxWidth: 600, margin: '0 auto', padding: '48px 56px' }}>
          <BackAndExport id={id} pdfData={pdfData} />
          <ExportHeader title={displayTitle} userName={userName} />

          <div style={{ marginBottom: 20 }}>
            <h1 style={{ fontFamily: apfel, fontSize: 26, fontWeight: 400, color: '#1A1A1A', marginBottom: 6 }}>{displayTitle}</h1>
            {createdDate && <p style={{ fontFamily: hv, fontSize: 12, color: '#6B6B6B' }}>Last saved {createdDate}</p>}
            <p style={{ fontFamily: hv, fontSize: 12, color: '#6B6B6B', marginTop: 6, lineHeight: 1.5 }}>
              This is a record of your responses at the time of your last save. It is not a legal document.
            </p>
          </div>
          <div style={{ height: 1, background: 'rgba(0,0,0,0.14)', marginBottom: 28 }} />

          {rawFields.length === 0 ? (
            <p style={{ fontFamily: hv, fontSize: 13, color: '#6B6B6B' }}>No content saved yet.</p>
          ) : (
            <div>
              {rawFields.map(([key, value], i) => (
                <div key={key} style={{ marginBottom: i < rawFields.length - 1 ? 24 : 0 }}>
                  <p style={{ fontFamily: hv, fontSize: 10, fontWeight: 500, letterSpacing: '0.06em', color: '#6B6B6B', textTransform: 'uppercase' as const, marginBottom: 5 }}>
                    {camelCaseToLabel(key)}
                  </p>
                  <p style={{ fontFamily: hv, fontSize: 14, color: '#1A1A1A', lineHeight: 1.65, whiteSpace: 'pre-wrap' }}>{value}</p>
                </div>
              ))}
            </div>
          )}

          <ExportFooter />
        </div>
      </div>
    </>
  )
}

// ---------------------------------------------------------------------------
// Important Contacts
// ---------------------------------------------------------------------------

function buildContactsPDFData(
  entry: EntryRow,
  createdDate: string | null,
  displayTitle: string,
  filename: string,
  userName?: string,
): PDFData {
  const content = entry.content as Record<string, unknown> | null
  const sections: { label: string; contacts: PDFContactEntry[] }[] = []

  if (content) {
    const isNewFormat = Array.isArray(content.healthcare) || Array.isArray(content.legal) || Array.isArray(content.relatives) || Array.isArray(content.friends)

    if (isNewFormat) {
      const sectionDefs = [
        { key: 'healthcare', label: 'DOCTORS & HEALTHCARE' },
        { key: 'legal',      label: 'LEGAL & DECISION MAKERS' },
        { key: 'relatives',  label: 'RELATIVES' },
        { key: 'friends',    label: 'FRIENDS & SUPPORT' },
        { key: 'spiritual',  label: 'SPIRITUAL / RELIGIOUS' },
        { key: 'financial',  label: 'FINANCIAL & PROFESSIONAL' },
        { key: 'other',      label: 'OTHER CONTACTS' },
      ]
      for (const { key, label } of sectionDefs) {
        const entries = ((content[key] as NewContact[]) ?? [])
          .filter(c => c.name?.trim() || c.phone?.trim() || c.email?.trim())
        if (entries.length > 0) {
          sections.push({
            label,
            contacts: entries.map(c => ({
              name: c.name,
              role: c.role?.trim() || undefined,
              phone: c.phone?.trim() || undefined,
              email: c.email?.trim() || undefined,
              address: c.address?.trim() || undefined,
            })),
          })
        }
      }
    } else {
      const oldContent = content as Record<string, ContactFields>
      const groupDefs = [
        { label: 'DOCTORS',                    keys: ['doctor1', 'doctor2', 'doctor3', 'doctor4'] },
        { label: 'ATTORNEYS / ACCOUNTANTS',     keys: ['attorney1', 'attorney2', 'attorney3', 'attorney4'] },
        { label: 'FAMILY & EMERGENCY CONTACTS', keys: ['relative1', 'relative2', 'relative3', 'relative4'] },
        { label: 'FRIENDS',                     keys: ['friend1', 'friend2', 'friend3', 'friend4'] },
        { label: 'OTHERS',                      keys: ['other1', 'other2', 'other3', 'other4'] },
      ]
      for (const { label, keys } of groupDefs) {
        const contacts = keys
          .map(k => oldContent[k])
          .filter((c): c is ContactFields => !!(c && c.name?.trim()))
          .map(c => ({
            name: c.name,
            phone: c.phone?.trim() || undefined,
            email: c.email?.trim() || undefined,
            address: c.address?.trim() || undefined,
          }))
        if (contacts.length > 0) sections.push({ label, contacts })
      }
    }
  }

  return { kind: 'important_contacts', displayTitle, createdDate, filename, sections, userName }
}

function ImportantContactsExportPage({ id, entry, createdDate, displayTitle, filename, userName }: {
  id: string
  entry: EntryRow
  createdDate: string | null
  displayTitle: string
  filename: string
  userName?: string
}) {
  const pdfData = buildContactsPDFData(entry, createdDate, displayTitle, filename, userName)
  const content = entry.content as Record<string, unknown> | null
  const isNewFormat = !!(content && (Array.isArray(content.healthcare) || Array.isArray(content.legal) || Array.isArray(content.relatives) || Array.isArray(content.friends)))

  // Preview rendering
  const previewSections = pdfData.kind === 'important_contacts' ? pdfData.sections : []
  let renderedCount = 0

  return (
    <>
      <style>{PRINT_STYLES}</style>
      <div className="bg-white min-h-screen">
        <div style={{ maxWidth: 600, margin: '0 auto', padding: '48px 56px' }}>
          <BackAndExport id={id} pdfData={pdfData} />
          <ExportHeader title={displayTitle} userName={userName} />

          <div style={{ marginBottom: 20 }}>
            <h1 style={{ fontFamily: apfel, fontSize: 26, fontWeight: 400, color: '#1A1A1A', marginBottom: 6 }}>{displayTitle}</h1>
            {createdDate && <p style={{ fontFamily: hv, fontSize: 12, color: '#6B6B6B' }}>Last saved {createdDate}</p>}
            <p style={{ fontFamily: hv, fontSize: 12, color: '#6B6B6B', marginTop: 6, lineHeight: 1.5 }}>
              This is a record of your responses at the time of your last save. It is not a legal document.
            </p>
          </div>
          <div style={{ height: 1, background: 'rgba(0,0,0,0.14)', marginBottom: 28 }} />

          {previewSections.map(({ label, contacts }) => {
            const isFirst = renderedCount === 0
            renderedCount++
            return (
              <div key={label}>
                <p style={{ fontFamily: hv, fontSize: 11, fontWeight: 500, letterSpacing: '0.04em', color: '#444444', textTransform: 'uppercase' as const, borderBottom: '0.5px solid rgba(0,0,0,0.13)', paddingBottom: 6, marginBottom: 10, marginTop: isFirst ? 0 : 24 }}>
                  {label}
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 18, marginBottom: 8 }}>
                  {contacts.map((c, ci) => (
                    <div key={ci}>
                      <p style={{ fontFamily: hv, fontSize: 14, fontWeight: 600, color: '#1A1A1A', marginBottom: 2, lineHeight: 1.3 }}>{c.name}</p>
                      {c.role && <p style={{ fontFamily: hv, fontSize: 12, color: '#4A4A4A', lineHeight: 1.4, marginBottom: 4 }}>{c.role}</p>}
                      {c.phone && <p style={{ fontFamily: hv, fontSize: 12, color: '#6B6B6B', lineHeight: 1.4, marginBottom: 1 }}>{c.phone}</p>}
                      {c.email && <p style={{ fontFamily: hv, fontSize: 12, color: '#6B6B6B', lineHeight: 1.4, marginBottom: 1 }}>{c.email}</p>}
                      {c.address && <p style={{ fontFamily: hv, fontSize: 12, color: '#6B6B6B', lineHeight: 1.55, whiteSpace: 'pre-wrap' }}>{c.address}</p>}
                    </div>
                  ))}
                </div>
              </div>
            )
          })}

          <ExportFooter />
        </div>
      </div>
    </>
  )
}

// ---------------------------------------------------------------------------
// Keepsake Inventory
// ---------------------------------------------------------------------------

function KeepsakeInventoryExportPage({ id, entry, createdDate, displayTitle, filename, userName }: {
  id: string
  entry: EntryRow
  createdDate: string | null
  displayTitle: string
  filename: string
  userName?: string
}) {
  const content = entry.content as { entries?: KeepsakeItem[] } | null
  const items = content?.entries?.filter((e) => e.object?.trim()) ?? []

  const pdfData: PDFData = {
    kind: 'keepsake_inventory',
    displayTitle,
    createdDate,
    filename,
    items: items.map(item => ({
      object: item.object,
      recipient: item.recipient?.trim() || undefined,
      meaning: item.meaning?.trim() || undefined,
    })),
    userName,
  }

  return (
    <>
      <style>{PRINT_STYLES}</style>
      <div className="bg-white min-h-screen">
        <div style={{ maxWidth: 600, margin: '0 auto', padding: '48px 56px' }}>
          <BackAndExport id={id} pdfData={pdfData} />
          <ExportHeader title={displayTitle} userName={userName} />

          <div style={{ marginBottom: 20 }}>
            <h1 style={{ fontFamily: apfel, fontSize: 26, fontWeight: 400, color: '#1A1A1A', marginBottom: 6 }}>{displayTitle}</h1>
            {createdDate && <p style={{ fontFamily: hv, fontSize: 12, color: '#6B6B6B' }}>Last saved {createdDate}</p>}
            <p style={{ fontFamily: hv, fontSize: 12, color: '#6B6B6B', marginTop: 6, lineHeight: 1.5 }}>
              This is a record of your responses at the time of your last save. It is not a legal document.
            </p>
          </div>
          <div style={{ height: 1, background: 'rgba(0,0,0,0.14)', marginBottom: 28 }} />

          {items.length === 0 ? (
            <p style={{ fontFamily: hv, fontSize: 13, color: '#6B6B6B' }}>No keepsakes saved yet.</p>
          ) : (
            <div>
              {items.map((item, i) => (
                <div key={item.id} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', padding: '13px 0', borderBottom: i < items.length - 1 ? '0.5px solid rgba(0,0,0,0.10)' : 'none' }}>
                  <span style={{ fontFamily: hv, fontSize: 10, color: 'rgba(0,0,0,0.22)', minWidth: 18, flexShrink: 0, paddingTop: 2 }}>{i + 1}</span>
                  <div>
                    <p style={{ fontFamily: hv, fontSize: 14, fontWeight: 600, color: '#1A1A1A', marginBottom: 3, lineHeight: 1.3 }}>{item.object}</p>
                    {item.recipient?.trim() && (
                      <p style={{ fontFamily: hv, fontSize: 12, lineHeight: 1.4, marginBottom: 2 }}>
                        <span style={{ color: '#9A9A9A' }}>For </span>
                        <span style={{ color: '#3A3A3A' }}>{item.recipient}</span>
                      </p>
                    )}
                    {item.meaning?.trim() && <p style={{ fontFamily: hv, fontSize: 12, color: '#666666', marginTop: 4, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{item.meaning}</p>}
                  </div>
                </div>
              ))}
            </div>
          )}

          <ExportFooter />
        </div>
      </div>
    </>
  )
}

// ---------------------------------------------------------------------------
// Data helpers
// ---------------------------------------------------------------------------

function getLegacyMapContent(entry: EntryRow): LegacyMapContent | null {
  if (!entry.content || typeof entry.content !== 'object') return null
  const c = entry.content as Record<string, unknown>
  return {
    moments: Array.isArray(c.moments)
      ? (c.moments as Record<string, unknown>[])
          .filter((m) => typeof m.title === 'string' && (m.title as string).trim())
          .map((m) => ({
            id: typeof m.id === 'string' ? m.id : '',
            title: m.title as string,
            note: typeof m.note === 'string' ? m.note : '',
            xPercent: typeof m.xPercent === 'number' ? m.xPercent : 50,
          }))
          .sort((a, b) => a.xPercent - b.xPercent)
      : [],
    themes: typeof c.themes === 'string' ? c.themes : '',
    surprises: typeof c.surprises === 'string' ? c.surprises : '',
    valuesToPassOn: typeof c.valuesToPassOn === 'string' ? c.valuesToPassOn : '',
    legacyProjects: typeof c.legacyProjects === 'string' ? c.legacyProjects : '',
  }
}

function getRankingContent(entry: EntryRow): RankingContent | null {
  if (!entry.content || typeof entry.content !== 'object') return null
  const c = entry.content as Record<string, unknown>
  return {
    essential: Array.isArray(c.essential) ? c.essential.filter((i): i is string => typeof i === 'string') : [],
    important: Array.isArray(c.important) ? c.important.filter((i): i is string => typeof i === 'string') : [],
    less_central: Array.isArray(c.less_central) ? c.less_central.filter((i): i is string => typeof i === 'string') : [],
    reflection: typeof c.reflection === 'string' ? c.reflection : undefined,
  }
}

function getDisplayTitle(entry: EntryRow): string {
  if (entry.document_type === DOCUMENT_TYPE.ADVANCE_DIRECTIVE_SUPPLEMENT) return DOCUMENT_TYPE_META.advance_directive_supplement.label
  if (entry.document_type === DOCUMENT_TYPE.FUNERAL_WISHES) return DOCUMENT_TYPE_META.funeral_wishes.label
  if (entry.document_type === DOCUMENT_TYPE.PERSONAL_ADMIN_INFO) return DOCUMENT_TYPE_META.personal_admin_info.label
  if (entry.document_type === DOCUMENT_TYPE.IMPORTANT_CONTACTS) return DOCUMENT_TYPE_META.important_contacts.label
  if (entry.document_type === DOCUMENT_TYPE.FINANCIAL_INFORMATION) return DOCUMENT_TYPE_META.financial_information.label
  if (entry.document_type === DOCUMENT_TYPE.DEVICES_AND_ACCOUNTS) return DOCUMENT_TYPE_META.devices_and_accounts.label
  if (entry.document_type === DOCUMENT_TYPE.KEEPSAKE_INVENTORY) return DOCUMENT_TYPE_META.keepsake_inventory.label
  if (entry.activity === ACTIVITY.VALUES_RANKING) return 'Values Ranking'
  if (entry.activity === ACTIVITY.FEARS_RANKING) return 'Fears Ranking'
  if (entry.activity === ACTIVITY.LEGACY_MAP) return 'Legacy Map'
  if (entry.title?.trim()) return entry.title.trim()
  return 'Untitled'
}

function getExportFilename(entry: EntryRow): string {
  const date = entry.created_at
    ? new Date(entry.created_at).toISOString().slice(0, 10)
    : new Date().toISOString().slice(0, 10)
  if (entry.document_type === DOCUMENT_TYPE.ADVANCE_DIRECTIVE_SUPPLEMENT) return `nightside-your-wishes-${date}`
  if (entry.document_type === DOCUMENT_TYPE.FUNERAL_WISHES) return `nightside-funeral-wishes-${date}`
  if (entry.document_type === DOCUMENT_TYPE.PERSONAL_ADMIN_INFO) return `nightside-personal-admin-${date}`
  if (entry.document_type === DOCUMENT_TYPE.IMPORTANT_CONTACTS) return `nightside-important-contacts-${date}`
  if (entry.document_type === DOCUMENT_TYPE.FINANCIAL_INFORMATION) return `nightside-financial-information-${date}`
  if (entry.document_type === DOCUMENT_TYPE.DEVICES_AND_ACCOUNTS) return `nightside-devices-and-accounts-${date}`
  if (entry.document_type === DOCUMENT_TYPE.KEEPSAKE_INVENTORY) return `nightside-keepsake-inventory-${date}`
  if (entry.activity === ACTIVITY.VALUES_RANKING) return `nightside-values-ranking-${date}`
  if (entry.activity === ACTIVITY.FEARS_RANKING) return `nightside-fears-ranking-${date}`
  if (entry.activity === ACTIVITY.LEGACY_MAP) return `nightside-legacy-map-${date}`
  return `nightside-export-${date}`
}

function camelCaseToLabel(key: string): string {
  return key
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, (s) => s.toUpperCase())
    .replace(/_/g, ' ')
    .trim()
}

function formatDate(dateString: string | null): string | null {
  if (!dateString) return null
  const date = new Date(dateString)
  if (Number.isNaN(date.getTime())) return null
  return date.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })
}
