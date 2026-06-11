import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { createClient } from '@supabase/supabase-js'
import { logEvent } from '@/lib/analytics'
import { isPasswordLeaked } from '@/lib/password-leak'
import { buildPasswordChangedEmail, notifyPrimaryAndRecovery, PASSWORD_CHANGED_SUBJECT } from '@/lib/account-notifications'

// Password change. Verifies the current password server-side (signInWithPassword),
// then writes the new password via the service-role admin API. The admin write is
// deliberate: GoTrue's `current_password_required` is default-on in newer Supabase
// with no dashboard toggle, so client `updateUser({password})` is blocked; the admin
// API bypasses it. We own the "password changed" notification here (admin writes
// don't fire Supabase's auto one) — sent to the primary and the VERIFIED recovery
// email, best-effort. See CLAUDE.md "Account recovery email".
export async function POST(req: NextRequest) {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: Record<string, unknown>
  try { body = await req.json() }
  catch { return NextResponse.json({ error: 'Invalid request body' }, { status: 400 }) }

  const currentPassword = body.currentPassword as string
  const newPassword     = body.newPassword as string
  if (!currentPassword || !newPassword) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }
  if (newPassword.length < 12) {
    return NextResponse.json({ error: 'New password must be at least 12 characters.' }, { status: 400 })
  }

  // App-level current-password gate.
  const { error: authErr } = await supabase.auth.signInWithPassword({ email: user.email!, password: currentPassword })
  if (authErr) return NextResponse.json({ error: 'Current password is incorrect.' }, { status: 401 })

  // Leaked-password protection (admin write bypasses Supabase's, so re-check here).
  if (await isPasswordLeaked(newPassword)) {
    return NextResponse.json(
      { error: 'This password has appeared in a known data breach. Please choose a different one.' },
      { status: 400 }
    )
  }

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceKey) return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
  const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  const { error: updErr } = await admin.auth.admin.updateUserById(user.id, { password: newPassword })
  if (updErr) {
    return NextResponse.json({ error: updErr.message || 'Failed to update password. Please try again.' }, { status: 400 })
  }

  logEvent({ userId: user.id, eventName: 'account_settings_updated', metadata: { type: 'password' } })

  // Revoke the user's OTHER sessions (keep this device), mirroring the Phase 4 recovery
  // flow — a password change shouldn't leave other sessions alive. The current-password
  // gate above re-issued this device's session (cookies are writable in a route handler),
  // so getSession() returns the access token to keep. Fail-open: the password is already
  // changed, so a signOut failure must be logged but must not fail the response.
  try {
    // LOAD-BEARING: this returns the token of the session the current device will keep
    // *because* the signInWithPassword gate above re-issued it and the route handler's
    // cookie store is writable (so the browser adopts it). If that gate is ever removed
    // or the cookie store made read-only, getSession() would return the pre-gate token
    // and 'others' could revoke this device instead of keeping it — re-verify then.
    const { data: { session } } = await supabase.auth.getSession()
    const accessToken = session?.access_token
    if (accessToken) {
      const { error: signOutErr } = await admin.auth.admin.signOut(accessToken, 'others')
      if (signOutErr) console.error('[password] revoke other sessions failed', signOutErr)
    } else {
      console.error('[password] no access token available; skipped revoking other sessions')
    }
  } catch (err) {
    console.error('[password] revoke other sessions threw', err)
  }

  // Notify primary + verified recovery email. Best-effort — the password is already
  // changed; a notification failure must not undo it.
  try {
    const firstName = (user.user_metadata?.first_name as string | undefined) ?? ''
    await notifyPrimaryAndRecovery(admin, user.id, user.email, PASSWORD_CHANGED_SUBJECT, buildPasswordChangedEmail(firstName))
  } catch (err) {
    console.error('[password] change notification failed', err)
  }

  return NextResponse.json({ ok: true })
}
