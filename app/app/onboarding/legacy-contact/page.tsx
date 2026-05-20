import { createSupabaseServerClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import LegacyContactForm from './LegacyContactForm'

export default async function LegacyContactOnboardingPage() {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/signin')

  // Already designated — send them into the platform
  const { data: existing } = await supabase
    .from('legacy_contacts')
    .select('id')
    .eq('user_id', user.id)
    .eq('contact_type', 'primary')
    .maybeSingle()

  if (existing) redirect('/app/plan')

  return <LegacyContactForm />
}
