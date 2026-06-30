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

  const isScenarioPage = pathname.startsWith('/app/reflect/scenario-navigator')
  const isTriviaPage = pathname.startsWith('/app/learn/trivia')
  const isExploreLanding = pathname === '/app/reflect'
  const isReflectLanding = pathname === '/app/reflect/reflection-prompts'
  const isValuesRanking = pathname === '/app/reflect/values-ranking'
  const isFearsRanking = pathname === '/app/reflect/fears-ranking'
  const isLegacyMap = pathname === '/app/reflect/legacy-map'
  const isLegacyLearn = pathname === '/app/learn/legacy'
  const isPersonalAdminLearn = pathname === '/app/learn/personal-admin'
  const isRitualLearn = pathname === '/app/learn/ritual'
  const isDeathcareLearn = pathname === '/app/learn/deathcare'
  const isWillsLearn = pathname === '/app/learn/wills'
  const isHealthcareLearn = pathname === '/app/learn/healthcare'
  const isAppHome = pathname === '/app'
  const isPlanPage = pathname.startsWith('/app/plan')
  const isAreaPage = pathname.startsWith('/app/area')
  const isPersonalAdminDoc = pathname === '/app/capture/personal-admin'
  const isImportantContactsDoc = pathname === '/app/capture/important-contacts'
  const isFinancialInfoDoc = pathname === '/app/capture/financial-information'
  const isDevicesDoc = pathname === '/app/capture/devices-and-accounts'
  const buttonStyle = isAppHome || isExploreLanding || isLegacyMap || isLegacyLearn || isPersonalAdminLearn || isRitualLearn || isDeathcareLearn || isWillsLearn || isHealthcareLearn || isPersonalAdminDoc || isImportantContactsDoc || isFinancialInfoDoc || isDevicesDoc ? 'lavender' : isScenarioPage || isTriviaPage || isReflectLanding || isValuesRanking || isFearsRanking ? 'orange' : isPlanPage || isAreaPage ? 'sunrise' : 'navy'

  return <NotepadModal buttonStyle={buttonStyle} containerId={areaContainerId} />
}
