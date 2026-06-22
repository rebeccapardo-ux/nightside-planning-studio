import { createSupabaseBrowserClient } from './supabase-browser'

export type Note = {
  id: string
  content: string
  created_at: string
  updated_at: string
  origin_type?: 'prompt' | 'freeform' | 'reflection'
  prompt_context?: string | null
  // Stable prompt identifier (REFLECT_PROMPT_META id, e.g. 'prompt_2'). Replaces
  // prompt_context as the join key; prompt_context is retained for display.
  prompt_id?: string | null
  // Voice note fields — undefined/null on all text notes
  note_mode?: 'text' | 'audio'
  audio_url?: string | null
  transcript?: string | null
  duration_seconds?: number | null
  transcription_status?: 'pending' | 'complete' | 'failed' | null
}

const NOTE_SELECT_FIELDS =
  'id, content, created_at, updated_at, origin_type, prompt_context, prompt_id, note_mode, audio_url, transcript, duration_seconds, transcription_status'

export type Container = {
  id: string
  title: string
  domain_code?: string | null
}

export async function fetchNotesByDomainId(domainId: string): Promise<Note[]> {
  const supabase = createSupabaseBrowserClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data: links } = await supabase
    .from('container_notes')
    .select('note_id')
    .eq('container_id', domainId)

  if (!links || links.length === 0) return []

  const noteIds = links.map((l) => l.note_id)

  const { data } = await supabase
    .from('notes')
    .select(NOTE_SELECT_FIELDS)
    .in('id', noteIds)
    .order('created_at', { ascending: false })

  return data ?? []
}

export async function fetchNotes(): Promise<Note[]> {
  const supabase = createSupabaseBrowserClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return []

  const { data, error } = await supabase
    .from('notes')
    .select(NOTE_SELECT_FIELDS)
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('fetchNotes error:', error.message, '| code:', error.code, '| details:', error.details, '| hint:', error.hint)
    return []
  }

  return data ?? []
}

// Creates a note that originated from a structured prompt activity.
// Also records an entry_notes link for provenance (prevents duplicate migration).
export async function createPromptNote(
  content: string,
  promptContext: string,
  entryId: string,
  promptId: string
): Promise<Note | null> {
  const trimmed = content.trim()
  if (!trimmed) return null

  const supabase = createSupabaseBrowserClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return null

  const { data, error } = await supabase
    .from('notes')
    .insert({
      user_id: user.id,
      content: trimmed,
      origin_type: 'prompt',
      prompt_context: promptContext,
      prompt_id: promptId,
    })
    .select(NOTE_SELECT_FIELDS)
    .single()

  if (error) {
    console.error('createPromptNote error:', error.message, '| code:', error.code)
    return null
  }

  // Link to the originating entry for provenance; prevents re-migration
  await supabase.from('entry_notes').insert({ entry_id: entryId, note_id: data.id })

  return data
}

export async function createNote(content: string): Promise<Note | null> {
  const trimmed = content.trim()
  if (!trimmed) return null

  const supabase = createSupabaseBrowserClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return null

  const { data, error } = await supabase
    .from('notes')
    .insert({
      user_id: user.id,
      content: trimmed,
      origin_type: 'freeform',
    })
    .select(NOTE_SELECT_FIELDS)
    .single()

  if (error) {
    console.error('createNote error:', error)
    return null
  }

  return data
}

// Activity-reflection note — the free-text reflection at the bottom of an activity
// (values-ranking, fears-ranking, legacy-map) is a NOTE, not entries.content data.
// origin_type='reflection' is technical only (provenance + migration idempotency); it
// carries NO source label in the UI. Linked to the activity entry via entry_notes so the
// page can rehydrate the noteId on reload (re-edits UPDATE instead of duplicating).
export async function createReflectionNote(content: string, entryId: string): Promise<Note | null> {
  const trimmed = content.trim()
  if (!trimmed) return null

  const supabase = createSupabaseBrowserClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data, error } = await supabase
    .from('notes')
    .insert({ user_id: user.id, content: trimmed, origin_type: 'reflection' })
    .select(NOTE_SELECT_FIELDS)
    .single()

  if (error) { console.error('createReflectionNote error:', error.message, '| code:', error.code); return null }

  // Provenance link (same pattern as createPromptNote; lets the activity rehydrate the
  // noteId on reload, and the export read the reflection back).
  await supabase.from('entry_notes').insert({ entry_id: entryId, note_id: data.id })

  return data
}

