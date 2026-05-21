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
  let body: {
    firstName: string
    lastName: string
    email: string
    password: string
    province: string
    termsAcceptedAt: string
  }

  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 })
  }

  const { firstName, lastName, email, password, province, termsAcceptedAt } = body

  if (!firstName || !lastName || !email || !password || !province || !termsAcceptedAt) {
    return NextResponse.json({ error: 'Missing required fields.' }, { status: 400 })
  }

  const normalizedEmail = email.toLowerCase().trim()

  // Check whether a confirmed account already exists for this email.
  const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers()
  const existingConfirmed = existingUsers?.users.find(
    (u) => u.email?.toLowerCase() === normalizedEmail && u.email_confirmed_at
  )
  if (existingConfirmed) {
    return NextResponse.json(
      { error: 'An account with this email already exists.' },
      { status: 409 }
    )
  }

  // If there's an unconfirmed account + pending record for this email (abandoned
  // previous attempt), clean both up so the user can start fresh.
  const existingUnconfirmed = existingUsers?.users.find(
    (u) => u.email?.toLowerCase() === normalizedEmail && !u.email_confirmed_at
  )
  if (existingUnconfirmed) {
    await supabaseAdmin.from('pending_signups').delete().eq('supabase_user_id', existingUnconfirmed.id)
    await supabaseAdmin.auth.admin.deleteUser(existingUnconfirmed.id)
  }

  // Create the Supabase user now with email confirmation suppressed.
  // The confirmation email is sent by the webhook after payment succeeds.
  const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
    email: normalizedEmail,
    password,
    email_confirm: false,
    user_metadata: {
      first_name: firstName.trim(),
      last_name: lastName.trim(),
      full_name: `${firstName.trim()} ${lastName.trim()}`,
      province,
      terms_accepted_at: termsAcceptedAt,
    },
  })

  if (createError || !newUser?.user) {
    console.error('createUser error:', createError)
    return NextResponse.json(
      { error: 'Could not create account. Please try again.' },
      { status: 500 }
    )
  }

  const supabaseUserId = newUser.user.id

  // Insert the pending record (without stripe_session_id yet — we need the
  // pending.id for the Stripe metadata, so we insert first, then update).
  const { data: pending, error: insertError } = await supabaseAdmin
    .from('pending_signups')
    .insert({ supabase_user_id: supabaseUserId, email: normalizedEmail })
    .select('id')
    .single()

  if (insertError || !pending) {
    console.error('pending_signups insert error:', insertError)
    await supabaseAdmin.auth.admin.deleteUser(supabaseUserId)
    return NextResponse.json(
      { error: 'Could not initialize payment. Please try again.' },
      { status: 500 }
    )
  }

  const origin = request.headers.get('origin') ?? 'https://studio.thenightside.net'

  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: [{ price: process.env.STRIPE_PRICE_ID!, quantity: 1 }],
      customer_email: normalizedEmail,
      automatic_tax: { enabled: true },
      metadata: { pending_signup_id: pending.id },
      success_url: `${origin}/auth/signup/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/auth/signup/cancel`,
    })

    // Link the Stripe session ID back to the pending record.
    await supabaseAdmin
      .from('pending_signups')
      .update({ stripe_session_id: session.id })
      .eq('id', pending.id)

    return NextResponse.json({ url: session.url })
  } catch (err) {
    console.error('Stripe session creation error:', err)
    // Roll back: delete pending record and the Supabase user.
    await supabaseAdmin.from('pending_signups').delete().eq('id', pending.id)
    await supabaseAdmin.auth.admin.deleteUser(supabaseUserId)
    return NextResponse.json(
      { error: 'Could not create payment session. Please try again.' },
      { status: 500 }
    )
  }
}
