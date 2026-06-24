// User-defined domain tasks — the data layer for the `user_checkboxes` table
// (parallel to lib/notes.ts for the `notes` table). A user task is one
// user-authored checkbox living on a domain page, either under a predefined
// readiness row (`row_key` = that row's key from lib/domain-structure.ts) or
// under the synthetic catch-all (`row_key` = OTHER_ROW_KEY). User tasks count
// toward planning-status progress exactly like platform checkboxes — the
// UserTask shape is a structural superset of UserTaskProgressInput, so a
// UserTask[] feeds straight into computeDomainProgress (lib/domain-status.ts).
//
// `domain_id` is the container UUID (same key domain_state / domain_hidden_notes
// use), with a DB-level FK to containers(id) ON DELETE CASCADE.
//
// updated_at is maintained APP-SIDE here (set on each mutation), matching the
// rest of the app — there is no DB trigger.

import type { SupabaseClient } from '@supabase/supabase-js'
import { createSupabaseBrowserClient } from './supabase-browser'

// Reserved row_key for the synthetic "Other tasks" catch-all. No predefined
// readiness row in lib/domain-structure.ts is or may be named this — a task
// whose row_key matches no current readiness key falls through to it (see
// bucketTasksByRow). Keep this in sync with the invariant in the migration.
export const OTHER_ROW_KEY = 'other'

export type UserTask = {
  id: string
  domain_id: string
  row_key: string
  label: string
  checked: boolean
  created_at: string
  updated_at: string
}

const USER_TASK_FIELDS = 'id, domain_id, row_key, label, checked, created_at, updated_at'

// All of a user's tasks for one domain, in creation order (oldest first — tasks
// render at the bottom of their row in the order they were added; no reordering).
export async function fetchUserTasks(domainId: string): Promise<UserTask[]> {
  const supabase = createSupabaseBrowserClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data, error } = await supabase
    .from('user_checkboxes')
    .select(USER_TASK_FIELDS)
    .eq('user_id', user.id)
    .eq('domain_id', domainId)
    .order('created_at', { ascending: true })

  if (error) { console.error('fetchUserTasks error:', error.message, '| code:', error.code); return [] }
  return data ?? []
}

// DB-only read of ALL a user's tasks (every domain), for server / Node contexts
// (the Legacy Contact release script) where there is no browser session. Requires
// an explicit client — a Node caller passes a service-role client. Mirrors
// loadDomainStateFromDB in lib/domain-state.ts. Callers group by domain_id.
export async function fetchUserTasksFromDB(client: SupabaseClient, userId: string): Promise<UserTask[]> {
  const { data, error } = await client
    .from('user_checkboxes')
    .select(USER_TASK_FIELDS)
    .eq('user_id', userId)
    .order('created_at', { ascending: true })

  if (error) { console.error('fetchUserTasksFromDB error:', error.message); return [] }
  return data ?? []
}

// Create a task under a readiness row (rowKey = that row's key) or the catch-all
// (rowKey = OTHER_ROW_KEY). Returns the inserted row (await-then-append on the
// caller); null on empty label or error.
export async function createUserTask(domainId: string, rowKey: string, label: string): Promise<UserTask | null> {
  const trimmed = label.trim()
  if (!trimmed) return null

  const supabase = createSupabaseBrowserClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data, error } = await supabase
    .from('user_checkboxes')
    .insert({ user_id: user.id, domain_id: domainId, row_key: rowKey, label: trimmed, checked: false })
    .select(USER_TASK_FIELDS)
    .single()

  if (error) { console.error('createUserTask error:', error.message, '| code:', error.code); return null }
  return data
}

export async function toggleUserTask(id: string, checked: boolean): Promise<boolean> {
  const supabase = createSupabaseBrowserClient()
  const { error } = await supabase
    .from('user_checkboxes')
    .update({ checked, updated_at: new Date().toISOString() })
    .eq('id', id)

  if (error) { console.error('toggleUserTask error:', error.message); return false }
  return true
}

export async function updateUserTaskLabel(id: string, label: string): Promise<boolean> {
  const trimmed = label.trim()
  if (!trimmed) return false

  const supabase = createSupabaseBrowserClient()
  const { error } = await supabase
    .from('user_checkboxes')
    .update({ label: trimmed, updated_at: new Date().toISOString() })
    .eq('id', id)

  if (error) { console.error('updateUserTaskLabel error:', error.message); return false }
  return true
}

export async function deleteUserTask(id: string): Promise<boolean> {
  const supabase = createSupabaseBrowserClient()
  const { error } = await supabase.from('user_checkboxes').delete().eq('id', id)

  if (error) { console.error('deleteUserTask error:', error.message); return false }
  return true
}

// Convert a note into a user task (PR 4 "Make this a task"). Goes through the
// server route (/api/notes/convert-to-task), which calls the convert_note_to_task
// RPC (atomic DB teardown of the note + its links + origin-aware its entry) and
// best-effort deletes any voice-note audio. Returns:
//   { ok: true,  task }       — converted; append `task` (it lives in destination domain)
//   { ok: true,  task: null } — the note was already gone (idempotent no-op); still
//                               safe to drop the note from the stream
//   { ok: false, task: null } — failed; leave the note in place
export async function convertNoteToTask(params: {
  noteId: string
  domainId: string
  rowKey: string
  label: string
}): Promise<{ ok: boolean; task: UserTask | null }> {
  try {
    const res = await fetch('/api/notes/convert-to-task', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    })
    if (!res.ok) { console.error('convertNoteToTask failed:', res.status); return { ok: false, task: null } }
    const json = await res.json().catch(() => null)
    return { ok: true, task: (json?.task as UserTask) ?? null }
  } catch (err) {
    console.error('convertNoteToTask error:', err)
    return { ok: false, task: null }
  }
}

// Bucket a domain's tasks for render: each task either belongs to a predefined
// readiness row (its row_key is in readinessKeys) or falls through to `other`
// (row_key === OTHER_ROW_KEY, OR a stale row_key no longer in the structure —
// graceful degradation if a readiness key is ever changed). Single source of
// this bucketing so the domain page and the PDF can't drift.
export function bucketTasksByRow(
  tasks: UserTask[],
  readinessKeys: string[],
): { byRow: Record<string, UserTask[]>; other: UserTask[] } {
  const keySet = new Set(readinessKeys)
  const byRow: Record<string, UserTask[]> = {}
  const other: UserTask[] = []
  for (const t of tasks) {
    if (t.row_key !== OTHER_ROW_KEY && keySet.has(t.row_key)) {
      (byRow[t.row_key] ||= []).push(t)
    } else {
      other.push(t)
    }
  }
  return { byRow, other }
}
