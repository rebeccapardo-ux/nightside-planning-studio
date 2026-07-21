'use client'

import { usePathname } from 'next/navigation'
import NotepadModal from './NotepadModal'
import { useUserDomainContainers, areaContainerIdForPath } from './useUserDomainContainers'

export default function FloatingNotepad() {
  const pathname = usePathname()
  // When the Notepad is opened from an area page, notes composed in it auto-link to
  // that area's container (high-confidence relevance) — same auto-surfacing as the area
  // page's own Your-Thoughts composer. Null on every other page → notes stay untagged.
  const { domains } = useUserDomainContainers()
  const areaContainerId = areaContainerIdForPath(domains, pathname)

  // PDF export pages are print views — no interactive controls
  if (pathname.endsWith('/export')) return null

  // The Notepad button is sunrise (#F29836) with midnight ink on every page — sunrise is now
  // the platform accent color, and the pill reads on every surface (night banner, cream, lavender).
  return <NotepadModal buttonStyle="sunrise" containerId={areaContainerId} />
}
