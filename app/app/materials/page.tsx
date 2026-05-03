import { createSupabaseServerClient } from '@/lib/supabase-server'
import DomainStateCard from '@/app/components/DomainStateCard'
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
  { type: 'keepsake_inventory',           label: 'Keepsake Inventory',   href: '/app/capture/keepsake-inventory'    },
]

const STRUCTURED_ACTIVITIES = ['values_ranking', 'fears_ranking', 'legacy_map']

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
    { data: noteLinks },
    { data: entryLinks },
  ] = await Promise.all([
    supabase
      .from('entries')
      .select('id, title, content, created_at, section, activity, document_type')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false }),
    supabase
      .from('notes')
      .select('id, content, created_at, origin_type, prompt_context, note_mode, transcript')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false }),
    supabase
      .from('containers')
      .select('id, title')
      .eq('type', 'domain')
      .order('title'),
    supabase
      .from('container_notes')
      .select('note_id, container_id'),
    supabase
      .from('container_entries')
      .select('entry_id, container_id'),
  ])

  const allNotes = allNotesRaw ?? []
  const allDomains = domainContainers ?? []

  // --- Per-domain material counts ---
  const domainCounts: Record<string, { docs: number; notes: number; outputs: number }> = {}
  for (const domain of allDomains) {
    const linkedNoteIds = new Set(
      (noteLinks ?? []).filter(l => l.container_id === domain.id).map(l => l.note_id)
    )
    const linkedEntryIds = new Set(
      (entryLinks ?? []).filter(l => l.container_id === domain.id).map(l => l.entry_id)
    )
    let docs = 0, outputs = 0
    for (const entryId of linkedEntryIds) {
      const entry = (entries ?? []).find(e => e.id === entryId)
      if (!entry) continue
      if (entry.document_type) docs++
      else if (entry.activity && STRUCTURED_ACTIVITIES.includes(entry.activity)) outputs++
    }
    domainCounts[domain.id] = { docs, notes: linkedNoteIds.size, outputs }
  }

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

  // --- Working outputs: dedup by activity, most recent only ---
  const seenActivities = new Set<string>()
  const workingOutputs = (entries ?? []).filter((e) => {
    if (!e.activity || !STRUCTURED_ACTIVITIES.includes(e.activity)) return false
    if (seenActivities.has(e.activity)) return false
    seenActivities.add(e.activity)
    return true
  })

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
    marginBottom: 24,
  }

  const groupHeader: React.CSSProperties = {
    fontFamily: apfel,
    fontSize: 22,
    fontWeight: 500,
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
    marginBottom: 10,
    marginTop: 0,
  }

  const docButton: React.CSSProperties = {
    width: 260,
    minHeight: 36,
    background: '#F8F4EB',
    borderRadius: 999,
    padding: '8px 14px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    transition: 'background 150ms ease',
  }

  const outputButton: React.CSSProperties = {
    width: 220,
    minHeight: 36,
    background: '#FFFFFF',
    borderRadius: 999,
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
        .plan-pill-doc:hover  { background: #EDE7D9 !important; }
        .plan-pill-doc:hover .plan-pill-title  { text-decoration: underline; }
        .plan-pill-out:hover  { background: #EDEDED !important; }
        .plan-pill-out:hover .plan-pill-title  { text-decoration: underline; }
      `}</style>

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '80px 24px 80px' }}>

        {/* Page header */}
        <div style={{ marginBottom: 48 }}>
          <SectionTitleReveal title="Your Plan" color="#130426" size={64} />
        </div>

        {/* ── Areas of planning ── */}
        <section style={{ marginBottom: 56 }}>
          <h2 style={{ ...sectionHeader, color: '#130426' }}>Areas of planning</h2>
          <p style={{ fontFamily: inter, fontSize: 17, color: 'rgba(19,4,38,0.85)', maxWidth: 600, marginBottom: 24, marginTop: 0, lineHeight: 1.6 }}>
            Each area is where you build and organize your plan.<br/>Below you can find all the materials you've created across areas.
          </p>
          <div style={{ background: 'rgba(19,4,38,0.04)', border: '1px solid rgba(0,0,0,0.08)', borderRadius: 24, padding: 24 }}>
            {allDomains.length > 0 ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 20 }}>
                {allDomains.map((domain, i) => (
                  <DomainStateCard
                    key={domain.id}
                    domain={domain}
                    colorIndex={i}
                    docCount={domainCounts[domain.id]?.docs ?? 0}
                    noteCount={domainCounts[domain.id]?.notes ?? 0}
                    outputCount={domainCounts[domain.id]?.outputs ?? 0}
                  />
                ))}
              </div>
            ) : (
              <p style={{ fontFamily: inter, fontSize: 16, color: 'rgba(19,4,38,0.45)', margin: 0 }}>
                No areas yet.
              </p>
            )}
          </div>
        </section>

        {/* ── Your materials ── */}
        <div style={{ borderTop: '1px solid rgba(0,0,0,0.1)', marginTop: 48, paddingTop: 32 }}>
        <div style={{ background: 'rgba(44,55,119,0.85)', borderRadius: 20, padding: 28 }}>
          <h2 style={sectionHeader}>Your materials</h2>

          {/* Documents group */}
          <div style={groupPanel}>
            <h3 style={groupHeader}>Documents</h3>
            <p style={{ fontFamily: inter, fontSize: 14, color: 'rgba(255,255,255,0.7)', maxWidth: 480, marginBottom: 16, marginTop: 0, lineHeight: 1.55 }}>
              Templates to help you document what matters and stay organized.<br />
              For legal requirements, see guidance in the <Link href="/app/learn" style={{ color: 'rgba(255,255,255,0.7)', textDecoration: 'underline' }}>Learn</Link> section.
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>

              {/* In progress */}
              <div>
                <p style={columnHeader}>In progress</p>
                {inProgressDocs.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {inProgressDocs.map((doc) => (
                      <Link key={doc.type} href={`/app/entries/${doc.entryId}`} style={{ textDecoration: 'none' }}>
                        <div className="plan-pill-doc" style={docButton}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                            <DocIcon />
                            <span className="plan-pill-title" style={{ fontFamily: inter, fontSize: 14, fontWeight: 500, color: '#1A1A1A', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{doc.label}</span>
                          </div>
                          <span style={{ fontFamily: inter, fontSize: 13, color: 'rgba(26,26,26,0.6)', flexShrink: 0 }}>→</span>
                        </div>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <p style={{ fontFamily: inter, fontSize: 13, color: 'rgba(255,255,255,0.35)', margin: 0 }}>None yet</p>
                )}
              </div>

              {/* Not started */}
              <div>
                <p style={columnHeader}>Not started</p>
                {notStartedDocs.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {notStartedDocs.map((doc) => (
                      <Link key={doc.type} href={doc.href} style={{ textDecoration: 'none' }}>
                        <div className="plan-pill-doc" style={docButton}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                            <DocIcon />
                            <span className="plan-pill-title" style={{ fontFamily: inter, fontSize: 14, fontWeight: 500, color: '#1A1A1A', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{doc.label}</span>
                          </div>
                          <span style={{ fontFamily: inter, fontSize: 13, color: 'rgba(26,26,26,0.6)', flexShrink: 0 }}>→</span>
                        </div>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <p style={{ fontFamily: inter, fontSize: 13, color: 'rgba(255,255,255,0.35)', margin: 0 }}>All started</p>
                )}
              </div>

            </div>
          </div>

          {/* Activity outputs group */}
          {workingOutputs.length > 0 && (
            <div style={groupPanel}>
              <h3 style={groupHeader}>Activity outputs</h3>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {workingOutputs.map((entry) => (
                  <Link key={entry.id} href={`/app/entries/${entry.id}`} style={{ textDecoration: 'none' }}>
                    <div className="plan-pill-out" style={outputButton}>
                      <span className="plan-pill-title" style={{ fontFamily: inter, fontSize: 14, fontWeight: 500, color: '#1A1A1A', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{getDisplayTitle(entry)}</span>
                      <span style={{ fontFamily: inter, fontSize: 13, color: 'rgba(26,26,26,0.6)', flexShrink: 0 }}>→</span>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

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
  const c = entry.content
  if (typeof c === 'string') return c.trim().length > 0
  if (c && typeof c === 'object') {
    return Object.values(c as Record<string, unknown>).some(
      (v) => typeof v === 'string' && (v as string).trim().length > 0
    )
  }
  return false
}

function getDisplayTitle(entry: EntryRow): string {
  if (entry.document_type === 'advance_directive_supplement') return 'Your Wishes'
  if (entry.document_type === 'personal_admin_info') return 'Personal Admin Info'
  if (entry.document_type === 'important_contacts') return 'Important Contacts'
  if (entry.document_type === 'devices_and_accounts') return 'Devices & Accounts'
  if (entry.document_type === 'financial_information') return 'Financial Information'
  if (entry.document_type === 'keepsake_inventory') return 'Keepsake Inventory'
  if (entry.activity === 'values_ranking') return 'Values Ranking'
  if (entry.activity === 'fears_ranking') return 'Fears Ranking'
  if (entry.activity === 'legacy_map') return 'Legacy Map'
  if (entry.title?.trim()) return entry.title.trim()
  return 'Untitled'
}
