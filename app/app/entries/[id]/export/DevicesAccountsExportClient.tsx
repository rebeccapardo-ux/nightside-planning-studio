'use client'

import { useEffect, useState } from 'react'
import type { PDFData } from './pdfTypes'

const hv = "'Helvetica Neue', Helvetica, Arial, sans-serif"
const apfel = "'Apfel Grotezk', sans-serif"
const MUTED = 'rgba(26,26,26,0.38)'

type C = Record<string, string | undefined>
const NUMS = [1, 2, 3, 4, 5] as const

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p style={{
      fontFamily: hv,
      fontSize: 11,
      fontWeight: 500,
      letterSpacing: '0.04em',
      color: '#444444',
      textTransform: 'uppercase' as const,
      borderBottom: '0.5px solid rgba(0,0,0,0.13)',
      paddingBottom: 6,
      marginBottom: 16,
    }}>
      {children}
    </p>
  )
}

function FieldRow({ label, value }: { label: string; value: string | undefined }) {
  if (!value?.trim()) return null
  return (
    <div style={{ marginBottom: 8 }}>
      <p style={{ fontFamily: hv, fontSize: 11, fontWeight: 500, color: '#6B6B6B', marginBottom: 2, lineHeight: 1.3 }}>
        {label}
      </p>
      <p style={{ fontFamily: hv, fontSize: 13, color: '#3A3A3A', lineHeight: 1.55, whiteSpace: 'pre-wrap' }}>
        {value.trim()}
      </p>
    </div>
  )
}

