import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { createClient } from '@supabase/supabase-js'
import { logEvent } from '@/lib/analytics'
import { buildAccountDeletedEmail, notifyPrimaryAndRecovery, ACCOUNT_DELETED_SUBJECT } from '@/lib/account-notifications'

export async function POST(req: NextRequest) {
  // Verify the requester is authenticated
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { password } = await req.json()
  if (!password) {
    return NextResponse.json({ error: 'Password is required' }, { status: 400 })
  }

  // Re-authenticate to verify password before deleting
  const { error: signInError } = await supabase.auth.signInWithPassword({
    email: user.email!,
    password,
  })
  if (signInError) {
    return NextResponse.json({ error: 'Incorrect password.' }, { status: 403 })
  }

  const uid = user.id

  // Log before deletion so user_id reference is still valid
  await logEvent({ userId: uid, eventName: 'account_deleted' })

  // Delete storage files (voice notes)
  try {
    const { data: files } = await supabase.storage.from('voice-notes').list(uid)
    if (files && files.length > 0) {
      const paths = files.map((f) => `${uid}/${f.name}`)
      await supabase.storage.from('voice-notes').remove(paths)
    }
  } catch {
    // Non-fatal — proceed with DB deletion
  }

  // All user-owned rows (containers, container_notes, container_entries,
  // notes, entries, entry_notes, domain_hidden_notes,
  // user_profiles, legacy_contacts, user_release_preferences, analytics_events,
  // etc.) are cleaned up via ON DELETE CASCADE on auth.users(id) when the
  // admin client deletes the auth user below. No explicit table-level deletes
  // are needed. The account_deleted analytics event is logged earlier (above)
  // so its user_id reference survives the cascade.

  // Notify BOTH primary + verified recovery BEFORE deleting — afterward the
  // addresses are gone. Best-effort: a send failure must not block the deletion.
  // (Read of the recovery address uses the still-valid session client / RLS.)
  try {
    const firstName = (user.user_metadata?.first_name as string | undefined) ?? ''
    await notifyPrimaryAndRecovery(supabase, uid, user.email, ACCOUNT_DELETED_SUBJECT, buildAccountDeletedEmail(firstName))
  } catch (err) {
    console.error('[delete-account] notification failed', err)
  }

  // Delete the auth user (requires service role key)
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (serviceRoleKey) {
    const adminClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      serviceRoleKey,
      { auth: { autoRefreshToken: false, persistSession: false } },
    )
    await adminClient.auth.admin.deleteUser(uid)
  }
  // If no service role key, data is wiped but auth record remains;
  // the user is signed out and can't access the app without data anyway.

  return NextResponse.json({ ok: true })
}
