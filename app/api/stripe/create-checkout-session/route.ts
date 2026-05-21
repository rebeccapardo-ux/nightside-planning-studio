import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'
import { createSupabaseServerClient } from '@/lib/supabase-server'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2026-04-22.dahlia',
})

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Not authenticated.' }, { status: 401 })
  }

  if (!user.email_confirmed_at) {
    return NextResponse.json({ error: 'Please confirm your email before proceeding to payment.' }, { status: 403 })
  }

  // Idempotency: if user has already paid, don't create another session.
  const { data: profile } = await supabaseAdmin
    .from('user_profiles')
    .select('paid_at')
    .eq('user_id', user.id)
    .single()

  if (profile?.paid_at) {
    return NextResponse.json({ error: 'This account has already been activated.' }, { status: 409 })
  }

  const origin = request.headers.get('origin') ?? 'https://studio.thenightside.net'

  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: [{ price: process.env.STRIPE_PRICE_ID!, quantity: 1 }],
      customer_email: user.email ?? undefined,
      automatic_tax: { enabled: true },
      metadata: { supabase_user_id: user.id },
      success_url: `${origin}/auth/signup/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/auth/signup/payment`,
    })

    return NextResponse.json({ url: session.url })
  } catch (err) {
    console.error('Stripe session creation error:', err)
    return NextResponse.json(
      { error: 'Could not create payment session. Please try again.' },
      { status: 500 }
    )
  }
}
