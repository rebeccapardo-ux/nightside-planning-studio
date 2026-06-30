import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { ensureCanonicalDomains } from '@/lib/ensure-canonical-domains'
import { areaBySlug } from '@/lib/areas'
import AreaPlanSection from '@/app/components/area/AreaPlanSection'
import AreaHeader from '@/app/components/area/AreaHeader'
import CollapsibleSection from '@/app/components/area/CollapsibleSection'
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

  // Color-block: no two adjacent sections share a background. Plan is always lavender;
  // the Overview band is lavender too WHEN a cream Activities section sits between them.
  // When an area has no Activities section (e.g. Personal Admin), the Overview band flips
  // to cream so it doesn't sit lavender-on-lavender against Plan.
  const overviewBg = hasActivities ? '#ECE7F7' : '#F8F4EB'
  const planBg = '#ECE7F7'

  return (
    // Page base is the dark footer colour (#130426), so the min-h-screen filler below
    // the final section reads as the footer zone — not as a stray cream bar, and not as
    // an over-tall extension of the lavender Plan section.
    <div className="min-h-screen" style={{ background: '#130426' }}>
      <style>{`
        .area-activity-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px; }
        @media (max-width: 720px) { .area-activity-grid { grid-template-columns: 1fr; } }
      `}</style>

      <AreaHeader slug={area.slug} title={area.title} intro={area.intro} bandBg={overviewBg}>{learnContent}</AreaHeader>

      {/* ── Relevant activities — full-width cream band; color-blocked against the
          lavender Overview band above and the lavender Plan band below. Omitted when an
          area has no activities. ── */}
      {hasActivities && (
        <div style={{ background: '#F8F4EB' }}>
          <div className="max-w-6xl mx-auto px-10">
            <CollapsibleSection title="Relevant Activities" storageKey={`nightside.areaSection.${area.slug}.activities`}>
            <p style={{ fontFamily: hv, fontSize: 15, color: 'rgba(19,4,38,0.7)', lineHeight: 1.55, margin: '8px 0 24px', maxWidth: 620 }}>
              Reflective activities and exercises for thinking through this area. Use alone or with others.
            </p>
            <div className="area-activity-grid">
              {area.activities!.map((act) => {
                const entryId = act.kind === 'output' && act.activity ? entryByActivity.get(act.activity) : undefined
                return (
                  <div key={act.label} style={{ background: '#FFFFFF', border: '1px solid rgba(19,4,38,0.1)', borderRadius: 14, padding: '20px 22px', display: 'flex', flexDirection: 'column' }}>
                    <p style={{ fontFamily: hv, fontSize: 16, fontWeight: 700, color: '#130426', margin: 0 }}>{act.label}</p>
                    <p style={{ fontFamily: hv, fontSize: 14, color: 'rgba(19,4,38,0.6)', lineHeight: 1.5, margin: '6px 0 0', flex: 1 }}>{act.blurb}</p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginTop: 18 }}>
                      {/* All CTAs use a 44px min tap target (project standard). */}
                      {act.kind === 'navigate' ? (
                        <Link href={act.href} style={{ fontFamily: hv, fontSize: 14, fontWeight: 500, color: '#2C3777', textDecoration: 'none', whiteSpace: 'nowrap', display: 'inline-flex', alignItems: 'center', minHeight: 44 }}>Go to activity →</Link>
                      ) : (
                        <>
                          <Link href={act.href} style={{ fontFamily: hv, fontSize: 14, fontWeight: 600, color: '#F8F4EB', background: '#130426', borderRadius: 999, padding: '0 18px', minHeight: 44, boxSizing: 'border-box', display: 'inline-flex', alignItems: 'center', textDecoration: 'none', whiteSpace: 'nowrap' }}>
                            {entryId ? 'Continue' : 'Start'}
                          </Link>
                          {entryId && (
                            <Link href={`/app/entries/${entryId}/export`} style={{ fontFamily: hv, fontSize: 14, fontWeight: 500, color: '#2C3777', textDecoration: 'none', whiteSpace: 'nowrap', display: 'inline-flex', alignItems: 'center', minHeight: 44 }}>Export</Link>
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
        <div className="max-w-6xl mx-auto px-10">
          <CollapsibleSection title="Plan" storageKey={`nightside.areaSection.${area.slug}.plan`}>
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
