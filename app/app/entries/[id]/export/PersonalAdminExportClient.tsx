'use client'

import { useEffect, useState } from 'react'
import type { PDFData } from './pdfTypes'

const hv = "'Helvetica Neue', Helvetica, Arial, sans-serif"
const apfel = "'Apfel Grotezk', sans-serif"
const MUTED = 'rgba(26,26,26,0.38)'

type PAContent = Record<string, string | undefined>

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

const LEGAL_FIELDS: { key: string; label: string }[] = [
  { key: 'willLocation',                     label: 'My will is located' },
  { key: 'hasCareDecisionMaker',             label: 'Formally designated decision-maker/s for care' },
  { key: 'careDecisionMakerDocLocation',     label: 'Care decision-maker document is located' },
  { key: 'hasEndOfLifeWishesDoc',            label: 'End-of-life care wishes captured in writing' },
  { key: 'endOfLifeWishesDocLocation',       label: 'End-of-life wishes document is located' },
  { key: 'hasPropertyDecisionMaker',         label: 'Formally designated decision-maker/s for property/finances' },
  { key: 'propertyDecisionMakerDocLocation', label: 'Property decision-maker document is located' },
]

const DOC_NUMS = [1, 2, 3, 4, 5] as const

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function ExportSectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <p style={{
      fontFamily: hv,
      fontSize: 13,
      fontWeight: 600,
      color: '#1A1A1A',
      letterSpacing: '0.01em',
      paddingBottom: 9,
      borderBottom: '1px solid rgba(0,0,0,0.12)',
      marginBottom: 20,
    }}>
      {children}
    </p>
  )
}

function FieldRow({ label, value }: { label: string; value: string | undefined }) {
  if (!value?.trim()) return null
  return (
    <div style={{ marginBottom: 18 }}>
      <p style={{ fontFamily: hv, fontSize: 11, color: '#6B6B6B', marginBottom: 3, letterSpacing: '0.02em' }}>
        {label}
      </p>
      <p style={{ fontFamily: hv, fontSize: 14, color: '#1A1A1A', lineHeight: 1.65, whiteSpace: 'pre-wrap' }}>
        {value.trim()}
      </p>
    </div>
  )
}

