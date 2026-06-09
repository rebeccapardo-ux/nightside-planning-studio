import { NextRequest, NextResponse } from 'next/server'
import crypto from 'node:crypto'
import { createClient } from '@supabase/supabase-js'
import { issueToken, sendRecoveryEmail } from '@/lib/recovery-email'

// Same neutral response in EVERY case — account exists or not, has a verified
// recovery email or not, throttled or not — so the endpoint can't be used to
// enumerate accounts or recovery-email setup.
const NEUTRAL = "If a recovery email is associated with this account, we've sent a link to it."

function sha256(s: string): string {
  return crypto.createHash('sha256').update(s).digest('hex')
}
function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

export async function POST(req: NextRequest) {
  let body: Record<string, unknown>
  try { body = await req.json() }
  catch { return NextResponse.json({ error: 'Invalid request body' }, { status: 400 }) }

  const email = (body.email as string | undefined)?.trim().toLowerCase() ?? ''
  if (!email || !isValidEmail(email)) {
    return NextResponse.json({ error: 'Please enter a valid email address.' }, { status: 400 })
  }

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceKey) return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
  const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  const ip        = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
  const emailHash = sha256(email)
  const ipHash    = sha256(ip)
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()

  // Throttle: per-email ≥3/hr OR per-IP ≥10/hr. Count BEFORE inserting this attempt.
  const [emailCount, ipCount] = await Promise.all([
    admin.from('recovery_request_attempts').select('id', { count: 'exact', head: true })
      .eq('email_hash', emailHash).gt('created_at', oneHourAgo),
    admin.from('recovery_request_attempts').select('id', { count: 'exact', head: true })
      .eq('ip_hash', ipHash).gt('created_at', oneHourAgo),
  ])
  const throttled = (emailCount.count ?? 0) >= 3 || (ipCount.count ?? 0) >= 10

  // Log this attempt regardless (rolling window; sustained abuse stays blocked).
  await admin.from('recovery_request_attempts').insert({ email_hash: emailHash, ip_hash: ipHash })

  if (!throttled) {
    // Resolve user + recovery state via the SECURITY DEFINER RPC (service-role only).
    const { data: rows } = await admin.rpc('recovery_lookup', { p_email: email })
    const row = (Array.isArray(rows) ? rows[0] : rows) as
      | { user_id: string; first_name: string | null; recovery_email: string | null; recovery_email_verified: boolean }
      | undefined
    if (row?.user_id && row.recovery_email && row.recovery_email_verified) {
      try {
        const raw        = await issueToken(row.user_id, 'recovery', row.recovery_email)
        const recoverUrl = `${req.nextUrl.origin}/auth/recover-account/confirm?token=${encodeURIComponent(raw)}`
        await sendRecoveryEmail(row.recovery_email, row.first_name ?? '', recoverUrl)
      } catch (err) {
        console.error('[recover-account] issue/send failed', err)
      }
    }
  }

  return NextResponse.json({ ok: true, message: NEUTRAL })
}
