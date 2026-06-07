// ---------------------------------------------------------------------------
// NIGHTSIDE — CONTENT SURFACING SYSTEM
//
// INTERNAL ONLY. Not exposed to users.
//
// This module determines how and where content is surfaced across the platform.
// It does NOT modify or store anything — pure query and classification logic.
//
// Tier model:
//   Tier 1 — strong semantic match, shown prominently
//   Tier 2 — relevant but broader/weaker, visible but not dominant
//   Tier 3 — everything else, accessible via "Browse all notes"
//
// Source confidence (affects how tiers are assigned):
//   Reflect prompt notes → highest confidence (precise prompt match)
//   Activity notes       → high confidence (activity-level match)
//   Notepad notes        → no reliable context, NEVER auto-surfaced
// ---------------------------------------------------------------------------

import { createSupabaseBrowserClient } from './supabase-browser'
import type { Note } from './notes'
import { type Domain, type SupplementaryDocQuestion, type SupplementaryDocRelevance, type Relevance, type ReflectPromptMeta, PROMPT_META_BY_LABEL, PROMPT_META_BY_ID, ACTIVITY_META_BY_ID, ACTIVITY } from './content-metadata'

export type Tier = 1 | 2 | 3

export type NoteSourceKind =
  | 'reflect_prompt'   // origin_type === 'prompt', resolves to a known prompt
  | 'activity'         // origin_type tied to a known activity (future)
  | 'notepad'          // origin_type === 'freeform' or unknown

// ---------------------------------------------------------------------------
// Prompt metadata resolution
//
// Resolve a prompt note to its metadata by the stable prompt_id first; fall back
// to the legacy label (prompt_context) only for in-memory notes that don't yet
// carry prompt_id (e.g. selects/DTOs not migrated to fetch it). The database is
// fully backfilled, so the id path is the live one; the label fallback is
// transitional and can be removed once every note source selects prompt_id.
// ---------------------------------------------------------------------------

function metaForNote(note: Note): ReflectPromptMeta | undefined {
  if (note.prompt_id) {
    const byId = PROMPT_META_BY_ID[note.prompt_id]
    if (byId) return byId
  }
  if (note.prompt_context) return PROMPT_META_BY_LABEL[note.prompt_context]
  return undefined
}

// ---------------------------------------------------------------------------
// Source classification
// ---------------------------------------------------------------------------

export function classifyNoteSource(note: Note): NoteSourceKind {
  if (note.origin_type === 'prompt') {
    // Verify it resolves to known metadata (by id, then label)
    if (metaForNote(note)) return 'reflect_prompt'
    // Has prompt origin but doesn't resolve — treat as unknown
    return 'notepad'
  }
  // freeform or no origin_type
  return 'notepad'
}

// ---------------------------------------------------------------------------
// Tier resolution for supplementary document questions
// ---------------------------------------------------------------------------

export function getNoteSupDocTier(
  note: Note,
  question: SupplementaryDocQuestion
): Tier {
  const kind = classifyNoteSource(note)

  // Notepad notes are never auto-surfaced — always Tier 3
  if (kind === 'notepad') return 3

  if (kind === 'reflect_prompt') {
    const meta = metaForNote(note)
    if (!meta?.supplementaryDocumentRelevance) return 3
    const relevance: Relevance | undefined = meta.supplementaryDocumentRelevance[question]
    if (relevance === 'primary') return 1
    if (relevance === 'secondary') return 2
    return 3
  }

  return 3
}

// ---------------------------------------------------------------------------
// Tier resolution for domain pages
// ---------------------------------------------------------------------------

// linkedNoteIds: optional pre-fetched set of note IDs known to be linked to
// the target domain container via container_notes. When provided, freeform
// notes in the set return Tier 1 instead of falling through to Tier 3.
export function getNotedomainTier(
  note: Note,
  domain: Domain,
  linkedNoteIds?: Set<string>
): Tier {
  const kind = classifyNoteSource(note)

  if (kind === 'notepad') {
    // Freeform notes surface as Tier 1 if they're confirmed linked to this domain
    return linkedNoteIds?.has(note.id) ? 1 : 3
  }

  if (kind === 'reflect_prompt') {
    const meta = metaForNote(note)
    if (!meta) return 3
    if (meta.domainRelevance.includes(domain)) return 1
    return 3
  }

  return 3
}

// ---------------------------------------------------------------------------
// Working output behavior
// ---------------------------------------------------------------------------

export type WorkingOutputBehavior = {
  canAutoSurface: boolean
  insertionBehavior: 'insertable' | 'selectable_then_insert' | 'view_only'
  includeEssential: boolean
  includeImportant: boolean
  includeLessCentral: boolean
}

