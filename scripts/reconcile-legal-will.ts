/**
 * reconcile-legal-will.ts
 *
 * One-time reconciliation for the legal-will single-source-of-truth migration.
 *
 * Legal-will status now lives ONLY in domain_state.legal_will_in_place (written by
 * both the Wills area page and the Personal Admin doc). Before this change the fact
 * could live in three places, which could disagree:
 *   1. domain_state.legal_will_in_place   (Wills area page checkbox)
 *   2. entries.content.hasWill            (Personal Admin doc, now retired)
 *   3. auth.users user_metadata.sync_has_will (legacy sync bridge, now retired)
 *
 * This script sets domain_state.legal_will_in_place = TRUE for every user where ANY
 * of the three sources is true (prefer-true: never lose a recorded will). Users with
 * no "true" anywhere are left untouched. It never downgrades a true to false.
 *
 * Run this BEFORE (or right after) deploying the code that retires sources 2 & 3, so
 * no user's recorded will is dropped in the transition.
 *
 *   Dry-run (default): npm run reconcile:legal-will
 *   Apply:             npm run reconcile:legal-will -- --apply
 *
 * Idempotent: re-running after a successful apply is a no-op (all trues already set).
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import {
  getCheckboxes,
  saveCheckboxes,
  loadDomainStateFromDB,
} from '@/lib/domain-state'
import { DOCUMENT_TYPE } from '@/lib/content-metadata'

const WILL_ITEM_KEY = 'legal_will_in_place'
const WILLS_DOMAIN_CODE = 'wills_estates'

function fail(msg: string): never {
  console.error(`\n✖ ${msg}\n`)
  process.exit(1)
}

async function main() {
  const isApply = process.argv.includes('--apply')
  console.log(`\n=== Legal-will reconciliation ${isApply ? '(APPLY — writes domain_state)' : '(DRY-RUN — no writes)'} ===\n`)

  const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
  const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!SUPABASE_URL || !SERVICE_KEY) {
    fail('Missing NEXT_PUBLIC_SUPABASE_URL and/or SUPABASE_SERVICE_ROLE_KEY (load via --env-file=.env.local).')
  }

  const admin: SupabaseClient = createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  // Pull the Wills container per user once (id -> user_id and user_id -> id).
  const { data: willsContainers, error: contErr } = await admin
    .from('containers')
    .select('id, user_id')
    .eq('domain_code', WILLS_DOMAIN_CODE)
  if (contErr) fail(`containers query failed: ${contErr.message}`)
  const willsIdByUser = new Map<string, string>()
  for (const c of willsContainers ?? []) willsIdByUser.set(c.user_id as string, c.id as string)

  // Personal Admin entries carry the legacy entries.content.hasWill.
  const { data: adminEntries, error: entErr } = await admin
    .from('entries')
    .select('user_id, content')
    .eq('document_type', DOCUMENT_TYPE.PERSONAL_ADMIN_INFO)
  if (entErr) fail(`entries query failed: ${entErr.message}`)
  const contentHasWillByUser = new Map<string, boolean>()
  for (const e of adminEntries ?? []) {
    const c = (e.content && typeof e.content === 'object' ? e.content : {}) as Record<string, unknown>
    if (c.hasWill === true) contentHasWillByUser.set(e.user_id as string, true)
  }

  let scanned = 0
  let alreadyTrue = 0
  let backfilled = 0
  let noWill = 0
  let skippedNoContainer = 0

  const perPage = 200
  for (let page = 1; ; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage })
    if (error) fail(`auth.admin.listUsers failed: ${error.message}`)

    for (const user of data.users) {
      scanned++
      const willsId = willsIdByUser.get(user.id)
      const state = await loadDomainStateFromDB(admin, user.id)
      const currentWill = willsId
        ? getCheckboxes(state, willsId, WILL_ITEM_KEY, 1)[0] === true
        : false
      const contentWill = contentHasWillByUser.get(user.id) === true
      const metaWill = user.user_metadata?.sync_has_will === true
      const resolved = currentWill || contentWill || metaWill

      if (!resolved) { noWill++; continue }
      if (currentWill) { alreadyTrue++; continue }

      // resolved from a legacy source but domain_state doesn't have it yet.
      if (!willsId) {
        skippedNoContainer++
        console.log(`  ⚠ ${user.email ?? user.id}: has legacy will flag but NO wills_estates container — skipped (will seed on next visit)`)
        continue
      }
      const sources = [contentWill && 'entries.content.hasWill', metaWill && 'sync_has_will'].filter(Boolean).join(', ')
      console.log(`  → ${user.email ?? user.id}: backfill legal_will_in_place = true (from ${sources})`)
      if (isApply) {
        const next = await saveCheckboxes(willsId, WILL_ITEM_KEY, [true], { supabase: admin, userId: user.id, currentState: state })
        if (!next) fail(`saveCheckboxes returned null for ${user.id}`)
      }
      backfilled++
    }

    if (data.users.length < perPage) break
  }

  console.log(`\n--- Summary ---`)
  console.log(`  Users scanned:                 ${scanned}`)
  console.log(`  Already true in domain_state:  ${alreadyTrue}`)
  console.log(`  ${isApply ? 'Backfilled to true' : 'Would backfill to true'}:        ${backfilled}`)
  console.log(`  No will anywhere (untouched):  ${noWill}`)
  console.log(`  Legacy flag, no container:     ${skippedNoContainer}`)
  console.log(isApply ? '\n✓ Reconciliation applied.\n' : '\nDry-run only. Re-run with --apply to write.\n')
}

main().catch((e) => fail(e instanceof Error ? e.message : String(e)))
