import type { Metadata } from 'next'
import { createSupabaseServerClient } from '@/lib/supabase-server'

// The [domainId] segment is a container UUID, not a domain_code — so resolve the
// container server-side, read its stable domain_code, and map that to the title.
// Keyed by the immutable domain_code (label-as-foreign-key rule), not by prose.
const DOMAIN_TITLES: Record<string, string> = {
  healthcare: 'Plan: Healthcare Wishes',
  deathcare: 'Plan: Deathcare',
  legacy: 'Plan: Legacy',
  wills_estates: 'Plan: Wills & Estates',
  personal_admin: 'Plan: Personal Admin',
  ritual: 'Plan: Ritual & Ceremony',
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ domainId: string }>
}): Promise<Metadata> {
  const { domainId } = await params
  try {
    const supabase = await createSupabaseServerClient()
    const { data } = await supabase
      .from('containers')
      .select('domain_code')
      .eq('id', domainId)
      .maybeSingle()
    const title = data?.domain_code ? DOMAIN_TITLES[data.domain_code] : undefined
    if (title) return { title }
  } catch {
    // Fall through to the default title on any lookup failure.
  }
  return {}
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return children
}
