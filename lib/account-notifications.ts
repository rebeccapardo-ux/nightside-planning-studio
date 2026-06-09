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

// "Your password was changed" — the same event whether via direct change (Phase 3)
// or forgot-password reset. Supabase's auto password-changed email is OFF; we own it.
export function buildPasswordChangedEmail(firstName: string): string {
  const name = firstName?.trim() || 'there'
  return brandedEmail(`
    <h2 style="margin-top:0;font-size:22px;color:#130426;">Your password was changed</h2>
    <p style="color:#130426;line-height:1.65;">Hi ${esc(name)},</p>
    <p style="color:#130426;line-height:1.65;">The password for your account on The Nightside Planning Studio was just changed. If this was you, there's nothing else to do.</p>
    <p style="color:#130426;line-height:1.65;"><strong>If you didn't change your password</strong>, your account may have been accessed without your permission. Contact us right away at <a href="mailto:contact@thenightside.net" style="color:#2C3777;">contact@thenightside.net</a> and we'll help you secure it.</p>
  `)
}

// PDF (document) export.
export function buildPlanExportEmail(firstName: string): string {
  const name = firstName?.trim() || 'there'
  return brandedEmail(`
    <h2 style="margin-top:0;font-size:22px;color:#130426;">A full plan export was downloaded</h2>
    <p style="color:#130426;line-height:1.65;">Hi ${esc(name)},</p>
    <p style="color:#130426;line-height:1.65;">A full export of your plan was just downloaded from your Nightside Planning Studio account.</p>
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
