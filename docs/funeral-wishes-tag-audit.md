# Funeral Wishes — Question-Level Tag Audit (working document)

**Purpose.** A reference for auditing how reflect prompts and activity outputs are tagged for the five *surfacing* sections of the **Wishes for My Body, Funeral & Ceremony** document. Use it to evaluate semantic relevance section by section without cross-referencing source files.

**Status.** Pre-launch research artifact. No code changes. After the audit, re-tagging instructions land in a future session.

## How tagging works (so the audit is grounded)

- A material (a reflect prompt, or an activity output) declares `supplementaryDocumentRelevance: { fw_sN: 'primary' | 'secondary' }` in `lib/content-metadata.ts`.
- In the Funeral Wishes panel, when a section is open: **primary → "Recommended"**, **secondary → "Also relevant"**. A material with *no* tag for a section can still appear under "Also relevant" only if it has a tag for *some other* section in this document (the document-level signal) — but this audit is about the **explicit fw_s tags**, which is what drives where a material is *recommended*.
- A material may be tagged for **multiple** fw_s sections; cross-tags are noted inline as `[also: …]`.

**Two separate tag systems — don't conflate.** Materials also carry `primaryTag` / `secondaryTags` of type `InternalTag` (e.g. `values`, `fears`, `care_preferences`). That is a **legacy/dead** classification and does **not** drive fw_s surfacing. This audit concerns only `supplementaryDocumentRelevance` fw_s keys.

**Sources.** Prompt tags + full text: `lib/content-metadata.ts` `REFLECT_PROMPT_META` (prompt_1–prompt_43) and `app/app/activities/prompts/page.tsx` `PROMPTS`. Activity tags: `lib/content-metadata.ts` `ACTIVITY_META`. Section labels: `app/app/capture/funeral-wishes/page.tsx` `SECTIONS`.

**fw_s6 ("A note to the people carrying this out") is intentionally non-surfacing** — it has no question id and carries no tags. Excluded from this audit by design.

> Note on "full question text": unlike the advance-directive questions (q1–q6, which are single sentences), the funeral sections are **topic areas** with their own heading and multiple fields. There is no longer single-sentence question — the heading *is* the section's text. Each section below lists its heading plus a one-line scope so you can judge relevance.

---

## At-a-glance counts

| Section | Heading | Primary | Secondary |
|---|---|---|---|
| **fw_s1** | What matters most to me | 3 | 10 |
| **fw_s2** | Organ and tissue donation | **0** | 5 |
| **fw_s3** | Final resting place | 3 | 4 |
| **fw_s4** | Ceremony and gathering | 4 | 5 |
| **fw_s5** | Obituary and announcement | 4 | 10 |

`fw_s2` is the flagged case: **0 primary**, and all 5 secondaries are healthcare / quality-of-life prompts with no connection to donation.

---

## fw_s1 — "What matters most"

**Count: 3 primary, 10 secondary**
**Scope:** A single open reflection — the overarching priorities/values that should guide decisions about the user's body, funeral, and how they're remembered.

### Primary
- **prompt_9 — "Wishes for your body"** — *"How would you want your body to be handled after death, and why?"*  `[also: fw_s3 primary]`
- **prompt_39 — "How you'll be remembered"** — *"What's one thing you hope people will always remember about you, no matter how much time has passed?"*  `[also: fw_s5 primary]`
- **prompt_42 — "Your greatest contribution"** — *"If you could be remembered for one specific contribution to your community, family, or loved ones, what would it be?"*  `[also: fw_s5 secondary]`

### Secondary
- **prompt_16 — "Art that shaped you"** — *"What's one book, movie, or piece of art that has deeply influenced how you think about life or death?"*  `[also: fw_s4 secondary, fw_s5 secondary]`
- **prompt_17 — "Something held back"** — *"What's one thing you've been holding back from doing or saying that would bring you peace if you acted on it?"*  `[also: fw_s4 secondary]`
- **prompt_18 — "With months to live"** — *"If you found out you had a few months left, what would you change about your life?"*  `[also: fw_s5 secondary]`
- **prompt_27 — "Seeking forgiveness"** — *"Is there anything you would want to be forgiven for before you die?"*  `[also: fw_s4 primary]`
- **prompt_28 — "Offering forgiveness"** — *"Is there anyone or anything you would want to forgive before you die?"*  `[also: fw_s4 primary]`
- **prompt_29 — "Permission to live"** — *"If you had one year to live, what would you give yourself permission to do?"*  `[also: fw_s5 secondary]`
- **prompt_31 — "Keeper of your stories"** — *"Who knows the best stories about you?"*  `[also: fw_s4 secondary, fw_s5 secondary]`
- **prompt_36 — "A mentor's lesson"** — *"Think of a mentor or role model who has passed. What's the most valuable lesson they left you with?"*  `[also: fw_s5 secondary]`
- **Values Ranking** (activity output) — the user's ranked personal values (Essential / Important / Less central).  `[also: fw_s4 secondary, fw_s5 secondary]`
- **Legacy Map** (activity output) — reflections from the user's life-timeline exercise (themes, surprises, values to pass on).  `[also: fw_s5 secondary]`

