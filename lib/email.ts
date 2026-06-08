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
