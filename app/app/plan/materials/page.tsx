import type { Metadata } from 'next'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { ensureCanonicalDomains } from '@/lib/ensure-canonical-domains'
import { ACTIVITY, DOCUMENT_TYPE_META, DOCUMENT_TYPES } from '@/lib/content-metadata'
import YourMaterialsPanel from '@/app/components/YourMaterialsPanel'
import Breadcrumbs from '@/app/components/navigation/Breadcrumbs'
import PlanExportButton from '@/app/components/PlanExportButton'

export const metadata: Metadata = {
  title: 'Your Materials',
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

// Known document types / activities — always shown, split into in-progress /
// not-started (lifted verbatim from the old combined Plan page).
const KNOWN_DOCUMENTS = DOCUMENT_TYPES.map((code) => ({
  type: code,
  label: DOCUMENT_TYPE_META[code].label,
  href: DOCUMENT_TYPE_META[code].href,
}))

const KNOWN_ACTIVITIES = [
  { activity: ACTIVITY.VALUES_RANKING, label: 'Values Ranking', href: '/app/reflect/values-ranking' },
  { activity: ACTIVITY.FEARS_RANKING,  label: 'Fears Ranking',  href: '/app/reflect/fears-ranking'  },
  { activity: ACTIVITY.LEGACY_MAP,     label: 'Legacy Map',     href: '/app/reflect/legacy-map'      },
]

// Your Materials — the reference-library half of the Plan section: the user's
// saved documents, activity outputs, and notes (YourMaterialsPanel), plus the
// same Key details panel as Progress. Materials renders unchanged from the old
// page; this is a structural lift, not a redesign.
export default async function YourMaterialsPage() {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  // proxy.ts middleware enforces auth on /app/*; this branch is unreachable.
  if (!user) throw new Error('Unreachable: auth middleware bypassed on /app/plan/materials')

  await ensureCanonicalDomains(supabase, user.id)

  const [{ data: entries }, { data: allNotesRaw }, { data: domainContainers }] = await Promise.all([
    supabase
      .from('entries')
      .select('id, title, content, created_at, section, activity, document_type')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false }),
    supabase
      .from('notes')
      .select('id, content, created_at, origin_type, prompt_context, note_mode, transcript, audio_url, duration_seconds, transcription_status')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false }),
    supabase
      .from('containers')
      .select('id, title, domain_code')
      .eq('type', 'domain')
      .eq('user_id', user.id)
      .order('title'),
  ])

  const allNotes = allNotesRaw ?? []

  // Deduplicate domains by title (guards any legacy duplicate rows).
  const _seenTitles = new Set<string>()
  const allDomains = (domainContainers ?? []).filter((d) => {
    if (_seenTitles.has(d.title)) return false
    _seenTitles.add(d.title)
    return true
  })

  // --- Documents: split into in-progress / not-started ---
  type InProgressDoc = (typeof KNOWN_DOCUMENTS)[number] & { entryId: string }
  const inProgressDocs: InProgressDoc[] = []
  const notStartedDocs: typeof KNOWN_DOCUMENTS = []
  for (const doc of KNOWN_DOCUMENTS) {
    const entry = entries?.find((e) => e.document_type === doc.type)
    if (entry && hasContent(entry)) {
      inProgressDocs.push({ ...doc, entryId: entry.id })
    } else {
      notStartedDocs.push(doc)
    }
  }

  // --- Activities: split into in-progress / not-started ---
  type InProgressActivity = (typeof KNOWN_ACTIVITIES)[number] & { entryId: string }
  const inProgressActivities: InProgressActivity[] = []
  const notStartedActivities: typeof KNOWN_ACTIVITIES = []
  for (const act of KNOWN_ACTIVITIES) {
    const entry = (entries ?? []).find((e) => e.activity === act.activity)
    if (entry) {
      inProgressActivities.push({ ...act, entryId: entry.id })
    } else {
      notStartedActivities.push(act)
    }
  }

  const inter = "'Helvetica Neue', Helvetica, Arial, sans-serif"

  return (
    <div className="min-h-screen" style={{ background: '#F8F4EB' }}>
      <style>{`
        .plan-pill-doc:hover { background: #f5f5f5 !important; }
        .plan-primary-btn:hover { background: rgba(19,4,38,0.06) !important; }
        .plan-export-link:hover { text-decoration: underline !important; }
        .plan-pill-out:hover { background: #f5f5f5 !important; }
        .plan-export-btn:hover { background: #C04828 !important; }
      `}</style>

      {/* ── Page header: breadcrumb + sub-page title (smaller than the landing,
          no orange reveal-underline — that treatment is reserved for /app/plan) ── */}
      <div className="plan-page-header" style={{ position: 'relative' }}>
        <PlanExportButton />
        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '40px 24px 0' }}>
          <div style={{ marginBottom: 20 }}>
            <Breadcrumbs theme="light" items={[{ label: 'Plan', href: '/app/plan' }, { label: 'Your Materials' }]} />
          </div>
          <h1 style={{ fontSize: 42, fontWeight: 600, lineHeight: 0.98, letterSpacing: '-0.03em', color: '#130426', margin: 0, fontFamily: inter }}>
            Your Materials
          </h1>
          <p style={{ fontFamily: inter, fontSize: 17, fontWeight: 400, color: 'rgba(19,4,38,0.75)', maxWidth: 620, margin: '18px 0 0', lineHeight: 1.6 }}>
            This is where everything that makes up your plan lives: documents to fill out, your activity outputs, and notes you&rsquo;ve captured. Review, continue working, or export from this page.
          </p>
        </div>
      </div>

      {/* ── Main content: materials only. Key Details lives on Areas of Planning
          (plan status), not here — Your Materials is platform content the user can
          engage with, not status-of-facts like whether a legal will exists. ── */}
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '40px 24px 80px' }}>
        <YourMaterialsPanel
          inProgressDocs={inProgressDocs}
          notStartedDocs={notStartedDocs}
          inProgressActivities={inProgressActivities}
          notStartedActivities={notStartedActivities}
          allNotes={allNotes}
          allDomains={allDomains}
          userId={user.id}
        />
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Helpers (lifted from the old Plan page)
// ---------------------------------------------------------------------------

function hasContent(entry: EntryRow): boolean {
  return hasAnyStringContent(entry.content)
}

function hasAnyStringContent(value: unknown): boolean {
  if (typeof value === 'string') return value.trim().length > 0
  if (Array.isArray(value)) return value.some(hasAnyStringContent)
  if (value && typeof value === 'object') {
    return Object.values(value as Record<string, unknown>).some(hasAnyStringContent)
  }
  return false
}
