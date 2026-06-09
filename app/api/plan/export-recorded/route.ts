import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { buildPlanExportEmail, notifyPrimaryAndRecovery, PLAN_EXPORT_SUBJECT } from '@/lib/account-notifications'

// Thin endpoint for the CLIENT-side full-PDF export: the export page calls this
// fire-and-forget after a full PDF is generated, so the server can send the
// "full export downloaded" notification (the PDF flow never hits the server).
// This is the pattern for bolting a server-side concern onto a client-only flow.
// Best-effort: a send failure never affects the user's download.
export async function POST() {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const firstName = (user.user_metadata?.first_name as string | undefined) ?? ''
    await notifyPrimaryAndRecovery(supabase, user.id, user.email, PLAN_EXPORT_SUBJECT, buildPlanExportEmail(firstName))
  } catch (err) {
    console.error('[export-recorded] notification failed', err)
  }

  return NextResponse.json({ ok: true })
}
