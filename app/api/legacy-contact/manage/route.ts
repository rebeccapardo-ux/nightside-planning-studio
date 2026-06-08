import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { createClient } from '@supabase/supabase-js'
import { logEvent } from '@/lib/analytics'
import { sendEmail } from '@/lib/email'

// ── Utilities ────────────────────────────────────────────────────────────────

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

function toTitleCase(name: string): string {
  if (!name) return name
  return name.toLowerCase().replace(/\b\w/g, c => c.toUpperCase())
}

function esc(s: string) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

// ── Shared email wrapper ─────────────────────────────────────────────────────

function emailWrap(body: string): string {
  return `
<div style="font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;max-width:600px;margin:0 auto;background:#ffffff;">
  <div style="background-color:#2C3777;padding:18px 24px;text-align:center;">
    <img src="https://images.squarespace-cdn.com/content/v1/640e160f9a63e5441c7054f2/198408a5-87a0-427c-b02c-767ca3a69220/The-Nightside-Logo-White.png?format=1500w"
         alt="The Nightside" style="max-width:100px;height:auto;"/>
  </div>
  <div style="padding:32px 24px;">
    ${body}
    <p style="color:#130426;line-height:1.65;">With care,<br/>The Nightside</p>
  </div>
</div>`
}

// ── Template 1: Designation ("you've been designated") ───────────────────────

function buildDesignationEmail(
  userFirst: string,
  userLast: string,
  contactFirst: string,
  personalMessage?: string | null,
): string {
  userFirst    = toTitleCase(userFirst)
  userLast     = toTitleCase(userLast)
  contactFirst = toTitleCase(contactFirst)

  const msgBlock = personalMessage
    ? `<hr style="border:none;border-top:1px solid #e0d8c8;margin:28px 0"/>
       <h3 style="margin:0 0 10px;font-size:15px;color:#130426;">A message from ${userFirst}</h3>
       <p style="color:#130426;line-height:1.65;white-space:pre-wrap;margin:0">${esc(personalMessage)}</p>
       <hr style="border:none;border-top:1px solid #e0d8c8;margin:28px 0"/>`
    : ''

  return emailWrap(`
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
  `)
}

// ── Template 2: Dedesignation ("you're no longer designated") ────────────────

function buildDedesignationEmail(
  userFirst: string,
  userLast: string,
  contactFirst: string,
): string {
  userFirst    = toTitleCase(userFirst)
  userLast     = toTitleCase(userLast)
  contactFirst = toTitleCase(contactFirst)

  return emailWrap(`
    <h2 style="margin-top:0;font-size:22px;color:#130426;">Your Legacy Contact designation has been updated</h2>
    <p style="color:#130426;line-height:1.65;">Hi ${contactFirst},</p>
    <p style="color:#130426;line-height:1.65;">${userFirst} ${userLast} has updated their Legacy Contact designation on The Nightside Planning Studio. You are no longer designated as their Legacy Contact.</p>
    <p style="color:#130426;line-height:1.65;">No further action is needed from you. If you have any questions, you can reach out to ${userFirst} directly.</p>
    <p style="color:#130426;line-height:1.65;">If you have any questions about the platform, you can reach us at <a href="mailto:contact@thenightside.net" style="color:#2C3777;">contact@thenightside.net</a>.</p>
  `)
}

// ── Template 3: Email updated ("your email on file has been updated") ─────────

function buildEmailUpdateEmail(
  userFirst: string,
  userLast: string,
  contactFirst: string,
): string {
  userFirst    = toTitleCase(userFirst)
  userLast     = toTitleCase(userLast)
  contactFirst = toTitleCase(contactFirst)

  return emailWrap(`
    <h2 style="margin-top:0;font-size:22px;color:#130426;">Your email on file has been updated</h2>
    <p style="color:#130426;line-height:1.65;">Hi ${contactFirst},</p>
    <p style="color:#130426;line-height:1.65;">${userFirst} ${userLast} has updated the email address they use to reach you as their Legacy Contact on The Nightside Planning Studio. This message confirms your new email is on file.</p>
    <p style="color:#130426;line-height:1.65;">Your role as their Legacy Contact has not changed. You don't need to do anything now.</p>
    <h3 style="font-size:16px;color:#130426;margin:28px 0 8px;">As a reminder of what this means</h3>
    <p style="color:#130426;line-height:1.65;">${userFirst} has designated you to receive their practical planning materials if they die. These include things like wishes for their body and funeral, important contacts, financial information, and other administrative details. You do not have access to their plan while they are alive, and you have no other authority over their estate, healthcare, or other matters.</p>
    <p style="color:#130426;line-height:1.65;"><strong>If ${userFirst} dies and you need to activate your role as Legacy Contact</strong>, contact us at <a href="mailto:contact@thenightside.net" style="color:#2C3777;">contact@thenightside.net</a>. We'll work with you to verify the death and release ${userFirst}'s planning materials.</p>
    <p style="color:#130426;line-height:1.65;">If you have any questions, you can reach us at <a href="mailto:contact@thenightside.net" style="color:#2C3777;">contact@thenightside.net</a>.</p>
  `)
}

