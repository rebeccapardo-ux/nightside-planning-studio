import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { createClient } from '@supabase/supabase-js'
import { logEvent } from '@/lib/analytics'
import { sendEmail } from '@/lib/email'

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

function toTitleCase(name: string): string {
  if (!name) return name
  return name.toLowerCase().replace(/\b\w/g, c => c.toUpperCase())
}

function buildEmail({
  userFirst,
  userLast,
  contactFirst,
  personalMessage,
}: {
  userFirst: string
  userLast: string
  contactFirst: string
  personalMessage?: string | null
}): string {
  userFirst    = toTitleCase(userFirst)
  userLast     = toTitleCase(userLast)
  contactFirst = toTitleCase(contactFirst)

  const msgBlock = personalMessage
    ? `<hr style="border:none;border-top:1px solid #e0d8c8;margin:28px 0"/>
       <h3 style="margin:0 0 10px;font-size:15px;color:#130426;">A message from ${userFirst}</h3>
       <p style="color:#130426;line-height:1.65;white-space:pre-wrap;margin:0">${personalMessage.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')}</p>
       <hr style="border:none;border-top:1px solid #e0d8c8;margin:28px 0"/>`
    : ''

  return `
<div style="font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;max-width:600px;margin:0 auto;background:#ffffff;">
  <div style="background-color:#2C3777;padding:18px 24px;text-align:center;">
    <img src="https://images.squarespace-cdn.com/content/v1/640e160f9a63e5441c7054f2/198408a5-87a0-427c-b02c-767ca3a69220/The-Nightside-Logo-White.png?format=1500w"
         alt="The Nightside" style="max-width:100px;height:auto;"/>
  </div>
  <div style="padding:32px 24px;">
    <h2 style="margin-top:0;font-size:22px;color:#130426;">You've been designated as a Legacy Contact</h2>

    <p style="color:#130426;line-height:1.65;">Hi ${contactFirst},</p>
    <p style="color:#130426;line-height:1.65;">${userFirst} ${userLast} has designated you as a Legacy Contact on The Nightside Planning Studio, an end-of-life planning platform.</p>

    <h3 style="font-size:16px;color:#130426;margin:28px 0 8px;">About this designation</h3>
    <p style="color:#130426;line-height:1.65;">${userFirst} has been doing end-of-life planning on the platform and has named you as someone they trust. This means that, in the event of their death, you will be the person we release their practical planning materials to; this includes things like wishes for their body and funeral, important contacts, financial information, and other administrative details.</p>

    <h3 style="font-size:16px;color:#130426;margin:28px 0 8px;">What this means for you right now</h3>
    <p style="color:#130426;line-height:1.65;">There's nothing for you to do at this moment. You don't have access to ${userFirst}'s plan while they are alive, and this designation doesn't ask anything of you unless circumstances change.</p>
    <p style="color:#130426;line-height:1.65;">It also doesn't give you any legal authority over ${userFirst}'s estate, healthcare, or other matters. If ${userFirst} wants you to have other authority, that's designated separately through legal documents like a will or representation agreement.</p>

    <h3 style="font-size:16px;color:#130426;margin:28px 0 8px;">If something happens to ${userFirst}</h3>
    <p style="color:#130426;line-height:1.65;">If ${userFirst} passes away and you need to activate your role as Legacy Contact, you can reach out to us at <a href="mailto:contact@thenightside.net" style="color:#2C3777;">contact@thenightside.net</a>. We'll work with you to release ${userFirst}'s planning materials and to confirm what has happened. We can be flexible about documentation depending on what's available; a death certificate, a Statement of Death from a funeral director, or other comparable documentation all work.</p>

    <h3 style="font-size:16px;color:#130426;margin:28px 0 8px;">If you have questions or concerns</h3>
    <p style="color:#130426;line-height:1.65;">If you have questions about being designated, or if you'd rather not take on this role, please reach out to ${userFirst} directly. They can update their designation at any time, and your relationship to them isn't tied to this designation in any way.</p>
    <p style="color:#130426;line-height:1.65;">${userFirst} may reach out to you to talk about this soon. If they haven't yet, you're welcome to reach out to them too.</p>

    ${msgBlock}

    <p style="color:#130426;line-height:1.65;">If you have any questions about the platform itself, you can reach us at <a href="mailto:contact@thenightside.net" style="color:#2C3777;">contact@thenightside.net</a>.</p>
    <p style="color:#130426;line-height:1.65;">With care,<br/>The Nightside</p>
  </div>
</div>`
}

async function sendDesignationEmail(
  to: string,
  contactFirst: string,
  userFirst: string,
  userLast: string,
  personalMessage?: string | null,
): Promise<{ ok: boolean; error?: string }> {
  return sendEmail({
    to,
    subject: `${toTitleCase(userFirst)} ${toTitleCase(userLast)} has designated you as a Legacy Contact on The Nightside Planning Studio`,
    html: buildEmail({ userFirst, userLast, contactFirst, personalMessage }),
  })
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
  const primaryEmail = await sendDesignationEmail(primary.email, primary.firstName, userFirst, userLast, personalMessage)
  if (!primaryEmail.ok) {
    await admin.from('legacy_contacts').delete().eq('user_id', user.id)
    return NextResponse.json(
      { error: `Could not send notification to ${primary.email}. Please check the address and try again. (${primaryEmail.error})` },
      { status: 502 }
    )
  }

  if (secondary) {
    const secondaryEmail = await sendDesignationEmail(secondary.email, secondary.firstName, userFirst, userLast, personalMessage)
    if (!secondaryEmail.ok) {
      await admin.from('legacy_contacts').delete().eq('user_id', user.id)
      return NextResponse.json(
        { error: `Could not send notification to ${secondary.email}. Please check the address and try again. (${secondaryEmail.error})` },
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
