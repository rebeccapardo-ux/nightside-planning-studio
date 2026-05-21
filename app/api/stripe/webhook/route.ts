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

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://studio.thenightside.net'

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

    const pendingId = session.metadata?.pending_signup_id
    if (!pendingId) {
      console.error('checkout.session.completed missing pending_signup_id metadata', session.id)
      return NextResponse.json({ received: true })
    }

    const { data: pending, error: fetchError } = await supabaseAdmin
      .from('pending_signups')
      .select('*')
      .eq('id', pendingId)
      .single()

    if (fetchError || !pending) {
      console.error('Could not find pending signup:', pendingId, fetchError)
      await alertAdmin(session.id, pendingId, 'pending signup record not found')
      return NextResponse.json({ received: true })
    }

    if (new Date(pending.expires_at) < new Date()) {
      console.error('Pending signup expired:', pendingId)
      await alertAdmin(session.id, pendingId, 'pending signup record expired')
      return NextResponse.json({ received: true })
    }

    try {
      // Confirm the user's email so they can sign in immediately.
      // The payment itself validates email ownership for this use case.
      const { error: confirmError } = await supabaseAdmin.auth.admin.updateUserById(
        pending.supabase_user_id,
        { email_confirm: true }
      )
      if (confirmError) throw confirmError

      // Send a welcome email with a link to sign in.
      const emailRes = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: 'The Nightside <noreply@thenightside.net>',
          to: pending.email,
          subject: 'Your Nightside account is ready',
          html: `
            <p>Hi,</p>
            <p>Your payment was received and your Nightside Planning Studio account is ready.</p>
            <p><a href="${SITE_URL}/auth/signin">Sign in to get started →</a></p>
            <p>If you have any questions, reach out at <a href="mailto:contact@thenightside.net">contact@thenightside.net</a>.</p>
          `,
        }),
      })

      if (!emailRes.ok) {
        const emailErr = await emailRes.text()
        throw new Error(`Resend error: ${emailErr}`)
      }

      // Clean up the consumed pending record.
      await supabaseAdmin.from('pending_signups').delete().eq('id', pendingId)

      console.log('Account activated and welcome email sent for:', pending.email)
    } catch (err) {
      console.error('Post-payment account activation failed:', err)
      await alertAdmin(session.id, pendingId, String(err))
    }
  }

  return NextResponse.json({ received: true })
}

async function alertAdmin(sessionId: string, pendingId: string, reason: string) {
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
        subject: '[ACTION REQUIRED] Payment succeeded but account activation failed',
        text: [
          'A Stripe payment was received but the account confirmation email could not be sent.',
          '',
          `Stripe session ID: ${sessionId}`,
          `Pending signup ID: ${pendingId}`,
          `Reason: ${reason}`,
          '',
          'The customer has paid and needs their account activated manually.',
        ].join('\n'),
      }),
    })
  } catch (alertErr) {
    console.error('Failed to send admin alert email:', alertErr)
  }
}
