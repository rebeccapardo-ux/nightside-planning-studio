import { sendEmail, brandedEmail } from './email'

// Account-HOLDER-facing notifications for Legacy Contact operations (distinct from
// the LC-facing designation/dedesignation/role-change emails, which stay inline in
// app/api/legacy-contact/manage/route.ts). These tell the account holder, from THEIR
// perspective, what changed on their own designations — a security/awareness signal
// for changes they might not be present for.
//
// Onboarding designation has NO notification (the user is present for that action);
// these fire only for post-onboarding manage operations. There is no "designate
// primary" case — a primary is first designated only at onboarding; afterward primary
// changes happen via replace / promote, which have their own copy.
//
// All go to the account holder's PRIMARY email only, best-effort (never block the
// underlying LC operation). brandedEmail() supplies the logo header + "With care,
// The Nightside" sign-off, so bodies omit it.

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function toTitleCase(name: string): string {
  if (!name) return name
  return name.toLowerCase().replace(/\b\w/g, c => c.toUpperCase())
}

// Disposition of the displaced old primary, rendered as one sentence.
function dispositionLine(oldName: string, disposition: 'remove' | 'secondary'): string {
  const n = esc(toTitleCase(oldName))
  return disposition === 'secondary'
    ? `<p style="color:#130426;line-height:1.65;">${n} is now your secondary Legacy Contact.</p>`
    : `<p style="color:#130426;line-height:1.65;">${n} is no longer your Legacy Contact.</p>`
}

// The change, discriminated by kind. Names are full ("First Last"); title-cased here.
export type LcChange =
  | { kind: 'designate-secondary'; name: string }
  | { kind: 'remove-secondary'; name: string }
  | { kind: 'replace-secondary'; oldName: string; newName: string }
  // bumpedSecondaryName: set only when filling both slots displaces an EXISTING
  // secondary (new-person replace with old primary → secondary). That third party gets
  // their own LC-facing dedesignation, but the account holder would otherwise have no
  // record of their removal — so surface it here as a third line.
  | { kind: 'replace-primary'; oldName: string; newName: string; disposition: 'remove' | 'secondary'; bumpedSecondaryName?: string }
  | { kind: 'promote-secondary'; promotedName: string; oldPrimaryName: string; disposition: 'remove' | 'secondary' }
  | { kind: 'edit-details'; name: string }

// Shared tail: role reminder + manage link + "if this wasn't you". (Sign-off is added
// by brandedEmail.)
function tail(origin: string): string {
  const settingsUrl = `${origin}/app/account#account-access`
  return `
    <p style="color:#130426;line-height:1.65;">As a reminder, your primary Legacy Contact is the person we'll release your practical planning materials to in the event of your death. Your secondary Legacy Contact comes into play only if your primary is unavailable. Neither has access to your plan while you're alive. You can review or change your Legacy Contacts anytime from your <a href="${settingsUrl}" style="color:#2C3777;">account settings</a>.</p>
    <p style="color:#130426;line-height:1.65;"><strong>If this wasn't you</strong>, please contact us immediately at <a href="mailto:contact@thenightside.net" style="color:#2C3777;">contact@thenightside.net</a>.</p>
  `
}

// Build the subject + HTML for an account-holder LC notification.
export function accountHolderLcEmail(holderFirst: string, origin: string, change: LcChange): { subject: string; html: string } {
  const greeting = `<p style="color:#130426;line-height:1.65;">Hi ${esc(holderFirst?.trim() || 'there')},</p>`
  const h2 = (t: string) => `<h2 style="margin-top:0;font-size:22px;color:#130426;">${t}</h2>`
  const p = (t: string) => `<p style="color:#130426;line-height:1.65;">${t}</p>`

  let subject: string
  let lead: string

  switch (change.kind) {
    case 'designate-secondary': {
      const n = esc(toTitleCase(change.name))
      subject = "You've designated a secondary Legacy Contact"
      lead = h2(subject) + greeting + p(`You've designated ${n} as your secondary Legacy Contact on Nightside Planning Studio.`)
      break
    }
    case 'remove-secondary': {
      const n = esc(toTitleCase(change.name))
      subject = "You've removed your secondary Legacy Contact"
      lead = h2(subject) + greeting + p(`You've removed ${n} as your secondary Legacy Contact on Nightside Planning Studio.`)
      break
    }
    case 'replace-secondary': {
      const o = esc(toTitleCase(change.oldName))
      const nw = esc(toTitleCase(change.newName))
      subject = "You've replaced your secondary Legacy Contact"
      lead = h2(subject) + greeting + p(`You've replaced ${o} with ${nw} as your secondary Legacy Contact on Nightside Planning Studio.`)
      break
    }
    case 'replace-primary': {
      const o = esc(toTitleCase(change.oldName))
      const nw = esc(toTitleCase(change.newName))
      subject = "You've replaced your primary Legacy Contact"
      lead = h2(subject) + greeting
        + p(`You've replaced ${o} with ${nw} as your primary Legacy Contact on Nightside Planning Studio.`)
        + dispositionLine(change.oldName, change.disposition)
        // Displaced existing secondary (only when the old primary took the secondary slot).
        + (change.bumpedSecondaryName ? dispositionLine(change.bumpedSecondaryName, 'remove') : '')
      break
    }
    case 'promote-secondary': {
      const pr = esc(toTitleCase(change.promotedName))
      subject = "You've promoted your secondary Legacy Contact to primary"
      lead = h2(subject) + greeting
        + p(`You've promoted ${pr} from secondary to primary Legacy Contact on Nightside Planning Studio.`)
        + dispositionLine(change.oldPrimaryName, change.disposition)
      break
    }
    case 'edit-details': {
      const n = esc(toTitleCase(change.name))
      subject = "You've updated your Legacy Contact's contact details"
      lead = h2(subject) + greeting + p(`You've updated ${n}'s email address on Nightside Planning Studio.`)
      break
    }
  }

  return { subject, html: brandedEmail(lead + tail(origin)) }
}

// Send the account-holder notification (primary only, best-effort). Skips silently if
// there's no primary email (shouldn't happen) and swallows send errors so it can never
// block the LC operation.
export async function notifyAccountHolderLcChange(
  primaryEmail: string | null | undefined,
  holderFirst: string,
  origin: string,
  change: LcChange,
): Promise<void> {
  if (!primaryEmail) return
  try {
    const { subject, html } = accountHolderLcEmail(holderFirst, origin, change)
    await sendEmail({ to: primaryEmail, subject, html })
  } catch (err) {
    console.error('[legacy-contact] account-holder notification failed', err)
  }
}
