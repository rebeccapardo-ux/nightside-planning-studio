// Type markers for the Learn "Relevant Activities and Documents" rows — an activity
// glyph vs a document glyph so the two item types read apart now that both use the
// same bordered-row styling. (Same shapes as the Your Materials item icons.)

export function ActivityIcon({ size = 18, color = '#130426' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0 }} aria-hidden="true">
      <rect x="2" y="2.5" width="12" height="11" rx="1" stroke={color} strokeWidth="1.25" strokeLinejoin="round" />
      <circle cx="5.5" cy="7" r="1.5" fill={color} />
      <circle cx="8.5" cy="9.5" r="1.5" fill={color} />
      <circle cx="11" cy="5.5" r="1.5" fill={color} />
    </svg>
  )
}

export function DocumentIcon({ size = 18, color = '#130426' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0 }} aria-hidden="true">
      <path d="M3 2.5A1.5 1.5 0 0 1 4.5 1H10l3 3v9A1.5 1.5 0 0 1 11.5 14.5h-7A1.5 1.5 0 0 1 3 13V2.5z" stroke={color} strokeWidth="1.25" strokeLinejoin="round" fill="none" />
      <path d="M10 1v3h3" stroke={color} strokeWidth="1.25" strokeLinejoin="round" fill="none" />
      <path d="M5.5 7.5h5M5.5 10h5" stroke={color} strokeWidth="1.25" strokeLinecap="round" />
    </svg>
  )
}
