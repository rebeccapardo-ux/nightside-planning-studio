# Nightside Planning Studio — working notes for Claude Code

Pre-launch end-of-life planning app. Next.js 16 (App Router) · React 19 · TypeScript · Supabase (Postgres + RLS) · `@react-pdf/renderer`. These notes capture the load-bearing, non-obvious conventions — read them before refactoring data, labels, or domain structure.

---

## Controlled vocabularies — single sources of truth

Three controlled vocabularies, each defined once. Reference these constants; do not hardcode the string literals.

- **Activities** (`entries.activity`) — `ACTIVITY`, `ActivityId`, `STRUCTURED_ACTIVITIES`, `isStructuredActivity()`, `isRankingActivity()` in `lib/content-metadata.ts`. Also `ACTIVITY_META` (per-activity metadata).
- **Document types** (`entries.document_type`) — `DOCUMENT_TYPE`, `DocumentType`, `DOCUMENT_TYPE_META` (code / label / shortLabel / href / category), `DOCUMENT_TYPES`, `isCaptureDocument()`, `documentTypeMeta()` in `lib/content-metadata.ts`. **All document display labels and capture hrefs live in `DOCUMENT_TYPE_META`** — never re-hardcode a label/href.
- **Domains** (`containers.domain_code`) — `DOMAIN_STRUCTURES` + `getDomainStructureByCode()` in `lib/domain-structure.ts`; the `Domain` union in `lib/content-metadata.ts`.

**The rule:** these slug values are **persisted in the DB and emitted as analytics dimensions** — they are immutable. Add a new value by **appending** to the const; **never rename** an existing one (it would orphan live rows and break analytics history). Display copy can change freely (it lives in metadata, separate from the slug). The PDF `kind` discriminator (`lib/pdf/types.ts`) reuses some of these strings but is a **separate concept** — keep it independent.

---

## Label-as-foreign-key rule (the core architectural convention)

**Human-readable text is for display only. References between records must use a stable identifier**, never the prose.

**Warning signs that you're (re)introducing the bug:**
- `.eq('title', '...')` / `.eq('prompt_context', label)` — querying by a user-visible string
- `text.toLowerCase().includes('keyword')` / `.ilike('title', '%x%')` to *identify* an entity
- a column storing display prose that another query then matches on

When you see these, the fix is a stable id/code column + a metadata lookup for the label.

**Live examples (do it this way):**
- `notes.prompt_id` (stable) drives surfacing; `notes.prompt_context` is display-only.
- `containers.domain_code` (stable) drives identity; `containers.title` is display-only.
- Activity / document_type slugs are stable codes; labels come from `*_META`.

---

## `DOMAIN_STRUCTURES` — canonical domain structure

`lib/domain-structure.ts` is the **single source** for each domain's orientation + readiness rows (keys, titles, checkboxes, static links, allowed prompts). The domain page UI, the PDF builder (`lib/pdf/buildPlanData.ts`), and the status components (`DomainStateCard`, `DomainNullStateBanner`) **all derive from it**. To add/change a domain row, edit it here once and it propagates. (This file previously existed as four drifted copies — don't recreate that.)

---

## The dead `domainRelevance` trap

On reflect prompts, **`domainRelevance` (and `primaryTag` / `secondaryTags`) is dead code** — its only consumers (`getNotedomainTier` / `tieredNotesByDomain` / `isFragmentEligible`) have no live callers.

- **Domain-page prompt surfacing is driven by `allowedReflectPromptIds`** on each row in `DOMAIN_STRUCTURES`, *not* by `domainRelevance`.
- To make a prompt surface on a domain page, **add its `prompt_id` to that row's `allowedReflectPromptIds`**. Tagging `domainRelevance` does nothing.
- Funeral-wishes / advance-directive panels use a third system, `supplementaryDocumentRelevance` (live, via `getNoteSupDocTier`).
- Open roadmap decision: delete the dead `domainRelevance` path or revive it as the canonical driver — pending, don't assume either.

---

## Wishes docs Relevant Materials — two cross-doc conventions

The "Relevant materials" panels in the two wishes documents (`advance-directive` = My Care Wishes, `funeral-wishes`) must stay consistent. They drifted once (advance-directive lagged behind funeral-wishes) and produced launch-blocking bugs.

> **fw_s tag audit (pre-launch).** The funeral-wishes section tags (`fw_s1`–`fw_s5` in `supplementaryDocumentRelevance`) were audited and re-tagged for semantic accuracy — the originals had systematic mis-tags (e.g. `fw_s2` "Organ & tissue donation" carried only healthcare/quality-of-life prompts and no primaries). Only `fw_s*` keys were changed; advance-directive `q*` tags were left untouched. The working audit document is at **`docs/funeral-wishes-tag-audit.md`**. Note `fw_s2` now has **no tags at all** — by design it relies on the document-level signal to surface tier-3 materials as a flat list (see below).

