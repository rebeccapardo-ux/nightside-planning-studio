'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { use } from 'react'
import {
  addNoteToContainer,
  addEntryToContainer,
  removeNoteFromContainer,
  removeEntryFromContainer,
  createNote,
  updateNote,
  fetchNotesByDomainId,
  fetchEntriesByDomainId,
  fetchContainers,
  fetchNoteContainerLinks,
  fetchEntryContainerLinks,
  fetchNotes,
  fetchAllUserEntries,
  type Note,
  type Container,
  type EntryRef,
} from '@/lib/notes'
import DomainAssigner from '@/app/components/DomainAssigner'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function entryLabel(entry: EntryRef): string {
  if (entry.title?.trim()) return entry.title.trim()
  if (entry.document_type === 'advance_directive_supplement') return 'Advance Directive Supplement'
  if (entry.document_type === 'personal_admin_info') return 'Personal Admin Info'
  if (entry.document_type === 'important_contacts') return 'Important Contacts'
  if (entry.document_type === 'devices_and_accounts') return 'Devices & Accounts'
  if (entry.document_type === 'financial_information') return 'Financial Information'
  if (entry.activity === 'values_ranking') return 'Values Ranking'
  if (entry.activity === 'fears_ranking') return 'Fears Ranking'
  return 'Untitled'
}

function getEntryHref(entry: EntryRef, domainId?: string): string {
  if (entry.document_type === 'advance_directive_supplement') return '/app/capture/advance-directive'
  if (entry.document_type === 'personal_admin_info') return '/app/capture/personal-admin'
  if (entry.document_type === 'important_contacts') return '/app/capture/important-contacts'
  if (entry.document_type === 'devices_and_accounts') return '/app/capture/devices-and-accounts'
  if (entry.document_type === 'financial_information') return '/app/capture/financial-information'
  const returnTo = domainId ? `?returnTo=/app/domains/${domainId}` : ''
  if (entry.activity === 'values_ranking') return `/app/entries/${entry.id}${returnTo}`
  if (entry.activity === 'fears_ranking') return `/app/entries/${entry.id}${returnTo}`
  return `/app/entries/${entry.id}`
}

function truncate(text: string, max: number) {
  return text.length <= max ? text : text.slice(0, max).trimEnd() + '…'
}

type AddExistingFor = 'note' | 'document' | 'output' | null

// ---------------------------------------------------------------------------
// Domain structure types and config
// ---------------------------------------------------------------------------

type DomainItemStatus = 'not_started' | 'in_progress' | 'complete'

type OrientationItemDef = {
  key: string
  title: string
  explanation: string
  helperText?: string
  relatedActivities?: string[]
  relatedDocumentTypes?: string[]
  learnHref?: string
}

type ReadinessItemDef = {
  key: string
  title: string
  explanation: string
  relatedActivities?: string[]
  relatedDocumentTypes?: string[]
  checkboxes: string[]
}

type DomainStructure = {
  orientation: OrientationItemDef[]
  readiness: ReadinessItemDef[]
}

