'use client'

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { usePathname } from 'next/navigation'
import { createSupabaseBrowserClient } from '@/lib/supabase-browser'
import { LEARN_AREAS } from '@/lib/learn-areas'

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

const DEFAULT_ENTRY: RouteThemeEntry = {
  prefix: '/',
  theme: 'dark',
  navBg: 'bg-[#200840]',
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

  // Activity screens with dark/midnight banners — use cream nav for contrast
  { prefix: '/app/reflect/reflection-prompts', theme: 'light', navBg: 'bg-[#f8f4eb]' },
  { prefix: '/app/reflect/prompts',            theme: 'light', navBg: 'bg-[#f8f4eb]' },
  { prefix: '/app/reflect/scenario-navigator', theme: 'light', navBg: 'bg-[#f8f4eb]' },
  { prefix: '/app/reflect/legacy-map',         theme: 'light', navBg: 'bg-[#f8f4eb]' },
  { prefix: '/app/learn/trivia',               theme: 'light', navBg: 'bg-[#f8f4eb]' },

  // Account management + legal pages — navy nav (page bg is cream, nav must differ)
  { prefix: '/app/account', theme: 'dark', navBg: 'bg-[#2C3777]' },
  { prefix: '/app/help',    theme: 'dark', navBg: 'bg-[#2C3777]' },
  { prefix: '/app/about',   theme: 'dark', navBg: 'bg-[#2C3777]' },
  { prefix: '/privacy',     theme: 'dark', navBg: 'bg-[#2C3777]' },
  { prefix: '/terms',       theme: 'dark', navBg: 'bg-[#2C3777]' },
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

// A dropdown row is either a navigable item or a non-clickable section divider.
type NavRow =
  | { type: 'item'; href: string; label: string; activePrefixes?: string[] }
  | { type: 'divider'; label: string }

type NavItem = {
  href: string            // the label itself navigates here (landing page)
  label: string
  activePrefixes: string[] // top-nav is active when pathname starts with any of these
  rows?: NavRow[]          // optional hover/focus dropdown (Plan has none)
}

// Reflect + Learn carry dropdown shortcuts; the label still navigates to the
// landing page (the dropdown is an *additional* affordance). Plan is a plain link.
// Learn's "Areas of Planning" items reuse LEARN_AREAS (single source of truth) and
// link to the LEARN page for each area, not to domain pages.
const NAV_ITEMS: NavItem[] = [
  {
    href: '/app/reflect',
    label: 'Reflect',
    activePrefixes: ['/app/reflect'],
    rows: [
      { type: 'item', href: '/app/reflect/reflection-prompts', label: 'Reflection Prompts' },
      { type: 'item', href: '/app/reflect/values-and-fears', label: 'Values & Fears Ranking', activePrefixes: ['/app/reflect/values-and-fears', '/app/reflect/values-ranking', '/app/reflect/fears-ranking'] },
      { type: 'item', href: '/app/reflect/scenario-navigator', label: 'Scenario Navigator' },
      { type: 'item', href: '/app/reflect/legacy-map', label: 'Legacy Map' },
    ],
  },
  {
    href: '/app/learn',
    label: 'Learn',
    activePrefixes: ['/app/learn'],
    rows: [
      { type: 'item', href: '/app/learn/trivia', label: 'Deathcare Trivia' },
      { type: 'divider', label: 'Areas of Planning' },
      ...LEARN_AREAS.map((a): NavRow => ({ type: 'item', href: `/app/learn/${a.id}`, label: a.title })),
    ],
  },
  {
    href: '/app/plan',
    label: 'Plan',
    // Plan is the active item across the whole planning flow: the Plan page, domain
    // pages, and the capture documents reached from them.
    activePrefixes: ['/app/plan', '/app/domains', '/app/capture'],
  },
]

// Mobile drawer (Phase 1) uses the flat top-level links only — sub-menus on mobile
// are Phase 2.
const NAV_LINKS = NAV_ITEMS.map(({ href, label }) => ({ href, label }))

// Now that Supabase is the source of truth for every piece of user-created
// data (documents, activity outputs, notes, domain checkboxes/orient, etc),
// the local mirror is just a stale cache. On sign-out we wipe ALL platform
// keys regardless of which user they're tagged with — there's nothing here
// we need to preserve. UI dismissal flags (nightside.tooltip.*, nightside.tour)
// are device-local by design and intentionally included in the sweep so a
// signed-out shared device doesn't reveal the previous user's UI state.
const STORAGE_PREFIXES = ['nightside.', 'nightside-legacy-map', 'reflect-', 'checkbox_', 'ready_', 'orient_']
const SS_PREFIXES = ['nightside_', 'nightside.']

async function handleSignOut() {
  const supabase = createSupabaseBrowserClient()

  const lsKeys: string[] = []
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)
    if (key && STORAGE_PREFIXES.some((p) => key.startsWith(p))) lsKeys.push(key)
  }
  lsKeys.forEach((k) => localStorage.removeItem(k))

  const ssKeys: string[] = []
  for (let i = 0; i < sessionStorage.length; i++) {
    const key = sessionStorage.key(i)
    if (key && SS_PREFIXES.some((p) => key.startsWith(p))) ssKeys.push(key)
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
  const [drawerOpen, setDrawerOpen] = useState(false)
  // Which desktop sub-menu is open (by label), or null. Hover/focus driven.
  const [openMenu, setOpenMenu] = useState<string | null>(null)
  const drawerRef = useRef<HTMLDivElement>(null)
  const hamburgerBtnRef = useRef<HTMLButtonElement>(null)

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

  // Close drawer + any open desktop sub-menu on route change
  useEffect(() => {
    setDrawerOpen(false)
    setOpenMenu(null)
  }, [pathname])

  // Body scroll lock + body class for FAB to react to, ESC to close, focus management
  useEffect(() => {
    if (!drawerOpen) return

    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    document.body.classList.add('nav-drawer-open')

    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setDrawerOpen(false)
    }
    window.addEventListener('keydown', onKey)

    // Move focus into the drawer for keyboard users
    const firstLink = drawerRef.current?.querySelector<HTMLElement>('a, button')
    firstLink?.focus()

    return () => {
      document.body.style.overflow = prevOverflow
      document.body.classList.remove('nav-drawer-open')
      window.removeEventListener('keydown', onKey)
      // Restore focus to the hamburger button
      hamburgerBtnRef.current?.focus()
    }
  }, [drawerOpen])

  // py-4 (16px top + 16px bottom) yields the spec'd ~32px gap between
  // adjacent text rows. font-medium is Tailwind's 500. Bumped from 17px
  // so the primary nav reads with the visual weight it deserves.
  const drawerLinkClass = `block w-full text-left px-6 py-4 text-[22px] font-medium ${style.link}`
  const hamburgerLineBg = entry.theme === 'dark' ? '#f8f4eb' : '#130426'

  // Top-nav link styling. Active state is color-independent (underline + weight) so
  // it reads on every nav background; `style.link` still supplies the themed color.
  function navLinkClass(active: boolean) {
    return `text-[15.7px] transition-colors ${style.link} ${active ? 'font-semibold underline underline-offset-[6px] decoration-2' : 'font-medium'}`
  }

  return (
    <>
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

            {/* Desktop links (>= md) */}
            <div className="hidden md:flex items-center gap-6">
              {isAuthed === true && (
                <>
                  {NAV_ITEMS.map((item) => {
                    const active = item.activePrefixes.some((p) => pathname.startsWith(p))
                    // Plain link (Plan) — no dropdown.
                    if (!item.rows) {
                      return (
                        <Link key={item.href} href={item.href} className={navLinkClass(active)}>
                          {item.label}
                        </Link>
                      )
                    }
                    const open = openMenu === item.label
                    return (
                      <div
                        key={item.href}
                        style={{ position: 'relative' }}
                        onMouseEnter={() => setOpenMenu(item.label)}
                        onMouseLeave={() => setOpenMenu(null)}
                        onFocus={() => setOpenMenu(item.label)}
                        onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setOpenMenu(null) }}
                        onKeyDown={(e) => { if (e.key === 'Escape') setOpenMenu(null) }}
                      >
                        {/* Label still navigates to the landing page; hover/focus opens the dropdown. */}
                        <Link
                          href={item.href}
                          className={navLinkClass(active)}
                          aria-haspopup="true"
                          aria-expanded={open}
                        >
                          {item.label}
                        </Link>
                        {open && (
                          // Outer wrapper sits flush under the label (paddingTop bridges the
                          // visual gap) so moving the mouse label→menu never crosses a dead zone.
                          <div style={{ position: 'absolute', top: '100%', left: 0, paddingTop: 8, zIndex: 60 }}>
                            <div
                              role="menu"
                              aria-label={item.label}
                              style={{
                                minWidth: 224,
                                background: '#f8f4eb',
                                border: '1px solid rgba(19,4,38,0.12)',
                                borderRadius: 12,
                                boxShadow: '0 14px 36px rgba(19,4,38,0.28)',
                                padding: 6,
                              }}
                            >
                              {item.rows.map((row, i) => {
                                if (row.type === 'divider') {
                                  return (
                                    <div key={`d${i}`} style={{ borderTop: '1px solid rgba(19,4,38,0.10)', marginTop: 6, paddingTop: 8 }}>
                                      <span style={{ display: 'block', fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif", fontSize: 11, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'rgba(19,4,38,0.5)', padding: '0 8px 4px' }}>
                                        {row.label}
                                      </span>
                                    </div>
                                  )
                                }
                                const subActive = (row.activePrefixes ?? [row.href]).some((p) => pathname.startsWith(p))
                                return (
                                  <Link
                                    key={row.href}
                                    href={row.href}
                                    role="menuitem"
                                    onClick={() => setOpenMenu(null)}
                                    className={subActive ? undefined : 'hover:bg-[rgba(19,4,38,0.06)]'}
                                    style={{
                                      display: 'block',
                                      padding: '8px 12px',
                                      borderRadius: 8,
                                      fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif",
                                      fontSize: 14,
                                      lineHeight: 1.4,
                                      textDecoration: 'none',
                                      color: '#130426',
                                      fontWeight: subActive ? 600 : 400,
                                      ...(subActive ? { background: '#EEEDFE' } : {}),
                                    }}
                                  >
                                    {row.label}
                                  </Link>
                                )
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })}
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

            {/* Mobile hamburger (< md) */}
            {isAuthed !== null && (
              <button
                ref={hamburgerBtnRef}
                type="button"
                onClick={() => setDrawerOpen(true)}
                aria-label="Open navigation menu"
                aria-expanded={drawerOpen}
                aria-controls="mobile-nav-drawer"
                className="md:hidden flex flex-col justify-center items-center w-11 h-11 -mr-2"
              >
                <span style={{ display: 'block', width: 22, height: 2, background: hamburgerLineBg, borderRadius: 1, margin: '2px 0' }} />
                <span style={{ display: 'block', width: 22, height: 2, background: hamburgerLineBg, borderRadius: 1, margin: '2px 0' }} />
                <span style={{ display: 'block', width: 22, height: 2, background: hamburgerLineBg, borderRadius: 1, margin: '2px 0' }} />
              </button>
            )}
          </div>
        </div>
      </nav>

      {/* Mobile drawer */}
      {drawerOpen && (
        <>
          {/* Backdrop — tap to close */}
          <div
            onClick={() => setDrawerOpen(false)}
            aria-hidden="true"
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(19,4,38,0.45)',
              zIndex: 90,
              animation: 'navDrawerFadeIn 200ms ease-out',
            }}
          />
          {/* Drawer panel */}
          <div
            ref={drawerRef}
            id="mobile-nav-drawer"
            role="dialog"
            aria-modal="true"
            aria-label="Navigation menu"
            className={entry.navBg}
            style={{
              position: 'fixed',
              top: 0,
              right: 0,
              bottom: 0,
              width: 'min(280px, 80vw)',
              zIndex: 95,
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '-4px 0 24px rgba(0,0,0,0.25)',
              animation: 'navDrawerSlideIn 220ms ease-out',
            }}
          >
            <div className={`flex justify-end items-center h-[76px] px-4 border-b ${style.border}`}>
              <button
                type="button"
                onClick={() => setDrawerOpen(false)}
                aria-label="Close navigation menu"
                className={`flex items-center justify-center w-11 h-11 ${style.link}`}
              >
                <svg width="24" height="24" viewBox="0 0 22 22" fill="none" aria-hidden="true">
                  <path d="M4 4L18 18M18 4L4 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </button>
            </div>
            <nav className="flex-1 py-2" aria-label="Primary">
              {isAuthed === true && (
                <>
                  {NAV_LINKS.map((link) => (
                    <Link key={link.href} href={link.href} className={drawerLinkClass}>
                      {link.label}
                    </Link>
                  ))}
                  <button
                    type="button"
                    onClick={handleSignOut}
                    className={drawerLinkClass}
                  >
                    Sign out
                  </button>
                </>
              )}
              {isAuthed === false && (
                <>
                  <Link href="/auth/signin" className={drawerLinkClass}>Sign in</Link>
                  <Link href="/auth/signup" className={drawerLinkClass}>Sign up</Link>
                </>
              )}
            </nav>
          </div>
          <style>{`
            @keyframes navDrawerFadeIn {
              from { opacity: 0 } to { opacity: 1 }
            }
            @keyframes navDrawerSlideIn {
              from { transform: translateX(100%) } to { transform: translateX(0) }
            }
          `}</style>
        </>
      )}
    </>
  )
}
