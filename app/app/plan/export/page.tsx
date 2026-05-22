'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createSupabaseBrowserClient } from '@/lib/supabase-browser'
import type { PDFData, PDFContactEntry } from '../../entries/[id]/export/pdfTypes'
import type { PlanKeyDetail, PlanDomainStatus, PlanCheckboxItem, PlanMaterial, PlanPDFProps } from './PlanPDFDocument'

const hv = "'Helvetica Neue', Helvetica, Arial, sans-serif"
const apf = "'Apfel Grotezk', sans-serif"

// ---------------------------------------------------------------------------
// Domain segment configs (from DomainStateCard)
// ---------------------------------------------------------------------------

type SegmentDef = { key: string; type: 'orient' | 'ready'; label: string; checkboxes?: string[] }

const DOMAIN_SEGMENT_CONFIGS: { match: string; displayName: string; segments: SegmentDef[] }[] = [
  { match: 'healthcare', displayName: 'Healthcare Wishes', segments: [
    { key: 'values_care_priorities',    type: 'orient', label: 'My values and priorities for care at end of life' },
    { key: 'decision_making_framework', type: 'orient', label: 'Understand how substitute decision-making for care works in my province' },
    { key: 'who_would_speak',           type: 'orient', label: 'Consider who I would want to make decisions for me if I were not able to' },
    { key: 'who_will_decide',           type: 'ready',  label: 'Who will make decisions for me', checkboxes: [
      'I have identified a substitute decision maker for my care',
      'They have agreed to take on this role',
      'I have legally documented my decision-maker',
    ]},
    { key: 'wishes_clear_shared',       type: 'ready',  label: 'My wishes are clear and shared', checkboxes: [
      'I have communicated my wishes to my decision maker',
      'I have formally documented my wishes',
    ]},
  ]},
  { match: 'deathcare', displayName: 'Deathcare', segments: [
    { key: 'final_resting_place_wishes', type: 'orient', label: "Reflect on my wishes for my body's final resting place" },
    { key: 'legal_options_province',     type: 'orient', label: 'Understand the legal options in my province' },
    { key: 'final_resting_place_wishes', type: 'ready',  label: 'Final resting place wishes', checkboxes: [
      'I have documented what I want to happen with my body after my death',
      'I have shared these wishes with people in my life',
      "If applicable, I have registered with my province's organ and tissue donation registry",
    ]},
  ]},
  { match: 'will', displayName: 'Wills & Estates', segments: [
    { key: 'legal_will_requirements',    type: 'orient', label: 'Understand the requirements for a legal will in my province' },
    { key: 'executor_choice',            type: 'orient', label: 'Consider who I want to name as executor' },
    { key: 'asset_wishes',               type: 'orient', label: 'Reflect on wishes for my assets' },
    { key: 'care_children_pets',         type: 'orient', label: 'Care of children or pets' },
    { key: 'additional_estate_planning', type: 'orient', label: 'Consider whether additional estate planning may apply to my situation' },
    { key: 'legal_will_in_place',        type: 'ready',  label: 'Legal will', checkboxes: [
      'I have a valid, up-to-date legal will',
    ]},
    { key: 'other_estate_planning',      type: 'ready',  label: 'Other estate planning needs (if applicable)', checkboxes: [
      'I have identified any additional planning needs relevant to my situation',
      'I have taken steps to address them',
    ]},
    { key: 'professional_support',       type: 'ready',  label: 'Professional support (if needed)', checkboxes: [
      'I have consulted professional support if needed',
    ]},
    { key: 'meaningful_objects',         type: 'ready',  label: 'What should happen to my belongings', checkboxes: [
      'I have documented what should happen to items that matter to me',
      'I have shared these wishes with people who may need to act',
    ]},
  ]},
  { match: 'ritual', displayName: 'Ritual & Ceremony', segments: [
    { key: 'meaningful_rituals',          type: 'orient', label: 'Reflect on rituals or ceremonies that are meaningful to me' },
    { key: 'mark_or_remember',            type: 'orient', label: 'Consider how I want my death to be marked or remembered' },
    { key: 'ritual_ceremony_preferences', type: 'ready',  label: 'Ritual and ceremony preferences', checkboxes: [
      'I have shared my preferences for ritual and ceremony with people in my life',
      'My preferences are documented somewhere accessible (if I choose to)',
    ]},
  ]},
  { match: 'legacy', displayName: 'Legacy', segments: [
    { key: 'life_story_shaped',    type: 'orient', label: 'Reflect on the story of my life and what has shaped me' },
    { key: 'how_remembered',       type: 'orient', label: 'Consider how I want to be remembered' },
    { key: 'relationships_impact', type: 'orient', label: 'Reflect on meaningful relationships and personal impact' },
    { key: 'sharing_what_matters', type: 'ready',  label: 'Sharing what matters to me', checkboxes: [
      'I have created or captured something I want to leave behind (if I choose to)',
      'I have documented my obituary wishes or what I want said about my life',
      'I have noted causes or organizations I want remembered or supported',
    ]},
  ]},
  { match: 'personal', displayName: 'Personal Admin', segments: [
    { key: 'understand_personal_admin',   type: 'orient', label: 'Understand personal admin involved in death planning' },
    { key: 'personal_information',        type: 'ready',  label: 'Personal records', checkboxes: [
      'I have documented my personal identification, legal designations, and important documents',
    ]},
    { key: 'important_contacts',          type: 'ready',  label: 'Important contacts', checkboxes: [
      'I have recorded the people someone may need to contact',
    ]},
    { key: 'financial_information',       type: 'ready',  label: 'Financial information', checkboxes: [
      'I have documented my financial accounts and insurance',
    ]},
    { key: 'devices_and_accounts',        type: 'ready',  label: 'Devices and accounts', checkboxes: [
      'I have documented my devices and account access information',
    ]},
    { key: 'social_media_digital_assets', type: 'ready',  label: 'Social media and digital assets', checkboxes: [
      'I have decided what should happen to my social media accounts and digital assets (if applicable)',
      'I have shared or documented these wishes',
    ]},
  ]},
]

const DOMAIN_DISPLAY_ORDER = ['healthcare', 'deathcare', 'legacy', 'will', 'personal', 'ritual']

function getDomainSegments(title: string): SegmentDef[] {
  const lower = title.toLowerCase()
  for (const config of DOMAIN_SEGMENT_CONFIGS) {
    if (lower.includes(config.match)) return config.segments
  }
  return []
}

