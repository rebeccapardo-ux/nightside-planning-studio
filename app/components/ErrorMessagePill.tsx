'use client'

import type { CSSProperties, ReactNode } from 'react'

type Props = {
  children: ReactNode
  style?: CSSProperties
}

export default function ErrorMessagePill({ children, style }: Props) {
  return (
    <span
      role="status"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        background: '#c0392b',
        color: '#F8F4EB',
        fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif",
        fontSize: 12,
        fontWeight: 600,
        lineHeight: 1.4,
        padding: '4px 10px',
        borderRadius: 999,
        ...style,
      }}
    >
      {children}
    </span>
  )
}
