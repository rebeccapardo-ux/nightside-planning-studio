import type { Metadata } from 'next'
import Link from 'next/link'
import { ACTIVITY, isStructuredActivity, isRankingActivity, DOCUMENT_TYPE_META, DOCUMENT_TYPE, isCaptureDocument } from '@/lib/content-metadata'
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

// Thumbnail geometry for snapshot card (viewBox 0 0 460 200)
const LM_THUMB_MID_Y = 80
const LM_THUMB_AMP_Y = 45

function lmThumbPoint(xPct: number): { x: number; y: number } {
  const t = Math.max(0, Math.min(1, xPct / 100))
  return { x: 44 + t * 392, y: LM_THUMB_MID_Y + LM_THUMB_AMP_Y * Math.sin(t * 2 * Math.PI) }
}

const LM_THUMB_PATH_D = (() => {
  const pts: string[] = []
  for (let i = 0; i <= 300; i++) {
    const t = i / 300
    pts.push(`${(44 + t * 392).toFixed(1)},${(LM_THUMB_MID_Y + LM_THUMB_AMP_Y * Math.sin(t * 2 * Math.PI)).toFixed(1)}`)
  }
  return `M ${pts.join(' L ')}`
})()

function lmThumbCircleColor(i: number, total: number): string {
  if (total <= 1) return '#F29836'
  if (i < total / 3) return '#BBABF4'
  if (i < (2 * total) / 3) return '#F29836'
  return '#DB5835'
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------


export const metadata: Metadata = {
  title: "Entry",
}

export default async function EntryDetailPage({ params, searchParams }: EntryPageProps) {
  const { id } = await params
  const { returnTo } = await searchParams
  const supabase = await createSupabaseServerClient()

  const { data: { user } } = await supabase.auth.getUser()
  // proxy.ts middleware enforces auth on /app/*; this branch is unreachable.
  // The throw preserves type narrowing for user.id below.
  // (notFound() is still used legitimately further down for missing-entry cases.)
  if (!user) throw new Error('Unreachable: auth middleware bypassed on /app/entries/[id]')

  const { data: entry, error } = await supabase
    .from('entries')
    .select('id, title, content, created_at, section, activity, document_type')
    .eq('id', id)
    .eq('user_id', user.id)
    .single<EntryRow>()

  if (error || !entry) notFound()

  const ranking = getRankingContent(entry)
  const legacyMap = getLegacyMapContent(entry)

  // Activity reflections live in the notes table (origin_type='reflection'), linked to the
  // entry via entry_notes — not in entries.content (the migration cleared content.reflection /
  // content.themes). Pull the linked reflection note so this view still renders it.
  let reflectionFromNote: string | undefined
  if (
    entry.activity === ACTIVITY.VALUES_RANKING ||
    entry.activity === ACTIVITY.FEARS_RANKING ||
    entry.activity === ACTIVITY.LEGACY_MAP
  ) {
    const { data: links } = await supabase.from('entry_notes').select('note_id').eq('entry_id', entry.id)
    const noteIds = (links ?? []).map((l) => l.note_id as string)
    if (noteIds.length > 0) {
      const { data: note } = await supabase
        .from('notes')
        .select('content')
        .in('id', noteIds)
        .eq('origin_type', 'reflection')
        .limit(1)
        .maybeSingle()
      reflectionFromNote = (note?.content as string | undefined) ?? undefined
    }
  }
  if (reflectionFromNote && ranking) ranking.reflection = reflectionFromNote

  const userName = (user.user_metadata?.full_name as string | undefined) ??
                   (user.user_metadata?.name as string | undefined) ??
                   user.email ?? ''
  const editHref = getContinueHref(entry)
  const displayTitle = getDisplayTitle(entry)
  const formattedDate = formatDate(entry.created_at)
  const isDocument = !!entry.document_type

  // No explicit returnTo → the entry was reached from the materials library.
  const backHref = returnTo ?? '/app/plan/materials'
  const backLabel = returnTo?.startsWith('/app/domains/') ? '← Back to area' : '← Back to Your Materials'

  // Date line
  let dateLine = formattedDate ?? ''
  if (isDocument && formattedDate) {
    dateLine = `Last saved ${formattedDate}`
  }
  if ((isStructuredActivity(entry.activity)) && formattedDate) {
    dateLine = `Last saved ${formattedDate}`
  }

  const showExport = entry.activity === ACTIVITY.VALUES_RANKING || entry.activity === ACTIVITY.LEGACY_MAP || isDocument
  const editLabel = entry.document_type === DOCUMENT_TYPE.FINANCIAL_INFORMATION
    ? '← Continue editing'
    : isDocument
      ? 'Continue editing →'
      : entry.activity === ACTIVITY.LEGACY_MAP
        ? 'Keep working →'
        : 'Revisit exercise →'

  const maxWidth = isDocument ? 680 : 800

  return (
    <div className="min-h-screen" style={{ background: (isCaptureDocument(entry.document_type) || isStructuredActivity(entry.activity)) ? '#CBBBEA' : '#F8F4EB' }}>
      <div style={{ maxWidth, margin: '0 auto', padding: '48px 24px 80px' }}>

        {/* Back link — not shown on document or ranking snapshot views */}
        {!isCaptureDocument(entry.document_type) && !isStructuredActivity(entry.activity) && (
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
        {(isStructuredActivity(entry.activity)) && editHref && (
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
            style={{ background: (isCaptureDocument(entry.document_type) || isStructuredActivity(entry.activity)) ? '#F8F4EB' : '#FFFFFF', border: '1px solid rgba(26,26,26,0.1)', borderRadius: 12 }}
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
              {(isStructuredActivity(entry.activity)) && (
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
              <p style={{ fontFamily: hv, fontSize: 13, color: 'var(--color-text-muted)', marginBottom: (isDocument || isStructuredActivity(entry.activity)) ? 16 : 24 }}>
                {dateLine}
              </p>
            )}

            {/* Disclaimer — documents only */}
            {isDocument && (
              <>
                <p style={{ fontFamily: hv, fontSize: 14, color: 'var(--color-text-muted)', marginBottom: (isCaptureDocument(entry.document_type)) ? 8 : 24, lineHeight: 1.55 }}>
                  This is a record of your responses at the time of your last save. It is not a legal document.
                </p>
                {entry.document_type === DOCUMENT_TYPE.FINANCIAL_INFORMATION && (
                  <p style={{ fontFamily: hv, fontSize: 14, color: 'var(--color-text-muted)', marginBottom: 24, lineHeight: 1.55 }}>
                    Account numbers added here will be included in this export, but <strong>won&apos;t be saved to your plan.</strong>
                  </p>
                )}
                {entry.document_type === DOCUMENT_TYPE.PERSONAL_ADMIN_INFO && (
                  <p style={{ fontFamily: hv, fontSize: 14, color: 'var(--color-text-muted)', marginBottom: 24, lineHeight: 1.55 }}>
                    SIN and health card numbers added here will be included in this export, but <strong>won&apos;t be saved to your plan.</strong>
                  </p>
                )}
                {entry.document_type === DOCUMENT_TYPE.DEVICES_AND_ACCOUNTS && (
                  <p style={{ fontFamily: hv, fontSize: 14, color: 'var(--color-text-muted)', marginBottom: 24, lineHeight: 1.55 }}>
                    Passwords and PIN numbers added here will be included in this export, but <strong>won&apos;t be saved to your plan.</strong>
                  </p>
                )}
              </>
            )}

            {isRankingActivity(entry.activity) && (
              <p style={{ fontFamily: hv, fontSize: 14, color: 'var(--color-text-muted)', marginBottom: 8, lineHeight: 1.55 }}>
                This is a record of your responses at the time of your last save. It is not a legal document.
              </p>
            )}
            {entry.activity === ACTIVITY.LEGACY_MAP && (
              <p style={{ fontFamily: hv, fontSize: 14, color: 'var(--color-text-muted)', marginBottom: 8, lineHeight: 1.55 }}>
                This document maps meaningful moments and reflections from across your life.
              </p>
            )}

            {/* Divider */}
            <div style={{ height: 1, background: 'rgba(26,26,26,0.1)', margin: '24px 0' }} />

            {/* Action links */}
            {entry.activity !== ACTIVITY.LEGACY_MAP && <div style={{ display: 'flex', alignItems: 'center', gap: 24, marginBottom: 32 }}>
              {editHref && !isCaptureDocument(entry.document_type) && !isStructuredActivity(entry.activity) && (
                <Link
                  href={editHref}
                  style={{ fontFamily: hv, fontSize: 14, fontWeight: 500, color: '#1A1A1A', textDecoration: 'none' }}
                  className="hover:underline"
                >
                  {editLabel}
                </Link>
              )}
              {showExport && !isCaptureDocument(entry.document_type) && !isStructuredActivity(entry.activity) && (
                <Link
                  href={`/app/entries/${entry.id}/export`}
                  style={{ fontFamily: hv, fontSize: 14, fontWeight: 500, color: '#1A1A1A', textDecoration: 'none' }}
                  className="hover:underline"
                >
                  Export →
                </Link>
              )}
            </div>}

            {/* Content */}
            {legacyMap ? (
              <LegacyMapSnapshot content={legacyMap} id={entry.id} userName={userName} reflection={reflectionFromNote ?? (legacyMap.themes || undefined)} />
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

function LegacyMapSnapshot({ content, id, userName, reflection }: { content: LegacyMapContent; id: string; userName: string; reflection?: string }) {
  const sorted = [...content.moments].sort((a, b) => a.xPercent - b.xPercent)
  const n = sorted.length

  return (
    <div>
      {/* White landscape thumbnail card */}
      <div style={{
        background: '#ffffff',
        aspectRatio: '1.414 / 1',
        width: '100%',
        borderRadius: 8,
        boxShadow: '0 2px 16px rgba(0,0,0,0.08)',
        overflow: 'hidden',
        position: 'relative',
      }}>
        <svg
          viewBox="0 0 460 200"
          preserveAspectRatio="xMidYMid meet"
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', display: 'block' }}
          aria-hidden="true"
        >
          <defs>
            <linearGradient id="lm-thumb-grad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#BBABF4" />
              <stop offset="50%" stopColor="#F29836" />
              <stop offset="100%" stopColor="#DB5835" />
            </linearGradient>
          </defs>
          <line x1="20" y1="160" x2="440" y2="160" stroke="#f0ece4" strokeWidth="1" />
          <text x="20" y="175" fontSize="9" fill="rgba(19,4,38,0.65)">Birth</text>
          <text x="415" y="175" fontSize="9" fill="rgba(19,4,38,0.65)">Now</text>
          {n > 0 && (
            <path d={LM_THUMB_PATH_D} fill="none" stroke="url(#lm-thumb-grad)" strokeWidth="2" strokeLinecap="round" />
          )}
          {sorted.map((m, i) => {
            const pt = lmThumbPoint(m.xPercent)
            const color = lmThumbCircleColor(i, n)
            return (
              <g key={m.id}>
                <circle cx={pt.x} cy={pt.y} r={9} fill="#ffffff" stroke={color} strokeWidth="1.5" />
                <text x={pt.x} y={pt.y + 3.5} fontSize="9" fontWeight="600" fill="#2C3777" textAnchor="middle">{i + 1}</text>
              </g>
            )
          })}
        </svg>
      </div>

      {/* Moment list */}
      {sorted.length > 0 && (
        <div style={{ marginTop: 24 }}>
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
                width: 22, height: 22, borderRadius: '50%',
                background: '#F8F4EB', border: '1.5px solid #1A1A1A', color: '#1A1A1A',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontFamily: hv, fontSize: 11, fontWeight: 600, flexShrink: 0, marginTop: 2,
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

      {/* Reflection — the single free-text reflection, now sourced from its linked note. */}
      {reflection?.trim() && (
        <div style={{ marginTop: 32 }}>
          <div style={{ marginBottom: 28 }}>
            <p style={{ fontFamily: hv, fontSize: 11, fontWeight: 500, letterSpacing: '0.08em', color: 'var(--color-text-muted)', marginBottom: 6, textTransform: 'uppercase' as const }}>
              REFLECTIONS
            </p>
            <p style={{ fontFamily: hv, fontSize: 15, color: '#1A1A1A', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
              {reflection.trim()}
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// RankingSnapshot
// ---------------------------------------------------------------------------

function RankingSnapshot({ ranking, activity, id }: { ranking: RankingContent; activity: string; id: string }) {
  if (activity === ACTIVITY.VALUES_RANKING) {
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
        <p style={{ fontFamily: hv, fontSize: 14, color: 'var(--color-text-muted)' }}>Nothing has been placed yet.</p>
      )}

      {hasReflection && (
        <div style={{ marginTop: 16, paddingTop: 8 }}>
          <p style={{
            fontFamily: hv,
            fontSize: 11,
            fontWeight: 500,
            letterSpacing: '0.08em',
            color: 'var(--color-text-muted)',
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
        <p style={{ fontFamily: hv, fontSize: 14, color: 'var(--color-text-muted)' }}>Nothing has been placed yet.</p>
      )}

      {hasReflection && (
        <div style={{ marginTop: 8, paddingTop: 24, borderTop: '1px solid rgba(26,26,26,0.08)' }}>
          <p style={{ fontFamily: hv, fontSize: 11, fontWeight: 500, letterSpacing: '0.08em', color: 'var(--color-text-muted)', marginBottom: 8, textTransform: 'uppercase' as const }}>
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
  if (entry.document_type === DOCUMENT_TYPE.IMPORTANT_CONTACTS) {
    return <ImportantContactsSnapshot entry={entry} />
  }
  if (entry.document_type === DOCUMENT_TYPE.FINANCIAL_INFORMATION) {
    return <FinancialInformationSnapshot entry={entry} />
  }
  if (entry.document_type === DOCUMENT_TYPE.PERSONAL_ADMIN_INFO) {
    return <PersonalAdminSnapshot entry={entry} />
  }
  if (entry.document_type === DOCUMENT_TYPE.DEVICES_AND_ACCOUNTS) {
    return <DevicesAndAccountsSnapshot entry={entry} />
  }
  if (entry.document_type === DOCUMENT_TYPE.KEEPSAKE_INVENTORY) {
    return <KeepsakeInventorySnapshot entry={entry} />
  }
  if (entry.document_type === DOCUMENT_TYPE.ADVANCE_DIRECTIVE_SUPPLEMENT) {
    return <AdvanceDirectiveSnapshot entry={entry} />
  }
  if (entry.document_type === DOCUMENT_TYPE.FUNERAL_WISHES) {
    return <FuneralWishesSnapshot entry={entry} />
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
    return <p style={{ fontFamily: hv, fontSize: 14, color: 'var(--color-text-muted)' }}>No content saved yet.</p>
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

const FW_SECTIONS: { key: string; title: string; fields: { key: string; label: string }[] }[] = [
  { key: 'what_matters_most', title: 'What Matters Most', fields: [
    { key: 'whatMattersMost', label: 'What matters most to me' },
  ]},
  { key: 'organ_donation', title: 'Organ & Tissue Donation', fields: [
    { key: 'organDonationWishes', label: 'My donation wishes' },
    { key: 'organDonationSpecific', label: 'Specific organs or tissues' },
    { key: 'organDonationNotes', label: 'Other notes' },
  ]},
  { key: 'final_resting_place', title: 'Final Resting Place', fields: [
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
  { key: 'ceremony', title: 'Ceremony', fields: [
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
  { key: 'obituary', title: 'Obituary', fields: [
    { key: 'obituaryWants', label: 'Do I want an obituary' },
    { key: 'obituaryContent', label: 'What to include' },
    { key: 'obituaryWriter', label: 'Who should write it' },
    { key: 'obituaryPublications', label: 'Where to publish' },
    { key: 'obituaryOnline', label: 'Online presence' },
  ]},
  { key: 'note_to_others', title: 'Note to Others', fields: [
    { key: 'noteToOthers', label: 'My note to others' },
  ]},
]

function FuneralWishesSnapshot({ entry }: { entry: EntryRow }) {
  const c = (entry.content && typeof entry.content === 'object' ? entry.content : {}) as Record<string, unknown>
  const hasAny = FW_SECTIONS.some(s => s.fields.some(f => {
    if (f.key === 'dispositionTypes') return Array.isArray(c.dispositionTypes) && (c.dispositionTypes as string[]).length > 0
    return typeof c[f.key] === 'string' && (c[f.key] as string).trim()
  }))
  if (!hasAny) {
    return <p style={{ fontFamily: hv, fontSize: 14, color: 'var(--color-text-muted)' }}>No content saved yet.</p>
  }
  let firstSection = true
  return (
    <div>
      {FW_SECTIONS.map(section => {
        const visibleFields = section.fields.filter(f => {
          if (f.key === 'dispositionTypes') return Array.isArray(c.dispositionTypes) && (c.dispositionTypes as string[]).length > 0
          return typeof c[f.key] === 'string' && (c[f.key] as string).trim()
        })
        if (visibleFields.length === 0) return null
        const isFirst = firstSection; firstSection = false
        return (
          <div key={section.key} style={{ marginBottom: 32, marginTop: isFirst ? 0 : 32 }}>
            <p style={{ fontFamily: hv, fontSize: 17, fontWeight: 500, color: 'rgba(26,26,26,0.85)', marginBottom: 16 }}>
              {section.title}
            </p>
            {visibleFields.map((f, i) => {
              const value = f.key === 'dispositionTypes'
                ? (c.dispositionTypes as string[]).join(', ')
                : c[f.key] as string
              return (
                <div key={f.key} style={{ marginBottom: i < visibleFields.length - 1 ? 20 : 0 }}>
                  <p style={{ fontFamily: hv, fontSize: 12, color: 'rgba(26,26,26,0.6)', marginBottom: 5 }}>{f.label}</p>
                  <p style={{ fontFamily: hv, fontSize: 15, color: '#1A1A1A', lineHeight: 1.65, whiteSpace: 'pre-wrap' }}>{value}</p>
                </div>
              )
            })}
          </div>
        )
      })}
      <div style={{ marginTop: 8 }}>
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
    return <p style={{ fontFamily: hv, fontSize: 14, color: 'var(--color-text-muted)' }}>No content saved yet.</p>
  }
  const fields = (Object.entries(content as Record<string, unknown>)
    .filter(([, v]) => typeof v === 'string' && (v as string).trim().length > 0)) as [string, string][]
  if (fields.length === 0) {
    return <p style={{ fontFamily: hv, fontSize: 14, color: 'var(--color-text-muted)' }}>No content saved yet.</p>
  }
  return (
    <div>
      {fields.map(([key, value], i) => (
        <div key={key} style={{ marginBottom: i < fields.length - 1 ? 28 : 0 }}>
          <p style={{ fontFamily: hv, fontSize: 11, fontWeight: 500, letterSpacing: '0.06em', color: 'var(--color-text-muted)', textTransform: 'uppercase' as const, marginBottom: 6 }}>
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
  if (!content) return <p style={{ fontFamily: hv, fontSize: 14, color: 'var(--color-text-muted)' }}>No contacts saved yet.</p>

  // New array-based format
  if (Array.isArray(content.healthcare) || Array.isArray(content.legal) || Array.isArray(content.relatives) || Array.isArray(content.friends)) {
    type NewContact = { id: string; name: string; role: string; phone: string; email: string; address: string }
    const sections: { key: string; label: string }[] = [
      { key: 'healthcare', label: 'Doctors & Healthcare' },
      { key: 'legal', label: 'Legal & Decision-Makers' },
      { key: 'relatives', label: 'Relatives' },
      { key: 'friends', label: 'Friends & Support Network' },
      { key: 'spiritual', label: 'Spiritual / Religious' },
      { key: 'financial', label: 'Financial & Professional Services' },
      { key: 'other', label: 'Other Important Contacts' },
    ]
    const hasAny = sections.some(s => ((content[s.key] as NewContact[]) ?? []).some(c => c.name?.trim() || c.phone?.trim() || c.email?.trim()))
    if (!hasAny) return <p style={{ fontFamily: hv, fontSize: 14, color: 'var(--color-text-muted)' }}>No contacts saved yet.</p>
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
                    {c.role?.trim() && <p style={{ fontFamily: hv, fontSize: 14, color: 'var(--color-text-muted)' }}>{c.role}</p>}
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
    return <p style={{ fontFamily: hv, fontSize: 14, color: 'var(--color-text-muted)' }}>No keepsakes saved yet.</p>
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
          <p style={{ fontFamily: hv, fontSize: 11, fontWeight: 500, letterSpacing: '0.06em', textTransform: 'uppercase' as const, color: 'var(--color-text-muted)', marginBottom: 8 }}>
            Prompt
          </p>
          <p style={{ fontFamily: hv, fontSize: 15, color: 'rgba(26,26,26,0.8)', lineHeight: 1.6 }}>{reflection.prompt}</p>
        </div>
        <div>
          <p style={{ fontFamily: hv, fontSize: 11, fontWeight: 500, letterSpacing: '0.06em', textTransform: 'uppercase' as const, color: 'var(--color-text-muted)', marginBottom: 8 }}>
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
        <p style={{ fontFamily: hv, fontSize: 14, color: 'var(--color-text-muted)' }}>No saved content found.</p>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Data helpers
// ---------------------------------------------------------------------------

function getStructuredReflection(entry: EntryRow): { prompt: string; response: string } | null {
  if (entry.activity !== ACTIVITY.REFLECTION_PROMPTS) return null
  if (!entry.title || typeof entry.content !== 'string') return null
  const response = entry.content.trim()
  if (!response) return null
  return { prompt: entry.title.trim(), response }
}

function getLegacyMapContent(entry: EntryRow): LegacyMapContent | null {
  if (entry.activity !== ACTIVITY.LEGACY_MAP) return null
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
  if (!isRankingActivity(entry.activity)) return null
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
  if (entry.document_type === DOCUMENT_TYPE.ADVANCE_DIRECTIVE_SUPPLEMENT) return DOCUMENT_TYPE_META.advance_directive_supplement.href
  if (entry.document_type === DOCUMENT_TYPE.FUNERAL_WISHES) return DOCUMENT_TYPE_META.funeral_wishes.href
  if (entry.document_type === DOCUMENT_TYPE.PERSONAL_ADMIN_INFO) return DOCUMENT_TYPE_META.personal_admin_info.href
  if (entry.document_type === DOCUMENT_TYPE.IMPORTANT_CONTACTS) return DOCUMENT_TYPE_META.important_contacts.href
  if (entry.document_type === DOCUMENT_TYPE.FINANCIAL_INFORMATION) return DOCUMENT_TYPE_META.financial_information.href
  if (entry.document_type === DOCUMENT_TYPE.DEVICES_AND_ACCOUNTS) return DOCUMENT_TYPE_META.devices_and_accounts.href
  if (entry.document_type === DOCUMENT_TYPE.KEEPSAKE_INVENTORY) return DOCUMENT_TYPE_META.keepsake_inventory.href
  if (entry.activity === ACTIVITY.VALUES_RANKING) return `/app/reflect/values-ranking?entry=${entry.id}`
  if (entry.activity === ACTIVITY.FEARS_RANKING) return `/app/reflect/fears-ranking?entry=${entry.id}`
  if (entry.activity === ACTIVITY.LEGACY_MAP) return '/app/reflect/legacy-map'
  return null
}

function getDisplayTitle(entry: EntryRow): string {
  if (entry.document_type === DOCUMENT_TYPE.ADVANCE_DIRECTIVE_SUPPLEMENT) return DOCUMENT_TYPE_META.advance_directive_supplement.label
  if (entry.document_type === DOCUMENT_TYPE.FUNERAL_WISHES) return DOCUMENT_TYPE_META.funeral_wishes.label
  if (entry.document_type === DOCUMENT_TYPE.PERSONAL_ADMIN_INFO) return DOCUMENT_TYPE_META.personal_admin_info.label
  if (entry.document_type === DOCUMENT_TYPE.IMPORTANT_CONTACTS) return DOCUMENT_TYPE_META.important_contacts.label
  if (entry.document_type === DOCUMENT_TYPE.FINANCIAL_INFORMATION) return DOCUMENT_TYPE_META.financial_information.label
  if (entry.document_type === DOCUMENT_TYPE.DEVICES_AND_ACCOUNTS) return DOCUMENT_TYPE_META.devices_and_accounts.label
  if (entry.document_type === DOCUMENT_TYPE.KEEPSAKE_INVENTORY) return DOCUMENT_TYPE_META.keepsake_inventory.label
  if (entry.title?.trim()) return entry.title.trim()
  if (entry.activity === ACTIVITY.VALUES_RANKING) return 'Values Ranking'
  if (entry.activity === ACTIVITY.FEARS_RANKING) return 'Fears Ranking'
  if (entry.activity === ACTIVITY.LEGACY_MAP) return 'Legacy Map'
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
