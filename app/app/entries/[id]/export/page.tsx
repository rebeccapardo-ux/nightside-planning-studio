import { notFound } from 'next/navigation'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import DownloadPDFButton from './DownloadPDFButton'
import FinancialExportClient from './FinancialExportClient'
import PersonalAdminExportClient from './PersonalAdminExportClient'
import DevicesAccountsExportClient from './DevicesAccountsExportClient'
import type { PDFData, PDFContactEntry } from './pdfTypes'

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

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default async function ExportPage({ params }: ExportPageProps) {
  const { id } = await params
  const supabase = await createSupabaseServerClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) notFound()

  const { data: entry, error } = await supabase
    .from('entries')
    .select('id, title, content, created_at, activity, document_type')
    .eq('id', id)
    .eq('user_id', user.id)
    .single<EntryRow>()

  if (error || !entry) notFound()

  const isActivity = entry.activity === 'values_ranking' || entry.activity === 'fears_ranking' || entry.activity === 'legacy_map'
  const isDocument = !!entry.document_type
  if (!isActivity && !isDocument) notFound()

  const createdDate = formatDate(entry.created_at)
  const displayTitle = getDisplayTitle(entry)
  const filename = getExportFilename(entry)

  if (entry.activity === 'legacy_map') {
    const mapContent = getLegacyMapContent(entry)
    if (!mapContent) notFound()
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
    }
    return <LegacyMapExportPage id={id} mapContent={mapContent} createdDate={createdDate} displayTitle={displayTitle} pdfData={pdfData} />
  }

  if (entry.activity === 'values_ranking') {
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
    }
    return <ValuesRankingExportPage id={id} ranking={ranking} createdDate={createdDate} pdfData={pdfData} />
  }

  if (entry.activity === 'fears_ranking') {
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
    }
    return <FearsRankingExportPage id={id} ranking={ranking} createdDate={createdDate} pdfData={pdfData} />
  }

  return <DocumentExportPage id={id} entry={entry} createdDate={createdDate} displayTitle={displayTitle} filename={filename} />
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

