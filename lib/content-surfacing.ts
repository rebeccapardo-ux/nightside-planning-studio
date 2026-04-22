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

import type { Note } from './notes'
import {
  type Domain,
  type SupplementaryDocQuestion,
  type Relevance,
  PROMPT_META_BY_LABEL,
  ACTIVITY_META_BY_ID,
} from './content-metadata'

export type Tier = 1 | 2 | 3

export type NoteSourceKind =
  | 'reflect_prompt'   // origin_type === 'prompt', prompt_context resolves to known prompt
  | 'activity'         // origin_type tied to a known activity (future)
  | 'notepad'          // origin_type === 'freeform' or unknown

// ---------------------------------------------------------------------------
// Source classification
// ---------------------------------------------------------------------------

export function classifyNoteSource(note: Note): NoteSourceKind {
  if (note.origin_type === 'prompt' && note.prompt_context) {
    // Verify the label actually maps to known metadata
    if (PROMPT_META_BY_LABEL[note.prompt_context]) return 'reflect_prompt'
    // Has prompt origin but label not in metadata — treat as unknown
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

  if (kind === 'reflect_prompt' && note.prompt_context) {
    const meta = PROMPT_META_BY_LABEL[note.prompt_context]
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

export function getNotedomainTier(note: Note, domain: Domain): Tier {
  const kind = classifyNoteSource(note)

  if (kind === 'notepad') return 3

  if (kind === 'reflect_prompt' && note.prompt_context) {
    const meta = PROMPT_META_BY_LABEL[note.prompt_context]
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
    case 'values_ranking':
      return {
        canAutoSurface: true,
        insertionBehavior: 'insertable',
        includeEssential: true,
        includeImportant: true,
        includeLessCentral: false,
      }
    case 'fears_ranking':
      return {
        canAutoSurface: false,  // fears must never appear without user action
        insertionBehavior: 'selectable_then_insert',
        includeEssential: true,
        includeImportant: true,
        includeLessCentral: false,
      }
    case 'legacy_map':
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

export function tieredNotesByDomain(notes: Note[], domain: Domain): TieredNotes {
  const result: TieredNotes = { tier1: [], tier2: [], tier3: [] }
  for (const note of notes) {
    const tier = getNotedomainTier(note, domain)
    if (tier === 1) result.tier1.push(note)
    else if (tier === 2) result.tier2.push(note)
    else result.tier3.push(note)
  }
  return result
}

// ---------------------------------------------------------------------------
// Domain resolution from title string
// Matches domainTitle to a Domain enum value, same heuristic used elsewhere.
// ---------------------------------------------------------------------------

export function domainFromTitle(title: string): Domain | null {
  const t = title.toLowerCase()
  if (t.includes('healthcare') || t.includes('health care')) return 'healthcare'
  if (t.includes('deathcare') || t.includes('death care')) return 'deathcare'
  if (t.includes('legacy')) return 'legacy'
  if (t.includes('wills') || t.includes('estate')) return 'wills_estates'
  if (t.includes('personal admin') || t.includes('personal_admin')) return 'personal_admin'
  return null
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
