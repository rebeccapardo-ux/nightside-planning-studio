import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { reconcilePayment } from '@/lib/reconcile-payment'

export async function POST(request: NextRequest) {
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: '2026-04-22.dahlia',
  })

  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Not authenticated.' }, { status: 401 })
  }

  if (!user.email_confirmed_at) {
    return NextResponse.json({ error: 'Please confirm your email before proceeding to payment.' }, { status: 403 })
  }

  // Double-charge guard: confirm against Stripe BEFORE creating a new session.
  // reconcilePayment is a no-op when already paid, a cheap point lookup when a
  // session id is on record, and a scan otherwise — so it also catches the
  // paid-but-paid_at-null case (webhook + success page both missed) and prevents
  // a second charge.
  const recon = await reconcilePayment(user.id, 'checkout')
  if (recon.ok) {
    // Already paid (and now activated if it wasn't). Send them into the app
    // rather than opening another Checkout session; the gate routes onward.
    return NextResponse.json({ redirect: '/app' })
  }
  if (recon.reason === 'ambiguous_manual_review') {
    // A paid session matches this email but can't be tied to the account.
    // Block the charge and route to support rather than risk a duplicate.
    return NextResponse.json(
      { error: 'We found a payment that needs review. Please contact contact@thenightside.net before paying again.' },
      { status: 409 }
    )
  }

  const origin = request.headers.get('origin') ?? 'https://studio.thenightside.net'

  try {
    // INVARIANT: payment_method_collection is intentionally unset, so it defaults
    // to 'always' — Stripe collects a card even for a $0 total, so 100%-off promo
    // sessions still settle as payment_status: 'paid'. If it ever changes to
    // 'if_required', zero-dollar sessions settle as 'no_payment_required' instead,
    // and the activation checks must accept that value in addition to 'paid':
    //   - lib/reconcile-payment.ts — the `payment_status === 'paid'` checks
    //     (the stored-session point lookup AND the recent-session scan)
    //   - app/api/stripe/webhook/route.ts — the `payment_status !== 'paid'` guard
    // Otherwise zero-dollar sessions (e.g. 100%-off promos with no card collected)
    // complete checkout but fail to activate the user.
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: [{ price: process.env.STRIPE_PRICE_ID!, quantity: 1 }],
      customer_email: user.email ?? undefined,
      automatic_tax: { enabled: true },
      allow_promotion_codes: true,
      metadata: { supabase_user_id: user.id },
      success_url: `${origin}/auth/signup/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/auth/signup/payment`,
    })

    // Persist the session id for later reconciliation. Best-effort: a failed
    // write must NOT block checkout — the session is still recoverable via the
    // email/metadata fallback in reconcilePayment().
    const { error: sidErr } = await supabaseAdmin
      .from('user_profiles')
      .update({ stripe_session_id: session.id })
      .eq('user_id', user.id)
    if (sidErr) {
      console.error('Failed to persist stripe_session_id for user', user.id, sidErr.message)
    }

    return NextResponse.json({ url: session.url })
  } catch (err) {
    console.error('Stripe session creation error:', err)
    return NextResponse.json(
      { error: 'Could not create payment session. Please try again.' },
      { status: 500 }
    )
  }
}
