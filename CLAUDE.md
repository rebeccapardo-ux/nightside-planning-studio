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

## Multi-entry "Add X" surfaces — the Keepsakes pattern

Any surface where the user clicks "Add <thing>" to create multiple entries of the same type (capture pages, multi-entry document sections) **must use the Keepsakes pattern** — reference: `app/app/capture/keepsake-inventory/page.tsx`.

The pattern, three parts:
- **`pendingId`** tracks the just-added draft entry.
- **`discardEmptyPending()`** runs on card blur (root `<div onBlur>` gated by `!e.currentTarget.contains(e.relatedTarget)`, so it fires only when focus leaves the whole card) — it removes the draft if it's still empty. The add handler calls it first (discard-then-add); the update handler clears `pendingId` once the entry has content; delete clears it too.
- **Render filter**: `entries.filter(e => !isEmpty(e) || e.id === pendingId)` — shows entries that have content **or** the active draft you're typing into.

**Why:** save-time filtering and load-time filtering alone do **not** fix the in-session experience. Without the render filter + blur discard, an empty "Untitled X" card **lingers on screen until a manual refresh** (it's filtered out of the DB and gone on reload, but stays in React state live). That exact bug recurred on Financial Information, Important Contacts, Devices & Accounts, and Personal Admin — every multi-entry surface *except* Keepsakes — before being propagated. Don't reintroduce it on a new surface; copy the Keepsakes pattern. (Tracked roadmap: extract it into a shared hook so it can't drift again.)

---

## Database migrations

- Migrations are plain SQL files in `supabase/migrations/` (e.g. `20260603_containers_domain_code.sql`).
- **The user applies them manually via the Supabase SQL Editor and reports the output back** — they are not auto-run. Provide the file + a short "how to apply / what to expect" note.
- Make them **idempotent**: `ADD COLUMN IF NOT EXISTS`, `CREATE INDEX IF NOT EXISTS`, backfills guarded by `WHERE col IS NULL`, safe to re-run.
- Include `RAISE NOTICE` count summaries (matched / unmatched / duplicates) so the result is visible, and abort (`RAISE EXCEPTION`) rather than ship a half-migrated state.
- Several base tables (`containers`, `entries`, `notes`) live in the Supabase dashboard, not in migration files — `ALTER` them via a new migration; don't expect a `CREATE TABLE` to exist locally.

---

## Git / workflow conventions

- **Always push immediately after committing** (Vercel deploys from the push).
- Non-trivial work goes on a **feature branch** (`refactor/…`, `fix/…`); push, **verify on the Vercel preview**, then merge to `main`. Use `--no-ff` (or a clean fast-forward) and delete the branch after.
- **Trivial changes** (comment-only, tiny fixes) can commit directly to `main`.
- Multi-line/-paragraph commit or merge messages: write them via a heredoc or `-F <file>` — **`git merge -F -` (stdin) is not supported** and will silently no-op the merge.
- End commit messages with the `Co-Authored-By: Claude …` trailer.
