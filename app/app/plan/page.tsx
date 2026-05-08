import { createSupabaseServerClient } from '@/lib/supabase-server'
import DomainStateCard from '@/app/components/DomainStateCard'
import DomainNullStateBanner from '@/app/components/DomainNullStateBanner'
import PlanNotesGrid from '@/app/components/PlanNotesGrid'
import SectionTitleReveal from '@/app/components/SectionTitleReveal'
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
  { type: 'advance_directive_supplement', label: 'Your Wishes',         href: '/app/capture/advance-directive'     },
  { type: 'personal_admin_info',          label: 'Personal Admin Info',  href: '/app/capture/personal-admin'        },
  { type: 'important_contacts',           label: 'Important Contacts',   href: '/app/capture/important-contacts'    },
  { type: 'financial_information',        label: 'Financial Information', href: '/app/capture/financial-information' },
  { type: 'devices_and_accounts',         label: 'Devices & Accounts',   href: '/app/capture/devices-and-accounts'  },
  { type: 'keepsake_inventory',           label: 'Keepsakes Inventory',  href: '/app/capture/keepsake-inventory'    },
]

const KNOWN_ACTIVITIES = [
  { activity: 'values_ranking', label: 'Values Ranking', href: '/app/reflect/values-ranking' },
  { activity: 'fears_ranking',  label: 'Fears Ranking',  href: '/app/reflect/fears-ranking'  },
  { activity: 'legacy_map',     label: 'Legacy Map',     href: '/app/reflect/legacy-map'      },
]

// ---------------------------------------------------------------------------

