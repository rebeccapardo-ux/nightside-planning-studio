import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { logEvent } from '@/lib/analytics'
import { provisionRecoveryEmailFromMetadata } from '@/lib/recovery-email'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  // Supabase appends these to the redirect when the verify step itself failed —
  // e.g. a one-time link already consumed by an email-client prefetch
  // (error=access_denied&error_code=otp_expired). We read error_code so the
  // callback can react to the real reason instead of guessing.
  const errorCode = searchParams.get('error_code')

  const supabase = await createSupabaseServerClient()

  if (code) {
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      if (data.user) {
        logEvent({ userId: data.user.id, eventName: 'email_confirmed' })
        // Decision (b): provision + verify-email the recovery address only AFTER the
        // primary email is confirmed. Idempotent and best-effort — never block the
        // confirmation redirect on it.
        try {
          await provisionRecoveryEmailFromMetadata(data.user, origin)
        } catch (err) {
          console.error('[recovery-email] provision failed', err)
        }
      }
      return NextResponse.redirect(`${origin}/auth/signup/payment`)
    }
  }

  // The code exchange didn't complete for THIS browser — no code, an already-used
  // link, or a missing PKCE verifier (link opened in a different browser / in-app
  // webview). That does NOT mean confirmation failed: the verify step has usually
  // already set email_confirmed_at. If a confirmed session exists in this browser
  // (a prefetch or double-hit already finished it), just continue the flow.
  const { data: { user } } = await supabase.auth.getUser()
  if (user?.email_confirmed_at) {
    return NextResponse.redirect(`${origin}/auth/signup/payment`)
  }

  // No session here, so we can't positively confirm state from the callback. Send
  // them to sign in with accurate, non-alarming guidance — the sign-in attempt
  // itself resolves it (confirmed → straight in; genuinely unconfirmed → Supabase
  // returns "email not confirmed" and we tell them to check their inbox). Log why
  // we landed here for visibility into how often the PKCE link is consumed out of
  // band.
  logEvent({
    eventName: 'email_confirm_unresolved',
    metadata: { reason: errorCode ?? (code ? 'exchange_failed' : 'no_code') },
  })
  return NextResponse.redirect(`${origin}/auth/signin?notice=confirm_pending`)
}
