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
  'activity_contributed',
  'export_generated',
  'sign_in',
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

  // sign_in: read previous last_sign_in_at, compute delta, update to now, then log
  if (eventName === 'sign_in' && userId) {
    const admin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )
    const { data: profile } = await admin
      .from('user_profiles')
      .select('last_sign_in_at')
      .eq('user_id', userId)
      .single()

    const previousSignInAt: string | null = profile?.last_sign_in_at ?? null
    const now = new Date()
    const daysSince = previousSignInAt
      ? Math.floor((now.getTime() - new Date(previousSignInAt).getTime()) / (1000 * 60 * 60 * 24))
      : null

    await admin
      .from('user_profiles')
      .update({ last_sign_in_at: now.toISOString() })
      .eq('user_id', userId)

    await logEvent({
      userId,
      eventName: 'sign_in',
      metadata: { days_since_last_sign_in: daysSince },
      includePlanningStatus: true,
    })
    return NextResponse.json({ ok: true })
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
