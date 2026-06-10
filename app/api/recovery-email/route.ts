import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { createClient } from '@supabase/supabase-js'
import { logEvent } from '@/lib/analytics'
import { issueToken, invalidateVerifyTokens, sendVerificationEmail } from '@/lib/recovery-email'
import { sendEmail } from '@/lib/email'
import { buildRecoveryRemovedEmail, RECOVERY_REMOVED_SUBJECT } from '@/lib/account-notifications'
import { checkAndRecordEmailSend, EMAIL_THROTTLE_MESSAGE } from '@/lib/email-throttle'

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

// Recovery-email account management: add / change / remove / resend. Re-auths the
// caller's password server-side (like the legacy-contact manage route), then does
// the service-role token + profile work. The token engine itself lives in
// lib/recovery-email.ts (Phase 2) — this route is the authenticated front door.
export async function POST(req: NextRequest) {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: Record<string, unknown>
  try { body = await req.json() }
  catch { return NextResponse.json({ error: 'Invalid request body' }, { status: 400 }) }

  const action   = body.action as string
  const password = body.password as string
  if (!action || !password) return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })

  // Step-up: re-verify the password (consistent with every Account Access operation).
  const { error: authErr } = await supabase.auth.signInWithPassword({ email: user.email!, password })
  if (authErr) return NextResponse.json({ error: 'Incorrect password' }, { status: 401 })

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceKey) return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
  const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  const userId    = user.id
  const origin    = req.nextUrl.origin
  const firstName = (user.user_metadata?.first_name as string | undefined) ?? ''

  async function issueAndSend(email: string): Promise<boolean> {
    const raw = await issueToken(userId, 'verify', email)
    const verifyUrl = `${origin}/auth/recovery-email/verify?token=${encodeURIComponent(raw)}`
    const result = await sendVerificationEmail(email, firstName, verifyUrl)
    return result.ok
  }

  // ── Remove ──
  if (action === 'remove') {
    await invalidateVerifyTokens(userId)
    const { error } = await admin
      .from('user_profiles')
      .update({ recovery_email: null, recovery_email_verified: false })
      .eq('user_id', userId)
    if (error) return NextResponse.json({ error: 'Failed to remove. Please try again.' }, { status: 500 })
    logEvent({ userId, eventName: 'recovery_email_updated', metadata: { action: 'remove' } })
    // The change is immediately real → notify the PRIMARY email (best-effort).
    try {
      await sendEmail({ to: user.email!, subject: RECOVERY_REMOVED_SUBJECT, html: buildRecoveryRemovedEmail(firstName) })
    } catch (err) {
      console.error('[recovery-email] removed notification failed', err)
    }
    return NextResponse.json({ ok: true })
  }

  // ── Resend ── invalidate first, then issue + send (no valid token if the send fails)
  if (action === 'resend') {
    const { data: profile } = await admin
      .from('user_profiles').select('recovery_email')
      .eq('user_id', userId).maybeSingle()
    const current = (profile?.recovery_email as string | null | undefined) ?? null
    if (!current) return NextResponse.json({ error: 'No recovery email to verify.' }, { status: 400 })
    // Throttle: resend re-sends a verification to the stored (user-supplied) address.
    const { allowed } = await checkAndRecordEmailSend(admin, userId, 'recovery_email_resend')
    if (!allowed) return NextResponse.json({ error: EMAIL_THROTTLE_MESSAGE }, { status: 429 })
    await invalidateVerifyTokens(userId)
    const sent = await issueAndSend(current)
    if (!sent) return NextResponse.json({ error: 'Could not send the verification email. Please try again.' }, { status: 502 })
    logEvent({ userId, eventName: 'recovery_email_updated', metadata: { action: 'resend' } })
    return NextResponse.json({ ok: true, emailSent: true })
  }

  // ── Add ── (there is no "change": switching addresses = remove then add, which
  // matches the model — a recovery email has no persistent identity to mutate.)
  if (action === 'add') {
    const email = (body.email as string | undefined)?.trim().toLowerCase() ?? ''
    if (!email) return NextResponse.json({ error: 'Recovery email is required.' }, { status: 400 })
    if (!isValidEmail(email)) return NextResponse.json({ error: 'Please enter a valid email address.' }, { status: 400 })
    if (email === user.email?.toLowerCase()) {
      return NextResponse.json({ error: 'Your recovery email must be different from your primary email.' }, { status: 400 })
    }

    // Throttle: add sends a verification to a fresh user-supplied address.
    const { allowed } = await checkAndRecordEmailSend(admin, userId, 'recovery_email_add')
    if (!allowed) return NextResponse.json({ error: EMAIL_THROTTLE_MESSAGE }, { status: 429 })

    // Defensive: clear any stray outstanding verify tokens before issuing a fresh one.
    await invalidateVerifyTokens(userId)

    // Persist BEFORE sending (Phase 2 principle): a failed send leaves a recoverable
    // pending-unverified state rather than dropping the user's input.
    const { error } = await admin
      .from('user_profiles')
      .update({ recovery_email: email, recovery_email_verified: false })
      .eq('user_id', userId)
    if (error) return NextResponse.json({ error: 'Failed to save. Please try again.' }, { status: 500 })

    const sent = await issueAndSend(email)
    logEvent({ userId, eventName: 'recovery_email_updated', metadata: { action } })
    return NextResponse.json({ ok: true, emailSent: sent })
  }

  return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
}
