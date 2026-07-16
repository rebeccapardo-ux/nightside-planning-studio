// Domain state (readiness checkboxes) — single source of truth lives in
// user_profiles.domain_state JSONB. This module is the only place any consumer
// should touch that column. (Orientation status was removed in the domain-page
// Pass 2 redesign — orientation rows are back-end-only now.)
//
// Reads also perform a one-time, idempotent backfill from legacy locations
// (localStorage checkbox_*, auth.user_metadata.sync_*) so existing users don't
// lose progress when the DB column is empty for them.
//
// Precedence: DB state wins whenever present; localStorage/user_metadata are
// read only to seed an empty DB column, never to override it — they are legacy
// backfill, not peers.
//
// Conflict policy during backfill: prefer `true`. We never make a user's
// progress regress because of a stale local copy.

import type { SupabaseClient } from '@supabase/supabase-js'
import { createSupabaseBrowserClient } from '@/lib/supabase-browser'

export type DomainItemStatus = 'not_started' | 'in_progress' | 'complete'

export type DomainEntryState = {
  checkboxes?: Record<string, boolean[]>
}

export type DomainState = Record<string, DomainEntryState>

// ---------- accessors ---------------------------------------------------

export function getCheckboxes(
  state: DomainState,
  domainId: string,
  itemKey: string,
  length: number,
): boolean[] {
  const arr = state[domainId]?.checkboxes?.[itemKey]
  if (!Array.isArray(arr)) return Array(length).fill(false)
  // Always pad/truncate to the requested length so the UI is stable
  // even if the schema for an item changes.
  const out = Array(length).fill(false)
  for (let i = 0; i < length; i++) out[i] = arr[i] === true
  return out
}

export function computeReadyStatus(vals: boolean[], total: number): DomainItemStatus {
  const checked = vals.filter(Boolean).length
  if (checked === 0) return 'not_started'
  if (checked === total) return 'complete'
  return 'in_progress'
}

// Convenience: infer ready status for an item directly from JSONB without
// the caller needing to know the expected checkbox count. If the item has
// no entries in the JSONB, returns 'not_started'.
export function getReadyStatus(
  state: DomainState,
  domainId: string,
  itemKey: string,
): DomainItemStatus {
  const arr = state[domainId]?.checkboxes?.[itemKey]
  if (!Array.isArray(arr) || arr.length === 0) return 'not_started'
  return computeReadyStatus(arr, arr.length)
}

// ---------- IO ----------------------------------------------------------

async function fetchRaw(supabase: SupabaseClient, userId: string): Promise<DomainState> {
  const { data } = await supabase
    .from('user_profiles')
    .select('domain_state')
    .eq('user_id', userId)
    .maybeSingle()
  return ((data?.domain_state ?? {}) as DomainState) || {}
}

async function writeRaw(
  supabase: SupabaseClient,
  userId: string,
  state: DomainState,
): Promise<void> {
  const { error } = await supabase
    .from('user_profiles')
    .update({ domain_state: state })
    .eq('user_id', userId)
  if (error) console.error('domain_state write failed:', error.message)
}

// ---------- legacy migration --------------------------------------------

// Read every `checkbox_*` / `orient_*` / `ready_*` localStorage key on this
// device and bucket them by domainId/itemKey. Safe to call on any browser.
function readLegacyLocalState(): DomainState {
  const out: DomainState = {}
  if (typeof window === 'undefined' || !window.localStorage) return out
  try {
    for (let i = 0; i < window.localStorage.length; i++) {
      const key = window.localStorage.key(i)
      if (!key) continue
      const raw = window.localStorage.getItem(key)
      if (raw == null) continue

      // checkbox_<domainId>_<itemKey>_<idx>
      const cbMatch = /^checkbox_([^_]+)_(.+)_(\d+)$/.exec(key)
      if (cbMatch) {
        const [, domainId, itemKey, idxStr] = cbMatch
        const idx = parseInt(idxStr, 10)
        const bucket = (out[domainId] ||= {})
        const cb = (bucket.checkboxes ||= {})
        const arr = (cb[itemKey] ||= [])
        // Pad as needed
        while (arr.length <= idx) arr.push(false)
        arr[idx] = raw === 'true'
        continue
      }

      // orient_* (orientation status, removed in Pass 2) and ready_* (always
      // derived) legacy keys are obsolete — ignore.
    }
  } catch {
    // localStorage can throw under quota/private modes — fall through
  }
  return out
}