// The reflection note linked to an activity entry (or null). Used on mount to hydrate
// the saved note id + text so re-edits update the same row.
export async function fetchReflectionNote(entryId: string): Promise<Note | null> {
  const supabase = createSupabaseBrowserClient()
  const { data: links } = await supabase.from('entry_notes').select('note_id').eq('entry_id', entryId)
  const ids = (links ?? []).map((l) => l.note_id as string)
  if (ids.length === 0) return null
  const { data } = await supabase
    .from('notes')
    .select(NOTE_SELECT_FIELDS)
    .in('id', ids)
    .eq('origin_type', 'reflection')
    .limit(1)
    .maybeSingle()
  return (data as Note) ?? null
}

// Batch map of entryId -> reflection-note text for a set of activity entries.
// Reflections live in notes (origin_type='reflection'), linked via entry_notes — NOT in
// entries.content. Under the update-in-place model there is one reflection note per entry.
// Used by the wishes-doc panels to render legacy-map reflections note-first (content fallback).
export async function fetchReflectionsByEntryIds(entryIds: string[]): Promise<Record<string, string>> {
  const map: Record<string, string> = {}
  if (entryIds.length === 0) return map
  const supabase = createSupabaseBrowserClient()
  const { data: links } = await supabase.from('entry_notes').select('entry_id, note_id').in('entry_id', entryIds)
  const noteIds = (links ?? []).map((l) => l.note_id as string)
  if (noteIds.length === 0) return map
  const { data: notes } = await supabase
    .from('notes').select('id, content').in('id', noteIds).eq('origin_type', 'reflection')
  const byId = new Map((notes ?? []).map((n) => [n.id as string, n.content as string]))
  for (const l of links ?? []) {
    const t = byId.get(l.note_id as string)
    if (t) map[l.entry_id as string] = t
  }
  return map
}

export async function createVoiceNote(params: {
  audioUrl: string
  durationSeconds: number
}): Promise<Note | null> {
  const supabase = createSupabaseBrowserClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data, error } = await supabase
    .from('notes')
    .insert({
      user_id: user.id,
      content: '',
      origin_type: 'freeform',
      note_mode: 'audio',
      audio_url: params.audioUrl || null,
      duration_seconds: params.durationSeconds,
      transcription_status: 'pending',
    })
    .select(NOTE_SELECT_FIELDS)
    .single()

  if (error) {
    console.error('createVoiceNote error:', error.message)
    return null
  }
  return data
}

export async function createVoicePromptNote(params: {
  audioUrl: string
  durationSeconds: number
  promptContext: string
  promptId: string
  entryId: string
}): Promise<Note | null> {
  const supabase = createSupabaseBrowserClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data, error } = await supabase
    .from('notes')
    .insert({
      user_id: user.id,
      content: '',
      origin_type: 'prompt',
      prompt_context: params.promptContext,
      prompt_id: params.promptId,
      note_mode: 'audio',
      audio_url: params.audioUrl || null,
      duration_seconds: params.durationSeconds,
      transcription_status: 'pending',
    })
    .select(NOTE_SELECT_FIELDS)
    .single()

  if (error) {
    console.error('createVoicePromptNote error:', error.message)
    return null
  }

  await supabase.from('entry_notes').insert({ entry_id: params.entryId, note_id: data.id })
  return data
}

export async function updateNoteAudioUrl(noteId: string, audioUrl: string): Promise<boolean> {
  const supabase = createSupabaseBrowserClient()
  const { error } = await supabase.from('notes').update({ audio_url: audioUrl }).eq('id', noteId)
  if (error) { console.error('updateNoteAudioUrl error:', error.message); return false }
  return true
}

export async function deleteNote(id: string): Promise<boolean> {
  const supabase = createSupabaseBrowserClient()

  const { error } = await supabase
    .from('notes')
    .delete()
    .eq('id', id)

  if (error) {
    console.error('deleteNote error:', error.message, '| code:', error.code)
    return false
  }

  return true
}