### Available materials NOT currently tagged for fw_s1
prompt_4 "First experience with death" · prompt_7 "Favorite traditions" · prompt_8 "Beliefs about death" · prompt_10 "Your time capsule" · prompt_11 "Witnessing a good death" · prompt_12 "Your obituary" · prompt_19 "Accepting personal care" · prompt_20 "Health care worries" · prompt_23 "Stressful situations" · prompt_25 "Living in your body" · prompt_26 "Quality of life" · prompt_30 "Controlling your death" · prompt_33 "Childhood funeral memories" · prompt_35 "Sources of joy" · prompt_38 "Letter to younger self" · prompt_40 "Meaningful rituals" · prompt_41 "Item for your resting place" · prompt_43 "Your legacy gift"

---

## fw_s2 — "Organ and tissue donation"

**Count: 0 primary, 5 secondary**  ⚠️ flagged
**Scope:** Donation wishes (whether and what to donate), specific organs or tissues, and any notes. Narrowly about **organ/tissue donation**.

### Primary
*(none)*

### Secondary
- **prompt_19 — "Accepting personal care"** — *"If you needed help going to the bathroom or bathing, who would you feel most comfortable asking?"*  `[also: q6 primary]`
- **prompt_20 — "Health care worries"** — *"What do you worry most about when thinking about your future health and care?"*  `[also: q5 primary]`
- **prompt_23 — "Stressful situations"** — *"What situations do you find stressful or difficult?"*  `[also: q5 secondary]`  ← *the one surfaced during 1C verification*
- **prompt_25 — "Living in your body"** — *"Fill in the blank: I want to live in my body as long as…"*  `[also: q4 primary]`
- **prompt_26 — "Quality of life"** — *"What does quality of life mean to you?"*  `[also: q2 primary, q4 primary]`

> Observation: every secondary here is a **healthcare / quality-of-life / advance-directive** prompt (note the `[also: q…]` cross-tags — they belong to the advance-directive questions). None concerns donation. And there are **no primaries**, so this section recommends nothing and "also-relevant" surfaces only off-topic material.

### Available materials NOT currently tagged for fw_s2
*(everything else in the funeral pool)* — prompt_4 "First experience with death" · prompt_7 "Favorite traditions" · prompt_8 "Beliefs about death" · prompt_9 "Wishes for your body" · prompt_10 "Your time capsule" · prompt_11 "Witnessing a good death" · prompt_12 "Your obituary" · prompt_16 "Art that shaped you" · prompt_17 "Something held back" · prompt_18 "With months to live" · prompt_27 "Seeking forgiveness" · prompt_28 "Offering forgiveness" · prompt_29 "Permission to live" · prompt_30 "Controlling your death" · prompt_31 "Keeper of your stories" · prompt_33 "Childhood funeral memories" · prompt_35 "Sources of joy" · prompt_36 "A mentor's lesson" · prompt_38 "Letter to younger self" · prompt_39 "How you'll be remembered" · prompt_40 "Meaningful rituals" · prompt_41 "Item for your resting place" · prompt_42 "Your greatest contribution" · prompt_43 "Your legacy gift" · Values Ranking · Legacy Map
> (None of the existing pool is clearly about donation either — fw_s2 may simply have no semantically-matching reflect prompt, which is worth deciding explicitly.)

---

## fw_s3 — "Final resting place"

**Count: 3 primary, 4 secondary**
**Scope:** Body disposition (burial, cremation, aquamation, mausoleum, body donation, home funeral), location, casket / embalming preferences, and memorial marker.

### Primary
- **prompt_9 — "Wishes for your body"** — *"How would you want your body to be handled after death, and why?"*  `[also: fw_s1 primary]`
- **prompt_30 — "Controlling your death"** — *"If you could control one aspect of your death, what would it be?"*  `[also: q1 secondary]`
- **prompt_41 — "Item for your resting place"** — *"If you could choose one personal item to be included in your final resting place, what would it be?"*

### Secondary
- **prompt_4 — "First experience with death"** — *"What was your earliest experience with death? What do you remember about it?"*
- **prompt_8 — "Beliefs about death"** — *"What do you believe happens when we die? How does this influence your relationship to death?"*
- **prompt_11 — "Witnessing a good death"** — *"Have you ever witnessed someone have a 'good death'? What made it good?"*  `[also: q1 secondary]`
- **prompt_33 — "Childhood funeral memories"** — *"What were your childhood experiences of funerals or memorials? What impressions did they leave on you?"*