function qualitativeLabel(started: number, total: number): string {
  if (started === 0 || total === 0) return 'Not yet started'
  const pct = started / total
  if (pct >= 1)    return 'Deeply explored'
  if (pct >= 0.67) return 'Well underway'
  if (pct >= 0.34) return 'Taking shape'
  return 'Just beginning'
}

// ---------------------------------------------------------------------------
// Entry type
// ---------------------------------------------------------------------------

type EntryRow = {
  id: string
  title: string | null
  content: unknown
  created_at: string | null
  activity: string | null
  document_type: string | null
}

// ---------------------------------------------------------------------------
// Date helpers
// ---------------------------------------------------------------------------

function formatDate(dateString: string | null): string | null {
  if (!dateString) return null
  const d = new Date(dateString)
  if (Number.isNaN(d.getTime())) return null
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })
}

function isoDate(dateString: string | null): string {
  if (!dateString) return new Date().toISOString().slice(0, 10)
  return new Date(dateString).toISOString().slice(0, 10)
}

// ---------------------------------------------------------------------------
// PDFData builders
// ---------------------------------------------------------------------------

const AD_FIELDS: { key: string; label: string }[] = [
  { key: 'perfectDeath', label: 'My perfect death would involve:' },
  { key: 'whatMatters',  label: 'At the end of my life, this is what matters most:' },
  { key: 'values',       label: 'My most important personal values:' },
  { key: 'unacceptable', label: 'What would make prolonging life unacceptable for me:' },
  { key: 'worries',      label: 'When I think about death, this is what I worry about:' },
  { key: 'caregiver',    label: 'What I want my caregiver/care team to know:' },
]

const FW_EXPORT_SECTIONS: { title: string; fields: { key: string; label: string }[] }[] = [
  { title: 'What Matters Most', fields: [
    { key: 'whatMattersMost', label: 'What matters most to me' },
  ]},
  { title: 'Organ & Tissue Donation', fields: [
    { key: 'organDonationWishes',  label: 'My donation wishes' },
    { key: 'organDonationSpecific', label: 'Specific organs or tissues' },
    { key: 'organDonationNotes',   label: 'Other notes' },
  ]},
  { title: 'Final Resting Place', fields: [
    { key: 'dispositionTypes',        label: 'How I want my body to be handled' },
    { key: 'burialLocation',          label: 'Burial: location' },
    { key: 'burialCasket',            label: 'Burial: casket preferences' },
    { key: 'burialEmbalming',         label: 'Burial: embalming preference' },
    { key: 'burialOtherWishes',       label: 'Burial: other wishes' },
    { key: 'mausoleumLocation',       label: 'Above-ground burial: location' },
    { key: 'mausoleumOtherWishes',    label: 'Above-ground burial: other wishes' },
    { key: 'cremationDirect',         label: 'Cremation: direct cremation' },
    { key: 'cremationRemains',        label: 'Cremation: what to do with my remains' },
    { key: 'cremationLocation',       label: 'Cremation: location for remains' },
    { key: 'cremationOtherWishes',    label: 'Cremation: other wishes' },
    { key: 'aquamationDirect',        label: 'Aquamation: direct aquamation' },
    { key: 'aquamationRemains',       label: 'Aquamation: what to do with my remains' },
    { key: 'aquamationLocation',      label: 'Aquamation: location for remains' },
    { key: 'aquamationOtherWishes',   label: 'Aquamation: other wishes' },
    { key: 'homeFuneralWishes',       label: 'Home funeral wishes' },
    { key: 'bodyDonationPreregistered', label: 'Body donation: pre-registered' },
    { key: 'bodyDonationDetails',     label: 'Body donation: details' },
    { key: 'bodyDonationAfterWishes', label: 'Body donation: wishes for remains afterward' },
    { key: 'dispositionOtherText',    label: 'Other disposition details' },
    { key: 'memorialMarker',          label: 'Memorial marker preference' },
    { key: 'memorialMarkerText',      label: 'Memorial marker: what it should say' },
    { key: 'memorialMarkerLocation',  label: 'Memorial marker: location' },
    { key: 'memorialMarkerOtherWishes', label: 'Memorial marker: other wishes' },
  ]},
  { title: 'Ceremony', fields: [
    { key: 'ceremonyCulturalTraditions',    label: 'Cultural or religious traditions' },
    { key: 'ceremonyOfficiant',             label: 'Officiant preference' },
    { key: 'ceremonyGatheringAlive',        label: 'Gathering while I am still alive' },
    { key: 'ceremonyGatheringAliveDetails', label: 'Gathering while alive: details' },
    { key: 'ceremonyFuneralWants',          label: 'Do I want a funeral or memorial service' },
    { key: 'ceremonyFuneralPublicPrivate',  label: 'Public or private' },
    { key: 'ceremonyFuneralLocation',       label: 'Where it should take place' },
    { key: 'ceremonyFuneralCoordinator',    label: 'Who should coordinate' },
    { key: 'ceremonyFuneralPrearranged',    label: 'Have I pre-arranged with a funeral home' },
    { key: 'ceremonyFuneralPrearrangedDetails', label: 'Pre-arrangement details' },
    { key: 'ceremonyFuneralSpeakers',       label: 'Who should speak' },
    { key: 'ceremonyFuneralMusic',          label: 'Music' },
    { key: 'ceremonyFuneralFlowers',        label: 'Flowers preference' },
    { key: 'ceremonyFuneralDonationCause',  label: 'Charitable cause for donations' },
    { key: 'ceremonyDoNotWant',             label: 'Things I do not want' },
    { key: 'ceremonyOtherWishes',           label: 'Other ceremony wishes' },
  ]},
  { title: 'Obituary', fields: [
    { key: 'obituaryWants',        label: 'Do I want an obituary' },
    { key: 'obituaryContent',      label: 'What to include' },
    { key: 'obituaryWriter',       label: 'Who should write it' },
    { key: 'obituaryPublications', label: 'Where to publish' },
    { key: 'obituaryOnline',       label: 'Online presence' },
    { key: 'charityDonationWants', label: 'Charitable donation in memory' },
    { key: 'charityDonationDetails', label: 'Which cause or organization' },
  ]},
  { title: 'Note to Others', fields: [
    { key: 'noteToOthers', label: 'My note to others' },
  ]},
]

