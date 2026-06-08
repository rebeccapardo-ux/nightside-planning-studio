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

// ── Template 4: Promotion ("your role changed: secondary → primary") ─────────

function buildPromotionEmail(
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
    <h2 style="margin-top:0;font-size:22px;color:#130426;">Your role as a Legacy Contact has changed</h2>
    <p style="color:#130426;line-height:1.65;">Hi ${contactFirst},</p>
    <p style="color:#130426;line-height:1.65;">${userFirst} ${userLast} has updated their Legacy Contact designations on The Nightside Planning Studio. You were previously their <strong>secondary</strong> Legacy Contact; you are now their <strong>primary</strong> Legacy Contact. (You'll already have received a designation notice when ${userFirst} first named you — this is a change to your role, not a new designation.)</p>
    <h3 style="font-size:16px;color:#130426;margin:28px 0 8px;">What this means now</h3>
    <p style="color:#130426;line-height:1.65;">As ${userFirst}'s primary Legacy Contact, you are the first person we would contact to release their practical planning materials in the event of their death — things like wishes for their body and funeral, important contacts, financial information, and other administrative details. You still don't have access to ${userFirst}'s plan while they are alive, and this role gives you no legal authority over their estate, healthcare, or other matters.</p>
    <p style="color:#130426;line-height:1.65;">There's nothing you need to do right now.</p>
    ${msgBlock}
    <p style="color:#130426;line-height:1.65;">If ${userFirst} passes away and you need to activate your role, contact us at <a href="mailto:contact@thenightside.net" style="color:#2C3777;">contact@thenightside.net</a>. If you have any questions, you can reach ${userFirst} directly or us at the same address.</p>
  `)
}

// ── Template 5: Demotion ("your role changed: primary → secondary") ──────────

function buildDemotionEmail(
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
    <h2 style="margin-top:0;font-size:22px;color:#130426;">Your role as a Legacy Contact has changed</h2>
    <p style="color:#130426;line-height:1.65;">Hi ${contactFirst},</p>
    <p style="color:#130426;line-height:1.65;">${userFirst} ${userLast} has updated their Legacy Contact designations on The Nightside Planning Studio. You were previously their <strong>primary</strong> Legacy Contact; you are now their <strong>secondary</strong> Legacy Contact.</p>
    <p style="color:#130426;line-height:1.65;"><strong>You are still ${userFirst}'s Legacy Contact</strong> — this is a change to your order, not a removal.</p>
    <h3 style="font-size:16px;color:#130426;margin:28px 0 8px;">What this means now</h3>
    <p style="color:#130426;line-height:1.65;">As a secondary Legacy Contact, you would be contacted to receive ${userFirst}'s practical planning materials if their primary Legacy Contact is unavailable. You don't have access to ${userFirst}'s plan while they are alive, and this role gives you no legal authority over their estate, healthcare, or other matters.</p>
    <p style="color:#130426;line-height:1.65;">There's nothing you need to do right now.</p>
    ${msgBlock}
    <p style="color:#130426;line-height:1.65;">If you have any questions, you can reach ${userFirst} directly, or contact us at <a href="mailto:contact@thenightside.net" style="color:#2C3777;">contact@thenightside.net</a>.</p>
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

    // Email notification — only when the email address changed, and BLOCKING: the
    // address on file must not diverge from what the contact has been notified about.
    // Name / relationship changes stay silent (no notification), as before.
    if (emailChanged) {
      const html    = buildEmailUpdateEmail(userFirst, userLast, contact.firstName)
      const subject = `Your email on file for ${toTitleCase(userFirst)} has been updated`
      const note    = await sendEmail({ to: contact.email.toLowerCase(), subject, html })
      if (!note.ok) {
        // Roll the edit back to the previous values, then surface the failure.
        await admin
          .from('legacy_contacts')
          .update({
            first_name:   current.first_name,
            last_name:    current.last_name,
            email:        current.email,
            relationship: current.relationship,
            updated_at:   current.updated_at,
          })
          .eq('id', current.id)
        return NextResponse.json(
          { error: `Could not notify your Legacy Contact at ${contact.email}. Your change was not saved. Please try again. (${note.error})` },
          { status: 502 }
        )
      }
    }

    // Audit log (only after any required notification has succeeded)
    await admin.from('legacy_contact_audit_log').insert({
      user_id:       user.id,
      action:        'updated',
      contact_type:  contactType,
      previous_data: { first_name: current.first_name, last_name: current.last_name, email: current.email, relationship: current.relationship },
      new_data:      { first_name: contact.firstName,  last_name: contact.lastName,  email: contact.email.toLowerCase(), relationship: contact.relationship },
    })

    logEvent({ userId: user.id, eventName: 'legacy_contact_updated', metadata: { action: 'edit', contactType } })
    return NextResponse.json({ ok: true })
  }

  // ── Replace ───────────────────────────────────────────────────────────────
  // Secondary: swap the secondary record for a new person (de-designate old, designate new).
  // Primary: the new primary is either a brand-new person OR the existing secondary promoted
  // up, and the displaced old primary is either removed or moved into the secondary slot.
  // Every person whose role changes is notified; any notification failure rolls the whole
  // change back. Mutation ordering always vacates a slot before filling it so the
  // UNIQUE(user_id, contact_type) constraint is never violated mid-operation.
  if (action === 'replace') {
    if (!contactType) return NextResponse.json({ error: 'contactType required' }, { status: 400 })

    const personalMessage = (body.personalMessage as string | null) ?? null
    if (personalMessage && personalMessage.length > 1500) {
      return NextResponse.json({ error: 'Personal message must be 1500 characters or fewer' }, { status: 400 })
    }

    // ----- Secondary replace -----
    if (contactType === 'secondary') {
      const newContact = body.contact as ContactInput
      if (!newContact?.firstName || !newContact?.lastName || !newContact?.email || !newContact?.relationship) {
        return NextResponse.json({ error: 'All contact fields are required' }, { status: 400 })
      }
      if (!isValidEmail(newContact.email)) {
        return NextResponse.json({ error: 'Email address is not valid' }, { status: 400 })
      }
      if (newContact.email.toLowerCase() === user.email?.toLowerCase()) {
        return NextResponse.json({ error: 'Legacy Contact email cannot be your own email address' }, { status: 400 })
      }

      const { data: current } = await admin
        .from('legacy_contacts').select('*')
        .eq('user_id', user.id).eq('contact_type', 'secondary').maybeSingle()
      if (!current) return NextResponse.json({ error: 'Contact not found' }, { status: 404 })

      const { data: primary } = await admin
        .from('legacy_contacts').select('email')
        .eq('user_id', user.id).eq('contact_type', 'primary').maybeSingle()
      if (primary && newContact.email.toLowerCase() === primary.email.toLowerCase()) {
        return NextResponse.json({ error: 'Primary and secondary contacts must have different email addresses' }, { status: 400 })
      }

      const { error: deleteErr } = await admin.from('legacy_contacts').delete().eq('id', current.id)
      if (deleteErr) return NextResponse.json({ error: 'Failed to update. Please try again.' }, { status: 500 })

      const { error: insertErr } = await admin.from('legacy_contacts').insert({
        user_id: user.id, contact_type: 'secondary',
        first_name: newContact.firstName, last_name: newContact.lastName,
        email: newContact.email.toLowerCase(), relationship: newContact.relationship,
        personal_message: personalMessage,
      })
      if (insertErr) {
        await admin.from('legacy_contacts').insert(current)
        return NextResponse.json({ error: 'Failed to update. Please try again.' }, { status: 500 })
      }

      await admin.from('legacy_contact_audit_log').insert([
        { user_id: user.id, action: 'removed', contact_type: 'secondary',
          previous_data: { first_name: current.first_name, last_name: current.last_name, email: current.email }, new_data: null },
        { user_id: user.id, action: 'designated', contact_type: 'secondary',
          previous_data: null, new_data: { first_name: newContact.firstName, last_name: newContact.lastName, email: newContact.email.toLowerCase() } },
      ])

      const dedesig = await sendEmail({
        to: current.email.toLowerCase(),
        subject: 'Your Legacy Contact designation has been updated',
        html: buildDedesignationEmail(userFirst, userLast, current.first_name),
      })
      if (!dedesig.ok) {
        await admin.from('legacy_contacts').delete().eq('user_id', user.id).eq('contact_type', 'secondary')
        await admin.from('legacy_contacts').insert(current)
        return NextResponse.json({ error: `Could not notify your previous Legacy Contact at ${current.email}. No changes were saved. Please try again. (${dedesig.error})` }, { status: 502 })
      }

      const desig = await sendEmail({
        to: newContact.email.toLowerCase(),
        subject: `${toTitleCase(userFirst)} ${toTitleCase(userLast)} has designated you as a Legacy Contact on The Nightside Planning Studio`,
        html: buildDesignationEmail(userFirst, userLast, newContact.firstName, personalMessage),
      })
      if (!desig.ok) {
        await admin.from('legacy_contacts').delete().eq('user_id', user.id).eq('contact_type', 'secondary')
        await admin.from('legacy_contacts').insert(current)
        return NextResponse.json({ error: `Could not notify your new Legacy Contact at ${newContact.email}. No changes were saved. Please try again. (${desig.error})` }, { status: 502 })
      }

      logEvent({ userId: user.id, eventName: 'legacy_contact_updated', metadata: { action: 'replace', contactType: 'secondary' } })
      return NextResponse.json({ ok: true })
    }

    // ----- Primary replace -----
    const promote     = body.promote === true
    const disposition = body.oldPrimaryDisposition as 'remove' | 'secondary' | undefined
    if (disposition !== 'remove' && disposition !== 'secondary') {
      return NextResponse.json({ error: 'A decision about your current primary Legacy Contact is required.' }, { status: 400 })
    }

    const { data: P } = await admin
      .from('legacy_contacts').select('*')
      .eq('user_id', user.id).eq('contact_type', 'primary').maybeSingle()
    if (!P) return NextResponse.json({ error: 'Contact not found' }, { status: 404 })

    const { data: S } = await admin
      .from('legacy_contacts').select('*')
      .eq('user_id', user.id).eq('contact_type', 'secondary').maybeSingle()

    // Resolve the new primary's details (+ validate when it's a brand-new person)
    let newFirst: string, newLast: string, newEmail: string, newRel: string
    if (promote) {
      if (!S) return NextResponse.json({ error: 'No secondary Legacy Contact to promote.' }, { status: 400 })
      newFirst = S.first_name; newLast = S.last_name; newEmail = (S.email as string).toLowerCase(); newRel = S.relationship
    } else {
      const newContact = body.contact as ContactInput
      if (!newContact?.firstName || !newContact?.lastName || !newContact?.email || !newContact?.relationship) {
        return NextResponse.json({ error: 'All contact fields are required' }, { status: 400 })
      }
      if (!isValidEmail(newContact.email)) {
        return NextResponse.json({ error: 'Email address is not valid' }, { status: 400 })
      }
      newFirst = newContact.firstName; newLast = newContact.lastName
      newEmail = newContact.email.toLowerCase(); newRel = newContact.relationship
      if (newEmail === user.email?.toLowerCase()) {
        return NextResponse.json({ error: 'Legacy Contact email cannot be your own email address' }, { status: 400 })
      }
      // New primary email must not collide with whoever remains in the other slot:
      //   disposition 'secondary' → old primary P stays (demoted); 'remove' → old secondary S stays (if any).
      const survivorEmail = disposition === 'secondary'
        ? (P.email as string).toLowerCase()
        : (S ? (S.email as string).toLowerCase() : undefined)
      if (survivorEmail && newEmail === survivorEmail) {
        return NextResponse.json({ error: 'Primary and secondary contacts must have different email addresses' }, { status: 400 })
      }
    }

    // Uniform rollback to the original two records.
    const restoreOriginal = async () => {
      await admin.from('legacy_contacts').delete().eq('user_id', user.id)
      await admin.from('legacy_contacts').insert(S ? [P, S] : [P])
    }

    const now = new Date().toISOString()
    let dbErr: { message: string } | null = null

    if (disposition === 'remove') {
      // Old primary removed; new primary takes the (now-empty) primary slot.
      dbErr = (await admin.from('legacy_contacts').delete().eq('id', P.id)).error
      if (!dbErr && promote) {
        dbErr = (await admin.from('legacy_contacts')
          .update({ contact_type: 'primary', personal_message: personalMessage, updated_at: now })
          .eq('id', S!.id)).error
      } else if (!dbErr) {
        dbErr = (await admin.from('legacy_contacts').insert({
          user_id: user.id, contact_type: 'primary',
          first_name: newFirst, last_name: newLast, email: newEmail, relationship: newRel,
          personal_message: personalMessage,
        })).error
      }
    } else if (promote) {
      // Swap: secondary → primary, old primary → secondary. The contact_type enum has no
      // temp value and UNIQUE(user_id, contact_type) forbids two rows of the same type
      // mid-swap, so we can't do a clean in-place, id-preserving demotion of the primary.
      // Instead the demoted primary is re-inserted as a FRESH secondary row (new id /
      // designated_at). Pre-launch this is fine — nothing references the old primary's id.
      dbErr = (await admin.from('legacy_contacts').delete().eq('id', P.id)).error
      if (!dbErr) dbErr = (await admin.from('legacy_contacts')
        .update({ contact_type: 'primary', personal_message: personalMessage, updated_at: now })
        .eq('id', S!.id)).error
      if (!dbErr) dbErr = (await admin.from('legacy_contacts').insert({
        user_id: user.id, contact_type: 'secondary',
        first_name: P.first_name, last_name: P.last_name, email: P.email, relationship: P.relationship,
        personal_message: P.personal_message,
      })).error
    } else {
      // New person → primary; old primary → secondary; any existing secondary is bumped out.
      if (S) dbErr = (await admin.from('legacy_contacts').delete().eq('id', S.id)).error
      if (!dbErr) dbErr = (await admin.from('legacy_contacts')
        .update({ contact_type: 'secondary', updated_at: now })
        .eq('id', P.id)).error
      if (!dbErr) dbErr = (await admin.from('legacy_contacts').insert({
        user_id: user.id, contact_type: 'primary',
        first_name: newFirst, last_name: newLast, email: newEmail, relationship: newRel,
        personal_message: personalMessage,
      })).error
    }

    if (dbErr) {
      await restoreOriginal()
      return NextResponse.json({ error: 'Failed to update. Please try again.' }, { status: 500 })
    }

    // 1. Notify the new / promoted primary.
    const primaryNotice = promote
      ? await sendEmail({
          to: newEmail,
          subject: `Your role as ${toTitleCase(userFirst)} ${toTitleCase(userLast)}'s Legacy Contact has changed`,
          html: buildPromotionEmail(userFirst, userLast, newFirst, personalMessage),
        })
      : await sendEmail({
          to: newEmail,
          subject: `${toTitleCase(userFirst)} ${toTitleCase(userLast)} has designated you as a Legacy Contact on The Nightside Planning Studio`,
          html: buildDesignationEmail(userFirst, userLast, newFirst, personalMessage),
        })
    if (!primaryNotice.ok) {
      await restoreOriginal()
      return NextResponse.json({ error: `Could not notify your new Legacy Contact at ${newEmail}. No changes were saved. Please try again. (${primaryNotice.error})` }, { status: 502 })
    }

    // 2. Notify the displaced old primary — removed (de-designation) or demoted (role change).
    const oldPrimaryNotice = disposition === 'remove'
      ? await sendEmail({
          to: (P.email as string).toLowerCase(),
          subject: 'Your Legacy Contact designation has been updated',
          html: buildDedesignationEmail(userFirst, userLast, P.first_name),
        })
      : await sendEmail({
          to: (P.email as string).toLowerCase(),
          subject: `Your role as ${toTitleCase(userFirst)} ${toTitleCase(userLast)}'s Legacy Contact has changed`,
          html: buildDemotionEmail(userFirst, userLast, P.first_name, personalMessage),
        })
    if (!oldPrimaryNotice.ok) {
      await restoreOriginal()
      return NextResponse.json({ error: `Could not notify your previous Legacy Contact at ${P.email}. No changes were saved. Please try again. (${oldPrimaryNotice.error})` }, { status: 502 })
    }

    // 3. Notify an existing secondary that got bumped out (new-person + move-to-secondary only).
    if (!promote && disposition === 'secondary' && S) {
      const bumped = await sendEmail({
        to: (S.email as string).toLowerCase(),
        subject: 'Your Legacy Contact designation has been updated',
        html: buildDedesignationEmail(userFirst, userLast, S.first_name),
      })
      if (!bumped.ok) {
        await restoreOriginal()
        return NextResponse.json({ error: `Could not notify your previous secondary Legacy Contact at ${S.email}. No changes were saved. Please try again. (${bumped.error})` }, { status: 502 })
      }
    }

    await admin.from('legacy_contact_audit_log').insert({
      user_id: user.id, action: 'updated', contact_type: 'primary',
      previous_data: { first_name: P.first_name, last_name: P.last_name, email: P.email },
      new_data: { first_name: newFirst, last_name: newLast, email: newEmail, promote, old_primary_disposition: disposition },
    })

    logEvent({ userId: user.id, eventName: 'legacy_contact_updated', metadata: { action: 'replace', contactType: 'primary', promote, disposition } })
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

    // A secondary cannot exist without a primary — guard the latent path (also enforced
    // by UI flow, but there is no DB constraint, so enforce it here).
    const { data: primary } = await admin
      .from('legacy_contacts')
      .select('email')
      .eq('user_id', user.id)
      .eq('contact_type', 'primary')
      .maybeSingle()
    if (!primary) {
      return NextResponse.json(
        { error: 'You must designate a primary Legacy Contact before adding a secondary.' },
        { status: 409 }
      )
    }
    // New secondary's email must differ from the primary's.
    if (newContact.email.toLowerCase() === primary.email.toLowerCase()) {
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
