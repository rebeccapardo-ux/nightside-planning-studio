# My Care Wishes — Placement Reference

**Canonical source of truth** for which reflect prompts and activities surface in each
section (q1–q6) of the **My Care Wishes** document (`advance_directive_supplement`), and at
which tier (Primary = "Recommended", Secondary = "Also relevant").

- **Status:** Reviewed and confirmed by the maintainer (2026-06-21).
- **Derived from:** the `supplementaryDocumentRelevance` field on each `REFLECT_PROMPT_META`
  and `ACTIVITY_META` entry in `lib/content-metadata.ts`. This document is **policy**; the
  data in `content-metadata.ts` is the **mechanism**. They must agree — if you change the
  data, update this document in the same PR (see CLAUDE.md → "Placement rules for wishes
  documents and domain pages").
- **Tier mapping:** `'primary'` → Recommended; `'secondary'` → Also relevant. The per-section
  lists below enumerate **tagged** placements only — untagged activity outputs also surface by a
  default fall-through (tier-3 on every question). See **"Default fall-through behavior"** below;
  read it before assuming an untagged item is excluded.

> **On titles:** `content-metadata.ts` stores only the **full prompt text** (the `label`
> field); there is no short-title field. The short titles in quotes below are *editorial*
> (for readability). Activities (`ACTIVITY_META`) store only `id` + tags — no label or
> description — so their descriptions are editorial too. Only the full prompt text and the
> tier are authoritative. `file:line` refs are as of 2026-06-21.

---

## q1 — "My perfect death would involve:"

**Primary (under Recommended — 2 items)**
- **"Setting for your final moments"** — *prompt_5* — "If you could choose the setting for your final moments, where would you be and who would be with you?" — `content-metadata.ts:230`
- **"A good day"** — *prompt_22* — "What does a good day look like for you?" — `content-metadata.ts:341`

**Secondary (under Also relevant — 5 items)**
- **"Witnessing a good death"** — *prompt_11* — "Have you ever witnessed someone have a 'good death'? What made it good?" — `content-metadata.ts:266`
- **"A few months left"** — *prompt_18* — "If you found out you had a few months left, what would you change about your life?" — `content-metadata.ts:309`
- **"Controlling your death"** — *prompt_30* — "If you could control one aspect of your death, what would it be?" — `content-metadata.ts:400`
- **"Meaningful rituals"** — *prompt_40* — "What rituals or ceremonies—personal, cultural, or religious—are meaningful to you?" — `content-metadata.ts:470`
- **Scenario Navigator** (activity) — guided end-of-life decision scenarios — `content-metadata.ts:534`

**Count: q1 → 2 primary + 5 secondary**

---

## q2 — "At the end of my life, this is what matters most:"

**Primary (under Recommended — 4 items)**
- **"What matters most now"** — *prompt_1* — "What matters most to you right now?" — `content-metadata.ts:206`
- **"What your decision-maker should understand"** — *prompt_2* — "What would you want someone making decisions for you to understand?" — `content-metadata.ts:213`
- **"Who decides for you"** — *prompt_6* — "If you were unable to make decisions for yourself, who would you want to make those decisions, and why?" — `content-metadata.ts:236`
- **"Quality of life"** — *prompt_26* — "What does quality of life mean to you?" — `content-metadata.ts:371`

**Secondary (under Also relevant — 3 items)**
- **"Who you trust with secrets"** — *prompt_32* — "Who do you trust with your secrets?" — `content-metadata.ts:416`
- **Values Ranking** (activity) — card-sort of personal values (Essential / Important / Less important) — `content-metadata.ts:511`
- **Scenario Navigator** (activity) — guided end-of-life decision scenarios — `content-metadata.ts:534`

**Count: q2 → 4 primary + 3 secondary**

---

## q3 — "My most important personal values:"

**Primary (under Recommended — 1 item)**
- **Values Ranking** (activity) — card-sort of personal values — `content-metadata.ts:511`

**Secondary (under Also relevant — 4 items)**
- **"What matters most now"** — *prompt_1* — "What matters most to you right now?" — `content-metadata.ts:206`
- **"What your decision-maker should understand"** — *prompt_2* — "What would you want someone making decisions for you to understand?" — `content-metadata.ts:213`
- **"Sources of strength and comfort"** — *prompt_24* — "Reflecting on challenges you've had in the past, what has brought you strength and comfort?" — `content-metadata.ts:356`
- **"Sources of joy"** — *prompt_35* — "What are three things that bring you the most joy in life?" — `content-metadata.ts:438`

**Count: q3 → 1 primary + 4 secondary**

---

## q4 — "What would make prolonging life unacceptable for me:"

**Primary (under Recommended — 2 items)**
- **"Live in my body as long as…"** — *prompt_25* — "Fill in the blank: I want to live in my body as long as…" — `content-metadata.ts:363`
- **"Quality of life"** — *prompt_26* — "What does quality of life mean to you?" — `content-metadata.ts:371`

**Secondary (under Also relevant — 2 items)**
- **"A few months left"** — *prompt_18* — "If you found out you had a few months left, what would you change about your life?" — `content-metadata.ts:309`
- **Scenario Navigator** (activity) — guided end-of-life decision scenarios — `content-metadata.ts:534`

**Count: q4 → 2 primary + 2 secondary**

---

## q5 — "When I think about death, this is what I worry about:"

**Primary (under Recommended — 2 items)**
- **"Worries about future care"** — *prompt_20* — "What do you worry most about when thinking about your future health and care?" — `content-metadata.ts:325`
- **Fears Ranking** (activity) — card-sort of fears/concerns. Carries `neverAutoSuggest`, but the explicit `q5: 'primary'` tag is a document-level signal that surfaces it **here and only here** in this document — `content-metadata.ts:521`

**Secondary (under Also relevant — 3 items)**
- **"What feels unresolved"** — *prompt_3* — "What feels unresolved or unclear?" — `content-metadata.ts:219`
- **"Stressful situations"** — *prompt_23* — "What situations do you find stressful or difficult?" — `content-metadata.ts:349`
- **"Hardest to accept about death"** — *prompt_34* — "What aspect of death or dying have you struggled the most to accept or understand?" — `content-metadata.ts:430`

**Count: q5 → 2 primary + 3 secondary**

---

## q6 — "What I want my caregiver/care team to know:"

**Primary (under Recommended — 1 item)**
- **"Who you'd want for personal care"** — *prompt_19* — "If you needed help going to the bathroom or bathing, who would you feel most comfortable asking?" — `content-metadata.ts:317`

**Secondary (under Also relevant — 4 items)**
- **"Setting for your final moments"** — *prompt_5* — "If you could choose the setting for your final moments, where would you be and who would be with you?" — `content-metadata.ts:230`
- **"Your favorite routine"** — *prompt_14* — "What is your favorite routine or habit?" — `content-metadata.ts:283`
- **"Who you go to for advice"** — *prompt_21* — "Who do you go to first for advice?" — `content-metadata.ts:333`
- **"A good day"** — *prompt_22* — "What does a good day look like for you?" — `content-metadata.ts:341`

**Count: q6 → 1 primary + 4 secondary**

---

## Section totals

| Section | Primary | Secondary | Total tags |
|---|---|---|---|
| q1 | 2 | 5 | 7 |
| q2 | 4 | 3 | 7 |
| q3 | 1 | 4 | 5 |
| q4 | 2 | 2 | 4 |
| q5 | 2 | 3 | 5 |
| q6 | 1 | 4 | 5 |

---

## Default fall-through behavior (governs what actually surfaces)

The per-section lists above enumerate **tagged** placements only. At runtime the panel also
surfaces **untagged** items via a default fall-through, so the lists are not the complete set of
what appears:

- **Activity outputs are tiered on *every* question.** Where an activity has a `q*` tag, that tag
  sets the tier (primary → Recommended, secondary → Also relevant). Where it has **no** tag for a
  question, it falls through to **tier-3 (Also relevant)** — *unless* the activity is
  `neverAutoSuggest` **and** carries no `q*` tag anywhere in this document, in which case it is
  blocked entirely. (Code: the output loop in `advance-directive/page.tsx` — the only skip is the
  `neverAutoSuggest && !hasAnySupDocTag(...)` gate; every other output hits `else tier3.push`.)
- **Absence of a `q*` tag does NOT mean excluded.** A non-`neverAutoSuggest` activity with zero
  `q*` tags still appears at tier-3 on all six questions.
- **Render gate:** a Legacy Map card renders only when it has reflection text (note-first, then
  legacy content fallback); an empty reflection hides it. So fall-through visibility also depends
  on the user actually having that content.
- **Reflect-prompt notes use a stricter rule** — they require a document-level signal
  (`noteHasSupDocSignal`) to auto-surface, so untagged prompt notes do **not** fall through. The
  fall-through described here applies to **activity outputs**, not notes.

This fall-through is **intended behavior** (confirmed 2026-06-22, "Option β"). The section was
added after an audit found the original `q*` extraction documented only tagged placements and
missed it — see the methodological note (logic-trace pass) in project memory.

---

## Notes & design intent (read before re-tiering)

1. **Thin-primary sections (sparse, but not empty):**
   - **q3 ("My most important personal values") has exactly one primary — and it's an
     *activity* (Values Ranking), not a prompt.** No reflect prompt is tagged `q3: 'primary'`;
     the values-oriented prompts (prompt_1, prompt_2) sit at `q3: 'secondary'`. Intentional —
     the activity *is* the values exercise.
   - **q6 ("What I want my caregiver/care team to know") has a single primary** (prompt_19).

2. **`neverAutoSuggest` — nothing is silently blocked from this document.** Fears Ranking is
   the only `neverAutoSuggest` activity; it carries `q5: 'primary'`, so it surfaces (only) at
   q5. No activity is both `neverAutoSuggest` and absent of any `q*` tag.

3. **Cross-document asymmetries (which activity lives in which doc):**
   - **Legacy Map auto-surfaces at tier-3 ("Also relevant") on every q* question** via the
     default fall-through (see the section above) — it carries only `fw_s1`/`fw_s5` tags and no
     `q*` tag, and because it is *not* `neverAutoSuggest` it is **not** blocked. It renders
     wherever the user has a Legacy Map reflection (note-first; legacy content fallback). It
     *also* appears in funeral-wishes, where it is explicitly tagged `fw_s1`/`fw_s5`. *(Corrected
     2026-06-22 — previously, and wrongly, described as "absent from My Care Wishes entirely.")*
   - **Scenario Navigator is the mirror image** — it appears only in My Care Wishes
     (q1/q2/q4) and has no `fw_s*` tag, so it's absent from funeral-wishes.
   - **Fears Ranking** is also My-Care-Wishes-only (q5). **Values Ranking** is the one
     activity that appears in *both* documents.

4. **One prompt-vs-activity tier inversion worth eyeballing:** prompt_1 ("What matters most
   to you right now?") is `q2: 'primary'` but `q3: 'secondary'` — so on the values question
   (q3) the dedicated values prompt is "Also relevant," because the Values Ranking activity
   holds the sole primary slot there.