### Available materials NOT currently tagged for fw_s3
prompt_7 "Favorite traditions" · prompt_10 "Your time capsule" · prompt_12 "Your obituary" · prompt_16 "Art that shaped you" · prompt_17 "Something held back" · prompt_18 "With months to live" · prompt_19 "Accepting personal care" · prompt_20 "Health care worries" · prompt_23 "Stressful situations" · prompt_25 "Living in your body" · prompt_26 "Quality of life" · prompt_27 "Seeking forgiveness" · prompt_28 "Offering forgiveness" · prompt_29 "Permission to live" · prompt_31 "Keeper of your stories" · prompt_35 "Sources of joy" · prompt_36 "A mentor's lesson" · prompt_38 "Letter to younger self" · prompt_39 "How you'll be remembered" · prompt_40 "Meaningful rituals" · prompt_42 "Your greatest contribution" · prompt_43 "Your legacy gift" · Values Ranking · Legacy Map

---

## fw_s4 — "Ceremony and gathering"

**Count: 4 primary, 5 secondary**
**Scope:** Cultural/religious traditions, officiant, gatherings (while alive and after), funeral/memorial service wants (public/private, location, coordinator, speakers, music, flowers, charitable donations), and things explicitly *not* wanted.

### Primary
- **prompt_7 — "Favorite traditions"** — *"What are a few of your favorite special traditions?"*
- **prompt_27 — "Seeking forgiveness"** — *"Is there anything you would want to be forgiven for before you die?"*  `[also: fw_s1 secondary]`
- **prompt_28 — "Offering forgiveness"** — *"Is there anyone or anything you would want to forgive before you die?"*  `[also: fw_s1 secondary]`
- **prompt_40 — "Meaningful rituals"** — *"What rituals or ceremonies—personal, cultural, or religious—are meaningful to you?"*  `[also: q1 secondary]`

### Secondary
- **prompt_16 — "Art that shaped you"** — *"What's one book, movie, or piece of art that has deeply influenced how you think about life or death?"*  `[also: fw_s1 secondary, fw_s5 secondary]`
- **prompt_17 — "Something held back"** — *"What's one thing you've been holding back from doing or saying that would bring you peace if you acted on it?"*  `[also: fw_s1 secondary]`
- **prompt_31 — "Keeper of your stories"** — *"Who knows the best stories about you?"*  `[also: fw_s1 secondary, fw_s5 secondary]`
- **prompt_35 — "Sources of joy"** — *"What are three things that bring you the most joy in life?"*  `[also: fw_s5 secondary]`
- **Values Ranking** (activity output) — ranked personal values.  `[also: fw_s1 secondary, fw_s5 secondary]`

### Available materials NOT currently tagged for fw_s4
prompt_4 "First experience with death" · prompt_8 "Beliefs about death" · prompt_9 "Wishes for your body" · prompt_10 "Your time capsule" · prompt_11 "Witnessing a good death" · prompt_12 "Your obituary" · prompt_18 "With months to live" · prompt_19 "Accepting personal care" · prompt_20 "Health care worries" · prompt_23 "Stressful situations" · prompt_25 "Living in your body" · prompt_26 "Quality of life" · prompt_29 "Permission to live" · prompt_30 "Controlling your death" · prompt_33 "Childhood funeral memories" · prompt_36 "A mentor's lesson" · prompt_38 "Letter to younger self" · prompt_39 "How you'll be remembered" · prompt_41 "Item for your resting place" · prompt_42 "Your greatest contribution" · prompt_43 "Your legacy gift" · Legacy Map

---

## fw_s5 — "Obituary and announcement"

**Count: 4 primary, 10 secondary**
**Scope:** Whether/what kind of obituary, its content, who writes it, where it's published, online presence, and charitable donations in memory.

### Primary
- **prompt_10 — "Your time capsule"** — *"If you could leave behind a time capsule for future generations of your family, what 3 items would you include and why?"*
- **prompt_12 — "Your obituary"** — *"If you could write your own obituary, what key elements would you include?"*
- **prompt_39 — "How you'll be remembered"** — *"What's one thing you hope people will always remember about you, no matter how much time has passed?"*  `[also: fw_s1 primary]`
- **prompt_43 — "Your legacy gift"** — *"You have the opportunity to donate to one cause in your will. What's the focus of your legacy gift?"*

