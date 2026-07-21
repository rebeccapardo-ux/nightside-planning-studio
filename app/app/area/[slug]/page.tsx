import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { ensureCanonicalDomains } from '@/lib/ensure-canonical-domains'
import { areaBySlug } from '@/lib/areas'
import AreaPlanSection from '@/app/components/area/AreaPlanSection'
import AreaHeader from '@/app/components/area/AreaHeader'
import AreaResources from '@/app/components/area/AreaResources'
import AdvanceCarePlanningSummary from '@/app/components/area/AdvanceCarePlanningSummary'
import CollapsibleSection from '@/app/components/area/CollapsibleSection'
import { areaBandInnerStyle } from '@/app/components/area/areaBand'
import { hasResources } from '@/lib/resources'
import { healthcareSummaryFor } from '@/lib/healthcare-summaries'
import ActivityIcon from '@/app/components/ActivityIcon'
import type { AreaSlug } from '@/lib/areas'
import HealthcareLearnContent from '@/app/components/area/learn/HealthcareLearnContent'
import DeathcareLearnContent from '@/app/components/area/learn/DeathcareLearnContent'
import WillsLearnContent from '@/app/components/area/learn/WillsLearnContent'
import LegacyLearnContent from '@/app/components/area/learn/LegacyLearnContent'
import PersonalAdminLearnContent from '@/app/components/area/learn/PersonalAdminLearnContent'
import RitualLearnContent from '@/app/components/area/learn/RitualLearnContent'

const hv = "'Helvetica Neue', Helvetica, Arial, sans-serif"

// Per-area Overview band content — each reflowed from its original Learn page.
const LEARN_CONTENT: Record<AreaSlug, React.ComponentType> = {
  'healthcare-wishes': HealthcareLearnContent,
  'deathcare': DeathcareLearnContent,
  'wills-and-estates': WillsLearnContent,
  'legacy': LegacyLearnContent,
  'personal-admin': PersonalAdminLearnContent,
  'ritual-and-ceremony': RitualLearnContent,
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const area = areaBySlug(slug)
  return { title: area?.title ?? 'Plan by area' }
}

