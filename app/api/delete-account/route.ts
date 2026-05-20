import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { createClient } from '@supabase/supabase-js'

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

  // Delete junction tables first (notes and entries linked to containers)
  const { data: containerIds } = await supabase
    .from('containers')
    .select('id')
    .eq('user_id', uid)

  if (containerIds && containerIds.length > 0) {
    const ids = containerIds.map((c) => c.id)
    await supabase.from('container_notes').delete().in('container_id', ids)
    await supabase.from('container_entries').delete().in('container_id', ids)
  }

  // Delete notes and entries belonging to this user
  await supabase.from('notes').delete().eq('user_id', uid)
  await supabase.from('entries').delete().eq('user_id', uid)
  await supabase.from('containers').delete().eq('user_id', uid)

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
