// Recovery-email engine (server-side, service-role only).
//
// Tokens are single-use and time-limited. We store only a SHA-256 HASH of each
// token; the raw token is returned to the caller and only ever travels in the
// emailed link, so a DB read can't yield a usable link. Each token snapshots the
// email it was issued for, so editing a pending recovery address invalidates old
// links (staleness detection at consume time).
//
// The recovery email is, by design, the primary user's OWN backup address — see
// CLAUDE.md "Account recovery email". Copy and semantics assume that.

import { createClient } from '@supabase/supabase-js'
import crypto from 'node:crypto'
import { sendEmail, brandedEmail, type SendEmailResult } from './email'

export type RecoveryTokenPurpose = 'verify' | 'recovery'

// Single-use TTLs per purpose. 'recovery' is exercised in Phase 4 (lost-email flow).
const TOKEN_TTL_MS: Record<RecoveryTokenPurpose, number> = {
  verify:   24 * 60 * 60 * 1000, // 24h
  recovery: 60 * 60 * 1000,      // 60m
}

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  )
}

function hashToken(raw: string): string {
  return crypto.createHash('sha256').update(raw).digest('hex')
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

// Issue a single-use, time-limited token. Stores only the hash; returns the raw token.
export async function issueToken(
  userId: string,
  purpose: RecoveryTokenPurpose,
  email: string,
): Promise<string> {
  const raw = crypto.randomBytes(32).toString('base64url')
  const expiresAt = new Date(Date.now() + TOKEN_TTL_MS[purpose]).toISOString()
  const { error } = await adminClient().from('recovery_email_tokens').insert({
    user_id:    userId,
    token_hash: hashToken(raw),
    email:      email.toLowerCase(),
    purpose,
    expires_at: expiresAt,
  })
  if (error) throw new Error(`Failed to issue recovery token: ${error.message}`)
  return raw
}

// Consume a token: must be unused, unexpired, and of the expected purpose. Stamps
// used_at (guarded on used_at IS NULL so a race can't double-consume) and returns
// {userId, email}. Returns null otherwise — the caller decides the UX.
export async function consumeToken(
  rawToken: string,
  expectedPurpose: RecoveryTokenPurpose,
): Promise<{ userId: string; email: string } | null> {
  if (!rawToken) return null
  const admin = adminClient()
  const { data, error } = await admin
    .from('recovery_email_tokens')
    .select('id, user_id, email')
    .eq('token_hash', hashToken(rawToken))
    .eq('purpose', expectedPurpose)
    .is('used_at', null)
    .gt('expires_at', new Date().toISOString())
    .maybeSingle()
  if (error || !data) return null

  const { data: stamped } = await admin
    .from('recovery_email_tokens')
    .update({ used_at: new Date().toISOString() })
    .eq('id', data.id)
    .is('used_at', null)
    .select('id')
    .maybeSingle()
  if (!stamped) return null // lost a race — treat as not consumed

  return { userId: data.user_id, email: data.email }
}

// Read a token's state WITHOUT consuming it. Lets a GET render the right page (e.g.
// "already verified" for a used token) instead of showing the Confirm landing for a
// non-pristine token. Stays prefetch-safe — only the POST consume mutates.
export async function peekToken(
  rawToken: string,
  expectedPurpose: RecoveryTokenPurpose,
): Promise<'pristine' | 'used' | 'expired' | 'invalid'> {
  if (!rawToken) return 'invalid'
  const { data } = await adminClient()
    .from('recovery_email_tokens')
    .select('used_at, expires_at')
    .eq('token_hash', hashToken(rawToken))
    .eq('purpose', expectedPurpose)
    .maybeSingle()
  if (!data) return 'invalid'
  if (data.used_at) return 'used'
  if (new Date(data.expires_at as string).getTime() <= Date.now()) return 'expired'
  return 'pristine'
}

// Invalidate every outstanding (unused) 'verify' token for a user. Called before
// re-issuing on change / remove / resend so previously-sent verify links stop working.
export async function invalidateVerifyTokens(userId: string): Promise<void> {
  await adminClient()
    .from('recovery_email_tokens')
    .update({ used_at: new Date().toISOString() })
    .eq('user_id', userId)
    .eq('purpose', 'verify')
    .is('used_at', null)
}

// Verify-flow composition: consume a 'verify' token, confirm its snapshot still
// matches the account's CURRENT recovery_email (else 'stale'), then flip
// recovery_email_verified. The token is consumed (one-time) regardless of outcome.
export async function confirmVerifyToken(rawToken: string): Promise<'verified' | 'stale' | 'invalid'> {
  const consumed = await consumeToken(rawToken, 'verify')
  if (!consumed) return 'invalid'

  const admin = adminClient()
  const { data: profile } = await admin
    .from('user_profiles')
    .select('recovery_email')
    .eq('user_id', consumed.userId)
    .maybeSingle()

  const current = (profile?.recovery_email as string | null | undefined)?.toLowerCase() ?? null
  if (!current || current !== consumed.email.toLowerCase()) return 'stale'

  const { error } = await admin
    .from('user_profiles')
    .update({ recovery_email_verified: true })
    .eq('user_id', consumed.userId)
  if (error) return 'invalid'
  return 'verified'
}

// Provision the recovery email AFTER primary-email confirmation (decision b): read
// the pending address from signup metadata, validate, persist it (unverified),
// issue a verify token, and send the verification email. Idempotent — a re-clicked
// confirmation link won't re-issue or re-send. Never throws meaningfully to the
// caller for send/validation issues; the caller should still guard the call.
export async function provisionRecoveryEmailFromMetadata(
  user: { id: string; email?: string | null; user_metadata?: Record<string, unknown> | null },
  origin: string,
): Promise<void> {
  const pending = (user.user_metadata?.recovery_email as string | undefined)?.trim().toLowerCase()
  if (!pending) return

  // Server-side validation: must differ from the primary email.
  if (user.email && pending === user.email.toLowerCase()) {
    console.warn('[recovery-email] pending recovery email equals primary; skipping', { userId: user.id })
    return
  }

  const admin = adminClient()

  // Idempotency: if recovery_email is already set (a prior callback run), do nothing.
  const { data: profile } = await admin
    .from('user_profiles').select('recovery_email')
    .eq('user_id', user.id).maybeSingle()
  if (profile?.recovery_email) return

  const { error: updErr } = await admin
    .from('user_profiles')
    .update({ recovery_email: pending, recovery_email_verified: false })
    .eq('user_id', user.id)
  if (updErr) {
    console.error('[recovery-email] failed to set recovery_email', updErr)
    return
  }

  const raw = await issueToken(user.id, 'verify', pending)
  const firstName = (user.user_metadata?.first_name as string | undefined) ?? ''
  const verifyUrl = `${origin}/auth/recovery-email/verify?token=${encodeURIComponent(raw)}`
  const result = await sendVerificationEmail(pending, firstName, verifyUrl)
  if (!result.ok) console.error('[recovery-email] verification email send failed', result.error)
}

// ── Verification email ───────────────────────────────────────────────────────

export function buildVerificationEmail(firstName: string, verifyUrl: string): string {
  const name = firstName?.trim() || 'there'
  return brandedEmail(`
    <h2 style="margin-top:0;font-size:22px;color:#130426;">Confirm your recovery email</h2>
    <p style="color:#130426;line-height:1.65;">Hi ${escapeHtml(name)},</p>
    <p style="color:#130426;line-height:1.65;">You added this email address as the recovery email for your account on The Nightside Planning Studio. If you ever lose access to your main email, this address will be used to help you regain access.</p>
    <p style="margin:28px 0;">
      <a href="${verifyUrl}" style="display:inline-block;background:#2C3777;color:#ffffff;text-decoration:none;padding:12px 22px;border-radius:8px;font-size:15px;">Confirm this email address</a>
    </p>
    <p style="color:#130426;line-height:1.65;">If you didn't expect this email, please ignore it — no further action is needed.</p>
  `)
}

export async function sendVerificationEmail(
  to: string,
  firstName: string,
  verifyUrl: string,
): Promise<SendEmailResult> {
  return sendEmail({
    to: to.toLowerCase(),
    subject: 'Confirm your recovery email for The Nightside Planning Studio',
    html: buildVerificationEmail(firstName, verifyUrl),
  })
}

// ── Lost-email recovery email (Phase 4) ──────────────────────────────────────

export function buildRecoveryEmail(firstName: string, recoverUrl: string): string {
  const name = firstName?.trim() || 'there'
  return brandedEmail(`
    <h2 style="margin-top:0;font-size:22px;color:#130426;">Recover access to your account</h2>
    <p style="color:#130426;line-height:1.65;">Hi ${escapeHtml(name)},</p>
    <p style="color:#130426;line-height:1.65;">You requested a recovery link for your Nightside Planning Studio account because you've lost access to your primary email.</p>
    <p style="color:#130426;line-height:1.65;">Click this link to set a new password and regain access:</p>
    <p style="margin:28px 0;">
      <a href="${recoverUrl}" style="display:inline-block;background:#2C3777;color:#ffffff;text-decoration:none;padding:12px 22px;border-radius:8px;font-size:15px;">Recover my account</a>
    </p>
    <p style="color:#130426;line-height:1.65;">This link expires in 60 minutes. If you didn't request this, you can ignore this message.</p>
  `)
}

export async function sendRecoveryEmail(
  to: string,
  firstName: string,
  recoverUrl: string,
): Promise<SendEmailResult> {
  return sendEmail({
    to: to.toLowerCase(),
    subject: 'Recover access to your Nightside Planning Studio account',
    html: buildRecoveryEmail(firstName, recoverUrl),
  })
}