const BIO_FIELDS: { key: string; label: string }[] = [
  { key: 'fullLegalName',    label: 'Full legal name' },
  { key: 'preferredName',    label: 'Preferred name' },
  { key: 'pronouns',         label: 'Pronouns' },
  { key: 'currentAddress',   label: 'Current address' },
  { key: 'phoneNumbers',     label: 'Phone number(s)' },
  { key: 'emails',           label: 'Email(s)' },
  { key: 'dateOfBirth',      label: 'Date of birth' },
  { key: 'placeOfBirth',     label: 'Place of birth' },
  { key: 'employmentStatus', label: 'Employment status' },
  { key: 'employerDetails',  label: "Employer's name, address, and phone" },
]

const FAMILY_FIELDS: { key: string; label: string }[] = [
  { key: 'parent1LegalName',         label: 'Parent / caregiver legal name' },
  { key: 'parent1PlaceOfBirth',      label: 'Parent / caregiver place of birth' },
  { key: 'parent2LegalName',         label: 'Second parent / caregiver legal name' },
  { key: 'parent2PlaceOfBirth',      label: 'Second parent / caregiver place of birth' },
  { key: 'maritalStatus',            label: 'Relationship status for official records' },
  { key: 'spousePartnerLegalName',   label: 'Spouse / partner legal name' },
  { key: 'numberOfChildren',         label: 'Number of children' },
  { key: 'childrensFullNames',       label: "Children's full names" },
  { key: 'otherFamily',              label: 'Other family, chosen family, or important relationships' },
]

function buildLegalFields(c: Record<string, unknown>): { label: string; value: string }[] {
  const fields: { label: string; value: string }[] = []
  const str = (v: unknown) => (typeof v === 'string' && v.trim()) ? v.trim() : null
  if (c.hasWill === true)             fields.push({ label: 'I have a legal will', value: 'Yes' })
  const willLoc = str(c.willLocation)
  if (willLoc)                        fields.push({ label: 'My will is located', value: willLoc })
  if (c.hasCareDecisionMaker === true) fields.push({ label: 'Formally designated decision-maker/s for care', value: 'Yes' })
  const cdmDoc = str(c.careDecisionMakerDocLocation)
  if (cdmDoc)                          fields.push({ label: 'Care decision-maker document is located', value: cdmDoc })
  const cdm1Name = str(c.careDecisionMaker1Name)
  if (cdm1Name)                        fields.push({ label: 'Care decision-maker name', value: cdm1Name })
  const cdm1Phone = str(c.careDecisionMaker1Phone)
  if (cdm1Phone)                       fields.push({ label: 'Care decision-maker phone', value: cdm1Phone })
  const cdm1Email = str(c.careDecisionMaker1Email)
  if (cdm1Email)                       fields.push({ label: 'Care decision-maker email', value: cdm1Email })
  if (c.hasEndOfLifeWishesDoc === true) fields.push({ label: 'End-of-life care wishes captured in writing', value: 'Yes' })
  const eolDoc = str(c.endOfLifeWishesDocLocation)
  if (eolDoc)                           fields.push({ label: 'End-of-life wishes document is located', value: eolDoc })
  return fields
}

function buildAdvanceDirectivePDF(entry: EntryRow, userName: string): PDFData {
  const c = (entry.content && typeof entry.content === 'object' ? entry.content : {}) as Record<string, string | undefined>
  const fields = AD_FIELDS.filter(f => c[f.key]?.trim()).map(f => ({ label: f.label, value: c[f.key]! }))
  return {
    kind: 'generic',
    displayTitle: 'My Care Wishes',
    createdDate: formatDate(entry.created_at),
    filename: `nightside-your-wishes-${isoDate(entry.created_at)}`,
    fields,
    intro: 'This document helps you express your values, preferences, and what matters to you in your care. It is not a legal directive, but can be used alongside one to provide important context.',
    userName,
  }
}

function buildFuneralWishesPDF(entry: EntryRow, userName: string): PDFData {
  const c = (entry.content && typeof entry.content === 'object' ? entry.content : {}) as Record<string, unknown>
  const allFields: { label: string; value: string }[] = []
  for (const section of FW_EXPORT_SECTIONS) {
    const sectionFields = section.fields.filter(f => {
      if (f.key === 'dispositionTypes') return Array.isArray(c.dispositionTypes) && (c.dispositionTypes as string[]).length > 0
      return typeof c[f.key] === 'string' && (c[f.key] as string).trim()
    })
    if (sectionFields.length === 0) continue
    allFields.push({ label: `— ${section.title} —`, value: '' })
    for (const f of sectionFields) {
      const value = f.key === 'dispositionTypes'
        ? (c.dispositionTypes as string[]).join(', ')
        : c[f.key] as string
      allFields.push({ label: f.label, value })
    }
  }
  return {
    kind: 'generic',
    displayTitle: 'Wishes for My Body, Funeral & Ceremony',
    createdDate: formatDate(entry.created_at),
    filename: `nightside-funeral-wishes-${isoDate(entry.created_at)}`,
    fields: allFields.filter(f => f.value),
    intro: 'This document captures your wishes for your body, funeral, memorial service, and how you want to be remembered.',
    userName,
  }
}

function buildPersonalAdminPDF(entry: EntryRow, userName: string): PDFData {
  const c = (entry.content && typeof entry.content === 'object' ? entry.content : {}) as Record<string, unknown>
  const bioFields = BIO_FIELDS.filter(f => typeof c[f.key] === 'string' && (c[f.key] as string).trim())
  const famFields = FAMILY_FIELDS.filter(f => typeof c[f.key] === 'string' && (c[f.key] as string).trim())
  const legalFields = buildLegalFields(c)
  const otherDocs = [1, 2, 3, 4, 5].map(n => ({
    name: c[`otherDoc${n}Name`] as string | undefined,
    location: c[`otherDoc${n}Location`] as string | undefined,
    instructions: c[`otherDoc${n}Instructions`] as string | undefined,
  })).filter(d => d.name?.trim() || d.location?.trim() || d.instructions?.trim())

  type PdfSection = { label: string; fields: { label: string; value: string }[]; docs?: { name?: string; location?: string; instructions?: string }[] }
  const sections: PdfSection[] = []
  if (bioFields.length > 0) sections.push({ label: 'Biographical Details', fields: bioFields.map(f => ({ label: f.label, value: c[f.key] as string })) })
  if (famFields.length > 0) sections.push({ label: 'Family Information', fields: famFields.map(f => ({ label: f.label, value: c[f.key] as string })) })
  if (legalFields.length > 0) sections.push({ label: 'Legal & Decision-Making', fields: legalFields })
  if (otherDocs.length > 0) sections.push({ label: 'Other Important Documents', fields: [], docs: otherDocs })

  return {
    kind: 'personal_admin',
    displayTitle: 'Personal Admin Information',
    createdDate: formatDate(entry.created_at),
    filename: `nightside-personal-admin-${isoDate(entry.created_at)}`,
    sections,
    userName,
  }
}

