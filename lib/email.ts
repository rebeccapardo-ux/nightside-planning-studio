// Shared transactional-email transport.
//
// All platform email goes out via Resend's REST API (no SDK) from the single
// Nightside sender. This centralizes the wire call, the RESEND_API_KEY guard, and
// error normalization — callers own their own subject + body (html or text) and
// their own success/failure handling.
//
// Deliberately does NOT try/catch the fetch: a network error throws, exactly as the
// previous inlined senders did. Fire-and-forget callers (e.g. the Stripe webhook's
// admin alert) keep their own try/catch around the call, so behavior is unchanged.

const FROM = 'The Nightside <noreply@thenightside.net>'

const LOGO_URL = 'https://images.squarespace-cdn.com/content/v1/640e160f9a63e5441c7054f2/198408a5-87a0-427c-b02c-767ca3a69220/The-Nightside-Logo-White.png?format=1500w'

// Shared branded HTML shell for transactional emails — logo header + "With care,
// The Nightside" sign-off. Pass the inner body HTML. (The legacy-contact routes
// still inline their own equivalent wrapper; migrating them onto this is a tracked
// follow-up — don't refactor them as a side effect.)
export function brandedEmail(innerHtml: string): string {
  return `
<div style="font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;max-width:600px;margin:0 auto;background:#ffffff;">
  <div style="background-color:#2C3777;padding:18px 24px;text-align:center;">
    <img src="${LOGO_URL}" alt="The Nightside" style="max-width:100px;height:auto;"/>
  </div>
  <div style="padding:32px 24px;">
    ${innerHtml}
    <p style="color:#130426;line-height:1.65;">With care,<br/>The Nightside</p>
  </div>
</div>`
}

export type SendEmailResult = { ok: boolean; error?: string }

export async function sendEmail(opts: {
  to: string
  subject: string
  html?: string
  text?: string
}): Promise<SendEmailResult> {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) return { ok: false, error: 'Email service not configured (RESEND_API_KEY missing)' }

  const payload: Record<string, unknown> = { from: FROM, to: opts.to, subject: opts.subject }
  if (opts.html !== undefined) payload.html = opts.html
  if (opts.text !== undefined) payload.text = opts.text

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })

  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    return { ok: false, error: (body as { message?: string }).message ?? `HTTP ${res.status}` }
  }
  return { ok: true }
}