// ── POST /api/legacy-contact/manage ──────────────────────────────────────────

interface ContactInput {
  firstName: string
  lastName:  string
  email:     string
  relationship: string
}

export async function POST(req: NextRequest) {
  // Auth
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const meta      = user.user_metadata ?? {}
  const userFirst = (meta.first_name as string) || user.email?.split('@')[0] || 'Someone'
  const userLast  = (meta.last_name  as string) || ''

  // Parse
  let body: Record<string, unknown>
  try { body = await req.json() }
  catch { return NextResponse.json({ error: 'Invalid request body' }, { status: 400 }) }

  const action      = body.action as string
  const contactType = body.contactType as 'primary' | 'secondary' | undefined
  const password    = body.password as string

  if (!action || !password) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  // Verify password
  const { error: authError } = await supabase.auth.signInWithPassword({
    email: user.email!, password,
  })
  if (authError) {
    return NextResponse.json({ error: 'Incorrect password' }, { status: 401 })
  }

  // Admin client
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceKey) return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })

  const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  // ── Edit ──────────────────────────────────────────────────────────────────
  if (action === 'edit') {
    if (!contactType) return NextResponse.json({ error: 'contactType required' }, { status: 400 })

    const contact = body.contact as ContactInput
    if (!contact?.firstName || !contact?.lastName || !contact?.email || !contact?.relationship) {
      return NextResponse.json({ error: 'All contact fields are required' }, { status: 400 })
    }
    if (!isValidEmail(contact.email)) {
      return NextResponse.json({ error: 'Email address is not valid' }, { status: 400 })
    }
    if (contact.email.toLowerCase() === user.email?.toLowerCase()) {
      return NextResponse.json({ error: 'Legacy Contact email cannot be your own email address' }, { status: 400 })
    }

    // Get current record
    const { data: current } = await admin
      .from('legacy_contacts')
      .select('*')
      .eq('user_id', user.id)
      .eq('contact_type', contactType)
      .maybeSingle()
    if (!current) return NextResponse.json({ error: 'Contact not found' }, { status: 404 })

    const emailChanged = contact.email.toLowerCase() !== current.email.toLowerCase()

    // Check new email doesn't conflict with the other contact
    if (emailChanged) {
      const otherType = contactType === 'primary' ? 'secondary' : 'primary'
      const { data: other } = await admin
        .from('legacy_contacts')
        .select('email')
        .eq('user_id', user.id)
        .eq('contact_type', otherType)
        .maybeSingle()
      if (other && contact.email.toLowerCase() === other.email.toLowerCase()) {
        return NextResponse.json(
          { error: 'Primary and secondary contacts must have different email addresses' },
          { status: 400 }
        )
      }
    }

    // Update record
    const { error: updateErr } = await admin
      .from('legacy_contacts')
      .update({
        first_name:   contact.firstName,
        last_name:    contact.lastName,
        email:        contact.email.toLowerCase(),
        relationship: contact.relationship,
        updated_at:   new Date().toISOString(),
      })
      .eq('id', current.id)
    if (updateErr) return NextResponse.json({ error: 'Failed to save changes. Please try again.' }, { status: 500 })

    // Audit log
    await admin.from('legacy_contact_audit_log').insert({
      user_id:       user.id,
      action:        'updated',
      contact_type:  contactType,
      previous_data: { first_name: current.first_name, last_name: current.last_name, email: current.email, relationship: current.relationship },
      new_data:      { first_name: contact.firstName,  last_name: contact.lastName,  email: contact.email.toLowerCase(), relationship: contact.relationship },
    })

    // Email notification only if email changed
    if (emailChanged) {
      const html    = buildEmailUpdateEmail(userFirst, userLast, contact.firstName)
      const subject = `Your email on file for ${toTitleCase(userFirst)} has been updated`
      await sendEmail({ to: contact.email.toLowerCase(), subject, html })
      // Don't block on email failure — the edit is already saved
    }

    logEvent({ userId: user.id, eventName: 'legacy_contact_updated', metadata: { action: 'edit', contactType } })
    return NextResponse.json({ ok: true })
  }

  // ── Replace ───────────────────────────────────────────────────────────────
  if (action === 'replace') {
    if (!contactType) return NextResponse.json({ error: 'contactType required' }, { status: 400 })

    const newContact     = body.contact as ContactInput
    const personalMessage = (body.personalMessage as string | null) ?? null

    if (!newContact?.firstName || !newContact?.lastName || !newContact?.email || !newContact?.relationship) {
      return NextResponse.json({ error: 'All contact fields are required' }, { status: 400 })
    }
    if (!isValidEmail(newContact.email)) {
      return NextResponse.json({ error: 'Email address is not valid' }, { status: 400 })
    }
    if (newContact.email.toLowerCase() === user.email?.toLowerCase()) {
      return NextResponse.json({ error: 'Legacy Contact email cannot be your own email address' }, { status: 400 })
    }
    if (personalMessage && personalMessage.length > 1500) {
      return NextResponse.json({ error: 'Personal message must be 1500 characters or fewer' }, { status: 400 })
    }

    // Get current record (to notify old contact and check email conflicts)
    const { data: current } = await admin
      .from('legacy_contacts')
      .select('*')
      .eq('user_id', user.id)
      .eq('contact_type', contactType)
      .maybeSingle()
    if (!current) return NextResponse.json({ error: 'Contact not found' }, { status: 404 })

    // Check new email doesn't conflict with the other contact
    const otherType = contactType === 'primary' ? 'secondary' : 'primary'
    const { data: other } = await admin
      .from('legacy_contacts')
      .select('email')
      .eq('user_id', user.id)
      .eq('contact_type', otherType)
      .maybeSingle()
    if (other && newContact.email.toLowerCase() === other.email.toLowerCase()) {
      return NextResponse.json(
        { error: 'Primary and secondary contacts must have different email addresses' },
        { status: 400 }
      )
    }

    // Delete old record, insert new
    const { error: deleteErr } = await admin
      .from('legacy_contacts')
      .delete()
      .eq('id', current.id)
    if (deleteErr) return NextResponse.json({ error: 'Failed to update. Please try again.' }, { status: 500 })

    const { error: insertErr } = await admin.from('legacy_contacts').insert({
      user_id:          user.id,
      contact_type:     contactType,
      first_name:       newContact.firstName,
      last_name:        newContact.lastName,
      email:            newContact.email.toLowerCase(),
      relationship:     newContact.relationship,
      personal_message: personalMessage,
    })
    if (insertErr) {
      // Restore old record
      await admin.from('legacy_contacts').insert(current)
      return NextResponse.json({ error: 'Failed to update. Please try again.' }, { status: 500 })
    }

    // Audit log
    await admin.from('legacy_contact_audit_log').insert([
      { user_id: user.id, action: 'removed', contact_type: contactType,
        previous_data: { first_name: current.first_name, last_name: current.last_name, email: current.email }, new_data: null },
      { user_id: user.id, action: 'designated', contact_type: contactType,
        previous_data: null, new_data: { first_name: newContact.firstName, last_name: newContact.lastName, email: newContact.email.toLowerCase() } },
    ])

    // Emails — rollback if either fails
    const dedesig = await sendEmail({
      to: current.email,
      subject: 'Your Legacy Contact designation has been updated',
      html: buildDedesignationEmail(userFirst, userLast, current.first_name),
    })
    if (!dedesig.ok) {
      await admin.from('legacy_contacts').delete().eq('user_id', user.id).eq('contact_type', contactType)
      await admin.from('legacy_contacts').insert(current)
      return NextResponse.json(
        { error: `Could not notify your previous Legacy Contact at ${current.email}. No changes were saved. Please try again. (${dedesig.error})` },
        { status: 502 }
      )
    }

    const desig = await sendEmail({
      to: newContact.email.toLowerCase(),
      subject: `${toTitleCase(userFirst)} ${toTitleCase(userLast)} has designated you as a Legacy Contact on The Nightside Planning Studio`,
      html: buildDesignationEmail(userFirst, userLast, newContact.firstName, personalMessage),
    })
    if (!desig.ok) {
      await admin.from('legacy_contacts').delete().eq('user_id', user.id).eq('contact_type', contactType)
      await admin.from('legacy_contacts').insert(current)
      return NextResponse.json(
        { error: `Could not notify your new Legacy Contact at ${newContact.email}. No changes were saved. Please try again. (${desig.error})` },
        { status: 502 }
      )
    }

    logEvent({ userId: user.id, eventName: 'legacy_contact_updated', metadata: { action: 'replace', contactType } })
    return NextResponse.json({ ok: true })
  }

  // ── Add secondary ─────────────────────────────────────────────────────────
  if (action === 'add-secondary') {
    const newContact     = body.contact as ContactInput
    const personalMessage = (body.personalMessage as string | null) ?? null

    if (!newContact?.firstName || !newContact?.lastName || !newContact?.email || !newContact?.relationship) {
      return NextResponse.json({ error: 'All contact fields are required' }, { status: 400 })
    }
    if (!isValidEmail(newContact.email)) {
      return NextResponse.json({ error: 'Email address is not valid' }, { status: 400 })
    }
    if (newContact.email.toLowerCase() === user.email?.toLowerCase()) {
      return NextResponse.json({ error: 'Legacy Contact email cannot be your own email address' }, { status: 400 })
    }
    if (personalMessage && personalMessage.length > 1500) {
      return NextResponse.json({ error: 'Personal message must be 1500 characters or fewer' }, { status: 400 })
    }

    // Check no secondary already exists
    const { data: existing } = await admin
      .from('legacy_contacts')
      .select('id')
      .eq('user_id', user.id)
      .eq('contact_type', 'secondary')
      .maybeSingle()
    if (existing) return NextResponse.json({ error: 'A secondary Legacy Contact is already designated.' }, { status: 409 })

    // Check email doesn't match primary
    const { data: primary } = await admin
      .from('legacy_contacts')
      .select('email')
      .eq('user_id', user.id)
      .eq('contact_type', 'primary')
      .maybeSingle()
    if (primary && newContact.email.toLowerCase() === primary.email.toLowerCase()) {
      return NextResponse.json(
        { error: 'Primary and secondary contacts must have different email addresses' },
        { status: 400 }
      )
    }

    // Insert
    const { error: insertErr } = await admin.from('legacy_contacts').insert({
      user_id:          user.id,
      contact_type:     'secondary',
      first_name:       newContact.firstName,
      last_name:        newContact.lastName,
      email:            newContact.email.toLowerCase(),
      relationship:     newContact.relationship,
      personal_message: personalMessage,
    })
    if (insertErr) return NextResponse.json({ error: 'Failed to save. Please try again.' }, { status: 500 })

    // Audit log
    await admin.from('legacy_contact_audit_log').insert({
      user_id: user.id, action: 'designated', contact_type: 'secondary',
      previous_data: null,
      new_data: { first_name: newContact.firstName, last_name: newContact.lastName, email: newContact.email.toLowerCase() },
    })

    // Email — rollback if fails
    const desig = await sendEmail({
      to: newContact.email.toLowerCase(),
      subject: `${toTitleCase(userFirst)} ${toTitleCase(userLast)} has designated you as a Legacy Contact on The Nightside Planning Studio`,
      html: buildDesignationEmail(userFirst, userLast, newContact.firstName, personalMessage),
    })
    if (!desig.ok) {
      await admin.from('legacy_contacts').delete().eq('user_id', user.id).eq('contact_type', 'secondary')
      return NextResponse.json(
        { error: `Could not send notification to ${newContact.email}. Please check the address and try again. (${desig.error})` },
        { status: 502 }
      )
    }

    logEvent({ userId: user.id, eventName: 'legacy_contact_updated', metadata: { action: 'add-secondary' } })
    return NextResponse.json({ ok: true })
  }

  // ── Remove secondary ──────────────────────────────────────────────────────
  if (action === 'remove-secondary') {
    const { data: current } = await admin
      .from('legacy_contacts')
      .select('*')
      .eq('user_id', user.id)
      .eq('contact_type', 'secondary')
      .maybeSingle()
    if (!current) return NextResponse.json({ error: 'No secondary Legacy Contact found' }, { status: 404 })

    const { error: deleteErr } = await admin
      .from('legacy_contacts')
      .delete()
      .eq('id', current.id)
    if (deleteErr) return NextResponse.json({ error: 'Failed to remove. Please try again.' }, { status: 500 })

    // Audit log
    await admin.from('legacy_contact_audit_log').insert({
      user_id: user.id, action: 'removed', contact_type: 'secondary',
      previous_data: { first_name: current.first_name, last_name: current.last_name, email: current.email },
      new_data: null,
    })

    // Email — rollback if fails
    const dedesig = await sendEmail({
      to: current.email,
      subject: 'Your Legacy Contact designation has been updated',
      html: buildDedesignationEmail(userFirst, userLast, current.first_name),
    })
    if (!dedesig.ok) {
      await admin.from('legacy_contacts').insert(current)
      return NextResponse.json(
        { error: `Could not notify your Legacy Contact at ${current.email}. No changes were saved. Please try again. (${dedesig.error})` },
        { status: 502 }
      )
    }

    logEvent({ userId: user.id, eventName: 'legacy_contact_updated', metadata: { action: 'remove-secondary' } })
    return NextResponse.json({ ok: true })
  }

  return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
}