function ExportHeader({ title }: { title: string }) {
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/The-Nightside-Wordmark-Black.svg" alt="Nightside" style={{ height: 22 }} />
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

function ValuesRankingExportPage({ id, ranking, createdDate, pdfData }: {
  id: string
  ranking: RankingContent
  createdDate: string | null
  pdfData: PDFData
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
          <ExportHeader title="Values Ranking" />

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

function FearsRankingExportPage({ id, ranking, createdDate, pdfData }: {
  id: string
  ranking: RankingContent
  createdDate: string | null
  pdfData: PDFData
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
          <ExportHeader title="Fears Ranking" />

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

function LegacyMapExportPage({ id, mapContent, createdDate, displayTitle, pdfData }: {
  id: string
  mapContent: LegacyMapContent
  createdDate: string | null
  displayTitle: string
  pdfData: PDFData
}) {
  const hasReflection = mapContent.themes || mapContent.surprises || mapContent.valuesToPassOn || mapContent.legacyProjects
  const sorted = [...mapContent.moments].sort((a, b) => a.xPercent - b.xPercent)

  return (
    <>
      <style>{PRINT_STYLES}</style>
      <div className="bg-white min-h-screen">
        <div style={{ maxWidth: 640, margin: '0 auto', padding: '48px 40px' }}>
          <BackAndExport id={id} pdfData={pdfData} />
          <ExportHeader title={displayTitle} />

          <div style={{ marginBottom: 16 }}>
            <h1 style={{ fontFamily: apfel, fontSize: 28, fontWeight: 400, color: '#1A1A1A', marginBottom: 6 }}>Legacy Map</h1>
            {createdDate && (
              <p style={{ fontFamily: hv, fontSize: 12, color: '#6B6B6B' }}>Generated {createdDate}</p>
            )}
            <p style={{ fontFamily: hv, fontSize: 12, color: '#6B6B6B', marginTop: 6, lineHeight: 1.5 }}>
              This is a generated record of your responses. It is not a legal document.
            </p>
          </div>
          <p style={{ fontFamily: hv, fontSize: 13, color: '#3A3A3A', lineHeight: 1.65, marginBottom: 20 }}>
            {LEGACY_MAP_INTRO}
          </p>
          <div style={{ height: 1, background: 'rgba(0,0,0,0.14)', marginBottom: 20 }} />

          {sorted.length > 0 && (
            <div style={{ border: '1px solid #1A1A1A', borderRadius: 6, height: 130, marginBottom: 20, position: 'relative', overflow: 'hidden' }}>
              <svg
                viewBox={`0 0 ${LM_VB_W} ${LM_VB_H}`}
                preserveAspectRatio="none"
                style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', display: 'block' }}
                aria-hidden="true"
              >
                <path d={LM_PATH_D} fill="none" stroke="#1A1A1A" strokeWidth="2" strokeLinecap="round" />
              </svg>
              {sorted.map((m, i) => {
                const pt = lmPathPoint(m.xPercent)
                return (
                  <div
                    key={m.id}
                    style={{
                      position: 'absolute',
                      left: `${(pt.x / LM_VB_W) * 100}%`,
                      top: `${(pt.y / LM_VB_H) * 100}%`,
                      transform: 'translate(-50%, -50%)',
                      width: 20,
                      height: 20,
                      borderRadius: '50%',
                      background: '#F8F4EB',
                      border: '1.5px solid #1A1A1A',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontFamily: hv,
                      fontSize: 10,
                      fontWeight: 600,
                      color: '#1A1A1A',
                    }}
                  >
                    {i + 1}
                  </div>
                )
              })}
              <span style={{ position: 'absolute', bottom: 8, left: 12, fontFamily: hv, fontSize: 10, color: '#1A1A1A' }}>Birth</span>
              <span style={{ position: 'absolute', bottom: 8, right: 12, fontFamily: hv, fontSize: 10, color: '#1A1A1A' }}>Now</span>
            </div>
          )}

          {sorted.length === 0 ? (
            <p style={{ fontFamily: hv, fontSize: 13, color: '#6B6B6B' }}>No moments added yet.</p>
          ) : (
            <div>
              {sorted.map((m, i) => (
                <div key={m.id} style={{ display: 'flex', gap: 12, alignItems: 'flex-start', padding: '10px 0', borderBottom: i < sorted.length - 1 ? '1px solid rgba(0,0,0,0.10)' : 'none' }}>
                  <span style={{ fontFamily: hv, fontSize: 11, fontWeight: 600, color: '#1A1A1A', minWidth: 20, flexShrink: 0, paddingTop: 1 }}>{i + 1}</span>
                  <div>
                    <p style={{ fontFamily: hv, fontSize: 13, fontWeight: 500, color: '#1A1A1A', lineHeight: 1.4 }}>{m.title}</p>
                    {m.note && <p style={{ fontFamily: hv, fontSize: 12, color: '#666666', lineHeight: 1.5, marginTop: 2, whiteSpace: 'pre-wrap' }}>{m.note}</p>}
                  </div>
                </div>
              ))}
            </div>
          )}

          {hasReflection && (
            <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid rgba(0,0,0,0.10)' }}>
              {[
                { field: mapContent.themes, label: 'THEMES THAT STOOD OUT' },
                { field: mapContent.surprises, label: 'SURPRISES OR REALIZATIONS' },
                { field: mapContent.valuesToPassOn, label: 'VALUES TO PASS ON' },
                { field: mapContent.legacyProjects, label: 'LEGACY PROJECT IDEAS' },
              ].map(({ field, label }) =>
                field ? (
                  <div key={label} style={{ marginBottom: 20 }}>
                    <p style={{ fontFamily: hv, fontSize: 10, fontWeight: 500, letterSpacing: '0.06em', color: '#6B6B6B', textTransform: 'uppercase' as const, marginBottom: 4 }}>
                      {label}
                    </p>
                    <p style={{ fontFamily: hv, fontSize: 13, color: '#1A1A1A', lineHeight: 1.55, whiteSpace: 'pre-wrap' }}>{field}</p>
                  </div>
                ) : null
              )}
            </div>
          )}

          <ExportFooter />
        </div>
      </div>
    </>
  )
}

// ---------------------------------------------------------------------------
// Document export router
// ---------------------------------------------------------------------------

function DocumentExportPage({ id, entry, createdDate, displayTitle, filename }: {
  id: string
  entry: EntryRow
  createdDate: string | null
  displayTitle: string
  filename: string
}) {
  if (entry.document_type === 'important_contacts') {
    return <ImportantContactsExportPage id={id} entry={entry} createdDate={createdDate} displayTitle={displayTitle} filename={filename} />
  }
  if (entry.document_type === 'keepsake_inventory') {
    return <KeepsakeInventoryExportPage id={id} entry={entry} createdDate={createdDate} displayTitle={displayTitle} filename={filename} />
  }
  if (entry.document_type === 'financial_information') {
    return <FinancialExportClient id={id} content={entry.content} createdDate={createdDate} displayTitle={displayTitle} filename={filename} />
  }
  if (entry.document_type === 'personal_admin_info') {
    return <PersonalAdminExportClient id={id} content={entry.content} createdDate={createdDate} displayTitle={displayTitle} filename={filename} />
  }
  if (entry.document_type === 'devices_and_accounts') {
    return <DevicesAccountsExportClient id={id} content={entry.content} createdDate={createdDate} displayTitle={displayTitle} filename={filename} />
  }
  if (entry.document_type === 'advance_directive_supplement') {
    return <AdvanceDirectiveExportPage id={id} entry={entry} createdDate={createdDate} displayTitle={displayTitle} filename={filename} />
  }
  return <GenericDocumentExportPage id={id} entry={entry} createdDate={createdDate} displayTitle={displayTitle} filename={filename} />
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

function AdvanceDirectiveExportPage({ id, entry, createdDate, displayTitle, filename }: {
  id: string
  entry: EntryRow
  createdDate: string | null
  displayTitle: string
  filename: string
}) {
  const c = (entry.content && typeof entry.content === 'object' ? entry.content : {}) as Record<string, string | undefined>
  const fields = AD_FIELDS.filter(f => c[f.key]?.trim()).map(f => ({ label: f.label, value: c[f.key]! }))

  const AD_INTRO = 'This document helps you express your values, preferences, and what matters to you in your care. It is not a legal directive, but can be used alongside one to provide important context.'

  const pdfData: PDFData = { kind: 'generic', displayTitle, createdDate, filename, fields, intro: AD_INTRO }

  return (
    <>
      <style>{PRINT_STYLES}</style>
      <div className="bg-white min-h-screen">
        <div style={{ maxWidth: 600, margin: '0 auto', padding: '48px 56px' }}>
          <BackAndExport id={id} pdfData={pdfData} />
          <ExportHeader title={displayTitle} />

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
// Generic document
// ---------------------------------------------------------------------------

function GenericDocumentExportPage({ id, entry, createdDate, displayTitle, filename }: {
  id: string
  entry: EntryRow
  createdDate: string | null
  displayTitle: string
  filename: string
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
  }

  return (
    <>
      <style>{PRINT_STYLES}</style>
      <div className="bg-white min-h-screen">
        <div style={{ maxWidth: 600, margin: '0 auto', padding: '48px 56px' }}>
          <BackAndExport id={id} pdfData={pdfData} />
          <ExportHeader title={displayTitle} />

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

  return { kind: 'important_contacts', displayTitle, createdDate, filename, sections }
}

function ImportantContactsExportPage({ id, entry, createdDate, displayTitle, filename }: {
  id: string
  entry: EntryRow
  createdDate: string | null
  displayTitle: string
  filename: string
}) {
  const pdfData = buildContactsPDFData(entry, createdDate, displayTitle, filename)
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
          <ExportHeader title={displayTitle} />

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

function KeepsakeInventoryExportPage({ id, entry, createdDate, displayTitle, filename }: {
  id: string
  entry: EntryRow
  createdDate: string | null
  displayTitle: string
  filename: string
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
  }

  return (
    <>
      <style>{PRINT_STYLES}</style>
      <div className="bg-white min-h-screen">
        <div style={{ maxWidth: 600, margin: '0 auto', padding: '48px 56px' }}>
          <BackAndExport id={id} pdfData={pdfData} />
          <ExportHeader title={displayTitle} />

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
  if (entry.document_type === 'advance_directive_supplement') return 'Your Wishes'
  if (entry.document_type === 'personal_admin_info') return 'Personal Admin Info'
  if (entry.document_type === 'important_contacts') return 'Important Contacts'
  if (entry.document_type === 'financial_information') return 'Financial Information'
  if (entry.document_type === 'devices_and_accounts') return 'Devices & Accounts'
  if (entry.document_type === 'keepsake_inventory') return 'Keepsakes Inventory'
  if (entry.activity === 'values_ranking') return 'Values Ranking'
  if (entry.activity === 'fears_ranking') return 'Fears Ranking'
  if (entry.activity === 'legacy_map') return 'Legacy Map'
  if (entry.title?.trim()) return entry.title.trim()
  return 'Untitled'
}

function getExportFilename(entry: EntryRow): string {
  const date = entry.created_at
    ? new Date(entry.created_at).toISOString().slice(0, 10)
    : new Date().toISOString().slice(0, 10)
  if (entry.document_type === 'advance_directive_supplement') return `nightside-your-wishes-${date}`
  if (entry.document_type === 'personal_admin_info') return `nightside-personal-admin-${date}`
  if (entry.document_type === 'important_contacts') return `nightside-important-contacts-${date}`
  if (entry.document_type === 'financial_information') return `nightside-financial-information-${date}`
  if (entry.document_type === 'devices_and_accounts') return `nightside-devices-and-accounts-${date}`
  if (entry.document_type === 'keepsake_inventory') return `nightside-keepsake-inventory-${date}`
  if (entry.activity === 'values_ranking') return `nightside-values-ranking-${date}`
  if (entry.activity === 'fears_ranking') return `nightside-fears-ranking-${date}`
  if (entry.activity === 'legacy_map') return `nightside-legacy-map-${date}`
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
