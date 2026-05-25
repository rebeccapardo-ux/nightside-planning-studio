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
  fetchAllDomainTopicNotes,
  fetchHiddenRowNotes,
  addDomainTopicNote,
  removeDomainTopicNote,
  hideRowNote,
  type Note,
  type Container,
  type EntryRef,
  type TopicNoteRow,
} from '@/lib/notes'
import {
  loadDomainState, saveCheckboxes, saveOrient,
  getCheckboxes, getOrient, computeReadyStatus,
  type DomainState,
} from '@/lib/domain-state'
import DomainAssigner from '@/app/components/DomainAssigner'
// import FragmentField from '@/app/components/FragmentField'
import SharedNoteCard from '@/app/components/notes/NoteCard'
import VoiceNoteCard from '@/app/components/notes/VoiceNoteCard'
import VoiceNoteButton from '@/app/components/VoiceNoteButton'
import Breadcrumbs from '@/app/components/navigation/Breadcrumbs'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function entryLabel(entry: EntryRef): string {
  if (entry.document_type === 'advance_directive_supplement') return 'My Care Wishes'
  if (entry.document_type === 'funeral_wishes') return 'Funeral & Ceremony Wishes'
  if (entry.title?.trim()) return entry.title.trim()
  if (entry.document_type === 'personal_admin_info') return 'Personal Admin Information'
  if (entry.document_type === 'important_contacts') return 'Important Contacts'
  if (entry.document_type === 'devices_and_accounts') return 'Devices & Accounts'
  if (entry.document_type === 'financial_information') return 'Financial Information'
  if (entry.activity === 'values_ranking') return 'Values Ranking'
  if (entry.activity === 'fears_ranking') return 'Fears Ranking'
  return 'Untitled'
}

function getEntryHref(entry: EntryRef, domainId?: string): string {
  if (entry.document_type === 'advance_directive_supplement') return '/app/capture/advance-directive'
  if (entry.document_type === 'funeral_wishes') return '/app/capture/funeral-wishes'
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
  allowedReflectPrompts?: string[]
}

