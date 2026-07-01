'use client'

import { useState } from 'react'

// Shared collapse state for the area-page sections (Overview / Relevant Activities /
// Plan). All three behave identically: default COLLAPSED the first time a user lands on
// an area (nothing stored yet) — so the page isn't overwhelming on first landing — and
// thereafter each section independently remembers the user's last choice. Persistence is
// localStorage (per-device, survives refreshes and future sessions — a layout preference,
// not session-scoped), keyed per area + section. SSR-safe lazy init.
export function useSectionCollapse(storageKey: string, defaultOpen = false): [boolean, () => void] {
  const [open, setOpen] = useState<boolean>(() => {
    if (typeof window === 'undefined') return defaultOpen
    try {
      const v = window.localStorage.getItem(storageKey)
      return v === 'collapsed' ? false : v === 'expanded' ? true : defaultOpen
    } catch { return defaultOpen }
  })
  const toggle = () =>
    setOpen((prev) => {
      const next = !prev
      try { window.localStorage.setItem(storageKey, next ? 'expanded' : 'collapsed') } catch { /* private mode */ }
      return next
    })
  return [open, toggle]
}
