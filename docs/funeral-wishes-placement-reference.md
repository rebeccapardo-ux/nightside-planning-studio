# Wishes for My Body, Funeral & Ceremony — Placement Reference

**Canonical source of truth** for which reflect prompts and activities surface in each
section (fw_s1–fw_s5) of the **Wishes for My Body, Funeral & Ceremony** document
(`funeral_wishes`), and at which tier (Primary = "Recommended", Secondary = "Also relevant").

- **Status:** Reviewed and confirmed by the maintainer (2026-06-21). Verified 1:1 against the
  live data on 2026-06-21 — every `fw_s*` tag in code matched this document at the correct
  tier, in both directions (no missing entries, no orphan tags).
- **Derived from:** the `supplementaryDocumentRelevance` field on each `REFLECT_PROMPT_META`
  and `ACTIVITY_META` entry in `lib/content-metadata.ts`. This document is **policy**; the
  data in `content-metadata.ts` is the **mechanism**. They must agree — if you change the
  data, update this document in the same PR (see CLAUDE.md → "Placement rules for wishes
  documents and domain pages").
- **Tier mapping:** `'primary'` → Recommended; `'secondary'` → Also relevant.
- **Related:** `docs/funeral-wishes-tag-audit.md` — the working audit that produced the
  current `fw_s*` tagging (historical; kept separate pending a consolidation decision).

> **On titles:** `content-metadata.ts` stores only the **full prompt text** (the `label`
> field); there is no short-title field. The short titles in quotes below are *editorial*
> (for readability). Activities store only `id` + tags — descriptions are editorial too. Only
> the full prompt text and the tier are authoritative. `file:line` refs are as of 2026-06-21.

---

## fw_s1 — "What matters most"

**Primary (under Recommended — 2 items)**
- **"How you'll be remembered"** — *prompt_39* — "What's one thing you hope people will always remember about you, no matter how much time has passed?" — `content-metadata.ts:464`
- **"Your greatest contribution"** — *prompt_42* — "If you could be remembered for one specific contribution to your community, family, or loved ones, what would it be?" — `content-metadata.ts:484`

**Secondary (under Also relevant — 8 items)**
- **"Wishes for your body"** — *prompt_9* — "How would you want your body to be handled after death, and why?" — `content-metadata.ts:254`
- **"Your legacy gift"** — *prompt_43* — "You have the opportunity to donate to one cause in your will. What's the focus of your legacy gift?" — `content-metadata.ts:490`
- **"Your time capsule"** — *prompt_10* — "If you could leave behind a time capsule for future generations of your family, what 3 items would you include and why?" — `content-metadata.ts:260`
- **"Art that shaped you"** — *prompt_16* — "What's one book, movie, or piece of art that has deeply influenced how you think about life or death?" — `content-metadata.ts:294`
- **"Keeper of your stories"** — *prompt_31* — "Who knows the best stories about you?" — `content-metadata.ts:408`
- **"A mentor's lesson"** — *prompt_36* — "Think of a mentor or role model who has passed. What's the most valuable lesson they left you with?" — `content-metadata.ts:445`
- **Values Ranking** (activity) — card-sort of personal values (Essential / Important / Less important) — `content-metadata.ts:511`
- **Legacy Map** (activity) — timeline of meaningful life moments + reflection — `content-metadata.ts:528`

**Count: fw_s1 → 2 primary + 8 secondary**

---

## fw_s2 — "Organ and tissue donation" (special case)

**No Primary and no Secondary tags.** No material carries an `fw_s2` key — confirmed across
all reflect prompts and activities. By design, this section shows **no "Recommended" or "Also
relevant" subheaders**; the panel instead surfaces the document's tier-3 materials directly
under the panel header as a **flat list** (driven by the document-level signal, not by any
`fw_s2`-specific tag). Do not add `fw_s2` tags to "fix" the empty subheaders — the emptiness
is intentional.

**Count: fw_s2 → 0 primary + 0 secondary (flat document-level list only)**

---

## fw_s3 — "Final resting place"

**Primary (under Recommended — 2 items)**
- **"Wishes for your body"** — *prompt_9* — "How would you want your body to be handled after death, and why?" — `content-metadata.ts:254`
- **"Item for your resting place"** — *prompt_41* — "If you could choose one personal item to be included in your final resting place, what would it be?" — `content-metadata.ts:478`

**Secondary (under Also relevant — 3 items)**
- **"Controlling your death"** — *prompt_30* — "If you could control one aspect of your death, what would it be?" — `content-metadata.ts:400`
- **"Beliefs about death"** — *prompt_8* — "What do you believe happens when we die? How does this influence your relationship to death?" — `content-metadata.ts:248`
- **"Meaningful rituals"** — *prompt_40* — "What rituals or ceremonies—personal, cultural, or religious—are meaningful to you?" — `content-metadata.ts:470`

**Count: fw_s3 → 2 primary + 3 secondary**

---

## fw_s4 — "Ceremony and gathering"

**Primary (under Recommended — 3 items)**
- **"Favorite traditions"** — *prompt_7* — "What are a few of your favorite special traditions?" — `content-metadata.ts:242`
- **"Meaningful rituals"** — *prompt_40* — "What rituals or ceremonies—personal, cultural, or religious—are meaningful to you?" — `content-metadata.ts:470`
- **"How you'll be remembered"** — *prompt_39* — "What's one thing you hope people will always remember about you, no matter how much time has passed?" — `content-metadata.ts:464`

**Secondary (under Also relevant — 8 items)**
- **"Art that shaped you"** — *prompt_16* — "What's one book, movie, or piece of art that has deeply influenced how you think about life or death?" — `content-metadata.ts:294`
- **"Keeper of your stories"** — *prompt_31* — "Who knows the best stories about you?" — `content-metadata.ts:408`
- **"Sources of joy"** — *prompt_35* — "What are three things that bring you the most joy in life?" — `content-metadata.ts:438`
- **Values Ranking** (activity) — card-sort of personal values — `content-metadata.ts:511`
- **"Childhood funeral memories"** — *prompt_33* — "What were your childhood experiences of funerals or memorials? What impressions did they leave on you?" — `content-metadata.ts:423`
- **"Your legacy gift"** — *prompt_43* — "You have the opportunity to donate to one cause in your will. What's the focus of your legacy gift?" — `content-metadata.ts:490`
- **"Your greatest contribution"** — *prompt_42* — "If you could be remembered for one specific contribution to your community, family, or loved ones, what would it be?" — `content-metadata.ts:484`
- **"Witnessing a good death"** — *prompt_11* — "Have you ever witnessed someone have a 'good death'? What made it good?" — `content-metadata.ts:266`

**Count: fw_s4 → 3 primary + 8 secondary**

---

## fw_s5 — "Obituary and announcement"

**Primary (under Recommended — 4 items)**
- **"Your time capsule"** — *prompt_10* — "If you could leave behind a time capsule for future generations of your family, what 3 items would you include and why?" — `content-metadata.ts:260`
- **"Your obituary"** — *prompt_12* — "If you could write your own obituary, what key elements would you include?" — `content-metadata.ts:272`
- **"How you'll be remembered"** — *prompt_39* — "What's one thing you hope people will always remember about you, no matter how much time has passed?" — `content-metadata.ts:464`
- **"Your legacy gift"** — *prompt_43* — "You have the opportunity to donate to one cause in your will. What's the focus of your legacy gift?" — `content-metadata.ts:490`

**Secondary (under Also relevant — 8 items)**
- **"Art that shaped you"** — *prompt_16* — "What's one book, movie, or piece of art that has deeply influenced how you think about life or death?" — `content-metadata.ts:294`
- **"Keeper of your stories"** — *prompt_31* — "Who knows the best stories about you?" — `content-metadata.ts:408`
- **"Sources of joy"** — *prompt_35* — "What are three things that bring you the most joy in life?" — `content-metadata.ts:438`
- **"A mentor's lesson"** — *prompt_36* — "Think of a mentor or role model who has passed. What's the most valuable lesson they left you with?" — `content-metadata.ts:445`
- **"Letter to younger self"** — *prompt_38* — "If you had the chance to write a letter to your younger self about life's most important lessons, what would you include?" — `content-metadata.ts:458`
- **"Your greatest contribution"** — *prompt_42* — "If you could be remembered for one specific contribution to your community, family, or loved ones, what would it be?" — `content-metadata.ts:484`
- **Values Ranking** (activity) — card-sort of personal values — `content-metadata.ts:511`
- **Legacy Map** (activity) — timeline of meaningful life moments + reflection — `content-metadata.ts:528`

**Count: fw_s5 → 4 primary + 8 secondary**

---

## Section totals

| Section | Primary | Secondary | Total tags |
|---|---|---|---|
| fw_s1 | 2 | 8 | 10 |
| fw_s2 | 0 | 0 | 0 (flat document-level list) |
| fw_s3 | 2 | 3 | 5 |
| fw_s4 | 3 | 8 | 11 |
| fw_s5 | 4 | 8 | 12 |

---

## Default fall-through behavior (governs what actually surfaces)

The per-section lists above enumerate **tagged** placements only. At runtime the panel also
surfaces **untagged** activity outputs via a default fall-through:

- **Activity outputs are tiered on *every* section.** Where an activity has an `fw_s*` tag, that
  tag sets the tier (primary → Recommended, secondary → Also relevant). Where it has **no** tag
  for a section, it falls through to **tier-3 (Also relevant)** — *unless* the activity is
  `neverAutoSuggest` **and** carries no `fw_s*` tag anywhere in this document, in which case it is
  blocked entirely. (Code: the output loop in `funeral-wishes/page.tsx` — the only skip is the
  `neverAutoSuggest && !hasAnySupDocTag(...)` gate; every other output hits `else tier3.push`.)
- **Why this matters less here than in My Care Wishes:** the activities that surface in
  funeral-wishes (Values Ranking, Legacy Map) carry explicit `fw_s*` tags, so their presence is
  already enumerated above; the fall-through just adds **tier-3 (Also relevant)** appearances on
  the *other* sections they aren't tagged for. Fears Ranking is `neverAutoSuggest` with no `fw_s*`
  tag → blocked here entirely. So absence of an `fw_s*` tag does **not** by itself mean excluded —
  only `neverAutoSuggest` + no tag does.
- **Render gate:** a Legacy Map card renders only when it has reflection text (note-first, then
  legacy content fallback); an empty reflection hides it.
- **Reflect-prompt notes** use a stricter rule — they require a document-level signal
  (`noteHasSupDocSignal`) to auto-surface, so untagged prompt notes do **not** fall through.

This fall-through is **intended behavior** (confirmed 2026-06-22). Documented here for symmetry
with the My Care Wishes reference; see the methodological note (logic-trace pass) in project
memory.

---

## Notes & design intent (read before re-tiering)

1. **fw_s2 is deliberately tag-free** (see its section above) — it relies on the
   document-level signal to surface tier-3 materials flat, with no subheaders.

2. **Activities surface as expected here.** Values Ranking (no `neverAutoSuggest`) appears at
   fw_s1/fw_s4/fw_s5 (secondary). Legacy Map (`insertionBehavior: 'view_only'`, no
   `neverAutoSuggest`) appears at fw_s1/fw_s5 (secondary). Fears Ranking is `neverAutoSuggest`
   and carries **no** `fw_s*` tag, so it never appears in this document.

3. **Cross-document asymmetries:** Legacy Map and Values Ranking appear here *and* the items
   carry the right tags; Scenario Navigator and Fears Ranking do **not** appear in
   funeral-wishes (no `fw_s*` tags). See the My Care Wishes reference for the mirror side.

4. **Multi-section prompts are expected.** Several prompts legitimately appear across multiple
   sections (e.g. prompt_39 is primary in fw_s1, fw_s4, and fw_s5; prompt_42 spans all three;
   prompt_16/prompt_31 are secondary in fw_s1/fw_s4/fw_s5). A prompt appearing in more than
   one section is by design, not duplication.
