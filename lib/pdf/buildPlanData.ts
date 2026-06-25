// Pure, environment-agnostic transformers from a Supabase `entries` row to the
// PDFData shapes the PDF documents render. No React, no browser, no Supabase —
// safe to import from a client page or a Node release script alike.

import { getCheckboxes } from '@/lib/domain-state'
import { ACTIVITY, DOCUMENT_TYPE_META, DOCUMENT_TYPE } from '@/lib/content-metadata'
import type { DomainState } from '@/lib/domain-state'
import type { PDFData, PDFContactEntry } from './types'
import type { PlanMaterial, PlanKeyDetail, PlanDomainStatus, PlanReadinessGroup } from './PlanPDFDocument'
import { DOMAIN_STRUCTURES } from '@/lib/domain-structure'
import { qualitativeLabel, computeDomainProgress } from '@/lib/domain-status'
import { bucketTasksByRow, type UserTask } from '@/lib/user-tasks'

// ---------------------------------------------------------------------------
// Entry type
// ---------------------------------------------------------------------------

export type EntryRow = {
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

export function formatDate(dateString: string | null): string | null {
  if (!dateString) return null
  const d = new Date(dateString)
  if (Number.isNaN(d.getTime())) return null
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })
}

export function isoDate(dateString: string | null): string {
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

export function buildAdvanceDirectivePDF(entry: EntryRow, userName: string): PDFData {
  const c = (entry.content && typeof entry.content === 'object' ? entry.content : {}) as Record<string, string | undefined>
  const fields = AD_FIELDS.filter(f => c[f.key]?.trim()).map(f => ({ label: f.label, value: c[f.key]! }))
  return {
    kind: 'generic',
    displayTitle: DOCUMENT_TYPE_META.advance_directive_supplement.label,
    createdDate: formatDate(entry.created_at),
    filename: `nightside-your-wishes-${isoDate(entry.created_at)}`,
    fields,
    intro: 'This document helps you express your values, preferences, and what matters to you in your care. It is not a legal directive, but can be used alongside one to provide important context.',
    userName,
  }
}

export function buildFuneralWishesPDF(entry: EntryRow, userName: string): PDFData {
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
    displayTitle: DOCUMENT_TYPE_META.funeral_wishes.label,
    createdDate: formatDate(entry.created_at),
    filename: `nightside-funeral-wishes-${isoDate(entry.created_at)}`,
    fields: allFields.filter(f => f.value),
    intro: 'This document captures your wishes for your body, funeral, memorial service, and how you want to be remembered.',
    userName,
  }
}

export function buildPersonalAdminPDF(entry: EntryRow, userName: string): PDFData {
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
    displayTitle: DOCUMENT_TYPE_META.personal_admin_info.label,
    createdDate: formatDate(entry.created_at),
    filename: `nightside-personal-admin-${isoDate(entry.created_at)}`,
    sections,
    userName,
  }
}

export function buildContactsPDF(entry: EntryRow, userName: string): PDFData {
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

  return { kind: 'important_contacts', displayTitle: DOCUMENT_TYPE_META.important_contacts.label, createdDate: formatDate(entry.created_at), filename: `nightside-important-contacts-${isoDate(entry.created_at)}`, sections, userName }
}

export function buildFinancialPDF(entry: EntryRow, userName: string): PDFData {
  type FinEntry = { id: string; name: string; typeOfAccount?: string; contactInfo?: string }
  type FinDebt = { id: string; name: string; type?: string; amount?: string; contactInfo?: string }
  type FinC = { banking?: FinEntry[]; investments?: FinEntry[]; retirement?: FinEntry[]; debts?: FinDebt[] }
  const c = (entry.content && typeof entry.content === 'object' ? entry.content : {}) as FinC
  return {
    kind: 'financial',
    displayTitle: DOCUMENT_TYPE_META.financial_information.label,
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

export function buildDevicesAccountsPDF(entry: EntryRow, userName: string): PDFData {
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

  return { kind: 'devices_accounts', displayTitle: DOCUMENT_TYPE_META.devices_and_accounts.label, createdDate: formatDate(entry.created_at), filename: `nightside-devices-and-accounts-${isoDate(entry.created_at)}`, sections, userName }
}

export function buildKeepsakePDF(entry: EntryRow, userName: string): PDFData {
  type KItem = { id: string; object: string; recipient: string; meaning: string }
  const content = entry.content as { entries?: KItem[] } | null
  const items = content?.entries?.filter(e => e.object?.trim()) ?? []
  return {
    kind: 'keepsake_inventory',
    displayTitle: DOCUMENT_TYPE_META.keepsake_inventory.label,
    createdDate: formatDate(entry.created_at),
    filename: `nightside-keepsake-inventory-${isoDate(entry.created_at)}`,
    items: items.map(item => ({ object: item.object, recipient: item.recipient?.trim() || undefined, meaning: item.meaning?.trim() || undefined })),
    userName,
  }
}

export function buildValuesRankingPDF(entry: EntryRow, userName: string, reflection?: string): PDFData {
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
    reflection: reflection ?? (typeof c.reflection === 'string' ? c.reflection : undefined),
    intro: 'This document captures how you sorted and reflected on different personal values in relation to care, identity, and what matters most to you.',
    userName,
  }
}

export function buildFearsRankingPDF(entry: EntryRow, userName: string, reflection?: string): PDFData {
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
    reflection: reflection ?? (typeof c.reflection === 'string' ? c.reflection : undefined),
    intro: 'This document reflects how different fears and concerns felt to you at a particular moment in time.',
    userName,
  }
}