const DOMAIN_STRUCTURE_MAP: { match: string; structure: DomainStructure }[] = [
  {
    match: 'healthcare',
    structure: {
      orientation: [
        {
          key: 'values_care_priorities',
          title: 'My values and priorities for care at end of life',
          explanation: '',
          relatedActivities: ['values_ranking', 'fears_ranking'],
          learnHref: '/app/learn/healthcare',
        },
        {
          key: 'decision_making_framework',
          title: 'Understand how substitute decision-making for care works in my province',
          explanation: '',
          learnHref: '/app/learn/healthcare',
        },
        {
          key: 'who_would_speak',
          title: 'Consider who I would want to make decisions for me if I were not able to',
          explanation: '',
          relatedDocumentTypes: ['important_contacts'],
          learnHref: '/app/learn/healthcare',
        },
      ],
      readiness: [
        {
          key: 'sdm_identified_documented',
          title: 'Substitute decision maker identified and documented',
          explanation: 'Identifying and legally documenting my substitute decision-maker where applicable.',
          relatedDocumentTypes: ['important_contacts'],
          checkboxes: ['I have identified my substitute decision-maker', 'I have documented them legally (if applicable)'],
        },
        {
          key: 'sdm_confirmed',
          title: 'Substitute decision maker',
          explanation: '',
          checkboxes: ['My SDM has agreed to the role'],
        },
        {
          key: 'wishes_discussed_sdm',
          title: 'Wishes discussed with SDM(s)',
          explanation: 'Discussing my healthcare values, priorities, and wishes with the person or people who may need to act.',
          relatedDocumentTypes: ['advance_directive_supplement'],
          checkboxes: ['I have discussed my wishes with my SDM'],
        },
        {
          key: 'advance_directive_reviewed',
          title: 'Advance directive',
          explanation: '',
          relatedDocumentTypes: ['advance_directive_supplement'],
          checkboxes: ['I have completed a legal advance directive (if applicable)', 'I have documented additional wishes'],
        },
        {
          key: 'supplementary_wishes_recorded',
          title: 'Supplementary wishes recorded',
          explanation: 'Recording additional wishes or values-based guidance somewhere accessible, such as the supplementary form on the platform.',
          relatedDocumentTypes: ['advance_directive_supplement'],
          checkboxes: ['I have recorded supplementary wishes somewhere accessible'],
        },
      ],
    },
  },
  {
    match: 'death',
    structure: {
      orientation: [
        {
          key: 'final_resting_place_wishes',
          title: 'Reflect on my wishes for my body\'s final resting place',
          explanation: '',
          learnHref: '/app/learn/deathcare',
        },
        {
          key: 'legal_options_province',
          title: 'Understand the legal options in my province',
          explanation: '',
          learnHref: '/app/learn/deathcare',
        },
      ],
      readiness: [
        {
          key: 'final_resting_place_recorded',
          title: 'Final resting place wishes',
          explanation: '',
          relatedDocumentTypes: ['personal_admin_info'],
          checkboxes: ['Included in my will', 'Communicated to my loved ones'],
        },
        {
          key: 'practical_preferences_recorded',
          title: 'Practical preferences recorded',
          explanation: 'Recording any other relevant practical preferences somewhere accessible.',
          relatedDocumentTypes: ['personal_admin_info'],
          checkboxes: ['My practical preferences are recorded somewhere accessible'],
        },
      ],
    },
  },
  {
    match: 'will',
    structure: {
      orientation: [
        {
          key: 'legal_will_requirements',
          title: 'Understand the requirements for a legal will in my province',
          explanation: '',
          learnHref: '/app/learn/wills',
        },
        {
          key: 'executor_choice',
          title: 'Consider who I want to name as executor',
          explanation: '',
          relatedDocumentTypes: ['important_contacts'],
          learnHref: '/app/learn/wills',
        },
        {
          key: 'asset_wishes',
          title: 'Reflect on wishes for my assets',
          explanation: '',
          relatedDocumentTypes: ['financial_information'],
          learnHref: '/app/learn/wills',
        },
        {
          key: 'care_children_pets',
          title: 'Care of children or pets',
          explanation: 'Reflecting on wishes for children or pets, if relevant.',
          learnHref: '/app/learn/wills',
        },
        {
          key: 'meaningful_objects',
          title: 'Meaningful objects',
          explanation: 'Reflecting on what should happen to meaningful objects or keepsakes.',
          learnHref: '/app/learn/wills',
        },
        {
          key: 'additional_estate_planning',
          title: 'Consider whether additional estate planning may apply to my situation',
          explanation: '',
          learnHref: '/app/learn/wills',
        },
      ],
      readiness: [
        {
          key: 'legal_will_in_place',
          title: 'Legal will',
          explanation: '',
          relatedDocumentTypes: ['financial_information'],
          checkboxes: ['I have created a valid legal will', 'My will is up to date'],
        },
        {
          key: 'other_estate_planning',
          title: 'Additional estate planning',
          explanation: 'May apply depending on your situation',
          relatedDocumentTypes: ['financial_information'],
          checkboxes: ['I have identified any additional planning needs relevant to my situation', 'I have taken steps to address them'],
        },
        {
          key: 'professional_support',
          title: 'Professional support consulted if needed',
          explanation: 'May include meeting with a lawyer, estate planner, or financial advisor.',
          relatedDocumentTypes: ['financial_information'],
          checkboxes: ['I have consulted professional support if needed'],
        },
      ],
    },
  },
  {
    match: 'ritual',
    structure: {
      orientation: [
        {
          key: 'ritual_ceremony_wishes',
          title: 'Reflect on wishes for ritual and ceremony',
          explanation: '',
          learnHref: '/app/learn/ritual',
        },
      ],
      readiness: [
        {
          key: 'preferences_communicated',
          title: 'Communicating ritual and ceremony preferences',
          explanation: '',
          relatedDocumentTypes: ['important_contacts'],
          checkboxes: ['I have shared my preferences with loved ones'],
        },
        {
          key: 'preferences_recorded',
          title: 'Preferences recorded somewhere accessible',
          explanation: 'Recording these preferences somewhere I can return to them.',
          relatedDocumentTypes: ['personal_admin_info'],
          checkboxes: ['My preferences are recorded somewhere accessible'],
        },
      ],
    },
  },
  {
    match: 'legacy',
    structure: {
      orientation: [
        {
          key: 'what_leaving_behind',
          title: 'Reflect on what I am leaving behind',
          explanation: '',
          relatedActivities: ['legacy_map'],
          learnHref: '/app/learn/legacy',
        },
        {
          key: 'stories_messages',
          title: 'Consider stories or messages to share',
          explanation: '',
          relatedActivities: ['legacy_map'],
          learnHref: '/app/learn/legacy',
        },
      ],
      readiness: [
        {
          key: 'meaningful_expression_in_motion',
          title: 'Meaningful expression in motion',
          explanation: 'Taking time for any self-expression, storytelling, or projects that feel meaningful.',
          relatedActivities: ['legacy_map'],
          checkboxes: ['I have created or documented something meaningful'],
        },
      ],
    },
  },
]

function getDomainStructure(domainTitle: string): DomainStructure | null {
  const lower = domainTitle.toLowerCase()
  for (const entry of DOMAIN_STRUCTURE_MAP) {
    if (lower.includes(entry.match)) return entry.structure
  }
  return null
}

// ---------------------------------------------------------------------------
// Section palette
// ---------------------------------------------------------------------------

