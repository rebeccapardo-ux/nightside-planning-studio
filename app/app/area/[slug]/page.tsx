import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { ensureCanonicalDomains } from '@/lib/ensure-canonical-domains'
import { areaBySlug } from '@/lib/areas'
import AreaPlanSection from '@/app/components/area/AreaPlanSection'

const apfel = "'Apfel Grotezk', sans-serif"
const hv = "'Helvetica Neue', Helvetica, Arial, sans-serif"

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const area = areaBySlug(slug)
  return { title: area?.title ?? 'Plan by area' }
}

// New per-area page (/app/area/[slug]) — Activities + Plan in one place, organised
// by topic. Resolves the URL slug → domain_code → the user's container, then renders
// the shared <AreaPlanSection> for the Plan workspace. (Phase 1: Healthcare slice.
// The "See more" Learn band and the per-area Key Details panel land next.)
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

  return (
    <div className="min-h-screen" style={{ background: '#F8F4EB' }}>

      {/* ── Header — navy, area-themed (matches the domain-page treatment) ── */}
      <div style={{ background: 'radial-gradient(circle at 20% 20%, #1a0535 0%, #130426 70%)' }}>
        <div className="max-w-6xl mx-auto pt-16 md:pt-6" style={{ paddingLeft: 40, paddingRight: 40 }}>
          <p style={{ fontFamily: hv, fontSize: 13, color: 'rgba(255,255,255,0.7)', margin: 0 }}>
            <Link href="/app" style={{ color: 'rgba(255,255,255,0.7)', textDecoration: 'none' }}>Plan by area</Link>
            {' / '}{area.title}
          </p>
        </div>
        <div className="max-w-6xl mx-auto" style={{ padding: '12px 40px 56px' }}>
          <h1 className="ns-title-activity text-white">{area.title}</h1>
          <p style={{ fontFamily: hv, fontSize: 17, lineHeight: 1.6, color: 'rgba(255,255,255,0.85)', maxWidth: 640, margin: '16px 0 0' }}>
            {area.intro}
          </p>
          {/* TODO (next step): <AreaSeeMore> pill + full-width Learn-content band */}
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-12">

        {/* ── Activities section (omitted entirely when an area has none) ── */}
        {area.activities && area.activities.length > 0 && (
          <section style={{ marginBottom: 56 }}>
            <h2 style={{ fontFamily: apfel, fontSize: 30, fontWeight: 600, color: '#130426', margin: 0 }}>Activities</h2>
            <p style={{ fontFamily: hv, fontSize: 15, color: 'rgba(19,4,38,0.7)', lineHeight: 1.55, margin: '8px 0 24px', maxWidth: 620 }}>
              Reflective activities and exercises for thinking through this area. Use alone or with others.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {area.activities.map((act) => {
                const entryId = act.kind === 'output' && act.activity ? entryByActivity.get(act.activity) : undefined
                return (
                  <div key={act.label} style={{ background: '#FFFFFF', border: '1px solid rgba(19,4,38,0.1)', borderRadius: 14, padding: '18px 22px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
                    <div style={{ minWidth: 0 }}>
                      <p style={{ fontFamily: hv, fontSize: 16, fontWeight: 700, color: '#130426', margin: 0 }}>{act.label}</p>
                      <p style={{ fontFamily: hv, fontSize: 14, color: 'rgba(19,4,38,0.6)', lineHeight: 1.5, margin: '4px 0 0' }}>{act.blurb}</p>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexShrink: 0 }}>
                      {act.kind === 'navigate' ? (
                        <Link href={act.href} style={{ fontFamily: hv, fontSize: 14, fontWeight: 500, color: '#2C3777', textDecoration: 'none', whiteSpace: 'nowrap' }}>Go to activity →</Link>
                      ) : (
                        <>
                          <Link href={act.href} style={{ fontFamily: hv, fontSize: 14, fontWeight: 600, color: '#F8F4EB', background: '#130426', borderRadius: 999, padding: '8px 16px', textDecoration: 'none', whiteSpace: 'nowrap' }}>
                            {entryId ? 'Continue' : 'Start'}
                          </Link>
                          {entryId && (
                            <Link href={`/app/entries/${entryId}/export`} style={{ fontFamily: hv, fontSize: 14, fontWeight: 500, color: '#2C3777', textDecoration: 'none', whiteSpace: 'nowrap' }}>Export</Link>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </section>
        )}

        {/* ── Plan section ── */}
        <section>
          <h2 style={{ fontFamily: apfel, fontSize: 30, fontWeight: 600, color: '#130426', margin: 0 }}>Plan</h2>
          <p style={{ fontFamily: hv, fontSize: 15, color: 'rgba(19,4,38,0.7)', lineHeight: 1.55, margin: '8px 0 24px', maxWidth: 620 }}>
            Track the practical decisions and documentation, and capture related notes as you go.
          </p>
          {/* TODO (next step): per-area <AreaKeyDetails rows={area.keyDetails}> above the workspace */}
          <AreaPlanSection domainId={container.id} variant="area" />
        </section>
      </div>
    </div>
  )
}