### Secondary
- **prompt_16 — "Art that shaped you"** — *"What's one book, movie, or piece of art that has deeply influenced how you think about life or death?"*  `[also: fw_s1 secondary, fw_s4 secondary]`
- **prompt_18 — "With months to live"** — *"If you found out you had a few months left, what would you change about your life?"*  `[also: fw_s1 secondary]`
- **prompt_29 — "Permission to live"** — *"If you had one year to live, what would you give yourself permission to do?"*  `[also: fw_s1 secondary]`
- **prompt_31 — "Keeper of your stories"** — *"Who knows the best stories about you?"*  `[also: fw_s1 secondary, fw_s4 secondary]`
- **prompt_35 — "Sources of joy"** — *"What are three things that bring you the most joy in life?"*  `[also: fw_s4 secondary]`
- **prompt_36 — "A mentor's lesson"** — *"Think of a mentor or role model who has passed. What's the most valuable lesson they left you with?"*  `[also: fw_s1 secondary]`
- **prompt_38 — "Letter to younger self"** — *"If you had the chance to write a letter to your younger self about life's most important lessons, what would you include?"*
- **prompt_42 — "Your greatest contribution"** — *"If you could be remembered for one specific contribution to your community, family, or loved ones, what would it be?"*  `[also: fw_s1 primary]`
- **Values Ranking** (activity output) — ranked personal values.  `[also: fw_s1 secondary, fw_s4 secondary]`
- **Legacy Map** (activity output) — life-timeline reflections.  `[also: fw_s1 secondary]`

### Available materials NOT currently tagged for fw_s5
prompt_4 "First experience with death" · prompt_7 "Favorite traditions" · prompt_8 "Beliefs about death" · prompt_9 "Wishes for your body" · prompt_11 "Witnessing a good death" · prompt_17 "Something held back" · prompt_19 "Accepting personal care" · prompt_20 "Health care worries" · prompt_23 "Stressful situations" · prompt_25 "Living in your body" · prompt_26 "Quality of life" · prompt_27 "Seeking forgiveness" · prompt_28 "Offering forgiveness" · prompt_30 "Controlling your death" · prompt_33 "Childhood funeral memories" · prompt_40 "Meaningful rituals" · prompt_41 "Item for your resting place"

---

## Appendix — full funeral-wishes material pool (every material with ≥1 fw_s tag)

29 prompts + 2 activities = 31 materials.

| Material | fw_s tags |
|---|---|
| prompt_4 "First experience with death" | fw_s3 sec |
| prompt_7 "Favorite traditions" | fw_s4 **PRI** |
| prompt_8 "Beliefs about death" | fw_s3 sec |
| prompt_9 "Wishes for your body" | fw_s1 **PRI**, fw_s3 **PRI** |
| prompt_10 "Your time capsule" | fw_s5 **PRI** |
| prompt_11 "Witnessing a good death" | fw_s3 sec |
| prompt_12 "Your obituary" | fw_s5 **PRI** |
| prompt_16 "Art that shaped you" | fw_s1 sec, fw_s4 sec, fw_s5 sec |
| prompt_17 "Something held back" | fw_s1 sec, fw_s4 sec |
| prompt_18 "With months to live" | fw_s1 sec, fw_s5 sec |
| prompt_19 "Accepting personal care" | fw_s2 sec |
| prompt_20 "Health care worries" | fw_s2 sec |
| prompt_23 "Stressful situations" | fw_s2 sec |
| prompt_25 "Living in your body" | fw_s2 sec |
| prompt_26 "Quality of life" | fw_s2 sec |
| prompt_27 "Seeking forgiveness" | fw_s1 sec, fw_s4 **PRI** |
| prompt_28 "Offering forgiveness" | fw_s1 sec, fw_s4 **PRI** |
| prompt_29 "Permission to live" | fw_s1 sec, fw_s5 sec |
| prompt_30 "Controlling your death" | fw_s3 **PRI** |
| prompt_31 "Keeper of your stories" | fw_s1 sec, fw_s4 sec, fw_s5 sec |
| prompt_33 "Childhood funeral memories" | fw_s3 sec |
| prompt_35 "Sources of joy" | fw_s4 sec, fw_s5 sec |
| prompt_36 "A mentor's lesson" | fw_s1 sec, fw_s5 sec |
| prompt_38 "Letter to younger self" | fw_s5 sec |
| prompt_39 "How you'll be remembered" | fw_s1 **PRI**, fw_s5 **PRI** |
| prompt_40 "Meaningful rituals" | fw_s4 **PRI** |
| prompt_41 "Item for your resting place" | fw_s3 **PRI** |
| prompt_42 "Your greatest contribution" | fw_s1 **PRI**, fw_s5 sec |
| prompt_43 "Your legacy gift" | fw_s5 **PRI** |
| Values Ranking (activity) | fw_s1 sec, fw_s4 sec, fw_s5 sec |
| Legacy Map (activity) | fw_s1 sec, fw_s5 sec |

> Prompts in the full set (prompt_1–43) but **not** in this pool — i.e. tagged only for advance-directive q-questions or untagged — are out of scope for the funeral doc: prompt_1, 2, 3, 5, 6, 13, 14, 15, 21, 22, 24, 32, 34, 37. (None carry an fw_s tag.)