const SECTION_COLORS = {
  notes:   { bgStyle: { background: 'rgba(44, 55, 119, 0.07)'  } as React.CSSProperties, text: 'text-[#130426]', muted: 'text-[#2C3777]', faint: 'text-[#130426]/50' },
  docs:    { bgStyle: { background: 'rgba(242, 152, 54, 0.08)'  } as React.CSSProperties, text: 'text-[#130426]', muted: 'text-[#2C3777]', faint: 'text-[#130426]/50' },
  outputs: { bgStyle: { background: 'rgba(187, 171, 244, 0.20)' } as React.CSSProperties, text: 'text-[#130426]', muted: 'text-[#2C3777]', faint: 'text-[#130426]/50' },
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function DomainDetailPage({ params }: { params: Promise<{ domainId: string }> }) {
  const { domainId } = use(params)

  const [notes, setNotes] = useState<Note[]>([])
  const [entries, setEntries] = useState<EntryRef[]>([])
  const [domain, setDomain] = useState<Container | null>(null)
  const [allDomains, setAllDomains] = useState<Container[]>([])
  const [noteLinks, setNoteLinks] = useState<Record<string, string[]>>({})
  const [entryLinks, setEntryLinks] = useState<Record<string, string[]>>({})
  const [loading, setLoading] = useState(true)

  const [composerText, setComposerText] = useState('')
  const [saving, setSaving] = useState(false)
  const composerRef = useRef<HTMLTextAreaElement>(null)

  const [addExistingFor, setAddExistingFor] = useState<AddExistingFor>(null)
  const [allUserNotes, setAllUserNotes] = useState<Note[]>([])
  const [allUserEntries, setAllUserEntries] = useState<EntryRef[]>([])
  const [addSearch, setAddSearch] = useState('')
  const [loadingExisting, setLoadingExisting] = useState(false)

  const [readyStatusForHeader, setReadyStatusForHeader] = useState<Record<string, DomainItemStatus>>({})

  useEffect(() => {
    async function load() {
      const [loadedNotes, loadedEntries, containers] = await Promise.all([
        fetchNotesByDomainId(domainId),
        fetchEntriesByDomainId(domainId),
        fetchContainers(),
      ])
      setNotes(loadedNotes)
      setEntries(loadedEntries)
      setAllDomains(containers)
      setDomain(containers.find((c) => c.id === domainId) ?? null)

      const [noteLinkMap, entryLinkMap] = await Promise.all([
        loadedNotes.length > 0
          ? fetchNoteContainerLinks(loadedNotes.map((n) => n.id))
          : Promise.resolve({}),
        loadedEntries.length > 0
          ? fetchEntryContainerLinks(loadedEntries.map((e) => e.id))
          : Promise.resolve({}),
      ])
      setNoteLinks(noteLinkMap)
      setEntryLinks(entryLinkMap)
      setLoading(false)
    }
    load()
  }, [domainId])

  useEffect(() => {
    if (composerRef.current) {
      const el = composerRef.current
      el.style.height = 'auto'
      el.style.height = `${el.scrollHeight}px`
    }
  }, [composerText])

  async function handleSave() {
    const trimmed = composerText.trim()
    if (!trimmed || saving) return
    setSaving(true)
    const created = await createNote(trimmed)
    if (created) {
      await addNoteToContainer(created.id, domainId)
      setNotes((prev) => [created, ...prev])
      setNoteLinks((prev) => ({ ...prev, [created.id]: [domainId] }))
    }
    setComposerText('')
    setSaving(false)
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSave()
    }
  }

  async function handleOpenAddExisting(section: AddExistingFor) {
    if (addExistingFor === section) { setAddExistingFor(null); return }
    setAddExistingFor(section)
    setAddSearch('')
    if (allUserNotes.length === 0 && allUserEntries.length === 0) {
      setLoadingExisting(true)
      const [n, e] = await Promise.all([fetchNotes(), fetchAllUserEntries()])
      setAllUserNotes(n)
      setAllUserEntries(e)
      setLoadingExisting(false)
    }
  }

  async function handleToggleExistingNote(note: Note) {
    const isLinked = noteLinks[note.id]?.includes(domainId)
    if (isLinked) {
      await removeNoteFromContainer(note.id, domainId)
      setNoteLinks((prev) => ({ ...prev, [note.id]: (prev[note.id] ?? []).filter((id) => id !== domainId) }))
      setNotes((prev) => prev.filter((n) => n.id !== note.id))
    } else {
      await addNoteToContainer(note.id, domainId)
      setNoteLinks((prev) => ({ ...prev, [note.id]: [...(prev[note.id] ?? []), domainId] }))
      setNotes((prev) => [note, ...prev.filter((n) => n.id !== note.id)])
    }
  }

  async function handleToggleExistingEntry(entry: EntryRef) {
    const isLinked = entryLinks[entry.id]?.includes(domainId)
    if (isLinked) {
      await removeEntryFromContainer(entry.id, domainId)
      setEntryLinks((prev) => ({ ...prev, [entry.id]: (prev[entry.id] ?? []).filter((id) => id !== domainId) }))
      setEntries((prev) => prev.filter((e) => e.id !== entry.id))
    } else {
      await addEntryToContainer(entry.id, domainId)
      setEntryLinks((prev) => ({ ...prev, [entry.id]: [...(prev[entry.id] ?? []), domainId] }))
      setEntries((prev) => [entry, ...prev.filter((e) => e.id !== entry.id)])
    }
  }

  const searchLower = addSearch.toLowerCase()
  const filteredNotes = allUserNotes.filter((n) =>
    !addSearch || n.content.toLowerCase().includes(searchLower)
  )
  const filteredDocEntries = allUserEntries.filter((e) =>
    e.document_type && (!addSearch || entryLabel(e).toLowerCase().includes(searchLower))
  )
  const filteredOutputEntries = allUserEntries.filter((e) =>
    e.activity && (!addSearch || entryLabel(e).toLowerCase().includes(searchLower))
  )

  const documentEntries = entries.filter((e) => e.document_type)
  const workingOutputEntries = entries.filter((e) => e.activity)
  const c = SECTION_COLORS
  const domainStructure = domain ? getDomainStructure(domain.title) : null

  // Header: status counts across readiness items
  const { headerStatusLine } = (() => {
    const allStatuses = domainStructure?.readiness.map(i => readyStatusForHeader[i.key] ?? 'not_started') ?? []
    const inProgressCount = allStatuses.filter(s => s === 'in_progress').length
    const completeCount = allStatuses.filter(s => s === 'complete').length
    const notStartedCount = allStatuses.filter(s => s === 'not_started').length
    const parts: string[] = []
    if (inProgressCount > 0) parts.push(`${inProgressCount} in progress`)
    if (completeCount > 0) parts.push(`${completeCount} complete`)
    if (notStartedCount > 0) parts.push(`${notStartedCount} not started`)
    return { headerStatusLine: parts.join(' · ') }
  })()

  return (
    <div className="min-h-screen">

      {/* ── Header section — dark gradient ── */}
      <div style={{ background: 'radial-gradient(circle at 20% 20%, #1a0535 0%, #130426 70%)' }}>
        <div className="max-w-6xl mx-auto px-6 pt-14 pb-12">
          <Link href="/app/materials" className="text-app-secondary hover:text-[#f8f4eb] transition-colors text-sm">
            ← My Materials
          </Link>
          <div className="mt-5">
            <h1 className="text-[40px] font-bold leading-[1.2] text-white underline decoration-[#f29836] decoration-[3px] underline-offset-[8px]">
              {domain?.title ?? '…'}
            </h1>
          </div>
        </div>
      </div>

      {/* ── Planning Status section — light lavender ── */}
      {domainStructure && (
        <div style={{ background: '#EDE7FF' }}>
          <div className="max-w-6xl mx-auto px-6 py-12">
            <PlanningStatusSection
              domainId={domainId}
              structure={domainStructure}
              entries={entries}
              onReadyStatusChange={(key, status) => setReadyStatusForHeader(prev => ({ ...prev, [key]: status }))}
            />
          </div>
        </div>
      )}

      {/* ── Materials section — cream ── */}
      <div style={{ background: '#f8f4eb' }}>
        <div className="max-w-6xl mx-auto px-6 py-12">

          {!loading && (
            <div className="mb-8">
              <h2 className="text-[22px] font-semibold tracking-[0.01em] text-[#130426]">
                Materials in this area
              </h2>
              <p className="text-[14px] text-[#130426]/55 mt-1">
                Notes, documents, and outputs you can use and update as you work through this area.
              </p>
            </div>
          )}

        {/* Spatial canvas grid */}
        <div className="grid grid-cols-1 lg:grid-cols-[3fr_2fr] gap-6 items-start">

          {/* ── Notes (left, wide) ── */}
          <div className="rounded-2xl p-6" style={c.notes.bgStyle}>
            <SectionHeader
              label="Notes"
              colors={c.notes}
              isOpen={addExistingFor === 'note'}
              onToggle={() => handleOpenAddExisting('note')}
            />

            {addExistingFor === 'note' && (
              <AddExistingPanel
                loading={loadingExisting}
                search={addSearch}
                onSearch={setAddSearch}
                notes={filteredNotes}
                entries={[]}
                noteLinks={noteLinks}
                entryLinks={entryLinks}
                domainId={domainId}
                onToggleNote={handleToggleExistingNote}
                onToggleEntry={handleToggleExistingEntry}
              />
            )}

            {/* Composer */}
            <textarea
              ref={composerRef}
              value={composerText}
              onChange={(e) => setComposerText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Write a note…"
              rows={2}
              className="w-full rounded-lg bg-white/60 text-[#130426] placeholder:text-[#130426]/40 px-4 py-3 text-sm leading-relaxed resize-none outline-none overflow-hidden focus:bg-white/80 transition-colors"
            />
            <div className="flex items-center justify-between mt-2 mb-5">
              <p className={`text-xs ${c.notes.faint}`}>Notes are saved to your materials</p>
              {composerText.trim() && (
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className={`text-xs ${c.notes.muted} hover:${c.notes.text} transition-colors`}
                >
                  {saving ? 'Saving…' : 'Save →'}
                </button>
              )}
            </div>

            {loading ? (
              <p className={`text-xs ${c.notes.faint}`}>Loading…</p>
            ) : notes.length === 0 ? (
              <p className={`text-xs ${c.notes.faint}`}>No notes yet. Write one above.</p>
            ) : (
              <div className="grid grid-cols-4 gap-3 mt-1">
                {notes.map((note, idx) => (
                  <NoteCard
                    key={note.id}
                    note={note}
                    idx={idx}
                    domainId={domainId}
                    allDomains={allDomains}
                    linkedDomainIds={noteLinks[note.id] ?? [domainId]}
                    onToggled={(dId, isNowLinked) => {
                      setNoteLinks((prev) => ({
                        ...prev,
                        [note.id]: isNowLinked
                          ? [...new Set([...(prev[note.id] ?? []), dId])]
                          : (prev[note.id] ?? []).filter((id) => id !== dId),
                      }))
                      if (!isNowLinked && dId === domainId) {
                        setNotes((prev) => prev.filter((n) => n.id !== note.id))
                      }
                    }}
                    onUpdated={(newContent) =>
                      setNotes((prev) => prev.map((n) => n.id === note.id ? { ...n, content: newContent } : n))
                    }
                  />
                ))}
              </div>
            )}
          </div>

          {/* Right column */}
          <div className="flex flex-col gap-6">

            {/* ── Documents ── */}
            <div className="rounded-2xl p-6" style={c.docs.bgStyle}>
              <SectionHeader
                label="Documents"
                colors={c.docs}
                isOpen={addExistingFor === 'document'}
                onToggle={() => handleOpenAddExisting('document')}
              />

              {addExistingFor === 'document' && (
                <AddExistingPanel
                  loading={loadingExisting}
                  search={addSearch}
                  onSearch={setAddSearch}
                  notes={[]}
                  entries={filteredDocEntries}
                  noteLinks={noteLinks}
                  entryLinks={entryLinks}
                  domainId={domainId}
                  onToggleNote={handleToggleExistingNote}
                  onToggleEntry={handleToggleExistingEntry}
                />
              )}

              {loading ? (
                <p className={`text-xs ${c.docs.faint}`}>Loading…</p>
              ) : documentEntries.length === 0 ? (
                <p className={`text-xs ${c.docs.faint}`}>No documents yet.</p>
              ) : (
                <div className="flex flex-col gap-2">
                  {documentEntries.map((entry) => (
                    <EntryCard
                      key={entry.id}
                      entry={entry}
                      domainId={domainId}
                      allDomains={allDomains}
                      linkedDomainIds={entryLinks[entry.id] ?? [domainId]}
                      variant="document"
                      onToggled={(dId, isNowLinked) => {
                        setEntryLinks((prev) => ({
                          ...prev,
                          [entry.id]: isNowLinked
                            ? [...new Set([...(prev[entry.id] ?? []), dId])]
                            : (prev[entry.id] ?? []).filter((id) => id !== dId),
                        }))
                        if (!isNowLinked && dId === domainId) {
                          setEntries((prev) => prev.filter((e) => e.id !== entry.id))
                        }
                      }}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* ── Working Outputs ── */}
            <div className="rounded-2xl p-6" style={c.outputs.bgStyle}>
              <SectionHeader
                label="Working Outputs"
                colors={c.outputs}
                isOpen={addExistingFor === 'output'}
                onToggle={() => handleOpenAddExisting('output')}
              />

              {addExistingFor === 'output' && (
                <AddExistingPanel
                  loading={loadingExisting}
                  search={addSearch}
                  onSearch={setAddSearch}
                  notes={[]}
                  entries={filteredOutputEntries}
                  noteLinks={noteLinks}
                  entryLinks={entryLinks}
                  domainId={domainId}
                  onToggleNote={handleToggleExistingNote}
                  onToggleEntry={handleToggleExistingEntry}
                />
              )}

              {loading ? (
                <p className={`text-outputs.faint`}>Loading…</p>
              ) : workingOutputEntries.length === 0 ? (
                <div>
                  <p className={`text-xs ${c.outputs.faint}`}>No working outputs yet.</p>
                  <p className={`text-xs ${c.outputs.faint} mt-1`}>Complete an activity to create something here.</p>
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  {workingOutputEntries.map((entry) => (
                    <EntryCard
                      key={entry.id}
                      entry={entry}
                      domainId={domainId}
                      allDomains={allDomains}
                      linkedDomainIds={entryLinks[entry.id] ?? [domainId]}
                      variant="output"
                      onToggled={(dId, isNowLinked) => {
                        setEntryLinks((prev) => ({
                          ...prev,
                          [entry.id]: isNowLinked
                            ? [...new Set([...(prev[entry.id] ?? []), dId])]
                            : (prev[entry.id] ?? []).filter((id) => id !== dId),
                        }))
                        if (!isNowLinked && dId === domainId) {
                          setEntries((prev) => prev.filter((e) => e.id !== entry.id))
                        }
                      }}
                    />
                  ))}
                </div>
              )}
            </div>

          </div>
        </div>

        </div>{/* /max-w */}
      </div>{/* /materials section */}

    </div>
  )
}

// ---------------------------------------------------------------------------
// PlanningStatusSection
// ---------------------------------------------------------------------------

function PlanningStatusSection({
  domainId,
  structure,
  entries = [],
  onReadyStatusChange,
}: {
  domainId: string
  structure: DomainStructure | null
  entries?: EntryRef[]
  onReadyStatusChange: (key: string, status: DomainItemStatus) => void
}) {
  // Checkbox state: Record<itemKey, boolean[]>
  const [checkboxes, setCheckboxes] = useState<Record<string, boolean[]>>({})

  // Load checkbox state from localStorage on mount
  useEffect(() => {
    if (!structure) return
    const loaded: Record<string, boolean[]> = {}
    for (const item of structure.readiness) {
      const vals = item.checkboxes.map((_, idx) => {
        const raw = localStorage.getItem(`checkbox_${domainId}_${item.key}_${idx}`)
        return raw === 'true'
      })
      loaded[item.key] = vals
    }
    setCheckboxes(loaded)
    // Notify parent of initial statuses
    for (const item of structure.readiness) {
      const vals = loaded[item.key] ?? item.checkboxes.map(() => false)
      onReadyStatusChange(item.key, computeReadyStatus(vals, item.checkboxes.length))
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [structure, domainId])

  function computeReadyStatus(vals: boolean[], total: number): DomainItemStatus {
    const checked = vals.filter(Boolean).length
    if (checked === 0) return 'not_started'
    if (checked === total) return 'complete'
    return 'in_progress'
  }

  function handleCheckbox(itemKey: string, idx: number, total: number) {
    setCheckboxes((prev) => {
      const current = prev[itemKey] ?? Array(total).fill(false)
      const updated = [...current]
      updated[idx] = !updated[idx]
      // Persist to localStorage
      localStorage.setItem(`checkbox_${domainId}_${itemKey}_${idx}`, String(updated[idx]))
      const status = computeReadyStatus(updated, total)
      // Also persist computed status for DomainStateCard compatibility
      localStorage.setItem(`ready_${domainId}_${itemKey}`, status)
      onReadyStatusChange(itemKey, status)
      return { ...prev, [itemKey]: updated }
    })
  }

  function itemEntries(item: OrientationItemDef | ReadinessItemDef): EntryRef[] {
    if (!entries?.length) return []
    return entries.filter((e) =>
      (item.relatedActivities?.includes(e.activity ?? '') && !!e.activity) ||
      (item.relatedDocumentTypes?.includes(e.document_type ?? '') && !!e.document_type)
    )
  }

  if (!structure) return null

  const readinessStatuses = structure.readiness.map(i => {
    const vals = checkboxes[i.key] ?? i.checkboxes.map(() => false)
    return computeReadyStatus(vals, i.checkboxes.length)
  })
  const inProgressCount = readinessStatuses.filter(s => s === 'in_progress').length
  const completeCount   = readinessStatuses.filter(s => s === 'complete').length
  const notStartedCount = readinessStatuses.filter(s => s === 'not_started').length

  return (
    <div>
      {/* Section title + status strip */}
      <div className="mb-10 pb-7" style={{ borderBottom: '1px solid rgba(19,4,38,0.10)' }}>
        <h2 className="text-[28px] font-bold text-[#130426] mb-2.5">
          Planning Status
        </h2>
        <p className="text-[14px]" style={{ color: 'rgba(19,4,38,0.60)' }}>
          {[
            inProgressCount > 0 && `${inProgressCount} in progress`,
            completeCount   > 0 && `${completeCount} complete`,
            notStartedCount > 0 && `${notStartedCount} not started`,
          ].filter(Boolean).join(' · ')}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">

        {/* ── Left panel: Reflection + Learning ── */}
        <div className="rounded-xl p-6" style={{ background: '#BBABF4' }}>
          <div className="mb-8">
            <p className="text-[22px] font-bold text-[#130426] mb-1">Reflection + Learning</p>
          </div>

          <div className="space-y-3">
            {structure.orientation.map((item) => (
              <div
                key={item.key}
                className="rounded-lg overflow-hidden"
                style={{ background: 'rgba(255,255,255,0.60)', border: '1px solid rgba(255,255,255,0.40)' }}
              >
                <div className="p-4">
                  <p className="text-[14px] font-semibold text-[#130426] leading-snug mb-4">{item.title}</p>
                  <Link
                    href={item.learnHref ?? '/app/learn/areas'}
                    className="inline-block text-[12px] font-semibold bg-[#2C3777] text-white px-3 py-1.5 rounded hover:bg-[#1a1e4d] transition-colors"
                  >
                    Learn more
                  </Link>
                  <ItemMaterials matched={itemEntries(item)} domainId={domainId} panelType="reflection" />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Right panel: Practical Readiness ── */}
        <div
          className="rounded-xl p-6"
          style={{ background: '#F8F4EB', border: '1px solid rgba(242,152,54,0.35)' }}
        >
          <div className="mb-8">
            <p className="text-[22px] font-bold mb-1" style={{ color: '#DB5835' }}>Practical Readiness</p>
          </div>

          <div className="space-y-3">
            {structure.readiness.map((item) => {
              const vals = checkboxes[item.key] ?? item.checkboxes.map(() => false)
              const status = computeReadyStatus(vals, item.checkboxes.length)
              const matched = itemEntries(item)
              return (
                <ReadinessCard
                  key={item.key}
                  item={item}
                  vals={vals}
                  status={status}
                  matched={matched}
                  domainId={domainId}
                  onToggle={(idx) => handleCheckbox(item.key, idx, item.checkboxes.length)}
                />
              )
            })}
          </div>
        </div>

      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// ReadinessCard
// ---------------------------------------------------------------------------

function StatusPill({ status }: { status: DomainItemStatus }) {
  const styles: Record<DomainItemStatus, React.CSSProperties> = {
    not_started: {
      background: '#F8F4EB',
      border: '1px solid #2C3777',
      color: '#2C3777',
    },
    in_progress: {
      background: '#BBABF4',
      border: 'none',
      color: '#130426',
    },
    complete: {
      background: '#F29836',
      border: 'none',
      color: '#130426',
    },
  }
  const labels: Record<DomainItemStatus, string> = {
    not_started: 'Not started',
    in_progress: 'In progress',
    complete: 'Complete',
  }
  return (
    <span
      className="shrink-0 text-[11px] font-semibold rounded-full px-2.5 py-0.5"
      style={styles[status]}
    >
      {labels[status]}
    </span>
  )
}

function ReadinessCard({
  item,
  vals,
  status,
  matched,
  domainId,
  onToggle,
}: {
  item: ReadinessItemDef
  vals: boolean[]
  status: DomainItemStatus
  matched: EntryRef[]
  domainId: string
  onToggle: (idx: number) => void
}) {
  return (
    <div
      className="rounded-lg overflow-hidden"
      style={{ background: 'rgba(255,255,255,0.75)', border: '1px solid rgba(19,4,38,0.08)' }}
    >
      <div className="p-4">
        {/* Title row with status pill */}
        <div className="flex items-start justify-between gap-3 mb-2">
          <p className="text-[14px] font-semibold text-[#130426] leading-snug">{item.title}</p>
          <StatusPill status={status} />
        </div>
        {item.explanation && (
          <p className="text-[12px] leading-relaxed mb-4 text-[#130426]/60">
            {item.explanation}
          </p>
        )}

        {/* Checklist */}
        <div className="space-y-1.5 mb-4">
          {item.checkboxes.map((label, idx) => (
            <label
              key={idx}
              className="flex items-start gap-2.5 cursor-pointer group"
            >
              <input
                type="checkbox"
                checked={vals[idx] ?? false}
                onChange={() => onToggle(idx)}
                className="mt-0.5 shrink-0 accent-[#DB5835]"
              />
              <span className={`text-[12px] leading-snug transition-colors ${vals[idx] ? 'text-[#130426]/40 line-through' : 'text-[#130426]/80'}`}>
                {label}
              </span>
            </label>
          ))}
        </div>

        {/* Supporting materials */}
        {matched.length > 0 && (
          <ItemMaterials matched={matched} domainId={domainId} panelType="readiness" />
        )}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// SectionHeader
// ---------------------------------------------------------------------------
// ItemMaterials
// ---------------------------------------------------------------------------

function ItemMaterials({
  matched,
  domainId,
  panelType,
}: {
  matched: EntryRef[]
  domainId: string
  panelType: 'reflection' | 'readiness'
}) {
  if (matched.length === 0) return null

  const isReflection = panelType === 'reflection'
  const linkBg      = isReflection ? 'rgba(44,55,119,0.07)'  : 'rgba(242,152,54,0.10)'
  const linkBorder  = isReflection ? 'rgba(44,55,119,0.16)'  : 'rgba(242,152,54,0.24)'
  const labelColor  = isReflection ? '#2C3777'               : '#a05500'

  return (
    <div className="mt-4 space-y-2">
      {matched.map((entry) => {
        const typeLabel = entry.activity ? 'Working output' : 'Document'
        return (
          <a
            key={entry.id}
            href={getEntryHref(entry, domainId)}
            className="flex items-center justify-between rounded-lg px-3 py-2.5 transition-opacity hover:opacity-75"
            style={{ background: linkBg, border: `1px solid ${linkBorder}` }}
          >
            <span className="text-[13px] font-semibold leading-snug" style={{ color: labelColor }}>
              {entryLabel(entry)}
            </span>
            <span className="text-[11px] shrink-0 ml-3" style={{ color: 'rgba(19,4,38,0.40)' }}>
              {typeLabel} →
            </span>
          </a>
        )
      })}
    </div>
  )
}

// ---------------------------------------------------------------------------
// SectionHeader
// ---------------------------------------------------------------------------

type SectionColors = { bgStyle: React.CSSProperties; text: string; muted: string; faint: string }

function SectionHeader({
  label,
  colors,
  isOpen,
  onToggle,
}: {
  label: string
  colors: SectionColors
  isOpen: boolean
  onToggle: () => void
}) {
  return (
    <div className="flex items-center justify-between mb-5">
      <h2 className={`text-[20px] font-semibold tracking-[0.02em] ${colors.text}`}>{label}</h2>
      <button
        onClick={onToggle}
        className={`text-xs ${colors.muted} hover:${colors.text} transition-colors`}
      >
        {isOpen ? 'Close' : '+ Add existing'}
      </button>
    </div>
  )
}

// ---------------------------------------------------------------------------
// AddExistingPanel
// ---------------------------------------------------------------------------

function AddExistingPanel({
  loading,
  search,
  onSearch,
  notes,
  entries,
  noteLinks,
  entryLinks,
  domainId,
  onToggleNote,
  onToggleEntry,
}: {
  loading: boolean
  search: string
  onSearch: (v: string) => void
  notes: Note[]
  entries: EntryRef[]
  noteLinks: Record<string, string[]>
  entryLinks: Record<string, string[]>
  domainId: string
  onToggleNote: (note: Note) => void
  onToggleEntry: (entry: EntryRef) => void
}) {
  return (
    <div className="mb-5 rounded-lg border border-[#130426]/15 overflow-hidden">
      <div className="px-4 py-2.5 border-b border-[#130426]/15 bg-[#130426]/[0.06]">
        <input
          type="text"
          value={search}
          onChange={(e) => onSearch(e.target.value)}
          placeholder="Search…"
          className="w-full bg-transparent text-sm text-[#130426] placeholder:text-[#130426]/35 outline-none"
          autoFocus
        />
      </div>
      {loading ? (
        <p className="px-4 py-3 text-xs text-light-secondary">Loading…</p>
      ) : (
        <div className="max-h-52 overflow-y-auto divide-y divide-[#130426]/10">
          {notes.map((note) => {
            const linked = noteLinks[note.id]?.includes(domainId)
            return (
              <label key={note.id} className="flex items-start gap-3 px-4 py-2.5 hover:bg-[#130426]/[0.04] cursor-pointer">
                <input
                  type="checkbox"
                  checked={!!linked}
                  onChange={() => onToggleNote(note)}
                  className="accent-[#2C3777] shrink-0 mt-0.5"
                />
                <span className="text-xs text-[#130426]/70 leading-snug">
                  {truncate(note.content, 80)}
                </span>
              </label>
            )
          })}
          {entries.map((entry) => {
            const linked = entryLinks[entry.id]?.includes(domainId)
            return (
              <label key={entry.id} className="flex items-start gap-3 px-4 py-2.5 hover:bg-[#130426]/[0.04] cursor-pointer">
                <input
                  type="checkbox"
                  checked={!!linked}
                  onChange={() => onToggleEntry(entry)}
                  className="accent-[#2C3777] shrink-0 mt-0.5"
                />
                <span className="text-xs text-[#130426]/70 leading-snug">{entryLabel(entry)}</span>
              </label>
            )
          })}
          {notes.length === 0 && entries.length === 0 && (
            <p className="px-4 py-3 text-xs text-light-secondary">Nothing found.</p>
          )}
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// NoteCard
// ---------------------------------------------------------------------------

const STICKY_COLORS = ['#f5f2e3', '#eae7f5', '#f3ede8']

function NoteCard({
  note,
  idx = 0,
  domainId,
  allDomains,
  linkedDomainIds,
  onToggled,
  onUpdated,
}: {
  note: Note
  idx?: number
  domainId: string
  allDomains: Container[]
  linkedDomainIds: string[]
  onToggled: (domainId: string, isNowLinked: boolean) => void
  onUpdated?: (newContent: string) => void
}) {
  const hasPrompt = note.origin_type === 'prompt' && note.prompt_context
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(note.content)
  const editRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (editing && editRef.current) {
      const el = editRef.current
      el.focus()
      el.style.height = 'auto'
      el.style.height = `${el.scrollHeight}px`
      el.selectionStart = el.selectionEnd = el.value.length
    }
  }, [editing])

  async function handleSaveEdit() {
    const trimmed = draft.trim()
    setEditing(false)
    if (!trimmed || trimmed === note.content.trim()) return
    await updateNote(note.id, trimmed)
    onUpdated?.(trimmed)
  }

  function handleEditKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSaveEdit() }
    if (e.key === 'Escape') { setDraft(note.content); setEditing(false) }
  }

  function handleEditInput(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setDraft(e.target.value)
    const el = e.target
    el.style.height = 'auto'
    el.style.height = `${el.scrollHeight}px`
  }

  async function handleRemove() {
    await removeNoteFromContainer(note.id, domainId)
    onToggled(domainId, false)
  }

  const stickyBg = STICKY_COLORS[idx % STICKY_COLORS.length]

  return (
    <div
      className="relative"
      style={{
        backgroundColor: stickyBg,
        aspectRatio: '1 / 1',
        boxShadow: '3px 3px 8px rgba(19,4,38,0.25)',
        padding: '24px 12px 10px',
      }}
    >
      <div
        style={{
          position: 'absolute',
          top: '-10px',
          left: '50%',
          transform: 'translateX(-50%) rotate(-1deg)',
          width: '36px',
          height: '20px',
          backgroundColor: 'rgba(255,255,255,0.7)',
        }}
      />

      {editing ? (
        <textarea
          ref={editRef}
          value={draft}
          onChange={handleEditInput}
          onBlur={handleSaveEdit}
          onKeyDown={handleEditKeyDown}
          rows={1}
          className="w-full bg-transparent text-[#130426]/85 leading-snug text-[11px] resize-none outline-none overflow-hidden"
        />
      ) : (
        <p
          className="text-[#130426]/85 leading-snug text-[11px] cursor-text whitespace-pre-wrap line-clamp-4"
          onClick={() => setEditing(true)}
        >
          {note.content}
        </p>
      )}

      {hasPrompt && !editing && (
        <p className="text-[9px] text-[#130426]/50 italic leading-snug mt-1.5 line-clamp-2">
          {note.prompt_context}
        </p>
      )}

      <div className="flex items-center gap-2 absolute bottom-2 left-3 right-3 pt-1.5 border-t border-[#130426]/[0.10]">
        {!editing && (
          <button
            onClick={() => setEditing(true)}
            className="text-[10px] text-[#130426]/60 hover:text-[#130426] transition-colors"
          >
            Open
          </button>
        )}
        <button
          onClick={handleRemove}
          className="text-[10px] text-[#130426]/60 hover:text-[#130426] transition-colors"
        >
          Remove
        </button>
        <DomainAssigner
          itemId={note.id}
          itemType="note"
          allDomains={allDomains}
          initialLinkedDomainIds={linkedDomainIds}
          label="Add to"
          showCount={false}
          theme="light"
          onToggled={onToggled}
        />
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// EntryCard
// ---------------------------------------------------------------------------

function EntryCard({
  entry,
  domainId,
  allDomains,
  linkedDomainIds,
  variant,
  onToggled,
}: {
  entry: EntryRef
  domainId: string
  allDomains: Container[]
  linkedDomainIds: string[]
  variant: 'document' | 'output'
  onToggled: (domainId: string, isNowLinked: boolean) => void
}) {
  const label = entryLabel(entry)
  const href = getEntryHref(entry, domainId)

  async function handleRemove() {
    await removeEntryFromContainer(entry.id, domainId)
    onToggled(domainId, false)
  }

  if (variant === 'output') {
    return (
      <div className="bg-[#130426] rounded-xl px-5 py-4 border border-[#130426]/80">
        <Link href={href} className="block mb-3">
          <p className="text-sm font-semibold text-[#f8f4eb] leading-snug hover:text-[#BBABF4] transition-colors">
            {label}
          </p>
        </Link>
        <div className="flex items-center gap-2.5 pt-2.5 border-t border-[#f8f4eb]/[0.18]">
          <Link href={href} className="text-[11px] text-[#f8f4eb]/75 hover:text-[#f8f4eb] transition-colors">
            Open
          </Link>
          {entry.activity === 'values_ranking' && (
            <>
              <span className="text-[#f8f4eb]/25 text-[11px]">·</span>
              <Link href={`/app/entries/${entry.id}/export`} className="text-[11px] text-[#f8f4eb]/75 hover:text-[#f8f4eb] transition-colors">
                Export
              </Link>
            </>
          )}
          <button onClick={handleRemove} className="text-[11px] text-[#f8f4eb]/75 hover:text-[#f8f4eb] transition-colors">
            Remove
          </button>
          <DomainAssigner
            itemId={entry.id}
            itemType="entry"
            allDomains={allDomains}
            initialLinkedDomainIds={linkedDomainIds}
            label="Add to"
            showCount={false}
            theme="dark"
            onToggled={onToggled}
          />
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg border border-[#130426]/[0.12] shadow-sm overflow-hidden">
      <div className="flex">
        <div className="w-1 shrink-0 bg-[#2C3777]" />
        <div className="flex-1 px-4 py-4">
          <Link href={href} className="block mb-3">
            <p className="text-sm font-semibold text-[#130426] leading-snug hover:text-[#130426]/70 transition-colors">
              {label}
            </p>
          </Link>
          <div className="flex items-center gap-2.5 pt-2.5 border-t border-[#130426]/[0.07]">
            <Link href={href} className="text-[11px] text-light-secondary hover:text-[#130426] transition-colors">
              Open
            </Link>
            <button onClick={handleRemove} className="text-[11px] text-light-secondary hover:text-[#130426] transition-colors">
              Remove
            </button>
            <DomainAssigner
              itemId={entry.id}
              itemType="entry"
              allDomains={allDomains}
              initialLinkedDomainIds={linkedDomainIds}
              label="Add to"
              showCount={false}
              theme="light"
              onToggled={onToggled}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
