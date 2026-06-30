// Canonical area config — the single source of truth that unifies the three id
// systems (URL slug ↔ containers.domain_code ↔ LEARN_AREAS.id) plus per-area title,
// intro, Activities list, and Relevant Documents. Everything for the new /app/area/[slug]
// pages derives from here. Append-only on the slug/domainCode (persisted/routed);
// display copy and lists can change freely.

import type { DocumentType } from '@/lib/content-metadata'

export type AreaSlug =
  | 'healthcare-wishes'
  | 'deathcare'
  | 'wills-and-estates'
  | 'legacy'
  | 'personal-admin'
  | 'ritual-and-ceremony'

// An activity card in an area's Activities section.
// - 'output': produces a saved entry → Continue/Start + Export (resolved from the
//   user's entries by `activity`).
// - 'navigate': no saved output → "Go to activity →".
export type AreaActivity = {
  label: string
  href: string
  blurb: string
  kind: 'output' | 'navigate'
  activity?: string // entries.activity slug, for 'output' cards (to find the user's entry)
}

export type AreaConfig = {
  slug: AreaSlug
  domainCode: string        // containers.domain_code (stable identity)
  learnId: string           // LEARN_AREAS.id (for Learn content)
  title: string
  intro: string             // brief header intro (validated copy from the mockups)
  activities: AreaActivity[] | null   // null → no Relevant activities section renders at all
  // Per-area platform documents. The standalone "Relevant Documents" panel was removed
  // (documents now surface inline in the Planning Status panel, per readiness row, via
  // DOMAIN_STRUCTURES `relatedDocumentTypes`). This mapping is retained as canonical
  // area→document config for Phase 2 surfaces (home / Your materials). Currently unconsumed.
  documents: DocumentType[] | null
}

const VALUES_RANKING: AreaActivity = { label: 'Values Ranking', href: '/app/activities/values-ranking', blurb: 'Surface and rank what matters most to you.', kind: 'output', activity: 'values_ranking' }
const FEARS_RANKING:  AreaActivity = { label: 'Fears Ranking',  href: '/app/activities/fears-ranking',  blurb: 'Name and rank what you most want to avoid.', kind: 'output', activity: 'fears_ranking' }
const LEGACY_MAP:     AreaActivity = { label: 'Legacy Map',     href: '/app/activities/legacy-map',     blurb: 'Map the people, stories, and things you want to pass on.', kind: 'output', activity: 'legacy_map' }
const SCENARIO_NAV:   AreaActivity = { label: 'Scenario Navigator', href: '/app/activities/scenario-navigator', blurb: 'Think through how your values might apply across different medical situations.', kind: 'navigate' }
const REFLECTION:     AreaActivity = { label: 'Reflection Prompts', href: '/app/activities', blurb: 'Open-ended prompts to help you explore your thinking. Browse all prompts or focus on specific themes.', kind: 'navigate' }
const TRIVIA:         AreaActivity = { label: 'Deathcare Trivia', href: '/app/activities/trivia', blurb: 'A game to test and build your knowledge of deathcare options.', kind: 'navigate' }

export const AREAS: AreaConfig[] = [
  {
    slug: 'healthcare-wishes', domainCode: 'healthcare', learnId: 'healthcare', title: 'Healthcare Wishes',
    intro: 'Advance care planning helps prepare for a time when you may be seriously ill or unable to speak for yourself. It involves reflecting on and communicating your wishes, appointing a Substitute Decision-Maker, and documenting your preferences (legal documentation varies by province).',
    activities: [VALUES_RANKING, FEARS_RANKING, SCENARIO_NAV, REFLECTION],
    documents: ['advance_directive_supplement'], // My Care Wishes
  },
  {
    slug: 'deathcare', domainCode: 'deathcare', learnId: 'deathcare', title: 'Deathcare',
    intro: 'Deathcare planning involves decisions about how your body will be cared for after you die. This includes choosing a final resting place for your body, such as traditional burial, cremation, green burial, or alternative methods like aquamation. Without clear instructions, decisions may be made based on default practices, family assumptions, or costs rather than personal wishes.',
    activities: [VALUES_RANKING, FEARS_RANKING, TRIVIA, REFLECTION],
    documents: ['funeral_wishes'], // Wishes for My Body, Funeral & Ceremony
  },
  {
    slug: 'wills-and-estates', domainCode: 'wills_estates', learnId: 'wills', title: 'Wills & Estates',
    intro: 'A will is a legal document that outlines how your assets, debts, and belongings will be handled after your death. It names an executor, identifies beneficiaries, appoints guardians for minor children or pets, and can include provisions for charitable donations or trusts. Estate planning refers to a broader process for managing your assets and property.',
    activities: [REFLECTION],
    documents: null, // no platform document for Wills & Estates → no Relevant Documents panel
  },
  {
    slug: 'legacy', domainCode: 'legacy', learnId: 'legacy', title: 'Legacy',
    intro: 'The word "legacy" can feel like it belongs only to people with long careers, complicated estates, or their names on buildings. But legacy belongs to everyone, and can include simple things like the way you made people laugh, or a story you told that resonated with someone.',
    activities: [VALUES_RANKING, FEARS_RANKING, LEGACY_MAP, REFLECTION],
    documents: ['keepsake_inventory'], // Keepsakes Inventory
  },
  {
    slug: 'personal-admin', domainCode: 'personal_admin', learnId: 'personal-admin', title: 'Personal Admin',
    intro: "The practical details of your life — your accounts, passwords, contacts, and digital presence — rarely feel urgent until they're urgently needed. Getting this information organized is one of the most considerate things you can do for the people you love.",
    activities: null,
    documents: ['personal_admin_info', 'financial_information', 'important_contacts', 'devices_and_accounts'],
  },
  {
    slug: 'ritual-and-ceremony', domainCode: 'ritual', learnId: 'ritual', title: 'Ritual & Ceremony',
    intro: 'Rituals and ceremonies are meaningful ways to honor life, process loss, and create connection. They may draw from religious, spiritual, cultural, or secular traditions — or any combination of these that is meaningful to the dying person and their loved ones.',
    activities: [VALUES_RANKING, FEARS_RANKING, REFLECTION],
    documents: ['funeral_wishes', 'advance_directive_supplement'], // Funeral & Ceremony wishes + My Care Wishes
  },
]

export function areaBySlug(slug: string): AreaConfig | undefined {
  return AREAS.find((a) => a.slug === slug)
}

export function areaByDomainCode(code: string | null | undefined): AreaConfig | undefined {
  return code ? AREAS.find((a) => a.domainCode === code) : undefined
}
