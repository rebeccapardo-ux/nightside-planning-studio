import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { createClient } from '@supabase/supabase-js'
import { logEvent } from '@/lib/analytics'
import { sendEmail } from '@/lib/email'
import {
  buildEmailChangedNewEmail, buildEmailChangedOldEmail,
  EMAIL_CHANGED_NEW_SUBJECT, EMAIL_CHANGED_OLD_SUBJECT,
} from '@/lib/account-notifications'
import { checkAndRecordEmailSend, EMAIL_THROTTLE_MESSAGE } from '@/lib/email-throttle'

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

// Direct primary-email change. Verifies the current password server-side
// (signInWithPassword step-up), then writes the new email via the service-role admin
// API with email_confirm: true. The admin write is deliberate — it bypasses Supabase's
// secure-email-change DUAL confirmation (whose UX is broken: both addresses must confirm,
// with no in-product signal) and applies the change immediately. Step-up auth is the
// gate; we own the notifications (old + new address), best-effort. See CLAUDE.md.
export async function POST(req: NextRequest) {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: Record<string, unknown>
  try { body = await req.json() }
  catch { return NextResponse.json({ error: 'Invalid request body' }, { status: 400 }) }

  const currentPassword = body.currentPassword as string
  const newEmail        = (body.newEmail as string | undefined)?.trim().toLowerCase() ?? ''
  if (!currentPassword || !newEmail) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }
  if (!isValidEmail(newEmail)) {
    return NextResponse.json({ error: 'Please enter a valid email address.' }, { status: 400 })
  }
  if (newEmail === user.email?.toLowerCase()) {
    return NextResponse.json({ error: 'This is already your email address.' }, { status: 400 })
  }

  // App-level current-password gate (step-up), same pattern as the password route.
  const { error: authErr } = await supabase.auth.signInWithPassword({ email: user.email!, password: currentPassword })
  if (authErr) return NextResponse.json({ error: 'Current password is incorrect.' }, { status: 401 })

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceKey) return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
  const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  // Throttle: this sends a notification to a user-supplied address. After the step-up
  // gate (a wrong password spends no budget), before the write/send.
  const { allowed } = await checkAndRecordEmailSend(admin, user.id, 'account_email_change')
  if (!allowed) return NextResponse.json({ error: EMAIL_THROTTLE_MESSAGE }, { status: 429 })

  const oldEmail = user.email! // capture before the change, for the old-address notice

  const { error: updErr } = await admin.auth.admin.updateUserById(user.id, { email: newEmail, email_confirm: true })
  if (updErr) {
    // Atomic failure — nothing changed. Surface the uniqueness case clearly.
    console.error('[account-email] admin updateUserById failed', updErr)
    if (/already|registered|exists|in use|duplicate/i.test(updErr.message)) {
      return NextResponse.json({ error: 'That email is already in use.' }, { status: 409 })
    }
    return NextResponse.json({ error: "Couldn't update your email. Please try again." }, { status: 400 })
  }

  logEvent({ userId: user.id, eventName: 'account_settings_updated', metadata: { type: 'email' } })

  // Notify both addresses — best-effort; the change is already live, a send failure
  // must not undo it. (NOT session-revoking: an email change isn't a credential change.)
  try {
    const firstName = (user.user_metadata?.first_name as string | undefined) ?? ''
    await Promise.all([
      sendEmail({ to: oldEmail.toLowerCase(), subject: EMAIL_CHANGED_OLD_SUBJECT, html: buildEmailChangedOldEmail(firstName) }),
      sendEmail({ to: newEmail,               subject: EMAIL_CHANGED_NEW_SUBJECT, html: buildEmailChangedNewEmail(firstName) }),
    ])
  } catch (err) {
    console.error('[account-email] change notification failed', err)
  }

  return NextResponse.json({ ok: true })
}
