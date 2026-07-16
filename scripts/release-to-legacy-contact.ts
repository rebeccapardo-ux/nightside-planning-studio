/**
 * release-to-legacy-contact.ts
 *
 * Post-death release tooling (Phase B). Renders a deceased user's planning
 * materials to a single PDF and records the release in legacy_contact_audit_log.
 * The release is performed manually by an admin after out-of-band verification
 * (see /privacy and /app/help). This script is the recording + rendering step.
 *
 *   Live:     npm run release:legacy-contact
 *   Dry-run:  npm run release:legacy-contact -- --dry-run
 *
 * Dry-run differs from live in exactly three ways (everything else is identical):
 *   1. Output directory      ~/nightside-releases-drafts/  (vs ~/nightside-releases/)
 *   2. PDF render            a "DRAFT" watermark is drawn on every page
 *   3. Audit log INSERT      skipped — the equivalent SQL is printed instead
 *
 * Notes (voice or text) are NEVER included in any export, by platform design.
 *
 * Reconciliations vs the approved design (intent unchanged):
 *   - The file is .ts, which cannot contain JSX, so PlanPDFDocument is created
 *     via React.createElement; the DRAFT watermark is passed inside planProps
 *     (the component's prop shape), not as a sibling prop.
 *   - @react-pdf/renderer's .toBuffer() resolves to a stream; it is collected
 *     into a Buffer before hashing/writing.
 *   - containers are per-user, so the domain query is scoped by user_id (the
 *     service-role client bypasses RLS).
 *   - The user's display name comes from auth.users user_metadata (user_profiles
 *     holds no name fields), matching the in-app plan export.
 *   - The design references a logo URL the script "must supply" but defines no
 *     source for it; this reads RELEASE_LOGO_URL if set and otherwise renders
 *     without a logo (resolveLogoUrl handles the null gracefully).
 */

import prompts from 'prompts'
import { ACTIVITY, DOCUMENT_TYPE_META, DOCUMENT_TYPE } from '@/lib/content-metadata'
import { createClient, type SupabaseClient, type User } from '@supabase/supabase-js'
import { createHash, randomUUID } from 'node:crypto'
import { promises as fs, existsSync } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import React from 'react'
import { pdf } from '@react-pdf/renderer'
import PlanPDFDocument, { type PlanPDFProps } from '@/lib/pdf/PlanPDFDocument'
import {
  buildMaterials,
  buildKeyDetails,
  buildDomainStatuses,
  willInPlaceFromState,
  type EntryRow,
  type DomainContainer,
} from '@/lib/pdf/buildPlanData'
import { loadDomainStateFromDB } from '@/lib/domain-state'
import { fetchUserTasksFromDB } from '@/lib/user-tasks'

// ───────────────────────────────────────────────────────────────────────────
// Types
// ───────────────────────────────────────────────────────────────────────────

type ReleasePrefs = {
  include_care_wishes: boolean
  include_legacy_map: boolean
  include_values_ranking: boolean
  include_fears_ranking: boolean
}

type LegacyContactRow = {
  id: string
  user_id: string
  contact_type: 'primary' | 'secondary'
  first_name: string
  last_name: string
  email: string
  relationship: string
  personal_message: string | null
  designated_at: string
  updated_at: string
}

type ReleasedItem = {
  kind: 'document' | 'activity'
  type: string
  entry_id: string
  title: string
}

type ReleaseDescriptor = {
  title: string // must match the title buildMaterials assigns
  kind: 'document' | 'activity'
  field: 'document_type' | 'activity'
  value: string
  pref?: keyof ReleasePrefs // undefined => always included (the default 6)
}

