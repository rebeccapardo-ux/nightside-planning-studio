import { createSupabaseServerClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import LayoutShell from '@/app/components/LayoutShell'

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

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('paid_at')
    .eq('user_id', user.id)
    .single()

  if (!profile?.paid_at) {
    redirect('/auth/signup/payment')
  }

  return <LayoutShell>{children}</LayoutShell>
}
