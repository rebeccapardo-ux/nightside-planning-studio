import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase-server'

export async function POST(request: Request) {
  const body = await request.json() as { subject?: string; message?: string; email?: string }
  const { subject, message, email: providedEmail } = body

  if (!message?.trim()) {
    return NextResponse.json({ error: 'Message is required.' }, { status: 400 })
  }

  let fromName = '(unauthenticated)'
  let fromEmail = providedEmail?.trim() || '(no email provided)'

  try {
    const supabase = await createSupabaseServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      fromEmail = user.email ?? fromEmail
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('first_name, last_name')
        .eq('user_id', user.id)
        .single()
      const first = profile?.first_name?.trim() ?? ''
      const last  = profile?.last_name?.trim()  ?? ''
      fromName = [first, last].filter(Boolean).join(' ') || fromEmail
    }
  } catch {
    // unauthenticated or session error — proceed with provided values
  }

  const subjectLine = subject?.trim() || 'No subject'
  const submitted = new Date().toLocaleString('en-CA', {
    timeZone: 'America/Toronto',
    dateStyle: 'long',
    timeStyle: 'short',
  })

  const text = [
    `From: ${fromName} (${fromEmail})`,
    `Submitted: ${submitted}`,
    '',
    `Subject: ${subjectLine}`,
    '',
    'Message:',
    message.trim(),
  ].join('\n')

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'The Nightside <noreply@thenightside.net>',
      to: 'contact@thenightside.net',
      subject: `[Platform feedback] ${subjectLine}`,
      text,
    }),
  })

  if (!res.ok) {
    console.error('[feedback] Resend error:', await res.text())
    return NextResponse.json({ error: 'Failed to send.' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
