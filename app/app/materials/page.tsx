import type { Metadata } from 'next'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import LandingContainer from '@/app/components/LandingContainer'
import { ensureCanonicalDomains } from '@/lib/ensure-canonical-domains'
import { ACTIVITY, DOCUMENT_TYPE_META, DOCUMENT_TYPES } from '@/lib/content-metadata'
import { loadDomainStateFromDB } from '@/lib/domain-state'
import { willInPlaceFromState, sdmInPlaceFromState, startedDocumentTypes } from '@/lib/pdf/buildPlanData'
import YourMaterialsPanel from '@/app/components/YourMaterialsPanel'
import PlanOverview from '@/app/components/PlanOverview'
import SectionTitleReveal from '@/app/components/SectionTitleReveal'
import PlanExportButton from '@/app/components/PlanExportButton'

export const metadata: Metadata = {
  title: 'Your materials',
}

// Known document types / activities — always shown, split into in-progress /
// not-started (lifted verbatim from the old combined Plan page).
const KNOWN_DOCUMENTS = DOCUMENT_TYPES.map((code) => ({
  type: code,
  label: DOCUMENT_TYPE_META[code].label,
  href: DOCUMENT_TYPE_META[code].href,
}))

const KNOWN_ACTIVITIES = [
  { activity: ACTIVITY.VALUES_RANKING, label: 'Values Ranking', href: '/app/activities/values-ranking' },
  { activity: ACTIVITY.FEARS_RANKING,  label: 'Fears Ranking',  href: '/app/activities/fears-ranking'  },
  { activity: ACTIVITY.LEGACY_MAP,     label: 'Legacy Map',     href: '/app/activities/legacy-map'      },
]

// Your materials — the reference-library half of the Plan section: the user's
// saved documents, activity outputs, and notes (YourMaterialsPanel), plus the
// same Key details panel as Progress. Materials renders unchanged from the old
// page; this is a structural lift, not a redesign.
export default async function YourMaterialsPage() {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  // proxy.ts middleware enforces auth on /app/*; this branch is unreachable.
  if (!user) throw new Error('Unreachable: auth middleware bypassed on /app/materials')

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

  // Doc "started" status: has string content OR a doc-mirrored domain_state field
  // (the legal will or the SDM) is set — honest doc-state framing, surface-independent.
  // The mirrored field marks the doc started regardless of which surface set it, so a
  // will/SDM checked on an area page (no entry row) still reads In progress here. A
  // started doc may therefore have NO entry row → entryId is optional (the Export
  // affordance is hidden until an entry exists; see YourMaterialsPanel).
  const domainState = await loadDomainStateFromDB(supabase, user.id)
  const startedTypes = startedDocumentTypes(entries, {
    willInPlace: willInPlaceFromState(domainState, allDomains),
    sdmInPlace: sdmInPlaceFromState(domainState, allDomains),
  })

  // --- Documents: split into in-progress / not-started ---
  type InProgressDoc = (typeof KNOWN_DOCUMENTS)[number] & { entryId?: string }
  const inProgressDocs: InProgressDoc[] = []
  const notStartedDocs: typeof KNOWN_DOCUMENTS = []
  for (const doc of KNOWN_DOCUMENTS) {
    if (startedTypes.has(doc.type)) {
      inProgressDocs.push({ ...doc, entryId: entries?.find((e) => e.document_type === doc.type)?.id })
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
        .plan-export-btn:hover { background: #EAE4D8 !important; }
      `}</style>

      {/* ── Page header: big reveal-underline title (matches the Activities landing) on
          the cream page. ── */}
      <div className="plan-page-header" style={{ position: 'relative' }}>
        <PlanExportButton />
        <LandingContainer pb={0}>
          <SectionTitleReveal title="Your materials" color="#130426" underlineColor="#BBABF4" />
          <p style={{ fontFamily: inter, fontSize: 17, fontWeight: 400, color: 'rgba(19,4,38,0.75)', maxWidth: 620, margin: '18px 0 0', lineHeight: 1.6 }}>
            This is where everything that makes up your plan lives: documents to fill out, your activity outputs, and notes you&rsquo;ve captured. Review, continue working, or export from this page.
          </p>
        </LandingContainer>
      </div>

      {/* ── Main content: Key Details panel (cross-domain status overview) on top, then
          the materials sections. Your materials is a recurring working surface, so the
          status overview lives here. ── */}
      <LandingContainer pt={40}>
        <div style={{ marginBottom: 40 }}>
          <PlanOverview domains={allDomains} title="Key details" />
        </div>
        <YourMaterialsPanel
          inProgressDocs={inProgressDocs}
          notStartedDocs={notStartedDocs}
          inProgressActivities={inProgressActivities}
          notStartedActivities={notStartedActivities}
          allNotes={allNotes}
          allDomains={allDomains}
          userId={user.id}
        />
      </LandingContainer>
    </div>
  )
}

