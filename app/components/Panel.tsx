import type React from 'react'

// Reusable interior card/panel for the section-color system. Once a page's section color is
// expressed on its banner, interior cards default to NEUTRAL (a white surface) rather than a
// section-color fill — so the section color reads on the banner, not repeated on every card.
//
// - default:       neutral surface + a faint neutral hairline border.
// - accent={true}: neutral surface + a SECTION-COLORED border/outline (var(--section-accent)) —
//   the recurring "neutral fill, section outline" pattern (scenario paths, "explore other
//   paths", etc.). Never a section-color FILL.
//
// The accent color derives from the section theme (--section-accent, set by the section
// layout), so a Panel is automatically the right color for whichever section it renders in.
// Padding/radius are left to the caller (className/style) since cards vary; only the surface +
// border treatment is standardized here.
export default function Panel({
  accent = false, as: Tag = 'div', className, style, children,
}: {
  accent?: boolean
  as?: React.ElementType
  className?: string
  style?: React.CSSProperties
  children: React.ReactNode
}) {
  return (
    <Tag
      className={className}
      style={{
        background: 'var(--color-surface)',
        color: 'var(--color-midnight)',
        border: accent
          ? '1.5px solid var(--section-accent)'
          : '1px solid rgba(19, 4, 38, 0.10)',
        ...style,
      }}
    >
      {children}
    </Tag>
  )
}