function buildContactsPDF(entry: EntryRow, userName: string): PDFData {
  const content = entry.content as Record<string, unknown> | null
  const sections: { label: string; contacts: PDFContactEntry[] }[] = []

  if (content) {
    const isNewFormat = Array.isArray(content.healthcare) || Array.isArray(content.legal) || Array.isArray(content.relatives) || Array.isArray(content.friends)
    if (isNewFormat) {
      const defs = [
        { key: 'healthcare', label: 'DOCTORS & HEALTHCARE' },
        { key: 'legal',      label: 'LEGAL & DECISION MAKERS' },
        { key: 'relatives',  label: 'RELATIVES' },
        { key: 'friends',    label: 'FRIENDS & SUPPORT' },
        { key: 'spiritual',  label: 'SPIRITUAL / RELIGIOUS' },
        { key: 'financial',  label: 'FINANCIAL & PROFESSIONAL' },
        { key: 'other',      label: 'OTHER CONTACTS' },
      ]
      for (const { key, label } of defs) {
        type NC = { id: string; name: string; role: string; phone: string; email: string; address: string }
        const entries = ((content[key] as NC[]) ?? []).filter(c => c.name?.trim() || c.phone?.trim() || c.email?.trim())
        if (entries.length > 0) {
          sections.push({
            label,
            contacts: entries.map(c => ({
              name: c.name,
              role: c.role?.trim() || undefined,
              phone: c.phone?.trim() || undefined,
              email: c.email?.trim() || undefined,
              address: c.address?.trim() || undefined,
            })),
          })
        }
      }
    } else {
      type CF = { name: string; phone: string; email: string; address: string }
      const oldContent = content as Record<string, CF>
      const groupDefs = [
        { label: 'DOCTORS',                    keys: ['doctor1', 'doctor2', 'doctor3', 'doctor4'] },
        { label: 'ATTORNEYS / ACCOUNTANTS',    keys: ['attorney1', 'attorney2', 'attorney3', 'attorney4'] },
        { label: 'FAMILY & EMERGENCY CONTACTS', keys: ['relative1', 'relative2', 'relative3', 'relative4'] },
        { label: 'FRIENDS',                    keys: ['friend1', 'friend2', 'friend3', 'friend4'] },
        { label: 'OTHERS',                     keys: ['other1', 'other2', 'other3', 'other4'] },
      ]
      for (const { label, keys } of groupDefs) {
        const contacts = keys.map(k => oldContent[k]).filter((c): c is CF => !!(c && c.name?.trim())).map(c => ({ name: c.name, phone: c.phone?.trim() || undefined, email: c.email?.trim() || undefined, address: c.address?.trim() || undefined }))
        if (contacts.length > 0) sections.push({ label, contacts })
      }
    }
  }

  return { kind: 'important_contacts', displayTitle: 'Important Contacts', createdDate: formatDate(entry.created_at), filename: `nightside-important-contacts-${isoDate(entry.created_at)}`, sections, userName }
}

function buildFinancialPDF(entry: EntryRow, userName: string): PDFData {
  type FinEntry = { id: string; name: string; typeOfAccount?: string; contactInfo?: string }
  type FinDebt = { id: string; name: string; type?: string; amount?: string; contactInfo?: string }
  type FinC = { banking?: FinEntry[]; investments?: FinEntry[]; retirement?: FinEntry[]; debts?: FinDebt[] }
  const c = (entry.content && typeof entry.content === 'object' ? entry.content : {}) as FinC
  return {
    kind: 'financial',
    displayTitle: 'Financial Information',
    createdDate: formatDate(entry.created_at),
    filename: `nightside-financial-information-${isoDate(entry.created_at)}`,
    banking:     (c.banking     ?? []).filter(e => e.name?.trim()),
    investments: (c.investments ?? []).filter(e => e.name?.trim()),
    retirement:  (c.retirement  ?? []).filter(e => e.name?.trim()),
    debts:       (c.debts       ?? []).filter(e => e.name?.trim()),
    acctNums: {},
    userName,
  }
}

function buildDevicesAccountsPDF(entry: EntryRow, userName: string): PDFData {
  const c = (entry.content && typeof entry.content === 'object' ? entry.content : {}) as Record<string, string | undefined>
  const NUMS = [1, 2, 3, 4, 5] as const
  type PdfEntry = { name: string; fields: { label: string; value: string }[] }
  type PdfSection = { label: string; entries: PdfEntry[] }
  const sections: PdfSection[] = []

  const deviceNums  = NUMS.filter(n => c[`device${n}Name`]?.trim()         || c[`device${n}LoginAccount`]?.trim()    || c[`device${n}Notes`]?.trim())
  const socialNums  = NUMS.filter(n => c[`socialMedia${n}Platform`]?.trim() || c[`socialMedia${n}Username`]?.trim()   || c[`socialMedia${n}WishesOnDeath`]?.trim())
  const otherNums   = NUMS.filter(n => c[`otherAccount${n}Name`]?.trim()    || c[`otherAccount${n}Username`]?.trim()  || c[`otherAccount${n}Notes`]?.trim())
  const assetNums   = NUMS.filter(n => c[`digitalAsset${n}Name`]?.trim()    || c[`digitalAsset${n}Location`]?.trim()  || c[`digitalAsset${n}Notes`]?.trim())

  if (deviceNums.length > 0) sections.push({ label: 'Devices', entries: deviceNums.map(n => { const fields: { label: string; value: string }[] = []; if (c[`device${n}LoginAccount`]?.trim()) fields.push({ label: 'Login account', value: c[`device${n}LoginAccount`]! }); if (c[`device${n}Notes`]?.trim()) fields.push({ label: 'Notes', value: c[`device${n}Notes`]! }); return { name: c[`device${n}Name`]?.trim() || 'Device', fields } }) })
  if (socialNums.length > 0) sections.push({ label: 'Social media', entries: socialNums.map(n => { const fields: { label: string; value: string }[] = []; if (c[`socialMedia${n}Username`]?.trim()) fields.push({ label: 'Username', value: c[`socialMedia${n}Username`]! }); if (c[`socialMedia${n}WishesOnDeath`]?.trim()) fields.push({ label: 'My wishes upon death', value: c[`socialMedia${n}WishesOnDeath`]! }); return { name: c[`socialMedia${n}Platform`]?.trim() || 'Account', fields } }) })
  if (otherNums.length > 0) sections.push({ label: 'Other accounts', entries: otherNums.map(n => { const fields: { label: string; value: string }[] = []; if (c[`otherAccount${n}Username`]?.trim()) fields.push({ label: 'Username', value: c[`otherAccount${n}Username`]! }); if (c[`otherAccount${n}Notes`]?.trim()) fields.push({ label: 'Notes', value: c[`otherAccount${n}Notes`]! }); return { name: c[`otherAccount${n}Name`]?.trim() || 'Account', fields } }) })
  if (assetNums.length > 0) sections.push({ label: 'Digital assets', entries: assetNums.map(n => { const fields: { label: string; value: string }[] = []; if (c[`digitalAsset${n}Location`]?.trim()) fields.push({ label: 'Location / Platform', value: c[`digitalAsset${n}Location`]! }); if (c[`digitalAsset${n}Notes`]?.trim()) fields.push({ label: 'Notes', value: c[`digitalAsset${n}Notes`]! }); return { name: c[`digitalAsset${n}Name`]?.trim() || 'Asset', fields } }) })

  return { kind: 'devices_accounts', displayTitle: 'Devices & Accounts', createdDate: formatDate(entry.created_at), filename: `nightside-devices-and-accounts-${isoDate(entry.created_at)}`, sections, userName }
}

