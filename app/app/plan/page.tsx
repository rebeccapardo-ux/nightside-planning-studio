import { createSupabaseServerClient } from '@/lib/supabase-server'
import { ACTIVITY } from '@/lib/content-metadata'
import DomainStateCard from '@/app/components/DomainStateCard'
import DomainNullStateBanner from '@/app/components/DomainNullStateBanner'
import PlanOverview from '@/app/components/PlanOverview'
import SectionTitleReveal from '@/app/components/SectionTitleReveal'
import YourMaterialsPanel from '@/app/components/YourMaterialsPanel'
import PlanTour from '@/app/components/PlanTour'
import Link from 'next/link'

type EntryRow = {
  id: string
  title: string | null
  content: unknown
  created_at: string | null
  section: string | null
  activity: string | null
  document_type: string | null
}

// ---------------------------------------------------------------------------
// Known document types — always shown, split into in-progress / not-started
// ---------------------------------------------------------------------------

const KNOWN_DOCUMENTS = [
  { type: 'advance_directive_supplement', label: 'My Care Wishes',                          href: '/app/capture/advance-directive'  },
  { type: 'funeral_wishes',              label: 'Wishes for My Body, Funeral & Ceremony', href: '/app/capture/funeral-wishes'     },
  { type: 'personal_admin_info',          label: 'Personal Admin Information',                    href: '/app/capture/personal-admin'     },
  { type: 'important_contacts',           label: 'Important Contacts',                     href: '/app/capture/important-contacts' },
  { type: 'financial_information',        label: 'Financial Information',                  href: '/app/capture/financial-information' },
  { type: 'devices_and_accounts',         label: 'Devices & Accounts',                    href: '/app/capture/devices-and-accounts'  },
  { type: 'keepsake_inventory',           label: 'Keepsakes Inventory',                   href: '/app/capture/keepsake-inventory'    },
]

const KNOWN_ACTIVITIES = [
  { activity: ACTIVITY.VALUES_RANKING, label: 'Values Ranking', href: '/app/reflect/values-ranking' },
  { activity: ACTIVITY.FEARS_RANKING,  label: 'Fears Ranking',  href: '/app/reflect/fears-ranking'  },
  { activity: ACTIVITY.LEGACY_MAP,     label: 'Legacy Map',     href: '/app/reflect/legacy-map'      },
]

// ---------------------------------------------------------------------------

