'use client'

import { useState } from 'react'
import type { PDFData } from '@/lib/pdf/types'

const hv = "'Helvetica Neue', Helvetica, Arial, sans-serif"

export default function DownloadPDFButton({ data }: { data: PDFData }) {
  const [loading, setLoading] = useState(false)

  async function handleDownload() {
    setLoading(true)
    try {
      const [{ pdf }, { default: ExportPDFDocument }] = await Promise.all([
        import('@react-pdf/renderer'),
        import('@/lib/pdf/ExportPDFDocument'),
      ])
      const blob = await pdf(<ExportPDFDocument data={data} />).toBlob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${data.filename}.pdf`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      onClick={handleDownload}
      disabled={loading}
      style={{
        fontFamily: hv,
        fontSize: 13,
        fontWeight: 500,
        color: loading ? '#999' : '#1A1A1A',
        background: '#F5F5F5',
        border: '1px solid #DDDDDD',
        borderRadius: 6,
        padding: '8px 16px',
        cursor: loading ? 'default' : 'pointer',
      }}
    >
      {loading ? 'Generating…' : 'Download PDF'}
    </button>
  )
}
