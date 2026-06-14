import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { createClient } from '@supabase/supabase-js'
import { logEvent } from '@/lib/analytics'
import { sendEmail, brandedEmail } from '@/lib/email'
import { consumeToken } from '@/lib/recovery-email'
import { isPasswordLeaked } from '@/lib/password-leak'

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function recoveredSubject(audience: 'primary' | 'recovery'): string {
  // Primary recipient may NOT have initiated recovery — lead with the action so an
  // unexpected change is recognizable. Recovery recipient is likely the initiator.
  return audience === 'primary'
    ? 'Your password has been changed via account recovery'
    : 'You recovered access to your Nightside Planning Studio account'
}

function buildRecoveredEmail(firstName: string, audience: 'primary' | 'recovery'): string {
  const name = firstName?.trim() || 'there'
  if (audience === 'primary') {
    return brandedEmail(`
      <h2 style="margin-top:0;font-size:22px;color:#130426;">Your password has been changed via account recovery</h2>
      <p style="color:#130426;line-height:1.65;">Hi ${esc(name)},</p>
      <p style="color:#130426;line-height:1.65;">Your Nightside Planning Studio password was just changed using account recovery — meaning someone used your recovery email to set a new password. Other sessions have been signed out for security.</p>
      <p style="color:#130426;line-height:1.65;">If this was you, no further action is needed.</p>
      <p style="color:#130426;line-height:1.65;"><strong>If this wasn't you</strong>, please contact us immediately at <a href="mailto:contact@thenightside.net" style="color:#2C3777;">contact@thenightside.net</a>.</p>
    `)
  }
  return brandedEmail(`
    <h2 style="margin-top:0;font-size:22px;color:#130426;">You recovered access to your account</h2>
    <p style="color:#130426;line-height:1.65;">Hi ${esc(name)},</p>
    <p style="color:#130426;line-height:1.65;">You just recovered access to your account using your recovery email. Your password has been reset and other sessions have been signed out for security.</p>
    <p style="color:#130426;line-height:1.65;">You can now sign in with your primary email and your new password.</p>
  `)
}

// Promotion notifications — sent when the user chose to make their recovery address
// the new sign-in email (the addresses swap roles).
const PROMOTED_NEW_PRIMARY_SUBJECT = 'This is now your Nightside Planning Studio sign-in email'
const PROMOTED_OLD_PRIMARY_SUBJECT = 'Your Nightside Planning Studio sign-in email has changed'

// To the NEW primary (= the recovery address, the initiator). Emphasizes the now-empty
// recovery channel — the highest-priority thing for them to act on.
function buildPromotedNewPrimaryEmail(firstName: string): string {
  const name = firstName?.trim() || 'there'
  return brandedEmail(`
    <h2 style="margin-top:0;font-size:22px;color:#130426;">This is now your sign-in email</h2>
    <p style="color:#130426;line-height:1.65;">Hi ${esc(name)},</p>
    <p style="color:#130426;line-height:1.65;">You recovered access to your Nightside Planning Studio account and chose to make this address your new sign-in email. Your password has been reset and other sessions have been signed out for security.</p>
    <p style="color:#130426;line-height:1.65;">From now on, sign in with this address and your new password.</p>
    <p style="color:#130426;line-height:1.65;"><strong>Important:</strong> you no longer have a recovery email set. If you lose access to this email in the future, you won't be able to recover your account. We recommend adding a new recovery email in your account settings.</p>
    <p style="color:#130426;line-height:1.65;"><strong>If this wasn't you</strong>, please contact us immediately at <a href="mailto:contact@thenightside.net" style="color:#2C3777;">contact@thenightside.net</a>.</p>
  `)
}

// To the OLD primary (changed away from). Security notice — if an attacker drove the
// recovery and the real owner still sees this inbox, this is their signal.
function buildPromotedOldPrimaryEmail(firstName: string): string {
  const name = firstName?.trim() || 'there'
  return brandedEmail(`
    <h2 style="margin-top:0;font-size:22px;color:#130426;">Your sign-in email has changed</h2>
    <p style="color:#130426;line-height:1.65;">Hi ${esc(name)},</p>
    <p style="color:#130426;line-height:1.65;">Your Nightside Planning Studio account was recovered using your recovery email, and the account's sign-in email was changed from this address to a new one. Your password was reset and other sessions were signed out for security.</p>
    <p style="color:#130426;line-height:1.65;">This means this email address can no longer be used to sign in to the account.</p>
    <p style="color:#130426;line-height:1.65;"><strong>If this wasn't you</strong>, please contact us immediately at <a href="mailto:contact@thenightside.net" style="color:#2C3777;">contact@thenightside.net</a>.</p>
  `)
}

