import { createClient } from '@supabase/supabase-js'

interface LogEventParams {
  userId?:        string | null
  eventName:      string
  metadata?:      Record<string, unknown> | null
  planningStatus?: string | null
}

export async function logEvent({ userId, eventName, metadata, planningStatus }: LogEventParams): Promise<void> {
  try {
    const admin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )
    await admin.from('analytics_events').insert({
      user_id:        userId ?? null,
      event_name:     eventName,
      event_metadata: metadata ?? null,
      planning_status: planningStatus ?? null,
    })
  } catch {
    // Fire-and-forget: never throw
  }
}
