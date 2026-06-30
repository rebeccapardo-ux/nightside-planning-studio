# Domain Page — Placement Reference

> **Surface note (post-restructure).** The "domain page" is now the **Plan section of the area
> page** (`/app/area/[slug]` → `app/components/area/AreaPlanSection.tsx`). The standalone
> `/app/domains/[domainId]` page was deleted; only a uuid→slug redirect stub remains. The
> surfacing logic moved verbatim into `AreaPlanSection` — the file-path citations below that
> still say `app/app/domains/[domainId]/page.tsx` refer to that moved code (now in
> `AreaPlanSection`); line numbers are historical. The placement **policy is unchanged.**

**Canonical source of truth** for what auto-surfaces on each domain (area) page, per row — across
the **Reflection + Learning** (orientation) and **Practical Readiness** (readiness) sections.

- **Status:** Reviewed and confirmed by the maintainer (2026-06-22), including the Legacy
  single-row consolidation.
- **Derived from:** `DOMAIN_STRUCTURES` in `lib/domain-structure.ts` (the single source for
  domain rows) and `REFLECT_PROMPT_META` in `lib/content-metadata.ts` (prompt text). This
  document is **policy**; the data in those files is the **mechanism**. They must agree — if
  you change the data, update this document in the same PR (see CLAUDE.md → "Placement rules
  for wishes documents and domain pages").
- **Line refs** are `lib/domain-structure.ts` for rows and `lib/content-metadata.ts` for
  prompt text, as of 2026-06-22.

## Two independent auto-surfacing systems (read this first)

A domain row can auto-surface **two unrelated kinds of content**, by **two separate fields** —
plus a third, content-independent navigation affordance:

1. **Notes** — `allowedReflectPromptIds` on the row → matches `notes.prompt_id` where
   `origin_type='prompt'`. Drives the per-row "X notes →" panel (`resolveRowNotes`,
   `app/app/domains/[domainId]/page.tsx:752`). Only **reflect-prompt** notes.
2. **Materials** — `relatedActivities` / `relatedDocumentTypes` on the row → matches the
   user's `entries` by `activity` / `document_type`. Drives the `ItemMaterials` link list
   (`itemEntries` `:886`, `ItemMaterials` `:1424`). Shows the user's actual activity outputs /
   documents, only when one exists.
3. **Static links** — `staticLinks` on a row → a fixed link to a capture page, shown
   **regardless of whether the user has content**. Not "materials" — just navigation.

These are orthogonal: a row may have any combination. The two auto-surface systems share no
code. **Do not assume `allowedReflectPromptIds` is the only surfacing lever** — that omission
is the single most likely future-regression vector.

> **On titles & prompt text:** `content-metadata.ts` stores only the full prompt text (the
> `label`). The row `key` is a stable internal slug (used as `topic_id` in `domain_topic_notes`
> / `hidden_row_notes` and for orientation status); the row `title` is display copy and can
> change freely. `[O]` = orientation row (can auto-surface notes); `[R]` = readiness row
> (never auto-surfaces notes, by design).

---

## Healthcare Wishes (`healthcare`) — domain-structure.ts:58

### Reflection + Learning (orientation)

#### [O] My values and priorities for care at end of life (`values_care_priorities`) — :63
- **Materials:** Values Ranking + Fears Ranking activity outputs (`relatedActivities`, :66)
- **Notes** (`allowedReflectPromptIds`, :68):
  - prompt_2 — "What would you want someone making decisions for you to understand?" — content-metadata.ts:210
  - prompt_1 — "What matters most to you right now?" — content-metadata.ts:202
  - prompt_5 — "If you could choose the setting for your final moments, where would you be and who would be with you?" — content-metadata.ts:227
  - prompt_20 — "What do you worry most about when thinking about your future health and care?" — content-metadata.ts:322
  - prompt_19 — "If you needed help going to the bathroom or bathing, who would you feel most comfortable asking?" — content-metadata.ts:314
  - prompt_25 — "Fill in the blank: I want to live in my body as long as…" — content-metadata.ts:360
  - prompt_26 — "What does quality of life mean to you?" — content-metadata.ts:368
  - prompt_22 — "What does a good day look like for you?" — content-metadata.ts:338
  - prompt_30 — "If you could control one aspect of your death, what would it be?" — content-metadata.ts:397

#### [O] Understand how substitute decision-making for care works in my province (`decision_making_framework`) — :74
- No notes, no materials.

#### [O] Consider who I would want to make decisions for me if I were not able to (`who_would_speak`) — :80
- **Notes** (:84): prompt_6 — "If you were unable to make decisions for yourself, who would you want to make those decisions, and why?" — content-metadata.ts:233

### Practical Readiness (readiness)
- **[R] Who will make decisions for me** (`who_will_decide`) — :91 — no notes.
- **[R] My wishes are clear and shared** (`wishes_clear_shared`) — :101 — no notes; **static link** → My Care Wishes (`:104`).

---

## Deathcare (`deathcare`) — domain-structure.ts:118

### Reflection + Learning (orientation)

#### [O] Reflect on my wishes for my body's final resting place (`final_resting_place_wishes`) — :123
- **Notes** (:127):
  - prompt_9 — "How would you want your body to be handled after death, and why?" — content-metadata.ts:251
  - prompt_41 — "If you could choose one personal item to be included in your final resting place, what would it be?" — content-metadata.ts:475

#### [O] Understand the legal options in my province (`legal_options_province`) — :132
- No notes, no materials.

### Practical Readiness (readiness)
- **[R] Final resting place wishes** (`final_resting_place_wishes`) — :140 — no notes; **static link** → Funeral & Ceremony Wishes (`:148`).

---

## Wills & Estates (`wills_estates`) — domain-structure.ts:154

### Reflection + Learning (orientation)
- **[O] Understand the requirements for a legal will in my province** (`legal_will_requirements`) — :159 — no notes, no materials.
- **[O] Consider who I want to name as executor** (`executor_choice`) — :165 — **Materials:** Important Contacts **document** (`relatedDocumentTypes`, :168). **No notes.**
- **[O] Reflect on wishes for my assets** (`asset_wishes`) — :172 — **Materials:** Financial Information **document** (`relatedDocumentTypes`, :175). **No notes.**
- **[O] Care of children or pets** (`care_children_pets`) — :179 — no notes, no materials.
- **[O] Consider whether additional estate planning may apply to my situation** (`additional_estate_planning`) — :185 — no notes, no materials.

### Practical Readiness (readiness)
- **[R] Legal will** (`legal_will_in_place`) — :193 — no notes.
- **[R] Other estate planning needs (if applicable)** (`other_estate_planning`) — :199 — no notes.
- **[R] Professional support (if needed)** (`professional_support`) — :205 — no notes.
- **[R] What should happen to my belongings** (`meaningful_objects`) — :211 — no notes; **static link** → Keepsakes Inventory (`:214`).

> **Wills & Estates has zero note-surfacing rows** — by design. It surfaces only *documents*
> (Important Contacts, Financial Information) via materials.

---

## Ritual & Ceremony (`ritual`) — domain-structure.ts:221

### Reflection + Learning (orientation)

#### [O] Reflect on rituals or ceremonies that are meaningful to me (`meaningful_rituals`) — :226
- **Notes** (:230):
  - prompt_40 — "What rituals or ceremonies—personal, cultural, or religious—are meaningful to you?" — content-metadata.ts:467
  - prompt_7 — "What are a few of your favorite special traditions?" — content-metadata.ts:239

#### [O] Consider how I want my death to be marked or remembered (`mark_or_remember`) — :235
- No notes, no materials.

### Practical Readiness (readiness)
- **[R] Ritual and ceremony preferences** (`ritual_ceremony_preferences`) — :243 — no notes; **static link** → Funeral & Ceremony Wishes (`:250`).

---

## Legacy (`legacy`) — domain-structure.ts:256

> **Note-surfacing consolidated 2026-06-22 onto one row.** All of Legacy's auto-surfacing
> reflect prompts now attach to `life_story_shaped` (retitled "Reflect on what I am leaving
> behind"; slug kept as a stable FK). The other two orientation rows (`how_remembered`,
> `relationships_impact`) **still exist** — they simply carry no auto-surfacing notes (the same
> no-notes-orientation-row pattern as Healthcare `decision_making_framework`). Prompts
> 24/31/37/27/28/32 were dropped from domain surfacing (Your Materials only); 10/12/36/43 were added
> to `life_story_shaped`.

### Reflection + Learning (orientation)

#### [O] Reflect on what I am leaving behind (`life_story_shaped`) — :261
- **Materials:** Legacy Map activity output (`relatedActivities`, :264)
- **Notes** (:266):
  - prompt_10 — "If you could leave behind a time capsule for future generations of your family, what 3 items would you include and why?" — content-metadata.ts:257
  - prompt_12 — "If you could write your own obituary, what key elements would you include?" — content-metadata.ts:269
  - prompt_36 — "Think of a mentor or role model who has passed. What's the most valuable lesson they left you with?" — content-metadata.ts:442
  - prompt_38 — "If you had the chance to write a letter to your younger self about life's most important lessons, what would you include?" — content-metadata.ts:455
  - prompt_39 — "What's one thing you hope people will always remember about you, no matter how much time has passed?" — content-metadata.ts:461
  - prompt_42 — "If you could be remembered for one specific contribution to your community, family, or loved ones, what would it be?" — content-metadata.ts:481
  - prompt_43 — "You have the opportunity to donate to one cause in your will. What's the focus of your legacy gift?" — content-metadata.ts:487

#### [O] Consider how I want to be remembered (`how_remembered`) — :272
- No auto-surfacing notes (orientation row, no `allowedReflectPromptIds`); no materials.

#### [O] Reflect on meaningful relationships and personal impact (`relationships_impact`) — :278
- No auto-surfacing notes (orientation row, no `allowedReflectPromptIds`); no materials.

### Practical Readiness (readiness)
- **[R] Sharing what matters to me** (`sharing_what_matters`) — :286 — no notes.

---

## Personal Admin (`personal_admin`) — domain-structure.ts:299

### Reflection + Learning (orientation)
- **[O] Understand personal admin involved in death planning** (`understand_personal_admin`) — :304 — no notes, no materials.

### Practical Readiness (readiness) — all use static links, none surface notes
- **[R] Personal records** (`personal_information`) — :312 — **static link** → Personal Admin Information (`:316`).
- **[R] Important contacts** (`important_contacts`) — :319 — **static link** → Important Contacts (`:323`).
- **[R] Financial information** (`financial_information`) — :326 — **static link** → Financial Information (`:330`).
- **[R] Devices and accounts** (`devices_and_accounts`) — :333 — **static link** → Devices & Accounts (`:337`).
- **[R] Social media and digital assets** (`social_media_digital_assets`) — :340 — no link/notes.

> **Personal Admin has zero note-surfacing rows** — by design. Its documents are reached via
> **static links** (always shown), not the materials system. Note the asymmetry: the Important
> Contacts and Financial Information *entries* auto-surface as **materials under Wills &
> Estates** rows (`executor_choice` / `asset_wishes`), while Personal Admin shows fixed links.
> Both are intentional.

---

## Section totals

| Domain | Orientation rows | …with notes | Materials rows | Readiness rows | Static links |
|---|---|---|---|---|---|
| Healthcare | 3 | 2 | 1 (Values, Fears) | 2 | 1 |
| Deathcare | 2 | 1 | 0 | 1 | 1 |
| Wills & Estates | 5 | 0 | 2 (Contacts, Financial docs) | 4 | 1 |
| Ritual & Ceremony | 2 | 1 | 0 | 1 | 1 |
| Legacy | 3 | 1 | 1 (Legacy Map) | 1 | 0 |
| Personal Admin | 1 | 0 | 0 | 5 | 4 |

Distinct prompts that auto-surface on a domain page (across all rows): prompt_1, 2, 5, 6, 7, 9,
10, 12, 19, 20, 22, 25, 26, 30, 36, 38, 39, 40, 41, 42, 43 (**21**). Every other prompt appears
only on Your Materials (/app/materials).

---

## Default behavior (governs what actually surfaces)

Domain pages behave **differently from the wishes-doc panels** — read this before assuming
parity:

- **No tier system, no fall-through.** There is no "Recommended / Also relevant" tiering and
  **no default tier-3 fall-through**. An item is deemed relevant to a row or it isn't —
  surfacing is binary, driven solely by an explicit `allowedReflectPromptIds` /
  `relatedActivities` / `relatedDocumentTypes` entry on that row. This is intentional and is
  the opposite of the wishes panels (where untagged activity outputs fall through to tier-3).
- **Only `origin_type='prompt'` notes auto-surface.** `resolveRowNotes`
  (`app/app/domains/[domainId]/page.tsx:756`–761) hard-requires `n.origin_type === 'prompt'`
  and `n.prompt_id ∈ allowedReflectPromptIds`. **Reflection notes (`origin_type='reflection'`)
  and freeform notes NEVER auto-surface on domain pages** — they live only on Your Materials (/app/materials)
  (and, where tagged, the wishes panels).
- **Orphan prompt notes go nowhere here.** A prompt note whose `prompt_id` is in **no** row's
  `allowedReflectPromptIds` (e.g. prompts 24/31/37/27/28/32 after the Legacy consolidation)
  does not appear on any domain page — only Your Materials (/app/materials). There is no catch-all bucket.
- **Wills & Estates and Personal Admin intentionally have zero note-surfacing rows.** Wills
  surfaces only documents (via materials); Personal Admin surfaces only static links. This is
  by design, not missing data.
- **Contacts & Financial documents surface under Wills & Estates, not Personal Admin** — also
  intentional (see the Personal Admin note above).
- **Manual attachment is separate from all auto-surfacing.** Any note can be manually pinned to
  any row (`domain_topic_notes`, read in `resolveRowNotes:766`–770) or removed from a row
  (`hidden_row_notes`, `:763`–766). Manual pins/suppressions do not depend on tags and are not
  covered by this reference — this doc is about **auto**-surfacing only.
- **No `domainRelevance` / tiering code runs here.** `lib/content-surfacing.ts` is not imported
  by the domain page; `domainRelevance` / `getNotedomainTier` / `tieredNotesByDomain` /
  `isFragmentEligible` are unused on domain pages (they are wishes-panel / dead-code concerns).
  `FragmentField` and the `EntryCard variant="output"` "materials canvas" are dead/disabled.

---

## When auditing domain placement (methodology)

Mirror the wishes-doc audit discipline, **plus** account for the dual system:

1. Extract `allowedReflectPromptIds` per row (notes).
2. **Also extract `relatedActivities` / `relatedDocumentTypes` per row (materials)** — the most
   commonly missed half.
3. Note `staticLinks` (content-independent navigation, not surfacing).
4. Trace the surfacing logic, not just the data: confirm the binary, no-fall-through behavior
   and the `origin_type='prompt'` gate still hold.