// The default release set (6 documents) plus the four opt-in extras. Order here
// is only used for the "will include" listing; the PDF order is buildMaterials'.
const RELEASE_SET: ReleaseDescriptor[] = [
  { title: DOCUMENT_TYPE_META.funeral_wishes.label, kind: 'document', field: 'document_type', value: DOCUMENT_TYPE.FUNERAL_WISHES },
  { title: DOCUMENT_TYPE_META.important_contacts.label,                      kind: 'document', field: 'document_type', value: DOCUMENT_TYPE.IMPORTANT_CONTACTS },
  { title: DOCUMENT_TYPE_META.financial_information.label,                   kind: 'document', field: 'document_type', value: DOCUMENT_TYPE.FINANCIAL_INFORMATION },
  { title: DOCUMENT_TYPE_META.personal_admin_info.label,              kind: 'document', field: 'document_type', value: DOCUMENT_TYPE.PERSONAL_ADMIN_INFO },
  { title: DOCUMENT_TYPE_META.devices_and_accounts.label,                      kind: 'document', field: 'document_type', value: DOCUMENT_TYPE.DEVICES_AND_ACCOUNTS },
  { title: DOCUMENT_TYPE_META.keepsake_inventory.label,                     kind: 'document', field: 'document_type', value: DOCUMENT_TYPE.KEEPSAKE_INVENTORY },
  { title: DOCUMENT_TYPE_META.advance_directive_supplement.label, kind: 'document', field: 'document_type', value: DOCUMENT_TYPE.ADVANCE_DIRECTIVE_SUPPLEMENT, pref: 'include_care_wishes' },
  { title: 'Legacy Map',     kind: 'activity', field: 'activity',      value: ACTIVITY.LEGACY_MAP,                   pref: 'include_legacy_map' },
  { title: 'Values Ranking', kind: 'activity', field: 'activity',      value: ACTIVITY.VALUES_RANKING,               pref: 'include_values_ranking' },
  { title: 'Fears Ranking',  kind: 'activity', field: 'activity',      value: ACTIVITY.FEARS_RANKING,                pref: 'include_fears_ranking' },
]

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// ───────────────────────────────────────────────────────────────────────────
// Small helpers
// ───────────────────────────────────────────────────────────────────────────

function fail(message: string): never {
  console.error(`\n✗ ${message}\n`)
  process.exit(1)
}

function abort(message: string): never {
  console.log(`\n⊘ ${message}\n`)
  process.exit(0)
}

function slugify(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'user'
}

async function ask(message: string, initial?: string): Promise<string> {
  const { value } = await prompts({ type: 'text', name: 'value', message, initial })
  if (value === undefined) abort('Aborted at prompt.')
  return String(value).trim()
}

async function confirm(message: string): Promise<boolean> {
  const { value } = await prompts({ type: 'confirm', name: 'value', message, initial: false })
  return value === true
}

function displayName(user: User): string {
  const meta = (user.user_metadata ?? {}) as Record<string, unknown>
  const first = (meta.first_name as string | undefined)?.trim() ?? ''
  const last = (meta.last_name as string | undefined)?.trim() ?? ''
  return [first, last].filter(Boolean).join(' ')
    || (meta.full_name as string | undefined)?.trim()
    || user.email
    || ''
}

// Refuse to write output anywhere inside a git working tree.
function isInsideGitRepo(targetDir: string): boolean {
  let dir = path.resolve(targetDir)
  // walk up; the target may not exist yet, so resolve against ancestors
  while (true) {
    if (existsSync(path.join(dir, '.git'))) return true
    const parent = path.dirname(dir)
    if (parent === dir) return false
    dir = parent
  }
}

async function findUserByEmail(admin: SupabaseClient, email: string): Promise<User | null> {
  const perPage = 200
  for (let page = 1; ; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage })
    if (error) fail(`auth.admin.listUsers failed: ${error.message}`)
    const found = data.users.find(u => u.email?.toLowerCase() === email.toLowerCase())
    if (found) return found
    if (data.users.length < perPage) return null
  }
}

// Build a readable INSERT statement for the audit row, for dry-run display and
// for manual recovery if a live INSERT fails after the artifact was prepared.
function auditInsertSQL(row: Record<string, unknown>): string {
  const cols = Object.keys(row)
  const lit = (v: unknown): string => {
    if (v === null || v === undefined) return 'NULL'
    if (typeof v === 'number') return String(v)
    if (typeof v === 'object') return `'${JSON.stringify(v).replace(/'/g, "''")}'::jsonb`
    return `'${String(v).replace(/'/g, "''")}'`
  }
  return (
    `INSERT INTO public.legacy_contact_audit_log\n  (${cols.join(', ')})\nVALUES\n  (${cols.map(c => lit(row[c])).join(', ')});`
  )
}

// ───────────────────────────────────────────────────────────────────────────
// Main
// ───────────────────────────────────────────────────────────────────────────