function buildKeepsakePDF(entry: EntryRow, userName: string): PDFData {
  type KItem = { id: string; object: string; recipient: string; meaning: string }
  const content = entry.content as { entries?: KItem[] } | null
  const items = content?.entries?.filter(e => e.object?.trim()) ?? []
  return {
    kind: 'keepsake_inventory',
    displayTitle: 'Keepsakes Inventory',
    createdDate: formatDate(entry.created_at),
    filename: `nightside-keepsake-inventory-${isoDate(entry.created_at)}`,
    items: items.map(item => ({ object: item.object, recipient: item.recipient?.trim() || undefined, meaning: item.meaning?.trim() || undefined })),
    userName,
  }
}

function buildValuesRankingPDF(entry: EntryRow, userName: string): PDFData {
  const c = (entry.content && typeof entry.content === 'object' ? entry.content : {}) as Record<string, unknown>
  return {
    kind: 'values_ranking',
    displayTitle: 'Values Ranking',
    createdDate: formatDate(entry.created_at),
    filename: `nightside-values-ranking-${isoDate(entry.created_at)}`,
    groups: [
      { label: 'ESSENTIAL',      items: (Array.isArray(c.essential)    ? c.essential    : []).filter((i): i is string => typeof i === 'string') },
      { label: 'IMPORTANT',      items: (Array.isArray(c.important)    ? c.important    : []).filter((i): i is string => typeof i === 'string') },
      { label: 'LESS IMPORTANT', items: (Array.isArray(c.less_central) ? c.less_central : []).filter((i): i is string => typeof i === 'string') },
    ].filter(g => g.items.length > 0),
    reflection: typeof c.reflection === 'string' ? c.reflection : undefined,
    intro: 'This document captures how you sorted and reflected on different personal values in relation to care, identity, and what matters most to you.',
    userName,
  }
}

function buildFearsRankingPDF(entry: EntryRow, userName: string): PDFData {
  const c = (entry.content && typeof entry.content === 'object' ? entry.content : {}) as Record<string, unknown>
  return {
    kind: 'fears_ranking',
    displayTitle: 'Fears Ranking',
    createdDate: formatDate(entry.created_at),
    filename: `nightside-fears-ranking-${isoDate(entry.created_at)}`,
    groups: [
      { label: 'MOST PRESSING',     items: (Array.isArray(c.essential)    ? c.essential    : []).filter((i): i is string => typeof i === 'string') },
      { label: 'SOMEWHAT PRESSING', items: (Array.isArray(c.important)    ? c.important    : []).filter((i): i is string => typeof i === 'string') },
      { label: 'LESS PRESSING',     items: (Array.isArray(c.less_central) ? c.less_central : []).filter((i): i is string => typeof i === 'string') },
    ].filter(g => g.items.length > 0),
    reflection: typeof c.reflection === 'string' ? c.reflection : undefined,
    intro: 'This document reflects how different fears and concerns felt to you at a particular moment in time.',
    userName,
  }
}

function buildLegacyMapPDF(entry: EntryRow, userName: string): PDFData {
  const c = (entry.content && typeof entry.content === 'object' ? entry.content : {}) as Record<string, unknown>
  const moments = Array.isArray(c.moments)
    ? (c.moments as Record<string, unknown>[])
        .filter(m => typeof m.title === 'string' && (m.title as string).trim())
        .map(m => ({ title: m.title as string, note: typeof m.note === 'string' ? m.note || undefined : undefined, xPercent: typeof m.xPercent === 'number' ? m.xPercent : 50 }))
        .sort((a, b) => a.xPercent - b.xPercent)
    : []
  const monthYear = entry.created_at
    ? new Date(entry.created_at).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })
    : new Date().toLocaleDateString(undefined, { month: 'long', year: 'numeric' })
  return {
    kind: 'legacy_map',
    displayTitle: 'Legacy Map',
    createdDate: formatDate(entry.created_at),
    filename: `nightside-legacy-map-${isoDate(entry.created_at)}`,
    moments,
    themes:       typeof c.themes       === 'string' ? c.themes       || undefined : undefined,
    surprises:    typeof c.surprises    === 'string' ? c.surprises    || undefined : undefined,
    valuesToPassOn: typeof c.valuesToPassOn === 'string' ? c.valuesToPassOn || undefined : undefined,
    legacyProjects: typeof c.legacyProjects === 'string' ? c.legacyProjects || undefined : undefined,
    intro: 'This document maps meaningful moments and reflections from across your life.',
    userName,
    monthYear,
  }
}

function hasAnyStringContent(value: unknown): boolean {
  if (typeof value === 'string') return value.trim().length > 0
  if (Array.isArray(value)) return value.some(hasAnyStringContent)
  if (value && typeof value === 'object') return Object.values(value as Record<string, unknown>).some(hasAnyStringContent)
  return false
}

const ALL_POSSIBLE_MATERIAL_TITLES = [
  'My Care Wishes',
  'Wishes for My Body, Funeral & Ceremony',
  'Personal Admin Information',
  'Important Contacts',
  'Financial Information',
  'Devices & Accounts',
  'Keepsakes Inventory',
  'Values Ranking',
  'Fears Ranking',
  'Legacy Map',
]

// ---------------------------------------------------------------------------
// Main page component
// ---------------------------------------------------------------------------

