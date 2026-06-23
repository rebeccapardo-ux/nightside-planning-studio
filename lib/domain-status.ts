// Domain planning-status helpers — the single source of truth for a domain's
// qualitative status text. Pass 2 wires `qualitativeLabel` into the domain page
// status label, DomainStateCard (Plan cards), and buildDomainStatuses
// (release/export PDF), replacing the three drifted copies it supersedes:
//   - count-based qualitativePhrase in app/app/domains/[domainId]/page.tsx
//   - %-based qualitativeLabel in app/components/DomainStateCard.tsx
//   - %-based qualitativeLabel in lib/pdf/buildPlanData.ts
// (The analytics-only computePlanningStatus in lib/analytics.ts is a separate
// concern — different vocabulary, different purpose — and is NOT replaced.)
//
// Model (Pass 2): `checked` / `total` are CHECKBOXES, not rows — each readiness
// checkbox is one planning-status segment. Thresholds (Option β):
//   0% checked             -> 'Not yet started'
//   >0% to <50% checked    -> 'Just beginning'   (first checkbox triggers this)
//   50% to <100% checked   -> 'Well underway'
//   100% checked           -> 'Complete'         (only at exactly 100%)
export function qualitativeLabel(checked: number, total: number): string {
  if (total === 0 || checked === 0) return 'Not yet started'
  const pct = checked / total
  if (pct >= 1)   return 'Complete'
  if (pct >= 0.5) return 'Well underway'
  return 'Just beginning'
}
