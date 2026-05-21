import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2026-04-22.dahlia',
})

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  const sig = request.headers.get('stripe-signature')
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET

  if (!webhookSecret) {
    console.error('STRIPE_WEBHOOK_SECRET is not set')
    return NextResponse.json({ error: 'Webhook not configured.' }, { status: 500 })
  }

  if (!sig) {
    return NextResponse.json({ error: 'Missing stripe-signature header.' }, { status: 400 })
  }

  let event: Stripe.Event
  const rawBody = await request.arrayBuffer()

  try {
    event = stripe.webhooks.constructEvent(Buffer.from(rawBody), sig, webhookSecret)
  } catch (err) {
    console.error('Webhook signature verification failed:', err)
    return NextResponse.json({ error: 'Invalid webhook signature.' }, { status: 400 })
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session

    if (session.payment_status !== 'paid') {
      return NextResponse.json({ received: true })
    }

    const userId = session.metadata?.supabase_user_id
    if (!userId) {
      console.error('checkout.session.completed missing supabase_user_id metadata', session.id)
      await alertAdmin(session.id, 'missing supabase_user_id in session metadata')
      return NextResponse.json({ received: true })
    }

    const { error } = await supabaseAdmin
      .from('user_profiles')
      .update({ paid_at: new Date().toISOString() })
      .eq('user_id', userId)
      .is('paid_at', null) // idempotent — don't overwrite if already set

    if (error) {
      console.error('Failed to set paid_at for user:', userId, error)
      await alertAdmin(session.id, `DB update failed for user ${userId}: ${error.message}`)
    } else {
      console.log('paid_at set for user:', userId, 'session:', session.id)
    }
  }

  return NextResponse.json({ received: true })
}

async function alertAdmin(sessionId: string, reason: string) {
  try {
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'The Nightside <noreply@thenightside.net>',
        to: 'contact@thenightside.net',
        subject: '[ACTION REQUIRED] Stripe webhook — payment not activated',
        text: [
          'A Stripe payment completed but the account was not activated.',
          '',
          `Stripe session ID: ${sessionId}`,
          `Reason: ${reason}`,
          '',
          'Check the Supabase dashboard and activate the account manually if needed.',
        ].join('\n'),
      }),
    })
  } catch (alertErr) {
    console.error('Failed to send admin alert email:', alertErr)
  }
}