export async function updateNote(id: string, content: string): Promise<boolean> {
  const trimmed = content.trim()
  if (!trimmed) return false

  const supabase = createSupabaseBrowserClient()

  const { error } = await supabase
    .from('notes')
    .update({ content: trimmed })
    .eq('id', id)

  if (error) {
    console.error('updateNote error:', error)
    return false
  }

  return true
}

export async function fetchContainers(): Promise<Container[]> {
  const supabase = createSupabaseBrowserClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return []

  const { data, error } = await supabase
    .from('containers')
    .select('id, title, domain_code')
    .eq('type', 'domain')
    .order('title', { ascending: true })

  if (error) {
    console.error('fetchContainers error:', error.message, '| code:', error.code)
    return []
  }

  return data ?? []
}

// Returns a map of note_id → container_ids[] for the given note IDs.
export async function fetchNoteContainerLinks(
  noteIds: string[]
): Promise<Record<string, string[]>> {
  if (noteIds.length === 0) return {}

  const supabase = createSupabaseBrowserClient()

  const { data, error } = await supabase
    .from('container_notes')
    .select('note_id, container_id')
    .in('note_id', noteIds)

  if (error) {
    console.error('fetchNoteContainerLinks error:', error.message, '| code:', error.code)
    return {}
  }

  const result: Record<string, string[]> = {}
  for (const row of data ?? []) {
    if (!result[row.note_id]) result[row.note_id] = []
    result[row.note_id].push(row.container_id)
  }
  return result
}

export async function addNoteToContainer(
  noteId: string,
  containerId: string
): Promise<boolean> {
  const supabase = createSupabaseBrowserClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return false

  const { error } = await supabase
    .from('container_notes')
    .insert({ user_id: user.id, note_id: noteId, container_id: containerId })

  if (error) {
    // 23505 = unique_violation: link already exists, treat as success
    if (error.code === '23505') return true
    console.error('addNoteToContainer error:', error.message, '| code:', error.code)
    return false
  }

  return true
}

// ---------------------------------------------------------------------------
// Entry ↔ container association (uses container_entries join table)
// ---------------------------------------------------------------------------

export type EntryRef = {
  id: string
  title: string | null
  document_type: string | null
  activity: string | null
  content: unknown
  created_at: string | null
}

export async function addEntryToContainer(entryId: string, containerId: string): Promise<boolean> {
  const supabase = createSupabaseBrowserClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return false

  const { error } = await supabase
    .from('container_entries')
    .insert({ user_id: user.id, entry_id: entryId, container_id: containerId })

  if (error) {
    if (error.code === '23505') return true // already linked
    console.error('addEntryToContainer error:', error.message, '| code:', error.code)
    return false
  }
  return true
}

export async function removeEntryFromContainer(entryId: string, containerId: string): Promise<boolean> {
  const supabase = createSupabaseBrowserClient()

  const { error } = await supabase
    .from('container_entries')
    .delete()
    .eq('entry_id', entryId)
    .eq('container_id', containerId)

  if (error) {
    console.error('removeEntryFromContainer error:', error.message, '| code:', error.code)
    return false
  }
  return true
}

export async function fetchEntryContainerLinks(entryIds: string[]): Promise<Record<string, string[]>> {
  if (entryIds.length === 0) return {}
  const supabase = createSupabaseBrowserClient()

  const { data, error } = await supabase
    .from('container_entries')
    .select('entry_id, container_id')
    .in('entry_id', entryIds)

  if (error) {
    console.error('fetchEntryContainerLinks error:', error.message, '| code:', error.code)
    return {}
  }

  const result: Record<string, string[]> = {}
  for (const row of data ?? []) {
    if (!result[row.entry_id]) result[row.entry_id] = []
    result[row.entry_id].push(row.container_id)
  }
  return result
}

