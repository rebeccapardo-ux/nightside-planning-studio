'use client'

import { usePathname } from 'next/navigation'
import NotepadModal from './NotepadModal'

export default function FloatingNotepad() {
  const pathname = usePathname()

  // Domain pages have an inline composer
  if (pathname.startsWith('/app/domains/')) return null

  // Lavender-background pages — use cream button so it's always visible
  const needsCreamButton =
    pathname.startsWith('/app/reflect') ||
    pathname.startsWith('/app/capture') ||
    pathname.startsWith('/app/learn/wills')

  return <NotepadModal buttonStyle={needsCreamButton ? 'cream' : 'lavender'} />
}
