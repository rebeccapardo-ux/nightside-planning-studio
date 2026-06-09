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

## Account recovery email (Phases 1–3 shipped)

Self-service account recovery for users who lose access to their primary email. **No manual review** — a *verified* recovery email is the only recovery path; users without one cannot recover (decided; documented in the support runbook).

- **Design assumption: the recovery email is the primary user's OWN backup address — not a delegate.** Copy, threat model, and notification semantics all assume this. Using someone else's address (e.g. a partner's) is the user's choice *outside* the platform's design intent — this framing keeps the recovery model identity-preserving and bounds liability. (Distinct from a Legacy Contact, who *is* a different person, released to on death.)

**Storage (Phase 1a, `supabase/migrations/20260608_recovery_email.sql`):** `user_profiles.recovery_email` (text, nullable) + `recovery_email_verified` (boolean, default false) — an address is **inert until verified**, every consumer must check the flag. `recovery_email_tokens` — single-use, time-limited ledger for the `verify` and `recovery` flows; **service-role only (RLS enabled, NO policies)**.

**Token engine (Phase 2, `lib/recovery-email.ts` — service-role only):** `issueToken(userId, purpose, email)` / `consumeToken(raw, expectedPurpose)`.
- Stores only a **SHA-256 `token_hash`**; the raw token is returned to the caller and only ever travels in the emailed link (a DB read can't yield a usable link).
- Each token **snapshots the email** it was issued for; `confirmVerifyToken` compares the snapshot to the account's *current* `recovery_email` and returns `stale` on mismatch (editing a pending address invalidates old links).
- **Single-use:** consume stamps `used_at`, guarded `WHERE token_hash = $1 AND purpose = $2 AND used_at IS NULL AND expires_at > NOW()` plus a `used_at IS NULL`-guarded update so a race can't double-consume. Verify TTL 24h; recovery TTL 60m (Phase 4).
- Shared branded email shell is `brandedEmail()` in `lib/email.ts` (introduced here; legacy-contact emails still inline their own — migrating is a tracked follow-up).

**Capture + verify flow (Phase 2):**
- **Must-differ-from-primary** is enforced in app code (signup client + the callback server), *not* SQL — the primary lives in `auth.users`, unreachable from a CHECK.
- **Verification is deferred until after primary-email confirmation (decision b):** signup writes `recovery_email` into `signUp` `options.data`; the **`/auth/callback` post-confirmation hook** (`provisionRecoveryEmailFromMetadata`) is the trigger point — it validates, persists the address (unverified), issues a verify token, and sends the email. **Idempotency guard required** (skip if `recovery_email` already set) so a re-clicked confirmation link doesn't re-issue/re-send. Best-effort: never block the callback. The acknowledgment lives on `/auth/signup/payment` (the confirmation-landing page), inline + subtle — *not* the post-payment success page (the 24h verify TTL means a user must see it before it expires).
- **The verify link is prefetch-safe:** `/auth/recovery-email/verify` renders a landing page with a **Confirm button that POSTs** (a server action) to consume the token — email-client GET prefetch can't consume it. The GET also **peeks** the token state (`peekToken`, no mutation) so a used/expired/invalid token renders its terminal page directly instead of a misleading Confirm prompt; only a *pristine* token shows the Confirm landing.
- **The one-click vs two-click asymmetry is intentional.** Primary-email confirmation is one-click (prefetch-vulnerable, legacy PKCE flow); recovery-email confirmation is **two-click / POST-consume (prefetch-safe)**. Recovery email is a security-sensitive last-resort path that arrives at a *different* inbox than the user's active session, so prefetch likelihood is meaningfully higher and the extra click is worth it. The asymmetry resolves when primary confirmation migrates to `verifyOtp` (tracked roadmap item). The route also lives *outside* the signup flow — `proxy.ts` exempts `/auth/recovery-email` from the "redirect authenticated users away from `/auth/*`" rule, so verify is a self-contained journey authorized by the token, not the session.
- **The address persists *before* the verify email send.** A failed send leaves the address in a **pending-unverified** state (visible + recoverable via the Phase 3 resend path) rather than silently losing the user's input. This trades a potential "forever-unverified-typo" edge case for not dropping captured input — sends are usually transient failures.

**Account-page management (Phase 3 — `app/app/account/page.tsx` + `app/api/recovery-email/route.ts`):**
- A **Recovery email row** sits in Account Access between Email and Password with three states (none / pending / verified, the latter two with a status badge). The operations (**add / remove / resend**) **follow the change-email modal pattern** — same modal state machine, server-side `signInWithPassword` re-auth, and "sent" confirmation state. The management route mirrors the legacy-contact manage route (re-auth → service-role).
- **There is deliberately NO "change" operation** (don't add one back). A recovery email has **no persistent identity** to mutate — unlike the primary email, which is anchored to `user_id`/account/all data, a recovery address is just a string, and the `verified` flag doesn't even survive a swap (a new address starts unverified). So "changing" it *is* conceptually remove-then-add: the vocabulary should match the model. The user removes (invalidates tokens) then adds (issues fresh) — two clicks, each accurately describing what happens. There is no `change` action on the API route.
- **Token invalidation rule:** **change / remove / resend** all call `invalidateVerifyTokens(userId)` (`UPDATE … SET used_at=NOW() WHERE user_id=$1 AND purpose='verify' AND used_at IS NULL`) **before** issuing a new token, so previously-sent verify links stop working. **Resend invalidates first, then issues+sends** — a failed send leaves *no* valid token (user just clicks Resend again), which is easier to reason about than overlapping valid tokens.
- **Password change goes through a SERVER ROUTE** (`app/api/account/password/route.ts`), not the client. The Password row → "Change" → modal posts `{ currentPassword, newPassword }`; the route verifies the current password via `signInWithPassword` (the app-level gate), writes the new password with the **service-role `admin.updateUserById`**, and sends the password-changed notification. The client no longer calls `supabase.auth.updateUser({ password })`.
- **Why the admin write — `current_password_required` is unfixable from the dashboard.** GoTrue returns `code: current_password_required` (400) on a client `updateUser({password})` and it is **default-on in newer Supabase with NO dashboard toggle to disable** (turning off "Secure password change" does *not* clear it). The only client-side way to satisfy it is the `reauthenticate()` **OTP nonce** flow — rejected for mid-flow friction. So the **admin API (which bypasses it) is the path. Don't try to disable `current_password_required` again — there's no setting.** (The earlier "keep client `updateUser`" Phase 5a sub-decision is **dead** — its premise that client `updateUser` works is disproven.)
- **The password-changed notification is built HERE, in Phase 3 — not Phase 5a.** The server route owns both the update *and* the notification (to the primary + the **verified** recovery email; best-effort). Because admin writes don't fire Supabase's auto "password changed" email, **turn OFF Supabase's "password changed" notification toggle** (ours sends it; avoid duplicates). "Secure password change" can stay **ON** (it no longer affects this admin path; it protects any other path).
- **Leaked-password protection is preserved in the route** via a **HIBP Pwned Passwords k-anonymity check** (`isPasswordLeaked`): SHA-1 the new password, send only the **first 5 hex chars** to `api.pwnedpasswords.com/range/...` (never the password/full hash), scan the suffix list. The admin write bypasses Supabase's built-in leaked-password check, so we re-run it ourselves between current-password verify and the admin update. **Fail-open** (a HIBP outage doesn't block a legitimate change). Min-length 12 also enforced. (The admin write does still bypass the secure-change *reauth* — that's the intended path; our app-level current-password verify is the equivalent.)
- Recovery is **outside Supabase auth** — both the verify flow and the lost-email recovery flow need custom tokens + service-role routes; Supabase's built-in confirm/reset flows (keyed to the *primary* email) can't be reused. The lost-email reset (Phase 4) should bootstrap a Supabase recovery session via `admin.generateLink({ type: 'recovery' })` so GoTrue's password rules (12-char min, leaked-password protection) still apply, then revoke other sessions (single-session enforcement is OFF).

**Notification policy (Phase 5 — mostly gap-filling).** Supabase auto-notifies the **primary** email for email change (old address) / sign-in-method & MFA events. We add the **recovery-email** side where policy says both, plus full notifications for events Supabase doesn't cover (account deletion, plan export). **Password change is already done (Phase 3):** its server route owns the update *and* the notification to primary + recovery (see above) — Supabase's auto password-changed email is turned OFF to avoid duplicates. plan-export = a thin endpoint the client calls post-export (PDF stays client-side). **Correction to the original Phase 5a framing:** it assumed client `updateUser` *preserves Supabase's secure-change re-auth* — that was wrong (GoTrue's `current_password_required` blocks client `updateUser` entirely without OTP), so password change moved to a service-role admin route that owns its own notification. The "both-addresses notification" goal stands; the "keep client `updateUser`" mechanism does not.

**Deferred (post-launch — captured, not in scope):**
- **Account-deletion 7-day soft-delete + cancellation.** Pre-launch ships *immediate* deletion with notifications to both addresses. The delay mechanism (soft-delete state, cancellation route, scheduled hard-delete cron, pending-deletion `proxy.ts` UX, legacy-contact release interaction) is post-launch hardening — protects against attacker-triggered deletion of a legitimate account.
- **MFA / sign-in-method notifications to the recovery email** — deferred to the TOTP phase, where the broader MFA work lives. Supabase covers the primary side today.

---

## Legacy Contact management (account page)

LCs are modeled as two typed slots (`legacy_contacts.contact_type` = `primary` | `secondary`), but users think of them as a **ranked list**. The account-page management UI (`app/app/account/page.tsx`) + `app/api/legacy-contact/manage/route.ts` are built around that, after a redesign that fixed a silent-failure bug.

- **Two explicit buttons, never a buried "replace" link.** Each LC card shows a separate **"Update … contact details"** (edit the same person) and **"Replace with a different Legacy Contact"** (change who it is). The previous single-entry-point "Update" with a buried "Designate someone else" link caused users to silently overwrite a record with a new person's details *without* the dedesignation/designation notifications firing. **Do not reintroduce a combined update/replace entry point.** Modal titles must match the operation: edit → "Update Contact Details"; replace → "Replace Legacy Contact" (a static "Update Legacy Contact" title was the misleading-header bug).
- **Notification semantics (asymmetry of consequence):**
  - **designate / replace / remove → blocking with rollback** — if any notification fails, the whole DB change is reverted and a 502 is returned (the contact list must never diverge from who's been told).
  - **edit → split:** an **email-address change is blocking** (the address on file must not diverge from what the contact has been notified about); **name / relationship / personal_message changes send NO notification** (silent — these are corrections, not consequence-bearing).
  - **Role changes are first-class, honest emails:** promoting secondary→primary sends a **promotion** email; demoting primary→secondary sends a **demotion** email (subject `Your role as …'s Legacy Contact has changed`). Neither is a dedesignation — the person is still an LC. (`buildPromotionEmail` / `buildDemotionEmail`.)
- **A secondary cannot exist without a primary.** Enforced in the `add-secondary` API branch (rejects when no primary exists) — there is **no DB constraint**, so don't rely on one. The gate (`proxy.ts`) is keyed to `primary` only.
- **Promote-secondary-to-primary is atomic, inside the Replace-primary flow** (a checkbox that autofills + locks the form from the secondary's details). The secondary's record *becomes* the primary (its `personal_message` is **overridden** by any message entered in the promote flow); the secondary slot empties. Replace-primary also forces a decision about the old primary — **remove** (dedesignation) or **move to secondary** (demotion). "Promote + move old primary to secondary" is a clean **swap**; because the `contact_type` enum has no temp value, the demoted primary is re-inserted as a fresh secondary row (new id / `designated_at`) — fine pre-launch.
- **Disposition is chosen in Replace-primary Step 1 (the warning), before the Step 2 form.** The "Move to secondary" caveat — "(this will remove [Existing Secondary] as your Legacy Contact)" — is **accurate at Step 1 decision time** (the non-promote default). The Step 2 promote checkbox is a conscious **override** that can turn the operation into a clean swap (the secondary is promoted, not removed); the Step 1 caveat is **not** updated to reflect that potential override. **Considered and intentionally not made conditional** — conditional Step-1 copy about a Step-2 choice adds complexity without clear benefit, and the Step 2 form makes the actual outcome clear.

Deferred (post-launch): **secondary-LC release verification protocol** (how a secondary proves the primary is unavailable — extend the release runbook); **post-promotion UX polish** (after promoting, surface an "edit their details" path instead of making the user reopen the card).

---

## Git / workflow conventions

- **Always push immediately after committing** (Vercel deploys from the push).
- Non-trivial work goes on a **feature branch** (`refactor/…`, `fix/…`); push, **verify on the Vercel preview**, then merge to `main`. Use `--no-ff` (or a clean fast-forward) and delete the branch after.
- **Trivial changes** (comment-only, tiny fixes) can commit directly to `main`.
- Multi-line/-paragraph commit or merge messages: write them via a heredoc or `-F <file>` — **`git merge -F -` (stdin) is not supported** and will silently no-op the merge.
- End commit messages with the `Co-Authored-By: Claude …` trailer.