export default async function PlanPage() {
  const supabase = await createSupabaseServerClient()

  const { data: { user } } = await supabase.auth.getUser()
  // proxy.ts middleware enforces auth on /app/*; this branch is unreachable.
  // The throw preserves type narrowing for user.id below.
  if (!user) throw new Error('Unreachable: auth middleware bypassed on /app/plan')

  // Ensure all six canonical domains exist for this user, with no duplicates.
  // Idempotent on the stable domain_code (and title, as a safety net for any
  // legacy row that predates the code backfill) so re-seeding never duplicates.
  const CANONICAL_DOMAINS: { title: string; code: string }[] = [
    { title: 'Deathcare',         code: 'deathcare' },
    { title: 'Healthcare Wishes', code: 'healthcare' },
    { title: 'Legacy',            code: 'legacy' },
    { title: 'Personal Admin',    code: 'personal_admin' },
    { title: 'Ritual & Ceremony', code: 'ritual' },
    { title: 'Wills & Estates',   code: 'wills_estates' },
  ]

  const { data: existingDomains } = await supabase
    .from('containers')
    .select('title, domain_code')
    .eq('type', 'domain')
    .eq('user_id', user.id)

  const existingCodes = new Set(
    (existingDomains ?? []).map((d) => d.domain_code).filter((c): c is string => !!c)
  )
  const existingTitles = new Set((existingDomains ?? []).map((d) => d.title))
  const toInsert = CANONICAL_DOMAINS.filter(
    (d) => !existingCodes.has(d.code) && !existingTitles.has(d.title)
  )
  if (toInsert.length > 0) {
    await supabase
      .from('containers')
      .insert(toInsert.map((d) => ({ user_id: user.id, type: 'domain', title: d.title, domain_code: d.code })))
  }

  const [
    { data: entries },
    { data: allNotesRaw },
    { data: domainContainers },
  ] = await Promise.all([
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

  // Deduplicate domains by title — handles any duplicate rows already in DB
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

  // ---------------------------------------------------------------------------
  // Styles
  // ---------------------------------------------------------------------------

  const apfel = "'Apfel Grotezk', sans-serif"
  const inter = "'Helvetica Neue', Helvetica, Arial, sans-serif"

  const sectionHeader: React.CSSProperties = {
    fontFamily: inter,
    fontSize: 20,
    fontWeight: 600,
    color: '#130426',
    marginBottom: 16,
    marginTop: 0,
  }

  const groupPanel: React.CSSProperties = {
    background: '#ede9f8',
    border: '1px solid rgba(19,4,38,0.08)',
    borderRadius: 12,
    padding: '20px 24px',
    marginBottom: 16,
  }

  const groupHeader: React.CSSProperties = {
    fontFamily: inter,
    fontSize: 16,
    fontWeight: 600,
    color: '#130426',
    marginBottom: 16,
    marginTop: 0,
  }

  const docButton: React.CSSProperties = {
    position: 'relative',
    width: '100%',
    background: '#ffffff',
    border: '1px solid rgba(19,4,38,0.1)',
    borderRadius: 22,
    padding: '14px 16px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: 10,
    transition: 'background 150ms ease',
    boxSizing: 'border-box',
  }

  const outputButton: React.CSSProperties = {
    width: 220,
    minHeight: 36,
    background: '#ffffff',
    border: '1px solid rgba(19,4,38,0.1)',
    borderRadius: 22,
    padding: '8px 14px',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    transition: 'background 150ms ease',
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div
      className="min-h-screen"
      style={{ background: '#F8F4EB' }}
    >
      <style>{`
        .plan-pill-doc:hover { background: #f5f5f5 !important; }
        .plan-primary-btn:hover { background: rgba(19,4,38,0.06) !important; }
        .plan-export-link:hover { text-decoration: underline !important; }
        .plan-pill-out:hover { background: #f5f5f5 !important; }
        .plan-export-btn:hover { background: #C04828 !important; }
        @media (max-width: 767px) {
          .plan-domain-keydetails-grid {
            grid-template-columns: 1fr !important;
            gap: 32px 0 !important;
          }
          /* Domain cards: 2-up was too cramped — revert to 1-per-row */
          .plan-domain-keydetails-grid > div#tour-areas > div {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>

      {/* ── Page header ── */}
      <div className="plan-page-header" style={{ position: 'relative', paddingTop: 64 }}>
        {/* Title — centered with same max-width as content */}
        <div style={{ maxWidth: 1100, margin: '0 auto', paddingLeft: 24, paddingRight: 24 }}>
          <SectionTitleReveal title="Your Plan" color="#130426" size={64} />
        </div>
        {/* Export button — absolutely positioned so it stays a fixed distance from the notepad */}
        <div className="plan-export-bar" style={{ position: 'absolute', top: 20, right: 148 }}>
          <Link
            href="/app/plan/export"
            className="plan-export-btn mobile-sticky-export"
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              borderRadius: 999, padding: '10px 20px',
              fontFamily: inter, fontSize: 14, fontWeight: 600,
              background: '#DB5835', color: '#130426',
              textDecoration: 'none', border: 'none', whiteSpace: 'nowrap',
            }}
          >
            <svg width="14" height="14" viewBox="0 0 13 13" fill="none" aria-hidden="true">
              <path d="M6.5 1.5v6M3.5 5.5L6.5 8.5L9.5 5.5" stroke="#130426" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M1.5 10.5h10" stroke="#130426" strokeWidth="1.4" strokeLinecap="round" />
            </svg>
            <span className="hidden md:inline">Preview &amp; </span>Export
          </Link>
        </div>
      </div>

      {/* ── Main content ── */}
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '48px 24px 80px' }}>

        {/* ── Areas heading ── */}
        <h2 data-tour-anchor="tour-areas-header" style={{ fontFamily: apfel, fontSize: 22, fontWeight: 500, color: '#130426', marginBottom: 12, marginTop: 0 }}>Areas of planning</h2>
        <p style={{ fontFamily: inter, fontSize: 17, color: 'rgba(19,4,38,0.85)', maxWidth: 600, marginBottom: 24, marginTop: 0, lineHeight: 1.6 }}>
          Click into an area to track your progress, view key tasks, and access related materials.
        </p>

        {/* ── Null state banner (above grid so it doesn't offset card alignment) ── */}
        {allDomains.length > 0 && <DomainNullStateBanner domains={allDomains} />}

        {/* ── Domain cards + Key details grid ── */}
        <div className="plan-domain-keydetails-grid" style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '0 40px', alignItems: 'stretch', marginBottom: 64 }}>

          {/* Left: domain cards */}
          <div id="tour-areas">
            {allDomains.length > 0 ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 20 }}>
                {allDomains.map((domain, i) => (
                  <DomainStateCard
                    key={domain.id}
                    domain={domain}
                    colorIndex={i}
                  />
                ))}
              </div>
            ) : (
              <p style={{ fontFamily: inter, fontSize: 16, color: 'rgba(19,4,38,0.65)', margin: 0 }}>
                No areas yet.
              </p>
            )}
          </div>

          {/* Right: Key details */}
          <div id="tour-key-details">
            <PlanOverview domains={allDomains} />
          </div>

        </div>

        {/* ── Your materials ── */}
        <div id="tour-materials">
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

        <PlanTour userId={user.id} />
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function DocIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0 }}>
      <path d="M3 2.5A1.5 1.5 0 0 1 4.5 1H10l3 3v9A1.5 1.5 0 0 1 11.5 14.5h-7A1.5 1.5 0 0 1 3 13V2.5z" stroke="#2C3777" strokeWidth="1.25" strokeLinejoin="round" fill="none"/>
      <path d="M10 1v3h3" stroke="#2C3777" strokeWidth="1.25" strokeLinejoin="round" fill="none"/>
      <path d="M5.5 7.5h5M5.5 10h5" stroke="#2C3777" strokeWidth="1.25" strokeLinecap="round"/>
    </svg>
  )
}

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

function getDisplayTitle(entry: EntryRow): string {
  if (entry.document_type === 'advance_directive_supplement') return 'My Care Wishes'
  if (entry.document_type === 'funeral_wishes') return 'Wishes for My Body, Funeral & Ceremony'
  if (entry.document_type === 'personal_admin_info') return 'Personal Admin Information'
  if (entry.document_type === 'important_contacts') return 'Important Contacts'
  if (entry.document_type === 'devices_and_accounts') return 'Devices & Accounts'
  if (entry.document_type === 'financial_information') return 'Financial Information'
  if (entry.document_type === 'keepsake_inventory') return 'Keepsakes Inventory'
  if (entry.activity === ACTIVITY.VALUES_RANKING) return 'Values Ranking'
  if (entry.activity === ACTIVITY.FEARS_RANKING) return 'Fears Ranking'
  if (entry.activity === ACTIVITY.LEGACY_MAP) return 'Legacy Map'
  if (entry.title?.trim()) return entry.title.trim()
  return 'Untitled'
}
