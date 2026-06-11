import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { createClient } from '@supabase/supabase-js'
import { logEvent } from '@/lib/analytics'
import { sendDesignationEmail } from '@/lib/legacy-contact-emails'

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

interface ContactInput {
  firstName: string
  lastName: string
  email: string
  relationship: string
}

export async function POST(req: NextRequest) {
  // ── Auth ──────────────────────────────────────────────────────────────────
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const meta = user.user_metadata ?? {}
  const userFirst = (meta.first_name as string) || user.email?.split('@')[0] || 'Someone'
  const userLast  = (meta.last_name  as string) || ''

  // ── Parse body ────────────────────────────────────────────────────────────
  let primary: ContactInput
  let secondary: ContactInput | null
  let personalMessage: string | null

  try {
    const body = await req.json()
    primary        = body.primary
    secondary      = body.secondary ?? null
    personalMessage = body.personalMessage ?? null
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  // ── Validate primary ─────────────────────────────────────────────────────
  if (!primary?.firstName || !primary?.lastName || !primary?.email || !primary?.relationship) {
    return NextResponse.json({ error: 'All primary contact fields are required' }, { status: 400 })
  }
  if (!isValidEmail(primary.email)) {
    return NextResponse.json({ error: 'Primary contact email is not valid' }, { status: 400 })
  }
  if (primary.email.toLowerCase() === user.email?.toLowerCase()) {
    return NextResponse.json({ error: 'Legacy Contact email cannot be your own email address' }, { status: 400 })
  }

  // ── Validate secondary ───────────────────────────────────────────────────
  if (secondary) {
    if (!secondary.firstName || !secondary.lastName || !secondary.email || !secondary.relationship) {
      return NextResponse.json({ error: 'All secondary contact fields are required' }, { status: 400 })
    }
    if (!isValidEmail(secondary.email)) {
      return NextResponse.json({ error: 'Secondary contact email is not valid' }, { status: 400 })
    }
    if (secondary.email.toLowerCase() === user.email?.toLowerCase()) {
      return NextResponse.json({ error: 'Legacy Contact email cannot be your own email address' }, { status: 400 })
    }
    if (secondary.email.toLowerCase() === primary.email.toLowerCase()) {
      return NextResponse.json({ error: 'Primary and secondary contacts must have different email addresses' }, { status: 400 })
    }
  }

  // ── Validate personal message length ─────────────────────────────────────
  if (personalMessage && personalMessage.length > 1500) {
    return NextResponse.json({ error: 'Personal message must be 1500 characters or fewer' }, { status: 400 })
  }

  // ── Idempotency guard ─────────────────────────────────────────────────────
  const { data: existing } = await supabase
    .from('legacy_contacts')
    .select('id')
    .eq('user_id', user.id)
    .eq('contact_type', 'primary')
    .maybeSingle()

  if (existing) {
    return NextResponse.json(
      { error: 'A primary Legacy Contact is already designated. Use My Account to update it.' },
      { status: 409 }
    )
  }

  // ── Admin client (bypasses RLS so trigger-based audit log works cleanly) ──
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceKey) return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })

  const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  // ── Insert DB records first ───────────────────────────────────────────────
  const { error: primaryInsertErr } = await admin.from('legacy_contacts').insert({
    user_id:          user.id,
    contact_type:     'primary',
    first_name:       primary.firstName,
    last_name:        primary.lastName,
    email:            primary.email,
    relationship:     primary.relationship,
    personal_message: personalMessage,
  })
  if (primaryInsertErr) {
    return NextResponse.json({ error: 'Failed to save primary contact. Please try again.' }, { status: 500 })
  }

  if (secondary) {
    const { error: secondaryInsertErr } = await admin.from('legacy_contacts').insert({
      user_id:          user.id,
      contact_type:     'secondary',
      first_name:       secondary.firstName,
      last_name:        secondary.lastName,
      email:            secondary.email,
      relationship:     secondary.relationship,
      personal_message: personalMessage,
    })
    if (secondaryInsertErr) {
      await admin.from('legacy_contacts').delete().eq('user_id', user.id).eq('contact_type', 'primary')
      return NextResponse.json({ error: 'Failed to save secondary contact. Please try again.' }, { status: 500 })
    }
  }

  // ── Send notification emails — rollback DB if either fails ────────────────
  // Intentionally NOT throttled by email_send_attempts (unlike the LC-manage and
  // recovery-email routes): this onboarding designation runs once per account, behind
  // the signup + payment gate, so it's a poor email-relay vector (looping it costs a
  // fresh paid account per ~2 sends). Considered and excluded — see CLAUDE.md.
  const primaryEmail = await sendDesignationEmail(primary.email, { userFirst, userLast, contactFirst: primary.firstName, role: 'primary', personalMessage })
  if (!primaryEmail.ok) {
    await admin.from('legacy_contacts').delete().eq('user_id', user.id)
    return NextResponse.json(
      { error: `Could not send notification to ${primary.email}. Please check the address and try again.` },
      { status: 502 }
    )
  }

  if (secondary) {
    const secondaryEmail = await sendDesignationEmail(secondary.email, { userFirst, userLast, contactFirst: secondary.firstName, role: 'secondary', personalMessage })
    if (!secondaryEmail.ok) {
      await admin.from('legacy_contacts').delete().eq('user_id', user.id)
      return NextResponse.json(
        { error: `Could not send notification to ${secondary.email}. Please check the address and try again.` },
        { status: 502 }
      )
    }
  }

  logEvent({
    userId: user.id,
    eventName: 'legacy_contact_designated',
    metadata: { has_secondary: !!secondary },
    includePlanningStatus: true,
  })

  return NextResponse.json({ ok: true })
}
