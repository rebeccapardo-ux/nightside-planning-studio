'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

const hv = "'Helvetica Neue', Helvetica, Arial, sans-serif"
const MUTED = 'rgba(26,26,26,0.38)'

type C = Record<string, string | undefined>

const NUMS = [1, 2, 3, 4, 5] as const

function sectionTop(isFirst: boolean): React.CSSProperties {
  return {
    fontFamily: hv,
    fontSize: 17,
    fontWeight: 500,
    letterSpacing: '0.04em',
    color: 'rgba(26,26,26,0.85)',
    marginBottom: 16,
    marginTop: isFirst ? 0 : 32,
  }
}

function FieldDisplay({ label, value }: { label: string; value: string | undefined }) {
  if (!value?.trim()) return null
  return (
    <div style={{ marginBottom: 6 }}>
      <p style={{ fontFamily: hv, fontSize: 12, color: 'rgba(26,26,26,0.6)', marginBottom: 3 }}>{label}</p>
      <p style={{ fontFamily: hv, fontSize: 15, color: '#1A1A1A', lineHeight: 1.65, whiteSpace: 'pre-wrap' }}>{value}</p>
    </div>
  )
}

function EntryDivider({ i, total }: { i: number; total: number }): React.CSSProperties {
  return {
    paddingBottom: i < total - 1 ? 24 : 0,
    borderBottom: i < total - 1 ? '1px solid rgba(26,26,26,0.18)' : 'none',
  }
}

