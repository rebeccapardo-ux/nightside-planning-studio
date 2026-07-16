/**
 * reconcile-mirrored-doc-fields.ts
 *
 * One-time reconciliation for the doc-mirrored-field single-source-of-truth migration
 * (legal will + substitute decision-maker).
 *
 * These facts now live ONLY in domain_state (written by both the area page and the
 * Personal Admin doc):
 *   - Legal will → wills_estates  legal_will_in_place[0]
 *   - SDM        → healthcare     who_will_decide[2]   ("formally documented")
 *
 * Before this change each could also live in entries.content (hasWill /
 * hasCareDecisionMaker) and user_metadata (sync_has_will / sync_has_care_decision_maker),
 * which could disagree. This sets the domain_state checkbox TRUE for every user where ANY
 * source is true (prefer-true: never lose a recorded fact). Users with no "true" anywhere
 * are left untouched; it never downgrades a true to false. who_will_decide indices 0/1 are
 * preserved (only index 2 is touched).
 *
 * Run this BEFORE (or right after) deploying the code that retires the legacy sources.
 *
 *   Dry-run (default): npm run reconcile:mirrored-fields
 *   Apply:             npm run reconcile:mirrored-fields -- --apply
 *
 * Idempotent: re-running after a successful apply is a no-op.
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import {
  getCheckboxes,
  saveCheckboxes,
  loadDomainStateFromDB,
  type DomainState,
} from '@/lib/domain-state'
import { DOCUMENT_TYPE } from '@/lib/content-metadata'

function fail(msg: string): never {
  console.error(`\n✖ ${msg}\n`)
  process.exit(1)
}

async function main() {
  const isApply = process.argv.includes('--apply')
  console.log(`\n=== Mirrored-doc-field reconciliation ${isApply ? '(APPLY — writes domain_state)' : '(DRY-RUN — no writes)'} ===\n`)

  const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
  const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!SUPABASE_URL || !SERVICE_KEY) {
    fail('Missing NEXT_PUBLIC_SUPABASE_URL and/or SUPABASE_SERVICE_ROLE_KEY (load via --env-file=.env.local).')
  }

  const admin: SupabaseClient = createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  // Per-user container ids for the two mirrored domains.
  const { data: containers, error: contErr } = await admin
    .from('containers')
    .select('id, user_id, domain_code')
    .in('domain_code', ['wills_estates', 'healthcare'])
  if (contErr) fail(`containers query failed: ${contErr.message}`)
  const willsIdByUser = new Map<string, string>()
  const healthcareIdByUser = new Map<string, string>()
  for (const c of containers ?? []) {
    if (c.domain_code === 'wills_estates') willsIdByUser.set(c.user_id as string, c.id as string)
    if (c.domain_code === 'healthcare') healthcareIdByUser.set(c.user_id as string, c.id as string)
  }

  // Personal Admin entries carry legacy entries.content.hasWill / hasCareDecisionMaker.
  const { data: adminEntries, error: entErr } = await admin
    .from('entries')
    .select('user_id, content')
    .eq('document_type', DOCUMENT_TYPE.PERSONAL_ADMIN_INFO)
  if (entErr) fail(`entries query failed: ${entErr.message}`)
  const contentWillByUser = new Map<string, boolean>()
  const contentCdmByUser = new Map<string, boolean>()
  for (const e of adminEntries ?? []) {
    const c = (e.content && typeof e.content === 'object' ? e.content : {}) as Record<string, unknown>
    if (c.hasWill === true) contentWillByUser.set(e.user_id as string, true)
    if (c.hasCareDecisionMaker === true) contentCdmByUser.set(e.user_id as string, true)
  }

  let scanned = 0, willBackfilled = 0, sdmBackfilled = 0, untouched = 0, skippedNoContainer = 0

  const perPage = 200
  for (let page = 1; ; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage })
    if (error) fail(`auth.admin.listUsers failed: ${error.message}`)

    for (const user of data.users) {
      scanned++
      let curState: DomainState = await loadDomainStateFromDB(admin, user.id)
      let changed = false
      const label = user.email ?? user.id

      // --- Legal will: wills_estates legal_will_in_place[0] ---
      const willsId = willsIdByUser.get(user.id)
      const currentWill = willsId ? getCheckboxes(curState, willsId, 'legal_will_in_place', 1)[0] === true : false
      const willResolved = currentWill || contentWillByUser.get(user.id) === true || user.user_metadata?.sync_has_will === true
      if (willResolved && !currentWill) {
        if (!willsId) { skippedNoContainer++; console.log(`  ⚠ ${label}: legacy will flag but NO wills_estates container — skipped`) }
        else {
          console.log(`  → ${label}: legal_will_in_place = true`)
          if (isApply) { const next = await saveCheckboxes(willsId, 'legal_will_in_place', [true], { supabase: admin, userId: user.id, currentState: curState }); if (next) curState = next }
          willBackfilled++; changed = true
        }
      }

      // --- SDM: healthcare who_will_decide[2] (preserve indices 0/1) ---
      const healthcareId = healthcareIdByUser.get(user.id)
      const currentSdm = healthcareId ? getCheckboxes(curState, healthcareId, 'who_will_decide', 3)[2] === true : false
      const sdmResolved = currentSdm || contentCdmByUser.get(user.id) === true || user.user_metadata?.sync_has_care_decision_maker === true
      if (sdmResolved && !currentSdm) {
        if (!healthcareId) { skippedNoContainer++; console.log(`  ⚠ ${label}: legacy SDM flag but NO healthcare container — skipped`) }
        else {
          console.log(`  → ${label}: who_will_decide[2] = true`)
          if (isApply) {
            const arr = getCheckboxes(curState, healthcareId, 'who_will_decide', 3)
            arr[2] = true
            const next = await saveCheckboxes(healthcareId, 'who_will_decide', arr, { supabase: admin, userId: user.id, currentState: curState })
            if (next) curState = next
          }
          sdmBackfilled++; changed = true
        }
      }

      if (!changed) untouched++
    }

    if (data.users.length < perPage) break
  }

  console.log(`\n--- Summary ---`)
  console.log(`  Users scanned:                 ${scanned}`)
  console.log(`  ${isApply ? 'Will backfilled' : 'Will would backfill'}:            ${willBackfilled}`)
  console.log(`  ${isApply ? 'SDM backfilled' : 'SDM would backfill'}:             ${sdmBackfilled}`)
  console.log(`  Untouched (already set / none):${untouched}`)
  console.log(`  Legacy flag, no container:     ${skippedNoContainer}`)
  console.log(isApply ? '\n✓ Reconciliation applied.\n' : '\nDry-run only. Re-run with --apply to write.\n')
}

main().catch((e) => fail(e instanceof Error ? e.message : String(e)))
