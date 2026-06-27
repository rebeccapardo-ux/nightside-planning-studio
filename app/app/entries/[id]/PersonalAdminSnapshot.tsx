'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

const hv = "'Helvetica Neue', Helvetica, Arial, sans-serif"
const MUTED = 'rgba(26,26,26,0.38)'

type PersonalAdminContent = {
  fullLegalName?: string
  preferredName?: string
  pronouns?: string
  currentAddress?: string
  phoneNumbers?: string
  emails?: string
  dateOfBirth?: string
  placeOfBirth?: string
  parent1LegalName?: string
  parent1PlaceOfBirth?: string
  parent2LegalName?: string
  parent2PlaceOfBirth?: string
  maritalStatus?: string
  spousePartnerLegalName?: string
  numberOfChildren?: string
  childrensFullNames?: string
  otherFamily?: string
  employmentStatus?: string
  employerDetails?: string
  willLocation?: string
  // The has* flags are persisted as booleans (the capture form initializes them
  // to false), NOT strings — calling .trim() on them is what crashed this snapshot.
  hasCareDecisionMaker?: boolean
  careDecisionMakerDocLocation?: string
  hasEndOfLifeWishesDoc?: boolean
  endOfLifeWishesDocLocation?: string
  hasPropertyDecisionMaker?: boolean
  propertyDecisionMakerDocLocation?: string
  otherDoc1Name?: string; otherDoc1Location?: string; otherDoc1Instructions?: string
  otherDoc2Name?: string; otherDoc2Location?: string; otherDoc2Instructions?: string
  otherDoc3Name?: string; otherDoc3Location?: string; otherDoc3Instructions?: string
  otherDoc4Name?: string; otherDoc4Location?: string; otherDoc4Instructions?: string
  otherDoc5Name?: string; otherDoc5Location?: string; otherDoc5Instructions?: string
}

