import { createClient, SupabaseClient } from '@supabase/supabase-js'

interface LogEventParams {
  userId?:               string | null
  eventName:             string
  metadata?:             Record<string, unknown> | null
  planningStatus?:       string | null
  includePlanningStatus?: boolean
}

function getAdmin(): SupabaseClient {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

async function computePlanningStatus(userId: string, admin: SupabaseClient): Promise<string> {
  const [{ count: entries }, { count: notes }] = await Promise.all([
    admin.from('entries').select('*', { count: 'exact', head: true }).eq('user_id', userId),
    admin.from('notes').select('*', { count: 'exact', head: true }).eq('user_id', userId),
  ])
  const total = (entries ?? 0) + (notes ?? 0)
  if (total === 0)  return 'Just beginning'
  if (total < 5)   return 'Underway'
  if (total < 15)  return 'Well underway'
  return 'Comprehensive'
}

export async function logEvent({
  userId, eventName, metadata, planningStatus, includePlanningStatus,
}: LogEventParams): Promise<void> {
  try {
    const admin = getAdmin()

    let resolvedStatus = planningStatus ?? null
    if (includePlanningStatus && userId && !resolvedStatus) {
      resolvedStatus = await computePlanningStatus(userId, admin)
    }

    await admin.from('analytics_events').insert({
      user_id:         userId ?? null,
      event_name:      eventName,
      event_metadata:  metadata ?? null,
      planning_status: resolvedStatus,
    })
  } catch {
    // Fire-and-forget: never throw
  }
}
