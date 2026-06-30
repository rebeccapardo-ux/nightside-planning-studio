'use client'

import { useEffect, useState } from 'react'
import { createSupabaseBrowserClient } from '@/lib/supabase-browser'
import { areaBySlug } from '@/lib/areas'

export type DomainContainer = { id: string; title: string; domain_code: string | null }

// Shared client-side fetch of the user's six domain containers + auth state. Used by
// GlobalNav (to build the per-area nav links) AND FloatingNotepad (to resolve which
// area container a note composed from an area page should link to). Factored here so the
// domain_code → container UUID lookup lives in one place. Cheap (6 rows); each consumer
// mounts once per full load, so this isn't per-navigation.
export function useUserDomainContainers(): { domains: DomainContainer[]; isAuthed: boolean | null } {
  const [domains, setDomains] = useState<DomainContainer[]>([])
  const [isAuthed, setIsAuthed] = useState<boolean | null>(null)

  useEffect(() => {
    const supabase = createSupabaseBrowserClient()
    const load = (userId: string) => {
      supabase
        .from('containers')
        .select('id, title, domain_code')
        .eq('type', 'domain')
        .eq('user_id', userId)
        .then(({ data }) => { if (data) setDomains(data) })
    }
    // getSession() is a local read — fast, no network round-trip.
    supabase.auth.getSession().then(({ data: { session } }) => {
      setIsAuthed(!!session)
      if (session) load(session.user.id)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      setIsAuthed(!!session)
      if (session) load(session.user.id)
      else setDomains([])
    })
    return () => subscription.unsubscribe()
  }, [])

  return { domains, isAuthed }
}

// Resolve an area-page pathname (/app/area/<slug>) to that area's container UUID, via
// slug → domain_code (canonical area config) → the user's matching container. Returns
// null for any non-area path or before the containers have loaded. Pure — safe to call
// every render.
export function areaContainerIdForPath(domains: DomainContainer[], pathname: string): string | null {
  const match = pathname.match(/^\/app\/area\/([^/?#]+)/)
  if (!match) return null
  const area = areaBySlug(match[1])
  if (!area) return null
  return domains.find((d) => d.domain_code === area.domainCode)?.id ?? null
}