export function getWorkingOutputBehavior(activityId: string): WorkingOutputBehavior {
  switch (activityId) {
    case ACTIVITY.VALUES_RANKING:
      return {
        canAutoSurface: true,
        insertionBehavior: 'insertable',
        includeEssential: true,
        includeImportant: true,
        includeLessCentral: false,
      }
    case ACTIVITY.FEARS_RANKING:
      return {
        canAutoSurface: false,  // fears must never appear without user action
        insertionBehavior: 'selectable_then_insert',
        includeEssential: true,
        includeImportant: true,
        includeLessCentral: false,
      }
    case ACTIVITY.LEGACY_MAP:
      return {
        canAutoSurface: false,
        insertionBehavior: 'view_only',
        includeEssential: false,
        includeImportant: false,
        includeLessCentral: false,
      }
    default:
      return {
        canAutoSurface: false,
        insertionBehavior: 'selectable_then_insert',
        includeEssential: false,
        includeImportant: false,
        includeLessCentral: false,
      }
  }
}

// ---------------------------------------------------------------------------
// Inserted-state derivation (wishes docs Relevant Materials panels)
//
// The single source of truth for whether a material is "inserted into this
// question" is the question's own response text — NOT session state. Inserts
// (insertIntoCurrent) append the item text as a blank-line-delimited block, so we
// detect an insert by matching whole trimmed blocks (a contiguous run of them for
// multi-paragraph items like notes / legacy reflections), never a loose substring
// (which would false-positive on overlapping values like "Independence" vs
// "Financial independence"). Deriving from the field means editing the response to
// delete the text clears the badge automatically, and re-inserting the same item is
// naturally prevented — across both wishes documents, with no state to manage.
// ---------------------------------------------------------------------------

// Whether a material has any supplementaryDocumentRelevance tag for a question/section
// belonging to a given document. `SupplementaryDocQuestion` spans both docs' namespaces
// (q1–q6 = advance-directive, fw_s1–fw_s5 = funeral-wishes) and a material can carry
// keys from both, so callers pass THIS document's question set. Used to decide whether a
// neverAutoSuggest material has a document-level signal of appropriateness — if so it
// surfaces normally in that doc (tier by tag, tier-3 elsewhere, shown in flat-view);
// with no tag for the doc it stays blocked there.
export function hasAnySupDocTag(
  relevance: SupplementaryDocRelevance | undefined,
  questions: readonly SupplementaryDocQuestion[],
): boolean {
  if (!relevance) return false
  return questions.some((q) => relevance[q] !== undefined)
}

export function isInsertedIntoResponse(responseText: string, itemText: string): boolean {
  const target = itemText.trim()
  if (!target) return false
  const respBlocks = responseText.split(/\n{2,}/).map((b) => b.trim()).filter(Boolean)
  const targetBlocks = target.split(/\n{2,}/).map((b) => b.trim()).filter(Boolean)
  if (targetBlocks.length === 0) return false
  for (let i = 0; i + targetBlocks.length <= respBlocks.length; i++) {
    let match = true
    for (let j = 0; j < targetBlocks.length; j++) {
      if (respBlocks[i + j] !== targetBlocks[j]) { match = false; break }
    }
    if (match) return true
  }
  return false
}

// ---------------------------------------------------------------------------
// Batch classification — sorts a note list into tiers for a given context
// ---------------------------------------------------------------------------

export type TieredNotes = {
  tier1: Note[]
  tier2: Note[]
  tier3: Note[]
}

export function tieredNotesBySupDocQuestion(
  notes: Note[],
  question: SupplementaryDocQuestion
): TieredNotes {
  const result: TieredNotes = { tier1: [], tier2: [], tier3: [] }
  for (const note of notes) {
    const tier = getNoteSupDocTier(note, question)
    if (tier === 1) result.tier1.push(note)
    else if (tier === 2) result.tier2.push(note)
    else result.tier3.push(note)
  }
  return result
}

export async function tieredNotesByDomain(notes: Note[], domain: Domain): Promise<TieredNotes> {
  const result: TieredNotes = { tier1: [], tier2: [], tier3: [] }

  // Batch-fetch container links for all freeform notes in one query
  const freeformIds = notes
    .filter((n) => classifyNoteSource(n) === 'notepad')
    .map((n) => n.id)

  const linkedNoteIds = new Set<string>()

  if (freeformIds.length > 0) {
    const supabase = createSupabaseBrowserClient()
    const { data } = await supabase
      .from('container_notes')
      .select('note_id, containers(title, type, domain_code)')
      .in('note_id', freeformIds)

    for (const row of data ?? []) {
      const container = Array.isArray(row.containers) ? row.containers[0] : row.containers
      const c = container as { type: string; domain_code: string | null } | null
      if (c && c.type === 'domain' && c.domain_code === domain) {
        linkedNoteIds.add(row.note_id)
      }
    }
  }

  for (const note of notes) {
    const tier = getNotedomainTier(note, domain, linkedNoteIds)
    if (tier === 1) result.tier1.push(note)
    else if (tier === 2) result.tier2.push(note)
    else result.tier3.push(note)
  }

  return result
}

// ---------------------------------------------------------------------------
// Fragment field support
//
// Returns whether a given reflect prompt note is eligible as a fragment in
// a given domain context. Fragments require:
//   - reflect_prompt source kind (not notepad)
//   - domain relevance match
//   - not a fears ranking output (handled separately in FragmentField)
// ---------------------------------------------------------------------------

export function isFragmentEligible(note: Note, domain: Domain): boolean {
  const kind = classifyNoteSource(note)
  if (kind !== 'reflect_prompt') return false
  return getNotedomainTier(note, domain) === 1
}
