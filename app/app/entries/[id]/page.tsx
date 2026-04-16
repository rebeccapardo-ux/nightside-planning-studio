import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import FadeIn from '@/app/components/FadeIn'

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

type LegacyMoment = {
  id: string
  title: string
  note: string
  xPercent: number
}

type LegacyMapContent = {
  moments: LegacyMoment[]
  themes: string
  surprises: string
  valuesToPassOn: string
  legacyProjects: string
  updatedAt: string | null
}

export default async function EntryDetailPage({ params, searchParams }: EntryPageProps) {
  const { id } = await params
  const { returnTo } = await searchParams
  const supabase = await createSupabaseServerClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    notFound()
  }

  const { data: entry, error } = await supabase
    .from('entries')
    .select('id, title, content, created_at, section, activity, document_type')
    .eq('id', id)
    .eq('user_id', user.id)
    .single<EntryRow>()

  if (error || !entry) {
    notFound()
  }

  const ranking = getRankingContent(entry)
  const legacyMap = getLegacyMapContent(entry)
  const reflection = getStructuredReflection(entry)
  const editHref = getContinueHref(entry)
  const displayTitle = getDisplayTitle(entry)
  const formattedDate = formatDate(entry.created_at)
  const backHref = returnTo ?? '/app/materials'
  const backLabel = returnTo?.startsWith('/app/domains/') ? '← Back to area' : '← Back to My Materials'
  const isWorkingOutput = entry.activity === 'values_ranking' || entry.activity === 'fears_ranking' || entry.activity === 'legacy_map'

  // Fetch area colors for this entry
  // Colors cycle through the same palette as the materials page domain tiles,
  // keyed by the domain's alphabetical index so they stay consistent across views.
  type AreaInfo = { name: string; color: string }
  let areas: AreaInfo[] = []
  let primaryAreaColor = '#BBABF4' // fallback: brand lavender

  if (isWorkingOutput) {
    const [{ data: links }, { data: allDomains }] = await Promise.all([
      supabase.from('container_entries').select('container_id').eq('entry_id', entry.id),
      supabase.from('containers').select('id, title').eq('type', 'domain').order('title'),
    ])

    // Muted on-dark palette — matches the domain tile hues but desaturated for reflection mode
    const AREA_COLORS = ['#BBABF4', '#7b90d4', '#d4cdb5', '#e89a42', '#d96040']

    const containerIds = links?.map((l: { container_id: string }) => l.container_id) ?? []
    for (const cId of containerIds) {
      const idx = (allDomains ?? []).findIndex((d: { id: string }) => d.id === cId)
      if (idx >= 0) {
        areas.push({
          name: (allDomains![idx] as { id: string; title: string }).title,
          color: AREA_COLORS[idx % AREA_COLORS.length],
        })
      }
    }
    if (areas.length > 0) primaryAreaColor = areas[0].color
  }

  // Legacy Map working output
  if (isWorkingOutput && legacyMap) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-14">
        <div className="mb-8">
          <Link href={backHref} className="text-[#f8f4eb]/75 hover:text-[#f8f4eb] text-sm transition-colors">
            {backLabel}
          </Link>
        </div>

        <FadeIn>
          <div
            className="rounded-3xl px-10 py-12"
            style={{ backgroundColor: 'rgba(44, 20, 80, 0.55)', border: '1px solid rgba(248,244,235,0.15)' }}
          >
            <div className="mb-6 pb-10 border-b border-[#f8f4eb]/[0.15]">
              <h1 className="text-4xl font-bold text-[#f8f4eb] mb-5 underline decoration-[3px] underline-offset-[8px]"
                style={{ textDecorationColor: 'rgba(187,171,244,0.7)' }}>
                Legacy Map
              </h1>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                {formattedDate && <p className="text-sm text-[#f8f4eb]/70">{formattedDate}</p>}
                {legacyMap.moments.length > 0 && (
                  <>
                    {formattedDate && <span className="text-[#f8f4eb]/50 text-sm">·</span>}
                    <p className="text-sm text-[#f8f4eb]/70">{legacyMap.moments.length} moment{legacyMap.moments.length === 1 ? '' : 's'}</p>
                  </>
                )}
              </div>
            </div>

            <div className="flex items-center gap-5 mb-8">
              {editHref && (
                <Link href={editHref} className="text-sm text-[#f8f4eb] hover:text-[#BBABF4] transition-colors font-medium">
                  Keep working →
                </Link>
              )}
              <Link href={`/app/entries/${entry.id}/export`} className="text-sm text-[#f8f4eb]/70 hover:text-[#f8f4eb] transition-colors">
                Export →
              </Link>
            </div>

            <LegacyMapSnapshot content={legacyMap} />
          </div>
        </FadeIn>
      </div>
    )
  }

  // Values/Fears ranking working output: contained surface layout
  if (isWorkingOutput && ranking) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-14">
        {/* Back nav — outside fade, immediately visible */}
        <div className="mb-8">
          <Link href={backHref} className="text-[#f8f4eb]/75 hover:text-[#f8f4eb] text-sm transition-colors">
            {backLabel}
          </Link>
        </div>

        <FadeIn>
          {/* Single surface container */}
          <div
            className="rounded-3xl px-10 py-12"
            style={{ backgroundColor: 'rgba(44, 20, 80, 0.55)', border: '1px solid rgba(248,244,235,0.15)' }}
          >
            {/* Header */}
            <div className="mb-6 pb-10 border-b border-[#f8f4eb]/[0.15]">
              <h1
                className="text-4xl font-bold text-[#f8f4eb] mb-5 underline decoration-[3px] underline-offset-[8px]"
                style={{ textDecorationColor: primaryAreaColor + '70' }}
              >
                {displayTitle}
              </h1>

              <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                {formattedDate && (
                  <p className="text-sm text-[#f8f4eb]/70">{formattedDate}</p>
                )}
                {areas.length > 0 && (
                  <>
                    {formattedDate && <span className="text-[#f8f4eb]/50 text-sm">·</span>}
                    <p className="text-sm text-[#f8f4eb]/70">
                      {'In: '}
                      {areas.map((area, i) => (
                        <span key={area.name}>
                          {i > 0 && <span className="text-[#f8f4eb]/70">, </span>}
                          <span style={{ color: area.color + 'ff' }}>{area.name}</span>
                        </span>
                      ))}
                    </p>
                  </>
                )}
              </div>
            </div>

            {/* Actions — top, before content */}
            <div className="flex items-center gap-5 mb-8">
              {editHref && (
                <Link
                  href={editHref}
                  className="text-sm text-[#f8f4eb] hover:text-[#BBABF4] transition-colors font-medium"
                >
                  Revisit exercise →
                </Link>
              )}
              {entry.activity === 'values_ranking' && (
                <Link
                  href={`/app/entries/${entry.id}/export`}
                  className="text-sm text-[#f8f4eb]/70 hover:text-[#f8f4eb] transition-colors"
                >
                  Export →
                </Link>
              )}
            </div>

            {/* Ranking content */}
            <RankingSnapshot ranking={ranking} activity={entry.activity ?? ''} />
          </div>
        </FadeIn>
      </div>
    )
  }

  // Non-ranking entries: standard layout
  return (
    <div className="max-w-4xl mx-auto px-4 py-16">
      <div className="mb-10">
        <Link href={backHref} className="text-[#f8f4eb]/60 hover:text-[#f8f4eb] text-sm">
          {backLabel}
        </Link>
      </div>

      <div className="mb-10">
        <h1 className="text-3xl font-bold text-[#f8f4eb] mb-3">{displayTitle}</h1>
        {formattedDate && (
          <p className="text-sm text-app-secondary">{formattedDate}</p>
        )}
      </div>

      {reflection ? (
        <ReflectionEntryView prompt={reflection.prompt} response={reflection.response} />
      ) : entry.document_type === 'advance_directive_supplement' ? (
        <AdvanceDirectiveView entry={entry} />
      ) : (
        <GenericEntryView entry={entry} />
      )}

      {editHref && (
        <div className="mt-10">
          <Link href={editHref} className="text-[#f8f4eb]/75 underline hover:text-[#f8f4eb] text-sm">
            Continue working
          </Link>
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// LegacyMapSnapshot
// ---------------------------------------------------------------------------

// Shared path geometry (mirrors legacy-map/page.tsx)
const LM_VB_W = 1000; const LM_VB_H = 200; const LM_MID_Y = 100; const LM_AMP_Y = 50;

function lmPathPoint(xPct: number): { x: number; y: number } {
  const t = (Math.min(Math.max(xPct, 5), 95) - 5) / 90;
  return { x: 50 + t * 900, y: LM_MID_Y + LM_AMP_Y * Math.sin(t * 2 * Math.PI) };
}

const LM_PATH_D = (() => {
  const pts: string[] = [];
  for (let i = 0; i <= 300; i++) {
    const t = i / 300;
    pts.push(`${(50 + t * 900).toFixed(1)},${(LM_MID_Y + LM_AMP_Y * Math.sin(t * 2 * Math.PI)).toFixed(1)}`);
  }
  return `M ${pts.join(' L ')}`;
})();

function LegacyMapSnapshot({ content }: { content: LegacyMapContent }) {
  const sorted = [...content.moments].sort((a, b) => a.xPercent - b.xPercent);
  const hasReflection = content.themes || content.surprises || content.valuesToPassOn || content.legacyProjects;

  return (
    <div>
      {/* Mini path SVG */}
      {sorted.length > 0 && (
        <div className="mb-8 rounded-2xl overflow-hidden" style={{ backgroundColor: 'rgba(248,244,235,0.07)', border: '1px solid rgba(248,244,235,0.10)' }}>
          <svg
            viewBox={`0 0 ${LM_VB_W} ${LM_VB_H}`}
            preserveAspectRatio="none"
            style={{ width: '100%', height: '80px', display: 'block' }}
            aria-hidden="true"
          >
            <defs>
              <linearGradient id="snap-path-grad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%"   stopColor="#BBABF4" stopOpacity="0.5" />
                <stop offset="50%"  stopColor="#F29836" stopOpacity="0.6" />
                <stop offset="100%" stopColor="#DB5835" stopOpacity="0.7" />
              </linearGradient>
            </defs>
            <path d={LM_PATH_D} fill="none" stroke="url(#snap-path-grad)" strokeWidth="4" strokeLinecap="round" />
            {sorted.map((m) => {
              const pt = lmPathPoint(m.xPercent);
              return (
                <circle
                  key={m.id}
                  cx={pt.x}
                  cy={pt.y}
                  r="14"
                  fill="rgba(248,244,235,0.92)"
                  stroke="rgba(44,55,119,0.55)"
                  strokeWidth="3"
                />
              );
            })}
          </svg>
        </div>
      )}

      {/* Moments list in path order */}
      {sorted.length === 0 ? (
        <p className="text-[#f8f4eb]/55 text-sm">No moments added yet.</p>
      ) : (
        <div className="space-y-5 mb-8">
          {sorted.map((m, i) => (
            <div key={m.id} className="flex gap-4 items-start">
              <div
                className="shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold mt-0.5"
                style={{ backgroundColor: 'rgba(187,171,244,0.22)', color: '#BBABF4', border: '1px solid rgba(187,171,244,0.3)' }}
              >
                {i + 1}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[#f8f4eb] font-semibold text-sm leading-snug">{m.title}</p>
                {m.note && (
                  <p className="text-[#f8f4eb]/65 text-sm leading-relaxed mt-1 whitespace-pre-wrap">{m.note}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Reflection fields */}
      {hasReflection && (
        <div className="pt-8 border-t border-[#f8f4eb]/[0.12] space-y-6">
          {content.themes && (
            <ReflectionField label="Themes that stood out" text={content.themes} />
          )}
          {content.surprises && (
            <ReflectionField label="Surprises or realizations" text={content.surprises} />
          )}
          {content.valuesToPassOn && (
            <ReflectionField label="Values to pass on" text={content.valuesToPassOn} />
          )}
          {content.legacyProjects && (
            <ReflectionField label="Legacy project ideas" text={content.legacyProjects} />
          )}
        </div>
      )}
    </div>
  );
}

function ReflectionField({ label, text }: { label: string; text: string }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-[0.12em] text-[#f8f4eb]/55 mb-2">{label}</p>
      <p className="text-[#f8f4eb]/80 text-sm leading-relaxed whitespace-pre-wrap">{text}</p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// RankingSnapshot — dispatches by activity type
// ---------------------------------------------------------------------------

function RankingSnapshot({ ranking, activity }: { ranking: RankingContent; activity: string }) {
  if (activity === 'values_ranking') {
    return <ValuesCardSnapshot ranking={ranking} />
  }
  return <FearsTextSnapshot ranking={ranking} />
}

// ---------------------------------------------------------------------------
// ValuesCardSnapshot — tonal lavender hierarchy, cards as primary element
// ---------------------------------------------------------------------------

// Three levels within one tonal family:
// rich lavender → deeper → muted/desaturated.
// Hierarchy comes from tone and card visibility, not from different hues.
const VALUE_GROUPS = {
  essential: {
    sectionBg: '#BBABF4',           // richest lavender — most present
    headingColor: 'rgba(19,4,38,0.85)',
    cardText: 'rgba(19,4,38,0.92)',
  },
  important: {
    sectionBg: '#9A90D4',           // deeper, slightly more saturated purple
    headingColor: 'rgba(19,4,38,0.80)',
    cardText: 'rgba(19,4,38,0.85)',
  },
  less_central: {
    sectionBg: '#7A72B8',           // darkest, most muted — lowest emphasis
    headingColor: 'rgba(19,4,38,0.70)',
    cardText: 'rgba(19,4,38,0.75)',
  },
}

// Card is the dominant visual — consistent across all sections.
// White-tinted surface so cards pop against any lavender section bg.
function ValueCard({ value, textColor }: { value: string; textColor: string }) {
  return (
    <div
      className="rounded-xl p-4 flex items-start flex-shrink-0"
      style={{
        width: '134px',
        height: '180px',
        background: 'rgba(255,255,255,0.52)',
        border: '1px solid rgba(255,255,255,0.72)',
      }}
    >
      <span className="text-[0.9rem] leading-relaxed" style={{ color: textColor }}>
        {value}
      </span>
    </div>
  )
}

function ValuesCardSnapshot({ ranking }: { ranking: RankingContent }) {
  const hasEssential = ranking.essential.length > 0
  const hasImportant = ranking.important.length > 0
  const hasLessCentral = ranking.less_central.length > 0
  const hasReflection = !!(ranking.reflection?.trim())

  return (
    <div className="space-y-3">
      {hasEssential && (
        <section className="rounded-2xl p-6" style={{ backgroundColor: VALUE_GROUPS.essential.sectionBg }}>
          <p className="text-sm font-semibold uppercase tracking-[0.10em] mb-5"
            style={{ color: VALUE_GROUPS.essential.headingColor }}>
            Most central to me
          </p>
          <div className="flex flex-wrap gap-3">
            {ranking.essential.map((item) => (
              <ValueCard key={item} value={item} textColor={VALUE_GROUPS.essential.cardText} />
            ))}
          </div>
        </section>
      )}

      {hasImportant && (
        <section className="rounded-2xl p-6" style={{ backgroundColor: VALUE_GROUPS.important.sectionBg }}>
          <p className="text-sm font-semibold uppercase tracking-[0.10em] mb-5"
            style={{ color: VALUE_GROUPS.important.headingColor }}>
            Also important
          </p>
          <div className="flex flex-wrap gap-3">
            {ranking.important.map((item) => (
              <ValueCard key={item} value={item} textColor={VALUE_GROUPS.important.cardText} />
            ))}
          </div>
        </section>
      )}

      {hasLessCentral && (
        <section className="rounded-2xl p-6" style={{ backgroundColor: VALUE_GROUPS.less_central.sectionBg }}>
          <p className="text-sm font-semibold uppercase tracking-[0.10em] mb-4"
            style={{ color: VALUE_GROUPS.less_central.headingColor }}>
            Less central right now
          </p>
          <div className="flex flex-wrap gap-3">
            {ranking.less_central.map((item) => (
              <ValueCard key={item} value={item} textColor={VALUE_GROUPS.less_central.cardText} />
            ))}
          </div>
        </section>
      )}

      {!hasEssential && !hasImportant && !hasLessCentral && (
        <p className="text-[#f8f4eb]/65 text-sm">Nothing has been placed yet.</p>
      )}

      {hasReflection && (
        <div className="pt-8 mt-4 border-t border-[#f8f4eb]/[0.15]">
          <p className="text-xs uppercase tracking-[0.14em] text-[#f8f4eb]/65 mb-5">
            A note I wrote
          </p>
          <p className="text-[#f8f4eb]/80 leading-relaxed text-base italic whitespace-pre-wrap">
            {ranking.reflection!.trim()}
          </p>
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// FearsTextSnapshot — typographic list, breathable
// ---------------------------------------------------------------------------

function FearsTextSnapshot({ ranking }: { ranking: RankingContent }) {
  const hasEssential = ranking.essential.length > 0
  const hasImportant = ranking.important.length > 0
  const hasLessCentral = ranking.less_central.length > 0
  const hasReflection = !!(ranking.reflection?.trim())

  return (
    <div>
      {hasEssential && (
        <section className="mb-16">
          <p className="text-xs uppercase tracking-[0.14em] text-[#f8f4eb]/65 mb-4">
            Most present for me
          </p>
          <div className="space-y-5">
            {ranking.essential.map((item, i) => (
              <p
                key={item}
                className="leading-snug"
                style={{
                  fontSize: i < 2 ? '1.25rem' : '1.05rem',
                  fontWeight: i < 2 ? 600 : 500,
                  color: i < 2 ? 'rgba(248,244,235,1)' : 'rgba(248,244,235,0.88)',
                }}
              >
                {item}
              </p>
            ))}
          </div>
        </section>
      )}

      {hasImportant && (
        <section className="mb-16">
          <p className="text-xs uppercase tracking-[0.14em] text-[#f8f4eb]/65 mb-4">
            Also present
          </p>
          <div className="space-y-4">
            {ranking.important.map((item, i) => (
              <p
                key={item}
                className="leading-snug"
                style={{
                  fontSize: i < 2 ? '1.05rem' : '1rem',
                  fontWeight: i < 2 ? 500 : 400,
                  color: i < 2 ? 'rgba(248,244,235,0.82)' : 'rgba(248,244,235,0.70)',
                }}
              >
                {item}
              </p>
            ))}
          </div>
        </section>
      )}

      {hasLessCentral && (
        <section className="mb-16">
          <p className="text-xs uppercase tracking-[0.14em] text-[#f8f4eb]/65 mb-4">
            Less present right now
          </p>
          <div className="space-y-3">
            {ranking.less_central.map((item) => (
              <p key={item} className="text-sm text-[#f8f4eb]/60 leading-snug">
                {item}
              </p>
            ))}
          </div>
        </section>
      )}

      {!hasEssential && !hasImportant && !hasLessCentral && (
        <p className="text-app-tertiary text-sm">Nothing has been placed yet.</p>
      )}

      {hasReflection && (
        <div className="mt-4 pt-12 border-t border-[#f8f4eb]/[0.07]">
          <p className="text-xs uppercase tracking-[0.14em] text-[#f8f4eb]/65 mb-5">
            A note I wrote
          </p>
          <p className="text-[#f8f4eb]/70 leading-relaxed text-base italic whitespace-pre-wrap">
            {ranking.reflection!.trim()}
          </p>
        </div>
      )}

      <div className="mt-14">
        <details>
          <summary className="text-xs text-[#f8f4eb]/60 cursor-pointer hover:text-[#f8f4eb] transition-colors list-none select-none">
            About this exercise
          </summary>
          <p className="text-xs text-[#f8f4eb]/60 mt-3 leading-relaxed max-w-sm">
            You sorted a set of fears by how much they resonate with you, placing the ones that feel most present at the top.
          </p>
        </details>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Other entry views (unchanged)
// ---------------------------------------------------------------------------

function ReflectionEntryView({ prompt, response }: { prompt: string; response: string }) {
  return (
    <div className="rounded-2xl border border-[#f8f4eb]/10 bg-[#f8f4eb]/[0.03] p-6">
      <div className="mb-5">
        <div className="text-xs uppercase tracking-[0.12em] text-app-tertiary mb-2">Prompt</div>
        <p className="text-[#f8f4eb]/70 leading-relaxed">{prompt}</p>
      </div>
      <div>
        <div className="text-xs uppercase tracking-[0.12em] text-app-tertiary mb-2">Response</div>
        <p className="text-[#f8f4eb] leading-relaxed whitespace-pre-wrap">{response}</p>
      </div>
    </div>
  )
}

function AdvanceDirectiveView({ entry }: { entry: EntryRow }) {
  const content = entry.content
  if (!content || typeof content !== 'object') {
    return (
      <div className="rounded-2xl border border-[#f8f4eb]/10 bg-[#f8f4eb]/[0.03] p-6">
        <p className="text-[#f8f4eb]/60">No saved content found.</p>
      </div>
    )
  }
  const fields = Object.entries(content as Record<string, unknown>).filter(
    ([, value]) => typeof value === 'string' && (value as string).trim().length > 0
  ) as Array<[string, string]>
  return (
    <div className="space-y-4">
      {fields.length === 0 ? (
        <div className="rounded-2xl border border-[#f8f4eb]/10 bg-[#f8f4eb]/[0.03] p-6">
          <p className="text-[#f8f4eb]/60">No saved content found.</p>
        </div>
      ) : (
        fields.map(([key, value]) => (
          <div key={key} className="rounded-2xl border border-[#f8f4eb]/10 bg-[#f8f4eb]/[0.03] p-6">
            <div className="text-xs uppercase tracking-[0.12em] text-app-tertiary mb-2">
              {formatFieldLabel(key)}
            </div>
            <p className="text-[#f8f4eb] leading-relaxed whitespace-pre-wrap">{value}</p>
          </div>
        ))
      )}
    </div>
  )
}

function GenericEntryView({ entry }: { entry: EntryRow }) {
  const textContent = getGenericEntryText(entry)
  return (
    <div className="rounded-2xl border border-[#f8f4eb]/10 bg-[#f8f4eb]/[0.03] p-6">
      {textContent ? (
        <p className="text-[#f8f4eb] leading-relaxed whitespace-pre-wrap">{textContent}</p>
      ) : (
        <p className="text-[#f8f4eb]/60">No saved content found.</p>
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
    essential: Array.isArray(content.essential)
      ? content.essential.filter((i): i is string => typeof i === 'string') : [],
    important: Array.isArray(content.important)
      ? content.important.filter((i): i is string => typeof i === 'string') : [],
    less_central: Array.isArray(content.less_central)
      ? content.less_central.filter((i): i is string => typeof i === 'string') : [],
    reflection: typeof content.reflection === 'string' ? content.reflection : undefined,
    is_complete: typeof content.is_complete === 'boolean' ? content.is_complete : undefined,
    sorted_count: typeof content.sorted_count === 'number' ? content.sorted_count : undefined,
    total_count: typeof content.total_count === 'number' ? content.total_count : undefined,
  }
}

function getContinueHref(entry: EntryRow): string | null {
  if (entry.document_type === 'advance_directive_supplement') return '/app/capture/advance-directive'
  if (entry.activity === 'values_ranking') return `/app/explore/values-ranking?entry=${entry.id}`
  if (entry.activity === 'fears_ranking') return `/app/explore/fears-ranking?entry=${entry.id}`
  if (entry.activity === 'legacy_map') return '/app/explore/legacy-map'
  return null
}

function getDisplayTitle(entry: EntryRow): string {
  if (entry.title?.trim()) return entry.title.trim()
  if (entry.document_type === 'advance_directive_supplement') return 'Advance Directive Supplement'
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

function formatDate(dateString: string | null): string | null {
  if (!dateString) return null
  const date = new Date(dateString)
  if (Number.isNaN(date.getTime())) return null
  return date.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })
}

function formatFieldLabel(key: string): string {
  return key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}
