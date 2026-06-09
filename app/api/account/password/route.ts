import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { createClient } from '@supabase/supabase-js'
import { logEvent } from '@/lib/analytics'
import { sendEmail, brandedEmail } from '@/lib/email'
import { isPasswordLeaked } from '@/lib/password-leak'

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function buildPasswordChangedEmail(firstName: string): string {
  const name = firstName?.trim() || 'there'
  return brandedEmail(`
    <h2 style="margin-top:0;font-size:22px;color:#130426;">Your password was changed</h2>
    <p style="color:#130426;line-height:1.65;">Hi ${esc(name)},</p>
    <p style="color:#130426;line-height:1.65;">The password for your account on The Nightside Planning Studio was just changed. If this was you, there's nothing else to do.</p>
    <p style="color:#130426;line-height:1.65;"><strong>If you didn't change your password</strong>, your account may have been accessed without your permission. Contact us right away at <a href="mailto:contact@thenightside.net" style="color:#2C3777;">contact@thenightside.net</a> and we'll help you secure it.</p>
  `)
}

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

  // Notify primary + verified recovery email. Best-effort — the password is already
  // changed; a notification failure must not undo it.
  try {
    const firstName = (user.user_metadata?.first_name as string | undefined) ?? ''
    const subject   = 'Your Nightside Planning Studio password was changed'
    const html      = buildPasswordChangedEmail(firstName)

    const recipients = new Set<string>()
    if (user.email) recipients.add(user.email.toLowerCase())
    const { data: profile } = await admin
      .from('user_profiles').select('recovery_email, recovery_email_verified')
      .eq('user_id', user.id).maybeSingle()
    if (profile?.recovery_email && profile.recovery_email_verified) {
      recipients.add((profile.recovery_email as string).toLowerCase())
    }
    await Promise.all([...recipients].map(to => sendEmail({ to, subject, html })))
  } catch (err) {
    console.error('[password] change notification failed', err)
  }

  return NextResponse.json({ ok: true })
}