export async function fetchEntriesByDomainId(domainId: string): Promise<EntryRef[]> {
  const supabase = createSupabaseBrowserClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data: links } = await supabase
    .from('container_entries')
    .select('entry_id')
    .eq('container_id', domainId)

  if (!links || links.length === 0) return []

  const entryIds = links.map((l) => l.entry_id)
  const { data } = await supabase
    .from('entries')
    .select('id, title, document_type, activity, content, created_at')
    .in('id', entryIds)
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  return data ?? []
}

export async function fetchAllUserEntries(): Promise<EntryRef[]> {
  const supabase = createSupabaseBrowserClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data, error } = await supabase
    .from('entries')
    .select('id, title, document_type, activity, content, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  if (error) return []
  return data ?? []
}

// ---------------------------------------------------------------------------

export async function removeNoteFromContainer(
  noteId: string,
  containerId: string
): Promise<boolean> {
  const supabase = createSupabaseBrowserClient()

  const { error } = await supabase
    .from('container_notes')
    .delete()
    .eq('note_id', noteId)
    .eq('container_id', containerId)

  if (error) {
    console.error('removeNoteFromContainer error:', error.message, '| code:', error.code)
    return false
  }

  return true
}

// ---------------------------------------------------------------------------
// domain_topic_notes — manual row-level note attachments
// ---------------------------------------------------------------------------

export type TopicNoteRow = { note_id: string; topic_id: string }

export async function fetchAllDomainTopicNotes(domainId: string): Promise<TopicNoteRow[]> {
  const supabase = createSupabaseBrowserClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data, error } = await supabase
    .from('domain_topic_notes')
    .select('note_id, topic_id')
    .eq('user_id', user.id)
    .eq('domain_id', domainId)

  if (error) {
    console.error('fetchAllDomainTopicNotes error:', error.message)
    return []
  }
  return data ?? []
}

export async function addDomainTopicNote(
  noteId: string,
  domainId: string,
  topicId: string
): Promise<boolean> {
  const supabase = createSupabaseBrowserClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return false

  const { error } = await supabase
    .from('domain_topic_notes')
    .insert({ user_id: user.id, note_id: noteId, domain_id: domainId, topic_id: topicId })

  if (error) {
    if (error.code === '23505') return true
    console.error('addDomainTopicNote error:', error.message)
    return false
  }
  return true
}

export async function removeDomainTopicNote(
  noteId: string,
  domainId: string,
  topicId: string
): Promise<boolean> {
  const supabase = createSupabaseBrowserClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return false

  const { error } = await supabase
    .from('domain_topic_notes')
    .delete()
    .eq('user_id', user.id)
    .eq('note_id', noteId)
    .eq('domain_id', domainId)
    .eq('topic_id', topicId)

  if (error) {
    console.error('removeDomainTopicNote error:', error.message)
    return false
  }
  return true
}

// ---------------------------------------------------------------------------
// hidden_row_notes — auto-surfaced notes suppressed from a row
// ---------------------------------------------------------------------------

export async function fetchHiddenRowNotes(domainId: string): Promise<TopicNoteRow[]> {
  const supabase = createSupabaseBrowserClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data, error } = await supabase
    .from('hidden_row_notes')
    .select('note_id, topic_id')
    .eq('user_id', user.id)
    .eq('domain_id', domainId)

  if (error) {
    console.error('fetchHiddenRowNotes error:', error.message)
    return []
  }
  return data ?? []
}

export async function hideRowNote(
  noteId: string,
  domainId: string,
  topicId: string
): Promise<boolean> {
  const supabase = createSupabaseBrowserClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return false

  const { error } = await supabase
    .from('hidden_row_notes')
    .insert({ user_id: user.id, note_id: noteId, domain_id: domainId, topic_id: topicId })

  if (error) {
    if (error.code === '23505') return true
    console.error('hideRowNote error:', error.message)
    return false
  }
  return true
}

export async function resetVoiceNote(noteId: string, durationSeconds: number): Promise<boolean> {
  const supabase = createSupabaseBrowserClient()
  const { error } = await supabase
    .from('notes')
    .update({ audio_url: null, duration_seconds: durationSeconds, content: '', transcript: null, transcription_status: 'pending' })
    .eq('id', noteId)
  if (error) { console.error('resetVoiceNote error:', error.message); return false }
  return true
}
