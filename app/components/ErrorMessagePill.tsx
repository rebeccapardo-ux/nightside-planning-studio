'use client'

import type { CSSProperties, ReactNode } from 'react'
import AlertIcon, { ERROR_COLOR_ON_DARK } from './AlertIcon'

type Props = {
  children: ReactNode
  style?: CSSProperties
  // 'solid'  — self-contained filled pill (#8B0000 + cream). Works on any surface;
  //            used by the voice-note recorder (varied/dark themes).
  // 'inline' — no fill, coral icon + text on dark surfaces; mirrors the "Saved"
  //            status indicator (icon + text, no fill) so it reads as a status, not
  //            a button. Used by the ranking activity banners.
  variant?: 'solid' | 'inline'
}

const FONT = "'Helvetica Neue', Helvetica, Arial, sans-serif"

export default function ErrorMessagePill({ children, style, variant = 'solid' }: Props) {
  if (variant === 'inline') {
    return (
      <span
        role="status"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          color: ERROR_COLOR_ON_DARK,
          fontFamily: FONT,
          fontSize: 11,
          fontWeight: 600,
          lineHeight: 1.4,
          ...style,
        }}
      >
        <AlertIcon color={ERROR_COLOR_ON_DARK} size={12} style={{ verticalAlign: '-2px' }} />
        {children}
      </span>
    )
  }

  return (
    <span
      role="status"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        background: '#8B0000',
        color: '#F8F4EB',
        fontFamily: FONT,
        fontSize: 12,
        fontWeight: 600,
        lineHeight: 1.4,
        padding: '4px 10px',
        borderRadius: 999,
        ...style,
      }}
    >
      <AlertIcon color="#F8F4EB" size={12} style={{ verticalAlign: '-2px' }} />
      {children}
    </span>
  )
}
