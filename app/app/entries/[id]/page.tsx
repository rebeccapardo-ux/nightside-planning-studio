import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import FadeIn from '@/app/components/FadeIn'
import FinancialInformationSnapshot from './FinancialInformationSnapshot'
import PersonalAdminSnapshot from './PersonalAdminSnapshot'
import DevicesAndAccountsSnapshot from './DevicesAndAccountsSnapshot'

const hv = "'Helvetica Neue', Helvetica, Arial, sans-serif"
const apfel = "'Apfel Grotezk', sans-serif"

type EntryPageProps = {
  params: Promise<{ id: string }>
  searchParams: Promise<{ returnTo?: string }>
}

type EntryRow = {
  id: string
  title: string | null
  content: unknown
  created_at: string | null
  section: string | null
  activity: string | null
  document_type: string | null
}

type RankingContent = {
  essential: string[]
  important: string[]
  less_central: string[]
  reflection?: string
  is_complete?: boolean
  sorted_count?: number
  total_count?: number
}

type LegacyMoment = { id: string; title: string; note: string; xPercent: number }

type LegacyMapContent = {
  moments: LegacyMoment[]
  themes: string
  surprises: string
  valuesToPassOn: string
  legacyProjects: string
  updatedAt: string | null
}

// ---------------------------------------------------------------------------
// Legacy Map path geometry (mirrors legacy-map/page.tsx)
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