export default function DevicesAndAccountsSnapshot({
  entry,
}: {
  entry: { id: string; content: unknown }
}) {
  const router = useRouter()
  const [sensitiveValues, setSensitiveValues] = useState<Record<string, string>>({})
  const [maskedKeys, setMaskedKeys] = useState<Record<string, boolean>>({})

  const c = (entry.content && typeof entry.content === 'object' ? entry.content : {}) as C

  const deviceNums = NUMS.filter(n =>
    c[`device${n}Name`]?.trim() || c[`device${n}LoginAccount`]?.trim() || c[`device${n}Notes`]?.trim()
  )
  const socialNums = NUMS.filter(n =>
    c[`socialMedia${n}Platform`]?.trim() || c[`socialMedia${n}Username`]?.trim() || c[`socialMedia${n}WishesOnDeath`]?.trim()
  )
  const otherNums = NUMS.filter(n =>
    c[`otherAccount${n}Name`]?.trim() || c[`otherAccount${n}Username`]?.trim() || c[`otherAccount${n}Notes`]?.trim()
  )
  const assetNums = NUMS.filter(n =>
    c[`digitalAsset${n}Name`]?.trim() || c[`digitalAsset${n}Location`]?.trim() || c[`digitalAsset${n}Notes`]?.trim()
  )

  const hasAny = deviceNums.length > 0 || socialNums.length > 0 || otherNums.length > 0 || assetNums.length > 0

  function setSensitive(key: string, value: string) {
    setSensitiveValues(prev => ({ ...prev, [key]: value }))
  }

  function setMasked(key: string, masked: boolean) {
    setMaskedKeys(prev => ({ ...prev, [key]: masked }))
  }

  function handleExport() {
    const updates: Record<string, boolean> = {}
    Object.entries(sensitiveValues).forEach(([k, v]) => {
      if (v?.trim()) updates[k] = true
    })
    setMaskedKeys(prev => ({ ...prev, ...updates }))
    sessionStorage.setItem(`nightside_devices_accounts_${entry.id}`, JSON.stringify(sensitiveValues))
    router.push(`/app/entries/${entry.id}/export`)
  }

  if (!hasAny) {
    return <p style={{ fontFamily: hv, fontSize: 14, color: 'rgba(26,26,26,0.85)' }}>No content saved yet.</p>
  }

  // Track which section renders first (for marginTop: 0)
  const shown = [deviceNums.length > 0, socialNums.length > 0, otherNums.length > 0, assetNums.length > 0]
  const firstIdx = shown.indexOf(true)

  return (
    <div>
      {deviceNums.length > 0 && (
        <div>
          <p style={sectionTop(firstIdx === 0)}>Devices</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            {deviceNums.map((n, i) => (
              <div key={n} style={EntryDivider({ i, total: deviceNums.length })}>
                <FieldDisplay label="Device" value={c[`device${n}Name`]} />
                <FieldDisplay label="Account / Login" value={c[`device${n}LoginAccount`]} />
                <SensitiveInput
                  label="Password/PIN"
                  placeholder="Add Password/PIN for this export"
                  value={sensitiveValues[`device${n}`] ?? ''}
                  onChange={(v) => setSensitive(`device${n}`, v)}
                  isMasked={maskedKeys[`device${n}`] ?? false}
                  onMaskChange={(m) => setMasked(`device${n}`, m)}
                />
                <FieldDisplay label="Notes" value={c[`device${n}Notes`]} />
              </div>
            ))}
          </div>
        </div>
      )}

      {socialNums.length > 0 && (
        <div>
          <p style={sectionTop(firstIdx === 1)}>Social media</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            {socialNums.map((n, i) => (
              <div key={n} style={EntryDivider({ i, total: socialNums.length })}>
                <FieldDisplay label="Platform" value={c[`socialMedia${n}Platform`]} />
                <FieldDisplay label="Username" value={c[`socialMedia${n}Username`]} />
                <SensitiveInput
                  label="Password"
                  placeholder="Add password for this export"
                  value={sensitiveValues[`socialMedia${n}`] ?? ''}
                  onChange={(v) => setSensitive(`socialMedia${n}`, v)}
                  isMasked={maskedKeys[`socialMedia${n}`] ?? false}
                  onMaskChange={(m) => setMasked(`socialMedia${n}`, m)}
                />
                <FieldDisplay label="My wishes for this account upon my death" value={c[`socialMedia${n}WishesOnDeath`]} />
              </div>
            ))}
          </div>
        </div>
      )}

      {otherNums.length > 0 && (
        <div>
          <p style={sectionTop(firstIdx === 2)}>Other accounts</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            {otherNums.map((n, i) => (
              <div key={n} style={EntryDivider({ i, total: otherNums.length })}>
                <FieldDisplay label="Account" value={c[`otherAccount${n}Name`]} />
                <FieldDisplay label="Username" value={c[`otherAccount${n}Username`]} />
                <SensitiveInput
                  label="Password"
                  placeholder="Add password for this export"
                  value={sensitiveValues[`otherAccount${n}`] ?? ''}
                  onChange={(v) => setSensitive(`otherAccount${n}`, v)}
                  isMasked={maskedKeys[`otherAccount${n}`] ?? false}
                  onMaskChange={(m) => setMasked(`otherAccount${n}`, m)}
                />
                <FieldDisplay label="Notes" value={c[`otherAccount${n}Notes`]} />
              </div>
            ))}
          </div>
        </div>
      )}

      {assetNums.length > 0 && (
        <div>
          <p style={sectionTop(firstIdx === 3)}>Digital assets</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            {assetNums.map((n, i) => (
              <div key={n} style={EntryDivider({ i, total: assetNums.length })}>
                <FieldDisplay label="Asset" value={c[`digitalAsset${n}Name`]} />
                <SensitiveInput
                  label="Access details"
                  placeholder="Add access details for this export"
                  value={sensitiveValues[`digitalAsset${n}`] ?? ''}
                  onChange={(v) => setSensitive(`digitalAsset${n}`, v)}
                  isMasked={maskedKeys[`digitalAsset${n}`] ?? false}
                  onMaskChange={(m) => setMasked(`digitalAsset${n}`, m)}
                />
                <FieldDisplay label="Location / Platform" value={c[`digitalAsset${n}Location`]} />
                <FieldDisplay label="Notes" value={c[`digitalAsset${n}Notes`]} />
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={{ marginTop: 32 }}>
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
// SensitiveInput — masked editable input
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
    <div style={{ marginTop: 8, marginBottom: 8 }}>
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