function EntryBlock({ name, isLast, children }: { name: string | undefined; isLast: boolean; children: React.ReactNode }) {
  return (
    <div style={{
      paddingBottom: isLast ? 0 : 24,
      borderBottom: isLast ? 'none' : '1px solid rgba(0,0,0,0.10)',
    }}>
      {name?.trim() && (
        <p style={{ fontFamily: hv, fontSize: 14, fontWeight: 600, color: '#1A1A1A', marginBottom: 10, lineHeight: 1.3 }}>
          {name.trim()}
        </p>
      )}
      {children}
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
    <div style={{ marginBottom: 8 }}>
      <p style={{ fontFamily: hv, fontSize: 11, fontWeight: 500, color: '#6B6B6B', marginBottom: 2, lineHeight: 1.3 }}>
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
            padding: '8px 12px',
            paddingRight: showMasked ? 32 : 12,
            fontFamily: hv,
            fontSize: 13,
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

export default function DevicesAccountsExportClient({
  id, content, createdDate, displayTitle, filename, userName,
}: {
  id: string; content: unknown; createdDate: string | null; displayTitle: string; filename: string; userName?: string
}) {
  const [sensitiveValues, setSensitiveValues] = useState<Record<string, string>>({})
  const [maskedKeys, setMaskedKeys] = useState<Record<string, boolean>>({})
  const [downloading, setDownloading] = useState(false)
  const sessionKey = `nightside_devices_accounts_${id}`

  useEffect(() => {
    const raw = sessionStorage.getItem(sessionKey)
    if (!raw) return
    try {
      const parsed = JSON.parse(raw) as Record<string, string>
      setSensitiveValues(parsed)
      const masked: Record<string, boolean> = {}
      Object.entries(parsed).forEach(([k, v]) => { if (v?.trim()) masked[k] = true })
      setMaskedKeys(masked)
    } catch { /* ignore */ }
  }, [sessionKey])

  const c = (content && typeof content === 'object' ? content : {}) as C

  const deviceNums  = NUMS.filter(n => c[`device${n}Name`]?.trim()        || c[`device${n}LoginAccount`]?.trim()   || c[`device${n}Notes`]?.trim())
  const socialNums  = NUMS.filter(n => c[`socialMedia${n}Platform`]?.trim() || c[`socialMedia${n}Username`]?.trim()  || c[`socialMedia${n}WishesOnDeath`]?.trim())
  const otherNums   = NUMS.filter(n => c[`otherAccount${n}Name`]?.trim()   || c[`otherAccount${n}Username`]?.trim()  || c[`otherAccount${n}Notes`]?.trim())
  const assetNums   = NUMS.filter(n => c[`digitalAsset${n}Name`]?.trim()   || c[`digitalAsset${n}Location`]?.trim()  || c[`digitalAsset${n}Notes`]?.trim())

  function setSensitive(key: string, value: string) {
    setSensitiveValues(prev => ({ ...prev, [key]: value }))
  }
  function setMasked(key: string, masked: boolean) {
    setMaskedKeys(prev => ({ ...prev, [key]: masked }))
  }

  async function handleDownload() {
    setDownloading(true)
    try {
      type PdfEntry = { name: string; fields: { label: string; value: string }[] }
      type PdfSection = { label: string; entries: PdfEntry[] }
      const sections: PdfSection[] = []

      if (deviceNums.length > 0) {
        sections.push({ label: 'Devices', entries: deviceNums.map(n => {
          const fields: { label: string; value: string }[] = []
          if (c[`device${n}LoginAccount`]?.trim()) fields.push({ label: 'Login account', value: c[`device${n}LoginAccount`]! })
          if (sensitiveValues[`device${n}`]?.trim()) fields.push({ label: 'Password / PIN', value: sensitiveValues[`device${n}`] })
          if (c[`device${n}Notes`]?.trim()) fields.push({ label: 'Notes', value: c[`device${n}Notes`]! })
          return { name: c[`device${n}Name`]?.trim() || 'Device', fields }
        })})
      }
      if (socialNums.length > 0) {
        sections.push({ label: 'Social media', entries: socialNums.map(n => {
          const fields: { label: string; value: string }[] = []
          if (c[`socialMedia${n}Username`]?.trim()) fields.push({ label: 'Username', value: c[`socialMedia${n}Username`]! })
          if (sensitiveValues[`socialMedia${n}`]?.trim()) fields.push({ label: 'Password', value: sensitiveValues[`socialMedia${n}`] })
          if (c[`socialMedia${n}WishesOnDeath`]?.trim()) fields.push({ label: 'My wishes upon death', value: c[`socialMedia${n}WishesOnDeath`]! })
          return { name: c[`socialMedia${n}Platform`]?.trim() || 'Account', fields }
        })})
      }
      if (otherNums.length > 0) {
        sections.push({ label: 'Other accounts', entries: otherNums.map(n => {
          const fields: { label: string; value: string }[] = []
          if (c[`otherAccount${n}Username`]?.trim()) fields.push({ label: 'Username', value: c[`otherAccount${n}Username`]! })
          if (sensitiveValues[`otherAccount${n}`]?.trim()) fields.push({ label: 'Password', value: sensitiveValues[`otherAccount${n}`] })
          if (c[`otherAccount${n}Notes`]?.trim()) fields.push({ label: 'Notes', value: c[`otherAccount${n}Notes`]! })
          return { name: c[`otherAccount${n}Name`]?.trim() || 'Account', fields }
        })})
      }
      if (assetNums.length > 0) {
        sections.push({ label: 'Digital assets', entries: assetNums.map(n => {
          const fields: { label: string; value: string }[] = []
          if (c[`digitalAsset${n}Location`]?.trim()) fields.push({ label: 'Location / Platform', value: c[`digitalAsset${n}Location`]! })
          if (sensitiveValues[`digitalAsset${n}`]?.trim()) fields.push({ label: 'Access details', value: sensitiveValues[`digitalAsset${n}`] })
          if (c[`digitalAsset${n}Notes`]?.trim()) fields.push({ label: 'Notes', value: c[`digitalAsset${n}Notes`]! })
          return { name: c[`digitalAsset${n}Name`]?.trim() || 'Asset', fields }
        })})
      }

      const pdfData: PDFData = { kind: 'devices_accounts', displayTitle, createdDate, filename, sections }

      const [{ pdf }, { default: ExportPDFDocument }] = await Promise.all([
        import('@react-pdf/renderer'),
        import('./ExportPDFDocument'),
      ])
      const blob = await pdf(<ExportPDFDocument data={pdfData} />).toBlob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url; a.download = `${filename}.pdf`
      document.body.appendChild(a); a.click()
      document.body.removeChild(a); URL.revokeObjectURL(url)
      sessionStorage.removeItem(sessionKey)
      setSensitiveValues({}); setMaskedKeys({})
    } finally {
      setDownloading(false)
    }
  }

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
              fontFamily: hv, fontSize: 13, fontWeight: 500,
              color: downloading ? '#999' : '#1A1A1A',
              background: '#F5F5F5', border: '1px solid #DDDDDD', borderRadius: 6,
              padding: '8px 16px', cursor: downloading ? 'default' : 'pointer',
            }}
          >
            {downloading ? 'Generating…' : 'Download PDF'}
          </button>
        </div>

        {/* Header */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/The-Nightside-Wordmark-Black.svg" alt="Nightside" style={{ height: 22 }} />
            {userName && <span style={{ fontFamily: hv, fontSize: 13, fontWeight: 400, color: 'rgba(19,4,38,0.5)' }}>{userName}</span>}
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
        <div style={{ height: 1, background: 'rgba(0,0,0,0.14)', marginBottom: 28 }} />

        {deviceNums.length === 0 && socialNums.length === 0 && otherNums.length === 0 && assetNums.length === 0 ? (
          <p style={{ fontFamily: hv, fontSize: 13, color: '#6B6B6B' }}>No content saved yet.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 36 }}>

            {deviceNums.length > 0 && (
              <div>
                <SectionLabel>Devices</SectionLabel>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                  {deviceNums.map((n, i) => (
                    <EntryBlock key={n} name={c[`device${n}Name`]} isLast={i === deviceNums.length - 1}>
                      <FieldRow label="Login account" value={c[`device${n}LoginAccount`]} />
                      <SensitiveInput
                        label="Password / PIN" placeholder="Add for this export"
                        value={sensitiveValues[`device${n}`] ?? ''}
                        onChange={(v) => setSensitive(`device${n}`, v)}
                        isMasked={maskedKeys[`device${n}`] ?? false}
                        onMaskChange={(m) => setMasked(`device${n}`, m)}
                      />
                      <FieldRow label="Notes" value={c[`device${n}Notes`]} />
                    </EntryBlock>
                  ))}
                </div>
              </div>
            )}

            {socialNums.length > 0 && (
              <div>
                <SectionLabel>Social media</SectionLabel>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                  {socialNums.map((n, i) => (
                    <EntryBlock key={n} name={c[`socialMedia${n}Platform`]} isLast={i === socialNums.length - 1}>
                      <FieldRow label="Username" value={c[`socialMedia${n}Username`]} />
                      <SensitiveInput
                        label="Password" placeholder="Add for this export"
                        value={sensitiveValues[`socialMedia${n}`] ?? ''}
                        onChange={(v) => setSensitive(`socialMedia${n}`, v)}
                        isMasked={maskedKeys[`socialMedia${n}`] ?? false}
                        onMaskChange={(m) => setMasked(`socialMedia${n}`, m)}
                      />
                      <FieldRow label="My wishes upon death" value={c[`socialMedia${n}WishesOnDeath`]} />
                    </EntryBlock>
                  ))}
                </div>
              </div>
            )}

            {otherNums.length > 0 && (
              <div>
                <SectionLabel>Other accounts</SectionLabel>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                  {otherNums.map((n, i) => (
                    <EntryBlock key={n} name={c[`otherAccount${n}Name`]} isLast={i === otherNums.length - 1}>
                      <FieldRow label="Username" value={c[`otherAccount${n}Username`]} />
                      <SensitiveInput
                        label="Password" placeholder="Add for this export"
                        value={sensitiveValues[`otherAccount${n}`] ?? ''}
                        onChange={(v) => setSensitive(`otherAccount${n}`, v)}
                        isMasked={maskedKeys[`otherAccount${n}`] ?? false}
                        onMaskChange={(m) => setMasked(`otherAccount${n}`, m)}
                      />
                      <FieldRow label="Notes" value={c[`otherAccount${n}Notes`]} />
                    </EntryBlock>
                  ))}
                </div>
              </div>
            )}

            {assetNums.length > 0 && (
              <div>
                <SectionLabel>Digital assets</SectionLabel>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                  {assetNums.map((n, i) => (
                    <EntryBlock key={n} name={c[`digitalAsset${n}Name`]} isLast={i === assetNums.length - 1}>
                      <FieldRow label="Location / Platform" value={c[`digitalAsset${n}Location`]} />
                      <SensitiveInput
                        label="Access details" placeholder="Add for this export"
                        value={sensitiveValues[`digitalAsset${n}`] ?? ''}
                        onChange={(v) => setSensitive(`digitalAsset${n}`, v)}
                        isMasked={maskedKeys[`digitalAsset${n}`] ?? false}
                        onMaskChange={(m) => setMasked(`digitalAsset${n}`, m)}
                      />
                      <FieldRow label="Notes" value={c[`digitalAsset${n}Notes`]} />
                    </EntryBlock>
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
