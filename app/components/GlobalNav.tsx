'use client'

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { usePathname } from 'next/navigation'
import { createSupabaseBrowserClient } from '@/lib/supabase-browser'
import { useUserDomainContainers } from './useUserDomainContainers'
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

// A dropdown row is either a navigable item or a divider. A divider with a `label`
// is a non-clickable group header (Learn's "Areas"); a label-less divider
// is a bare rule (Plan, between two peer destination links). `indent` marks a child
// item nested under the row above it (Plan's domain pages under Areas of Planning).
type NavRow =
  | { type: 'item'; href: string; label: string; activePrefixes?: string[]; indent?: boolean }
  | { type: 'divider'; label?: string }

type NavItem = {
  href: string            // the label itself navigates here (landing page)
  label: string
  activePrefixes: string[] // top-nav is active when pathname starts with any of these
  rows?: NavRow[]          // optional hover/focus dropdown (Plan has none)
}

// Canonical display order for the Plan dropdown's domain links — matches the Learn
// area order (Healthcare-first), keyed by stable domain_code. Domain pages live at
// /app/domains/<container-uuid>, so the actual links are built per-user from the
// fetched containers (GlobalNav's `domains` state) and slotted into this order.
const PLAN_DOMAIN_ORDER = ['healthcare', 'deathcare', 'wills_estates', 'legacy', 'personal_admin', 'ritual']

// Reflect + Learn carry dropdown shortcuts; the label still navigates to the landing
// page (the dropdown is an *additional* affordance). Learn's "Areas" items
// reuse LEARN_AREAS (single source of truth) and link to the LEARN page for each area.
// Plan mirrors that shape: a "Your Materials" singleton, then a "Areas of Planning"
// group of direct links to each domain page (built per-user from `domainRows`).
function buildNavItems(domainRows: NavRow[]): NavItem[] {
  return [
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
        { type: 'divider', label: 'Areas' },
        ...LEARN_AREAS.map((a): NavRow => ({ type: 'item', href: `/app/learn/${a.id}`, label: a.title })),
      ],
    },
    {
      href: '/app/plan',
      label: 'Plan',
      // Plan is the active item across the whole planning flow: the Plan section, domain
      // pages, and the capture documents reached from them.
      activePrefixes: ['/app/plan', '/app/domains', '/app/capture'],
      rows: [
        { type: 'item', href: '/app/plan/materials', label: 'Your Materials', activePrefixes: ['/app/plan/materials'] },
        // Your Materials and Areas of Planning are genuine peer destinations, so —
        // UNLIKE Learn's non-clickable "Areas of Planning" header — Areas of Planning
        // is a plain LINK under a bare rule. The domain pages are its indented children
        // (parent-child via indentation, not sub-header styling). They appear once the
        // containers fetch resolves; Areas of Planning itself always shows.
        { type: 'divider' },
        { type: 'item', href: '/app/plan/areas', label: 'Areas of Planning', activePrefixes: ['/app/plan/areas'] },
        ...domainRows,
      ],
    },
  ]
}

// Now that Supabase is the source of truth for every piece of user-created
// data (documents, activity outputs, notes, domain checkboxes/orient, etc),
// the local mirror is just a stale cache. On sign-out we wipe ALL platform
// keys regardless of which user they're tagged with — there's nothing here
// we need to preserve, EXCEPT the onboarding-tour "seen" flags (nightside.tour.*).
// Those are first-time-only onboarding state and must survive sign-out so the
// Plan/Domain tours don't replay on every login. They're uid-namespaced
// (`...:<userId>`), so a different user on a shared device still gets their own
// first-time tour — the sweep's shared-device concern doesn't apply to them.
// (Tooltip dismissal flags are still swept.)
const STORAGE_PREFIXES = ['nightside.', 'nightside-legacy-map', 'reflect-', 'checkbox_', 'ready_', 'orient_']
// Keys that match STORAGE_PREFIXES but ALSO one of these are preserved through sign-out.
const STORAGE_PRESERVE_PREFIXES = ['nightside.tour.']
const SS_PREFIXES = ['nightside_', 'nightside.']

