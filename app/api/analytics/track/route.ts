import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { createClient } from '@supabase/supabase-js'
import { logEvent } from '@/lib/analytics'

const ALLOWED_EVENTS = new Set([
  'signup_submitted',
  'payment_started',
  'platform_entered',
  'learn_page_viewed',
  'account_settings_updated',
  'document_opened',
  'document_field_saved',
  'activity_opened',
  'activity_engaged',
  'export_generated',
])

export async function POST(req: NextRequest) {
  let body: { eventName: string; metadata?: Record<string, unknown> }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
  }

  const { eventName, metadata } = body
  if (!ALLOWED_EVENTS.has(eventName)) {
    return NextResponse.json({ error: 'Invalid event' }, { status: 400 })
  }

  let userId: string | null = null
  try {
    const supabase = await createSupabaseServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    userId = user?.id ?? null
  } catch {
    // unauthed — ok for signup_submitted
  }

  // Fallback: accept userId from metadata for pre-auth events (signup_submitted)
  if (!userId && metadata?.userId && typeof metadata.userId === 'string') {
    userId = metadata.userId
  }

  // platform_entered: only fire once, then set flag in user_profiles
  if (eventName === 'platform_entered' && userId) {
    const admin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )
    const { data: profile } = await admin
      .from('user_profiles')
      .select('platform_entered_at')
      .eq('user_id', userId)
      .single()

    if (profile?.platform_entered_at) {
      return NextResponse.json({ ok: true, skipped: true })
    }

    await admin
      .from('user_profiles')
      .update({ platform_entered_at: new Date().toISOString() })
      .eq('user_id', userId)
  }

  await logEvent({ userId, eventName, metadata })
  return NextResponse.json({ ok: true })
}