- **`neverAutoSuggest` blocks AMBIENT auto-suggest; a per-question/section tag is a DOCUMENT-LEVEL signal that unblocks the whole document.** The flag (e.g. on `fears_ranking`) protects against a material appearing *incidentally* where it could feel jarring — it is **not** "this material has no relevance anywhere." A `supplementaryDocumentRelevance` tag for **any** question/section in a document signals that the material *is* appropriate for that document. Once that signal exists, the material behaves like a **normal material throughout that doc**: the specific tag sets the tier where tagged, every other question defaults to **tier-3 (Also relevant)**, and the **flat (no-section) overview shows it** as one of the doc's materials. With **no tag for a document, it stays blocked there entirely** — no document-level signal. Example: Fears is tagged `q5: 'primary'` (advance-directive) → it's Recommended at q5, Also relevant at q1–q4/q6, and in advance-directive's flat-view; it has no `fw_s*` tag → it never appears in funeral-wishes.
  - **Namespace matters:** `SupplementaryDocQuestion` spans both docs (`q1`–`q6` = advance-directive, `fw_s1`–`fw_s5` = funeral-wishes) and a material can carry keys from both. "Does this material have a signal for THIS doc" is therefore namespace-filtered: each page passes its own question set (`ADVANCE_DOC_QUESTIONS` from `QUESTIONS`, `FUNERAL_DOC_QUESTIONS` from `SECTIONS`) to the shared `hasAnySupDocTag()` (`lib/content-surfacing.ts`).
  - **Both skip sites use it:** the section-tier loop and the flat-view memo both skip a `neverAutoSuggest` material only when `!hasAnySupDocTag(meta.supplementaryDocumentRelevance, <thisDoc'sQuestions>)`. Tier logic is otherwise unchanged (`primary→1`, `secondary→2`, else `tier-3`). When you add a new auto-suggest surface, **grep `neverAutoSuggest`/`hasAnySupDocTag`** and replicate the document-signal guard.
- **Inserted-state is derived, never stored.** Whether a material is "inserted into this question" is computed from the question's own response text via `isInsertedIntoResponse` (`lib/content-surfacing.ts`) — there is **no `insertedByQuestion`/session state**. This makes per-item Values/Fears insertion track granularly, makes removing-by-editing-the-response clear the badge automatically, and prevents duplicate inserts. Funeral-wishes scopes the response to the active **section's** fields (`SECTION_FIELDS`) so per-section independence holds; advance-directive's questions are 1:1 with a field. Do not reintroduce whole-entry "Inserted" collapse or an "Already inserted" bucket.
- **The funeral `SECTION_FIELDS` map is a coupling point** (`app/app/capture/funeral-wishes/page.tsx`). It lists the `FormState` fields belonging to each `fw_s*` section, so inserted-state can be scoped per section. **When you add or remove a field in any funeral-wishes section, update `SECTION_FIELDS` to match.** If you don't, inserted-state badges silently won't appear for the new field — graceful degradation (no crash) but stale UX. Verify by inserting an item into that section after editing the fields; if the badge appears, the map is current. (Advance-directive needs no such map — its `QUESTIONS` already maps each question 1:1 to a field.)

---

## Multi-entry "Add X" surfaces — discard empty drafts on card blur

Any surface where the user clicks "Add <thing>" to create multiple entries of the same type (capture pages, multi-entry document sections) must discard an empty just-added card **when focus leaves that card** — so an empty "Untitled X" never lingers on screen until refresh.

The pattern needs **two** cooperating mechanisms — blur-discard alone is insufficient (see below). Reference: `financial-information/page.tsx`, `important-contacts/page.tsx`, `keepsake-inventory/page.tsx`, `devices-and-accounts/page.tsx`, `personal-admin/page.tsx`.

**1. Discard an empty card on card-level blur:**
- The card's root element has an `onBlur` gated by `!e.currentTarget.contains(e.relatedTarget)`, so it fires only when focus leaves the **whole** card (not when tabbing between its own fields).
- On that blur, **if the entry is still empty, remove it** — reuse the card's existing `onDelete`. Pass the card an `isEmpty` flag computed from the same predicate used for save/load filtering.

