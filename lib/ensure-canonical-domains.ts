import type { SupabaseClient } from '@supabase/supabase-js'

// The six canonical planning domains. Seeded idempotently on first visit to any
// Plan-section surface so every user has all six. Matched on the stable
// domain_code, with title as a safety net for legacy rows predating the code
// backfill, so re-seeding never duplicates.
export const CANONICAL_DOMAINS: { title: string; code: string }[] = [
  { title: 'Deathcare',         code: 'deathcare' },
  { title: 'Healthcare Wishes', code: 'healthcare' },
  { title: 'Legacy',            code: 'legacy' },
  { title: 'Personal Admin',    code: 'personal_admin' },
  { title: 'Ritual & Ceremony', code: 'ritual' },
  { title: 'Wills & Estates',   code: 'wills_estates' },
]

// Ensure all six canonical domains exist for the user. Idempotent — only inserts
// the ones they're missing — so it's safe to call on every Plan-section page load
// (landing / progress / materials), each of which can be a direct entry point.
export async function ensureCanonicalDomains(supabase: SupabaseClient, userId: string): Promise<void> {
  const { data: existing } = await supabase
    .from('containers')
    .select('title, domain_code')
    .eq('type', 'domain')
    .eq('user_id', userId)

  const existingCodes = new Set((existing ?? []).map((d) => d.domain_code).filter((c): c is string => !!c))
  const existingTitles = new Set((existing ?? []).map((d) => d.title))
  const toInsert = CANONICAL_DOMAINS.filter((d) => !existingCodes.has(d.code) && !existingTitles.has(d.title))
  if (toInsert.length > 0) {
    await supabase
      .from('containers')
      .insert(toInsert.map((d) => ({ user_id: userId, type: 'domain', title: d.title, domain_code: d.code })))
  }
}
