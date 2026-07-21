'use client'

import Link from 'next/link'

const fontHelvetica = "'HelveticaNeue-Regular', 'Helvetica Neue', Helvetica, Arial, sans-serif"
const fontHelveticaMedium = "'HelveticaNeue-Medium', 'Helvetica Neue', Helvetica, Arial, sans-serif"

export type BreadcrumbItem = {
  label: string
  href?: string
  onClick?: () => void
}

type BreadcrumbsProps = {
  items: BreadcrumbItem[]
  theme?: 'light' | 'navy'
}

export default function Breadcrumbs({ items, theme = 'light' }: BreadcrumbsProps) {
  const isNavy = theme === 'navy'
  const linkColor = isNavy ? 'rgba(255,255,255,0.75)' : 'rgba(26,26,26,0.7)'
  const currentColor = isNavy ? '#FFFFFF' : '#1A1A1A'
  const separatorColor = isNavy ? 'rgba(255,255,255,0.45)' : 'rgba(26,26,26,0.35)'
  const hoverClass = isNavy ? 'hover:text-[#BBABF4]' : 'hover:text-[#2C3777]'

  return (
    <nav aria-label="Breadcrumb" className="ns-breadcrumbs">
      <ol style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '6px', listStyle: 'none', margin: 0, padding: 0 }}>
        {items.map((item, i) => {
          const isLast = i === items.length - 1
          const isLinked = !isLast && (!!item.href || !!item.onClick)

          return (
            <li key={i} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              {isLinked && item.href ? (
                <Link
                  href={item.href}
                  className={`transition-colors ${hoverClass}`}
                  style={{ fontFamily: fontHelvetica, fontSize: '14px', color: linkColor, textDecoration: 'none' }}
                >
                  {item.label}
                </Link>
              ) : isLinked && item.onClick ? (
                <button
                  type="button"
                  onClick={item.onClick}
                  className={`transition-colors ${hoverClass}`}
                  style={{ fontFamily: fontHelvetica, fontSize: '14px', color: linkColor, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                >
                  {item.label}
                </button>
              ) : (
                // Last item = current page (emphasized). A non-last item with no href/onClick
                // (e.g. a section label that has no page to link to) renders muted, like a link,
                // so only the current page reads as emphasized.
                <span
                  aria-current={isLast ? 'page' : undefined}
                  style={{ fontFamily: isLast ? fontHelveticaMedium : fontHelvetica, fontSize: '14px', color: isLast ? currentColor : linkColor }}
                >
                  {item.label}
                </span>
              )}
              {!isLast && (
                <span aria-hidden="true" style={{ color: separatorColor, fontFamily: fontHelvetica, fontSize: '14px', userSelect: 'none' }}>
                  /
                </span>
              )}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