**2. Reuse the existing empty draft on Add (or autofocus the new card — ideally both):**
- ⚠️ **Blur-discard alone is NOT enough.** It only fires if a field in the card was ever focused. If "Add" doesn't autofocus the new card, the card is never focused, so clicking **Add → Add** never blurs the first card and you get **two stacked empty cards**.
- So every `addX` must **reuse an existing empty draft instead of appending a new one** (re-open + scroll to it; for fixed-slot surfaces, reuse the empty trailing slot rather than incrementing the counter). Optionally also autofocus the new card (Financial/Contacts do — `pendingFocusId`), which makes blur-discard fire on the next Add too. Defense in depth: do both.
- The decision-maker toggle blocks in Personal Admin autofocus on open for the same reason — so leaving the block empty reliably fires its blur-discard.

**Do NOT use an emptiness-based render filter** (e.g. `entries.filter(e => !isEmpty(e) || e.id === pendingId)`). It's tempting, but it hides the entry the instant a field goes empty — so clearing a field while you're still typing makes the card vanish mid-edit. Discarding must be driven by **blur**, not by render-time emptiness.

**Why / lessons learned:** save-time and load-time filtering keep the DB clean and fix the *next* reload, but do nothing for the live session. Two real mistakes made here, don't repeat them:
- The original render-filter approach (in `keepsake-inventory`) over-corrected: it collapsed the card while the cursor was still in it (clear a field mid-edit → card vanishes). Removing it was correct.
- **But the original Keepsakes pattern had TWO mechanisms — the flawed render-filter AND a load-bearing `discardEmptyPending()`-before-add guard.** The Push 1 correction removed *both*; removing the render-filter was right, removing the discard-before-add guard was a **regression** (re-introduced the Add→Add stacking bug, since Keepsakes doesn't autofocus). When you remove a flawed mechanism, check whether a *second* co-located mechanism was doing independent load-bearing work. (Tracked roadmap: extract into a shared hook so it can't drift again.)

---

## Scrolling an expanded section into view

Documents with collapsible sections scroll the opened section to the top of the viewport. Two things to get right:

- **Offset for the sticky nav.** GlobalNav is `sticky top-0`, 76px tall. A plain `scrollIntoView({ block: 'start' })` lands the title *behind* the nav. Fix: `scroll-margin-top: SECTION_SCROLL_MARGIN_TOP` (96, in `lib/ui.ts`) on the scroll-target element — `scrollIntoView` honors it. (The Key Details deep-link paths in `important-contacts`/`personal-admin` instead hardcode the same `-96` via manual `window.scrollTo`; unifying those is a tracked follow-up.)
- **Collapse must be instant, via `{open && (…)}` conditional render — one mechanism across all six.** Every section document — the practical four *and* the two wishes docs (`advance-directive` = My Care Wishes, `funeral-wishes`) — hides a collapsed section by **not rendering it** (`{isExpanded && (<div …>…</div>)}`), so layout is final on the next render and the scroll is a simple `setTimeout(…, 80)` + `scrollIntoView`. **Do not reintroduce an animated `max-height` collapse** on a scroll-on-expand surface: the scroll then races the collapse animation, measures a stale pre-collapse layout, and produces a visible "bounce" (the page drifts as the section above collapses, then the scroll corrects). The wishes docs originally animated `max-height`; removed for exactly this reason (a `transitionend`-based wait was tried first, but the un-scrolled drift *during* the wait was itself the bounce). **`display: none` was also considered and rejected** — it's a mechanism inconsistency with the practical docs, and (the real footgun) a `display:none` ancestor gives descendant textareas `scrollHeight: 0`, silently breaking any auto-resizing field. Conditional render is the single safe pattern. Safe to unmount because all six docs lift form state to a page-level `form`/`formRef` (fields are controlled via `value`/`onChange`); collapsed fields hold no un-lifted state.

---

## Database migrations

- Migrations are plain SQL files in `supabase/migrations/` (e.g. `20260603_containers_domain_code.sql`).
- **The user applies them manually via the Supabase SQL Editor and reports the output back** — they are not auto-run. Provide the file + a short "how to apply / what to expect" note.
- Make them **idempotent**: `ADD COLUMN IF NOT EXISTS`, `CREATE INDEX IF NOT EXISTS`, backfills guarded by `WHERE col IS NULL`, safe to re-run.
- Include `RAISE NOTICE` count summaries (matched / unmatched / duplicates) so the result is visible, and abort (`RAISE EXCEPTION`) rather than ship a half-migrated state.
- Several base tables (`containers`, `entries`, `notes`) live in the Supabase dashboard, not in migration files — `ALTER` them via a new migration; don't expect a `CREATE TABLE` to exist locally.
- **Known `user_profiles` schema drift (tracked, post-launch cleanup).** A few columns are read in app code but absent from *every* migration — `first_name`/`last_name` (`app/api/feedback/route.ts`) and `onboarding_complete_shown_at` (`app/api/plan/export-json/route.ts`). They were added via the dashboard, so the live table already differs from migration history, and there are **no generated TS types** to catch a missing column. Don't fix in passing; when adding a `user_profiles` column, write a fresh idempotent migration and verify against the **live** table, not the migration set.

