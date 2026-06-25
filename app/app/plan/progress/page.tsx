import type { Metadata } from 'next'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { ensureCanonicalDomains } from '@/lib/ensure-canonical-domains'
import DomainStateCard from '@/app/components/DomainStateCard'
import DomainNullStateBanner from '@/app/components/DomainNullStateBanner'
import PlanOverview from '@/app/components/PlanOverview'
import Breadcrumbs from '@/app/components/navigation/Breadcrumbs'
import PlanExportButton from '@/app/components/PlanExportButton'
import type { UserTask } from '@/lib/user-tasks'

export const metadata: Metadata = {
  title: 'Progress Tracking',
}

// Progress Tracking — the practical workspace half of the Plan section: the
// domain cards (progress + tasks) plus the Key details panel. Materials live on
// the sibling /app/plan/materials page. (PlanOverview fetches its own data
// client-side, so this server component only needs domains + tasks.)
export default async function ProgressTrackingPage() {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  // proxy.ts middleware enforces auth on /app/*; this branch is unreachable.
  if (!user) throw new Error('Unreachable: auth middleware bypassed on /app/plan/progress')

  await ensureCanonicalDomains(supabase, user.id)

  const [{ data: domainContainers }, { data: userTasksRaw }] = await Promise.all([
    supabase
      .from('containers')
      .select('id, title, domain_code')
      .eq('type', 'domain')
      .eq('user_id', user.id)
      .order('title'),
    supabase
      .from('user_checkboxes')
      .select('id, domain_id, row_key, label, checked, created_at, updated_at')
      .eq('user_id', user.id),
  ])

  // Tasks grouped by domain — card counts + null-state detection.
  const tasksByDomain: Record<string, UserTask[]> = {}
  for (const t of (userTasksRaw ?? []) as UserTask[]) { (tasksByDomain[t.domain_id] ||= []).push(t) }

  // Deduplicate domains by title (guards any legacy duplicate rows).
  const _seenTitles = new Set<string>()
  const allDomains = (domainContainers ?? []).filter((d) => {
    if (_seenTitles.has(d.title)) return false
    _seenTitles.add(d.title)
    return true
  })

  const apfel = "'Apfel Grotezk', sans-serif"
  const inter = "'Helvetica Neue', Helvetica, Arial, sans-serif"

  return (
    <div className="min-h-screen" style={{ background: '#F8F4EB' }}>
      <style>{`
        .plan-export-btn:hover { background: #C04828 !important; }
        @media (max-width: 767px) {
          /* Domain cards: 2-up is too cramped on mobile — 1-per-row */
          .plan-cards { grid-template-columns: 1fr !important; }
        }
      `}</style>

      {/* ── Page header: breadcrumb + sub-page title (smaller than the landing,
          no orange reveal-underline — that treatment is reserved for /app/plan) ── */}
      <div className="plan-page-header" style={{ position: 'relative' }}>
        <PlanExportButton />
        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '40px 24px 0' }}>
          <div style={{ marginBottom: 20 }}>
            <Breadcrumbs theme="light" items={[{ label: 'Plan', href: '/app/plan' }, { label: 'Progress Tracking' }]} />
          </div>
          <h1 style={{ fontSize: 42, fontWeight: 600, lineHeight: 0.98, letterSpacing: '-0.03em', color: '#130426', margin: 0, fontFamily: inter }}>
            Progress Tracking
          </h1>
        </div>
      </div>

      {/* ── Main content ── */}
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '40px 24px 80px' }}>
        {/* Key details — collapsible, at the top, constrained width (so the cards
            below are the page's primary focus). Hydrates after the cards paint. */}
        <div style={{ maxWidth: 720, marginBottom: 40 }}>
          <PlanOverview domains={allDomains} />
        </div>

        <h2 style={{ fontFamily: apfel, fontSize: 22, fontWeight: 500, color: '#130426', marginBottom: 12, marginTop: 0 }}>Areas of planning</h2>
        <p style={{ fontFamily: inter, fontSize: 17, color: 'rgba(19,4,38,0.85)', maxWidth: 600, marginBottom: 24, marginTop: 0, lineHeight: 1.6 }}>
          Click into an area to track your progress, view key tasks, and access related materials.
        </p>

        {allDomains.length > 0 && <DomainNullStateBanner domains={allDomains} tasksByDomain={tasksByDomain} />}

        {/* Domain cards — full-width 2-up (1-up mobile), the page's primary content */}
        {allDomains.length > 0 ? (
          <div className="plan-cards" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 24, alignItems: 'stretch' }}>
            {allDomains.map((domain, i) => (
              <DomainStateCard
                key={domain.id}
                domain={domain}
                colorIndex={i}
                userTasks={tasksByDomain[domain.id] ?? []}
              />
            ))}
          </div>
        ) : (
          <p style={{ fontFamily: inter, fontSize: 16, color: 'rgba(19,4,38,0.65)', margin: 0 }}>
            No areas yet.
          </p>
        )}
      </div>
    </div>
  )
}