export default async function EntryDetailPage({ params, searchParams }: EntryPageProps) {
  const { id } = await params
  const { returnTo } = await searchParams
  const supabase = await createSupabaseServerClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) notFound()

  const { data: entry, error } = await supabase
    .from('entries')
    .select('id, title, content, created_at, section, activity, document_type')
    .eq('id', id)
    .eq('user_id', user.id)
    .single<EntryRow>()

  if (error || !entry) notFound()

  const ranking = getRankingContent(entry)
  const legacyMap = getLegacyMapContent(entry)
  const editHref = getContinueHref(entry)
  const displayTitle = getDisplayTitle(entry)
  const formattedDate = formatDate(entry.created_at)
  const isDocument = !!entry.document_type

  const backHref = returnTo ?? '/app/plan'
  const backLabel = returnTo?.startsWith('/app/domains/') ? '← Back to area' : '← Back to Your Plan'

  // Date line
  let dateLine = formattedDate ?? ''
  if (isDocument && formattedDate) {
    dateLine = `Last saved ${formattedDate}`
  }
  if ((entry.activity === 'values_ranking' || entry.activity === 'fears_ranking' || entry.activity === 'legacy_map') && formattedDate) {
    dateLine = `Last saved ${formattedDate}`
  }

  const showExport = entry.activity === 'values_ranking' || entry.activity === 'legacy_map' || isDocument
  const editLabel = entry.document_type === 'financial_information'
    ? '← Continue editing'
    : isDocument
      ? 'Continue editing →'
      : entry.activity === 'legacy_map'
        ? 'Keep working →'
        : 'Revisit exercise →'

  const maxWidth = isDocument ? 680 : 800

  return (
    <div className="min-h-screen" style={{ background: (entry.document_type === 'financial_information' || entry.document_type === 'personal_admin_info' || entry.document_type === 'devices_and_accounts' || entry.document_type === 'important_contacts' || entry.document_type === 'keepsake_inventory' || entry.document_type === 'advance_directive_supplement' || entry.activity === 'values_ranking' || entry.activity === 'fears_ranking' || entry.activity === 'legacy_map') ? '#CBBBEA' : '#F8F4EB' }}>
      <div style={{ maxWidth, margin: '0 auto', padding: '48px 24px 80px' }}>

        {/* Back link — not shown on document or ranking snapshot views */}
        {entry.document_type !== 'financial_information' && entry.document_type !== 'personal_admin_info' && entry.document_type !== 'devices_and_accounts' && entry.document_type !== 'important_contacts' && entry.document_type !== 'keepsake_inventory' && entry.document_type !== 'advance_directive_supplement' && entry.activity !== 'values_ranking' && entry.activity !== 'fears_ranking' && entry.activity !== 'legacy_map' && (
          <Link
            href={backHref}
            style={{ fontFamily: hv, fontSize: 14, color: 'rgba(26,26,26,0.72)', display: 'block', marginBottom: 32, textDecoration: 'none' }}
            className="hover:text-[#1A1A1A] transition-colors"
          >
            {backLabel}
          </Link>
        )}

        {/* Continue in document / revisit exercise link — shown above the card */}
        {isDocument && editHref && (
          <Link
            href={editHref}
            style={{ fontFamily: hv, fontSize: 16, color: '#1A1A1A', display: 'block', marginBottom: 24, textDecoration: 'none' }}
            className="hover:text-[#1A1A1A] transition-colors"
          >
            ← Continue working in document
          </Link>
        )}
        {(entry.activity === 'values_ranking' || entry.activity === 'fears_ranking' || entry.activity === 'legacy_map') && editHref && (
          <Link
            href={editHref}
            style={{ fontFamily: hv, fontSize: 16, color: '#1A1A1A', display: 'block', marginBottom: 24, textDecoration: 'none' }}
            className="hover:text-[#1A1A1A] transition-colors"
          >
            ← Revisit exercise
          </Link>
        )}

        <FadeIn>
          {/* Card */}
          <div
            style={{ background: (entry.document_type === 'financial_information' || entry.document_type === 'personal_admin_info' || entry.document_type === 'devices_and_accounts' || entry.document_type === 'important_contacts' || entry.document_type === 'keepsake_inventory' || entry.document_type === 'advance_directive_supplement' || entry.activity === 'values_ranking' || entry.activity === 'fears_ranking' || entry.activity === 'legacy_map') ? '#F8F4EB' : '#FFFFFF', border: '1px solid rgba(26,26,26,0.1)', borderRadius: 12 }}
            className="p-6 md:py-10 md:px-12"
          >
            {/* Title */}
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, marginBottom: 8 }}>
              <h1 style={{
                fontFamily: apfel,
                fontSize: isDocument ? 32 : 36,
                fontWeight: 400,
                color: '#1A1A1A',
                lineHeight: 1.1,
                marginBottom: 0,
              }}>
                {displayTitle}
              </h1>
              {(entry.activity === 'values_ranking' || entry.activity === 'fears_ranking' || entry.activity === 'legacy_map') && (
                <Link
                  href={`/app/entries/${entry.id}/export`}
                  style={{ fontFamily: hv, fontSize: 14, fontWeight: 500, color: '#2C3777', background: '#FFFFFF', border: '1px solid #2C3777', borderRadius: 10, padding: '9px 16px', textDecoration: 'none', display: 'inline-block', flexShrink: 0 }}
                >
                  Export as PDF →
                </Link>
              )}
            </div>

            {/* Date line */}
            {dateLine && (
              <p style={{ fontFamily: hv, fontSize: 13, color: 'rgba(26,26,26,0.56)', marginBottom: (isDocument || entry.activity === 'values_ranking' || entry.activity === 'fears_ranking' || entry.activity === 'legacy_map') ? 16 : 24 }}>
                {dateLine}
              </p>
            )}

            {/* Disclaimer — documents only */}
            {isDocument && (
              <>
                <p style={{ fontFamily: hv, fontSize: 14, color: 'rgba(26,26,26,0.56)', marginBottom: (entry.document_type === 'financial_information' || entry.document_type === 'personal_admin_info' || entry.document_type === 'devices_and_accounts' || entry.document_type === 'important_contacts' || entry.document_type === 'keepsake_inventory' || entry.document_type === 'advance_directive_supplement') ? 8 : 24, lineHeight: 1.55 }}>
                  This is a record of your responses at the time of your last save. It is not a legal document.
                </p>
                {entry.document_type === 'financial_information' && (
                  <p style={{ fontFamily: hv, fontSize: 14, color: 'rgba(26,26,26,0.56)', marginBottom: 24, lineHeight: 1.55 }}>
                    Account numbers added here will be included in this export, but <strong>won&apos;t be saved to your plan.</strong>
                  </p>
                )}
                {entry.document_type === 'personal_admin_info' && (
                  <p style={{ fontFamily: hv, fontSize: 14, color: 'rgba(26,26,26,0.56)', marginBottom: 24, lineHeight: 1.55 }}>
                    SIN and health card numbers added here will be included in this export, but <strong>won&apos;t be saved to your plan.</strong>
                  </p>
                )}
                {entry.document_type === 'devices_and_accounts' && (
                  <p style={{ fontFamily: hv, fontSize: 14, color: 'rgba(26,26,26,0.56)', marginBottom: 24, lineHeight: 1.55 }}>
                    Passwords and PIN numbers added here will be included in this export, but <strong>won&apos;t be saved to your plan.</strong>
                  </p>
                )}
              </>
            )}

            {(entry.activity === 'values_ranking' || entry.activity === 'fears_ranking' || entry.activity === 'legacy_map') && (
              <p style={{ fontFamily: hv, fontSize: 14, color: 'rgba(26,26,26,0.56)', marginBottom: 8, lineHeight: 1.55 }}>
                This is a record of your responses at the time of your last save. It is not a legal document.
              </p>
            )}

            {/* Divider */}
            <div style={{ height: 1, background: 'rgba(26,26,26,0.1)', margin: '24px 0' }} />

            {/* Action links */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 24, marginBottom: 32 }}>
              {editHref && entry.document_type !== 'financial_information' && entry.document_type !== 'personal_admin_info' && entry.document_type !== 'devices_and_accounts' && entry.document_type !== 'important_contacts' && entry.document_type !== 'keepsake_inventory' && entry.document_type !== 'advance_directive_supplement' && entry.activity !== 'values_ranking' && entry.activity !== 'fears_ranking' && entry.activity !== 'legacy_map' && (
                <Link
                  href={editHref}
                  style={{ fontFamily: hv, fontSize: 14, fontWeight: 500, color: '#1A1A1A', textDecoration: 'none' }}
                  className="hover:underline"
                >
                  {editLabel}
                </Link>
              )}
              {showExport && entry.document_type !== 'financial_information' && entry.document_type !== 'personal_admin_info' && entry.document_type !== 'devices_and_accounts' && entry.document_type !== 'important_contacts' && entry.document_type !== 'keepsake_inventory' && entry.document_type !== 'advance_directive_supplement' && entry.activity !== 'values_ranking' && entry.activity !== 'fears_ranking' && entry.activity !== 'legacy_map' && (
                <Link
                  href={`/app/entries/${entry.id}/export`}
                  style={{ fontFamily: hv, fontSize: 14, fontWeight: 500, color: '#1A1A1A', textDecoration: 'none' }}
                  className="hover:underline"
                >
                  Export →
                </Link>
              )}
            </div>

            {/* Content */}
            {legacyMap ? (
              <LegacyMapSnapshot content={legacyMap} />
            ) : ranking ? (
              <RankingSnapshot ranking={ranking} activity={entry.activity ?? ''} id={entry.id} />
            ) : isDocument ? (
              <DocumentSnapshot entry={entry} />
            ) : (
              <GenericEntryView entry={entry} />
            )}
          </div>
        </FadeIn>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// LegacyMapSnapshot