---

## Transactional email — one transport

- **All Resend sends go through `lib/email.ts` → `sendEmail({ to, subject, html?, text? })`.** It owns the single sender (`The Nightside <noreply@thenightside.net>`), the `RESEND_API_KEY` guard, and `!res.ok` error normalization (returns `{ ok, error? }`). **Never re-inline `fetch('https://api.resend.com/emails')`** — there used to be four copies; they're gone (one transport now).
- It deliberately does **not** try/catch the fetch (a network error throws, as before). Fire-and-forget callers (e.g. the Stripe webhook admin alert) keep their own try/catch around the call.
- Email **content** (subject + HTML/text) stays the caller's concern — the per-route HTML builders (`buildEmail`/`buildDesignationEmail`/… in the legacy-contact routes) stay where they are. A shared **branded HTML wrapper** is a tracked follow-up, to be introduced with the first recovery-email message — *not* by rewriting the existing emails (that would risk changing rendered output).

---

## Account recovery email (in progress — paused after Phase 1)

Self-service account recovery for users who lose access to their primary email. **No manual review** — a *verified* recovery email is the only recovery path; users without one cannot recover (decided; documented in the support runbook). Distinct from a Legacy Contact (a different person, released to on death).

**Storage (shipped — Phase 1a, `supabase/migrations/20260608_recovery_email.sql`):**
- `user_profiles.recovery_email` (text, nullable) + `recovery_email_verified` (boolean, default false). An address is **inert until verified** — every consumer must check the flag.
- `recovery_email_tokens` — single-use, time-limited ledger for both the `verify` and `recovery` flows. **Service-role only: RLS enabled with NO policies** (never readable by the browser). Stores a **SHA-256 `token_hash`** (raw token only ever in the emailed link) and an **`email` snapshot** (so editing a pending address invalidates old links). Consume with `WHERE token_hash = $1 AND used_at IS NULL AND expires_at > NOW()`.

**Locked conventions for the remaining phases:**
- **Must-differ-from-primary** is enforced in app code (client + server), *not* SQL — the primary lives in `auth.users`, unreachable from a CHECK.
- **Verification is deferred until after primary-email confirmation:** capture `recovery_email` at signup via `signUp` `options.data`, then persist it + send the verify email from the `/auth/callback` post-confirmation hook (single-email focus, recent context). Success page acknowledges the verify send.
- Recovery is **outside Supabase auth** — both the verify flow and the lost-email recovery flow need custom tokens + service-role routes; Supabase's built-in confirm/reset flows (keyed to the *primary* email) can't be reused. The lost-email reset should bootstrap a Supabase recovery session via `admin.generateLink({ type: 'recovery' })` so GoTrue's password rules (12-char min, leaked-password protection) still apply, then revoke other sessions (single-session enforcement is OFF).

**Notification policy (Phase 5 — mostly gap-filling).** Supabase now auto-notifies the **primary** email for password change / email change (old address) / sign-in-method & MFA events. We add the **recovery-email** side where policy says both, plus full notifications for events Supabase doesn't cover (account deletion, plan export). Password-change notification = keep client `updateUser` + a **thin notify endpoint** (preserves Supabase's secure-change re-auth *and* its primary notification — do **not** move to a service-role admin write, which loses both); plan-export = a thin endpoint the client calls post-export (PDF stays client-side).

**Deferred (post-launch — captured, not in scope):**
- **Account-deletion 7-day soft-delete + cancellation.** Pre-launch ships *immediate* deletion with notifications to both addresses. The delay mechanism (soft-delete state, cancellation route, scheduled hard-delete cron, pending-deletion `proxy.ts` UX, legacy-contact release interaction) is post-launch hardening — protects against attacker-triggered deletion of a legitimate account.
- **MFA / sign-in-method notifications to the recovery email** — deferred to the TOTP phase, where the broader MFA work lives. Supabase covers the primary side today.

---

## Git / workflow conventions

- **Always push immediately after committing** (Vercel deploys from the push).
- Non-trivial work goes on a **feature branch** (`refactor/…`, `fix/…`); push, **verify on the Vercel preview**, then merge to `main`. Use `--no-ff` (or a clean fast-forward) and delete the branch after.
- **Trivial changes** (comment-only, tiny fixes) can commit directly to `main`.
- Multi-line/-paragraph commit or merge messages: write them via a heredoc or `-F <file>` — **`git merge -F -` (stdin) is not supported** and will silently no-op the merge.
- End commit messages with the `Co-Authored-By: Claude …` trailer.