export function buildLegacyMapPDF(entry: EntryRow, userName: string, reflection?: string): PDFData {
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
    reflection: reflection ?? (typeof c.themes === 'string' ? c.themes || undefined : undefined),
    intro: 'This document maps meaningful moments and reflections from across your life.',
    userName,
    monthYear,
  }
}

export function hasAnyStringContent(value: unknown): boolean {
  if (typeof value === 'string') return value.trim().length > 0
  if (Array.isArray(value)) return value.some(hasAnyStringContent)
  if (value && typeof value === 'object') return Object.values(value as Record<string, unknown>).some(hasAnyStringContent)
  return false
}

// ---------------------------------------------------------------------------
// Materials assembler
// ---------------------------------------------------------------------------

// Build the ordered PlanMaterial[] for a user's entries. Documents are gated on
// hasAnyStringContent so empty drafts don't render; the two ranking activities
// and the legacy map are always included when an entry exists. Order is fixed
// (matches the in-app full-plan export). Notes are never materials and never
// appear here.
export function buildMaterials(
  entries: EntryRow[],
  userName: string,
  reflectionByEntryId: Record<string, string> = {},
): PlanMaterial[] {
  const adminEntry    = entries.find(e => e.document_type === DOCUMENT_TYPE.PERSONAL_ADMIN_INFO)
  const contactsEntry = entries.find(e => e.document_type === DOCUMENT_TYPE.IMPORTANT_CONTACTS)
  const adEntry       = entries.find(e => e.document_type === DOCUMENT_TYPE.ADVANCE_DIRECTIVE_SUPPLEMENT)
  const fwEntry       = entries.find(e => e.document_type === DOCUMENT_TYPE.FUNERAL_WISHES)
  const finEntry      = entries.find(e => e.document_type === DOCUMENT_TYPE.FINANCIAL_INFORMATION)
  const devicesEntry  = entries.find(e => e.document_type === DOCUMENT_TYPE.DEVICES_AND_ACCOUNTS)
  const keepsakeEntry = entries.find(e => e.document_type === DOCUMENT_TYPE.KEEPSAKE_INVENTORY)
  const valuesEntry   = entries.find(e => e.activity === ACTIVITY.VALUES_RANKING)
  const fearsEntry    = entries.find(e => e.activity === ACTIVITY.FEARS_RANKING)
  const legacyEntry   = entries.find(e => e.activity === ACTIVITY.LEGACY_MAP)

  const mats: PlanMaterial[] = []
  if (adEntry && hasAnyStringContent(adEntry.content))             mats.push({ title: 'My Care Wishes', pdfData: buildAdvanceDirectivePDF(adEntry, userName) })
  if (fwEntry && hasAnyStringContent(fwEntry.content))             mats.push({ title: 'Wishes for My Body, Funeral & Ceremony', pdfData: buildFuneralWishesPDF(fwEntry, userName) })
  if (adminEntry && hasAnyStringContent(adminEntry.content))       mats.push({ title: 'Personal Admin Information', pdfData: buildPersonalAdminPDF(adminEntry, userName) })
  if (contactsEntry && hasAnyStringContent(contactsEntry.content)) mats.push({ title: 'Important Contacts', pdfData: buildContactsPDF(contactsEntry, userName) })
  if (finEntry && hasAnyStringContent(finEntry.content))           mats.push({ title: 'Financial Information', pdfData: buildFinancialPDF(finEntry, userName) })
  if (devicesEntry && hasAnyStringContent(devicesEntry.content))   mats.push({ title: 'Devices & Accounts', pdfData: buildDevicesAccountsPDF(devicesEntry, userName) })
  if (keepsakeEntry && hasAnyStringContent(keepsakeEntry.content)) mats.push({ title: 'Keepsakes Inventory', pdfData: buildKeepsakePDF(keepsakeEntry, userName) })
  if (valuesEntry)                                                 mats.push({ title: 'Values Ranking', pdfData: buildValuesRankingPDF(valuesEntry, userName, reflectionByEntryId[valuesEntry.id]) })
  if (fearsEntry)                                                  mats.push({ title: 'Fears Ranking', pdfData: buildFearsRankingPDF(fearsEntry, userName, reflectionByEntryId[fearsEntry.id]) })
  if (legacyEntry)                                                 mats.push({ title: 'Legacy Map', pdfData: buildLegacyMapPDF(legacyEntry, userName, reflectionByEntryId[legacyEntry.id]) })
  return mats
}

// ---------------------------------------------------------------------------
// Summary-page derivation (key details + domain readiness)
//
// These read solely from the DB-backed domain_state (passed in as DomainState)
// plus the user's domain containers and entries. No localStorage — the DB is
// the authoritative source of truth, so the same call produces identical output
// in the browser and in a Node release script.
// ---------------------------------------------------------------------------