// New per-area page (/app/area/[slug]) — Relevant Activities + Plan in one place,
// organised by topic. Resolves the URL slug → domain_code → the user's container, then
// renders the shared <AreaPlanSection> for the Plan workspace. All six areas have their
// own Overview band content (reflowed from the original Learn page).
export default async function AreaPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const area = areaBySlug(slug)
  if (!area) notFound()

  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unreachable: auth middleware bypassed on /app/area')

  await ensureCanonicalDomains(supabase, user.id)

  const [{ data: containers }, { data: entries }] = await Promise.all([
    supabase.from('containers').select('id, domain_code').eq('type', 'domain').eq('user_id', user.id),
    supabase.from('entries').select('id, activity').eq('user_id', user.id).not('activity', 'is', null),
  ])

  const container = (containers ?? []).find((c) => c.domain_code === area.domainCode)
  if (!container) notFound() // ensureCanonicalDomains should have seeded it

  // Resolve each 'output' activity to the user's entry (Continue/Export vs Start).
  const entryByActivity = new Map<string, string>()
  for (const e of entries ?? []) { if (e.activity && !entryByActivity.has(e.activity)) entryByActivity.set(e.activity, e.id) }

  // Per-area Overview band content (all six areas).
  const LearnContent = LEARN_CONTENT[area.slug]
  const learnContent = LearnContent ? <LearnContent /> : null
  const hasActivities = !!area.activities && area.activities.length > 0

  // Province-specific resources. Province lives in user_metadata (read via getUser above,
  // so it's fresh — never a decoded token). The Resources section renders only for domains
  // with resource data seeded (Healthcare for now); the other areas stay unchanged.
  const province = (user.user_metadata?.province as string | undefined) || undefined
  const showResources = hasResources(area.domainCode)

  // Province-specific advance-care-planning summary (Healthcare only). When one exists for the
  // user's province, the Overview band becomes "What you need to know" with two collapsible
  // sub-sections ("The basics" + "Advance care planning in {Province}"); otherwise it stays the
  // plain "Overview" band. Ontario only for now — other provinces fall back until authored.
  const acpSummary = area.domainCode === 'healthcare' ? healthcareSummaryFor(province) : null
  const acpContent = acpSummary ? <AdvanceCarePlanningSummary summary={acpSummary} /> : undefined
  const acpTitle = acpSummary ? `Advance care planning in ${province}` : undefined

  // Section backgrounds alternate cream/lavender BOTTOM-UP from Plan (always lavender) so
  // no two adjacent bands share a color — no divider needed. Order top→bottom:
  // Overview → [Resources] → [Activities] → Plan. Plan stays lavender (its Planning Status
  // / Your-thoughts design is tuned to it). Areas without a Resources band keep their prior
  // colors (e.g. lavender Overview when Activities is present, cream when it isn't).
  const CREAM = '#F8F4EB'
  const LAVENDER = '#ECE7F7'
  const bandOrder: string[] = ['overview']
  if (showResources) bandOrder.push('resources')
  if (hasActivities) bandOrder.push('activities')
  bandOrder.push('plan')
  const bandBg: Record<string, string> = {}
  bandOrder.slice().reverse().forEach((key, i) => { bandBg[key] = i % 2 === 0 ? LAVENDER : CREAM })
  const overviewBg = bandBg.overview
  const resourcesBg = bandBg.resources ?? CREAM
  const activitiesBg = bandBg.activities ?? CREAM
  const planBg = bandBg.plan

  return (
    // Page base is the dark footer colour (#130426), so the min-h-screen filler below
    // the final section reads as the footer zone — not as a stray cream bar, and not as
    // an over-tall extension of the lavender Plan section.
    <div className="min-h-screen" style={{ background: '#130426' }}>
      <style>{`
        .area-activity-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px; }
        @media (max-width: 720px) { .area-activity-grid { grid-template-columns: 1fr; } }
      `}</style>

      <AreaHeader slug={area.slug} title={area.title} intro={area.intro} bandBg={overviewBg} acpTitle={acpTitle} acpContent={acpContent}>{learnContent}</AreaHeader>

      {/* ── Resources — embedded province-specific resource links (replaces the old
          external Resource Hub link-out). Placed after Overview (reading → referencing →
          doing); color-blocked by the alternation above. Renders only for domains with
          seeded resource data. ── */}
      {showResources && (
        <div style={{ background: resourcesBg }}>
          <div style={areaBandInnerStyle}>
            <CollapsibleSection title="Resources" storageKey={`nightside.areaSection.${area.slug}.resources`}>
              <AreaResources domainCode={area.domainCode} province={province} />
            </CollapsibleSection>
          </div>
        </div>
      )}

      {/* ── Relevant activities — full-width cream band; color-blocked by the alternation
          above (lavender Resources or Overview above it, lavender Plan below). Omitted when
          an area has no activities. ── */}
      {hasActivities && (
        <div style={{ background: activitiesBg }}>
          <div style={areaBandInnerStyle}>
            <CollapsibleSection title="Relevant Activities" storageKey={`nightside.areaSection.${area.slug}.activities`}>
            <p style={{ fontFamily: hv, fontSize: 15, color: 'rgba(19,4,38,0.7)', lineHeight: 1.55, margin: '8px 0 24px', maxWidth: 620 }}>
              Reflective activities and exercises for thinking through this area. Use alone or with others.
            </p>
            <div className="area-activity-grid">
              {area.activities!.map((act) => {
                const entryId = act.kind === 'output' && act.activity ? entryByActivity.get(act.activity) : undefined
                return (
                  <div key={act.label} style={{ background: '#FFFFFF', border: '1px solid rgba(19,4,38,0.1)', borderRadius: 14, padding: '20px 22px', display: 'flex', flexDirection: 'column' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <ActivityIcon slug={act.icon} size={24} color="var(--color-night)" />
                      <p style={{ fontFamily: hv, fontSize: 16, fontWeight: 700, color: '#130426', margin: 0 }}>{act.label}</p>
                    </div>
                    <p style={{ fontFamily: hv, fontSize: 14, color: 'rgba(19,4,38,0.6)', lineHeight: 1.5, margin: '6px 0 0', flex: 1 }}>{act.blurb}</p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginTop: 18 }}>
                      {/* All CTAs use a 44px min tap target (project standard). */}
                      {act.kind === 'navigate' ? (
                        <Link href={act.href} style={{ fontFamily: hv, fontSize: 14, fontWeight: 500, color: 'var(--color-night)', textDecoration: 'none', whiteSpace: 'nowrap', display: 'inline-flex', alignItems: 'center', minHeight: 44 }}>Go to activity →</Link>
                      ) : (
                        <>
                          <Link href={act.href} style={{ fontFamily: hv, fontSize: 14, fontWeight: 600, color: '#F8F4EB', background: '#130426', borderRadius: 999, padding: '0 18px', minHeight: 44, boxSizing: 'border-box', display: 'inline-flex', alignItems: 'center', textDecoration: 'none', whiteSpace: 'nowrap' }}>
                            {entryId ? 'Continue' : 'Start'}
                          </Link>
                          {entryId && (
                            <Link href={`/app/entries/${entryId}/export`} style={{ fontFamily: hv, fontSize: 14, fontWeight: 500, color: 'var(--color-night)', textDecoration: 'none', whiteSpace: 'nowrap', display: 'inline-flex', alignItems: 'center', minHeight: 44 }}>Export</Link>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                )
              })}
              </div>
            </CollapsibleSection>
          </div>
        </div>
      )}

      {/* ── Plan — color-blocked against the section directly above it (see planBg). ── */}
      <div style={{ background: planBg, borderTop: '1px solid rgba(19,4,38,0.08)' }}>
        <div style={areaBandInnerStyle}>
          <CollapsibleSection title="Plan" storageKey={`nightside.areaSection.${area.slug}.plan`} deepLinkParam="plan">
            <p style={{ fontFamily: hv, fontSize: 15, color: 'rgba(19,4,38,0.7)', lineHeight: 1.55, margin: '8px 0 24px', maxWidth: 620 }}>
              Track the practical decisions and documentation, and capture related notes as you go.
            </p>
            <AreaPlanSection domainId={container.id} />
          </CollapsibleSection>
        </div>
      </div>
    </div>
  )
}
