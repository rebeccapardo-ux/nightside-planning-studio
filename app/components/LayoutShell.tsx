'use client'
import { usePathname } from 'next/navigation'
import GlobalNav from '@/app/components/GlobalNav'
import FloatingNotepad from '@/app/components/FloatingNotepad'
import AppFooter from '@/app/components/AppFooter'

export default function LayoutShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  if (pathname.startsWith('/app/onboarding')) {
    return (
      <>
        <main>{children}</main>
        <AppFooter />
      </>
    )
  }

  return (
    <div className="min-h-screen bg-[#130426]">
      <GlobalNav />
      <div className="ns-floating-notepad-wrap fixed z-40 top-24 right-6 max-md:right-4">
        <FloatingNotepad />
      </div>
      <main>{children}</main>
      <AppFooter />
    </div>
  )
}
