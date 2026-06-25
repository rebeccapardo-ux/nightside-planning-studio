import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { createClient } from '@supabase/supabase-js'
import { VOICE_NOTES_BUCKET } from '@/lib/voice-notes'

// "Make this a task" (PR 4). Authenticates the session, then calls the
// service-role convert_note_to_task RPC (the atomic DB teardown) with the
// caller's own user id, then best-effort deletes the voice note's audio object
// (Storage is outside the RPC's transaction). The DB cleanup is irreversible, so
// a failed audio delete is an accepted cost — an orphaned file, never a blocked
// conversion (same posture as delete-account).

type RpcRow = {
  task_id:         string
  task_domain_id:  string
  task_row_key:    string
  task_label:      string
  task_checked:    boolean
  task_created_at: string
  task_updated_at: string
  note_audio_url:  string | null
  note_mode:       string | null
}

export async function POST(req: NextRequest) {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: { noteId?: string; domainId?: string; rowKey?: string; label?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
  }
  const { noteId, domainId, rowKey, label } = body
  if (!noteId || !domainId || !rowKey || typeof label !== 'string') {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  }

  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceRoleKey) {
    return NextResponse.json({ error: 'Server not configured' }, { status: 500 })
  }
  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceRoleKey,
    { auth: { autoRefreshToken: false, persistSession: false } },
  )

  // p_user_id is the authenticated caller — auth.uid() is null inside the RPC
  // under the service role, so the function checks ownership against this id.
  const { data, error } = await admin.rpc('convert_note_to_task', {
    p_user_id:   user.id,
    p_note_id:   noteId,
    p_domain_id: domainId,
    p_row_key:   rowKey,
    p_label:     label,
  })
  if (error) {
    console.error('[convert-to-task] rpc error:', error.message)
    return NextResponse.json({ error: 'Conversion failed' }, { status: 500 })
  }

  // The RPC returns a set: one row on success, EMPTY if the note was already
  // gone (idempotency / two-tab). Empty => already handled; ok, but no task to add.
  const row = (Array.isArray(data) ? data[0] : data) as RpcRow | undefined
  if (!row) {
    return NextResponse.json({ ok: true, task: null, alreadyHandled: true })
  }

  // Best-effort audio cleanup — never fail the (already-committed) conversion.
  if (row.note_mode === 'audio' && row.note_audio_url) {
    try {
      const { error: rmErr } = await admin.storage.from(VOICE_NOTES_BUCKET).remove([row.note_audio_url])
      if (rmErr) console.error('[convert-to-task] audio cleanup failed (orphan left):', rmErr.message)
    } catch (err) {
      console.error('[convert-to-task] audio cleanup threw (orphan left):', err)
    }
  }

  return NextResponse.json({
    ok: true,
    task: {
      id:         row.task_id,
      domain_id:  row.task_domain_id,
      row_key:    row.task_row_key,
      label:      row.task_label,
      checked:    row.task_checked,
      created_at: row.task_created_at,
      updated_at: row.task_updated_at,
    },
  })
}