const BIO_FIELDS: { key: keyof PersonalAdminContent; label: string }[] = [
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

const FAMILY_FIELDS: { key: keyof PersonalAdminContent; label: string }[] = [
  { key: 'parent1LegalName',       label: 'Parent / caregiver legal name' },
  { key: 'parent1PlaceOfBirth',    label: 'Parent / caregiver place of birth' },
  { key: 'parent2LegalName',       label: 'Second parent / caregiver legal name' },
  { key: 'parent2PlaceOfBirth',    label: 'Second parent / caregiver place of birth' },
  { key: 'maritalStatus',          label: 'Relationship status for official records' },
  { key: 'spousePartnerLegalName', label: 'Spouse / partner legal name' },
  { key: 'numberOfChildren',       label: 'Number of children' },
  { key: 'childrensFullNames',     label: "Children's full names" },
  { key: 'otherFamily',            label: 'Other family, chosen family, or important relationships' },
]

const LEGAL_FIELDS: { key: keyof PersonalAdminContent; label: string }[] = [
  { key: 'willLocation',                   label: 'My will is located' },
  { key: 'hasCareDecisionMaker',           label: 'Formally designated substitute decision-maker/s for care' },
  { key: 'careDecisionMakerDocLocation',   label: 'Document location' },
  { key: 'hasEndOfLifeWishesDoc',          label: 'End-of-life care wishes captured in writing' },
  { key: 'endOfLifeWishesDocLocation',     label: 'End-of-life wishes document is located' },
  { key: 'hasPropertyDecisionMaker',       label: 'Formally designated decision-maker/s for property/finances' },
  { key: 'propertyDecisionMakerDocLocation', label: 'Property decision-maker document is located' },
]

// Legal keys whose saved value is a boolean flag, displayed as "Yes" when true
// (mirrors buildLegalFields in lib/pdf/buildPlanData.ts). All other legal/bio/
// family fields are free-text strings.
const BOOLEAN_LEGAL_KEYS = new Set<keyof PersonalAdminContent>([
  'hasCareDecisionMaker',
  'hasEndOfLifeWishesDoc',
  'hasPropertyDecisionMaker',
])

// Coerce a saved content value to a trimmed display string, tolerating non-string
// values (booleans, numbers, dirty data) without throwing.
const str = (v: unknown): string => (typeof v === 'string' ? v.trim() : '')

const DOC_NUMS = [1, 2, 3, 4, 5] as const

function FieldDisplay({ label, value }: { label: string; value: string | undefined }) {
  if (!value?.trim()) return null
  return (
    <div style={{ marginBottom: 18 }}>
      <p style={{ fontFamily: hv, fontSize: 12, color: 'rgba(26,26,26,0.65)', marginBottom: 3 }}>
        {label}
      </p>
      <p style={{ fontFamily: hv, fontSize: 15, color: '#1A1A1A', lineHeight: 1.65, whiteSpace: 'pre-wrap' }}>
        {value}
      </p>
    </div>
  )
}

export default function PersonalAdminSnapshot({
  entry,
}: {
  entry: { id: string; content: unknown }
}) {
  const router = useRouter()
  const [sin, setSin] = useState('')
  const [healthCard, setHealthCard] = useState('')
  const [sinMasked, setSinMasked] = useState(false)
  const [healthCardMasked, setHealthCardMasked] = useState(false)

  const c = (entry.content && typeof entry.content === 'object' ? entry.content : {}) as PersonalAdminContent

  function handleExport() {
    if (sin.trim()) setSinMasked(true)
    if (healthCard.trim()) setHealthCardMasked(true)
    sessionStorage.setItem(`nightside_personal_admin_${entry.id}`, JSON.stringify({ sin, healthCard }))
    router.push(`/app/entries/${entry.id}/export`)
  }

  const bioFields = BIO_FIELDS
    .map(f => ({ label: f.label, value: str(c[f.key]) }))
    .filter(f => f.value)
  const famFields = FAMILY_FIELDS
    .map(f => ({ label: f.label, value: str(c[f.key]) }))
    .filter(f => f.value)
  const legalFields = LEGAL_FIELDS
    .map(f => ({
      label: f.label,
      value: BOOLEAN_LEGAL_KEYS.has(f.key)
        ? (c[f.key] === true ? 'Yes' : '')
        : str(c[f.key]),
    }))
    .filter(f => f.value)
  const otherDocs = DOC_NUMS
    .map(n => ({
      name:         str(c[`otherDoc${n}Name`         as keyof PersonalAdminContent]),
      location:     str(c[`otherDoc${n}Location`     as keyof PersonalAdminContent]),
      instructions: str(c[`otherDoc${n}Instructions` as keyof PersonalAdminContent]),
    }))
    .filter(d => d.name || d.location || d.instructions)

  const sectionLabel: React.CSSProperties = {
    fontFamily: hv,
    fontSize: 17,
    fontWeight: 500,
    letterSpacing: '0.04em',
    color: 'rgba(26,26,26,0.85)',
    marginBottom: 16,
    display: 'block',
  }

  return (
    <div>
      {bioFields.length > 0 && (
        <div style={{ marginBottom: 32 }}>
          <p style={sectionLabel}>Biographical details</p>
          {bioFields.map((f, i) => <FieldDisplay key={i} label={f.label} value={f.value} />)}
        </div>
      )}

      {famFields.length > 0 && (
        <div style={{ marginBottom: 32 }}>
          <p style={sectionLabel}>Family information</p>
          {famFields.map((f, i) => <FieldDisplay key={i} label={f.label} value={f.value} />)}
        </div>
      )}

      {/* Identification & Health — always shown */}
      <div style={{ marginBottom: 32 }}>
        <p style={sectionLabel}>Identification &amp; health</p>
        <SensitiveInput
          label="Social Insurance Number"
          placeholder="Add Social Insurance Number for this export"
          value={sin}
          onChange={setSin}
          isMasked={sinMasked}
          onMaskChange={setSinMasked}
        />
        <div style={{ marginTop: 16 }}>
          <SensitiveInput
            label="Health Card Number"
            placeholder="Add Health Card Number for this export"
            value={healthCard}
            onChange={setHealthCard}
            isMasked={healthCardMasked}
            onMaskChange={setHealthCardMasked}
          />
        </div>
      </div>

      {legalFields.length > 0 && (
        <div style={{ marginBottom: 32 }}>
          <p style={sectionLabel}>Legal &amp; decision-making</p>
          {legalFields.map((f, i) => <FieldDisplay key={i} label={f.label} value={f.value} />)}
        </div>
      )}

      {otherDocs.length > 0 && (
        <div style={{ marginBottom: 32 }}>
          <p style={sectionLabel}>Other important documents</p>
          {otherDocs.map((doc, i) => (
            <div
              key={i}
              style={{
                marginBottom: i < otherDocs.length - 1 ? 24 : 0,
                paddingBottom: i < otherDocs.length - 1 ? 24 : 0,
                borderBottom: i < otherDocs.length - 1 ? '1px solid rgba(26,26,26,0.18)' : 'none',
              }}
            >
              {doc.name && (
                <p style={{ fontFamily: hv, fontSize: 15, fontWeight: 500, color: '#1A1A1A', marginBottom: 4 }}>{doc.name}</p>
              )}
              {doc.location && (
                <p style={{ fontFamily: hv, fontSize: 14, color: 'rgba(26,26,26,0.85)', marginBottom: 2 }}>Location: {doc.location}</p>
              )}
              {doc.instructions && (
                <p style={{ fontFamily: hv, fontSize: 14, color: 'rgba(26,26,26,0.85)', lineHeight: 1.55, whiteSpace: 'pre-wrap' }}>Instructions: {doc.instructions}</p>
              )}
            </div>
          ))}
        </div>
      )}

      <div style={{ marginTop: 8 }}>
        <button
          type="button"
          onClick={handleExport}
          style={{
            fontFamily: hv,
            fontSize: 14,
            fontWeight: 500,
            color: '#2C3777',
            background: '#FFFFFF',
            border: '1px solid #2C3777',
            borderRadius: 10,
            padding: '9px 16px',
            cursor: 'pointer',
          }}
        >
          Export as PDF →
        </button>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// SensitiveInput — masked editable input identical to AccountNumberInput
// ---------------------------------------------------------------------------

function SensitiveInput({
  label,
  placeholder,
  value,
  onChange,
  isMasked,
  onMaskChange,
}: {
  label: string
  placeholder: string
  value: string
  onChange: (v: string) => void
  isMasked: boolean
  onMaskChange: (masked: boolean) => void
}) {
  const [isFocused, setIsFocused] = useState(false)
  const [xHovered, setXHovered] = useState(false)

  const showMasked = isMasked && !isFocused && !!value.trim()
  const maskedDisplay = `•••• ${value.slice(-4)}`

  function handleFocus() {
    setIsFocused(true)
    onMaskChange(false)
  }

  function handleBlur() {
    setIsFocused(false)
    if (value.trim()) onMaskChange(true)
  }

  function handleClear(e: React.MouseEvent) {
    e.preventDefault()
    onChange('')
    onMaskChange(false)
  }

  return (
    <div>
      <label style={{ display: 'block', fontFamily: hv, fontSize: 12, color: 'rgba(26,26,26,0.8)', marginBottom: 5 }}>
        {label}
      </label>
      <div style={{ position: 'relative' }}>
        <input
          type="text"
          value={showMasked ? maskedDisplay : value}
          onChange={(e) => { if (!showMasked) onChange(e.target.value) }}
          onFocus={handleFocus}
          onBlur={handleBlur}
          placeholder={placeholder}
          style={{
            width: '100%',
            background: '#FFFFFF',
            border: '1px solid rgba(26,26,26,0.15)',
            borderRadius: 6,
            padding: '9px 12px',
            paddingRight: showMasked ? 32 : 12,
            fontFamily: hv,
            fontSize: 14,
            color: showMasked ? MUTED : '#1A1A1A',
            outline: 'none',
            boxSizing: 'border-box' as const,
          }}
        />
        {showMasked && (
          <button
            type="button"
            onMouseDown={handleClear}
            onMouseEnter={() => setXHovered(true)}
            onMouseLeave={() => setXHovered(false)}
            style={{
              position: 'absolute',
              right: 10,
              top: '50%',
              transform: 'translateY(-50%)',
              background: 'none',
              border: 'none',
              padding: 0,
              cursor: 'pointer',
              fontSize: 16,
              lineHeight: 1,
              color: xHovered ? 'rgba(26,26,26,0.65)' : MUTED,
              display: 'flex',
              alignItems: 'center',
            }}
            aria-label={`Clear ${label}`}
          >
            ×
          </button>
        )}
      </div>
    </div>
  )
}
