// ---------------------------------------------------------------------------
// NIGHTSIDE — CONTENT RELEVANCE METADATA
//
// INTERNAL ONLY. Not exposed to users.
//
// This file defines static metadata for:
//   - All reflect prompts (what domains + doc questions they're relevant to)
//   - All activities (same relevance model)
//
// Used by lib/content-surfacing.ts to determine tier placement when resurfacing
// content in the Advance Directive Supplementary Document, domain pages, and
// the fragment field.
// ---------------------------------------------------------------------------

export type Domain =
  | 'healthcare'
  | 'deathcare'
  | 'legacy'
  | 'wills_estates'
  | 'personal_admin'

// The six fields in the Advance Directive Supplementary Document:
//   q1 = "My perfect death would involve:"           (field: perfectDeath)
//   q2 = "At the end of my life, this is what matters most:" (field: whatMatters)
//   q3 = "My most important personal values:"        (field: values)
//   q4 = "What would make prolonging life unacceptable for me:" (field: unacceptable)
//   q5 = "When I think about death, this is what I worry about:" (field: worries)
//   q6 = "What I want my caregiver/care team to know:" (field: caregiver)
export type SupplementaryDocQuestion = 'q1' | 'q2' | 'q3' | 'q4' | 'q5' | 'q6'

export type Relevance = 'primary' | 'secondary'

export type SupplementaryDocRelevance = Partial<Record<SupplementaryDocQuestion, Relevance>>

export type InternalTag =
  | 'values'
  | 'fears'
  | 'care_preferences'
  | 'decision_making'
  | 'relationships'
  | 'identity_life_story'
  | 'environment'
  | 'assets'

export type SupplementaryDocQuestionMeta = {
  id: SupplementaryDocQuestion
  text: string
  primaryTag: InternalTag
  secondaryTags?: InternalTag[]
}

export type ReflectPromptMeta = {
  id: string
  // The exact label stored in notes.prompt_context — used for lookup
  label: string
  domainRelevance: Domain[]
  supplementaryDocumentRelevance?: SupplementaryDocRelevance
  primaryTag?: InternalTag
  secondaryTags?: InternalTag[]
}

export type ActivityMeta = {
  id: string
  domainRelevance: Domain[]
  supplementaryDocumentRelevance?: SupplementaryDocRelevance
  // Controls what the UI is allowed to do with content from this activity
  insertionBehavior: 'insertable' | 'selectable_then_insert' | 'view_only'
  // If true, never auto-surface — only accessible via "Browse all"
  neverAutoSuggest?: boolean
}

// ---------------------------------------------------------------------------
// REFLECT PROMPT METADATA
// ---------------------------------------------------------------------------

