'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import { createSupabaseBrowserClient } from '@/lib/supabase-browser'

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
  // Capture documents
  { prefix: '/app/capture/devices-and-accounts', theme: 'dark', navBg: 'bg-[#2C3777]' },
  { prefix: '/app/capture/financial-information', theme: 'dark', navBg: 'bg-[#2C3777]' },
  { prefix: '/app/capture/important-contacts',    theme: 'dark', navBg: 'bg-[#2C3777]' },
  { prefix: '/app/capture/personal-admin',        theme: 'dark', navBg: 'bg-[#2C3777]' },

  // Materials + Domains share a navy nav to complement their dark page bg
  { prefix: '/app/plan',      theme: 'dark',  navBg: 'bg-[#2C3777]' },
  { prefix: '/app/domains',   theme: 'dark',  navBg: 'bg-[#2C3777]' },

  // Entries / snapshot pages — same navy as materials for continuity
  { prefix: '/app/entries',   theme: 'dark',  navBg: 'bg-[#2C3777]' },

  // App homepage — navy nav, exact match only
  { prefix: '/app',         exact: true, theme: 'dark',  navBg: 'bg-[#2C3777]' },

  // Reflect/Explore landing: cream nav — exact match only,
  // so sub-pages fall through to default nav.
  { prefix: '/app/reflect', exact: true, theme: 'light', navBg: 'bg-[#f8f4eb]' },
  { prefix: '/app/reflect',  exact: true, theme: 'light', navBg: 'bg-[#f8f4eb]' },

  // Values & Fears landing + ranking activities — navy nav on blue workspace
  { prefix: '/app/reflect/values-and-fears', theme: 'dark', navBg: 'bg-[#2C3777]' },
  { prefix: '/app/reflect/values-ranking',   theme: 'light', navBg: 'bg-[#f8f4eb]' },
  { prefix: '/app/reflect/fears-ranking',    theme: 'light', navBg: 'bg-[#f8f4eb]' },

  // Account management pages — cream nav
  { prefix: '/app/account', theme: 'light', navBg: 'bg-[#f8f4eb]' },
  { prefix: '/app/help',    theme: 'light', navBg: 'bg-[#f8f4eb]' },
  { prefix: '/app/about',   theme: 'light', navBg: 'bg-[#f8f4eb]' },
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
  { href: '/app/reflect',   label: 'Reflect' },
  { href: '/app/learn',     label: 'Learn' },
  { href: '/app/plan', label: 'Plan' },
]

const STORAGE_PREFIXES = ['nightside.', 'nightside-legacy-map', 'reflect-', 'checkbox_', 'ready_', 'orient_', 'planning_']
const SS_PREFIXES = ['nightside_', 'nightside.']

function shouldClearKey(key: string, currentUserId: string): boolean {
  // Preserve keys that belong to the signing-out user
  if (key.includes(currentUserId)) return false
  // Clear keys with no user ID (legacy un-namespaced) or a different user's ID
  return true
}

async function handleSignOut() {
  const supabase = createSupabaseBrowserClient()
  const { data: { user } } = await supabase.auth.getUser()
  const uid = user?.id ?? ''

  // Clear platform localStorage keys that don't belong to the current user
  const lsKeys: string[] = []
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)
    if (key && STORAGE_PREFIXES.some((p) => key.startsWith(p)) && shouldClearKey(key, uid)) {
      lsKeys.push(key)
    }
  }
  lsKeys.forEach((k) => localStorage.removeItem(k))

  // Clear platform sessionStorage keys that don't belong to the current user
  const ssKeys: string[] = []
  for (let i = 0; i < sessionStorage.length; i++) {
    const key = sessionStorage.key(i)
    if (key && SS_PREFIXES.some((p) => key.startsWith(p)) && shouldClearKey(key, uid)) {
      ssKeys.push(key)
    }
  }
  ssKeys.forEach((k) => sessionStorage.removeItem(k))

  await supabase.auth.signOut()
  window.location.href = '/auth/signin'
}

export default function GlobalNav() {
  const pathname = usePathname()
  const entry = getNavEntry(pathname)
  const style = NAV_STYLES[entry.theme]
  // null = auth state not yet known (prevents flash between authed/unauthed UI)
  const [isAuthed, setIsAuthed] = useState<boolean | null>(null)

  useEffect(() => {
    const supabase = createSupabaseBrowserClient()
    // getSession() is a local read — fast, no network round-trip
    supabase.auth.getSession().then(({ data: { session } }) => {
      setIsAuthed(!!session)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      setIsAuthed(!!session)
    })
    return () => subscription.unsubscribe()
  }, [])

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
            {isAuthed === true && (
              <>
                {NAV_LINKS.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`text-[15.7px] font-medium transition-colors ${style.link}`}
                  >
                    {link.label}
                  </Link>
                ))}
                <button
                  type="button"
                  onClick={handleSignOut}
                  className={`text-[15.7px] font-medium transition-colors ${style.link}`}
                >
                  Sign out
                </button>
              </>
            )}
            {isAuthed === false && (
              <>
                <Link
                  href="/auth/signin"
                  className={`text-[15.7px] font-medium transition-colors ${style.link}`}
                >
                  Sign in
                </Link>
                <Link
                  href="/auth/signup"
                  className={`text-[15.7px] font-medium transition-colors ${style.link}`}
                >
                  Sign up
                </Link>
              </>
            )}
            {/* isAuthed === null: auth state not yet resolved — render nothing to avoid flash */}
          </div>
        </div>
      </div>
    </nav>
  )
}
