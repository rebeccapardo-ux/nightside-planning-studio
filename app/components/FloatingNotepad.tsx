'use client'

import { usePathname } from 'next/navigation'
import NotepadModal from './NotepadModal'

export default function FloatingNotepad() {
  const pathname = usePathname()

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

  return <NotepadModal buttonStyle={buttonStyle} />
}