export const REFLECT_PROMPT_META: ReflectPromptMeta[] = [
  {
    id: 'prompt_1',
    label: 'What matters most to you right now?',
    domainRelevance: ['healthcare', 'deathcare', 'legacy', 'wills_estates', 'personal_admin'],
    supplementaryDocumentRelevance: { q2: 'primary', q3: 'secondary' },
    primaryTag: 'values',
  },
  {
    id: 'prompt_2',
    label: 'What would you want someone making decisions for you to understand?',
    domainRelevance: ['healthcare', 'personal_admin'],
    supplementaryDocumentRelevance: { q2: 'primary', q3: 'secondary' },
  },
  {
    id: 'prompt_3',
    label: 'What feels unresolved or unclear?',
    domainRelevance: ['healthcare', 'legacy', 'personal_admin'],
    supplementaryDocumentRelevance: { q5: 'secondary' },
  },
  {
    id: 'prompt_4',
    label: 'What was your earliest experience with death? What do you remember about it?',
    domainRelevance: ['deathcare', 'legacy'],
  },
  {
    id: 'prompt_5',
    label: 'If you could choose the setting for your final moments, where would you be and who would be with you?',
    domainRelevance: ['healthcare', 'deathcare'],
    supplementaryDocumentRelevance: { q1: 'primary', q6: 'secondary' },
  },
  {
    id: 'prompt_6',
    label: 'If you were unable to make decisions for yourself, who would you want to make those decisions, and why?',
    domainRelevance: ['healthcare', 'personal_admin'],
    supplementaryDocumentRelevance: { q2: 'primary' },
  },
  {
    id: 'prompt_7',
    label: 'What are a few of your favorite rituals or special traditions?',
    domainRelevance: ['deathcare', 'legacy'],
  },
  {
    id: 'prompt_8',
    label: 'What do you believe happens when we die? How does this influence your relationship to death?',
    domainRelevance: ['deathcare', 'legacy', 'healthcare'],
  },
  {
    id: 'prompt_9',
    label: 'How would you want your body to be handled after death, and why?',
    domainRelevance: ['deathcare'],
  },
  {
    id: 'prompt_10',
    label: 'If you could leave behind a time capsule for future generations of your family, what 3 items would you include and why?',
    domainRelevance: ['legacy'],
  },
  {
    id: 'prompt_11',
    label: 'Have you ever witnessed someone have a "good death"? What made it good?',
    domainRelevance: ['deathcare', 'healthcare'],
    supplementaryDocumentRelevance: { q1: 'secondary' },
  },
  {
    id: 'prompt_12',
    label: 'If you could write your own obituary, what key elements would you include?',
    domainRelevance: ['deathcare', 'legacy'],
  },
  {
    id: 'prompt_13',
    label: "Is there anyone you haven't spoken to in a long time that you would want to talk to before you died?",
    domainRelevance: ['legacy', 'personal_admin'],
  },
  {
    id: 'prompt_14',
    label: 'What is your favorite routine or habit?',
    domainRelevance: ['healthcare', 'personal_admin'],
    supplementaryDocumentRelevance: { q6: 'secondary' },
  },
  {
    id: 'prompt_15',
    label: "What is one goal or dream you've been putting off that you would regret not pursuing if you died tomorrow?",
    domainRelevance: ['legacy'],
  },
  {
    id: 'prompt_16',
    label: "What's one book, movie, or piece of art that has deeply influenced how you think about life or death?",
    domainRelevance: ['legacy', 'deathcare'],
    primaryTag: 'identity_life_story',
    secondaryTags: ['values'],
  },
  {
    id: 'prompt_17',
    label: "What's one thing you've been holding back from doing or saying that would bring you peace if you acted on it?",
    domainRelevance: ['legacy', 'healthcare'],
    primaryTag: 'relationships',
    secondaryTags: ['values'],
  },
  {
    id: 'prompt_18',
    label: 'If you found out you had a few months left, what would you change about your life?',
    domainRelevance: ['healthcare', 'deathcare', 'legacy'],
    supplementaryDocumentRelevance: { q1: 'secondary', q4: 'secondary' },
    primaryTag: 'values',
    secondaryTags: ['identity_life_story'],
  },
  {
    id: 'prompt_19',
    label: 'If you needed help going to the bathroom or bathing, who would you feel most comfortable asking?',
    domainRelevance: ['healthcare'],
    supplementaryDocumentRelevance: { q6: 'primary' },
    primaryTag: 'care_preferences',
    secondaryTags: ['relationships'],
  },
  {
    id: 'prompt_20',
    label: 'What do you worry most about when thinking about your future health and care?',
    domainRelevance: ['healthcare'],
    supplementaryDocumentRelevance: { q5: 'primary' },
    primaryTag: 'fears',
    secondaryTags: ['care_preferences'],
  },
  {
    id: 'prompt_21',
    label: 'Who do you go to first for advice?',
    domainRelevance: ['healthcare', 'personal_admin'],
    supplementaryDocumentRelevance: { q6: 'secondary' },
    primaryTag: 'relationships',
    secondaryTags: ['decision_making'],
  },
  {
    id: 'prompt_22',
    label: 'What does a good day look like for you?',
    domainRelevance: ['healthcare'],
    supplementaryDocumentRelevance: { q1: 'primary', q6: 'secondary' },
    primaryTag: 'values',
    secondaryTags: ['environment'],
  },
  {
    id: 'prompt_23',
    label: 'What situations do you find stressful or difficult?',
    domainRelevance: ['healthcare'],
    supplementaryDocumentRelevance: { q5: 'secondary' },
    primaryTag: 'care_preferences',
  },
  {
    id: 'prompt_24',
    label: "Reflecting on challenges you've had in the past, what has brought you strength and comfort?",
    domainRelevance: ['healthcare'],
    supplementaryDocumentRelevance: { q3: 'secondary' },
    primaryTag: 'identity_life_story',
  },
  {
    id: 'prompt_25',
    label: 'Fill in the blank: I want to live in my body as long as…',
    domainRelevance: ['healthcare'],
    supplementaryDocumentRelevance: { q4: 'primary' },
    primaryTag: 'care_preferences',
    secondaryTags: ['values'],
  },
  {
    id: 'prompt_26',
    label: 'What does quality of life mean to you?',
    domainRelevance: ['healthcare'],
    supplementaryDocumentRelevance: { q2: 'primary', q4: 'primary' },
    primaryTag: 'values',
    secondaryTags: ['care_preferences', 'environment'],
  },
  {
    id: 'prompt_27',
    label: 'Is there anything you would want to be forgiven for before you die?',
    domainRelevance: ['legacy', 'deathcare'],
    primaryTag: 'relationships',
    secondaryTags: ['identity_life_story'],
  },
  {
    id: 'prompt_28',
    label: 'Is there anyone or anything you would want to forgive before you die?',
    domainRelevance: ['legacy', 'deathcare'],
    primaryTag: 'relationships',
    secondaryTags: ['identity_life_story'],
  },
  {
    id: 'prompt_29',
    label: 'If you had one year to live, what would you give yourself permission to do?',
    domainRelevance: ['legacy', 'healthcare'],
    primaryTag: 'values',
    secondaryTags: ['identity_life_story'],
  },
  {
    id: 'prompt_30',
    label: 'If you could control one aspect of your death, what would it be?',
    domainRelevance: ['deathcare', 'healthcare'],
    supplementaryDocumentRelevance: { q1: 'secondary' },
    primaryTag: 'care_preferences',
    secondaryTags: ['environment'],
  },
  {
    id: 'prompt_31',
    label: 'Who knows the best stories about you?',
    domainRelevance: ['legacy'],
    primaryTag: 'identity_life_story',
    secondaryTags: ['relationships'],
  },
  {
    id: 'prompt_32',
    label: 'Who do you trust with your secrets?',
    domainRelevance: ['healthcare', 'personal_admin'],
    supplementaryDocumentRelevance: { q2: 'secondary' },
    primaryTag: 'relationships',
  },
  {
    id: 'prompt_33',
    label: 'What were your childhood experiences of funerals or memorials? What impressions did they leave on you?',
    domainRelevance: ['deathcare'],
    primaryTag: 'identity_life_story',
  },
  {
    id: 'prompt_34',
    label: 'What aspect of death or dying have you struggled the most to accept or understand?',
    domainRelevance: ['deathcare', 'healthcare'],
    supplementaryDocumentRelevance: { q5: 'secondary' },
    primaryTag: 'identity_life_story',
    secondaryTags: ['fears'],
  },
  {
    id: 'prompt_35',
    label: 'What are three things that bring you the most joy in life?',
    domainRelevance: ['legacy', 'healthcare'],
    supplementaryDocumentRelevance: { q3: 'secondary' },
    primaryTag: 'values',
  },
  {
    id: 'prompt_36',
    label: "Think of a mentor or role model who has passed. What's the most valuable lesson they left you with?",
    domainRelevance: ['legacy'],
    primaryTag: 'identity_life_story',
    secondaryTags: ['values'],
  },
  {
    id: 'prompt_37',
    label: 'If you could relive one moment in your life, not to change it but to experience it again, what moment would you choose?',
    domainRelevance: ['legacy'],
  },
  {
    id: 'prompt_38',
    label: "If you had the chance to write a letter to your younger self about life's most important lessons, what would you include?",
    domainRelevance: ['legacy'],
  },
  {
    id: 'prompt_39',
    label: "What's one thing you hope people will always remember about you, no matter how much time has passed?",
    domainRelevance: ['legacy', 'deathcare'],
  },
  {
    id: 'prompt_40',
    label: 'What rituals or ceremonies—personal, cultural, or religious—are meaningful to you?',
    domainRelevance: ['deathcare', 'legacy', 'healthcare'],
    supplementaryDocumentRelevance: { q1: 'secondary' },
    primaryTag: 'environment',
    secondaryTags: ['identity_life_story', 'values'],
  },
  {
    id: 'prompt_41',
    label: 'If you could choose one personal item to be included in your final resting place, what would it be?',
    domainRelevance: ['deathcare'],
  },
  {
    id: 'prompt_42',
    label: 'If you could be remembered for one specific contribution to your community, family, or loved ones, what would it be?',
    domainRelevance: ['legacy'],
  },
  {
    id: 'prompt_43',
    label: "You have the opportunity to donate to one cause in your will. What's the focus of your legacy gift?",
    domainRelevance: ['wills_estates', 'legacy'],
  },
]

