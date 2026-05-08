'use client'

import { usePathname } from 'next/navigation'
import NotepadModal from './NotepadModal'

export default function FloatingNotepad() {
  const pathname = usePathname()

  // PDF export pages are print views — no interactive controls
  if (pathname.endsWith('/export')) return null

  const isScenarioPage = pathname.startsWith('/app/reflect/scenario-navigator')
  const isPlanPage = pathname === '/app/plan'
  const isTriviaPage = pathname.startsWith('/app/learn/trivia')
  const isExploreLanding = pathname === '/app/reflect'
  const isReflectLanding = pathname === '/app/reflect/reflection-prompts'
  const buttonStyle = isExploreLanding ? 'lavender' : isScenarioPage || isPlanPage || isTriviaPage || isReflectLanding ? 'orange' : 'navy'

  return <NotepadModal buttonStyle={buttonStyle} />
}
