import Link from 'next/link'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import UnassignedSection from '@/app/components/UnassignedSection'
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

export default async function AllUnassignedPage() {
  const supabase = await createSupabaseServerClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return <div>Not authenticated</div>

  const STRUCTURED_ACTIVITIES = ['values_ranking', 'fears_ranking', 'legacy_map']

  const [
    { data: entries },
    { data: allNotes },
    { data: domainContainers },
  ] = await Promise.all([
    supabase
      .from('entries')
      .select('id, title, content, created_at, section, activity, document_type')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false }),
    supabase
      .from('notes')
      .select('id, content, created_at, origin_type, prompt_context, note_mode, audio_url, transcript, duration_seconds, transcription_status')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false }),
    supabase
      .from('containers')
      .select('id, title')
      .eq('type', 'domain')
      .order('title'),
  ])

  const domainIds = domainContainers?.map((d) => d.id) ?? []

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

  const assignedNoteIds = new Set(allNoteDomainLinks.map((l) => l.note_id))
  const assignedEntryIds = new Set(allEntryDomainLinks.map((l) => l.entry_id))

  const unassignedNotes: UnassignedNote[] = (allNotes ?? [])
    .filter((n) => !assignedNoteIds.has(n.id))
    .map((n) => ({
      id: n.id,
      content: n.content,
      timestamp: formatDate(n.created_at),
      originType: n.origin_type ?? null,
      promptContext: n.prompt_context ?? null,
      noteMode: (n.note_mode as 'text' | 'audio' | null) ?? null,
      audioUrl: n.audio_url ?? null,
      transcript: n.transcript ?? null,
      durationSeconds: n.duration_seconds ?? null,
      transcriptionStatus: (n.transcription_status as 'pending' | 'complete' | 'failed' | null) ?? null,
    }))

  const documents = entries?.filter((e) => e.document_type || e.section === 'capture') ?? []
  const activityEntries = entries?.filter((e) => STRUCTURED_ACTIVITIES.includes(e.activity ?? '')) ?? []

  const seenEntryIds = new Set<string>()
  const unassignedEntries: UnassignedEntry[] = []
  for (const e of [...documents, ...activityEntries]) {
    if (!seenEntryIds.has(e.id) && !assignedEntryIds.has(e.id)) {
      seenEntryIds.add(e.id)
      unassignedEntries.push({
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

  return (
    <div
      className="min-h-screen"
      style={{ background: 'radial-gradient(circle at 20% 20%, #2C3777 0%, #130426 60%)' }}
    >
      <div className="max-w-4xl mx-auto px-4 py-16">
        <div className="mb-10">
          <Link
            href="/app/materials"
            className="text-sm text-white/60 hover:text-white transition-colors"
          >
            ← My Materials
          </Link>
        </div>

        <div className="mb-10">
          <h1 className="ns-title-activity text-white">
            All unassigned
          </h1>
          <p className="text-body text-white" style={{ marginTop: '12px' }}>
            {unassignedNotes.length + unassignedEntries.length} item
            {unassignedNotes.length + unassignedEntries.length !== 1 ? 's' : ''} not yet added to a planning area.
          </p>
        </div>

        <UnassignedSection
          notes={unassignedNotes}
          entries={unassignedEntries}
          allDomains={allDomains}
          hasDomains={allDomains.length > 0}
          showAll
        />
      </div>
    </div>
  )
}

function formatDate(dateString: string | null): string | null {
  if (!dateString) return null
  const date = new Date(dateString)
  if (Number.isNaN(date.getTime())) return null
  return date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
}

function getContinueHref(entry: EntryRow): string | null {
  if (entry.document_type === 'advance_directive_supplement') return '/app/capture/advance-directive'
  if (entry.document_type === 'personal_admin_info') return '/app/capture/personal-admin'
  if (entry.document_type === 'important_contacts') return '/app/capture/important-contacts'
  if (entry.document_type === 'devices_and_accounts') return '/app/capture/devices-and-accounts'
  if (entry.document_type === 'financial_information') return '/app/capture/financial-information'
  if (entry.activity === 'values_ranking') return `/app/entries/${entry.id}`
  if (entry.activity === 'fears_ranking') return `/app/entries/${entry.id}`
  if (entry.activity === 'legacy_map') return `/app/entries/${entry.id}`
  if (entry.document_type === 'keepsake_inventory') return '/app/capture/keepsake-inventory'
  return null
}

function getDisplayTitle(entry: EntryRow): string {
  if (entry.document_type === 'advance_directive_supplement') return 'Advance Directive Supplement'
  if (entry.document_type === 'personal_admin_info') return 'Personal Admin Info'
  if (entry.document_type === 'important_contacts') return 'Important Contacts'
  if (entry.document_type === 'devices_and_accounts') return 'Devices & Accounts'
  if (entry.document_type === 'financial_information') return 'Financial Information'
  if (entry.document_type === 'keepsake_inventory') return 'Meaningful Keepsakes'
  if (entry.activity === 'values_ranking') return 'Values Ranking'
  if (entry.activity === 'fears_ranking') return 'Fears Ranking'
  if (entry.activity === 'legacy_map') return 'Legacy Map'
  if (entry.title?.trim()) return entry.title.trim()
  return 'Untitled'
}
