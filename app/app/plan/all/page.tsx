import Link from 'next/link'
import { ACTIVITY, STRUCTURED_ACTIVITIES, DOCUMENT_TYPE_META, DOCUMENT_TYPE } from '@/lib/content-metadata'
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

  // proxy.ts middleware enforces auth on /app/*; this branch is unreachable.
  // The throw preserves type narrowing for user.id below.
  if (!user) throw new Error('Unreachable: auth middleware bypassed on /app/plan/all')


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
            href="/app/plan"
            className="text-sm text-white/60 hover:text-white transition-colors"
          >
            ← Your Plan
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
  if (entry.document_type === DOCUMENT_TYPE.ADVANCE_DIRECTIVE_SUPPLEMENT) return DOCUMENT_TYPE_META.advance_directive_supplement.href
  if (entry.document_type === DOCUMENT_TYPE.PERSONAL_ADMIN_INFO) return DOCUMENT_TYPE_META.personal_admin_info.href
  if (entry.document_type === DOCUMENT_TYPE.IMPORTANT_CONTACTS) return DOCUMENT_TYPE_META.important_contacts.href
  if (entry.document_type === DOCUMENT_TYPE.DEVICES_AND_ACCOUNTS) return DOCUMENT_TYPE_META.devices_and_accounts.href
  if (entry.document_type === DOCUMENT_TYPE.FINANCIAL_INFORMATION) return DOCUMENT_TYPE_META.financial_information.href
  if (entry.activity === ACTIVITY.VALUES_RANKING) return `/app/entries/${entry.id}`
  if (entry.activity === ACTIVITY.FEARS_RANKING) return `/app/entries/${entry.id}`
  if (entry.activity === ACTIVITY.LEGACY_MAP) return `/app/entries/${entry.id}`
  if (entry.document_type === DOCUMENT_TYPE.KEEPSAKE_INVENTORY) return DOCUMENT_TYPE_META.keepsake_inventory.href
  return null
}

function getDisplayTitle(entry: EntryRow): string {
  if (entry.document_type === DOCUMENT_TYPE.ADVANCE_DIRECTIVE_SUPPLEMENT) return DOCUMENT_TYPE_META.advance_directive_supplement.label
  if (entry.document_type === DOCUMENT_TYPE.PERSONAL_ADMIN_INFO) return DOCUMENT_TYPE_META.personal_admin_info.label
  if (entry.document_type === DOCUMENT_TYPE.IMPORTANT_CONTACTS) return DOCUMENT_TYPE_META.important_contacts.label
  if (entry.document_type === DOCUMENT_TYPE.DEVICES_AND_ACCOUNTS) return DOCUMENT_TYPE_META.devices_and_accounts.label
  if (entry.document_type === DOCUMENT_TYPE.FINANCIAL_INFORMATION) return DOCUMENT_TYPE_META.financial_information.label
  if (entry.document_type === DOCUMENT_TYPE.KEEPSAKE_INVENTORY) return DOCUMENT_TYPE_META.keepsake_inventory.label
  if (entry.activity === ACTIVITY.VALUES_RANKING) return 'Values Ranking'
  if (entry.activity === ACTIVITY.FEARS_RANKING) return 'Fears Ranking'
  if (entry.activity === ACTIVITY.LEGACY_MAP) return 'Legacy Map'
  if (entry.title?.trim()) return entry.title.trim()
  return 'Untitled'
}
