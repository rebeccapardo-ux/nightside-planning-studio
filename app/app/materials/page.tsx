import { createSupabaseServerClient } from '@/lib/supabase-server'
import UnassignedSection from '@/app/components/UnassignedSection'
import DomainStateCard from '@/app/components/DomainStateCard'
import type { Container } from '@/lib/notes'
import type { UnassignedNote, UnassignedEntry } from '@/app/components/UnassignedSection'

type EntryRow = {
  id: string
  title: string | null
  content: unknown
  created_at: string | null
  section: string | null
  activity: string | null
  document_type: string | null
}

export default async function MaterialsPage() {
  const supabase = await createSupabaseServerClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return <div>Not authenticated</div>
  }

  // All user entries
  const { data: entries, error } = await supabase
    .from('entries')
    .select('id, title, content, created_at, section, activity, document_type')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  if (error) {
    console.error(error)
    return <div>Error loading materials</div>
  }

  // Working Outputs: structured exercise outputs only.
  const STRUCTURED_ACTIVITIES = ['values_ranking', 'fears_ranking', 'legacy_map']
  const documents = entries?.filter((e) => e.document_type || e.section === 'capture') || []
  const activityEntries = entries?.filter((e) => STRUCTURED_ACTIVITIES.includes(e.activity ?? '')) || []

  // All user notes (for previews + unassigned detection)
  const { data: allNotes } = await supabase
    .from('notes')
    .select('id, content, created_at, origin_type, prompt_context')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  // Domain containers
  const { data: domainContainers } = await supabase
    .from('containers')
    .select('id, title')
    .eq('type', 'domain')
    .order('title')

  const domainIds = domainContainers?.map((d) => d.id) ?? []

  // All note-domain and entry-domain links
  let allNoteDomainLinks: { note_id: string; container_id: string }[] = []
  let allEntryDomainLinks: { entry_id: string; container_id: string }[] = []

  if (domainIds.length > 0) {
    const [noteLinkResult, entryLinkResult] = await Promise.all([
      supabase.from('container_notes').select('note_id, container_id').in('container_id', domainIds),
      supabase.from('container_entries').select('entry_id, container_id').in('container_id', domainIds),
    ])
    allNoteDomainLinks = noteLinkResult.data ?? []
    allEntryDomainLinks = entryLinkResult.data ?? []
  }

  // Build bidirectional maps
  const noteDomainMap: Record<string, string[]> = {}
  const domainNoteCount: Record<string, number> = {}
  for (const link of allNoteDomainLinks) {
    if (!noteDomainMap[link.note_id]) noteDomainMap[link.note_id] = []
    noteDomainMap[link.note_id].push(link.container_id)
    domainNoteCount[link.container_id] = (domainNoteCount[link.container_id] ?? 0) + 1
  }

  const entryDomainMap: Record<string, string[]> = {}
  const domainEntryCount: Record<string, number> = {}
  for (const link of allEntryDomainLinks) {
    if (!entryDomainMap[link.entry_id]) entryDomainMap[link.entry_id] = []
    entryDomainMap[link.entry_id].push(link.container_id)
    domainEntryCount[link.container_id] = (domainEntryCount[link.container_id] ?? 0) + 1
  }

  // Combined item count per domain
  const domainTotalCounts: Record<string, number> = {}
  for (const [dId, c] of Object.entries(domainNoteCount)) {
    domainTotalCounts[dId] = (domainTotalCounts[dId] ?? 0) + c
  }
  for (const [dId, c] of Object.entries(domainEntryCount)) {
    domainTotalCounts[dId] = (domainTotalCounts[dId] ?? 0) + c
  }

  // Per-domain doc and output counts (for state signal)
  const domainDocCount: Record<string, number> = {}
  const domainOutputCount: Record<string, number> = {}
  for (const link of allEntryDomainLinks) {
    const entry = entries?.find((e) => e.id === link.entry_id)
    if (!entry) continue
    if (entry.document_type) {
      domainDocCount[link.container_id] = (domainDocCount[link.container_id] ?? 0) + 1
    }
    if (entry.activity) {
      domainOutputCount[link.container_id] = (domainOutputCount[link.container_id] ?? 0) + 1
    }
  }

  // Unassigned: notes/entries not linked to any domain
  const assignedNoteIds = new Set(allNoteDomainLinks.map((l) => l.note_id))
  const assignedEntryIds = new Set(allEntryDomainLinks.map((l) => l.entry_id))

  const unassignedNoteData: UnassignedNote[] = (allNotes ?? [])
    .filter((n) => !assignedNoteIds.has(n.id))
    .map((n) => ({
      id: n.id,
      content: n.content,
      timestamp: formatDate(n.created_at),
      originType: n.origin_type ?? null,
      promptContext: n.prompt_context ?? null,
    }))

  const seenEntryIds = new Set<string>()
  const unassignedEntryData: UnassignedEntry[] = []
  for (const e of [...documents, ...activityEntries]) {
    if (!seenEntryIds.has(e.id) && !assignedEntryIds.has(e.id)) {
      seenEntryIds.add(e.id)
      unassignedEntryData.push({
        id: e.id,
        title: getDisplayTitle(e),
        kind: e.document_type ? 'Document' : e.activity ? 'Working output' : null,
        timestamp: formatDate(e.created_at),
        continueHref: getContinueHref(e),
        activity: e.activity ?? null,
      })
    }
  }

  const allDomains: Container[] = domainContainers ?? []
  const hasUnassigned = unassignedNoteData.length > 0 || unassignedEntryData.length > 0
  const hasDomains = allDomains.length > 0

  return (
    <div
      className="min-h-screen"
      style={{ background: 'radial-gradient(circle at 20% 20%, #2C3777 0%, #130426 60%)' }}
    >
      <div className="max-w-7xl mx-auto px-4 py-16">
        <div className="mb-20">
          <h1 className="text-h1 text-white mb-4 underline decoration-[#f29836] decoration-[3px] underline-offset-[8px]">My Materials</h1>
          <p className="text-body text-white max-w-xl">
            All your materials in one place, for you to review, refine, and export.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1.5fr_1fr] gap-16 items-start">

          {/* Left: organized by area */}
          <div>
            {hasDomains && (
              <section>
                <h2 className="text-h3 text-white mb-8 underline decoration-[#f29836] decoration-[3px] underline-offset-[6px]" style={{ fontSize: '28px', marginTop: '48px' }}>
                  Organized by area
                </h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3" style={{ gridAutoRows: '1fr' }}>
                  {allDomains.map((domain, i) => (
                    <DomainStateCard
                      key={domain.id}
                      domain={domain}
                      colorIndex={i}
                      totalCount={domainTotalCounts[domain.id] ?? 0}
                      docsCount={domainDocCount[domain.id] ?? 0}
                      outputsCount={domainOutputCount[domain.id] ?? 0}
                    />
                  ))}
                </div>
              </section>
            )}

            {!hasDomains && !hasUnassigned && (
              <p className="text-body text-white">
                Nothing here yet. Start by completing an activity or saving a note.
              </p>
            )}
          </div>

          {/* Right: unassigned materials */}
          <div className="lg:sticky lg:top-6">
            {hasUnassigned && (
              <UnassignedSection
                notes={unassignedNoteData}
                entries={unassignedEntryData}
                allDomains={allDomains}
                hasDomains={hasDomains}
              />
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

function getContinueHref(entry: EntryRow): string | null {
  if (entry.document_type === 'advance_directive_supplement') return '/app/capture/advance-directive'
  if (entry.document_type === 'personal_admin_info') return '/app/capture/personal-admin'
  if (entry.document_type === 'important_contacts') return '/app/capture/important-contacts'
  if (entry.document_type === 'devices_and_accounts') return '/app/capture/devices-and-accounts'
  if (entry.document_type === 'financial_information') return '/app/capture/financial-information'
  // Working outputs: open snapshot view, not the exercise directly
  if (entry.activity === 'values_ranking') return `/app/entries/${entry.id}`
  if (entry.activity === 'fears_ranking') return `/app/entries/${entry.id}`
  if (entry.activity === 'legacy_map') return `/app/entries/${entry.id}`
  return null
}

function getDisplayTitle(entry: EntryRow): string {
  if (entry.title?.trim()) return entry.title.trim()
  if (entry.document_type === 'advance_directive_supplement') return 'Advance Directive Supplement'
  if (entry.document_type === 'personal_admin_info') return 'Personal Admin Info'
  if (entry.document_type === 'important_contacts') return 'Important Contacts'
  if (entry.document_type === 'devices_and_accounts') return 'Devices & Accounts'
  if (entry.document_type === 'financial_information') return 'Financial Information'
  if (entry.activity === 'values_ranking') return 'Values Ranking'
  if (entry.activity === 'fears_ranking') return 'Fears Ranking'
  if (entry.activity === 'legacy_map') return 'Legacy Map'

  const preview = getPreviewText(entry)
  return preview ? truncate(preview, 72) : 'Untitled'
}

function getPreviewText(entry: EntryRow): string | null {
  const content = entry.content
  if (typeof content === 'string' && content.trim().length > 0) {
    return truncate(content.trim(), 180)
  }
  if (!content || typeof content !== 'object') return null

  const values = Object.values(content as Record<string, unknown>)
    .filter((v) => typeof v === 'string')
    .map((v) => (v as string).trim())
    .filter(Boolean)

  return values.length > 0 ? truncate(values[0], 180) : null
}

function formatDate(dateString: string | null): string | null {
  if (!dateString) return null
  const date = new Date(dateString)
  if (Number.isNaN(date.getTime())) return null
  return date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
}

function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text
  return `${text.slice(0, maxLength).trim()}…`
}
