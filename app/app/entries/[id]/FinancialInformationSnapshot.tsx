'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

const hv = "'Helvetica Neue', Helvetica, Arial, sans-serif"
const MUTED = 'rgba(26,26,26,0.38)'

type AccountEntry = { id: string; name: string; typeOfAccount: string; contactInfo: string }
type DebtEntry = { id: string; name: string; type: string; amount: string; contactInfo: string }

function hasAccountContent(e: AccountEntry) {
  return !!(e.name?.trim() || e.typeOfAccount?.trim() || e.contactInfo?.trim())
}

function hasDebtContent(e: DebtEntry) {
  return !!(e.name?.trim() || e.type?.trim() || e.amount?.trim() || e.contactInfo?.trim())
}

const sectionLabelStyle = {
  fontFamily: hv,
  fontSize: 17,
  fontWeight: 500,
  letterSpacing: '0.04em',
  color: 'rgba(26,26,26,0.85)',
  textTransform: 'none' as const,
  marginBottom: 16,
}

export default function FinancialInformationSnapshot({
  entry,
}: {
  entry: { id: string; content: unknown }
}) {
  const router = useRouter()
  const [acctNums, setAcctNums] = useState<Record<string, string>>({})
  const [maskedNums, setMaskedNums] = useState<Record<string, boolean>>({})

  const content = entry.content as Record<string, unknown> | null
  if (!content) return <p style={{ fontFamily: hv, fontSize: 14, color: 'rgba(26,26,26,0.85)' }}>No content saved yet.</p>

  const accountSections: { key: string; label: string; entries: AccountEntry[] }[] = [
    { key: 'banking',     label: 'Banking and credit',    entries: ((content.banking     as AccountEntry[]) ?? []).filter(hasAccountContent) },
    { key: 'investments', label: 'Investments',           entries: ((content.investments as AccountEntry[]) ?? []).filter(hasAccountContent) },
    { key: 'retirement',  label: 'Retirement and income', entries: ((content.retirement  as AccountEntry[]) ?? []).filter(hasAccountContent) },
  ]
  const debtEntries: DebtEntry[] = ((content.debts as DebtEntry[]) ?? []).filter(hasDebtContent)

  const hasAny = accountSections.some(s => s.entries.length > 0) || debtEntries.length > 0
  if (!hasAny) return <p style={{ fontFamily: hv, fontSize: 14, color: 'rgba(26,26,26,0.85)' }}>No content saved yet.</p>

  function handleExport() {
    // Mask any fields that have values but haven't been blurred
    const updates: Record<string, boolean> = {}
    const allEntries = [...accountSections.flatMap(s => s.entries), ...debtEntries]
    allEntries.forEach(e => {
      if (acctNums[e.id]?.trim()) updates[e.id] = true
    })
    setMaskedNums(prev => ({ ...prev, ...updates }))

    sessionStorage.setItem(`nightside_fin_acct_${entry.id}`, JSON.stringify(acctNums))
    router.push(`/app/entries/${entry.id}/export`)
  }

  function setMasked(id: string, masked: boolean) {
    setMaskedNums(prev => ({ ...prev, [id]: masked }))
  }

  let first = true

  return (
    <div>
      {accountSections.map(({ key, label, entries }) => {
        if (entries.length === 0) return null
        const isFirst = first; first = false
        return (
          <div key={key}>
            <p style={{ ...sectionLabelStyle, marginTop: isFirst ? 0 : 32 }}>{label}</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
              {entries.map((e, i) => (
                <div
                  key={e.id || i}
                  style={{
                    paddingBottom: i < entries.length - 1 ? 24 : 0,
                    borderBottom: i < entries.length - 1 ? '1px solid rgba(26,26,26,0.18)' : 'none',
                  }}
                >
                  {e.name?.trim() && <p style={{ fontFamily: hv, fontSize: 15, fontWeight: 500, color: '#1A1A1A' }}>{e.name}</p>}
                  {e.typeOfAccount?.trim() && <p style={{ fontFamily: hv, fontSize: 14, color: 'rgba(26,26,26,0.85)' }}>{e.typeOfAccount}</p>}
                  <AccountNumberInput
                    value={acctNums[e.id] ?? ''}
                    onChange={(v) => setAcctNums(prev => ({ ...prev, [e.id]: v }))}
                    isMasked={maskedNums[e.id] ?? false}
                    onMaskChange={(m) => setMasked(e.id, m)}
                  />
                  {e.contactInfo?.trim() && <p style={{ fontFamily: hv, fontSize: 14, color: 'rgba(26,26,26,0.85)', whiteSpace: 'pre-wrap', marginTop: 4 }}>{e.contactInfo}</p>}
                </div>
              ))}
            </div>
          </div>
        )
      })}

      {debtEntries.length > 0 && (
        <div>
          <p style={{ ...sectionLabelStyle, marginTop: first ? 0 : 32 }}>Debts and loans</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            {debtEntries.map((e, i) => (
              <div
                key={e.id || i}
                style={{
                  paddingBottom: i < debtEntries.length - 1 ? 24 : 0,
                  borderBottom: i < debtEntries.length - 1 ? '1px solid rgba(26,26,26,0.18)' : 'none',
                }}
              >
                {e.name?.trim() && <p style={{ fontFamily: hv, fontSize: 15, fontWeight: 500, color: '#1A1A1A' }}>{e.name}</p>}
                {e.type?.trim() && <p style={{ fontFamily: hv, fontSize: 14, color: 'rgba(26,26,26,0.85)' }}>{e.type}</p>}
                {e.amount?.trim() && <p style={{ fontFamily: hv, fontSize: 14, color: 'rgba(26,26,26,0.85)' }}>Amount: {e.amount}</p>}
                <AccountNumberInput
                  value={acctNums[e.id] ?? ''}
                  onChange={(v) => setAcctNums(prev => ({ ...prev, [e.id]: v }))}
                  isMasked={maskedNums[e.id] ?? false}
                  onMaskChange={(m) => setMasked(e.id, m)}
                />
                {e.contactInfo?.trim() && <p style={{ fontFamily: hv, fontSize: 14, color: 'rgba(26,26,26,0.85)', whiteSpace: 'pre-wrap', marginTop: 4 }}>{e.contactInfo}</p>}
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

function AccountNumberInput({
  value,
  onChange,
  isMasked,
  onMaskChange,
}: {
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
    <div style={{ marginTop: 8 }}>
      <label style={{ display: 'block', fontFamily: hv, fontSize: 12, color: 'rgba(26,26,26,0.8)', marginBottom: 5 }}>
        Account number
      </label>
      <div style={{ position: 'relative' }}>
        <input
          type="text"
          value={showMasked ? maskedDisplay : value}
          onChange={(e) => { if (!showMasked) onChange(e.target.value) }}
          onFocus={handleFocus}
          onBlur={handleBlur}
          placeholder="Add account number for this export"
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
            aria-label="Clear account number"
          >
            ×
          </button>
        )}
      </div>
    </div>
  )
}
