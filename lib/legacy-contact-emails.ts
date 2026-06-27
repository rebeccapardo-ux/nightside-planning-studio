import { sendEmail, type SendEmailResult } from './email'

// LC-FACING "you've been designated" email — shared by the LC-manage route (replace /
// add-secondary) and the onboarding route (initial designation). Previously duplicated
// as two near-identical builders that both read as if the recipient were the primary;
// unified here and made role-aware. Only the subject and the "About this designation"
// paragraph differ between primary and secondary; everything else is identical.
//
// Uses the LC routes' own wrapper (logo header + "With care" sign-off), not brandedEmail.

export type LcRole = 'primary' | 'secondary'

function toTitleCase(name: string): string {
  if (!name) return name
  return name.toLowerCase().replace(/\b\w/g, c => c.toUpperCase())
}

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function emailWrap(body: string): string {
  return `
<div style="font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;max-width:600px;margin:0 auto;background:#ffffff;">
  <div style="background-color:#2C3777;padding:18px 24px;text-align:center;">
    <img src="https://images.squarespace-cdn.com/content/v1/640e160f9a63e5441c7054f2/198408a5-87a0-427c-b02c-767ca3a69220/The-Nightside-Logo-White.png?format=1500w"
         alt="The Nightside" style="max-width:100px;height:auto;"/>
  </div>
  <div style="padding:32px 24px;">
    ${body}
    <p style="color:#130426;line-height:1.65;">With care,<br/>The Nightside</p>
  </div>
</div>`
}

export function designationSubject(userFirst: string, userLast: string, role: LcRole): string {
  return `${toTitleCase(userFirst)} ${toTitleCase(userLast)} has designated you as their ${role} Legacy Contact on The Nightside Planning Studio`
}

export function buildDesignationEmail(
  userFirst: string,
  userLast: string,
  contactFirst: string,
  role: LcRole,
  personalMessage?: string | null,
): string {
  userFirst    = toTitleCase(userFirst)
  userLast     = toTitleCase(userLast)
  contactFirst = toTitleCase(contactFirst)

  // The role-establishing paragraph does the work upfront. The rest of the email is
  // identical for both roles — a secondary's "only if the primary can't act" condition
  // is stated here and doesn't need repeating in the sections below.
  const aboutPara = role === 'primary'
    ? `${userFirst} has been doing end-of-life planning on the platform and has named you as their primary Legacy Contact. This means that if ${userFirst} dies, you would be the person we release their practical planning materials to; this includes things like wishes for their body and funeral, important contacts, financial information, and other administrative details.`
    : `${userFirst} has been doing end-of-life planning on the platform and has named you as their secondary Legacy Contact. This means that if ${userFirst} dies and their primary Legacy Contact is unable to act, you would be the person we release their practical planning materials to; this includes things like wishes for their body and funeral, important contacts, financial information, and other administrative details.`

  const msgBlock = personalMessage
    ? `<hr style="border:none;border-top:1px solid #e0d8c8;margin:28px 0"/>
       <h3 style="margin:0 0 10px;font-size:15px;color:#130426;">A message from ${userFirst}</h3>
       <p style="color:#130426;line-height:1.65;white-space:pre-wrap;margin:0">${esc(personalMessage)}</p>
       <hr style="border:none;border-top:1px solid #e0d8c8;margin:28px 0"/>`
    : ''

  return emailWrap(`
    <h2 style="margin-top:0;font-size:22px;color:#130426;">You've been designated as a Legacy Contact</h2>
    <p style="color:#130426;line-height:1.65;">Hi ${contactFirst},</p>
    <p style="color:#130426;line-height:1.65;">${userFirst} ${userLast} has designated you as a Legacy Contact on The Nightside Planning Studio, an end-of-life planning platform.</p>
    <h3 style="font-size:16px;color:#130426;margin:28px 0 8px;">About this designation</h3>
    <p style="color:#130426;line-height:1.65;">${aboutPara}</p>
    <h3 style="font-size:16px;color:#130426;margin:28px 0 8px;">What this means for you right now</h3>
    <p style="color:#130426;line-height:1.65;">There's nothing for you to do at this moment. You don't have access to ${userFirst}'s plan while they are alive, and this designation doesn't ask anything of you unless circumstances change.</p>
    <p style="color:#130426;line-height:1.65;">It also doesn't give you any legal authority over ${userFirst}'s estate, healthcare, or other matters. If ${userFirst} wants you to have other authority, that's designated separately through legal documents like a will or representation agreement.</p>
    <h3 style="font-size:16px;color:#130426;margin:28px 0 8px;">If something happens to ${userFirst}</h3>
    <p style="color:#130426;line-height:1.65;">If ${userFirst} passes away and you need to activate your role as Legacy Contact, you can reach out to us at <a href="mailto:contact@thenightside.net" style="color:#2C3777;">contact@thenightside.net</a>. We'll work with you to release ${userFirst}'s planning materials and to confirm what has happened. We can be flexible about documentation depending on what's available; a death certificate, a Statement of Death from a funeral director, or other comparable documentation all work.</p>
    <h3 style="font-size:16px;color:#130426;margin:28px 0 8px;">If you have questions or concerns</h3>
    <p style="color:#130426;line-height:1.65;">If you have questions about being designated, or if you'd rather not take on this role, please reach out to ${userFirst} directly. They can update their designation at any time, and your relationship to them isn't tied to this designation in any way.</p>
    <p style="color:#130426;line-height:1.65;">${userFirst} may reach out to you to talk about this soon. If they haven't yet, you're welcome to reach out to them.</p>
    ${msgBlock}
    <p style="color:#130426;line-height:1.65;">If you have any questions about the platform itself, you can reach us at <a href="mailto:contact@thenightside.net" style="color:#2C3777;">contact@thenightside.net</a>.</p>
  `)
}

// Build + send in one call (returns the sendEmail result so callers can roll back on
// failure, as both routes do).
export async function sendDesignationEmail(
  to: string,
  opts: { userFirst: string; userLast: string; contactFirst: string; role: LcRole; personalMessage?: string | null },
): Promise<SendEmailResult> {
  return sendEmail({
    to,
    subject: designationSubject(opts.userFirst, opts.userLast, opts.role),
    html: buildDesignationEmail(opts.userFirst, opts.userLast, opts.contactFirst, opts.role, opts.personalMessage),
  })
}
