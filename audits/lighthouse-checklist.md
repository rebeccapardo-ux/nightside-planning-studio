# Lighthouse manual run checklist

Run Lighthouse → **Accessibility** category only (uncheck the others to speed it up) in Chrome DevTools, against the deployed staging/prod URL, in **Incognito** with all extensions off.

For each route:
1. Open the route, wait for any loading state to clear.
2. If a tour or modal would normally appear on first visit, clear the matching `localStorage` key so the overlay fires.
3. Run Lighthouse twice — once at **desktop (1440×900)** and once at **mobile (375×667, "Mobile" emulation)**. Tick the corresponding box.
4. Paste the Accessibility score (and any failing items) into the right-hand column below.

| ☐ Route | Desktop ✓ | Mobile ✓ | Score / failing items |
|---|:---:|:---:|---|
| **Auth + public** | | | |
| `/login` (landing redirect) |  |  |  |
| `/auth/signup` |  |  |  |
| `/auth/signin` |  |  |  |
| `/auth/forgot-password` |  |  |  |
| `/auth/signup/payment` (Stripe wrapper — audit our page only) |  |  |  |
| `/auth/signup/success` |  |  |  |
| `/auth/signup/cancel` |  |  |  |
| `/privacy` |  |  |  |
| `/terms` |  |  |  |
| **Platform — top-level** | | | |
| `/app` (home) |  |  |  |
| `/app/plan` |  |  |  |
| `/app/plan/all` |  |  |  |
| `/app/plan/export` |  |  |  |
| `/app/reflect` (index) |  |  |  |
| `/app/learn` (index) |  |  |  |
| `/app/about` |  |  |  |
| `/app/help` |  |  |  |
| `/app/account` |  |  |  |
| **Domain pages** | | | |
| `/app/domains/<id>` — pick one in **null state** (fresh account or never-touched domain) |  |  |  |
| `/app/domains/<id>` — same one with **some content entered** (one orient toggle + one checkbox) |  |  |  |
| **Capture documents** | | | |
| `/app/capture/advance-directive` — null state |  |  |  |
| `/app/capture/advance-directive` — partially completed |  |  |  |
| `/app/capture/funeral-wishes` |  |  |  |
| `/app/capture/personal-admin` |  |  |  |
| `/app/capture/important-contacts` |  |  |  |
| `/app/capture/financial-information` |  |  |  |
| `/app/capture/devices-and-accounts` |  |  |  |
| `/app/capture/keepsake-inventory` |  |  |  |
| **Activities** | | | |
| `/app/reflect/values-ranking` (bucket selection) |  |  |  |
| `/app/reflect/fears-ranking` |  |  |  |
| `/app/reflect/legacy-map` (canvas) |  |  |  |
| `/app/reflect/reflection-prompts` (index) |  |  |  |
| `/app/reflect/prompts?id=<promptId>` (single prompt) |  |  |  |
| `/app/reflect/scenario-navigator` (selection view) |  |  |  |
| `/app/reflect/scenario-navigator?scenario=<id>` (scenario view) |  |  |  |
| `/app/reflect/scenario-navigator?…&choice=<id>` (outcome view) |  |  |  |
| **Learn** | | | |
| `/app/learn/healthcare` |  |  |  |
| `/app/learn/deathcare` |  |  |  |
| `/app/learn/legacy` |  |  |  |
| `/app/learn/personal-admin` |  |  |  |
| `/app/learn/ritual` |  |  |  |
| `/app/learn/wills` |  |  |  |
| `/app/learn/trivia` |  |  |  |
| **Onboarding** | | | |
| `/app/onboarding/legacy-contact` |  |  |  |
| **Entries (view / export)** | | | |
| `/app/entries/<id>` — pick any saved entry |  |  |  |
| `/app/entries/<id>/export` |  |  |  |
| **Modals / overlays** (run on whichever route they live on; open the overlay first) | | | |
| Notepad modal (any signed-in route → top-right Notepad button) |  |  |  |
| Feedback modal (footer → Send feedback) |  |  |  |
| Materials browser modal (a wishes doc → "+ Add materials") |  |  |  |
| SlidePanel mobile drawer (wishes doc on `<768px` → "See relevant materials") |  |  |  |
| Plan-tour overlay (clear `nightside.tour.planPage:{uid}` to retrigger) |  |  |  |
| Domain-tour overlay (clear `nightside.tour.domain:{uid}` to retrigger) |  |  |  |
| Welcome modal (account where it still fires) |  |  |  |

---

## How to capture findings

For each failing item Lighthouse reports, copy the **audit ID** (e.g. `color-contrast`, `label`, `tap-targets`) plus a one-line note on what's failing, into the **"Score / failing items"** cell. Don't paste the whole report — a representative slice is enough.

Common Lighthouse a11y audit IDs:
- `color-contrast` — text/background pairs failing 4.5:1 (or 3:1 for large text / UI)
- `label` — form elements with no accessible name
- `link-name` — links with no discernible text (e.g., icon-only links missing aria-label)
- `button-name` — buttons with no discernible text
- `aria-*` family — missing required ARIA attrs, invalid ARIA values, etc.
- `tap-targets` — mobile interactive elements smaller than 48×48 CSS px
- `heading-order` — h1→h3 skips
- `landmark-*` — missing landmarks
- `image-alt` — missing alt
- `meta-viewport` — viewport meta misconfigured (probably fine across the board)

## When you're done

Drop the filled checklist back to me and I'll fold the findings into a `## Lighthouse run` section of `audits/a11y-audit-2026-05.md`, deduped against what we already know from the lint pass.
