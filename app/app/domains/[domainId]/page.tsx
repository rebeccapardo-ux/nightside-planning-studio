import { redirect } from 'next/navigation'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { areaByDomainCode } from '@/lib/areas'

// Phase 3 redirect: legacy /app/domains/[domainId] → /app/area/[slug]. The segment is a
// per-user container UUID, so resolve it to its stable domain_code, map that to the area
// slug, and redirect. (This redirect needs a DB lookup, so it can't live in the edge proxy.)
// Falls back to the Plan by area landing if the container can't be resolved.
export default async function DomainRedirect({ params }: { params: Promise<{ domainId: string }> }) {
  const { domainId } = await params
  let slug: string | undefined
  try {
    const supabase = await createSupabaseServerClient()
    const { data } = await supabase
      .from('containers')
      .select('domain_code')
      .eq('id', domainId)
      .maybeSingle()
    slug = areaByDomainCode(data?.domain_code)?.slug
  } catch {
    // fall through to the landing
  }
  redirect(slug ? `/app/area/${slug}` : '/app/area')
}