// Translate the handful of `sync_*` boolean flags on auth.user_metadata
// (the previous selective sync scheme) back into the per-item checkbox
// shape, so backfill picks them up. Returns one entry per (domainId,
// itemKey) it can definitively place; uses a "marker" record that the
// caller merges into the state under whichever domain the page currently
// represents (we don't know the domainId from metadata alone, so this
// returns a domain-agnostic shape keyed by domainTitle.toLowerCase()
// hints, which is the same mapping the legacy seedFromMeta used).
type SyncFlagsByDomainHint = {
  // Each hint key (substring matched against the domain title) maps to a
  // partial DomainEntryState.
  healthcareHint?:  DomainEntryState
  deathcareHint?:   DomainEntryState
}

// NOTE: sync_has_will is intentionally NOT read here. Legal-will status lives in
// domain_state.legal_will_in_place as the single source of truth (written by both
// the Wills area page and the Personal Admin doc). Keeping the legacy OR-merge from
// a frozen user_metadata.sync_has_will would resurrect an unchecked will on reload
// (the merge never loses a `true`). Existing users are reconciled once by
// scripts/reconcile-legal-will.ts. (care/eol still use sync_* pending their own migration.)
function readSyncFlags(meta: Record<string, unknown>): SyncFlagsByDomainHint {
  const out: SyncFlagsByDomainHint = {}

  if (typeof meta.sync_has_care_decision_maker === 'boolean'
   || typeof meta.sync_has_eol_wishes_doc === 'boolean') {
    const cb: Record<string, boolean[]> = {}
    if (typeof meta.sync_has_care_decision_maker === 'boolean') {
      const v = meta.sync_has_care_decision_maker as boolean
      cb.who_will_decide = [v, false, v]   // idx 1 was never synced
    }
    if (typeof meta.sync_has_eol_wishes_doc === 'boolean') {
      const v = meta.sync_has_eol_wishes_doc as boolean
      cb.wishes_clear_shared = [v, v]
    }
    out.healthcareHint = { checkboxes: cb }
  }

  if (typeof meta.sync_has_funeral_wishes === 'boolean'
   || typeof meta.sync_has_organ_donation_wishes === 'boolean') {
    const cb: Record<string, boolean[]> = {}
    const funeral = typeof meta.sync_has_funeral_wishes === 'boolean'      ? meta.sync_has_funeral_wishes as boolean      : false
    const organ   = typeof meta.sync_has_organ_donation_wishes === 'boolean' ? meta.sync_has_organ_donation_wishes as boolean : false
    cb.final_resting_place_wishes = [funeral, false, organ]
    out.deathcareHint = { checkboxes: cb }
  }

  return out
}

// Resolve which domainId(s) each sync_* hint applies to by reading the
// containers table (where domains are stored by title).
async function resolveSyncFlagsToDomainIds(
  supabase: SupabaseClient,
  hints: SyncFlagsByDomainHint,
): Promise<DomainState> {
  const out: DomainState = {}
  const needed: ('healthcareHint' | 'deathcareHint')[] = []
  if (hints.healthcareHint) needed.push('healthcareHint')
  if (hints.deathcareHint)  needed.push('deathcareHint')
  if (needed.length === 0) return out

  const { data: containers } = await supabase
    .from('containers')
    .select('id, title, domain_code')
    .eq('type', 'domain')

  for (const c of containers ?? []) {
    const code = c.domain_code
    if (hints.healthcareHint && code === 'healthcare')    out[c.id] = mergeEntry(out[c.id], hints.healthcareHint)
    if (hints.deathcareHint  && code === 'deathcare')     out[c.id] = mergeEntry(out[c.id], hints.deathcareHint)
  }
  return out
}

