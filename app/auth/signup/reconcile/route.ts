import { NextResponse, type NextRequest } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { reconcilePayment } from '@/lib/reconcile-payment'

// Node runtime: reconcilePayment uses the Stripe Node SDK + service-role client,
// which can't run in the Edge middleware. The /app/* gate (proxy.ts) redirects
// paid-but-paid_at-null users here when a stripe_session_id is on record; this
// route reconciles against Stripe and routes them onward.
export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)

  // Only internal /app destinations are allowed (prevents open redirect).
  const rawNext = searchParams.get('next') ?? '/app'
  const next = rawNext.startsWith('/app') ? rawNext : '/app'

  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.redirect(new URL(`/auth/signin?next=${encodeURIComponent(next)}`, origin), 307)
  }

  const result = await reconcilePayment(user.id, 'gate_reconcile')
  if (result.ok) {
    // paid_at is now set — continue to the original destination. The gate re-runs
    // and passes the payment check; the Legacy Contact gate still applies.
    return NextResponse.redirect(new URL(next, origin), 307)
  }

  // Not reconciled (genuinely unpaid, unpaid session, or a failure already logged
  // inside reconcilePayment) — fall back to the payment page.
  return NextResponse.redirect(new URL('/auth/signup/payment', origin), 307)
}
