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

  const isScenarioPage = pathname.startsWith('/app/activities/scenario-navigator')
  const isTriviaPage = pathname.startsWith('/app/activities/trivia')
  const isExploreLanding = pathname === '/app/activities'
  const isReflectLanding = pathname === '/app/activities/reflection-prompts'
  const isValuesRanking = pathname === '/app/activities/values-ranking'
  const isFearsRanking = pathname === '/app/activities/fears-ranking'
  const isLegacyMap = pathname === '/app/activities/legacy-map'
  const isAppHome = pathname === '/app'
  const isMaterialsPage = pathname.startsWith('/app/materials')
  const isAreaPage = pathname.startsWith('/app/area')
  const isPersonalAdminDoc = pathname === '/app/capture/personal-admin'
  const isImportantContactsDoc = pathname === '/app/capture/important-contacts'
  const isFinancialInfoDoc = pathname === '/app/capture/financial-information'
  const isDevicesDoc = pathname === '/app/capture/devices-and-accounts'
  const buttonStyle = isAppHome || isExploreLanding || isLegacyMap || isPersonalAdminDoc || isImportantContactsDoc || isFinancialInfoDoc || isDevicesDoc ? 'lavender' : isScenarioPage || isTriviaPage || isReflectLanding || isValuesRanking || isFearsRanking ? 'orange' : isMaterialsPage || isAreaPage ? 'sunrise' : 'navy'

  return <NotepadModal buttonStyle={buttonStyle} containerId={areaContainerId} />
}