type ReadinessItemDef = {
  key: string
  title: string
  explanation: string
  relatedActivities?: string[]
  relatedDocumentTypes?: string[]
  checkboxes: string[]
  checkboxHelpers?: (string | null)[]
  staticLinks?: { href: string; label: string }[]
  // allowedReflectPrompts is intentionally absent — Practical Readiness rows never auto-surface notes
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
          allowedReflectPrompts: [
            'What would you want someone making decisions for you to understand?',
            'What matters most to you right now?',
            'If you could choose the setting for your final moments, where would you be and who would be with you?',
            'What do you worry most about when thinking about your future health and care?',
            'If you needed help going to the bathroom or bathing, who would you feel most comfortable asking?',
            'Fill in the blank: I want to live in my body as long as…',
            'What does quality of life mean to you?',
            'What does a good day look like for you?',
            'If you could control one aspect of your death, what would it be?',
          ],
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
          learnHref: '/app/learn/healthcare',
          allowedReflectPrompts: [
            'If you were unable to make decisions for yourself, who would you want to make those decisions, and why?',
          ],
        },
      ],
      readiness: [
        {
          key: 'who_will_decide',
          title: 'Who will make decisions for me',
          explanation: '',
          checkboxes: [
            'I have identified a substitute decision maker for my care',
            'They have agreed to take on this role',
            'I have legally documented my decision-maker',
          ],
        },
        {
          key: 'wishes_clear_shared',
          title: 'My wishes are clear and shared',
          explanation: '',
          staticLinks: [{ href: '/app/capture/advance-directive', label: 'My Care Wishes' }],
          checkboxes: [
            'I have communicated my wishes to my decision maker',
            'I have formally documented my wishes',
          ],
          checkboxHelpers: [
            null,
            'This may include an advance directive or equivalent document in your province. See the resource hub for guidance.',
          ],
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
          allowedReflectPrompts: [
            'How would you want your body to be handled after death, and why?',
            'If you could choose one personal item to be included in your final resting place, what would it be?',
          ],
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
          key: 'final_resting_place_wishes',
          title: 'Final resting place wishes',
          explanation: '',
          checkboxes: [
            'I have documented what I want to happen with my body after my death',
            'I have shared these wishes with people in my life',
            "If applicable, I have registered with my province's organ and tissue donation registry",
          ],
          staticLinks: [{ href: '/app/capture/funeral-wishes', label: 'Funeral & Ceremony Wishes' }],
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
          checkboxes: ['I have a valid, up-to-date legal will'],
        },
        {
          key: 'other_estate_planning',
          title: 'Other estate planning needs (if applicable)',
          explanation: '',
          checkboxes: ['I have identified any additional planning needs relevant to my situation', 'I have taken steps to address them'],
        },
        {
          key: 'professional_support',
          title: 'Professional support (if needed)',
          explanation: '',
          checkboxes: ['I have consulted professional support if needed'],
        },
        {
          key: 'meaningful_objects',
          title: 'What should happen to my belongings',
          explanation: '',
          staticLinks: [{ href: '/app/capture/keepsake-inventory', label: 'Keepsake Inventory' }],
          checkboxes: ['I have documented what should happen to items that matter to me', 'I have shared these wishes with people who may need to act'],
        },
      ],
    },
  },
  {
    match: 'ritual',
    structure: {
      orientation: [
        {
          key: 'meaningful_rituals',
          title: 'Reflect on rituals or ceremonies that are meaningful to me',
          explanation: '',
          learnHref: '/app/learn/ritual',
          allowedReflectPrompts: [
            'What rituals or ceremonies—personal, cultural, or religious—are meaningful to you?',
          ],
        },
        {
          key: 'mark_or_remember',
          title: 'Consider how I want my death to be marked or remembered',
          explanation: '',
          learnHref: '/app/learn/ritual',
        },
      ],
      readiness: [
        {
          key: 'ritual_ceremony_preferences',
          title: 'Ritual and ceremony preferences',
          explanation: '',
          checkboxes: [
            'I have shared my preferences for ritual and ceremony with people in my life',
            'My preferences are documented somewhere accessible (if I choose to)',
          ],
          staticLinks: [{ href: '/app/capture/funeral-wishes', label: 'Funeral & Ceremony Wishes' }],
        },
      ],
    },
  },
  {
    match: 'legacy',
    structure: {
      orientation: [
        {
          key: 'life_story_shaped',
          title: 'Reflect on the story of my life and what has shaped me',
          explanation: '',
          relatedActivities: ['legacy_map'],
          learnHref: '/app/learn/legacy',
          allowedReflectPrompts: [
            "Reflecting on challenges you've had in the past, what has brought you strength and comfort?",
            'Who knows the best stories about you?',
            'If you could relive one moment in your life, not to change it but to experience it again, what moment would you choose?',
            "If you had the chance to write a letter to your younger self about life's most important lessons, what would you include?",
          ],
        },
        {
          key: 'how_remembered',
          title: 'Consider how I want to be remembered',
          explanation: '',
          learnHref: '/app/learn/legacy',
          allowedReflectPrompts: [
            "What's one thing you hope people will always remember about you, no matter how much time has passed?",
            'If you could be remembered for one specific contribution to your community, family, or loved ones, what would it be?',
          ],
        },
        {
          key: 'relationships_impact',
          title: 'Reflect on meaningful relationships and personal impact',
          explanation: '',
          learnHref: '/app/learn/legacy',
          allowedReflectPrompts: [
            'Is there anything you would want to be forgiven for before you die?',
            'Is there anyone or anything you would want to forgive before you die?',
            'Who do you trust with your secrets?',
          ],
        },
      ],
      readiness: [
        {
          key: 'sharing_what_matters',
          title: 'Sharing what matters to me',
          explanation: 'Some people choose to share their stories, values, or messages directly with others. This might happen through conversation, writing, or something else entirely.',
          checkboxes: [
            'I have created or captured something I want to leave behind (if I choose to)',
            'I have documented my obituary wishes or what I want said about my life',
            'I have noted causes or organizations I want remembered or supported',
          ],
        },
      ],
    },
  },
  {
    match: 'personal',
    structure: {
      orientation: [
        {
          key: 'understand_personal_admin',
          title: 'Understand personal admin involved in death planning',
          explanation: '',
          learnHref: '/app/learn/personal-admin',
        },
      ],
      readiness: [
        {
          key: 'personal_information',
          title: 'Personal records',
          explanation: '',
          checkboxes: ['I have documented my personal identification, legal designations, and important documents'],
          staticLinks: [{ href: '/app/capture/personal-admin', label: 'Personal Admin Information' }],
        },
        {
          key: 'important_contacts',
          title: 'Important contacts',
          explanation: '',
          checkboxes: ['I have recorded the people someone may need to contact'],
          staticLinks: [{ href: '/app/capture/important-contacts', label: 'Important Contacts' }],
        },
        {
          key: 'financial_information',
          title: 'Financial information',
          explanation: '',
          checkboxes: ['I have documented my financial accounts and insurance'],
          staticLinks: [{ href: '/app/capture/financial-information', label: 'Financial Information' }],
        },
        {
          key: 'devices_and_accounts',
          title: 'Devices and accounts',
          explanation: '',
          checkboxes: ['I have documented my devices and account access information'],
          staticLinks: [{ href: '/app/capture/devices-and-accounts', label: 'Devices & Accounts' }],
        },
        {
          key: 'social_media_digital_assets',
          title: 'Social media and digital assets',
          explanation: '',
          checkboxes: [
            'I have decided what should happen to my social media accounts and digital assets (if applicable)',
            'I have shared or documented these wishes',
          ],
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
// Section palette (used by non-healthcare materials canvas)
// ---------------------------------------------------------------------------

const CONTAINER_STYLE: React.CSSProperties = {
  background: '#F1ECE4',
  border: '1px solid rgba(19,4,38,0.06)',
  borderRadius: '28px',
  padding: '32px',
}

const SECTION_COLORS = {
  notes:   { bgStyle: CONTAINER_STYLE, text: 'text-[#130426]', muted: 'text-[#2C3777]', faint: 'text-[#130426]/50' },
  docs:    { bgStyle: CONTAINER_STYLE, text: 'text-[#130426]', muted: 'text-[#2C3777]', faint: 'text-[#130426]/50' },
  outputs: { bgStyle: CONTAINER_STYLE, text: 'text-[#130426]', muted: 'text-[#2C3777]', faint: 'text-[#130426]/50' },
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function DomainDetailPage({ params }: { params: Promise<{ domainId: string }> }) {
  const { domainId } = use(params)

  // Scroll to top on mount — prevents router cache from restoring a previous scroll position
  useEffect(() => { window.scrollTo(0, 0) }, [])

  const [notes, setNotes] = useState<Note[]>([])
  const [entries, setEntries] = useState<EntryRef[]>([])
  const [domain, setDomain] = useState<Container | null>(null)
  const [allDomains, setAllDomains] = useState<Container[]>([])
  const [noteLinks, setNoteLinks] = useState<Record<string, string[]>>({})
  const [entryLinks, setEntryLinks] = useState<Record<string, string[]>>({})
  const [loading, setLoading] = useState(true)
  const [hasEverHadNotes, setHasEverHadNotes] = useState(false)

  // Scratchpad state
  const [composerText, setComposerText] = useState('')
  const [saving, setSaving] = useState(false)
  const [showVoiceCapture, setShowVoiceCapture] = useState(false)
  const composerRef = useRef<HTMLTextAreaElement>(null)
  const composerTextRef = useRef('')
  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Non-healthcare "add existing" panel state
  const [addExistingFor, setAddExistingFor] = useState<AddExistingFor>(null)
  const [allUserNotes, setAllUserNotes] = useState<Note[]>([])
  const [allUserEntries, setAllUserEntries] = useState<EntryRef[]>([])
  const [addSearch, setAddSearch] = useState('')
  const [loadingExisting, setLoadingExisting] = useState(false)

  const [readyStatusForHeader, setReadyStatusForHeader] = useState<Record<string, DomainItemStatus>>({})
  const [allPromptNotes, setAllPromptNotes] = useState<Note[]>([])
  const [domainTopicNotesList, setDomainTopicNotesList] = useState<TopicNoteRow[]>([])
  const [hiddenRowNotesList, setHiddenRowNotesList] = useState<TopicNoteRow[]>([])
  const [addToRowNote, setAddToRowNote] = useState<Note | null>(null)

  useEffect(() => {
    async function load() {
      const [loadedNotes, loadedEntries, containers, allEnts, allNotes, topicNotes, hiddenNotes] = await Promise.all([
        fetchNotesByDomainId(domainId),
        fetchEntriesByDomainId(domainId),
        fetchContainers(),
        fetchAllUserEntries(),  // eager load so planning rows can match by document type
        fetchNotes(),
        fetchAllDomainTopicNotes(domainId),
        fetchHiddenRowNotes(domainId),
      ])
      setNotes(loadedNotes)
      setEntries(loadedEntries)
      setAllUserEntries(allEnts)
      setAllDomains(containers)
      setDomain(containers.find((c) => c.id === domainId) ?? null)
      if (loadedNotes.length > 0) setHasEverHadNotes(true)
      setAllPromptNotes(allNotes)
      setAllUserNotes(allNotes) // pre-populate to avoid duplicate fetch when add-existing panel opens
      setDomainTopicNotesList(topicNotes)
      setHiddenRowNotesList(hiddenNotes)

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

      const foundDomain = containers.find((c) => c.id === domainId)
      fetch('/api/analytics/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventName: 'document_opened', metadata: { domain_id: domainId, domain_title: foundDomain?.title ?? null } }),
      }).catch(() => {})
    }
    load()
  }, [domainId])

  // Auto-resize scratchpad
  useEffect(() => {
    if (composerRef.current) {
      const el = composerRef.current
      el.style.height = 'auto'
      el.style.height = `${el.scrollHeight}px`
    }
  }, [composerText])

  // Cleanup auto-save timer on unmount
  useEffect(() => {
    return () => {
      if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current)
    }
  }, [])

  // ---------------------------------------------------------------------------
  // Scratchpad handlers (healthcare)
  // ---------------------------------------------------------------------------

  async function doSave() {
    const trimmed = composerTextRef.current.trim()
    if (!trimmed || saving) return
    setSaving(true)
    const created = await createNote(trimmed)
    if (created) {
      await addNoteToContainer(created.id, domainId)
      setNotes((prev) => [created, ...prev])
      setNoteLinks((prev) => ({ ...prev, [created.id]: [domainId] }))
      setHasEverHadNotes(true)
    }
    composerTextRef.current = ''
    setComposerText('')
    setSaving(false)
  }

  function handleScratchpadChange(val: string) {
    setComposerText(val)
    composerTextRef.current = val
    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current)
    if (val.trim()) {
      autoSaveTimerRef.current = setTimeout(doSave, 2000)
    }
  }

  async function handleScratchpadBlur() {
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current)
      autoSaveTimerRef.current = null
    }
    await doSave()
  }

  async function handleVoiceNoteSaved(note: Note) {
    await addNoteToContainer(note.id, domainId)
    setNotes((prev) => [note, ...prev])
    setNoteLinks((prev) => ({ ...prev, [note.id]: [domainId] }))
    setHasEverHadNotes(true)
    setShowVoiceCapture(false)
  }

  // ---------------------------------------------------------------------------
  // Non-healthcare canvas handlers
  // ---------------------------------------------------------------------------

  async function handleNonHealthcareSave() {
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
      handleNonHealthcareSave()
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
  const workingOutputEntries = (() => {
    const seen = new Set<string>()
    return entries.filter((e) => {
      if (!e.activity) return false
      if (seen.has(e.activity)) return false
      seen.add(e.activity)
      return true
    })
  })()
  // Dedup allUserEntries by activity for PlanningStatusSection (keeps most recent per activity)
  const dedupedEntriesForStatus = (() => {
    const seen = new Set<string>()
    return allUserEntries.filter((e) => {
      if (!e.activity) return true
      if (seen.has(e.activity)) return false
      seen.add(e.activity)
      return true
    })
  })()
  const c = SECTION_COLORS
  const domainStructure = domain ? getDomainStructure(domain.title) : null
  const isHealthcare = !!(domain && domain.title.toLowerCase().includes('healthcare'))
  const isLegacy     = !!(domain && domain.title.toLowerCase().includes('legacy'))
  const isDeathcare  = !!(domain && (domain.title.toLowerCase().includes('deathcare') || domain.title.toLowerCase().includes('death care')))
  const isWills      = !!(domain && domain.title.toLowerCase().includes('will'))
  const isRitual        = !!(domain && (domain.title.toLowerCase().includes('ritual') || domain.title.toLowerCase().includes('ceremony')))
  const isPersonalAdmin = !!(domain && domain.title.toLowerCase().includes('personal'))

  const eligiblePromptNotes = allPromptNotes.filter(
    n => n.origin_type === 'prompt' && n.prompt_context != null
  )

  const rowAttachedNoteIds = new Set(domainTopicNotesList.map(r => r.note_id))
  const hiddenFromRowNoteIds = new Set(hiddenRowNotesList.map(r => r.note_id))
  const yourThoughtsNotes = notes.filter(
    n => !rowAttachedNoteIds.has(n.id) && !hiddenFromRowNoteIds.has(n.id)
  )

  const domainNoteIds = new Set(notes.map(n => n.id))

  const domainRows = domainStructure ? [
    ...domainStructure.orientation.map(i => ({ key: i.key, title: i.title, section: 'orientation' as const })),
    ...domainStructure.readiness.map(i => ({ key: i.key, title: i.title, section: 'readiness' as const })),
  ] : []

  // Hold the page on a clean background while initial data resolves.
  // Without this gate the dark header + "…" placeholder title rendered
  // before the domain object loaded, then the structure/notes sections
  // popped in once the parallel fetches settled — a visible flash.
  if (loading) {
    return <div className="min-h-screen" style={{ background: '#EDE7FF' }} />
  }

  return (
    <div className="min-h-screen" style={{ background: '#EDE7FF' }}>
      <style>{`
        .domain-note-input::placeholder { color: rgba(19,4,38,0.34); font-size: 18px; font-weight: 400; line-height: 1.4; }
        .planning-grid {
          display: grid;
          grid-template-columns: 1fr 2fr;
          gap: 48px;
          align-items: start;
        }
        @media (max-width: 768px) {
          .planning-grid { grid-template-columns: 1fr; }
        }
        @keyframes bloom {
          from { transform: scale(0.3) rotate(-15deg); opacity: 0; }
          to   { transform: scale(1) rotate(0deg); opacity: 1; }
        }
        .planning-panels {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 24px;
          align-items: start;
        }
        @media (max-width: 768px) {
          .planning-panels { grid-template-columns: 1fr; }
        }
        @keyframes noteAppear {
          from { opacity: 0; transform: translateY(8px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>

      {/* ── Header section — dark gradient ── */}
      <div style={{
        background: 'radial-gradient(circle at 20% 20%, #1a0535 0%, #130426 70%)',
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* Breadcrumb — clean zone at the very top, above the fragment SVG */}
        <div
          className="max-w-6xl mx-auto"
          style={{ paddingTop: 16, paddingLeft: 40, paddingRight: 40, paddingBottom: 8, position: 'relative', zIndex: 2 }}
        >
          <Breadcrumbs
            theme="navy"
            items={[
              { label: 'Plan', href: '/app/plan' },
              { label: domain?.title ?? '…' },
            ]}
          />
        </div>

        {/* Fragment SVG — healthcare, legacy, and deathcare only */}
        {/* DISABLED: fragment removed from domain pages (restore by uncommenting FragmentField import + this block)
        {(isHealthcare || isLegacy || isDeathcare) && !loading && (
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, overflow: 'hidden', zIndex: 0, pointerEvents: 'none' }}>
            <FragmentField
              domainId={domainId}
              domainTitle={domain?.title ?? ''}
              backgroundMode
              minFragments={isLegacy || isDeathcare ? 3 : 1}
            />
          </div>
        )}
        */}

        {/* Title — scrim only on fragment domains */}
        {/* DISABLED: scrim removed along with fragment (restore when re-enabling fragment above)
        {(isHealthcare || isLegacy || isDeathcare) ? (
          <div style={{ display: 'inline-block', background: 'rgba(19,4,38,0.6)', padding: '8px 16px', borderRadius: 4 }}>
            <h1 className="ns-title-activity text-white">{domain?.title ?? '…'}</h1>
          </div>
        ) : (
          <h1 className="ns-title-activity text-white">{domain?.title ?? '…'}</h1>
        )}
        */}
        <div
          className="max-w-6xl mx-auto"
          style={{ padding: '4px 40px 56px', position: 'relative', zIndex: 1 }}
        >
          <h1 className="ns-title-activity text-white">{domain?.title ?? '…'}</h1>
        </div>
      </div>

      {/* ── Section 1: Status ── */}
      {domainStructure && (
        <div style={{ background: '#EDE7FF' }}>
          <div className="max-w-6xl mx-auto px-6 py-12">
            {isWills && (
              <p style={{ fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif", fontSize: 14, fontStyle: 'italic', color: 'rgba(19,4,38,0.72)', lineHeight: 1.6, margin: '0 0 28px 0' }}>
                The content in this area is for planning and reflection. For binding legal documents, including your will and any documents designating decision-makers, consult a lawyer in your province.
              </p>
            )}
            <PlanningStatusSection
              domainId={domainId}
              structure={domainStructure}
              domainTitle={domain?.title ?? ''}
              entries={dedupedEntriesForStatus}
              isHealthcare={isHealthcare || isLegacy || isDeathcare || isWills || isRitual || isPersonalAdmin}
              showWishesCard={isHealthcare}
              showFuneralWishesCard={isDeathcare}
              onReadyStatusChange={(key, status) => setReadyStatusForHeader(prev => ({ ...prev, [key]: status }))}
              eligibleNotes={eligiblePromptNotes}
              allUserNotes={allUserNotes}
              domainNoteIds={domainNoteIds}
              domainTopicNotesList={domainTopicNotesList}
              hiddenRowNotesList={hiddenRowNotesList}
              onTopicNoteAdd={(noteId, topicId, note) => {
                setDomainTopicNotesList(prev => [...prev, { note_id: noteId, topic_id: topicId }])
                if (!notes.some(n => n.id === noteId)) setNotes(prev => [...prev, note])
                addDomainTopicNote(noteId, domainId, topicId)
                addNoteToContainer(noteId, domainId)
              }}
              onTopicNoteRemove={(noteId, topicId) => {
                setDomainTopicNotesList(prev => prev.filter(r => !(r.note_id === noteId && r.topic_id === topicId)))
                removeDomainTopicNote(noteId, domainId, topicId)
              }}
              onRowNoteHide={(noteId, topicId) => {
                setHiddenRowNotesList(prev => [...prev, { note_id: noteId, topic_id: topicId }])
                hideRowNote(noteId, domainId, topicId)
              }}
            />
          </div>
        </div>
      )}

      {/* ── Section 2: Notes ── */}
      {(isHealthcare || isLegacy || isDeathcare || isWills || isRitual || isPersonalAdmin) && (
        <div style={{ background: '#EDE7FF', paddingBottom: 96 }}>
          <div className="max-w-6xl mx-auto px-6" style={{ paddingTop: 40 }}>

            <p style={{
              fontSize: 18,
              fontWeight: 700,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              color: '#1A1A1A',
              marginBottom: 0,
            }}>
              Your thoughts
            </p>
            <p style={{ marginTop: 8, fontSize: 16, lineHeight: 1.5, color: 'rgba(0,0,0,0.7)', maxWidth: 640 }}>
              Notes you&apos;ve added to this area. Add them to a section above to organize your planning.
            </p>
            {yourThoughtsNotes.length > 0 && (
              <Link
                href="/app/plan"
                style={{ display: 'inline-block', marginTop: 8, fontSize: 16, fontWeight: 600, color: '#2C3777', textDecoration: 'underline', textUnderlineOffset: 3 }}
              >
                View all your notes in Your Plan →
              </Link>
            )}

            {/* Empty state — shows only before any notes exist */}
            {!loading && !hasEverHadNotes && notes.length === 0 && (
              <p style={{ fontSize: 16, color: 'rgba(19,4,38,0.60)', marginTop: 28, marginBottom: 0 }}>
                Your thoughts about this area will appear here.
              </p>
            )}

            {/* Sticky notes grid */}
            {yourThoughtsNotes.length > 0 && (
              <div className="grid grid-cols-6 gap-3 items-start" style={{ marginTop: 28, marginBottom: 40 }}>
                {yourThoughtsNotes.map((note, idx) => (
                  <div
                    key={note.id}
                    style={{ animation: 'noteAppear 320ms ease-out both', position: 'relative', aspectRatio: '1 / 1', width: '100%', overflow: 'hidden' }}
                  >
                    {/* Fade out clipped content */}
                    <div style={{
                      position: 'absolute',
                      bottom: 0,
                      left: 0,
                      right: 0,
                      height: 40,
                      background: 'linear-gradient(to bottom, rgba(255,255,255,0), rgba(255,255,255,0.75))',
                      pointerEvents: 'none',
                      zIndex: 2,
                    }} />
                    <NoteCard
                      note={note}
                      idx={idx}
                      domainId={domainId}
                      allDomains={allDomains}
                      linkedDomainIds={noteLinks[note.id] ?? [domainId]}
                      onAddToRow={domainRows.length > 0 ? () => setAddToRowNote(note) : undefined}
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
                  </div>
                ))}
              </div>
            )}

            {/* Scratchpad */}
            <div style={{ position: 'relative' }}>
              <textarea
                ref={composerRef}
                value={composerText}
                onChange={(e) => handleScratchpadChange(e.target.value)}
                onBlur={handleScratchpadBlur}
                placeholder="Capture anything that comes up about this area..."
                className="placeholder:text-[#130426]/30"
                style={{
                  display: 'block',
                  width: '100%',
                  background: '#FFFFFF',
                  border: '1px solid #2C3777',
                  borderRadius: 12,
                  padding: '12px',
                  fontSize: 17,
                  lineHeight: 1.6,
                  color: '#130426',
                  resize: 'none',
                  outline: 'none',
                  minHeight: 120,
                  boxSizing: 'border-box',
                  transition: 'background 0.15s',
                  fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif",
                }}
              />
            </div>

            {/* Voice note capture — below scratchpad, right-aligned */}
            <div style={{ marginTop: 10 }}>
              {showVoiceCapture ? (
                <VoiceNoteButton
                  saveMode={{ kind: 'freeform' }}
                  autoStart
                  theme="light"
                  onSaved={handleVoiceNoteSaved}
                  onDelete={() => setShowVoiceCapture(false)}
                />
              ) : (
                <button
                  onClick={() => setShowVoiceCapture(true)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    width: '100%',
                    padding: '11px 16px',
                    borderRadius: 10,
                    cursor: 'pointer',
                    background: 'rgba(44,55,119,0.06)',
                    border: '1.5px solid rgba(44,55,119,0.2)',
                    boxSizing: 'border-box' as const,
                  }}
                >
                  <svg width="18" height="18" viewBox="0 0 12 16" fill="none" aria-hidden style={{ flexShrink: 0 }}>
                    <rect x="2.5" y="0.5" width="7" height="9" rx="3.5" fill="#2d3a6b" />
                    <path d="M0.5 8c0 2.76 2.24 5 5.5 5s5.5-2.24 5.5-5" stroke="#2d3a6b" strokeWidth="1.5" strokeLinecap="round" fill="none" />
                    <line x1="6" y1="13" x2="6" y2="15.5" stroke="#2d3a6b" strokeWidth="1.5" strokeLinecap="round" />
                    <line x1="3.5" y1="15.5" x2="8.5" y2="15.5" stroke="#2d3a6b" strokeWidth="1.5" strokeLinecap="round" />
                  </svg>
                  <span style={{ fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif", fontSize: 14, fontWeight: 700, color: '#2d3a6b' }}>Record a voice note</span>
                  <span style={{ fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif", fontSize: 11, fontWeight: 600, borderRadius: 100, padding: '3px 10px', background: 'rgba(44,55,119,0.12)', color: '#2d3a6b', border: '1px solid rgba(44,55,119,0.25)' }}>auto-transcribed</span>
                </button>
              )}
            </div>

          </div>
        </div>
      )}

      {/* ── Row picker modal (for "Your Thoughts" → Add to row) ── */}
      {addToRowNote && domainRows.length > 0 && (
        <RowPickerModal
          note={addToRowNote}
          rows={domainRows}
          onSelect={(rowKey, rowTitle) => {
            const noteId = addToRowNote.id
            setDomainTopicNotesList(prev => [...prev, { note_id: noteId, topic_id: rowKey }])
            addDomainTopicNote(noteId, domainId, rowKey)
            addNoteToContainer(noteId, domainId)
            setAddToRowNote(null)
          }}
          onClose={() => setAddToRowNote(null)}
        />
      )}

      {/* ── Materials canvas (suppressed for all active domains) ── */}
      {!loading && !isHealthcare && !isLegacy && !isDeathcare && !isWills && !isRitual && !isPersonalAdmin && (
        <div style={{ background: '#f8f4eb', marginTop: '64px' }}>
          <div className="max-w-6xl mx-auto px-6" style={{ paddingTop: '72px', paddingBottom: '88px' }}>

            {!loading && (
              <div style={{ marginBottom: '40px' }}>
                <h2 style={{ fontSize: '28px', fontWeight: 600, lineHeight: '1.15', color: '#130426', margin: 0 }}>
                  Materials in this area
                </h2>
                <p style={{ fontSize: '18px', fontWeight: 400, lineHeight: '1.45', color: 'rgba(19,4,38,0.58)', marginTop: '12px', marginBottom: 0 }}>
                  Notes, documents, and outputs created from your work in this area.
                </p>
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-[3fr_2fr] items-start" style={{ columnGap: '32px', rowGap: '28px' }}>

              {/* Notes */}
              <div style={c.notes.bgStyle}>
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

                <textarea
                  ref={composerRef}
                  value={composerText}
                  onChange={(e) => setComposerText(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Write a note…"
                  rows={2}
                  className="w-full text-[#130426] resize-none outline-none overflow-hidden transition-colors domain-note-input"
                  style={{
                    background: '#FFFFFF',
                    border: '1px solid rgba(19,4,38,0.08)',
                    borderRadius: '16px',
                    minHeight: '84px',
                    padding: '20px 24px',
                    fontSize: '18px',
                    fontWeight: 400,
                    lineHeight: '1.4',
                    color: '#130426',
                  }}
                />
                <div className="flex items-center justify-between mt-2 mb-5">
                  <p style={{ fontSize: '14px', fontWeight: 400, lineHeight: '1.35', color: 'rgba(19,4,38,0.50)' }}>Notes are saved to your materials</p>
                  {composerText.trim() && (
                    <button
                      onClick={handleNonHealthcareSave}
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
                  <div className="grid grid-cols-4 gap-3 mt-1 items-start">
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

              {/* Right column — Documents + Working Outputs */}
              <div className="flex flex-col gap-6">

                <div style={c.docs.bgStyle}>
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
                    <div className="flex flex-col" style={{ gap: '16px' }}>
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

                <div style={c.outputs.bgStyle}>
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
                    <div className="flex flex-col" style={{ gap: '16px' }}>
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

          </div>
        </div>
      )}

    </div>
  )
}

// ---------------------------------------------------------------------------
// PlanningStatusSection
// ---------------------------------------------------------------------------

type OpenRowPanel = {
  rowKey: string
  rowTitle: string
  allowedReflectPrompts?: string[]
} | null

function PlanningStatusSection({
  domainId,
  structure,
  domainTitle = '',
  entries = [],
  isHealthcare = false,
  showWishesCard = false,
  showFuneralWishesCard = false,
  onReadyStatusChange,
  eligibleNotes = [],
  allUserNotes = [],
  domainNoteIds = new Set(),
  domainTopicNotesList = [],
  hiddenRowNotesList = [],
  onTopicNoteAdd,
  onTopicNoteRemove,
  onRowNoteHide,
}: {
  domainId: string
  structure: DomainStructure | null
  domainTitle?: string
  entries?: EntryRef[]
  isHealthcare?: boolean
  showWishesCard?: boolean
  showFuneralWishesCard?: boolean
  onReadyStatusChange: (key: string, status: DomainItemStatus) => void
  eligibleNotes?: Note[]
  allUserNotes?: Note[]
  domainNoteIds?: Set<string>
  domainTopicNotesList?: TopicNoteRow[]
  hiddenRowNotesList?: TopicNoteRow[]
  onTopicNoteAdd?: (noteId: string, topicId: string, note: Note) => void
  onTopicNoteRemove?: (noteId: string, topicId: string) => void
  onRowNoteHide?: (noteId: string, topicId: string) => void
}) {
  const [openRowPanel, setOpenRowPanel] = useState<OpenRowPanel>(null)
  const [checkboxes, setCheckboxes] = useState<Record<string, boolean[]>>({})

  function resolveRowNotes(itemKey: string, allowedReflectPrompts?: string[]): {
    notes: Note[]
    manualNoteIds: Set<string>
  } {
    const autoNotes = allowedReflectPrompts?.length
      ? eligibleNotes.filter(n =>
          n.origin_type === 'prompt' &&
          n.prompt_context != null &&
          allowedReflectPrompts.includes(n.prompt_context)
        )
      : []

    const hiddenIds = new Set(
      hiddenRowNotesList.filter(h => h.topic_id === itemKey).map(h => h.note_id)
    )
    const manualNoteIdList = domainTopicNotesList
      .filter(d => d.topic_id === itemKey)
      .map(d => d.note_id)
    const manualNotes = allUserNotes.filter(n => manualNoteIdList.includes(n.id))
    const manualNoteIds = new Set(manualNoteIdList)

    const visibleAuto = autoNotes.filter(n => !hiddenIds.has(n.id))
    const seen = new Set<string>()
    const result: Note[] = []
    for (const n of [...visibleAuto, ...manualNotes]) {
      if (!seen.has(n.id)) { seen.add(n.id); result.push(n) }
    }
    return { notes: result, manualNoteIds }
  }

  function rowNoteCount(itemKey: string, allowedReflectPrompts?: string[]): number {
    return resolveRowNotes(itemKey, allowedReflectPrompts).notes.length
  }

  function openPanel(item: OrientationItemDef | ReadinessItemDef) {
    const allowedReflectPrompts = 'allowedReflectPrompts' in item ? item.allowedReflectPrompts : undefined
    setOpenRowPanel({ rowKey: item.key, rowTitle: item.title, allowedReflectPrompts })
  }
  const [orientStatuses, setOrientStatuses] = useState<Record<string, DomainItemStatus>>({})

  const [domainStateLoaded, setDomainStateLoaded] = useState(false)
  const domainStateRef = useRef<DomainState>({})

  // ── Load checkboxes + orient state from Supabase (source of truth).
  //    loadDomainState() also performs a one-time, idempotent backfill
  //    from legacy localStorage keys and auth.user_metadata.sync_* flags,
  //    so existing users don't lose progress when the DB column is empty.
  //    domainStateLoaded gates rendering of readiness items below so the
  //    user never sees a flash of unchecked state on first paint (the
  //    race the localStorage-first flow had).
  useEffect(() => {
    if (!structure) return
    let cancelled = false
    void (async () => {
      const { state } = await loadDomainState()
      if (cancelled) return
      domainStateRef.current = state
      const cbLoaded: Record<string, boolean[]> = {}
      for (const item of structure.readiness) {
        const vals = getCheckboxes(state, domainId, item.key, item.checkboxes.length)
        cbLoaded[item.key] = vals
        onReadyStatusChange(item.key, computeReadyStatus(vals, item.checkboxes.length))
      }
      setCheckboxes(cbLoaded)
      if (isHealthcare) {
        const orLoaded: Record<string, DomainItemStatus> = {}
        for (const item of structure.orientation) {
          orLoaded[item.key] = getOrient(state, domainId, item.key)
        }
        setOrientStatuses(orLoaded)
      }
      setDomainStateLoaded(true)
    })()
    return () => { cancelled = true }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [structure, domainId, isHealthcare])

  function handleCheckbox(itemKey: string, idx: number, total: number) {
    // Drop taps that arrive before the source-of-truth load resolves —
    // prevents an early click from being overwritten when state arrives.
    if (!domainStateLoaded) return
    setCheckboxes((prev) => {
      const current = prev[itemKey] ?? Array(total).fill(false)
      const updated = [...current]
      updated[idx] = !updated[idx]
      const status = computeReadyStatus(updated, total)
      onReadyStatusChange(itemKey, status)
      // Fire-and-forget persist to user_profiles.domain_state.
      void saveCheckboxes(domainId, itemKey, updated, { currentState: domainStateRef.current })
        .then((next) => { if (next) domainStateRef.current = next })
      fetch('/api/analytics/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventName: 'document_field_saved', metadata: { domain_id: domainId, field_type: 'checkbox', field_key: itemKey } }),
      }).catch(() => {})
      return { ...prev, [itemKey]: updated }
    })
  }

  function cycleOrientStatus(key: string) {
    if (!domainStateLoaded) return
    setOrientStatuses((prev) => {
      const current = prev[key] ?? 'not_started'
      const next: DomainItemStatus =
        current === 'not_started' ? 'in_progress' :
        current === 'in_progress' ? 'complete' : 'not_started'
      void saveOrient(domainId, key, next, { currentState: domainStateRef.current })
        .then((updated) => { if (updated) domainStateRef.current = updated })
      fetch('/api/analytics/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventName: 'document_field_saved', metadata: { domain_id: domainId, field_type: 'orientation', field_key: key, new_status: next } }),
      }).catch(() => {})
      return { ...prev, [key]: next }
    })
  }

  function setOrientStatus(key: string, newStatus: DomainItemStatus) {
    if (!domainStateLoaded) return
    setOrientStatuses((prev) => {
      void saveOrient(domainId, key, newStatus, { currentState: domainStateRef.current })
        .then((updated) => { if (updated) domainStateRef.current = updated })
      fetch('/api/analytics/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventName: 'document_field_saved', metadata: { domain_id: domainId, field_type: 'orientation', field_key: key, new_status: newStatus } }),
      }).catch(() => {})
      return { ...prev, [key]: newStatus }
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

  // ── Healthcare: segment bar layout ────────────────────────────────────────
  if (isHealthcare) {
    const totalTopics = structure.orientation.length + structure.readiness.length

    // Orientation topics first, then readiness — matches page order
    const segments: { key: string; title: string; status: DomainItemStatus }[] = [
      ...structure.orientation.map((item) => ({
        key: item.key,
        title: item.title,
        status: orientStatuses[item.key] ?? 'not_started',
      })),
      ...structure.readiness.map((item) => {
        const vals = checkboxes[item.key] ?? item.checkboxes.map(() => false)
        return { key: item.key, title: item.title, status: computeReadyStatus(vals, item.checkboxes.length) }
      }),
    ]

    const exploredCount = segments.filter((s) => s.status !== 'not_started').length

    function qualitativePhrase(n: number): string {
      if (n === 0) return 'Not yet started'
      if (n <= 2) return 'Just beginning'
      if (n <= 4) return 'Taking shape'
      if (n <= 6) return 'Well underway'
      return 'Deeply explored'
    }

    const resolvedPanel = openRowPanel
      ? resolveRowNotes(openRowPanel.rowKey, openRowPanel.allowedReflectPrompts)
      : null

    return (
      <>
        {openRowPanel && resolvedPanel && (
          <RowNotesPanel
            rowTitle={openRowPanel.rowTitle}
            notes={resolvedPanel.notes}
            manualNoteIds={resolvedPanel.manualNoteIds}
            allUserNotes={allUserNotes}
            domainNoteIds={domainNoteIds}
            rowNoteIds={new Set(resolvedPanel.notes.map(n => n.id))}
            onClose={() => setOpenRowPanel(null)}
            onRemoveNote={(noteId, isManual) => {
              if (isManual) onTopicNoteRemove?.(noteId, openRowPanel.rowKey)
              else onRowNoteHide?.(noteId, openRowPanel.rowKey)
            }}
            onAddNote={(note) => onTopicNoteAdd?.(note.id, openRowPanel.rowKey, note)}
          />
        )}
        <div>
          {/* Section label — centered */}
          <h2 style={{ fontSize: '32px', fontWeight: 600, lineHeight: '1.15', color: '#130426', marginBottom: 24, textAlign: 'center' }}>
            Planning Status
          </h2>

          {/* Segment bar */}
          <SegmentBar segments={segments} />

          {/* Labels below bar */}
          <div style={{ textAlign: 'center', marginTop: 12, marginBottom: 40 }}>
            <p style={{ fontSize: 18, fontWeight: 600, color: '#130426', margin: '0 0 4px 0' }}>
              {qualitativePhrase(exploredCount)}
            </p>
            <p style={{ fontSize: 13, color: 'rgba(19,4,38,0.70)', margin: 0 }}>
              {exploredCount} of {totalTopics} topics started
            </p>
          </div>

          {/* Your Wishes card — healthcare only */}
          {showWishesCard && <div style={{ maxWidth: 520, width: '100%', marginLeft: 'auto', marginRight: 'auto', marginBottom: 32 }}>
          <div style={{ background: 'transparent', border: '1.5px solid rgba(44,55,119,0.45)', borderRadius: 16, padding: '14px 18px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, marginBottom: 4 }}>
              <p style={{ fontFamily: "'Apfel Grotezk', sans-serif", fontSize: 18, fontWeight: 500, color: '#130426', margin: 0, lineHeight: 1.2, display: 'flex', alignItems: 'center', gap: 8 }}>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ flexShrink: 0 }}>
                  <rect x="2" y="1" width="10" height="13" rx="1.5" stroke="#2C3777" strokeWidth="1.5" fill="none"/>
                  <line x1="4.5" y1="5" x2="9.5" y2="5" stroke="#2C3777" strokeWidth="1.2" strokeLinecap="round"/>
                  <line x1="4.5" y1="7.5" x2="9.5" y2="7.5" stroke="#2C3777" strokeWidth="1.2" strokeLinecap="round"/>
                  <line x1="4.5" y1="10" x2="7.5" y2="10" stroke="#2C3777" strokeWidth="1.2" strokeLinecap="round"/>
                </svg>
                My Care Wishes
              </p>
              <a
                href="/app/capture/advance-directive"
                target="_blank"
                rel="noopener noreferrer"
                style={{ fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif", fontSize: 13, fontWeight: 500, color: '#DB5835', textDecoration: 'none', flexShrink: 0 }}
                className="hover:opacity-80 transition-opacity"
              >
                Open document →
              </a>
            </div>
            <p style={{ fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif", fontSize: 13, fontWeight: 400, color: 'rgba(19,4,38,0.80)', margin: 0, lineHeight: 1.5 }}>
              Capture what matters most for your care.
            </p>
          </div>
          </div>}

          {/* Funeral Wishes card — deathcare only */}
          {showFuneralWishesCard && <div style={{ maxWidth: 580, width: '100%', marginLeft: 'auto', marginRight: 'auto', marginBottom: 32 }}>
          <div style={{ background: 'transparent', border: '1.5px solid rgba(44,55,119,0.45)', borderRadius: 16, padding: '14px 18px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, marginBottom: 4 }}>
              <p style={{ fontFamily: "'Apfel Grotezk', sans-serif", fontSize: 18, fontWeight: 500, color: '#130426', margin: 0, lineHeight: 1.2, display: 'flex', alignItems: 'center', gap: 8 }}>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ flexShrink: 0 }}>
                  <rect x="2" y="1" width="10" height="13" rx="1.5" stroke="#2C3777" strokeWidth="1.5" fill="none"/>
                  <line x1="4.5" y1="5" x2="9.5" y2="5" stroke="#2C3777" strokeWidth="1.2" strokeLinecap="round"/>
                  <line x1="4.5" y1="7.5" x2="9.5" y2="7.5" stroke="#2C3777" strokeWidth="1.2" strokeLinecap="round"/>
                  <line x1="4.5" y1="10" x2="7.5" y2="10" stroke="#2C3777" strokeWidth="1.2" strokeLinecap="round"/>
                </svg>
                Wishes for My Body, Funeral &amp; Ceremony
              </p>
              <a
                href="/app/capture/funeral-wishes"
                target="_blank"
                rel="noopener noreferrer"
                style={{ fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif", fontSize: 13, fontWeight: 500, color: '#DB5835', textDecoration: 'none', flexShrink: 0 }}
                className="hover:opacity-80 transition-opacity"
              >
                Open document →
              </a>
            </div>
            <p style={{ fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif", fontSize: 13, fontWeight: 400, color: 'rgba(19,4,38,0.80)', margin: 0, lineHeight: 1.5, whiteSpace: 'pre-line' }}>
              Document your wishes for what happens to your body,{'\n'}any funeral or ceremony, and how you&apos;d like to be remembered.
            </p>
          </div>
          </div>}

          {/* Two panels side by side */}
          <div className="planning-panels">
            <div className="rounded-xl p-6" style={{ background: '#BBABF4' }}>
              <p className="text-[22px] font-bold text-[#130426] mb-2">Reflection + Learning</p>
              <p style={{ fontSize: 13, fontStyle: 'italic', color: 'rgba(19,4,38,0.80)', marginBottom: 4 }}>
                Topics to think through and read about for this area
              </p>
              <p style={{ fontSize: 13, color: 'rgba(19,4,38,0.80)', marginBottom: 24 }}>
                Update your status as you explore each topic.
              </p>
              <div className="space-y-3">
                {structure.orientation.map((item) => {
                  const count = rowNoteCount(item.key, item.allowedReflectPrompts)
                  return (
                    <OrientationCard
                      key={item.key}
                      item={item}
                      status={orientStatuses[item.key] ?? 'not_started'}
                      matched={itemEntries(item)}
                      domainId={domainId}
                      onSetStatus={(s) => setOrientStatus(item.key, s)}
                      noteCount={count}
                      onViewNotes={() => openPanel(item)}
                    />
                  )
                })}
              </div>
            </div>

            <div className="rounded-xl p-6" style={{ background: '#F8F4EB', border: '1px solid rgba(242,152,54,0.35)' }}>
              <p className="text-[22px] font-bold mb-2" style={{ color: '#DB5835' }}>Practical Readiness</p>
              <p style={{ fontSize: 13, fontStyle: 'italic', color: 'rgba(19,4,38,0.80)', marginBottom: 4 }}>Practical steps to take and decisions to document</p>
              <p style={{ fontSize: 13, color: 'rgba(19,4,38,0.80)', marginBottom: 24 }}>Your progress updates as you complete each step.</p>
              <div className="space-y-3">
                {structure.readiness.map((item) => {
                  const vals = checkboxes[item.key] ?? item.checkboxes.map(() => false)
                  const status = computeReadyStatus(vals, item.checkboxes.length)
                  const count = rowNoteCount(item.key)
                  return (
                    <ReadinessCard
                      key={item.key}
                      item={item}
                      vals={vals}
                      status={status}
                      matched={itemEntries(item)}
                      domainId={domainId}
                      isHealthcare
                      onToggle={(idx) => handleCheckbox(item.key, idx, item.checkboxes.length)}
                      noteCount={count}
                      onViewNotes={() => openPanel(item)}
                    />
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      </>
    )
  }

  // ── Default (non-healthcare) layout ───────────────────────────────────────
  const readinessStatuses = structure.readiness.map(i => {
    const vals = checkboxes[i.key] ?? i.checkboxes.map(() => false)
    return computeReadyStatus(vals, i.checkboxes.length)
  })
  const inProgressCount = readinessStatuses.filter(s => s === 'in_progress').length
  const completeCount   = readinessStatuses.filter(s => s === 'complete').length
  const notStartedCount = readinessStatuses.filter(s => s === 'not_started').length

  const resolvedPanelDefault = openRowPanel
    ? resolveRowNotes(openRowPanel.rowKey, openRowPanel.allowedReflectPrompts)
    : null

  return (
    <>
      {openRowPanel && resolvedPanelDefault && (
        <RowNotesPanel
          rowTitle={openRowPanel.rowTitle}
          notes={resolvedPanelDefault.notes}
          manualNoteIds={resolvedPanelDefault.manualNoteIds}
          allUserNotes={allUserNotes}
          domainNoteIds={domainNoteIds}
          rowNoteIds={new Set(resolvedPanelDefault.notes.map(n => n.id))}
          onClose={() => setOpenRowPanel(null)}
          onRemoveNote={(noteId, isManual) => {
            if (isManual) onTopicNoteRemove?.(noteId, openRowPanel.rowKey)
            else onRowNoteHide?.(noteId, openRowPanel.rowKey)
          }}
          onAddNote={(note) => onTopicNoteAdd?.(note.id, openRowPanel.rowKey, note)}
        />
      )}
      <div>
        <div className="mb-10 pb-7" style={{ borderBottom: '1px solid rgba(19,4,38,0.10)' }}>
          <h2 style={{ fontSize: '32px', fontWeight: 600, lineHeight: '1.15', color: '#130426', marginBottom: '10px' }}>
            Planning Status
          </h2>
          <p className="text-[14px]" style={{ color: 'rgba(19,4,38,0.80)' }}>
            {[
              inProgressCount > 0 && `${inProgressCount} in progress`,
              completeCount   > 0 && `${completeCount} complete`,
              notStartedCount > 0 && `${notStartedCount} not started`,
            ].filter(Boolean).join(' · ')}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="rounded-xl p-6" style={{ background: '#BBABF4' }}>
            <div className="mb-8">
              <p className="text-[22px] font-bold text-[#130426] mb-2">Reflection + Learning</p>
              <p style={{ fontSize: 13, fontStyle: 'italic', color: 'rgba(19,4,38,0.80)', marginBottom: 4 }}>Topics to think through and read about for this area</p>
              <p style={{ fontSize: 13, color: 'rgba(19,4,38,0.80)', marginBottom: 0 }}>Update your status as you explore each topic.</p>
            </div>
            <div className="space-y-3">
              {structure.orientation.map((item) => {
                const count = rowNoteCount(item.key, item.allowedReflectPrompts)
                return (
                  <div
                    key={item.key}
                    className="rounded-lg overflow-hidden"
                    style={{ background: 'rgba(255,255,255,0.60)', border: '1px solid rgba(255,255,255,0.40)' }}
                  >
                    <div className="p-4">
                      <p className="text-[14px] font-semibold text-[#130426] leading-snug mb-4">{item.title}</p>
                      <Link
                        href={item.learnHref ?? '/app/learn'}
                        className="inline-block text-[12px] font-semibold bg-[#2C3777] text-white px-3 py-1.5 rounded hover:bg-[#1a1e4d] transition-colors"
                      >
                        Learn more
                      </Link>
                      <ItemMaterials matched={itemEntries(item)} domainId={domainId} panelType="reflection" />
                      <RowNotesIndicator count={count} onClick={() => openPanel(item)} />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          <div className="rounded-xl p-6" style={{ background: '#F8F4EB', border: '1px solid rgba(242,152,54,0.35)' }}>
            <div className="mb-8">
              <p className="text-[22px] font-bold mb-2" style={{ color: '#DB5835' }}>Practical Readiness</p>
              <p style={{ fontSize: 13, fontStyle: 'italic', color: 'rgba(19,4,38,0.80)', marginBottom: 4 }}>Practical steps to take and decisions to document</p>
              <p style={{ fontSize: 13, color: 'rgba(19,4,38,0.80)', marginBottom: 0 }}>Your progress updates as you complete each step.</p>
            </div>
            <div className="space-y-3">
              {structure.readiness.map((item) => {
                const vals = checkboxes[item.key] ?? item.checkboxes.map(() => false)
                const status = computeReadyStatus(vals, item.checkboxes.length)
                const count = rowNoteCount(item.key)
                return (
                  <ReadinessCard
                    key={item.key}
                    item={item}
                    vals={vals}
                    status={status}
                    matched={itemEntries(item)}
                    domainId={domainId}
                    onToggle={(idx) => handleCheckbox(item.key, idx, item.checkboxes.length)}
                    noteCount={count}
                    onViewNotes={() => openPanel(item)}
                  />
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

// ---------------------------------------------------------------------------
// SegmentBar — one segment per topic, colored by status
// ---------------------------------------------------------------------------

type SegmentInfo = { key: string; title: string; status: DomainItemStatus }

function SegmentBar({ segments }: { segments: SegmentInfo[] }) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null)

  function segmentBg(status: DomainItemStatus): string {
    return status === 'complete' ? '#D85A30' : status === 'in_progress' ? '#F0997B' : '#FAECE7'
  }

  function statusLabel(status: DomainItemStatus): string {
    return status === 'complete' ? 'Explored' : status === 'in_progress' ? 'Starting to explore' : 'Not started'
  }

  // Tooltip horizontal alignment: push inward for edge segments
  function tooltipAlign(idx: number, total: number): React.CSSProperties {
    if (idx === 0) return { left: 0, transform: 'none' }
    if (idx === total - 1) return { right: 0, left: 'auto', transform: 'none' }
    return { left: '50%', transform: 'translateX(-50%)' }
  }

  return (
    <div style={{ display: 'flex', gap: 4, width: '100%', maxWidth: 480, margin: '0 auto' }}>
      {segments.map((seg, idx) => (
        <div
          key={seg.key}
          style={{
            flex: '1 1 0',
            height: 16,
            borderRadius: 6,
            backgroundColor: segmentBg(seg.status),
            border: seg.status === 'not_started' ? '1px solid #C9967E' : 'none',
            position: 'relative',
            cursor: 'default',
            transition: 'opacity 0.12s',
          }}
          onMouseEnter={() => setHoveredIdx(idx)}
          onMouseLeave={() => setHoveredIdx(null)}
        >
          {hoveredIdx === idx && (
            <div style={{
              position: 'absolute',
              bottom: 'calc(100% + 8px)',
              ...tooltipAlign(idx, segments.length),
              background: '#FAECE7',
              borderRadius: 6,
              boxShadow: '0 4px 14px rgba(0,0,0,0.12)',
              padding: '8px 12px',
              whiteSpace: 'nowrap',
              zIndex: 20,
              pointerEvents: 'none',
            }}>
              <p style={{ fontSize: 12, fontWeight: 600, color: '#130426', margin: '0 0 2px 0', lineHeight: 1.3 }}>
                {seg.title}
              </p>
              <p style={{ fontSize: 11, color: 'rgba(19,4,38,0.65)', margin: 0, lineHeight: 1.3 }}>
                {statusLabel(seg.status)}
              </p>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

// ---------------------------------------------------------------------------
// StatusDropdown — replaces click-to-cycle with an explicit selector
// ---------------------------------------------------------------------------

const STATUS_OPTIONS: DomainItemStatus[] = ['not_started', 'in_progress', 'complete']
const STATUS_LABELS: Record<DomainItemStatus, string> = {
  not_started: 'Not started',
  in_progress: 'Starting to explore',
  complete:    'Explored',
}

function StatusDropdown({ status, onSelect }: { status: DomainItemStatus; onSelect: (s: DomainItemStatus) => void }) {
  const [open, setOpen] = useState(false)

  const pillStyles: Record<DomainItemStatus, React.CSSProperties> = {
    not_started: { background: '#FAECE7', border: '1px solid #F5C4B3', color: '#993C1D' },
    in_progress: { background: '#F0997B', border: 'none', color: '#712B13' },
    complete:    { background: '#D85A30', border: 'none', color: '#FAECE7' },
  }

  return (
    <div style={{ position: 'relative', flexShrink: 0 }}>
      <button
        onClick={(e) => { e.stopPropagation(); setOpen(o => !o) }}
        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
        className="hover:opacity-80 transition-opacity"
      >
        <span
          className="text-[11px] font-semibold rounded-full px-2.5 py-0.5 inline-flex items-center gap-1"
          style={pillStyles[status]}
        >
          {STATUS_LABELS[status]}
          <svg width="8" height="5" viewBox="0 0 8 5" fill="none" aria-hidden style={{ flexShrink: 0 }}>
            <path d="M1 1l3 3 3-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
      </button>

      {open && (
        <>
          <div style={{ position: 'fixed', inset: 0, zIndex: 30 }} onClick={() => setOpen(false)} />
          <div style={{
            position: 'absolute',
            right: 0,
            top: 'calc(100% + 4px)',
            zIndex: 40,
            background: '#FFFFFF',
            border: '1px solid rgba(19,4,38,0.12)',
            borderRadius: 8,
            padding: '4px 0',
            minWidth: 168,
            boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
          }}>
            {STATUS_OPTIONS.map((opt) => (
              <button
                key={opt}
                onClick={() => { onSelect(opt); setOpen(false) }}
                className="w-full hover:bg-[#F5F3EE] transition-colors"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '7px 12px',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  gap: 8,
                }}
              >
                <span className="text-[11px] font-semibold rounded-full px-2.5 py-0.5" style={pillStyles[opt]}>
                  {STATUS_LABELS[opt]}
                </span>
                {opt === status && (
                  <span style={{ fontSize: 11, color: 'rgba(19,4,38,0.40)' }}>✓</span>
                )}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// OrientationCard
// ---------------------------------------------------------------------------

function OrientationCard({
  item,
  status,
  matched,
  domainId,
  onSetStatus,
  noteCount = 0,
  onViewNotes,
}: {
  item: OrientationItemDef
  status: DomainItemStatus
  matched: EntryRef[]
  domainId: string
  onSetStatus: (s: DomainItemStatus) => void
  noteCount?: number
  onViewNotes?: () => void
}) {
  return (
    <div className="rounded-lg" style={{ background: 'rgba(255,255,255,0.60)', border: '1px solid rgba(255,255,255,0.40)' }}>
      <div className="p-4">
        <div className="flex items-start justify-between gap-3 mb-4">
          <p className="text-[14px] font-semibold text-[#130426] leading-snug">{item.title}</p>
          <StatusDropdown status={status} onSelect={onSetStatus} />
        </div>
        <Link
          href={item.learnHref ?? '/app/learn'}
          className="inline-block text-[12px] font-semibold bg-[#2C3777] text-white px-3 py-1.5 rounded hover:bg-[#1a1e4d] transition-colors"
        >
          Learn more
        </Link>
        <ItemMaterials matched={matched} domainId={domainId} panelType="reflection" />
        <RowNotesIndicator count={noteCount} onClick={onViewNotes ?? (() => {})} />
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// HealthcareStatusPill
// ---------------------------------------------------------------------------

function HealthcareStatusPill({ status }: { status: DomainItemStatus }) {
  const styles: Record<DomainItemStatus, React.CSSProperties> = {
    not_started: { background: '#FAECE7', border: '1px solid #F5C4B3', color: '#993C1D' },
    in_progress: { background: '#F0997B', border: 'none', color: '#712B13' },
    complete:    { background: '#D85A30', border: 'none', color: '#FAECE7' },
  }
  const labels: Record<DomainItemStatus, string> = {
    not_started: 'Not started',
    in_progress: 'Starting to explore',
    complete:    'Explored',
  }
  return (
    <span className="shrink-0 text-[11px] font-semibold rounded-full px-2.5 py-0.5" style={styles[status]}>
      {labels[status]}
    </span>
  )
}

// ---------------------------------------------------------------------------
// StatusPill (non-healthcare)
// ---------------------------------------------------------------------------

function StatusPill({ status }: { status: DomainItemStatus }) {
  const styles: Record<DomainItemStatus, React.CSSProperties> = {
    not_started: { background: '#F8F4EB', border: '1px solid #2C3777', color: '#2C3777' },
    in_progress: { background: '#BBABF4', border: 'none', color: '#130426' },
    complete:    { background: '#F29836', border: 'none', color: '#130426' },
  }
  const labels: Record<DomainItemStatus, string> = {
    not_started: 'Not started',
    in_progress: 'Starting to explore',
    complete:    'Explored',
  }
  return (
    <span className="shrink-0 text-[11px] font-semibold rounded-full px-2.5 py-0.5" style={styles[status]}>
      {labels[status]}
    </span>
  )
}

// ---------------------------------------------------------------------------
// ReadinessCard
// ---------------------------------------------------------------------------

function ReadinessCard({
  item,
  vals,
  status,
  matched,
  domainId,
  isHealthcare = false,
  onToggle,
  noteCount = 0,
  onViewNotes,
}: {
  item: ReadinessItemDef
  vals: boolean[]
  status: DomainItemStatus
  matched: EntryRef[]
  domainId: string
  isHealthcare?: boolean
  onToggle: (idx: number) => void
  noteCount?: number
  onViewNotes?: () => void
}) {
  return (
    <div className="rounded-lg overflow-hidden" style={{ background: 'rgba(255,255,255,0.75)', border: '1px solid rgba(19,4,38,0.08)' }}>
      <div className="p-4">
        <div className="flex items-start justify-between gap-3 mb-2">
          <p className="text-[14px] font-semibold text-[#130426] leading-snug">{item.title}</p>
          {isHealthcare ? <HealthcareStatusPill status={status} /> : <StatusPill status={status} />}
        </div>
        {item.explanation && (
          <p className="text-[12px] leading-relaxed mb-4 text-[#130426]/60">{item.explanation}</p>
        )}
        <div className="space-y-1.5 mb-4">
          {item.checkboxes.map((label, idx) => (
            <div key={idx}>
              <label className="flex items-start gap-2.5 cursor-pointer group">
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
              {item.checkboxHelpers?.[idx] && (
                <p style={{ fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif", fontSize: 12, fontStyle: 'italic', color: 'rgba(19,4,38,0.5)', margin: '3px 0 0 22px', lineHeight: 1.4 }}>
                  {item.checkboxHelpers[idx]}
                </p>
              )}
            </div>
          ))}
        </div>
        {matched.length > 0 && <ItemMaterials matched={matched} domainId={domainId} panelType="readiness" />}
        {item.staticLinks && item.staticLinks.length > 0 && (
          <div style={{ marginTop: 12, marginBottom: 8 }}>
            {item.staticLinks.map(({ href, label }) => (
              <a
                key={href}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between rounded-lg transition-opacity hover:opacity-75"
                style={{ background: '#F8F4EB', border: '1px solid #F29836', padding: '12px 16px', textDecoration: 'none' }}
              >
                <span style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ flexShrink: 0, marginRight: 8 }}>
                    <path d="M3 2.5A1.5 1.5 0 0 1 4.5 1H10l3 3v9A1.5 1.5 0 0 1 11.5 14.5h-7A1.5 1.5 0 0 1 3 13V2.5z" stroke="#2C3777" strokeWidth="1.25" strokeLinejoin="round"/>
                    <path d="M10 1v3h3" stroke="#2C3777" strokeWidth="1.25" strokeLinejoin="round"/>
                    <path d="M5.5 7.5h5M5.5 10h5" stroke="#2C3777" strokeWidth="1.25" strokeLinecap="round"/>
                  </svg>
                  <span style={{ fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif", fontSize: 14, fontWeight: 500, color: '#130426', lineHeight: 1.4 }}>{label}</span>
                </span>
                <span style={{ fontSize: 12, flexShrink: 0, marginLeft: 12, color: 'rgba(0,0,0,0.6)' }}>→</span>
              </a>
            ))}
          </div>
        )}
        <RowNotesIndicator count={noteCount} onClick={onViewNotes ?? (() => {})} />
      </div>
    </div>
  )
}

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
  const linkBg     = isReflection ? 'rgba(44,55,119,0.07)'  : 'rgba(242,152,54,0.10)'
  const linkBorder = isReflection ? 'rgba(44,55,119,0.16)'  : 'rgba(242,152,54,0.24)'
  const labelColor = isReflection ? '#2C3777'               : '#130426'
  return (
    <div className="mt-4 space-y-2">
      {matched.map((entry) => (
        <a
          key={entry.id}
          href={getEntryHref(entry, domainId)}
          className="flex items-center justify-between rounded-lg px-3 py-2.5 transition-opacity hover:opacity-75"
          target="_blank"
          rel="noopener noreferrer"
          style={{ background: linkBg, border: `1px solid ${linkBorder}` }}
        >
          <span className="flex items-center gap-2 text-[13px] font-semibold leading-snug" style={{ color: labelColor }}>
            {entry.activity ? <EntryOutputIcon /> : <EntryDocIcon />}
            {entryLabel(entry)}
          </span>
          <span className="text-[11px] shrink-0 ml-3" style={{ color: 'rgba(19,4,38,0.45)' }}>→</span>
        </a>
      ))}
    </div>
  )
}

// ---------------------------------------------------------------------------
// SectionHeader (non-healthcare materials canvas)
// ---------------------------------------------------------------------------

type SectionColors = { bgStyle: React.CSSProperties; text: string; muted: string; faint: string }

function SectionHeader({ label, colors, isOpen, onToggle }: {
  label: string; colors: SectionColors; isOpen: boolean; onToggle: () => void
}) {
  return (
    <div className="flex items-center justify-between" style={{ marginBottom: '16px' }}>
      <h2 style={{ fontSize: '20px', fontWeight: 600, lineHeight: '1.2', color: '#130426' }}>{label}</h2>
      <button
        onClick={onToggle}
        style={{ fontSize: '14px', fontWeight: 500, lineHeight: '1.2', color: '#2C3777' }}
        className="transition-colors hover:opacity-75"
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
  loading, search, onSearch, notes, entries, noteLinks, entryLinks, domainId, onToggleNote, onToggleEntry,
}: {
  loading: boolean; search: string; onSearch: (v: string) => void
  notes: Note[]; entries: EntryRef[]
  noteLinks: Record<string, string[]>; entryLinks: Record<string, string[]>
  domainId: string
  onToggleNote: (note: Note) => void; onToggleEntry: (entry: EntryRef) => void
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
                <input type="checkbox" checked={!!linked} onChange={() => onToggleNote(note)} className="accent-[#2C3777] shrink-0 mt-0.5" />
                <span className="text-xs text-[#130426]/70 leading-snug">{truncate(note.content, 80)}</span>
              </label>
            )
          })}
          {entries.map((entry) => {
            const linked = entryLinks[entry.id]?.includes(domainId)
            return (
              <label key={entry.id} className="flex items-start gap-3 px-4 py-2.5 hover:bg-[#130426]/[0.04] cursor-pointer">
                <input type="checkbox" checked={!!linked} onChange={() => onToggleEntry(entry)} className="accent-[#2C3777] shrink-0 mt-0.5" />
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
// RowNotesIndicator — compact inline count + link shown inside a topic row
// ---------------------------------------------------------------------------

function RowNotesIndicator({ count, onClick }: { count: number; onClick: () => void }) {
  if (count === 0) return null
  return (
    <div style={{ marginTop: 10 }}>
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); onClick() }}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 5,
          padding: '3px 8px',
          background: '#EEEDFE',
          border: '1.5px solid #7F77DD',
          borderRadius: 6,
          fontSize: 13,
          fontWeight: 500,
          color: '#3C3489',
          cursor: 'pointer',
          fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif",
          lineHeight: 1.4,
        }}
        className="hover:opacity-80 transition-opacity"
      >
        <svg width="12" height="13" viewBox="0 0 12 13" fill="none" aria-hidden>
          {/* note body — square, no text lines */}
          <rect x="1.5" y="3" width="9" height="9.5" rx="1.5" stroke="currentColor" strokeWidth="1.2" />
          {/* pin head sitting on top edge */}
          <circle cx="6" cy="3" r="2" fill="currentColor" />
        </svg>
        {count} {count === 1 ? 'note' : 'notes'} →
      </button>
    </div>
  )
}

// ---------------------------------------------------------------------------
// RowNotesPanel — slide-in panel for a topic row
// ---------------------------------------------------------------------------

function RowNotesPanel({
  rowTitle,
  notes,
  manualNoteIds,
  allUserNotes,
  domainNoteIds,
  rowNoteIds,
  onClose,
  onRemoveNote,
  onAddNote,
}: {
  rowTitle: string
  notes: Note[]
  manualNoteIds: Set<string>
  allUserNotes: Note[]
  domainNoteIds: Set<string>
  rowNoteIds: Set<string>
  onClose: () => void
  onRemoveNote: (noteId: string, isManual: boolean) => void
  onAddNote: (note: Note) => void
}) {
  const [pickerOpen, setPickerOpen] = useState(false)
  const [pickerSearch, setPickerSearch] = useState('')
  const [removingNotes, setRemovingNotes] = useState<Map<string, 'show' | 'hide'>>(new Map())
  const hv = "'Helvetica Neue', Helvetica, Arial, sans-serif"

  function handleRemove(noteId: string) {
    const isManual = manualNoteIds.has(noteId)
    setRemovingNotes(m => new Map(m).set(noteId, 'show'))
    setTimeout(() => setRemovingNotes(m => new Map(m).set(noteId, 'hide')), 3000)
    setTimeout(() => {
      onRemoveNote(noteId, isManual)
      setRemovingNotes(m => { const n = new Map(m); n.delete(noteId); return n })
    }, 3500)
  }

  function handleAdd(note: Note) {
    onAddNote(note)
    setPickerOpen(false)
    setPickerSearch('')
  }

  const backdropStyle: React.CSSProperties = {
    position: 'fixed', inset: 0, background: 'rgba(19,4,38,0.30)', zIndex: 50,
  }
  const drawerStyle: React.CSSProperties = {
    position: 'fixed', top: 0, right: 0, bottom: 0, width: 440, maxWidth: '92vw',
    background: '#F8F4EB', zIndex: 51, overflowY: 'auto',
    boxShadow: '-4px 0 28px rgba(0,0,0,0.14)',
    padding: '28px 26px 56px',
    fontFamily: hv,
  }

  // ── Picker view ──────────────────────────────────────────────────────────
  if (pickerOpen) {
    const searchLower = pickerSearch.toLowerCase()
    function matches(n: Note) {
      if (!searchLower) return true
      return (n.prompt_context ?? '').toLowerCase().includes(searchLower) ||
        (n.content ?? '').toLowerCase().includes(searchLower)
    }
    const inDomain = allUserNotes.filter(n => domainNoteIds.has(n.id) && !rowNoteIds.has(n.id) && matches(n))
    const elsewhere = allUserNotes.filter(n => !domainNoteIds.has(n.id) && matches(n))
    const alreadyInRow = rowNoteIds

    function PickerNoteItem({ note }: { note: Note }) {
      const disabled = alreadyInRow.has(note.id)
      return (
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 12px', background: disabled ? 'rgba(19,4,38,0.03)' : '#FFFFFF', borderRadius: 8, border: '1px solid rgba(19,4,38,0.07)', marginBottom: 6 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            {note.prompt_context && (
              <p style={{ fontSize: 10, color: 'rgba(19,4,38,0.44)', marginBottom: 3, lineHeight: 1.4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {note.prompt_context}
              </p>
            )}
            <p style={{ fontSize: 13, color: disabled ? 'rgba(19,4,38,0.38)' : '#130426', lineHeight: 1.5, margin: 0, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
              {note.content}
            </p>
          </div>
          {disabled ? (
            <span style={{ fontSize: 11, color: 'rgba(19,4,38,0.36)', whiteSpace: 'nowrap', flexShrink: 0, paddingTop: 2 }}>Already added</span>
          ) : (
            <button
              type="button"
              onClick={() => handleAdd(note)}
              style={{ fontSize: 12, fontWeight: 600, color: '#2C3777', background: 'none', border: '1.5px solid #2C3777', borderRadius: 5, padding: '3px 10px', cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0 }}
              className="hover:bg-[#2C3777] hover:text-white transition-colors"
            >
              + Add
            </button>
          )}
        </div>
      )
    }

    return (
      <>
        <div style={backdropStyle} onClick={onClose} />
        <div style={drawerStyle}>
          <button
            type="button"
            onClick={() => setPickerOpen(false)}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 13, color: 'rgba(19,4,38,0.55)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, marginBottom: 20 }}
            className="hover:text-[#130426] transition-colors"
          >
            ← Back
          </button>
          <p style={{ fontSize: 12, color: 'rgba(19,4,38,0.48)', marginBottom: 4 }}>Add a note to:</p>
          <p style={{ fontSize: 16, fontWeight: 700, color: '#130426', marginBottom: 18, lineHeight: 1.3 }}>{rowTitle}</p>
          <input
            type="text"
            placeholder="Search notes…"
            value={pickerSearch}
            onChange={e => setPickerSearch(e.target.value)}
            style={{ display: 'block', width: '100%', padding: '9px 14px', fontSize: 14, color: '#130426', background: '#FFFFFF', border: '1.5px solid rgba(19,4,38,0.15)', borderRadius: 8, outline: 'none', marginBottom: 20, boxSizing: 'border-box', fontFamily: hv }}
          />
          {inDomain.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <p style={{ fontSize: 10, fontWeight: 600, color: 'rgba(19,4,38,0.44)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>In this area</p>
              {inDomain.map(n => <PickerNoteItem key={n.id} note={n} />)}
            </div>
          )}
          {elsewhere.length > 0 && (
            <div>
              <p style={{ fontSize: 10, fontWeight: 600, color: 'rgba(19,4,38,0.44)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>All notes</p>
              {elsewhere.map(n => <PickerNoteItem key={n.id} note={n} />)}
            </div>
          )}
          {inDomain.length === 0 && elsewhere.length === 0 && (
            <p style={{ fontSize: 14, color: 'rgba(19,4,38,0.44)' }}>No notes found.</p>
          )}
        </div>
      </>
    )
  }

  // ── Main view ────────────────────────────────────────────────────────────
  return (
    <>
      <div style={backdropStyle} onClick={onClose} />
      <div style={drawerStyle}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
          <div>
            <p style={{ fontSize: 12, color: 'rgba(19,4,38,0.48)', marginBottom: 4 }}>Your notes on:</p>
            <h2 style={{ fontSize: 17, fontWeight: 700, color: '#130426', margin: 0, lineHeight: 1.3 }}>{rowTitle}</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 22, color: 'rgba(19,4,38,0.45)', padding: 0, lineHeight: 1, marginTop: -2, flexShrink: 0 }}
            className="hover:text-[#130426] transition-colors"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        {/* Add from your notes */}
        <button
          type="button"
          onClick={() => setPickerOpen(true)}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '7px 14px', background: '#130426', color: '#F8F4EB', border: 'none', borderRadius: 7, fontSize: 13, fontWeight: 500, cursor: 'pointer', marginBottom: 24 }}
          className="hover:opacity-85 transition-opacity"
        >
          + Add from your notes
        </button>

        {/* Notes list or empty state */}
        {notes.length === 0 ? (
          <div style={{ padding: '20px 0' }}>
            <p style={{ fontSize: 15, fontWeight: 500, color: '#130426', marginBottom: 8, lineHeight: 1.4 }}>
              No notes yet for this topic.
            </p>
            <p style={{ fontSize: 14, color: 'rgba(19,4,38,0.58)', lineHeight: 1.5 }}>
              We&apos;ll surface relevant reflections here, or you can add your own.
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {notes.map((note) => {
              const phase = removingNotes.get(note.id)
              if (phase) {
                return (
                  <div key={note.id} style={{ opacity: phase === 'hide' ? 0 : 1, maxHeight: phase === 'hide' ? '0px' : '200px', overflow: 'hidden', transition: 'opacity 0.4s ease, max-height 0.4s ease' }}>
                    <div style={{ background: '#F8F4EB', border: '1px solid rgba(0,0,0,0.15)', borderRadius: 12, padding: 12 }}>
                      <p style={{ fontSize: 14, color: '#1A1A1A', margin: 0, lineHeight: 1.5 }}>Removed. Still saved in My Materials.</p>
                    </div>
                  </div>
                )
              }
              return (
                <div key={note.id} style={{ background: '#FFFFFF', borderRadius: 10, padding: '14px 16px', border: '1px solid rgba(19,4,38,0.08)' }}>
                  {note.prompt_context && (
                    <p style={{ fontSize: 11, color: 'rgba(19,4,38,0.46)', marginBottom: 7, lineHeight: 1.45 }}>
                      {note.prompt_context}
                    </p>
                  )}
                  <p style={{ fontSize: 14, color: '#130426', lineHeight: 1.6, margin: 0 }}>
                    {note.content}
                  </p>
                  {note.created_at && (
                    <p style={{ fontSize: 11, color: 'rgba(19,4,38,0.34)', marginTop: 8, marginBottom: 10 }}>
                      {new Date(note.created_at).toLocaleDateString('en-CA', { month: 'long', day: 'numeric', year: 'numeric' })}
                    </p>
                  )}
                  <button
                    type="button"
                    onClick={() => handleRemove(note.id)}
                    style={{ fontSize: 12, color: 'rgba(19,4,38,0.48)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                    className="hover:text-[#130426] transition-colors"
                  >
                    Remove
                  </button>
                </div>
              )
            })}
          </div>
        )}

        <div style={{ marginTop: 32 }}>
          <Link href="/app/plan" style={{ fontSize: 13, color: '#2C3777', fontWeight: 500 }}>
            Manage notes in My Materials →
          </Link>
        </div>
      </div>
    </>
  )
}

// ---------------------------------------------------------------------------
// NoteCard
// ---------------------------------------------------------------------------

const STICKY_COLORS = ['#f5f2e3', '#eae7f5', '#f3ede8']

function NoteCard({
  note, idx = 0, domainId, allDomains, linkedDomainIds, onAddToRow, onToggled, onUpdated,
}: {
  note: Note; idx?: number; domainId: string; allDomains: Container[]
  linkedDomainIds: string[]
  onAddToRow?: () => void
  onToggled: (domainId: string, isNowLinked: boolean) => void
  onUpdated?: (newContent: string) => void
}) {
  const [removePhase, setRemovePhase] = useState<'idle' | 'show' | 'hide'>('idle')

  async function handleRemove() {
    await removeNoteFromContainer(note.id, domainId)
    setRemovePhase('show')
    setTimeout(() => setRemovePhase('hide'), 3000)
    setTimeout(() => onToggled(domainId, false), 3500)
  }
  async function handleSave(newContent: string) {
    await updateNote(note.id, newContent)
    onUpdated?.(newContent)
  }
  const stickyBg = STICKY_COLORS[idx % STICKY_COLORS.length]

  const removeBtn = (
    <button
      onClick={handleRemove}
      style={{ fontSize: '12px', fontWeight: 500, color: 'rgba(0,0,0,0.7)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, lineHeight: '1.2' }}
      className="hover:opacity-75 transition-opacity"
    >
      Remove
    </button>
  )

  const addToBtn = onAddToRow ? (
    <button
      onClick={onAddToRow}
      style={{ fontSize: '12px', fontWeight: 600, color: '#FFFFFF', background: '#F29836', border: 'none', borderRadius: 999, padding: '6px 12px', cursor: 'pointer', lineHeight: '1.2', flexShrink: 0 }}
      className="hover:opacity-90 transition-opacity"
    >
      Add to
    </button>
  ) : null

  if (removePhase !== 'idle') {
    return (
      <div style={{ opacity: removePhase === 'hide' ? 0 : 1, maxHeight: removePhase === 'hide' ? '0px' : '500px', overflow: 'hidden', transition: 'opacity 0.4s ease, max-height 0.4s ease', aspectRatio: '1 / 1' }}>
        <div style={{ background: '#F8F4EB', border: '1px solid rgba(0,0,0,0.15)', borderRadius: 12, padding: 12, height: '100%', display: 'flex', alignItems: 'center' }}>
          <p style={{ fontSize: 14, color: '#1A1A1A', margin: 0, lineHeight: 1.5 }}>Removed. Still saved in My Materials.</p>
        </div>
      </div>
    )
  }

  if (note.note_mode === 'audio') {
    return (
      <VoiceNoteCard
        note={note}
        promptContext={note.origin_type === 'prompt' ? note.prompt_context ?? null : null}
        actions={
          onAddToRow ? (
            <>{addToBtn}{removeBtn}</>
          ) : (
            <>
              {removeBtn}
              <DomainAssigner itemId={note.id} itemType="note" allDomains={allDomains} initialLinkedDomainIds={linkedDomainIds} label="Add to" showCount={false} theme="light" onToggled={onToggled} />
            </>
          )
        }
      />
    )
  }

  return (
    <SharedNoteCard
      content={note.content}
      promptContext={note.origin_type === 'prompt' ? note.prompt_context : null}
      onContentSave={handleSave}
      stickyStyle={{ backgroundColor: stickyBg, aspectRatio: '1 / 1', boxShadow: '3px 3px 8px rgba(19,4,38,0.20)', border: '1.5px solid rgba(120,90,60,0.22)', padding: '20px 12px 10px', borderRadius: '0' }}
      embellishment={
        <div style={{ position: 'absolute', top: '-10px', left: '50%', transform: 'translateX(-50%) rotate(-1deg)', width: '36px', height: '20px', backgroundColor: 'rgba(255,255,255,0.7)' }} />
      }
      actionsContent={onAddToRow ? (onEdit) => (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {addToBtn}
            <button
              onClick={onEdit}
              style={{ fontSize: '12px', fontWeight: 500, color: 'rgba(0,0,0,0.7)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, lineHeight: '1.2' }}
              className="hover:opacity-75 transition-opacity"
            >
              Edit
            </button>
          </div>
          {removeBtn}
        </div>
      ) : undefined}
      actions={!onAddToRow ? (
        <>
          {removeBtn}
          <DomainAssigner itemId={note.id} itemType="note" allDomains={allDomains} initialLinkedDomainIds={linkedDomainIds} label="Add to" showCount={false} theme="light" onToggled={onToggled} />
        </>
      ) : undefined}
    />
  )
}

// ---------------------------------------------------------------------------
// EntryCard icons
// ---------------------------------------------------------------------------

function EntryDocIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0 }}>
      <path d="M3 2.5A1.5 1.5 0 0 1 4.5 1H10l3 3v9A1.5 1.5 0 0 1 11.5 14.5h-7A1.5 1.5 0 0 1 3 13V2.5z" stroke="currentColor" strokeWidth="1.25" strokeLinejoin="round" fill="none"/>
      <path d="M10 1v3h3" stroke="currentColor" strokeWidth="1.25" strokeLinejoin="round" fill="none"/>
      <path d="M5.5 7.5h5M5.5 10h5" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round"/>
    </svg>
  )
}

function EntryOutputIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0 }}>
      <rect x="2" y="2.5" width="12" height="11" rx="1" stroke="currentColor" strokeWidth="1.25" strokeLinejoin="round"/>
      <circle cx="5.5" cy="7" r="1.5" fill="currentColor"/>
      <circle cx="8.5" cy="9.5" r="1.5" fill="currentColor"/>
      <circle cx="11" cy="5.5" r="1.5" fill="currentColor"/>
    </svg>
  )
}

// ---------------------------------------------------------------------------
// EntryCard
// ---------------------------------------------------------------------------

function EntryCard({
  entry, domainId, allDomains, linkedDomainIds, variant, onToggled,
}: {
  entry: EntryRef; domainId: string; allDomains: Container[]
  linkedDomainIds: string[]; variant: 'document' | 'output'
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
      <div style={{ background: '#F4EEFF', border: '1px solid rgba(44,55,119,0.10)', borderRadius: '18px', boxShadow: '0 4px 14px rgba(19,4,38,0.05)', overflow: 'hidden' }}>
        <div style={{ display: 'flex' }}>
          <div style={{ width: '4px', flexShrink: 0, background: '#BBABF4', borderRadius: '999px' }} />
          <div style={{ flex: 1, padding: '24px 26px' }}>
            <Link href={href} target="_blank" rel="noopener noreferrer" className="block" style={{ marginBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, color: '#130426' }}>
                <div style={{ flexShrink: 0, marginTop: 2 }}><EntryOutputIcon /></div>
                <p style={{ fontSize: '16px', fontWeight: 600, color: '#130426', lineHeight: '1.3' }} className="hover:opacity-70 transition-opacity">{label}</p>
              </div>
            </Link>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', paddingTop: '10px', borderTop: '1px solid rgba(44,55,119,0.08)' }}>
              <Link href={href} target="_blank" rel="noopener noreferrer" style={{ fontSize: '13px', fontWeight: 400, lineHeight: '1.25', color: 'rgba(19,4,38,0.80)' }} className="hover:opacity-75 transition-opacity">Open</Link>
              {entry.activity === 'values_ranking' && (
                <>
                  <span style={{ color: 'rgba(19,4,38,0.25)', fontSize: '12px' }}>·</span>
                  <Link href={`/app/entries/${entry.id}/export`} target="_blank" rel="noopener noreferrer" style={{ fontSize: '13px', fontWeight: 400, lineHeight: '1.25', color: 'rgba(19,4,38,0.80)' }} className="hover:opacity-75 transition-opacity">Export</Link>
                </>
              )}
              <button onClick={handleRemove} style={{ fontSize: '13px', fontWeight: 400, lineHeight: '1.25', color: 'rgba(19,4,38,0.80)' }} className="hover:opacity-75 transition-opacity">Remove</button>
              <DomainAssigner itemId={entry.id} itemType="entry" allDomains={allDomains} initialLinkedDomainIds={linkedDomainIds} label="Add to" showCount={false} theme="light" onToggled={onToggled} />
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={{ background: '#FFFFFF', border: '1px solid rgba(19,4,38,0.08)', borderRadius: '18px', boxShadow: '0 4px 14px rgba(19,4,38,0.06)', overflow: 'hidden' }}>
      <div style={{ display: 'flex' }}>
        <div style={{ width: '4px', flexShrink: 0, background: '#2C3777', borderRadius: '999px' }} />
        <div style={{ flex: 1, padding: '24px 26px' }}>
          <Link href={href} target="_blank" rel="noopener noreferrer" className="block" style={{ marginBottom: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, color: '#130426' }}>
              <div style={{ flexShrink: 0, marginTop: 2 }}><EntryDocIcon /></div>
              <p style={{ fontSize: '16px', fontWeight: 600, color: '#130426', lineHeight: '1.3' }} className="hover:opacity-70 transition-opacity">{label}</p>
            </div>
          </Link>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', paddingTop: '10px', borderTop: '1px solid rgba(19,4,38,0.07)' }}>
            <Link href={href} target="_blank" rel="noopener noreferrer" style={{ fontSize: '13px', fontWeight: 400, lineHeight: '1.25', color: 'rgba(19,4,38,0.80)' }} className="hover:opacity-75 transition-opacity">Open</Link>
            <button onClick={handleRemove} style={{ fontSize: '13px', fontWeight: 400, lineHeight: '1.25', color: 'rgba(19,4,38,0.80)' }} className="hover:opacity-75 transition-opacity">Remove</button>
            <DomainAssigner itemId={entry.id} itemType="entry" allDomains={allDomains} initialLinkedDomainIds={linkedDomainIds} label="Add to" showCount={false} theme="light" onToggled={onToggled} />
          </div>
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// RowPickerModal — lets user assign a "Your Thoughts" note to a topic row
// ---------------------------------------------------------------------------

function RowPickerModal({
  note,
  rows,
  onSelect,
  onClose,
}: {
  note: Note
  rows: { key: string; title: string; section: 'orientation' | 'readiness' }[]
  onSelect: (rowKey: string, rowTitle: string) => void
  onClose: () => void
}) {
  const hv = "'Helvetica Neue', Helvetica, Arial, sans-serif"
  const orientRows = rows.filter(r => r.section === 'orientation')
  const readinessRows = rows.filter(r => r.section === 'readiness')

  return (
    <>
      <div
        style={{ position: 'fixed', inset: 0, background: 'rgba(19,4,38,0.40)', zIndex: 60 }}
        onClick={onClose}
      />
      <div style={{
        position: 'fixed',
        top: '50%', left: '50%',
        transform: 'translate(-50%, -50%)',
        width: 400, maxWidth: '92vw', maxHeight: '80vh',
        background: '#F8F4EB',
        borderRadius: 14,
        boxShadow: '0 12px 40px rgba(0,0,0,0.22)',
        padding: '28px 24px 24px',
        overflowY: 'auto',
        zIndex: 61,
        fontFamily: hv,
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
          <div style={{ flex: 1, minWidth: 0, paddingRight: 12 }}>
            <p style={{ fontSize: 16, fontWeight: 700, color: '#1A1A1A', lineHeight: 1.35, marginBottom: 8, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical' }}>
              {note.content}
            </p>
            <p style={{ fontSize: 13, color: 'rgba(19,4,38,0.55)', margin: 0 }}>Add this note to:</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 22, color: 'rgba(19,4,38,0.45)', padding: 0, lineHeight: 1, marginTop: -2, flexShrink: 0 }}
            className="hover:text-[#130426] transition-colors"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        {orientRows.length > 0 && (
          <div style={{ background: 'rgba(187,171,244,0.15)', borderRadius: 12, padding: 16, marginBottom: 16 }}>
            <p style={{ fontSize: 13, fontWeight: 700, color: '#1A1A1A', marginBottom: 10 }}>Reflection + Learning</p>
            {orientRows.map(row => (
              <button
                key={row.key}
                type="button"
                onClick={() => onSelect(row.key, row.title)}
                style={{ display: 'block', width: '100%', textAlign: 'left', padding: '10px 12px', background: '#FFFFFF', border: '1px solid rgba(0,0,0,0.10)', borderRadius: 8, marginBottom: 8, fontSize: 13, color: '#1A1A1A', cursor: 'pointer', lineHeight: 1.4 }}
                className="hover:opacity-80 transition-opacity"
              >
                {row.title}
              </button>
            ))}
          </div>
        )}

        {readinessRows.length > 0 && (
          <div style={{ background: '#F8F4EB', borderRadius: 12, padding: 16, border: '1px solid rgba(242,152,54,0.35)' }}>
            <p style={{ fontSize: 13, fontWeight: 700, color: '#F29836', marginBottom: 10 }}>Practical Readiness</p>
            {readinessRows.map(row => (
              <button
                key={row.key}
                type="button"
                onClick={() => onSelect(row.key, row.title)}
                style={{ display: 'block', width: '100%', textAlign: 'left', padding: '10px 12px', background: '#FFFFFF', border: '1px solid rgba(0,0,0,0.10)', borderRadius: 8, marginBottom: 8, fontSize: 13, color: '#1A1A1A', cursor: 'pointer', lineHeight: 1.4 }}
                className="hover:opacity-80 transition-opacity"
              >
                {row.title}
              </button>
            ))}
          </div>
        )}
      </div>
    </>
  )
}