async function main() {
  // ── 1. Parse --dry-run ────────────────────────────────────────────────────
  const isDryRun = process.argv.includes('--dry-run')
  console.log(`\n=== Legacy Contact release ${isDryRun ? '(DRY-RUN — no audit log write)' : '(LIVE)'} ===\n`)

  // ── 2. Load env ───────────────────────────────────────────────────────────
  const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
  const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
  const ENV_ADMIN_NAME = process.env.RELEASE_ADMIN_NAME?.trim() || ''
  const LOGO_URL = process.env.RELEASE_LOGO_URL?.trim() || undefined
  if (!SUPABASE_URL || !SERVICE_KEY) {
    fail('Missing NEXT_PUBLIC_SUPABASE_URL and/or SUPABASE_SERVICE_ROLE_KEY (load via --env-file=.env.local).')
  }

  // ── 3. Admin (service-role) client — no session, bypasses RLS ─────────────
  const admin = createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  // ── 4. Prompt user email OR user_id ───────────────────────────────────────
  const identifier = await ask('Deceased user email or user_id:')
  if (!identifier) fail('No user identifier provided.')

  // ── 5. Resolve to auth user + profile; print summary; confirm ─────────────
  let user: User | null = null
  if (UUID_RE.test(identifier)) {
    const { data, error } = await admin.auth.admin.getUserById(identifier)
    if (error || !data.user) {
      fail('No auth user for that id. If the account was deleted, its data is gone via FK CASCADE — nothing to release (by design).')
    }
    user = data.user
  } else {
    user = await findUserByEmail(admin, identifier)
    if (!user) {
      fail('No auth user for that email. If the account was deleted, its data is gone via FK CASCADE — nothing to release (by design).')
    }
  }
  const userId = user.id
  const name = displayName(user)

  const { data: profile } = await admin
    .from('user_profiles')
    .select('terms_accepted_at, created_at')
    .eq('user_id', userId)
    .maybeSingle()

  console.log('User:')
  console.log(`  id:            ${userId}`)
  console.log(`  email:         ${user.email}`)
  console.log(`  name:          ${name || '(none on record)'}`)
  console.log(`  account since: ${profile?.created_at ?? '(no profile row)'}`)
  console.log('')
  if (!(await confirm('Is this the correct user?'))) abort('Aborted: user not confirmed.')

  // ── 6. Prior-release check ────────────────────────────────────────────────
  const { data: priorReleases, error: priorErr } = await admin
    .from('legacy_contact_audit_log')
    .select('id, created_at, released_to_contact_id, released_by')
    .eq('user_id', userId)
    .eq('action', 'released')
    .order('created_at', { ascending: false })
  if (priorErr) fail(`Could not check prior releases: ${priorErr.message}`)
  if (priorReleases && priorReleases.length > 0) {
    console.log(`\n⚠ This user already has ${priorReleases.length} prior release record(s):`)
    for (const r of priorReleases) console.log(`  - ${r.created_at}  by ${r.released_by ?? '?'}  (audit id ${r.id})`)
    if (!(await confirm('A release has already been recorded for this user. Proceed anyway?'))) {
      abort('Aborted: prior release exists.')
    }
  }

  // ── 7. Fetch legacy_contacts; abort if none; choose recipient ─────────────
  const { data: lcData, error: lcErr } = await admin
    .from('legacy_contacts')
    .select('*')
    .eq('user_id', userId)
    .order('contact_type')
  if (lcErr) fail(`Could not fetch legacy contacts: ${lcErr.message}`)
  const lcRows = (lcData ?? []) as LegacyContactRow[]
  if (lcRows.length === 0) {
    fail('User has no designated Legacy Contact. The release process requires one by design — aborting.')
  }
  console.log('\nDesignated Legacy Contact(s):')
  for (const r of lcRows) {
    console.log(`  [${r.contact_type}] ${r.first_name} ${r.last_name} <${r.email}> — ${r.relationship} (updated ${r.updated_at})`)
  }
  const { value: chosen } = await prompts({
    type: 'select',
    name: 'value',
    message: 'Release to which contact?',
    choices: lcRows.map(r => ({ title: `${r.contact_type}: ${r.first_name} ${r.last_name} <${r.email}>`, value: r })),
  })
  if (!chosen) abort('Aborted: no contact selected.')
  const contact = chosen as LegacyContactRow

  // ── 8. 7-day waiting-period check ─────────────────────────────────────────
  const mostRecentChange = Math.max(...lcRows.map(r => new Date(r.updated_at).getTime()))
  const daysSinceChange = (Date.now() - mostRecentChange) / 86_400_000
  if (daysSinceChange < 7) {
    const daysAgo = Math.floor(daysSinceChange)
    const waitDays = Math.max(1, Math.ceil(7 - daysSinceChange))
    const warn = () => {
      console.log(
        `\nWARNING: The deceased user's legacy_contacts was last modified ${daysAgo} day(s) ago.\n` +
        `Per the runbook's 7-day waiting period rule, releases requested within 7 days of the most\n` +
        `recent change default to a 7-day wait. Override is permitted only when documentation is\n` +
        `strong AND no duress is suspected. Confirm you intend to proceed.`,
      )
    }
    warn()
    for (;;) {
      const decision = await ask(`Type 'override' to proceed despite recent change, or 'wait' to abort and come back in ${waitDays} day(s):`)
      if (decision === 'override') break
      if (decision === 'wait') abort(`Aborted: honoring the 7-day waiting period. Come back in ${waitDays} day(s).`)
      warn()
    }
  }

  // ── 9. Fetch data + preferences; compute the release manifest ─────────────
  const { data: prefRow, error: prefErr } = await admin
    .from('user_release_preferences')
    .select('include_care_wishes, include_legacy_map, include_values_ranking, include_fears_ranking')
    .eq('user_id', userId)
    .maybeSingle()
  if (prefErr) console.log(`\n⚠ Could not read user_release_preferences (${prefErr.message}); treating all opt-ins as false.`)
  const prefs: ReleasePrefs = {
    include_care_wishes: prefRow?.include_care_wishes ?? false,
    include_legacy_map: prefRow?.include_legacy_map ?? false,
    include_values_ranking: prefRow?.include_values_ranking ?? false,
    include_fears_ranking: prefRow?.include_fears_ranking ?? false,
  }

  const { data: entriesData, error: entriesErr } = await admin
    .from('entries')
    .select('id, title, content, created_at, activity, document_type')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
  if (entriesErr) fail(`Could not fetch entries: ${entriesErr.message}`)
  const allEntries = (entriesData ?? []) as EntryRow[]

  const { data: domainData, error: domainErr } = await admin
    .from('containers')
    .select('id, title, domain_code')
    .eq('type', 'domain')
    .eq('user_id', userId)
  if (domainErr) fail(`Could not fetch domain containers: ${domainErr.message}`)
  const domains = (domainData ?? []) as DomainContainer[]

  const domainState = await loadDomainStateFromDB(admin, userId)
  const userTasks = await fetchUserTasksFromDB(admin, userId)

  // Active descriptors: the default 6 always, opt-ins per preference.
  const activeDescriptors = RELEASE_SET.filter(d => !d.pref || prefs[d.pref])
  // Entries that exist for an active descriptor (gating on content happens in
  // buildMaterials, exactly as in-app).
  const allowedEntries = allEntries.filter(e =>
    activeDescriptors.some(d => (e as Record<string, unknown>)[d.field] === d.value),
  )

  // Activity reflections live in notes (origin_type='reflection'), linked via entry_notes —
  // NOT in entries.content. Build the entryId->text map buildMaterials expects so the released
  // PDF renders reflections (mirrors the in-app full-plan export). Service-role admin client.
  const reflectionEntryIds = allowedEntries.map(e => e.id)
  const reflectionByEntryId: Record<string, string> = {}
  if (reflectionEntryIds.length > 0) {
    const { data: links } = await admin.from('entry_notes').select('entry_id, note_id').in('entry_id', reflectionEntryIds)
    const noteIds = (links ?? []).map(l => l.note_id as string)
    if (noteIds.length > 0) {
      const { data: refNotes } = await admin.from('notes').select('id, content').in('id', noteIds).eq('origin_type', 'reflection')
      const byId = new Map((refNotes ?? []).map(n => [n.id as string, n.content as string]))
      for (const l of links ?? []) { const t = byId.get(l.note_id as string); if (t) reflectionByEntryId[l.entry_id as string] = t }
    }
  }

  // Legal-will status for the Personal Admin doc comes from domain_state (single
  // source of truth), not entries.content — same as the in-app export.
  const materials = buildMaterials(allowedEntries, name, reflectionByEntryId, willInPlaceFromState(domainState, domains))
  // released_items mirrors exactly what buildMaterials rendered.
  const releasedItems: ReleasedItem[] = materials.map(m => {
    const d = RELEASE_SET.find(x => x.title === m.title)!
    const entry = allowedEntries.find(e => (e as Record<string, unknown>)[d.field] === d.value)!
    return { kind: d.kind, type: d.value, entry_id: entry.id, title: m.title }
  })

  console.log('\nRelease preferences:')
  console.log(`  include_care_wishes:    ${prefs.include_care_wishes}`)
  console.log(`  include_legacy_map:     ${prefs.include_legacy_map}`)
  console.log(`  include_values_ranking: ${prefs.include_values_ranking}`)
  console.log(`  include_fears_ranking:  ${prefs.include_fears_ranking}`)
  console.log('\nDefault document set (always considered): funeral_wishes, important_contacts,')
  console.log('  financial_information, personal_admin_info, devices_and_accounts, keepsake_inventory')
  console.log(`\nWill include ${releasedItems.length} item(s):`)
  for (const it of releasedItems) console.log(`  - [${it.kind}] ${it.title} (${it.type}, entry ${it.entry_id})`)
  if (releasedItems.length === 0) {
    if (!(await confirm('No materials qualified for release. Generate an empty (summary-only) artifact anyway?'))) {
      abort('Aborted: nothing to release.')
    }
  }

  // ── 10. Verification metadata prompts ─────────────────────────────────────
  let receivedAtISO = ''
  for (;;) {
    const raw = await ask('When did the Legacy Contact contact you? (ISO timestamp or natural date)')
    const d = new Date(raw)
    if (!Number.isNaN(d.getTime())) { receivedAtISO = d.toISOString(); break }
    console.log('  Could not parse that as a date — try again (e.g. 2026-05-20 or "May 20 2026").')
  }
  const documentationRef = await ask('What death documentation did they provide?')
  const releasedBy = await ask('Your name as the admin executing this release:', ENV_ADMIN_NAME)
  const notes = await ask('Optional notes (blank ok):')

  // ── 11. Final confirmation gate (literal word "release") ──────────────────
  console.log('\n──────── Release summary ────────')
  console.log(`  mode:            ${isDryRun ? 'DRY-RUN' : 'LIVE'}`)
  console.log(`  user:            ${name} <${user.email}> (${userId})`)
  console.log(`  to contact:      [${contact.contact_type}] ${contact.first_name} ${contact.last_name} <${contact.email}>`)
  console.log(`  items:           ${releasedItems.length}`)
  console.log(`  received at:     ${receivedAtISO}`)
  console.log(`  documentation:   ${documentationRef}`)
  console.log(`  released by:     ${releasedBy}`)
  console.log(`  notes:           ${notes || '(none)'}`)
  console.log('─────────────────────────────────')
  const word = await ask("Type 'release' to confirm, anything else to abort:")
  if (word !== 'release') abort('Aborted: confirmation word not matched.')

  // ── 12. (data already fetched in step 9; notes never included) ────────────
  // ── 13. Render the PDF to an in-memory buffer ─────────────────────────────
  const planProps: PlanPDFProps = {
    userName: name,
    exportDate: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
    keyDetails: buildKeyDetails(domainState, domains, allEntries),
    domainStatuses: buildDomainStatuses(domainState, domains, userTasks),
    materials,
    mode: 'full',
    logoUrl: LOGO_URL,
    watermark: isDryRun ? 'DRAFT' : undefined,
  }
  let buffer: Buffer
  try {
    // .ts can't hold JSX, so create the element directly and cast to pdf()'s
    // own parameter type — createElement's precise element type is otherwise
    // rejected (the in-app JSX form widens to the same shape).
    const element = React.createElement(PlanPDFDocument, { planProps }) as unknown as Parameters<typeof pdf>[0]
    const stream = await pdf(element).toBuffer()
    const chunks: Buffer[] = []
    for await (const c of stream as AsyncIterable<Buffer>) chunks.push(Buffer.from(c))
    buffer = Buffer.concat(chunks)
  } catch (e) {
    fail(`PDF render failed (no file written, no DB write): ${(e as Error).message}`)
  }

  // ── 14. SHA-256 of the artifact ───────────────────────────────────────────
  const artifactHash = createHash('sha256').update(buffer).digest('hex')

  // ── 15. Determine output dir; safety checks; write to a temp file first ───
  const slug = slugify(user.email ?? name ?? userId)
  const stamp = new Date().toISOString().replace(/[:.]/g, '-')
  const baseDir = isDryRun ? 'nightside-releases-drafts' : 'nightside-releases'
  const outDir = path.join(os.homedir(), baseDir, `${slug}-${stamp}`)

  if (isInsideGitRepo(outDir)) {
    fail(`Refusing to write into a git working tree: ${outDir}`)
  }
  if (existsSync(outDir) && (await fs.readdir(outDir)).length > 0) {
    fail(`Output directory already exists and is non-empty: ${outDir}`)
  }

  const pdfFilename = `${slug}-release-${stamp}.pdf`
  const tmpFile = path.join(os.tmpdir(), `release-${randomUUID()}.pdf`)
  await fs.writeFile(tmpFile, buffer)

  // ── 16. Audit log INSERT (live) or printed SQL (dry-run) ──────────────────
  const auditRow: Record<string, unknown> = {
    user_id: userId,
    action: 'released',
    contact_type: contact.contact_type,
    previous_data: null,
    new_data: contact,
    released_to_contact_id: contact.id,
    released_items: releasedItems,
    released_by: releasedBy,
    verification_documentation_ref: documentationRef,
    release_request_received_at: receivedAtISO,
    release_artifact_hash: artifactHash,
    notes: notes || null,
  }

  let auditLogRowId: string | null = null
  if (isDryRun) {
    console.log('\n[dry-run] Audit log INSERT skipped. Equivalent SQL:\n')
    console.log(auditInsertSQL(auditRow))
  } else {
    const { data: inserted, error: insErr } = await admin
      .from('legacy_contact_audit_log')
      .insert(auditRow)
      .select('id')
      .single()
    if (insErr || !inserted) {
      await fs.rm(tmpFile, { force: true })
      console.error('\n✗ Audit log INSERT failed — NO artifact written. Prepared SQL for manual recovery:\n')
      console.error(auditInsertSQL(auditRow))
      fail(`Audit log INSERT error: ${insErr?.message ?? 'no row returned'}`)
    }
    auditLogRowId = inserted.id
    console.log(`\n✓ Audit log row inserted: ${auditLogRowId}`)
  }

  // ── 17. Atomic rename temp → final; write sidecars; print summary ─────────
  await fs.mkdir(outDir, { recursive: true })
  const finalPdfPath = path.join(outDir, pdfFilename)
  await fs.rename(tmpFile, finalPdfPath)

  const manifest = {
    mode: isDryRun ? 'dry-run' : 'live',
    generated_at: new Date().toISOString(),
    user: { id: userId, email: user.email, name },
    contact: { id: contact.id, type: contact.contact_type, name: `${contact.first_name} ${contact.last_name}`, email: contact.email },
    released_items: releasedItems,
    release_artifact: { filename: pdfFilename, sha256: artifactHash, bytes: buffer.length },
    verification: { received_at: receivedAtISO, documentation_ref: documentationRef, released_by: releasedBy, notes: notes || null },
    audit_log_row_id: auditLogRowId,
  }
  await fs.writeFile(path.join(outDir, 'release-manifest.json'), JSON.stringify(manifest, null, 2))
  await fs.writeFile(
    path.join(outDir, 'README.txt'),
    [
      `Nightside Legacy Contact release ${isDryRun ? '(DRAFT — dry-run)' : '(LIVE)'}`,
      ``,
      `User:        ${name} <${user.email}> (${userId})`,
      `To contact:  [${contact.contact_type}] ${contact.first_name} ${contact.last_name} <${contact.email}>`,
      `Generated:   ${manifest.generated_at}`,
      `Artifact:    ${pdfFilename}`,
      `SHA-256:     ${artifactHash}`,
      `Audit row:   ${auditLogRowId ?? '(dry-run — not written)'}`,
      ``,
      `Items released (${releasedItems.length}):`,
      ...releasedItems.map(it => `  - ${it.title} [${it.kind}/${it.type}]`),
      ``,
      isDryRun
        ? `This is a DRY-RUN draft. No audit log row was written. The PDF carries a`
          + `\nDRAFT watermark. Do not deliver this artifact.`
        : `This is a LIVE release artifact. The release is recorded in`
          + `\nlegacy_contact_audit_log (row ${auditLogRowId}).`,
      ``,
    ].join('\n'),
  )

  console.log('\n✓ Done.')
  console.log(`  PDF:       ${finalPdfPath}`)
  console.log(`  Manifest:  ${path.join(outDir, 'release-manifest.json')}`)
  console.log(`  SHA-256:   ${artifactHash}`)
  console.log(`  Audit row: ${auditLogRowId ?? 'skipped — dry-run'}`)
  console.log('')
}

main().catch(e => {
  console.error('\n✗ Unexpected error:', e)
  process.exit(1)
})