function SensitiveInput({
  label, placeholder, value, onChange, isMasked, onMaskChange,
}: {
  label: string; placeholder: string; value: string
  onChange: (v: string) => void; isMasked: boolean; onMaskChange: (m: boolean) => void
}) {
  const [isFocused, setIsFocused] = useState(false)
  const [xHovered, setXHovered] = useState(false)
  const showMasked = isMasked && !isFocused && !!value.trim()

  return (
    <div style={{ marginBottom: 18 }}>
      <p style={{ fontFamily: hv, fontSize: 11, color: '#6B6B6B', marginBottom: 5, letterSpacing: '0.02em' }}>
        {label}
      </p>
      <div style={{ position: 'relative' }}>
        <input
          type="text"
          value={showMasked ? `•••• ${value.slice(-4)}` : value}
          onChange={(e) => { if (!showMasked) onChange(e.target.value) }}
          onFocus={() => { setIsFocused(true); onMaskChange(false) }}
          onBlur={() => { setIsFocused(false); if (value.trim()) onMaskChange(true) }}
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
            onMouseDown={(e) => { e.preventDefault(); onChange(''); onMaskChange(false) }}
            onMouseEnter={() => setXHovered(true)}
            onMouseLeave={() => setXHovered(false)}
            style={{
              position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
              background: 'none', border: 'none', padding: 0, cursor: 'pointer',
              fontSize: 16, lineHeight: 1, display: 'flex', alignItems: 'center',
              color: xHovered ? 'rgba(26,26,26,0.65)' : MUTED,
            }}
            aria-label={`Clear ${label}`}
          >×</button>
        )}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function PersonalAdminExportClient({
  id, content, createdDate, displayTitle, filename,
}: {
  id: string; content: unknown; createdDate: string | null; displayTitle: string; filename: string
}) {
  const [sensitive, setSensitive] = useState({ sin: '', healthCard: '' })
  const [sinMasked, setSinMasked] = useState(false)
  const [healthCardMasked, setHealthCardMasked] = useState(false)
  const [downloading, setDownloading] = useState(false)
  const sessionKey = `nightside_personal_admin_${id}`

  useEffect(() => {
    const raw = sessionStorage.getItem(sessionKey)
    if (!raw) return
    try {
      const parsed = JSON.parse(raw)
      setSensitive(parsed)
      if (parsed.sin?.trim()) setSinMasked(true)
      if (parsed.healthCard?.trim()) setHealthCardMasked(true)
    } catch { /* ignore */ }
  }, [sessionKey])

  const c = (content && typeof content === 'object' ? content : {}) as PAContent

  const bioFields   = BIO_FIELDS.filter(f => c[f.key]?.trim())
  const famFields   = FAMILY_FIELDS.filter(f => c[f.key]?.trim())
  const legalFields = LEGAL_FIELDS.filter(f => c[f.key]?.trim())
  const otherDocs   = DOC_NUMS
    .map(n => ({
      name:         c[`otherDoc${n}Name`],
      location:     c[`otherDoc${n}Location`],
      instructions: c[`otherDoc${n}Instructions`],
    }))
    .filter(d => d.name?.trim() || d.location?.trim() || d.instructions?.trim())

  type PdfSection = {
    label: string
    fields: { label: string; value: string }[]
    docs?: { name?: string; location?: string; instructions?: string }[]
  }

  function buildPDFSections(): PdfSection[] {
    const sections: PdfSection[] = []

    if (bioFields.length > 0) {
      sections.push({
        label: 'Biographical Details',
        fields: bioFields.map(f => ({ label: f.label, value: c[f.key]! })),
      })
    }
    if (famFields.length > 0) {
      sections.push({
        label: 'Family Information',
        fields: famFields.map(f => ({ label: f.label, value: c[f.key]! })),
      })
    }
    const idFields: { label: string; value: string }[] = []
    if (sensitive.sin.trim()) idFields.push({ label: 'Social Insurance Number', value: sensitive.sin })
    if (sensitive.healthCard.trim()) idFields.push({ label: 'Health card number', value: sensitive.healthCard })
    if (idFields.length > 0) {
      sections.push({ label: 'Identification & Health', fields: idFields })
    }
    if (legalFields.length > 0) {
      sections.push({
        label: 'Legal & Decision-Making',
        fields: legalFields.map(f => ({ label: f.label, value: c[f.key]! })),
      })
    }
    if (otherDocs.length > 0) {
      sections.push({ label: 'Other Important Documents', fields: [], docs: otherDocs })
    }
    return sections
  }

  async function handleDownload() {
    setDownloading(true)
    try {
      const pdfData: PDFData = {
        kind: 'personal_admin',
        displayTitle,
        createdDate,
        filename,
        sections: buildPDFSections(),
      }

      const [{ pdf }, { default: ExportPDFDocument }] = await Promise.all([
        import('@react-pdf/renderer'),
        import('./ExportPDFDocument'),
      ])

      const blob = await pdf(<ExportPDFDocument data={pdfData} />).toBlob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${filename}.pdf`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      sessionStorage.removeItem(sessionKey)
      setSensitive({ sin: '', healthCard: '' })
      setSinMasked(false)
      setHealthCardMasked(false)
    } finally {
      setDownloading(false)
    }
  }

  const hasContent = bioFields.length > 0 || famFields.length > 0 ||
    legalFields.length > 0 || otherDocs.length > 0

  return (
    <div className="bg-white min-h-screen">
      <div style={{ maxWidth: 600, margin: '0 auto', padding: '48px 56px' }}>

        {/* Chrome */}
        <div className="no-print" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 }}>
          <a href={`/app/entries/${id}`} style={{ fontFamily: hv, fontSize: 13, color: '#6B6B6B', textDecoration: 'none' }}>
            ← Back
          </a>
          <button
            type="button"
            onClick={handleDownload}
            disabled={downloading}
            style={{
              fontFamily: hv,
              fontSize: 13,
              fontWeight: 500,
              color: downloading ? '#999' : '#1A1A1A',
              background: '#F5F5F5',
              border: '1px solid #DDDDDD',
              borderRadius: 6,
              padding: '8px 16px',
              cursor: downloading ? 'default' : 'pointer',
            }}
          >
            {downloading ? 'Generating…' : 'Download PDF'}
          </button>
        </div>

        {/* Header */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: 12 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/The-Nightside-Wordmark-Black.svg" alt="Nightside" style={{ height: 22 }} />
          </div>
          <div style={{ height: 1, background: 'rgba(0,0,0,0.14)', marginBottom: 16 }} />
        </div>

        {/* Metadata */}
        <div style={{ marginBottom: 20 }}>
          <h1 style={{ fontFamily: apfel, fontSize: 26, fontWeight: 400, color: '#1A1A1A', marginBottom: 6 }}>{displayTitle}</h1>
          {createdDate && <p style={{ fontFamily: hv, fontSize: 12, color: '#6B6B6B' }}>Last saved {createdDate}</p>}
          <p style={{ fontFamily: hv, fontSize: 12, color: '#6B6B6B', marginTop: 6, lineHeight: 1.5 }}>
            This is a record of your responses at the time of your last save. It is not a legal document.
          </p>
        </div>
        <div style={{ height: 1, background: 'rgba(0,0,0,0.14)', marginBottom: 32 }} />

        {!hasContent ? (
          <p style={{ fontFamily: hv, fontSize: 13, color: '#6B6B6B' }}>No content saved yet.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 36 }}>

            {bioFields.length > 0 && (
              <div>
                <ExportSectionHeader>Biographical Details</ExportSectionHeader>
                {bioFields.map(f => <FieldRow key={f.key} label={f.label} value={c[f.key]} />)}
              </div>
            )}

            {famFields.length > 0 && (
              <div>
                <ExportSectionHeader>Family Information</ExportSectionHeader>
                {famFields.map(f => <FieldRow key={f.key} label={f.label} value={c[f.key]} />)}
              </div>
            )}

            <div>
              <ExportSectionHeader>Identification &amp; Health</ExportSectionHeader>
              <SensitiveInput
                label="Social Insurance Number"
                placeholder="Add for this export"
                value={sensitive.sin}
                onChange={(v) => setSensitive(prev => ({ ...prev, sin: v }))}
                isMasked={sinMasked}
                onMaskChange={setSinMasked}
              />
              <SensitiveInput
                label="Health card number"
                placeholder="Add for this export"
                value={sensitive.healthCard}
                onChange={(v) => setSensitive(prev => ({ ...prev, healthCard: v }))}
                isMasked={healthCardMasked}
                onMaskChange={setHealthCardMasked}
              />
            </div>

            {legalFields.length > 0 && (
              <div>
                <ExportSectionHeader>Legal &amp; Decision-Making</ExportSectionHeader>
                {legalFields.map(f => <FieldRow key={f.key} label={f.label} value={c[f.key]} />)}
              </div>
            )}

            {otherDocs.length > 0 && (
              <div>
                <ExportSectionHeader>Other Important Documents</ExportSectionHeader>
                <div>
                  {otherDocs.map((doc, i) => (
                    <div
                      key={i}
                      style={{
                        paddingBottom: i < otherDocs.length - 1 ? 24 : 0,
                        marginBottom: i < otherDocs.length - 1 ? 24 : 0,
                        borderBottom: i < otherDocs.length - 1 ? '1px solid rgba(0,0,0,0.10)' : 'none',
                      }}
                    >
                      {doc.name?.trim() && (
                        <p style={{ fontFamily: hv, fontSize: 14, fontWeight: 600, color: '#1A1A1A', marginBottom: 12, lineHeight: 1.3 }}>
                          {doc.name.trim()}
                        </p>
                      )}
                      <FieldRow label="Location" value={doc.location} />
                      <FieldRow label="Instructions" value={doc.instructions} />
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>
        )}

        {/* Footer */}
        <div style={{ marginTop: 48, paddingTop: 20, borderTop: '1px solid rgba(0,0,0,0.12)', textAlign: 'center' as const }}>
          <p style={{ fontFamily: hv, fontSize: 11, color: '#6B6B6B', lineHeight: 1.5 }}>
            This document was generated from your materials in Nightside Planning Studio.
          </p>
        </div>

      </div>
    </div>
  )
}
