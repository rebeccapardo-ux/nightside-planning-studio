// ---------------------------------------------------------------------------
// CANONICAL DOMAIN STRUCTURE — single source of truth
//
// Orientation + readiness rows for all six domains. Previously duplicated across
// four files (the domain page UI, the PDF builder, and two status components),
// which had already drifted. Everything now derives from DOMAIN_STRUCTURES here.
//
// Pure data + pure helpers only — no React/Next/Node imports — so this is safe
// to import from both client components and the server-side PDF builder.
// ---------------------------------------------------------------------------

import type { Domain } from './content-metadata'
import { DOCUMENT_TYPE_META, DOCUMENT_TYPE } from './content-metadata'
import { ACTIVITY } from './content-metadata'

export type OrientationItem = {
  key: string
  title: string
  explanation: string
  helperText?: string
  relatedActivities?: string[]
  relatedDocumentTypes?: string[]
  learnHref?: string
  allowedReflectPromptIds?: string[]
}

export type ReadinessItem = {
  key: string
  title: string
  explanation: string
  relatedActivities?: string[]
  relatedDocumentTypes?: string[]
  checkboxes: string[]
  checkboxHelpers?: (string | null)[]
  staticLinks?: { href: string; label: string }[]
  // allowedReflectPromptIds is intentionally absent — Practical Readiness rows never auto-surface notes
}

export type DomainStructure = {
  orientation: OrientationItem[]
  readiness: ReadinessItem[]
}

// A flattened orientation/readiness row reference — used by status components
// that only need keys + type (not the full label/checkbox content).
export type DomainSegment = { key: string; type: 'orient' | 'ready' }

export type DomainDef = {
  // Stable per-domain identity (containers.domain_code).
  code: Domain
  // Canonical display name — used by the PDF builder when no DB container exists.
  displayName: string
  structure: DomainStructure
}