export default function PlanExportPage() {
  const [loading, setLoading]                 = useState(true)
  const [userName, setUserName]               = useState('')
  const [firstName, setFirstName]             = useState('')
  const [lastName, setLastName]               = useState('')
  const [keyDetails, setKeyDetails]           = useState<PlanKeyDetail[]>([])
  const [domainStatuses, setDomainStatuses]   = useState<PlanDomainStatus[]>([])
  const [materials, setMaterials]             = useState<PlanMaterial[]>([])
  const [summaryLoading, setSummaryLoading]   = useState(false)
  const [fullLoading, setFullLoading]         = useState(false)

  useEffect(() => {
    async function load() {
      const supabase = createSupabaseBrowserClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setLoading(false); return }

      const _first = (user.user_metadata?.first_name as string | undefined)?.trim() ?? ''
      const _last  = (user.user_metadata?.last_name  as string | undefined)?.trim() ?? ''
      const name   = [_first, _last].filter(Boolean).join(' ')
        || (user.user_metadata?.full_name as string | undefined)?.trim()
        || user.email
        || ''
      setUserName(name)
      setFirstName(_first)
      setLastName(_last)

      const meta = user.user_metadata ?? {}
      const syncHasWill = !!meta.sync_has_will
      const syncHasEOL  = !!meta.sync_has_eol_wishes_doc
      const careStatus  = (meta.sync_care_preferences_status as string | undefined) ?? null

      const [{ data: entries }, { data: domainContainers }] = await Promise.all([
        supabase
          .from('entries')
          .select('id, title, content, created_at, activity, document_type')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false }),
        supabase
          .from('containers')
          .select('id, title')
          .eq('type', 'domain')
          .order('title'),
      ])

      const allEntries = entries ?? []
      const allDomains = domainContainers ?? []

      const adminEntry     = allEntries.find(e => e.document_type === 'personal_admin_info')
      const contactsEntry  = allEntries.find(e => e.document_type === 'important_contacts')
      const adEntry        = allEntries.find(e => e.document_type === 'advance_directive_supplement')
      const fwEntry        = allEntries.find(e => e.document_type === 'funeral_wishes')
      const finEntry       = allEntries.find(e => e.document_type === 'financial_information')
      const devicesEntry   = allEntries.find(e => e.document_type === 'devices_and_accounts')
      const keepsakeEntry  = allEntries.find(e => e.document_type === 'keepsake_inventory')
      const valuesEntry    = allEntries.find(e => e.activity === 'values_ranking')
      const fearsEntry     = allEntries.find(e => e.activity === 'fears_ranking')
      const legacyEntry    = allEntries.find(e => e.activity === 'legacy_map')

      // Extract admin content for key details
      let willLocation: string | null = null
      let cdmName: string | null = null
      let cdmPhone: string | null = null
      let cdmEmail: string | null = null
      let cdmDocLoc: string | null = null
      if (adminEntry) {
        const c = adminEntry.content as Record<string, unknown>
        willLocation = (c?.willLocation as string | undefined)?.trim() || null
        cdmName = ((c?.careDecisionMaker1Name as string | undefined)?.trim() || (c?.careDecisionMaker1 as string | undefined)?.trim() || null)
        cdmPhone = (c?.careDecisionMaker1Phone as string | undefined)?.trim() || null
        cdmEmail = (c?.careDecisionMaker1Email as string | undefined)?.trim() || null
        cdmDocLoc = (c?.careDecisionMakerDocLocation as string | undefined)?.trim() || null
      }

      type ContactInfo = { name: string; institution: string; phone: string; email: string }
      let doctor: ContactInfo | null = null
      let lawyer: ContactInfo | null = null
      if (contactsEntry) {
        const c = contactsEntry.content as Record<string, unknown>
        const hcList = (c?.healthcare as Record<string, string>[] | undefined) ?? []
        const legalList = (c?.legal as Record<string, string>[] | undefined) ?? []
        const firstDoctor = hcList.find(d => d?.name?.trim())
        const firstLawyer = legalList.find(l => l?.name?.trim())
        if (firstDoctor) doctor = { name: firstDoctor.name?.trim() || '', institution: (firstDoctor.institution ?? '').trim(), phone: firstDoctor.phone?.trim() || '', email: firstDoctor.email?.trim() || '' }
        if (firstLawyer) lawyer = { name: firstLawyer.name?.trim() || '', institution: (firstLawyer.institution ?? '').trim(), phone: firstLawyer.phone?.trim() || '', email: firstLawyer.email?.trim() || '' }
      }

      // Resting place from localStorage (deathcare domain)
      const deathcareDomain = allDomains.find(d => d.title.toLowerCase().includes('death'))
      let restingDocumented = false
      let restingShared = false
      if (deathcareDomain) {
        const did = deathcareDomain.id
        restingDocumented = localStorage.getItem(`checkbox_${did}_final_resting_place_wishes_0`) === 'true'
        restingShared     = localStorage.getItem(`checkbox_${did}_final_resting_place_wishes_1`) === 'true'
      }

      // Build key details
      const careLabel = syncHasEOL ? (
        careStatus === 'documented'   ? 'Formally documented' :
        careStatus === 'communicated' ? 'Communicated to decision maker' :
        careStatus === 'both'         ? 'Documented and communicated' :
        'Documented or communicated'
      ) : null

      const restingValue = (restingDocumented && restingShared) ? 'Documented and shared'
        : restingDocumented ? 'Documented'
        : restingShared     ? 'Shared with people in my life'
        : null

      const kd: PlanKeyDetail[] = [
        {
          label: 'Legal will',
          value: syncHasWill ? 'Documented' : null,
          details: willLocation ? [`Document location: ${willLocation}`] : [],
        },
        {
          label: 'Care preferences',
          value: careLabel,
          details: [],
        },
        {
          label: 'Final resting place',
          value: restingValue,
          details: [],
        },
        {
          label: 'Substitute decision maker',
          value: cdmName,
          details: [
            cdmPhone ? `Phone: ${cdmPhone}` : null,
            cdmEmail ? `Email: ${cdmEmail}` : null,
            cdmDocLoc ? `Document location: ${cdmDocLoc}` : null,
          ].filter((d): d is string => d !== null),
        },
        {
          label: 'Doctor',
          value: doctor?.name ?? null,
          details: [
            doctor?.institution ? doctor.institution : null,
            doctor?.phone ? `Phone: ${doctor.phone}` : null,
            doctor?.email ? `Email: ${doctor.email}` : null,
          ].filter((d): d is string => d !== null),
        },
        {
          label: 'Lawyer',
          value: lawyer?.name ?? null,
          details: [
            lawyer?.institution ? lawyer.institution : null,
            lawyer?.phone ? `Phone: ${lawyer.phone}` : null,
            lawyer?.email ? `Email: ${lawyer.email}` : null,
          ].filter((d): d is string => d !== null),
        },
      ]
      setKeyDetails(kd)

      // Build domain statuses from DOMAIN_SEGMENT_CONFIGS (canonical list of all 6 domains)
      // Match to DB domains where they exist to get the ID for localStorage lookups.
      const ds: PlanDomainStatus[] = DOMAIN_SEGMENT_CONFIGS.map(config => {
        const dbDomain = allDomains.find(d => d.title.toLowerCase().includes(config.match))

        // Topic-level engagement for qualitative status label
        const topicsStarted = config.segments.filter(seg => {
          if (!dbDomain) return false
          const lsKey = seg.type === 'orient'
            ? `orient_${dbDomain.id}_${seg.key}`
            : `ready_${dbDomain.id}_${seg.key}`
          const val = localStorage.getItem(lsKey)
          return val === 'complete' || val === 'in_progress'
        }).length

        // Individual checkbox items for display
        const checkboxItems: PlanCheckboxItem[] = []
        for (const seg of config.segments) {
          if (seg.type !== 'ready' || !seg.checkboxes) continue
          for (let i = 0; i < seg.checkboxes.length; i++) {
            const checked = dbDomain
              ? localStorage.getItem(`checkbox_${dbDomain.id}_${seg.key}_${i}`) === 'true'
              : false
            checkboxItems.push({ label: seg.checkboxes[i], checked })
          }
        }

        return {
          title: dbDomain?.title ?? config.displayName,
          label: qualitativeLabel(topicsStarted, config.segments.length),
          topicsStarted,
          totalTopics: config.segments.length,
          checkboxItems,
        }
      })
      setDomainStatuses(ds)

      // Build materials list
      const mats: PlanMaterial[] = []
      if (adEntry && hasAnyStringContent(adEntry.content))         mats.push({ title: 'My Care Wishes', pdfData: buildAdvanceDirectivePDF(adEntry, name) })
      if (fwEntry && hasAnyStringContent(fwEntry.content))         mats.push({ title: 'Wishes for My Body, Funeral & Ceremony', pdfData: buildFuneralWishesPDF(fwEntry, name) })
      if (adminEntry && hasAnyStringContent(adminEntry.content))   mats.push({ title: 'Personal Admin Information', pdfData: buildPersonalAdminPDF(adminEntry, name) })
      if (contactsEntry && hasAnyStringContent(contactsEntry.content)) mats.push({ title: 'Important Contacts', pdfData: buildContactsPDF(contactsEntry, name) })
      if (finEntry && hasAnyStringContent(finEntry.content))       mats.push({ title: 'Financial Information', pdfData: buildFinancialPDF(finEntry, name) })
      if (devicesEntry && hasAnyStringContent(devicesEntry.content)) mats.push({ title: 'Devices & Accounts', pdfData: buildDevicesAccountsPDF(devicesEntry, name) })
      if (keepsakeEntry && hasAnyStringContent(keepsakeEntry.content)) mats.push({ title: 'Keepsakes Inventory', pdfData: buildKeepsakePDF(keepsakeEntry, name) })
      if (valuesEntry)                                              mats.push({ title: 'Values Ranking', pdfData: buildValuesRankingPDF(valuesEntry, name) })
      if (fearsEntry)                                               mats.push({ title: 'Fears Ranking', pdfData: buildFearsRankingPDF(fearsEntry, name) })
      if (legacyEntry)                                              mats.push({ title: 'Legacy Map', pdfData: buildLegacyMapPDF(legacyEntry, name) })
      setMaterials(mats)

      setLoading(false)
    }
    load()
  }, [])

  async function handleDownload(mode: 'summary' | 'full') {
    const setDownloading = mode === 'summary' ? setSummaryLoading : setFullLoading
    setDownloading(true)
    try {
      const { pdf } = await import('@react-pdf/renderer')
      const { default: PlanPDFDocument } = await import('./PlanPDFDocument')

      const today = new Date()
      const exportDate = today.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })
      const todayStr = today.toISOString().slice(0, 10)

      const planProps: PlanPDFProps = {
        userName,
        exportDate,
        keyDetails,
        domainStatuses,
        materials,
        mode,
      }

      const blob = await pdf(<PlanPDFDocument planProps={planProps} />).toBlob()
      fetch('/api/analytics/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventName: 'export_generated', metadata: { mode } }),
      }).catch(() => {})
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      const safeName = [firstName, lastName].filter(Boolean).join('-') || 'plan'
      a.download = mode === 'summary'
        ? `${safeName}-plan-summary-${todayStr}.pdf`
        : `${safeName}-full-plan-${todayStr}.pdf`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } finally {
      setDownloading(false)
    }
  }

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: '#F8F4EB', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ fontFamily: hv, fontSize: 14, color: 'rgba(19,4,38,0.45)' }}>Loading your plan…</p>
      </div>
    )
  }

  const today = new Date().toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })

  return (
    <div style={{ minHeight: '100vh', background: '#F8F4EB' }}>
      <div style={{ maxWidth: 860, margin: '0 auto', padding: '64px 24px 80px' }}>

        {/* Chrome */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 40 }}>
          <Link
            href="/app/plan"
            style={{ fontFamily: hv, fontSize: 13, color: 'rgba(19,4,38,0.55)', textDecoration: 'none' }}
          >
            ← Back to Plan
          </Link>
          <div style={{ display: 'flex', gap: 10 }}>
            <button
              type="button"
              onClick={() => handleDownload('summary')}
              disabled={summaryLoading}
              style={{
                fontFamily: hv, fontSize: 13, fontWeight: 500,
                color: summaryLoading ? '#999' : '#1A1A1A',
                background: '#F5F5F5', border: '1px solid #DDDDDD',
                borderRadius: 6, padding: '8px 16px',
                cursor: summaryLoading ? 'default' : 'pointer',
              }}
            >
              {summaryLoading ? 'Generating…' : 'Download summary only (PDF)'}
            </button>
            <button
              type="button"
              onClick={() => handleDownload('full')}
              disabled={fullLoading}
              style={{
                fontFamily: hv, fontSize: 13, fontWeight: 500,
                color: fullLoading ? '#999' : '#FFFFFF',
                background: fullLoading ? '#888' : '#130426',
                border: '1px solid #130426',
                borderRadius: 6, padding: '8px 16px',
                cursor: fullLoading ? 'default' : 'pointer',
              }}
            >
              {fullLoading ? 'Generating…' : `Download full plan (${materials.length} material${materials.length !== 1 ? 's' : ''}) (PDF)`}
            </button>
          </div>
        </div>

        {/* Summary preview card */}
        <div style={{
          background: '#FFFFFF',
          border: '1px solid rgba(19,4,38,0.10)',
          borderRadius: 12,
          padding: '40px 48px',
          marginBottom: 40,
          boxShadow: '0 2px 16px rgba(0,0,0,0.06)',
        }}>

          {/* Preview header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/The-Nightside-Wordmark-Black.svg" alt="Nightside" style={{ height: 20 }} />
            <span style={{ fontFamily: hv, fontSize: 12, color: 'rgba(19,4,38,0.4)' }}>{userName}</span>
          </div>
          <div style={{ height: 1, background: 'rgba(0,0,0,0.10)', marginBottom: 24 }} />

          <h1 style={{ fontFamily: apf, fontSize: 32, fontWeight: 400, color: '#1A1A1A', margin: '0 0 4px' }}>Your Plan</h1>
          <p style={{ fontFamily: hv, fontSize: 13, color: '#999999', margin: '0 0 32px' }}>{userName} · {today}</p>

          {/* Summary page label */}
          <p style={{ fontFamily: apf, fontSize: 22, fontWeight: 400, color: '#130426', margin: '0 0 20px' }}>Summary</p>

          {/* Key Details */}
          <SummarySection title="Key Details">
            {keyDetails.map((row, i) => (
              <div key={i} style={{ paddingBottom: 8, marginBottom: 8, borderBottom: i < keyDetails.length - 1 ? '1px solid rgba(0,0,0,0.06)' : 'none' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                  <span style={{ fontFamily: hv, fontSize: 13, color: '#555555' }}>{row.label}</span>
                  <span style={{ fontFamily: hv, fontSize: 13, color: row.value ? '#1A1A1A' : '#CCCCCC', fontStyle: row.value ? 'normal' : 'italic' }}>
                    {row.value ?? 'Not recorded'}
                  </span>
                </div>
                {row.details?.map((d, j) => (
                  <p key={j} style={{ fontFamily: hv, fontSize: 11.5, color: '#999999', margin: '2px 0 0 12px' }}>{d}</p>
                ))}
              </div>
            ))}
          </SummarySection>

          {/* Planning Status */}
          {(() => {
            // Already ordered by DOMAIN_SEGMENT_CONFIGS (DOMAIN_DISPLAY_ORDER) — no re-sort needed
            return (
              <SummarySection title="Practical Readiness">
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px 24px', alignItems: 'start' }}>
                  {domainStatuses.map((domain, i) => (
                    <div key={i}>
                      <p style={{ fontFamily: hv, fontSize: 13, fontWeight: 600, color: '#130426', margin: '0 0 4px' }}>{domain.title}</p>
                      <p style={{ fontFamily: hv, fontSize: 12, color: 'rgba(19,4,38,0.5)', margin: '0 0 8px' }}>{domain.label}</p>
                      {domain.topicsStarted > 0 && [...domain.checkboxItems].sort((a, b) => (a.checked === b.checked ? 0 : a.checked ? -1 : 1)).map((item, j) => (
                        <div key={j} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '3px 0' }}>
                          {item.checked ? (
                            <div style={{ width: 13, height: 13, background: '#2C3777', borderRadius: 3, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              <svg width="8" height="6" viewBox="0 0 8 6" fill="none">
                                <path d="M1 3L3 5L7 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                              </svg>
                            </div>
                          ) : (
                            <div style={{ width: 13, height: 13, border: '1.5px solid rgba(19,4,38,0.25)', borderRadius: 3, flexShrink: 0 }} />
                          )}
                          <span style={{ fontFamily: hv, fontSize: 12, color: item.checked ? '#130426' : 'rgba(19,4,38,0.5)' }}>
                            {item.label}
                          </span>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              </SummarySection>
            )
          })()}

          {/* What's included */}
          {(() => {
            const includedTitles = new Set(materials.map(m => m.title))
            const includedCount = includedTitles.size
            const totalCount = ALL_POSSIBLE_MATERIAL_TITLES.length
            return (
              <SummarySection title={`What's included (${includedCount} of ${totalCount} materials)`}>
                {[...ALL_POSSIBLE_MATERIAL_TITLES].sort((a, b) => {
                  const aIn = includedTitles.has(a) ? 0 : 1
                  const bIn = includedTitles.has(b) ? 0 : 1
                  return aIn - bIn
                }).map((title, i) => {
                  const included = includedTitles.has(title)
                  return (
                    <div key={i} style={{ display: 'flex', gap: 9, alignItems: 'center', marginBottom: 7 }}>
                      {included ? (
                        <div style={{ width: 13, height: 13, background: '#130426', borderRadius: 3, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <svg width="8" height="6" viewBox="0 0 8 6" fill="none">
                            <path d="M1 3L3 5L7 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        </div>
                      ) : (
                        <div style={{ width: 13, height: 13, border: '1.5px solid #CCCCCC', borderRadius: 3, flexShrink: 0 }} />
                      )}
                      <span style={{ fontFamily: hv, fontSize: 13, color: '#1A1A1A' }}>
                        {title}
                      </span>
                      {!included && (
                        <span style={{ fontFamily: hv, fontSize: 13, color: '#999999', fontStyle: 'italic' }}>
                          — Not yet started
                        </span>
                      )}
                    </div>
                  )
                })}
              </SummarySection>
            )
          })()}

          {/* Footer */}
          <div style={{ marginTop: 32, paddingTop: 16, borderTop: '1px solid rgba(0,0,0,0.08)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontFamily: hv, fontSize: 11, color: '#BBBBBB' }}>Generated from Nightside Planning Studio</span>
            <span style={{ fontFamily: hv, fontSize: 11, color: '#CCCCCC' }}>p. 1</span>
          </div>
        </div>


      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Small sub-components
// ---------------------------------------------------------------------------

function SummarySection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 28 }}>
      <p style={{ fontFamily: hv, fontSize: 10, fontWeight: 600, letterSpacing: '0.07em', color: '#AAAAAA', textTransform: 'uppercase', margin: '0 0 8px' }}>
        {title}
      </p>
      <div style={{ height: 1, background: 'rgba(0,0,0,0.08)', marginBottom: 12 }} />
      {children}
    </div>
  )
}
