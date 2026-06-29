import type { Metadata } from 'next'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { ensureCanonicalDomains } from '@/lib/ensure-canonical-domains'
import AppHome from './AppHome'

export const metadata: Metadata = {
  title: 'Home',
}

// Home (server wrapper over the client AppHome). Seeds the canonical domains and
// fetches the user's domain containers so the "Your key details" panel — a
// cross-domain overview — can render with the user's data.
export default async function AppHomePage() {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unreachable: auth middleware bypassed on /app')

  await ensureCanonicalDomains(supabase, user.id)

  const { data: domainContainers } = await supabase
    .from('containers')
    .select('id, title, domain_code')
    .eq('type', 'domain')
    .eq('user_id', user.id)
    .order('title')

  // Deduplicate by title (guards any legacy duplicate rows).
  const seen = new Set<string>()
  const domains = (domainContainers ?? []).filter((d) => {
    if (seen.has(d.title)) return false
    seen.add(d.title)
    return true
  })

  return <AppHome domains={domains} />
}