// ---------------------------------------------------------------------------

function LegacyMapSnapshot({ content }: { content: LegacyMapContent }) {
  const sorted = [...content.moments].sort((a, b) => a.xPercent - b.xPercent)
  const hasReflection = content.themes || content.surprises || content.valuesToPassOn || content.legacyProjects

  return (
    <div>
      {/* Map visual */}
      {sorted.length > 0 && (
        <div style={{ background: '#FFFFFF', border: '1px solid #1A1A1A', borderRadius: 10, height: 180, marginBottom: 24, position: 'relative', overflow: 'hidden' }}>
          {/* Path only — preserveAspectRatio="none" is fine for lines, but distorts circles */}
          <svg
            viewBox={`0 0 ${LM_VB_W} ${LM_VB_H}`}
            preserveAspectRatio="none"
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', display: 'block' }}
            aria-hidden="true"
          >
            <path d={LM_PATH_D} fill="none" stroke="#1A1A1A" strokeWidth="2" strokeLinecap="round" />
          </svg>
          {/* Circles as divs so they stay round regardless of container aspect ratio */}
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
                  width: 22,
                  height: 22,
                  borderRadius: '50%',
                  background: '#FFFFFF',
                  border: '2px solid #1A1A1A',
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
          <span style={{ position: 'absolute', bottom: 10, left: 14, fontFamily: hv, fontSize: 11, color: '#1A1A1A' }}>Birth</span>
          <span style={{ position: 'absolute', bottom: 10, right: 14, fontFamily: hv, fontSize: 11, color: '#1A1A1A' }}>Now</span>
        </div>
      )}

      {/* Moment list */}
      {sorted.length === 0 ? (
        <p style={{ fontFamily: hv, fontSize: 14, color: 'rgba(26,26,26,0.56)' }}>No moments added yet.</p>
      ) : (
        <div>
          {sorted.map((m, i) => (
            <div
              key={m.id}
              style={{
                display: 'flex',
                gap: 12,
                alignItems: 'flex-start',
                padding: '14px 0',
                borderBottom: i < sorted.length - 1 ? '1px solid rgba(26,26,26,0.08)' : 'none',
              }}
            >
              <div style={{
                width: 22,
                height: 22,
                borderRadius: '50%',
                background: '#F8F4EB',
                border: '1.5px solid #1A1A1A',
                color: '#1A1A1A',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontFamily: hv,
                fontSize: 11,
                fontWeight: 600,
                flexShrink: 0,
                marginTop: 2,
              }}>
                {i + 1}
              </div>
              <div>
                <p style={{ fontFamily: hv, fontSize: 15, fontWeight: 500, color: '#1A1A1A', lineHeight: 1.4 }}>{m.title}</p>
                {m.note && (
                  <p style={{ fontFamily: hv, fontSize: 14, color: 'rgba(26,26,26,0.72)', marginTop: 2, lineHeight: 1.55, whiteSpace: 'pre-wrap' }}>
                    {m.note}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Reflection fields */}
      {hasReflection && (
        <div style={{ marginTop: 32 }}>
          {[
            { field: content.themes, label: 'THEMES THAT STOOD OUT' },
            { field: content.surprises, label: 'SURPRISES OR REALIZATIONS' },
            { field: content.valuesToPassOn, label: 'VALUES TO PASS ON' },
            { field: content.legacyProjects, label: 'LEGACY PROJECT IDEAS' },
          ].map(({ field, label }) =>
            field ? (
              <div key={label} style={{ marginBottom: 28 }}>
                <p style={{ fontFamily: hv, fontSize: 11, fontWeight: 500, letterSpacing: '0.08em', color: 'rgba(26,26,26,0.56)', marginBottom: 6, textTransform: 'uppercase' as const }}>
                  {label}
                </p>
                <p style={{ fontFamily: hv, fontSize: 15, color: '#1A1A1A', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                  {field}
                </p>
              </div>
            ) : null
          )}
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// RankingSnapshot
// ---------------------------------------------------------------------------

function RankingSnapshot({ ranking, activity, id }: { ranking: RankingContent; activity: string; id: string }) {
  if (activity === 'values_ranking') {
    return <ValuesCardSnapshot ranking={ranking} id={id} />
  }
  return <FearsTextSnapshot ranking={ranking} />
}

// ---------------------------------------------------------------------------
// ValuesCardSnapshot
// ---------------------------------------------------------------------------

const VALUE_GROUPS = [
  {
    key: 'essential' as const,
    label: 'ESSENTIAL',
    containerBg: '#9B8BE8',
    containerBorder: undefined as string | undefined,
    cardBg: 'rgba(255,255,255,0.55)',
    cardBorder: 'none',
    cardText: '#2C3777',
    labelColor: '#2C3777',
  },
  {
    key: 'important' as const,
    label: 'IMPORTANT',
    containerBg: '#BBABF4',
    containerBorder: undefined,
    cardBg: 'rgba(255,255,255,0.55)',
    cardBorder: 'none',
    cardText: '#2C3777',
    labelColor: '#2C3777',
  },
  {
    key: 'less_central' as const,
    label: 'LESS IMPORTANT',
    containerBg: '#D6CEF8',
    containerBorder: undefined,
    cardBg: 'rgba(255,255,255,0.55)',
    cardBorder: 'none',
    cardText: '#2C3777',
    labelColor: '#2C3777',
  },
]

function ValuesCardSnapshot({ ranking, id }: { ranking: RankingContent; id: string }) {
  const hasReflection = !!(ranking.reflection?.trim())

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {VALUE_GROUPS.map(({ key, label, containerBg, containerBorder, cardBg, cardBorder, cardText, labelColor }) => {
        const items = ranking[key]
        if (!items || items.length === 0) return null
        return (
          <div
            key={key}
            style={{
              background: containerBg,
              border: containerBorder,
              borderRadius: 10,
              padding: 20,
            }}
          >
            <p style={{
              fontFamily: hv,
              fontSize: 13,
              fontWeight: 600,
              letterSpacing: '0.08em',
              color: labelColor,
              marginBottom: 12,
              textTransform: 'uppercase' as const,
            }}>
              {label}
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 10 }}>
              {items.map((item) => (
                <div
                  key={item}
                  style={{
                    background: cardBg,
                    border: cardBorder,
                    borderRadius: 8,
                    padding: '12px 14px',
                    minHeight: 80,
                    fontFamily: hv,
                    fontSize: 14,
                    color: cardText,
                    lineHeight: 1.5,
                  }}
                >
                  {item}
                </div>
              ))}
            </div>
          </div>
        )
      })}

      {!VALUE_GROUPS.some(({ key }) => (ranking[key]?.length ?? 0) > 0) && (
        <p style={{ fontFamily: hv, fontSize: 14, color: 'rgba(26,26,26,0.56)' }}>Nothing has been placed yet.</p>
      )}

      {hasReflection && (
        <div style={{ marginTop: 16, paddingTop: 8 }}>
          <p style={{
            fontFamily: hv,
            fontSize: 11,
            fontWeight: 500,
            letterSpacing: '0.08em',
            color: 'rgba(26,26,26,0.56)',
            marginTop: 24,
            marginBottom: 8,
            textTransform: 'uppercase' as const,
          }}>
            REFLECTION NOTE
          </p>
          <p style={{ fontFamily: hv, fontSize: 15, color: '#1A1A1A', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
            {ranking.reflection!.trim()}
          </p>
        </div>
      )}

    </div>
  )
}

// ---------------------------------------------------------------------------
// FearsTextSnapshot
// ---------------------------------------------------------------------------

const FEAR_GROUPS = [
  { key: 'essential' as const, label: 'MOST PRESSING',     containerBg: '#9B8BE8', cardBg: 'rgba(255,255,255,0.55)', cardText: '#2C3777', labelColor: '#2C3777' },
  { key: 'important' as const, label: 'SOMEWHAT PRESSING', containerBg: '#BBABF4', cardBg: 'rgba(255,255,255,0.55)', cardText: '#2C3777', labelColor: '#2C3777' },
  { key: 'less_central' as const, label: 'LESS PRESSING',  containerBg: '#D6CEF8', cardBg: 'rgba(255,255,255,0.55)', cardText: '#2C3777', labelColor: '#2C3777' },
]

function FearsTextSnapshot({ ranking }: { ranking: RankingContent }) {
  const hasReflection = !!(ranking.reflection?.trim())

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {FEAR_GROUPS.map(({ key, label, containerBg, cardBg, cardText, labelColor }) => {
        const items = ranking[key]
        if (!items || items.length === 0) return null
        return (
          <div key={key} style={{ background: containerBg, borderRadius: 10, padding: 20 }}>
            <p style={{ fontFamily: hv, fontSize: 13, fontWeight: 600, letterSpacing: '0.08em', color: labelColor, marginBottom: 12, textTransform: 'uppercase' as const }}>
              {label}
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 10 }}>
              {items.map((item) => (
                <div key={item} style={{ background: cardBg, borderRadius: 8, padding: '12px 14px', minHeight: 80, fontFamily: hv, fontSize: 14, color: cardText, lineHeight: 1.5 }}>
                  {item}
                </div>
              ))}
            </div>
          </div>
        )
      })}

      {!FEAR_GROUPS.some(({ key }) => (ranking[key]?.length ?? 0) > 0) && (
        <p style={{ fontFamily: hv, fontSize: 14, color: 'rgba(26,26,26,0.56)' }}>Nothing has been placed yet.</p>
      )}

      {hasReflection && (
        <div style={{ marginTop: 8, paddingTop: 24, borderTop: '1px solid rgba(26,26,26,0.08)' }}>
          <p style={{ fontFamily: hv, fontSize: 11, fontWeight: 500, letterSpacing: '0.08em', color: 'rgba(26,26,26,0.56)', marginBottom: 8, textTransform: 'uppercase' as const }}>
            REFLECTION NOTE
          </p>
          <p style={{ fontFamily: hv, fontSize: 15, color: '#1A1A1A', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
            {ranking.reflection!.trim()}
          </p>
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// DocumentSnapshot
// ---------------------------------------------------------------------------

type ContactFields = { name: string; phone: string; email: string; address: string }
type KeepsakeItem = { id: string; object: string; recipient: string; meaning: string }

function DocumentSnapshot({ entry }: { entry: EntryRow }) {
  if (entry.document_type === 'important_contacts') {
    return <ImportantContactsSnapshot entry={entry} />
  }
  if (entry.document_type === 'financial_information') {
    return <FinancialInformationSnapshot entry={entry} />
  }
  if (entry.document_type === 'personal_admin_info') {
    return <PersonalAdminSnapshot entry={entry} />
  }
  if (entry.document_type === 'devices_and_accounts') {
    return <DevicesAndAccountsSnapshot entry={entry} />
  }
  if (entry.document_type === 'keepsake_inventory') {
    return <KeepsakeInventorySnapshot entry={entry} />
  }
  if (entry.document_type === 'advance_directive_supplement') {
    return <AdvanceDirectiveSnapshot entry={entry} />
  }
  return <GenericDocumentSnapshot entry={entry} />
}

const AD_FIELDS: { key: string; label: string }[] = [
  { key: 'perfectDeath', label: 'My perfect death would involve:' },
  { key: 'whatMatters',  label: 'At the end of my life, this is what matters most:' },
  { key: 'values',       label: 'My most important personal values:' },
  { key: 'unacceptable', label: 'What would make prolonging life unacceptable for me:' },
  { key: 'worries',      label: 'When I think about death, this is what I worry about:' },
  { key: 'caregiver',    label: 'What I want my caregiver/care team to know:' },
]

function AdvanceDirectiveSnapshot({ entry }: { entry: EntryRow }) {
  const c = (entry.content && typeof entry.content === 'object' ? entry.content : {}) as Record<string, string | undefined>
  const fields = AD_FIELDS.filter(f => c[f.key]?.trim())
  if (fields.length === 0) {
    return <p style={{ fontFamily: hv, fontSize: 14, color: 'rgba(26,26,26,0.56)' }}>No content saved yet.</p>
  }
  return (
    <div>
      {fields.map((f, i) => (
        <div key={f.key} style={{ marginBottom: i < fields.length - 1 ? 28 : 0 }}>
          <p style={{ fontFamily: hv, fontSize: 12, color: 'rgba(26,26,26,0.6)', marginBottom: 5 }}>{f.label}</p>
          <p style={{ fontFamily: hv, fontSize: 15, color: '#1A1A1A', lineHeight: 1.65, whiteSpace: 'pre-wrap' }}>{c[f.key]}</p>
        </div>
      ))}
      <div style={{ marginTop: 32 }}>
        <Link
          href={`/app/entries/${entry.id}/export`}
          style={{ fontFamily: hv, fontSize: 14, fontWeight: 500, color: '#2C3777', background: '#FFFFFF', border: '1px solid #2C3777', borderRadius: 10, padding: '9px 16px', textDecoration: 'none', display: 'inline-block' }}
        >
          Export as PDF →
        </Link>
      </div>
    </div>
  )
}

function GenericDocumentSnapshot({ entry }: { entry: EntryRow }) {
  const content = entry.content
  if (!content || typeof content !== 'object') {
    return <p style={{ fontFamily: hv, fontSize: 14, color: 'rgba(26,26,26,0.56)' }}>No content saved yet.</p>
  }
  const fields = (Object.entries(content as Record<string, unknown>)
    .filter(([, v]) => typeof v === 'string' && (v as string).trim().length > 0)) as [string, string][]
  if (fields.length === 0) {
    return <p style={{ fontFamily: hv, fontSize: 14, color: 'rgba(26,26,26,0.56)' }}>No content saved yet.</p>
  }
  return (
    <div>
      {fields.map(([key, value], i) => (
        <div key={key} style={{ marginBottom: i < fields.length - 1 ? 28 : 0 }}>
          <p style={{ fontFamily: hv, fontSize: 11, fontWeight: 500, letterSpacing: '0.06em', color: 'rgba(26,26,26,0.56)', textTransform: 'uppercase' as const, marginBottom: 6 }}>
            {camelCaseToLabel(key)}
          </p>
          <p style={{ fontFamily: hv, fontSize: 16, color: '#1A1A1A', lineHeight: 1.65, whiteSpace: 'pre-wrap' }}>
            {value}
          </p>
        </div>
      ))}
    </div>
  )
}

function ImportantContactsSnapshot({ entry }: { entry: EntryRow }) {
  const content = entry.content as Record<string, unknown> | null
  if (!content) return <p style={{ fontFamily: hv, fontSize: 14, color: 'rgba(26,26,26,0.56)' }}>No contacts saved yet.</p>

  // New array-based format
  if (Array.isArray(content.healthcare) || Array.isArray(content.legal) || Array.isArray(content.relatives) || Array.isArray(content.friends)) {
    type NewContact = { id: string; name: string; role: string; phone: string; email: string; address: string }
    const sections: { key: string; label: string }[] = [
      { key: 'healthcare', label: 'Doctors & Healthcare' },
      { key: 'legal', label: 'Legal & Decision Makers' },
      { key: 'relatives', label: 'Relatives' },
      { key: 'friends', label: 'Friends & Support Network' },
      { key: 'spiritual', label: 'Spiritual / Religious' },
      { key: 'financial', label: 'Financial & Professional Services' },
      { key: 'other', label: 'Other Important Contacts' },
    ]
    const hasAny = sections.some(s => ((content[s.key] as NewContact[]) ?? []).some(c => c.name?.trim() || c.phone?.trim() || c.email?.trim()))
    if (!hasAny) return <p style={{ fontFamily: hv, fontSize: 14, color: 'rgba(26,26,26,0.56)' }}>No contacts saved yet.</p>
    let first = true
    return (
      <div>
        {sections.map(({ key, label }) => {
          const entries = ((content[key] as NewContact[]) ?? []).filter(c => c.name?.trim() || c.phone?.trim() || c.email?.trim() || c.address?.trim())
          if (entries.length === 0) return null
          const isFirst = first; first = false
          return (
            <div key={key}>
              <p style={{ fontFamily: hv, fontSize: 17, fontWeight: 500, letterSpacing: '0.04em', color: 'rgba(26,26,26,0.85)', marginBottom: 16, marginTop: isFirst ? 0 : 32 }}>
                {label}
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                {entries.map((c, ci) => (
                  <div key={c.id || ci}>
                    {c.name?.trim() && <p style={{ fontFamily: hv, fontSize: 15, fontWeight: 500, color: '#1A1A1A' }}>{c.name}</p>}
                    {c.role?.trim() && <p style={{ fontFamily: hv, fontSize: 14, color: 'rgba(26,26,26,0.56)' }}>{c.role}</p>}
                    {c.phone?.trim() && <p style={{ fontFamily: hv, fontSize: 14, color: 'rgba(26,26,26,0.72)' }}>{c.phone}</p>}
                    {c.email?.trim() && <p style={{ fontFamily: hv, fontSize: 14, color: 'rgba(26,26,26,0.72)' }}>{c.email}</p>}
                    {c.address?.trim() && <p style={{ fontFamily: hv, fontSize: 14, color: 'rgba(26,26,26,0.72)', whiteSpace: 'pre-wrap' }}>{c.address}</p>}
                  </div>
                ))}
              </div>
            </div>
          )
        })}
        <div style={{ marginTop: 32 }}>
          <Link
            href={`/app/entries/${entry.id}/export`}
            style={{ fontFamily: hv, fontSize: 14, fontWeight: 500, color: '#2C3777', background: '#FFFFFF', border: '1px solid #2C3777', borderRadius: 10, padding: '9px 16px', textDecoration: 'none', display: 'inline-block' }}
          >
            Export as PDF →
          </Link>
        </div>
      </div>
    )
  }

  // Old fixed-field format
  const oldContent = content as Record<string, ContactFields>
  const groups = [
    { key: 'doctor',   label: 'Doctors',                     keys: ['doctor1', 'doctor2', 'doctor3', 'doctor4'] },
    { key: 'attorney', label: 'Attorneys / Accountants',     keys: ['attorney1', 'attorney2', 'attorney3', 'attorney4'] },
    { key: 'relative', label: 'Family & Emergency Contacts', keys: ['relative1', 'relative2', 'relative3', 'relative4'] },
    { key: 'friend',   label: 'Friends',                     keys: ['friend1', 'friend2', 'friend3', 'friend4'] },
    { key: 'other',    label: 'Others',                      keys: ['other1', 'other2', 'other3', 'other4'] },
  ]
  let renderedGroups = 0
  return (
    <div>
      {groups.map((group) => {
        const filled = group.keys.map((k) => oldContent[k]).filter((c): c is ContactFields => !!(c && c.name?.trim()))
        if (filled.length === 0) return null
        const isFirst = renderedGroups === 0; renderedGroups++
        return (
          <div key={group.key}>
            <p style={{ fontFamily: hv, fontSize: 17, fontWeight: 500, letterSpacing: '0.04em', color: 'rgba(26,26,26,0.85)', marginBottom: 16, marginTop: isFirst ? 0 : 32 }}>
              {group.label}
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              {filled.map((contact, ci) => (
                <div key={ci}>
                  <p style={{ fontFamily: hv, fontSize: 15, fontWeight: 500, color: '#1A1A1A' }}>{contact.name}</p>
                  {contact.phone && <p style={{ fontFamily: hv, fontSize: 14, color: 'rgba(26,26,26,0.72)' }}>{contact.phone}</p>}
                  {contact.email && <p style={{ fontFamily: hv, fontSize: 14, color: 'rgba(26,26,26,0.72)' }}>{contact.email}</p>}
                  {contact.address && <p style={{ fontFamily: hv, fontSize: 14, color: 'rgba(26,26,26,0.72)' }}>{contact.address}</p>}
                </div>
              ))}
            </div>
          </div>
        )
      })}
      <div style={{ marginTop: 32 }}>
        <Link
          href={`/app/entries/${entry.id}/export`}
          style={{ fontFamily: hv, fontSize: 14, fontWeight: 500, color: '#2C3777', background: '#FFFFFF', border: '1px solid #2C3777', borderRadius: 10, padding: '9px 16px', textDecoration: 'none', display: 'inline-block' }}
        >
          Export as PDF →
        </Link>
      </div>
    </div>
  )
}


function KeepsakeInventorySnapshot({ entry }: { entry: EntryRow }) {
  const content = entry.content as { entries?: KeepsakeItem[] } | null
  const items = content?.entries?.filter((e) => e.object?.trim()) ?? []
  if (items.length === 0) {
    return <p style={{ fontFamily: hv, fontSize: 14, color: 'rgba(26,26,26,0.56)' }}>No keepsakes saved yet.</p>
  }
  return (
    <div>
      {items.map((item, i) => (
        <div
          key={item.id}
          style={{
            padding: '20px 0',
            borderBottom: i < items.length - 1 ? '1px solid rgba(26,26,26,0.08)' : 'none',
            display: 'flex',
            gap: 12,
            alignItems: 'flex-start',
          }}
        >
          <span style={{ fontFamily: hv, fontSize: 13, fontWeight: 500, color: 'rgba(26,26,26,0.4)', minWidth: 20, flexShrink: 0, paddingTop: 1 }}>
            {i + 1}
          </span>
          <div>
            <p style={{ fontFamily: hv, fontSize: 15, fontWeight: 500, color: '#1A1A1A' }}>{item.object}</p>
            {item.recipient?.trim() && (
              <p style={{ fontFamily: hv, fontSize: 14, color: 'rgba(26,26,26,0.72)', marginTop: 2 }}>For: {item.recipient}</p>
            )}
            {item.meaning?.trim() && (
              <p style={{ fontFamily: hv, fontSize: 14, color: 'rgba(26,26,26,0.72)', marginTop: 4, lineHeight: 1.55, whiteSpace: 'pre-wrap' }}>
                {item.meaning}
              </p>
            )}
          </div>
        </div>
      ))}
      <div style={{ marginTop: 32 }}>
        <Link
          href={`/app/entries/${entry.id}/export`}
          style={{ fontFamily: hv, fontSize: 14, fontWeight: 500, color: '#2C3777', background: '#FFFFFF', border: '1px solid #2C3777', borderRadius: 10, padding: '9px 16px', textDecoration: 'none', display: 'inline-block' }}
        >
          Export as PDF →
        </Link>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// GenericEntryView — reflection prompts and other entries
// ---------------------------------------------------------------------------

function GenericEntryView({ entry }: { entry: EntryRow }) {
  const reflection = getStructuredReflection(entry)
  if (reflection) {
    return (
      <div>
        <div style={{ marginBottom: 20 }}>
          <p style={{ fontFamily: hv, fontSize: 11, fontWeight: 500, letterSpacing: '0.06em', textTransform: 'uppercase' as const, color: 'rgba(26,26,26,0.56)', marginBottom: 8 }}>
            Prompt
          </p>
          <p style={{ fontFamily: hv, fontSize: 15, color: 'rgba(26,26,26,0.8)', lineHeight: 1.6 }}>{reflection.prompt}</p>
        </div>
        <div>
          <p style={{ fontFamily: hv, fontSize: 11, fontWeight: 500, letterSpacing: '0.06em', textTransform: 'uppercase' as const, color: 'rgba(26,26,26,0.56)', marginBottom: 8 }}>
            Response
          </p>
          <p style={{ fontFamily: hv, fontSize: 15, color: '#1A1A1A', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{reflection.response}</p>
        </div>
      </div>
    )
  }
  const text = getGenericEntryText(entry)
  return (
    <div>
      {text ? (
        <p style={{ fontFamily: hv, fontSize: 15, color: '#1A1A1A', lineHeight: 1.65, whiteSpace: 'pre-wrap' }}>{text}</p>
      ) : (
        <p style={{ fontFamily: hv, fontSize: 14, color: 'rgba(26,26,26,0.56)' }}>No saved content found.</p>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Data helpers
// ---------------------------------------------------------------------------

function getStructuredReflection(entry: EntryRow): { prompt: string; response: string } | null {
  if (entry.activity !== 'reflection_prompts') return null
  if (!entry.title || typeof entry.content !== 'string') return null
  const response = entry.content.trim()
  if (!response) return null
  return { prompt: entry.title.trim(), response }
}

function getLegacyMapContent(entry: EntryRow): LegacyMapContent | null {
  if (entry.activity !== 'legacy_map') return null
  if (!entry.content || typeof entry.content !== 'object') return null
  const c = entry.content as Record<string, unknown>
  return {
    moments: Array.isArray(c.moments)
      ? c.moments
          .filter((m): m is Record<string, unknown> => !!m && typeof m === 'object')
          .map((m) => ({
            id: typeof m.id === 'string' ? m.id : '',
            title: typeof m.title === 'string' ? m.title : '',
            note: typeof m.note === 'string' ? m.note : '',
            xPercent: typeof m.xPercent === 'number' ? m.xPercent : 50,
          }))
          .filter((m) => m.title.trim())
      : [],
    themes: typeof c.themes === 'string' ? c.themes : '',
    surprises: typeof c.surprises === 'string' ? c.surprises : '',
    valuesToPassOn: typeof c.valuesToPassOn === 'string' ? c.valuesToPassOn : '',
    legacyProjects: typeof c.legacyProjects === 'string' ? c.legacyProjects : '',
    updatedAt: typeof c.updatedAt === 'string' ? c.updatedAt : null,
  }
}

function getRankingContent(entry: EntryRow): RankingContent | null {
  if (entry.activity !== 'values_ranking' && entry.activity !== 'fears_ranking') return null
  if (!entry.content || typeof entry.content !== 'object') return null
  const content = entry.content as Record<string, unknown>
  return {
    essential: Array.isArray(content.essential) ? content.essential.filter((i): i is string => typeof i === 'string') : [],
    important: Array.isArray(content.important) ? content.important.filter((i): i is string => typeof i === 'string') : [],
    less_central: Array.isArray(content.less_central) ? content.less_central.filter((i): i is string => typeof i === 'string') : [],
    reflection: typeof content.reflection === 'string' ? content.reflection : undefined,
    is_complete: typeof content.is_complete === 'boolean' ? content.is_complete : undefined,
    sorted_count: typeof content.sorted_count === 'number' ? content.sorted_count : undefined,
    total_count: typeof content.total_count === 'number' ? content.total_count : undefined,
  }
}

function getContinueHref(entry: EntryRow): string | null {
  if (entry.document_type === 'advance_directive_supplement') return '/app/capture/advance-directive'
  if (entry.document_type === 'personal_admin_info') return '/app/capture/personal-admin'
  if (entry.document_type === 'important_contacts') return '/app/capture/important-contacts'
  if (entry.document_type === 'financial_information') return '/app/capture/financial-information'
  if (entry.document_type === 'devices_and_accounts') return '/app/capture/devices-and-accounts'
  if (entry.document_type === 'keepsake_inventory') return '/app/capture/keepsake-inventory'
  if (entry.activity === 'values_ranking') return `/app/explore/values-ranking?entry=${entry.id}`
  if (entry.activity === 'fears_ranking') return `/app/explore/fears-ranking?entry=${entry.id}`
  if (entry.activity === 'legacy_map') return '/app/explore/legacy-map'
  return null
}

function getDisplayTitle(entry: EntryRow): string {
  if (entry.document_type === 'advance_directive_supplement') return 'Your Wishes'
  if (entry.document_type === 'personal_admin_info') return 'Personal Admin Info'
  if (entry.document_type === 'important_contacts') return 'Important Contacts'
  if (entry.document_type === 'financial_information') return 'Financial Information'
  if (entry.document_type === 'devices_and_accounts') return 'Devices & Accounts'
  if (entry.document_type === 'keepsake_inventory') return 'Keepsakes Inventory'
  if (entry.title?.trim()) return entry.title.trim()
  if (entry.activity === 'values_ranking') return 'Values Ranking'
  if (entry.activity === 'fears_ranking') return 'Fears Ranking'
  if (entry.activity === 'legacy_map') return 'Legacy Map'
  return 'Untitled'
}

function getGenericEntryText(entry: EntryRow): string | null {
  const content = entry.content
  if (typeof content === 'string' && content.trim().length > 0) return content.trim()
  if (!content || typeof content !== 'object') return null
  const values = Object.values(content as Record<string, unknown>)
    .filter((v) => typeof v === 'string')
    .map((v) => (v as string).trim())
    .filter(Boolean)
  return values.length > 0 ? values.join('\n\n') : null
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
