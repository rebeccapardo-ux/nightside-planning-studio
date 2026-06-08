'use client'

import { useEffect, useRef, useState } from 'react'

const hv = "'Helvetica Neue', Helvetica, Arial, sans-serif"

// Small ⓘ affordance next to a header. Desktop: hover shows / mouse-out hides.
// Mobile (touch): tap toggles a dismissible popover (click-outside + Escape close).
// Dark popover (#130426 / light text) reads on every panel background.
export default function InfoTooltip({
  text,
  label = 'More information',
}: {
  text: string
  label?: string
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    if (!open) return
    function onDocPointer(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onDocPointer)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDocPointer)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <span
      ref={ref}
      style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}
      // Hover only for non-touch pointers; touch uses the click toggle below.
      onPointerEnter={(e) => { if (e.pointerType !== 'touch') setOpen(true) }}
      onPointerLeave={(e) => { if (e.pointerType !== 'touch') setOpen(false) }}
    >
      <button
        type="button"
        aria-label={label}
        aria-expanded={open}
        onClick={(e) => { e.stopPropagation(); setOpen((v) => !v) }}
        style={{
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          width: 18, height: 18, borderRadius: '50%', flexShrink: 0,
          border: '1.5px solid rgba(19,4,38,0.45)',
          background: 'transparent', color: 'rgba(19,4,38,0.70)',
          fontFamily: hv, fontSize: 12, fontWeight: 600,
          lineHeight: 1, cursor: 'pointer', padding: 0,
        }}
        className="hover:opacity-70 transition-opacity"
      >
        i
      </button>
      {open && (
        <span
          role="tooltip"
          style={{
            position: 'absolute', top: 'calc(100% + 8px)', left: 0, zIndex: 60,
            width: 268, maxWidth: '80vw',
            background: '#130426', color: '#F8F4EB',
            borderRadius: 10, padding: '12px 14px',
            fontFamily: hv, fontSize: 13, lineHeight: '19px', fontWeight: 400,
            boxShadow: '0 6px 20px rgba(0,0,0,0.22)',
            textAlign: 'left', whiteSpace: 'normal', cursor: 'default',
          }}
        >
          {text}
        </span>
      )}
    </span>
  )
}
