'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

// ---------------------------------------------------------------------------
// Nav theme definitions
// ---------------------------------------------------------------------------

type NavTheme = 'dark' | 'light'

type RouteThemeEntry = {
  prefix: string
  exact?: boolean   // if true, only matches exact pathname (not sub-routes)
  theme: NavTheme   // determines wordmark + link colors
  navBg: string     // Tailwind bg class for the nav bar
}

type NavStyle = {
  border: string
  wordmark: string
  link: string
  subtitle: string
  divider: string
}

const NAV_STYLES: Record<NavTheme, NavStyle> = {
  dark: {
    border: 'border-[#f8f4eb]/10',
    wordmark: '/The-Nightside-Wordmark-White.svg',
    link: 'text-[#f8f4eb]/80 hover:text-[#f8f4eb]',
    subtitle: '#ffffff',
    divider: 'rgba(255,255,255,0.4)',
  },
  light: {
    border: 'border-[#130426]/10',
    wordmark: '/The-Nightside-Wordmark-Black.svg',
    link: 'text-[#130426]/70 hover:text-[#130426]',
    subtitle: '#130426',
    divider: 'rgba(26,26,26,0.3)',
  },
}

// ---------------------------------------------------------------------------
// Route → nav theme map
//
// Rules:
// - Matching is prefix-based by default; most specific match wins.
// - Set exact: true to restrict a theme to that exact path only
//   (sub-routes will fall through to the next match or default).
// - Default (no match): dark nav, bg-[#130426]
// ---------------------------------------------------------------------------

// Default nav is visibly lighter than the page bg (#130426)
// so every page has nav ≠ page background.
const DEFAULT_ENTRY: RouteThemeEntry = {
  prefix: '/',
  theme: 'light',
  navBg: 'bg-[#F8F4EB]',
}

const ROUTE_THEME_MAP: RouteThemeEntry[] = [
  // Materials + Domains share a navy nav to complement their dark page bg
  { prefix: '/app/materials', theme: 'dark',  navBg: 'bg-[#2C3777]' },
  { prefix: '/app/domains',   theme: 'dark',  navBg: 'bg-[#2C3777]' },

  // Entries / snapshot pages — same navy as materials for continuity
  { prefix: '/app/entries',   theme: 'dark',  navBg: 'bg-[#2C3777]' },

  // App homepage — navy nav, exact match only
  { prefix: '/app',         exact: true, theme: 'dark',  navBg: 'bg-[#2C3777]' },

  // Reflect/Explore landing: cream nav — exact match only,
  // so sub-pages fall through to default nav.
  { prefix: '/app/explore', exact: true, theme: 'light', navBg: 'bg-[#f8f4eb]' },
  { prefix: '/app/reflect',  exact: true, theme: 'light', navBg: 'bg-[#f8f4eb]' },
]

function getNavEntry(pathname: string): RouteThemeEntry {
  const sorted = [...ROUTE_THEME_MAP].sort((a, b) => b.prefix.length - a.prefix.length)

  for (const entry of sorted) {
    if (entry.exact) {
      if (pathname === entry.prefix) return entry
    } else {
      if (pathname.startsWith(entry.prefix)) return entry
    }
  }

  return DEFAULT_ENTRY
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const NAV_LINKS = [
  { href: '/app/explore',   label: 'Reflect' },
  { href: '/app/learn',     label: 'Learn' },
  { href: '/app/materials', label: 'Plan' },
]

export default function GlobalNav() {
  const pathname = usePathname()
  const entry = getNavEntry(pathname)
  const style = NAV_STYLES[entry.theme]

  return (
    <nav className={`border-b ${style.border} ${entry.navBg} sticky top-0 z-50`}>
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex justify-between items-center h-[76px]">
          <Link
            href="/app"
            style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', justifyContent: 'center', gap: 1, textDecoration: 'none', color: style.subtitle, transition: 'opacity 0.2s ease', paddingTop: 8, paddingBottom: 8 }}
            onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.9' }}
            onMouseLeave={(e) => { e.currentTarget.style.opacity = '1' }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={style.wordmark}
              alt="The Nightside"
              className="h-[40px] w-auto"
            />
            <div style={{ width: '100%', height: 1.5, background: style.divider, margin: '2px 0' }} />
            <span style={{
              fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif",
              fontSize: 12,
              lineHeight: '14px',
              fontWeight: 500,
              letterSpacing: '0.01em',
              color: style.subtitle,
              marginLeft: 18,
            }}>
              Planning Studio
            </span>
          </Link>

          <div className="flex items-center gap-6">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`text-[15.7px] font-medium transition-colors ${style.link}`}
              >
                {link.label}
              </Link>
            ))}

            <form action="/auth/signout" method="POST">
              <button
                type="submit"
                className={`text-[15.7px] font-medium transition-colors ${style.link}`}
              >
                Sign out
              </button>
            </form>
          </div>
        </div>
      </div>
    </nav>
  )
}