export default async function PlanPage() {
  const supabase = await createSupabaseServerClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return <div>Not authenticated</div>

  // Ensure Personal Admin domain exists
  const { data: existingPA } = await supabase
    .from('containers')
    .select('id')
    .eq('type', 'domain')
    .ilike('title', '%personal%')
    .limit(1)

  if (!existingPA || existingPA.length === 0) {
    await supabase
      .from('containers')
      .insert({ user_id: user.id, type: 'domain', title: 'Personal Admin' })
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
      .select('id, title')
      .eq('type', 'domain')
      .order('title'),
  ])

  const allNotes = allNotesRaw ?? []
  const allDomains = domainContainers ?? []

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
    fontFamily: apfel,
    fontSize: 30,
    fontWeight: 500,
    color: '#FFFFFF',
    marginBottom: 24,
    marginTop: 0,
  }

  const groupPanel: React.CSSProperties = {
    background: 'rgba(19,4,38,0.45)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 16,
    padding: 20,
    marginBottom: 44,
  }

  const groupHeader: React.CSSProperties = {
    fontFamily: apfel,
    fontSize: 22,
    fontWeight: 600,
    color: '#FFFFFF',
    marginBottom: 16,
    marginTop: 0,
  }

  const columnHeader: React.CSSProperties = {
    fontFamily: inter,
    fontSize: 14,
    fontWeight: 600,
    color: '#F29836',
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
    marginBottom: 16,
    marginTop: 0,
  }

  const docButton: React.CSSProperties = {
    position: 'relative',
    width: '100%',
    background: '#F8F4EB',
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
    background: '#FFFFFF',
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
        .plan-pill-doc:hover { background: #EDE7D9 !important; }
        .plan-primary-btn:hover { background: rgba(44,55,119,0.06) !important; }
        .plan-export-link:hover { text-decoration: underline !important; }
        .plan-pill-out:hover { background: #EDEDED !important; }
      `}</style>

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '80px 24px 80px' }}>

        {/* Page header */}
        <div style={{ marginBottom: 48 }}>
          <SectionTitleReveal title="Your Plan" color="#130426" size={64} />
        </div>

        {/* ── Areas of planning ── */}
        <section style={{ marginBottom: 64 }}>
          <h2 style={{ ...sectionHeader, color: '#130426', marginBottom: 12 }}>Areas of planning</h2>
          <p style={{ fontFamily: inter, fontSize: 17, color: 'rgba(19,4,38,0.85)', maxWidth: 600, marginBottom: 24, marginTop: 0, lineHeight: 1.6 }}>
            Click into an area to work through topics, organize your thinking,<br/>and see related documents, notes, and activity work.
          </p>
          {allDomains.length > 0 ? (
            <>
            <DomainNullStateBanner domains={allDomains} />
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 20 }}>
              {allDomains.map((domain, i) => (
                <DomainStateCard
                  key={domain.id}
                  domain={domain}
                  colorIndex={i}
                />
              ))}
            </div>
            </>
          ) : (
            <p style={{ fontFamily: inter, fontSize: 16, color: 'rgba(19,4,38,0.45)', margin: 0 }}>
              No areas yet.
            </p>
          )}
        </section>

        {/* ── Your materials ── */}
        <div>
        <div style={{ background: 'rgba(44,55,119,0.85)', borderRadius: 20, padding: 28 }}>
          <h2 style={sectionHeader}>Your materials</h2>

          {/* Documents group */}
          <div style={groupPanel}>
            <h3 style={groupHeader}>Documents</h3>
            <p style={{ fontFamily: inter, fontSize: 15, fontWeight: 400, color: '#FFFFFF', maxWidth: 480, marginBottom: 36, marginTop: 0, lineHeight: 1.55 }}>
              Templates to help you document what matters and stay organized.<br />
              For legal requirements, see guidance in the <Link href="/app/learn" style={{ color: 'rgba(255,255,255,0.7)', textDecoration: 'underline' }}>Learn</Link> section.
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 40 }}>

              {/* In progress */}
              <div style={{ paddingRight: 10 }}>
                <p style={columnHeader}>In progress</p>
                {inProgressDocs.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {inProgressDocs.map((doc) => (
                      <div key={doc.type} className="plan-pill-doc" style={docButton}>
                        <Link href={doc.href} style={{ position: 'absolute', inset: 0, borderRadius: 'inherit' }} aria-hidden="true" tabIndex={-1} />
                        <div style={{ position: 'relative', zIndex: 1, display: 'flex', alignItems: 'center', gap: 8 }}>
                          <DocIcon />
                          <span style={{ fontFamily: inter, fontSize: 16, fontWeight: 600, color: '#1A1A1A', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{doc.label}</span>
                        </div>
                        <div style={{ position: 'relative', zIndex: 1, display: 'flex', alignItems: 'center', gap: 14, marginLeft: 24 }}>
                          <Link href={doc.href} className="plan-primary-btn" style={{ fontFamily: inter, fontSize: 14, fontWeight: 500, color: '#2C3777', background: 'transparent', border: '1px solid #2C3777', borderRadius: 999, padding: '8px 12px', textDecoration: 'none', display: 'inline-block', whiteSpace: 'nowrap' }}>
                            Continue
                          </Link>
                          <Link href={`/app/entries/${doc.entryId}`} className="plan-export-link" style={{ fontFamily: inter, fontSize: 14, fontWeight: 500, color: '#2C3777', textDecoration: 'none', whiteSpace: 'nowrap' }}>
                            Export
                          </Link>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p style={{ fontFamily: inter, fontSize: 13, color: 'rgba(255,255,255,0.35)', margin: 0 }}>None yet</p>
                )}
              </div>

              {/* Not started */}
              <div style={{ paddingRight: 10 }}>
                <p style={columnHeader}>Not started</p>
                {notStartedDocs.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {notStartedDocs.map((doc) => (
                      <div key={doc.type} className="plan-pill-doc" style={docButton}>
                        <Link href={doc.href} style={{ position: 'absolute', inset: 0, borderRadius: 'inherit' }} aria-hidden="true" tabIndex={-1} />
                        <div style={{ position: 'relative', zIndex: 1, display: 'flex', alignItems: 'center', gap: 8 }}>
                          <DocIcon />
                          <span style={{ fontFamily: inter, fontSize: 16, fontWeight: 600, color: '#1A1A1A', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{doc.label}</span>
                        </div>
                        <div style={{ position: 'relative', zIndex: 1, marginLeft: 24 }}>
                          <Link href={doc.href} className="plan-primary-btn" style={{ fontFamily: inter, fontSize: 14, fontWeight: 500, color: '#2C3777', background: 'transparent', border: '1px solid #2C3777', borderRadius: 999, padding: '8px 12px', textDecoration: 'none', display: 'inline-block', whiteSpace: 'nowrap' }}>
                            Start
                          </Link>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p style={{ fontFamily: inter, fontSize: 13, color: 'rgba(255,255,255,0.35)', margin: 0 }}>All started</p>
                )}
              </div>

            </div>
          </div>

          {/* Activity outputs group */}
          <div style={groupPanel}>
            <h3 style={groupHeader}>Activity outputs</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 40 }}>

              {/* In progress */}
              <div style={{ paddingRight: 10 }}>
                <p style={columnHeader}>In progress</p>
                {inProgressActivities.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {inProgressActivities.map((act) => (
                      <div key={act.activity} className="plan-pill-out" style={{ ...outputButton, position: 'relative', width: '100%', borderRadius: 22, display: 'flex', flexDirection: 'column', alignItems: 'flex-start', justifyContent: 'flex-start', gap: 10, padding: '14px 16px', boxSizing: 'border-box' }}>
                        <Link href={act.href} style={{ position: 'absolute', inset: 0, borderRadius: 'inherit' }} aria-hidden="true" tabIndex={-1} />
                        <div style={{ position: 'relative', zIndex: 1 }}>
                          <span style={{ fontFamily: inter, fontSize: 16, fontWeight: 600, color: '#1A1A1A' }}>{act.label}</span>
                        </div>
                        <div style={{ position: 'relative', zIndex: 1, display: 'flex', alignItems: 'center', gap: 14 }}>
                          <Link href={act.href} className="plan-primary-btn" style={{ fontFamily: inter, fontSize: 14, fontWeight: 500, color: '#2C3777', background: 'transparent', border: '1px solid #2C3777', borderRadius: 999, padding: '8px 12px', textDecoration: 'none', display: 'inline-block', whiteSpace: 'nowrap' }}>
                            Continue
                          </Link>
                          <Link href={`/app/entries/${act.entryId}`} className="plan-export-link" style={{ fontFamily: inter, fontSize: 14, fontWeight: 500, color: '#2C3777', textDecoration: 'none', whiteSpace: 'nowrap' }}>
                            Export
                          </Link>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p style={{ fontFamily: inter, fontSize: 13, color: 'rgba(255,255,255,0.35)', margin: 0 }}>None yet</p>
                )}
              </div>

              {/* Not started */}
              <div style={{ paddingRight: 10 }}>
                <p style={columnHeader}>Not started</p>
                {notStartedActivities.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {notStartedActivities.map((act) => (
                      <div key={act.activity} className="plan-pill-out" style={{ ...outputButton, position: 'relative', width: '100%', borderRadius: 22, display: 'flex', flexDirection: 'column', alignItems: 'flex-start', justifyContent: 'flex-start', gap: 10, padding: '14px 16px', boxSizing: 'border-box' }}>
                        <Link href={act.href} style={{ position: 'absolute', inset: 0, borderRadius: 'inherit' }} aria-hidden="true" tabIndex={-1} />
                        <div style={{ position: 'relative', zIndex: 1 }}>
                          <span style={{ fontFamily: inter, fontSize: 16, fontWeight: 600, color: '#1A1A1A' }}>{act.label}</span>
                        </div>
                        <div style={{ position: 'relative', zIndex: 1 }}>
                          <Link href={act.href} className="plan-primary-btn" style={{ fontFamily: inter, fontSize: 14, fontWeight: 500, color: '#2C3777', background: 'transparent', border: '1px solid #2C3777', borderRadius: 999, padding: '8px 12px', textDecoration: 'none', display: 'inline-block', whiteSpace: 'nowrap' }}>
                            Start
                          </Link>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p style={{ fontFamily: inter, fontSize: 13, color: 'rgba(255,255,255,0.35)', margin: 0 }}>All started</p>
                )}
              </div>

            </div>
          </div>

          {/* Notes group */}
          {allNotes.length > 0 && (
            <div style={{ ...groupPanel, marginBottom: 0 }}>
              <h3 style={groupHeader}>Notes</h3>
              <PlanNotesGrid notes={allNotes} allDomains={allDomains} />
            </div>
          )}

        </div>
        </div>
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
  if (entry.document_type === 'advance_directive_supplement') return 'Your Wishes'
  if (entry.document_type === 'personal_admin_info') return 'Personal Admin Info'
  if (entry.document_type === 'important_contacts') return 'Important Contacts'
  if (entry.document_type === 'devices_and_accounts') return 'Devices & Accounts'
  if (entry.document_type === 'financial_information') return 'Financial Information'
  if (entry.document_type === 'keepsake_inventory') return 'Keepsakes Inventory'
  if (entry.activity === 'values_ranking') return 'Values Ranking'
  if (entry.activity === 'fears_ranking') return 'Fears Ranking'
  if (entry.activity === 'legacy_map') return 'Legacy Map'
  if (entry.title?.trim()) return entry.title.trim()
  return 'Untitled'
}
