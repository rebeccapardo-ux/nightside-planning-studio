import type { SupabaseClient } from '@supabase/supabase-js'
import { sendEmail, brandedEmail } from './email'

// Shared high-stakes account notifications (password change / reset, plan export).
// Templates + the "primary + verified recovery" fan-out live here so every flow uses
// the same copy + dual-address logic. All sends are best-effort — callers wrap them
// in try/catch; a notification failure never undoes the underlying operation.

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

export const PASSWORD_CHANGED_SUBJECT = 'Your Nightside Planning Studio password was changed'
export const PLAN_EXPORT_SUBJECT = 'A full plan export was downloaded from your account'
export const PLAN_EXPORT_JSON_SUBJECT = 'A data export of your plan was downloaded'
export const ACCOUNT_DELETED_SUBJECT = 'Your Nightside Planning Studio account has been deleted'
export const RECOVERY_VERIFIED_SUBJECT = 'Your recovery email has been verified'
export const RECOVERY_REMOVED_SUBJECT = 'Your recovery email has been removed'

// "Your password was changed" — the same event whether via direct change (Phase 3)
// or forgot-password reset. Supabase's auto password-changed email is OFF; we own it.
export function buildPasswordChangedEmail(firstName: string): string {
  const name = firstName?.trim() || 'there'
  return brandedEmail(`
    <h2 style="margin-top:0;font-size:22px;color:#130426;">Your password was changed</h2>
    <p style="color:#130426;line-height:1.65;">Hi ${esc(name)},</p>
    <p style="color:#130426;line-height:1.65;">The password for your Nightside Planning Studio account was just changed. If this was you, there's nothing else to do.</p>
    <p style="color:#130426;line-height:1.65;"><strong>If you didn't change your password</strong>, your account may have been accessed without your permission. Please contact us immediately at <a href="mailto:contact@thenightside.net" style="color:#2C3777;">contact@thenightside.net</a> and we'll help you secure it.</p>
  `)
}

// PDF (document) export.
export function buildPlanExportEmail(firstName: string): string {
  const name = firstName?.trim() || 'there'
  return brandedEmail(`
    <h2 style="margin-top:0;font-size:22px;color:#130426;">A full plan export was downloaded</h2>
    <p style="color:#130426;line-height:1.65;">Hi ${esc(name)},</p>
    <p style="color:#130426;line-height:1.65;">A full PDF export of your plan was just downloaded from your Nightside Planning Studio account.</p>
    <p style="color:#130426;line-height:1.65;"><strong>If this wasn't you</strong>, please contact us immediately at <a href="mailto:contact@thenightside.net" style="color:#2C3777;">contact@thenightside.net</a>.</p>
  `)
}

// JSON (data) export — distinct copy so the user knows which format left their account.
export function buildPlanExportJsonEmail(firstName: string): string {
  const name = firstName?.trim() || 'there'
  return brandedEmail(`
    <h2 style="margin-top:0;font-size:22px;color:#130426;">A data export of your plan was downloaded</h2>
    <p style="color:#130426;line-height:1.65;">Hi ${esc(name)},</p>
    <p style="color:#130426;line-height:1.65;">A data export (JSON format) of your plan was just downloaded from your Nightside Planning Studio account.</p>
    <p style="color:#130426;line-height:1.65;"><strong>If this wasn't you</strong>, please contact us immediately at <a href="mailto:contact@thenightside.net" style="color:#2C3777;">contact@thenightside.net</a>.</p>
  `)
}

// Account deletion (pre-launch: immediate deletion). Sent to BOTH primary + verified
// recovery BEFORE the delete (after, the addresses are gone). Best-effort.
export function buildAccountDeletedEmail(firstName: string): string {
  const name = firstName?.trim() || 'there'
  return brandedEmail(`
    <h2 style="margin-top:0;font-size:22px;color:#130426;">Your account has been deleted</h2>
    <p style="color:#130426;line-height:1.65;">Hi ${esc(name)},</p>
    <p style="color:#130426;line-height:1.65;">Your Nightside Planning Studio account has been deleted. All of your planning data has been permanently removed from our system.</p>
    <p style="color:#130426;line-height:1.65;"><strong>If this wasn't you</strong>, please contact us immediately at <a href="mailto:contact@thenightside.net" style="color:#2C3777;">contact@thenightside.net</a> — though we may not be able to recover deleted data.</p>
  `)
}

// Recovery email verified — the recovery channel just became active. Primary only
// (the recovery address itself just confirmed; notifying it adds nothing).
export function buildRecoveryVerifiedEmail(firstName: string): string {
  const name = firstName?.trim() || 'there'
  return brandedEmail(`
    <h2 style="margin-top:0;font-size:22px;color:#130426;">Your recovery email has been verified</h2>
    <p style="color:#130426;line-height:1.65;">Hi ${esc(name)},</p>
    <p style="color:#130426;line-height:1.65;">The recovery email on your Nightside Planning Studio account has been verified and is now active.</p>
    <p style="color:#130426;line-height:1.65;"><strong>If this wasn't you</strong>, please contact us immediately at <a href="mailto:contact@thenightside.net" style="color:#2C3777;">contact@thenightside.net</a>.</p>
  `)
}

// Recovery email removed — the account no longer has a recovery channel. Primary only
// (the removed address is no longer a destination we'd notify).
export function buildRecoveryRemovedEmail(firstName: string): string {
  const name = firstName?.trim() || 'there'
  return brandedEmail(`
    <h2 style="margin-top:0;font-size:22px;color:#130426;">Your recovery email has been removed</h2>
    <p style="color:#130426;line-height:1.65;">Hi ${esc(name)},</p>
    <p style="color:#130426;line-height:1.65;">The recovery email on your Nightside Planning Studio account has been removed. Without one, your account can't be recovered if you lose access to your primary email. You can add a new recovery email anytime from your account settings.</p>
    <p style="color:#130426;line-height:1.65;"><strong>If this wasn't you</strong>, please contact us immediately at <a href="mailto:contact@thenightside.net" style="color:#2C3777;">contact@thenightside.net</a>.</p>
  `)
}

// The user's verified recovery email, or null (inert-until-verified rule). Reads via
// whatever client is passed (session client w/ RLS read-own, or service-role).
export async function verifiedRecoveryEmail(client: SupabaseClient, userId: string): Promise<string | null> {
  const { data } = await client
    .from('user_profiles').select('recovery_email, recovery_email_verified')
    .eq('user_id', userId).maybeSingle()
  if (data?.recovery_email && data.recovery_email_verified) return (data.recovery_email as string).toLowerCase()
  return null
}

// Fan out a notification to the primary + (verified) recovery email.
export async function notifyPrimaryAndRecovery(
  client: SupabaseClient,
  userId: string,
  primaryEmail: string | null | undefined,
  subject: string,
  html: string,
): Promise<void> {
  const recipients = new Set<string>()
  if (primaryEmail) recipients.add(primaryEmail.toLowerCase())
  const recovery = await verifiedRecoveryEmail(client, userId)
  if (recovery) recipients.add(recovery)
  await Promise.all([...recipients].map(to => sendEmail({ to, subject, html })))
}