export type DomainContainer = { id: string; title: string; domain_code?: string | null }

// Build the plan summary's key-detail rows from DB domain_state + entries.
export function buildKeyDetails(
  domainState: DomainState,
  domains: DomainContainer[],
  entries: EntryRow[],
): PlanKeyDetail[] {
  // Derive syncHasWill / syncHasEOL / careStatus from the JSONB-backed
  // domain_state (no longer from user_metadata).
  const willsDomain      = domains.find(d => d.domain_code === 'wills_estates')
  const healthcareDomain = domains.find(d => d.domain_code === 'healthcare')
  const willVals = willsDomain      ? getCheckboxes(domainState, willsDomain.id,      'legal_will_in_place', 1) : [false]
  const eolVals  = healthcareDomain ? getCheckboxes(domainState, healthcareDomain.id, 'wishes_clear_shared', 2) : [false, false]
  const syncHasWill = willVals[0] === true
  const communicated = eolVals[0] === true
  const documented   = eolVals[1] === true
  const syncHasEOL  = communicated || documented
  const careStatus: string | null =
    communicated && documented ? 'both' :
    communicated ? 'communicated' :
    documented   ? 'documented'   : null

  const adminEntry    = entries.find(e => e.document_type === DOCUMENT_TYPE.PERSONAL_ADMIN_INFO)
  const contactsEntry = entries.find(e => e.document_type === DOCUMENT_TYPE.IMPORTANT_CONTACTS)

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

  // Resting place from domain_state (deathcare domain)
  const deathcareDomain = domains.find(d => d.domain_code === 'deathcare')
  let restingDocumented = false
  let restingShared = false
  if (deathcareDomain) {
    const restVals = getCheckboxes(domainState, deathcareDomain.id, 'final_resting_place_wishes', 3)
    restingDocumented = restVals[0] === true
    restingShared     = restVals[1] === true
  }

  const careLabel = syncHasEOL ? (
    careStatus === 'documented'   ? 'Formally documented' :
    careStatus === 'communicated' ? 'Communicated to decision-maker' :
    careStatus === 'both'         ? 'Documented and communicated' :
    'Documented or communicated'
  ) : null

  const restingValue = (restingDocumented && restingShared) ? 'Documented and shared'
    : restingDocumented ? 'Documented'
    : restingShared     ? 'Shared with people in my life'
    : null

  return [
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
      label: 'Substitute decision-maker',
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
}

// Build the plan summary's per-domain readiness rows from DB domain_state.
// Iterates the canonical DOMAIN_STRUCTURES (all 6 domains) and matches to the
// user's DB domain containers where they exist; status comes from domain_state.
export function buildDomainStatuses(
  domainState: DomainState,
  domains: DomainContainer[],
  userCheckboxes: UserTask[] = [],
): PlanDomainStatus[] {
  return DOMAIN_STRUCTURES.map(def => {
    const dbDomain = domains.find(d => d.domain_code === def.code)
    const { readiness } = def.structure

    // This domain's user tasks, bucketed by row (shared helper so the PDF and the
    // on-screen domain page place tasks identically). `other` = catch-all + stale keys.
    const domainTasks = dbDomain ? userCheckboxes.filter(t => t.domain_id === dbDomain.id) : []
    const { byRow, other } = bucketTasksByRow(domainTasks, readiness.map(r => r.key))

    // Checkbox items grouped under their readiness row title, in definition order;
    // each row's user tasks append after its platform checkboxes (D9 per-row).
    // (The per-checkbox detail list is PDF-only; counts come from the shared
    // computeDomainProgress helper below so every surface agrees.)
    const readinessGroups: PlanReadinessGroup[] = readiness.map(r => {
      const vals = dbDomain
        ? getCheckboxes(domainState, dbDomain.id, r.key, r.checkboxes.length)
        : r.checkboxes.map(() => false)
      return {
        title: r.title,
        items: [
          ...r.checkboxes.map((label, i) => ({ label, checked: vals[i] === true })),
          ...(byRow[r.key] ?? []).map(t => ({ label: t.label, checked: t.checked })),
        ],
      }
    })

    // Trailing "Other tasks" group for catch-all + stale-key tasks (D9).
    if (other.length > 0) {
      readinessGroups.push({
        title: 'Other tasks',
        items: other.map(t => ({ label: t.label, checked: t.checked })),
      })
    }

    // Planning status is per-CHECKBOX (orientation rows are back-end-only and not
    // counted). topicsStarted/totalTopics retain their names for the PlanDomainStatus
    // shape but now carry checked/total from computeDomainProgress, user tasks included.
    const { checked, total } = computeDomainProgress(dbDomain?.id ?? '', def.code, domainState, domainTasks)

    return {
      title: dbDomain?.title ?? def.displayName,
      domainCode: def.code,
      label: qualitativeLabel(checked, total),
      topicsStarted: checked,
      totalTopics: total,
      readinessGroups,
    }
  })
}