async function handleSignOut() {
  const supabase = createSupabaseBrowserClient()

  const lsKeys: string[] = []
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)
    if (key && STORAGE_PREFIXES.some((p) => key.startsWith(p)) && !STORAGE_PRESERVE_PREFIXES.some((p) => key.startsWith(p))) lsKeys.push(key)
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
  // Auth state + the user's domain containers (powers the Plan dropdown's per-area
  // links) — shared with FloatingNotepad via useUserDomainContainers so the
  // domain_code → container lookup isn't duplicated.
  const { domains, isAuthed } = useUserDomainContainers()
  const [drawerOpen, setDrawerOpen] = useState(false)
  // Which desktop sub-menu is open (by label), or null. Hover/focus driven.
  const [openMenu, setOpenMenu] = useState<string | null>(null)
  // Which mobile-drawer sections are expanded (keyed by section href). Reset to
  // empty (all collapsed) each time the drawer opens — keeps the menu scannable.
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set())
  const toggleSection = (href: string) =>
    setExpandedSections((prev) => {
      const next = new Set(prev)
      if (next.has(href)) next.delete(href)
      else next.add(href)
      return next
    })
  const drawerRef = useRef<HTMLDivElement>(null)
  const hamburgerBtnRef = useRef<HTMLButtonElement>(null)

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
  // Muted caption colour for the mobile drawer's "Areas of planning" group label —
  // tracks the nav theme (cream text on dark navs, navy text on the light nav).
  // Opacity tuned for WCAG AA on the worst-case nav backgrounds (>=4.5:1 for this
  // caption): 0.65 cream → 5.21:1 over #2C3777; 0.62 navy → 5.47:1 over #f8f4eb.
  const drawerCaptionColor = entry.theme === 'dark' ? 'rgba(248,244,235,0.65)' : 'rgba(19,4,38,0.62)'

  // Mobile drawer section. The header is two separate tap zones: a LINK (label →
  // section landing) and a chevron BUTTON (expand/collapse the sub-items). Sections
  // open COLLAPSED — with Reflect/Learn/Plan each carrying 3–8 sub-items, showing them
  // all at once overwhelmed the menu. Sub-items render only when expanded; the body
  // itself is built the same way (item sub-links, a caption for a labelled divider,
  // a bare rule for a label-less one, deeper indent for `indent` children).
  function renderDrawerSection(item: NavItem) {
    const headerActive = item.activePrefixes.some((p) => pathname.startsWith(p))
    const slug = item.href.split('/').pop() || item.label.toLowerCase()
    const headerId = `navsec-${slug}`

    const subLink = (row: Extract<NavRow, { type: 'item' }>) => {
      const subActive = (row.activePrefixes ?? [row.href]).some((p) => pathname.startsWith(p))
      // Indented children (Plan's domain pages) sit a step deeper than top-level
      // sub-items (pl-12); the extra indent carries the parent-child relationship.
      return (
        <Link
          key={row.href}
          href={row.href}
          className={`block w-full ${row.indent ? 'pl-[4.5rem]' : 'pl-12'} pr-6 py-3.5 text-[16.5px] ${style.link} ${subActive ? 'font-semibold underline underline-offset-4 decoration-2' : 'font-normal'}`}
        >
          {row.label}
        </Link>
      )
    }

    // Render rows in order: items become sub-links (deeper if `indent`); a labelled
    // divider is a group caption (Learn's "Areas"); a label-less divider
    // is a bare rule between peer links (Plan's Your Materials | Areas of Planning).
    let body: React.ReactNode = null
    if (item.rows) {
      body = item.rows.map((row, i) => {
        if (row.type === 'divider') {
          if (row.label) {
            return (
              <div key={`d${i}`} className="px-6" style={{ paddingTop: 20, paddingBottom: 14 }}>
                <span aria-hidden="true" className="block uppercase" style={{ fontSize: 15, fontWeight: 700, letterSpacing: '0.07em', color: drawerCaptionColor }}>
                  {row.label}
                </span>
              </div>
            )
          }
          return (
            <div key={`d${i}`} className="px-6" style={{ paddingTop: 10, paddingBottom: 10 }} aria-hidden="true">
              <div style={{ height: 1, background: style.divider }} />
            </div>
          )
        }
        return subLink(row)
      })
    }

    const expanded = item.rows ? expandedSections.has(item.href) : false

    return (
      <div key={item.href} className="pb-2">
        {/* Two separate tap zones (each ≥44px): the label LINK navigates to the
            section's landing page; the chevron BUTTON expands/collapses its sub-items.
            Sections open collapsed (reset on every drawer open) so the menu stays
            scannable — one extra tap to reach a deep destination. */}
        <div style={{ display: 'flex', alignItems: 'stretch' }}>
          <Link
            href={item.href}
            id={item.rows ? headerId : undefined}
            className={`flex-1 px-6 py-4 text-[21px] font-semibold ${style.link} ${headerActive ? 'underline underline-offset-[6px] decoration-2' : ''}`}
          >
            {item.label}
          </Link>
          {item.rows && (
            <button
              type="button"
              onClick={() => toggleSection(item.href)}
              aria-label={`${expanded ? 'Collapse' : 'Expand'} ${item.label}`}
              aria-expanded={expanded}
              aria-controls={`${headerId}-group`}
              className={`flex items-center justify-center px-6 ${style.link}`}
            >
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true" style={{ transition: 'transform 200ms ease', transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)' }}>
                <path d="M5 7.5l5 5 5-5" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          )}
        </div>
        {item.rows && expanded && (
          <div id={`${headerId}-group`} role="group" aria-labelledby={headerId}>
            {body}
          </div>
        )}
      </div>
    )
  }

  // Top-nav link styling. Active state is color-independent (underline + weight) so
  // it reads on every nav background; `style.link` still supplies the themed color.
  function navLinkClass(active: boolean) {
    return `text-[15.7px] transition-colors ${style.link} ${active ? 'font-semibold underline underline-offset-[6px] decoration-2' : 'font-medium'}`
  }

  // Hover-panel + dropdown surface palette. On hover/focus the parent label gets a
  // colored panel; the dropdown flows out of its bottom edge as one continuous shape.
  // The color contrasts the nav background, and the text follows the panel's surface
  // (the same color the nav already uses on that background) — the platform-wide
  // "text color follows the surface" rule. Dark navs (#200840, #2C3777) → cream panel;
  // the single cream nav (#f8f4eb) → navy panel.
  const panel = entry.theme === 'dark'
    ? {
        bg: '#F8F4EB',
        text: '#130426',
        border: '1px solid rgba(19,4,38,0.12)',
        shadow: '0 14px 36px rgba(19,4,38,0.28)',
        itemActiveBg: '#EEEDFE',
        dividerLine: 'rgba(19,4,38,0.10)',
        dividerLabel: 'rgba(19,4,38,0.62)', // WCAG AA: 5.47:1 over the #F8F4EB panel
        itemHoverClass: 'hover:bg-[rgba(19,4,38,0.06)]',
      }
    : {
        bg: '#2C3777',
        text: '#f8f4eb',
        border: '1px solid rgba(248,244,235,0.18)',
        shadow: '0 14px 36px rgba(19,4,38,0.40)',
        itemActiveBg: 'rgba(255,255,255,0.14)',
        dividerLine: 'rgba(248,244,235,0.18)',
        dividerLabel: 'rgba(248,244,235,0.65)', // WCAG AA: 5.21:1 over the #2C3777 panel
        itemHoverClass: 'hover:bg-[rgba(255,255,255,0.08)]',
      }

  // Per-user domain links for the Plan dropdown, slotted into canonical order and
  // marked `indent` (children nested under the Areas of Planning link).
  const domainRows: NavRow[] = PLAN_DOMAIN_ORDER
    .map((code) => domains.find((d) => d.domain_code === code))
    .filter((d): d is { id: string; title: string; domain_code: string | null } => !!d)
    .map((d) => ({ type: 'item', href: `/app/domains/${d.id}`, label: d.title, activePrefixes: [`/app/domains/${d.id}`], indent: true }))
  const navItems = buildNavItems(domainRows)

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
                  {navItems.map((item) => {
                    const active = item.activePrefixes.some((p) => pathname.startsWith(p))
                    const panelOn = openMenu === item.label
                    return (
                      // Flex child wraps the label panel + its dropdown. The negative
                      // horizontal margin cancels the label's panel padding for layout, so
                      // the resting nav spacing is unchanged (no reflow on hover) while the
                      // panel can still breathe 12px past the text on each side.
                      <div
                        key={item.href}
                        style={{ position: 'relative', alignSelf: 'stretch', display: 'flex', margin: '0 -12px' }}
                        onMouseEnter={() => setOpenMenu(item.label)}
                        onMouseLeave={() => setOpenMenu(null)}
                        onFocus={() => setOpenMenu(item.label)}
                        onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setOpenMenu(null) }}
                        onKeyDown={(e) => { if (e.key === 'Escape') setOpenMenu(null) }}
                      >
                        {/* The label IS the hover panel: full nav-height, square corners,
                            themed background on hover/focus, text recoloured to the panel's
                            surface (the active underline rides currentColor, so it flips too
                            and stays visible). The label still navigates to its landing page;
                            for Plan (no rows) the panel shows but opens no menu. */}
                        <Link
                          href={item.href}
                          className={navLinkClass(active)}
                          aria-haspopup={item.rows ? 'true' : undefined}
                          aria-expanded={item.rows ? panelOn : undefined}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            height: '100%',
                            padding: '0 12px',
                            background: panelOn ? panel.bg : 'transparent',
                            ...(panelOn ? { color: panel.text, textDecorationColor: panel.text } : {}),
                          }}
                        >
                          {item.label}
                        </Link>
                        {item.rows && panelOn && (
                          // A small 4px gap drops the dropdown (and its upward shadow) below
                          // the nav's underline row, so opening a menu never clips the
                          // current-page underline of an item to its right — consistent
                          // regardless of which side the hovered item sits on. The gap is
                          // paddingTop (inside this hoverable wrapper), NOT margin, so the
                          // label→menu mouse path stays alive with no dead zone.
                          <div style={{ position: 'absolute', top: '100%', left: 0, paddingTop: 4, zIndex: 60 }}>
                            <div
                              role="menu"
                              aria-label={item.label}
                              style={{
                                minWidth: 224,
                                background: panel.bg,
                                border: panel.border,
                                borderTop: 'none',
                                borderRadius: '0 0 12px 12px',
                                boxShadow: panel.shadow,
                                padding: 6,
                              }}
                            >
                              {item.rows.map((row, i) => {
                                if (row.type === 'divider') {
                                  // Labelled divider → group header (Learn). Label-less
                                  // → a bare rule between peer links (Plan).
                                  return (
                                    <div key={`d${i}`} style={{ borderTop: `1px solid ${panel.dividerLine}`, marginTop: 6, paddingTop: row.label ? 8 : 6 }}>
                                      {row.label && (
                                        <span style={{ display: 'block', fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif", fontSize: 11, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: panel.dividerLabel, padding: '0 8px 4px' }}>
                                          {row.label}
                                        </span>
                                      )}
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
                                    className={subActive ? undefined : panel.itemHoverClass}
                                    style={{
                                      display: 'block',
                                      padding: row.indent ? '5px 12px 5px 28px' : '5px 12px',
                                      borderRadius: 8,
                                      fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif",
                                      fontSize: 14,
                                      lineHeight: 1.4,
                                      textDecoration: 'none',
                                      color: panel.text,
                                      fontWeight: subActive ? 600 : 400,
                                      ...(subActive ? { background: panel.itemActiveBg } : {}),
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
                onClick={() => { setExpandedSections(new Set()); setDrawerOpen(true) }}
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
            className="nav-drawer-backdrop"
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(19,4,38,0.45)',
              zIndex: 90,
            }}
          />
          {/* Drawer panel */}
          <div
            ref={drawerRef}
            id="mobile-nav-drawer"
            role="dialog"
            aria-modal="true"
            aria-label="Navigation menu"
            className={`${entry.navBg} nav-drawer-panel`}
            style={{
              position: 'fixed',
              top: 0,
              right: 0,
              bottom: 0,
              width: 'min(340px, 90vw)',
              zIndex: 95,
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '-4px 0 24px rgba(0,0,0,0.25)',
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
            <nav className="flex-1 overflow-y-auto py-2" aria-label="Primary">
              {isAuthed === true && (
                <>
                  {navItems.map(renderDrawerSection)}
                  <button
                    type="button"
                    onClick={handleSignOut}
                    className={`block w-full text-left px-6 py-4 text-[21px] font-semibold ${style.link}`}
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
            .nav-drawer-backdrop { animation: navDrawerFadeIn 200ms ease-out; }
            .nav-drawer-panel { animation: navDrawerSlideIn 220ms ease-out; }
            @media (prefers-reduced-motion: reduce) {
              .nav-drawer-backdrop, .nav-drawer-panel { animation: none; }
            }
          `}</style>
        </>
      )}
    </>
  )
}