// ---------- merge -------------------------------------------------------

// Merge two DomainEntryStates. Conflicts on booleans resolve to `true` — we never
// make a user's checkbox progress regress because of a stale local copy.
function mergeEntry(a: DomainEntryState | undefined, b: DomainEntryState): DomainEntryState {
  const out: DomainEntryState = {
    checkboxes: { ...(a?.checkboxes ?? {}) },
  }
  for (const [k, v] of Object.entries(b.checkboxes ?? {})) {
    const existing = out.checkboxes![k] ?? []
    const len = Math.max(existing.length, v.length)
    const merged = Array(len).fill(false)
    for (let i = 0; i < len; i++) merged[i] = (existing[i] === true) || (v[i] === true)
    out.checkboxes![k] = merged
  }
  return out
}

function mergeState(a: DomainState, b: DomainState): DomainState {
  const out: DomainState = { ...a }
  for (const [domainId, entry] of Object.entries(b)) {
    out[domainId] = mergeEntry(out[domainId], entry)
  }
  return out
}

function deepEqual(a: DomainState, b: DomainState): boolean {
  return JSON.stringify(a) === JSON.stringify(b)
}

// ---------- public API --------------------------------------------------

// DB-only read of a user's domain_state, for server / Node contexts (e.g. the
// Legacy Contact release script) where there is no browser localStorage to
// merge. The user_profiles.domain_state column is the authoritative source of
// truth; loadDomainState()'s localStorage + user_metadata backfill exists only
// to migrate a user's own device and is irrelevant — and unreachable — when
// rendering on a deceased user's behalf. Requires an explicit client (a Node
// caller must pass a service-role client; there is no browser fallback here).
export async function loadDomainStateFromDB(
  supabase: SupabaseClient,
  userId: string,
): Promise<DomainState> {
  return fetchRaw(supabase, userId)
}

// Load the user's domain_state, performing one-time backfill from legacy
// localStorage keys and auth.user_metadata.sync_* flags if needed.
// Idempotent across reloads; safe to call from any consumer.
export async function loadDomainState(supabase?: SupabaseClient): Promise<{
  state: DomainState
  userId: string | null
}> {
  const client = supabase ?? createSupabaseBrowserClient()
  const { data: { user } } = await client.auth.getUser()
  if (!user) return { state: {}, userId: null }

  const jsonb = await fetchRaw(client, user.id)
  const local = readLegacyLocalState()
  const syncHints = readSyncFlags(user.user_metadata ?? {})
  const syncResolved = await resolveSyncFlagsToDomainIds(client, syncHints)

  // Merge order: JSONB wins on conflicts ONLY when both have data for the
  // same item. For booleans, "wins" still means OR-with-true, since any
  // true should never be lost. So effectively we OR everything together.
  let merged: DomainState = mergeState(jsonb, local)
  merged = mergeState(merged, syncResolved)

  // Write back only if something changed, to avoid churning the DB on
  // every page load. Race-safe: monotonic merge.
  if (!deepEqual(jsonb, merged)) {
    await writeRaw(client, user.id, merged)
  }

  return { state: merged, userId: user.id }
}

// Persist a single item's checkbox row. Uses read-modify-write; callers
// should debounce or call sparingly. Returns the new full state.
export async function saveCheckboxes(
  domainId: string,
  itemKey: string,
  vals: boolean[],
  opts?: { supabase?: SupabaseClient; currentState?: DomainState; userId?: string },
): Promise<DomainState | null> {
  const client = opts?.supabase ?? createSupabaseBrowserClient()
  let userId = opts?.userId
  if (!userId) {
    const { data: { user } } = await client.auth.getUser()
    if (!user) return null
    userId = user.id
  }
  const current = opts?.currentState ?? await fetchRaw(client, userId)
  const next: DomainState = {
    ...current,
    [domainId]: {
      ...current[domainId],
      checkboxes: {
        ...(current[domainId]?.checkboxes ?? {}),
        [itemKey]: vals.slice(),
      },
    },
  }
  await writeRaw(client, userId, next)
  return next
}
