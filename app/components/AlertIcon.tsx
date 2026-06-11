import type { CSSProperties } from 'react'

// Exclamation-in-circle status icon for error states. Mirrors the circle motif of the
// "Saved" checkmark indicator (same r=6 / strokeWidth 1.3) but with an exclamation, so
// errors read as a status/alert — not a button. Inline-block + vertical-align so it
// works inside plain `display: inline` status spans (the capture export-bar CSS forces
// inline), not just flex layouts.
export default function AlertIcon({
  color = 'currentColor',
  size = 12,
  style,
}: {
  color?: string
  size?: number
  style?: CSSProperties
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 14 14"
      fill="none"
      aria-hidden="true"
      style={{ display: 'inline-block', verticalAlign: '-2px', flexShrink: 0, marginRight: 4, ...style }}
    >
      <circle cx="7" cy="7" r="6" stroke={color} strokeWidth="1.3" />
      <path d="M7 3.9V7.6" stroke={color} strokeWidth="1.4" strokeLinecap="round" />
      <circle cx="7" cy="10.1" r="0.75" fill={color} />
    </svg>
  )
}

// The AA-verified error colors (see the error-message work):
//   onLight  #8B0000 — 8.8:1 on cream #F8F4EB, 4.7:1 on the lavender capture bg #BBABF4
//            (a notch darker than the auth-page form red #c0392b, which fails on #BBABF4)
//   onDark   #FF8E7A — 8.8:1 on #130426, 4.9:1 on #2C3777 (the dark ranking/prompt banners)
export const ERROR_COLOR_ON_LIGHT = '#8B0000'
export const ERROR_COLOR_ON_DARK = '#FF8E7A'