// Lost-email recovery — confirm step (POST consumes the token; GET on the page only
// peeks, so it's prefetch-safe). Steps: HIBP leak check → consume 'recovery' token →
// admin password write → sign in on THIS device → revoke OTHER sessions → notify both
// addresses. Mirrors the Phase 3 password-change pattern (admin write + HIBP).
export async function POST(req: NextRequest) {
  let body: Record<string, unknown>
  try { body = await req.json() }
  catch { return NextResponse.json({ error: 'Invalid request body' }, { status: 400 }) }

  const token       = (body.token as string | undefined)?.trim() ?? ''
  const password    = body.password as string
  const signInEmail = body.signInEmail as string | undefined
  if (!token || !password) return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  if (password.length < 12) return NextResponse.json({ error: 'New password must be at least 12 characters.' }, { status: 400 })
  if (signInEmail !== 'previous' && signInEmail !== 'recovery') {
    return NextResponse.json({ error: 'Please choose which email to sign in with.' }, { status: 400 })
  }

  // HIBP BEFORE consuming, so a leaked-password rejection doesn't burn the single-use token.
  if (await isPasswordLeaked(password)) {
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

  const consumed = await consumeToken(token, 'recovery')
  if (!consumed) {
    return NextResponse.json({ error: 'This recovery link is no longer valid. Please request a new one.' }, { status: 400 })
  }

  const { data: userData } = await admin.auth.admin.getUserById(consumed.userId)
  const primaryEmail = userData?.user?.email
  const firstName    = (userData?.user?.user_metadata?.first_name as string | undefined) ?? ''
  if (!primaryEmail) return NextResponse.json({ error: 'Account not found.' }, { status: 400 })

  const { error: updErr } = await admin.auth.admin.updateUserById(consumed.userId, { password })
  if (updErr) {
    console.error('[recover-account] admin updateUserById failed', updErr)
    return NextResponse.json({ error: "Couldn't set your new password. Please try again." }, { status: 400 })
  }

  // Optional promotion: the user chose to make their recovery address the new sign-in
  // email (their previous primary is gone). The admin email write bypasses the
  // secure-email-change confirmation — verified to work without old-email access.
  let signInPrimary = primaryEmail
  let promoted = false
  let promotionFailed = false
  if (signInEmail === 'recovery') {
    const { error: emailErr } = await admin.auth.admin.updateUserById(consumed.userId, {
      email: consumed.email,
      email_confirm: true,
    })
    if (emailErr) {
      // Rare (e.g. the address already belongs to another account). Fail safe: the
      // password is already reset, so keep the previous primary rather than brick recovery.
      console.error('[recover-account] primary-email promotion failed', emailErr)
      promotionFailed = true
    } else {
      signInPrimary = consumed.email
      promoted = true
      // The recovery address is now the primary — clear the (now-defunct) recovery channel.
      const { error: clearErr } = await admin
        .from('user_profiles')
        .update({ recovery_email: null, recovery_email_verified: false })
        .eq('user_id', consumed.userId)
      if (clearErr) console.error('[recover-account] clearing recovery channel failed', clearErr)
    }
  }

  // Sign in on THIS device — needs only the address + the just-set password (no email
  // access required), establishing the session we keep.
  const supabase = await createSupabaseServerClient()
  const { data: signInData, error: signInErr } = await supabase.auth.signInWithPassword({ email: signInPrimary, password })
  if (signInErr) console.error('[recover-account] post-update sign-in failed', signInErr)

  // Revoke OTHER sessions (scope 'others' keeps this one — the device that recovered).
  const accessToken = signInData?.session?.access_token
  if (accessToken) {
    try { await admin.auth.admin.signOut(accessToken, 'others') }
    catch (e) { console.error('[recover-account] signOut others failed', e) }
  }

  logEvent({ userId: consumed.userId, eventName: 'account_recovered' })

  // Notify both addresses — best-effort; never undo the recovery.
  try {
    if (promoted) {
      // Addresses swapped roles: tell the OLD primary it can no longer sign in, and
      // the NEW primary (= the recovery address) that it's now the sign-in email.
      await Promise.all([
        sendEmail({ to: primaryEmail.toLowerCase(),   subject: PROMOTED_OLD_PRIMARY_SUBJECT, html: buildPromotedOldPrimaryEmail(firstName) }),
        sendEmail({ to: consumed.email.toLowerCase(), subject: PROMOTED_NEW_PRIMARY_SUBJECT, html: buildPromotedNewPrimaryEmail(firstName) }),
      ])
    } else {
      // No promotion (incl. the promotion-failed fallback): roles unchanged, current copy.
      await Promise.all([
        sendEmail({ to: primaryEmail.toLowerCase(),   subject: recoveredSubject('primary'),  html: buildRecoveredEmail(firstName, 'primary') }),
        sendEmail({ to: consumed.email.toLowerCase(), subject: recoveredSubject('recovery'), html: buildRecoveredEmail(firstName, 'recovery') }),
      ])
    }
  } catch (err) {
    console.error('[recover-account] notification failed', err)
  }

  return NextResponse.json({ ok: true, promoted, promotionFailed })
}
