import { createSupabaseServerClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import GlobalNav from '@/app/components/GlobalNav'
import FloatingNotepad from '@/app/components/FloatingNotepad'
import WelcomeModal from '@/app/components/WelcomeModal'

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/signin')
  }

  const hasSeenWelcome = user.user_metadata?.has_seen_welcome === true

  return (
    <div className="min-h-screen bg-[#130426]">
      <GlobalNav />

      <div className="fixed top-24 right-6 z-50">
        <FloatingNotepad />
      </div>

      <main>{children}</main>

      {!hasSeenWelcome && <WelcomeModal />}
    </div>
  )
}