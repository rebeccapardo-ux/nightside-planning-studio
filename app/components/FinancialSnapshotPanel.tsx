'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

const hv = "'Helvetica Neue', Helvetica, Arial, sans-serif"

export type FinancialAccountLabel = {
  id: string
  label: string
}

export default function FinancialSnapshotPanel({
  entryId,
  accounts,
}: {
  entryId: string
  accounts: FinancialAccountLabel[]
}) {
  const router = useRouter()
  const [values, setValues] = useState<Record<string, string>>({})

  if (accounts.length === 0) return null

  function handleExport() {
    sessionStorage.setItem(`nightside_fin_acct_${entryId}`, JSON.stringify(values))
    router.push(`/app/entries/${entryId}/export`)
  }

  return (
    <div style={{ marginBottom: 32 }}>
      <p style={{ fontFamily: hv, fontSize: 11, fontWeight: 500, letterSpacing: '0.06em', color: 'rgba(26,26,26,0.56)', textTransform: 'uppercase', marginBottom: 16 }}>
        Add details for this document
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {accounts.map((acct) => (
          <div key={acct.id}>
            <label style={{ display: 'block', fontFamily: hv, fontSize: 13, color: 'rgba(26,26,26,0.72)', marginBottom: 6 }}>
              {acct.label}
            </label>
            <input
              type="text"
              value={values[acct.id] ?? ''}
              onChange={(e) => setValues(prev => ({ ...prev, [acct.id]: e.target.value }))}
              placeholder="Enter when preparing document"
              style={{ width: '100%', background: '#FFFFFF', border: '1px solid rgba(26,26,26,0.2)', borderRadius: 8, padding: '10px 12px', fontFamily: hv, fontSize: 14, color: '#1A1A1A', outline: 'none', boxSizing: 'border-box' }}
            />
          </div>
        ))}
      </div>
      <div style={{ height: 1, background: 'rgba(26,26,26,0.1)', margin: '24px 0' }} />
      <button
        type="button"
        onClick={handleExport}
        style={{ fontFamily: hv, fontSize: 14, fontWeight: 500, color: '#1A1A1A', background: 'none', border: 'none', cursor: 'pointer', padding: 0, textDecoration: 'none' }}
      >
        Export as PDF →
      </button>
    </div>
  )
}
