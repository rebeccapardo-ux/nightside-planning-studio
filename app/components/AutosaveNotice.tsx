'use client'

import type { CSSProperties, ReactNode } from 'react'

type Theme = 'light' | 'dark'

type Props = {
  theme?: Theme
  children?: ReactNode
  style?: CSSProperties
}

const COLORS: Record<Theme, string> = {
  light: 'rgba(19,4,38,0.7)',
  dark: 'rgba(248,244,235,0.75)',
}

export default function AutosaveNotice({ theme = 'light', children, style }: Props) {
  return (
    <p
      style={{
        fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif",
        fontSize: 14,
        fontStyle: 'italic',
        lineHeight: 1.5,
        color: COLORS[theme],
        margin: 0,
        ...style,
      }}
    >
      {children ?? 'Notes save automatically to Your Plan.'}
    </p>
  )
}
