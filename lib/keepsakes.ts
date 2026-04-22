import { createSupabaseBrowserClient } from './supabase-browser'

// ---------------------------------------------------------------------------
// Keepsake Inventory — single structured document per user
//
// Stored in `entries` table:
//   document_type = 'keepsake_inventory'
//   title         = 'Meaningful Keepsakes'
//   content       = { entries: KeepsakeEntry[] }
// ---------------------------------------------------------------------------

export const KEEPSAKE_DOCUMENT_TYPE = 'keepsake_inventory'

export type KeepsakeEntry = {
  id: string          // client-generated UUID, stable within the document
  object: string
  recipient: string
  meaning: string
}

export type KeepsakeInventory = {
  id: string          // entries table row id
  entries: KeepsakeEntry[]
  created_at: string
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function rowToInventory(row: { id: string; content: unknown; created_at: string }): KeepsakeInventory {
  const c = (row.content && typeof row.content === 'object' && !Array.isArray(row.content))
    ? row.content as Record<string, unknown>
    : {}
  const entries = Array.isArray(c.entries)
    ? (c.entries as unknown[]).filter((e): e is KeepsakeEntry =>
        typeof e === 'object' && e !== null && 'id' in e
      )
    : []
  return { id: row.id, entries, created_at: row.created_at }
}

// ---------------------------------------------------------------------------
// CRUD
// ---------------------------------------------------------------------------

export async function fetchKeepsakeInventory(): Promise<KeepsakeInventory | null> {
  const supabase = createSupabaseBrowserClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data } = await supabase
    .from('entries')
    .select('id, content, created_at')
    .eq('user_id', user.id)
    .eq('document_type', KEEPSAKE_DOCUMENT_TYPE)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle()

  return data ? rowToInventory(data) : null
}

export async function createKeepsakeInventory(entries: KeepsakeEntry[]): Promise<KeepsakeInventory | null> {
  const supabase = createSupabaseBrowserClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data, error } = await supabase
    .from('entries')
    .insert({
      user_id: user.id,
      title: 'Meaningful Keepsakes',
      document_type: KEEPSAKE_DOCUMENT_TYPE,
      section: 'capture',
      content: { entries },
    })
    .select('id, content, created_at')
    .single()

  if (error) { console.error('createKeepsakeInventory:', error.message); return null }
  return rowToInventory(data)
}

export async function saveKeepsakeInventory(id: string, entries: KeepsakeEntry[]): Promise<boolean> {
  const supabase = createSupabaseBrowserClient()
  const { error } = await supabase
    .from('entries')
    .update({ content: { entries }, title: 'Meaningful Keepsakes' })
    .eq('id', id)

  if (error) { console.error('saveKeepsakeInventory:', error.message); return false }
  return true
}

// ---------------------------------------------------------------------------
// Format for display
// ---------------------------------------------------------------------------

export function previewInventory(inventory: KeepsakeInventory): string {
  const filled = inventory.entries.filter((e) => e.object.trim())
  if (filled.length === 0) return 'No items yet'
  if (filled.length === 1) return filled[0].object
  if (filled.length === 2) return `${filled[0].object}, ${filled[1].object}`
  return `${filled[0].object}, ${filled[1].object} +${filled.length - 2} more`
}
