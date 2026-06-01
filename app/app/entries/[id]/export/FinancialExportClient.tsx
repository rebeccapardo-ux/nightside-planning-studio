'use client'

import { useEffect, useRef, useState } from 'react'
import type { PDFData } from '@/lib/pdf/types'

const hv = "'Helvetica Neue', Helvetica, Arial, sans-serif"
const apfel = "'Apfel Grotezk', sans-serif"

type FinAccountEntry = { id: string; name: string; typeOfAccount?: string; contactInfo?: string }
type FinDebtEntry = { id: string; name: string; type?: string; amount?: string; contactInfo?: string }
type FinancialContent = {
  banking?: FinAccountEntry[]
  investments?: FinAccountEntry[]
  retirement?: FinAccountEntry[]
  debts?: FinDebtEntry[]
}

function toTitleCase(str: string): string {
  return str.trim().split(/\s+/).map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
}

function toSentenceCase(str: string): string {
  const s = str.trim()
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s
}

export default function FinancialExportClient({
  id,
  content,
  createdDate,
  displayTitle,
  filename,
  userName,
}: {
  id: string
  content: unknown
  createdDate: string | null
  displayTitle: string
  filename: string
  userName?: string
}) {
  const [acctNums, setAcctNums] = useState<Record<string, string>>({})
  const [downloading, setDownloading] = useState(false)
  const sessionKey = `nightside_fin_acct_${id}`

  useEffect(() => {
    const raw = sessionStorage.getItem(sessionKey)
    if (raw) {
      try { setAcctNums(JSON.parse(raw)) } catch { /* ignore */ }
    }
  }, [sessionKey])

  const c = (content && typeof content === 'object' ? content : {}) as FinancialContent

  const sections: { label: string; entries: FinAccountEntry[]; isDebt: boolean }[] = [
    { label: 'BANKING & CREDIT',    entries: (c.banking ?? []).filter(e => e.name?.trim()),     isDebt: false },
    { label: 'INVESTMENTS',         entries: (c.investments ?? []).filter(e => e.name?.trim()), isDebt: false },
    { label: 'RETIREMENT & INCOME', entries: (c.retirement ?? []).filter(e => e.name?.trim()),  isDebt: false },
    { label: 'DEBTS & LOANS',       entries: (c.debts ?? []).filter(e => e.name?.trim()),       isDebt: true },
  ].filter(s => s.entries.length > 0) as { label: string; entries: (FinAccountEntry | FinDebtEntry)[]; isDebt: boolean }[]

  async function handleDownload() {
    setDownloading(true)
    try {
      const pdfData: PDFData = {
        kind: 'financial',
        displayTitle,
        createdDate,
        filename,
        banking:     (c.banking     ?? []).filter(e => e.name?.trim()),
        investments: (c.investments ?? []).filter(e => e.name?.trim()),
        retirement:  (c.retirement  ?? []).filter(e => e.name?.trim()),
        debts:       (c.debts       ?? []).filter(e => e.name?.trim()) as FinDebtEntry[],
        acctNums,
      }

      const [{ pdf }, { default: ExportPDFDocument }] = await Promise.all([
        import('@react-pdf/renderer'),
        import('@/lib/pdf/ExportPDFDocument'),
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
      setAcctNums({})
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
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/The-Nightside-Wordmark-Black.svg" alt="Nightside" style={{ height: 22 }} />
            {userName && <span style={{ fontFamily: hv, fontSize: 13, fontWeight: 400, color: 'rgba(19,4,38,0.65)' }}>{userName}</span>}
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

        {sections.length === 0 ? (
          <p style={{ fontFamily: hv, fontSize: 13, color: '#6B6B6B' }}>No content saved yet.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
            {sections.map((section) => (
              <div key={section.label}>
                <p style={{ fontFamily: hv, fontSize: 11, fontWeight: 500, letterSpacing: '0.04em', color: '#444444', textTransform: 'uppercase' as const, borderBottom: '0.5px solid rgba(0,0,0,0.13)', paddingBottom: 6, marginBottom: 12 }}>
                  {section.label}
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  {section.isDebt
                    ? (section.entries as FinDebtEntry[]).map((e) => (
                        <div key={e.id}>
                          <p style={{ fontFamily: hv, fontSize: 14, fontWeight: 600, color: '#1A1A1A', marginBottom: 3, lineHeight: 1.3 }}>
                            {toTitleCase(e.name)}
                          </p>
                          {e.type?.trim() && (
                            <p style={{ fontFamily: hv, fontSize: 12, lineHeight: 1.4, marginBottom: 1 }}>
                              <span style={{ color: '#9A9A9A' }}>Type: </span>
                              <span style={{ color: '#3A3A3A' }}>{toSentenceCase(e.type)}</span>
                            </p>
                          )}
                          {e.amount?.trim() && (
                            <p style={{ fontFamily: hv, fontSize: 12, lineHeight: 1.4, marginBottom: 1 }}>
                              <span style={{ color: '#9A9A9A' }}>Amount: </span>
                              <span style={{ color: '#3A3A3A' }}>{e.amount.trim()}</span>
                            </p>
                          )}
                          {acctNums[e.id]?.trim() && (
                            <p style={{ fontFamily: hv, fontSize: 12, lineHeight: 1.4, marginBottom: 1 }}>
                              <span style={{ color: '#9A9A9A' }}>Account: </span>
                              <span style={{ color: '#3A3A3A' }}>{acctNums[e.id]}</span>
                            </p>
                          )}
                          {e.contactInfo?.trim() && (
                            <p style={{ fontFamily: hv, fontSize: 12, lineHeight: 1.4, marginBottom: 1 }}>
                              <span style={{ color: '#9A9A9A' }}>Contact: </span>
                              <span style={{ color: '#3A3A3A' }}>{toSentenceCase(e.contactInfo)}</span>
                            </p>
                          )}
                        </div>
                      ))
                    : (section.entries as FinAccountEntry[]).map((e) => (
                        <div key={e.id}>
                          <p style={{ fontFamily: hv, fontSize: 14, fontWeight: 600, color: '#1A1A1A', marginBottom: 3, lineHeight: 1.3 }}>
                            {toTitleCase(e.name)}
                          </p>
                          {e.typeOfAccount?.trim() && (
                            <p style={{ fontFamily: hv, fontSize: 12, lineHeight: 1.4, marginBottom: 1 }}>
                              <span style={{ color: '#9A9A9A' }}>Type: </span>
                              <span style={{ color: '#3A3A3A' }}>{toSentenceCase(e.typeOfAccount)}</span>
                            </p>
                          )}
                          {acctNums[e.id]?.trim() && (
                            <p style={{ fontFamily: hv, fontSize: 12, lineHeight: 1.4, marginBottom: 1 }}>
                              <span style={{ color: '#9A9A9A' }}>Account: </span>
                              <span style={{ color: '#3A3A3A' }}>{acctNums[e.id]}</span>
                            </p>
                          )}
                          {e.contactInfo?.trim() && (
                            <p style={{ fontFamily: hv, fontSize: 12, lineHeight: 1.4, marginBottom: 1 }}>
                              <span style={{ color: '#9A9A9A' }}>Contact: </span>
                              <span style={{ color: '#3A3A3A' }}>{toSentenceCase(e.contactInfo)}</span>
                            </p>
                          )}
                        </div>
                      ))
                  }
                </div>
              </div>
            ))}
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
