import type { Metadata } from 'next'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import LegacyContactForm from './LegacyContactForm'


export const metadata: Metadata = {
  title: "Designate your Legacy Contact",
}

export default async function LegacyContactOnboardingPage() {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  // proxy.ts middleware enforces auth on /app/*; this branch is unreachable.
  // The throw preserves type narrowing for user.id below.
  // (redirect() is still used legitimately at the "already designated" check.)
  if (!user) throw new Error('Unreachable: auth middleware bypassed on /app/onboarding/legacy-contact')

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