export const DOMAIN_STRUCTURES: DomainDef[] = [
  {
    code: 'healthcare',
    displayName: 'Healthcare Wishes',
    structure: {
      orientation: [
        {
          key: 'values_care_priorities',
          title: 'My values and priorities for care at end of life',
          explanation: '',
          relatedActivities: [ACTIVITY.VALUES_RANKING, ACTIVITY.FEARS_RANKING],
          learnHref: '/app/learn/healthcare',
          allowedReflectPromptIds: [
            'prompt_2', 'prompt_1', 'prompt_5', 'prompt_20', 'prompt_19',
            'prompt_25', 'prompt_26', 'prompt_22', 'prompt_30',
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
          allowedReflectPromptIds: [
            'prompt_6',
          ],
        },
      ],
      readiness: [
        {
          key: 'who_will_decide',
          title: 'Who will make decisions for me',
          explanation: '',
          checkboxes: [
            'I have identified a substitute decision-maker for my care',
            'My substitute decision-maker has agreed to take on this role',
            'I have legally documented my decision-maker',
          ],
        },
        {
          key: 'wishes_clear_shared',
          title: 'My wishes are clear and shared',
          explanation: '',
          staticLinks: [{ href: DOCUMENT_TYPE_META.advance_directive_supplement.href, label: DOCUMENT_TYPE_META.advance_directive_supplement.label }],
          checkboxes: [
            'I have communicated my wishes to my decision-maker',
            'I have formally documented my wishes',
          ],
          checkboxHelpers: [
            null,
            'This may include an advance directive or equivalent document in your province. See the learn section for guidance.',
          ],
        },
      ],
    },
  },
  {
    code: 'deathcare',
    displayName: 'Deathcare',
    structure: {
      orientation: [
        {
          key: 'final_resting_place_wishes',
          title: 'Reflect on my wishes for my body\'s final resting place',
          explanation: '',
          learnHref: '/app/learn/deathcare',
          allowedReflectPromptIds: [
            'prompt_9', 'prompt_41',
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
          staticLinks: [{ href: DOCUMENT_TYPE_META.funeral_wishes.href, label: DOCUMENT_TYPE_META.funeral_wishes.shortLabel ?? DOCUMENT_TYPE_META.funeral_wishes.label }],
        },
      ],
    },
  },
  {
    code: 'wills_estates',
    displayName: 'Wills & Estates',
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
          relatedDocumentTypes: [DOCUMENT_TYPE.IMPORTANT_CONTACTS],
          learnHref: '/app/learn/wills',
        },
        {
          key: 'asset_wishes',
          title: 'Reflect on wishes for my assets',
          explanation: '',
          relatedDocumentTypes: [DOCUMENT_TYPE.FINANCIAL_INFORMATION],
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
          staticLinks: [{ href: DOCUMENT_TYPE_META.keepsake_inventory.href, label: DOCUMENT_TYPE_META.keepsake_inventory.label }],
          checkboxes: ['I have documented what should happen to items that matter to me', 'I have shared these wishes with people who may need to act'],
        },
      ],
    },
  },
  {
    code: 'ritual',
    displayName: 'Ritual & Ceremony',
    structure: {
      orientation: [
        {
          key: 'meaningful_rituals',
          title: 'Reflect on rituals or ceremonies that are meaningful to me',
          explanation: '',
          learnHref: '/app/learn/ritual',
          allowedReflectPromptIds: [
            'prompt_40', 'prompt_7',
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
          staticLinks: [{ href: DOCUMENT_TYPE_META.funeral_wishes.href, label: DOCUMENT_TYPE_META.funeral_wishes.shortLabel ?? DOCUMENT_TYPE_META.funeral_wishes.label }],
        },
      ],
    },
  },
  {
    code: 'legacy',
    displayName: 'Legacy',
    structure: {
      orientation: [
        {
          key: 'life_story_shaped',
          title: 'Reflect on what I am leaving behind',
          explanation: '',
          relatedActivities: [ACTIVITY.LEGACY_MAP],
          learnHref: '/app/learn/legacy',
          allowedReflectPromptIds: [
            'prompt_10', 'prompt_12', 'prompt_36', 'prompt_38',
            'prompt_39', 'prompt_42', 'prompt_43',
          ],
        },
        {
          key: 'how_remembered',
          title: 'Consider how I want to be remembered',
          explanation: '',
          learnHref: '/app/learn/legacy',
        },
        {
          key: 'relationships_impact',
          title: 'Reflect on meaningful relationships and personal impact',
          explanation: '',
          learnHref: '/app/learn/legacy',
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
    code: 'personal_admin',
    displayName: 'Personal Admin',
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
          staticLinks: [{ href: DOCUMENT_TYPE_META.personal_admin_info.href, label: DOCUMENT_TYPE_META.personal_admin_info.label }],
        },
        {
          key: 'important_contacts',
          title: 'Important contacts',
          explanation: '',
          checkboxes: ['I have recorded the people someone may need to contact'],
          staticLinks: [{ href: DOCUMENT_TYPE_META.important_contacts.href, label: DOCUMENT_TYPE_META.important_contacts.label }],
        },
        {
          key: 'financial_information',
          title: 'Financial information',
          explanation: '',
          checkboxes: ['I have documented my financial accounts and insurance'],
          staticLinks: [{ href: DOCUMENT_TYPE_META.financial_information.href, label: DOCUMENT_TYPE_META.financial_information.label }],
        },
        {
          key: 'devices_and_accounts',
          title: 'Devices and accounts',
          explanation: '',
          checkboxes: ['I have documented my devices and account access information'],
          staticLinks: [{ href: DOCUMENT_TYPE_META.devices_and_accounts.href, label: DOCUMENT_TYPE_META.devices_and_accounts.label }],
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

// Resolve a stable domain_code to its structure.
export function getDomainStructureByCode(code: string | null | undefined): DomainStructure | null {
  if (!code) return null
  return DOMAIN_STRUCTURES.find(def => def.code === code)?.structure ?? null
}

// Resolve a stable domain_code to its canonical display name. Documented fallback
// for the DB container title (`containers.title`) when that's missing — e.g. the
// PDF builder, and the domain tour's first-impression copy.
export function getDomainDisplayNameByCode(code: string | null | undefined): string | null {
  if (!code) return null
  return DOMAIN_STRUCTURES.find(def => def.code === code)?.displayName ?? null
}

// Flattened {key, type} segments resolved by stable domain_code. For status
// components that only need keys + type.
export function getDomainSegmentsByCode(code: string | null | undefined): DomainSegment[] {
  return segmentsOf(getDomainStructureByCode(code))
}

function segmentsOf(structure: DomainStructure | null): DomainSegment[] {
  if (!structure) return []
  return [
    ...structure.orientation.map((o): DomainSegment => ({ key: o.key, type: 'orient' })),
    ...structure.readiness.map((r): DomainSegment => ({ key: r.key, type: 'ready' })),
  ]
}

// Deduped union of every orientation row's allowedReflectPromptIds for a domain.
// Pass 2 surfaces prompt notes PER-DOMAIN (in the Your Thoughts stream) rather than
// per-row: a prompt note belongs to a domain if its prompt_id is in this set. Pure
// structure derivation — no component state. Readiness rows carry no prompt ids.
export function getDomainPromptIds(code: string | null | undefined): string[] {
  const structure = getDomainStructureByCode(code)
  if (!structure) return []
  const ids = new Set<string>()
  for (const row of structure.orientation) {
    for (const id of row.allowedReflectPromptIds ?? []) ids.add(id)
  }
  return [...ids]
}