// Fast lookup: prompt label → metadata
export const PROMPT_META_BY_LABEL: Record<string, ReflectPromptMeta> =
  Object.fromEntries(REFLECT_PROMPT_META.map((p) => [p.label, p]))

// ---------------------------------------------------------------------------
// ACTIVITY METADATA
// ---------------------------------------------------------------------------

export const ACTIVITY_META: ActivityMeta[] = [
  {
    id: 'values_ranking',
    domainRelevance: ['healthcare', 'deathcare', 'legacy', 'wills_estates', 'personal_admin'],
    supplementaryDocumentRelevance: { q3: 'primary', q2: 'secondary' },
    insertionBehavior: 'insertable',
  },
  {
    id: 'fears_ranking',
    domainRelevance: ['healthcare', 'deathcare'],
    supplementaryDocumentRelevance: { q5: 'primary' },
    insertionBehavior: 'selectable_then_insert',
    // Fears must never appear in ambient auto-suggest contexts
    neverAutoSuggest: true,
  },
  {
    id: 'legacy_map',
    domainRelevance: ['legacy', 'deathcare'],
    insertionBehavior: 'view_only',
  },
  {
    id: 'scenario_navigator',
    domainRelevance: ['healthcare', 'deathcare'],
    supplementaryDocumentRelevance: { q1: 'secondary', q2: 'secondary', q4: 'secondary' },
    insertionBehavior: 'selectable_then_insert',
  },
  {
    id: 'reflection_prompts',
    domainRelevance: ['healthcare', 'deathcare', 'legacy', 'wills_estates', 'personal_admin'],
    // Reflection prompt notes are handled via REFLECT_PROMPT_META per-prompt.
    // This entry covers the activity-level fallback for notes whose specific
    // prompt cannot be resolved (e.g. prompt label changed or unknown).
    insertionBehavior: 'insertable',
  },
]

