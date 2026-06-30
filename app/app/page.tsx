import type { Metadata } from 'next'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { ensureCanonicalDomains } from '@/lib/ensure-canonical-domains'
import AppHome from './AppHome'

export const metadata: Metadata = {
  title: 'Home',
}

// Home is a primary entry point in the area-centric structure, so seed the canonical
// domain containers here (idempotent + cheap) — users landing here must have containers
// for area pages / Your materials to render correctly.
export default async function AppHomePage() {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (user) await ensureCanonicalDomains(supabase, user.id)
  return <AppHome />
}
