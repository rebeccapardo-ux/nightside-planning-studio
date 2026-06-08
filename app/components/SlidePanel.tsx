'use client'

import { useEffect } from 'react'

const hv = "'Helvetica Neue', Helvetica, Arial, sans-serif"

export default function SlidePanel({
  open,
  onClose,
  title,
  children,
  headerAction,
}: {
  open: boolean
  onClose: () => void
  title: string
  children: React.ReactNode
  headerAction?: React.ReactNode
}) {
  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prevOverflow
    }
  }, [open, onClose])

  if (!open) return null

  return (
    <>
      <div
        onClick={onClose}
        style={{ position: 'fixed', inset: 0, background: 'rgba(19,4,38,0.30)', zIndex: 50 }}
        aria-hidden
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        style={{
          position: 'fixed', top: 0, right: 0, bottom: 0, width: 440, maxWidth: '92vw',
          background: '#F8F4EB', zIndex: 51, overflowY: 'auto',
          boxShadow: '-4px 0 28px rgba(0,0,0,0.14)',
          padding: '28px 26px 56px',
          fontFamily: hv,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
            <h2 style={{ fontFamily: hv, fontSize: 20, fontWeight: 600, color: '#130426', margin: 0, lineHeight: 1.3 }}>
              {title}
            </h2>
            {headerAction}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            style={{
              flexShrink: 0,
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              padding: 4,
              marginTop: -2,
              color: '#130426',
              fontSize: 22,
              lineHeight: 1,
            }}
            className="hover:opacity-60 transition-opacity"
          >
            ×
          </button>
        </div>
        {children}
      </div>
    </>
  )
}