// Fast lookup: activity id → metadata
export const ACTIVITY_META_BY_ID: Record<string, ActivityMeta> =
  Object.fromEntries(ACTIVITY_META.map((a) => [a.id, a]))

// ---------------------------------------------------------------------------
// ADVANCE DIRECTIVE SUPPLEMENTARY DOCUMENT — QUESTION TAGS
// ---------------------------------------------------------------------------

export const SUPPLEMENTARY_DOC_QUESTION_META: SupplementaryDocQuestionMeta[] = [
  {
    id: 'q1',
    text: 'My perfect death would involve:',
    primaryTag: 'values',
    secondaryTags: ['environment', 'relationships'],
  },
  {
    id: 'q2',
    text: 'At the end of my life, this is what matters most:',
    primaryTag: 'values',
    secondaryTags: ['relationships'],
  },
  {
    id: 'q3',
    text: 'My most important personal values:',
    primaryTag: 'values',
  },
  {
    id: 'q4',
    text: 'What would make prolonging life unacceptable for me:',
    primaryTag: 'care_preferences',
    secondaryTags: ['values', 'fears'],
  },
  {
    id: 'q5',
    text: 'When I think about death, this is what I worry about:',
    primaryTag: 'fears',
  },
  {
    id: 'q6',
    text: 'What I want my caregiver/care team to know:',
    primaryTag: 'care_preferences',
    secondaryTags: ['decision_making', 'values'],
  },
]
