import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { buildPasswordChangedEmail, notifyPrimaryAndRecovery, PASSWORD_CHANGED_SUBJECT } from '@/lib/account-notifications'

// Forgot-password reset completion → notify primary + verified recovery. The
// reset-password page calls this AFTER updateUser succeeds and BEFORE it signs out
// (the recovery session must still be valid for getUser here). Supabase's auto
// "password changed" email is OFF, so without this a reset notifies no one.
// Best-effort: a send failure never blocks the reset.
export async function POST() {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const firstName = (user.user_metadata?.first_name as string | undefined) ?? ''
    await notifyPrimaryAndRecovery(supabase, user.id, user.email, PASSWORD_CHANGED_SUBJECT, buildPasswordChangedEmail(firstName))
  } catch (err) {
    console.error('[password-reset] notification failed', err)
  }

  return NextResponse.json({ ok: true })
}
