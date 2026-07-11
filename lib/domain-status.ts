import { getDomainCheckboxSlots } from '@/lib/domain-structure'
import type { DomainState } from '@/lib/domain-state'

// Domain planning-status helpers — the single source of truth for a domain's
// qualitative status text (`qualitativeLabel`) AND its progress count
// (`computeDomainProgress`). Every status surface — the area page status bar
// (PlanningStatusSection) and buildDomainStatuses (release/export PDF) — routes
// its checked/total through `computeDomainProgress` so the count can't drift
// across surfaces (the same anti-drift lesson that consolidated `qualitativeLabel`).
// `qualitativeLabel` is likewise the single label source for the area page status
// label and buildDomainStatuses, replacing the drifted copies it superseded:
//   - count-based qualitativePhrase in the old /app/domains/[domainId] page
//   - %-based qualitativeLabel in the old DomainStateCard
//   - %-based qualitativeLabel in lib/pdf/buildPlanData.ts
// (The analytics-only computePlanningStatus in lib/analytics.ts is a separate
// concern — different vocabulary, different purpose — and is NOT replaced.)
//
// Domains whose 100% label reads 'Explored' instead of 'Complete'. Legacy and
// Ritual & Ceremony are reflective areas, not concrete task lists, so "Complete"
// (as if finished) is the wrong register — see the per-domain final-label note.
// Keyed by stable `domain_code` (append-only; never rename — persisted slug).
const EXPLORED_FINAL_LABEL_DOMAINS = new Set(['legacy', 'ritual'])

// Model (Pass 2): `checked` / `total` are CHECKBOXES, not rows — each readiness
// checkbox is one planning-status segment. Thresholds (Option β):
//   0% checked             -> 'Not yet started'
//   >0% to <50% checked    -> 'Just beginning'   (first checkbox triggers this)
//   50% to <100% checked   -> 'Well underway'
//   100% checked           -> 'Complete', or 'Explored' for the reflective
//                             domains above (only at exactly 100%)
// `code` is the domain's stable `domain_code`; it only affects the 100% label.
export function qualitativeLabel(checked: number, total: number, code?: string | null): string {
  if (total === 0 || checked === 0) return 'Not yet started'
  const pct = checked / total
  if (pct >= 1)   return code && EXPLORED_FINAL_LABEL_DOMAINS.has(code) ? 'Explored' : 'Complete'
  if (pct >= 0.5) return 'Well underway'
  return 'Just beginning'
}

export type DomainProgress = { checked: number; total: number; pct: number }

// Minimal shape the count needs from a user-defined task. PR 1 passes [];
// PR 3 (user_checkboxes) passes real rows — { checked } is all the count reads.
export type UserTaskProgressInput = { checked: boolean }

// Single source of truth for a domain's planning progress. Platform readiness
// checkboxes (from domain_state, keyed by the container UUID) PLUS user-defined
// tasks, as one { checked, total, pct }. Every status surface routes through
// this so the four count-sites can't drift.
export function computeDomainProgress(
  domainId: string,
  code: string | null | undefined,
  state: DomainState,
  userTasks: UserTaskProgressInput[] = [],
): DomainProgress {
  const slots = getDomainCheckboxSlots(code)
  const platformChecked = slots.filter(
    (s) => state[domainId]?.checkboxes?.[s.rowKey]?.[s.index] === true,
  ).length
  const userChecked = userTasks.filter((t) => t.checked).length
  const total = slots.length + userTasks.length
  const checked = platformChecked + userChecked
  return { checked, total, pct: total === 0 ? 0 : checked / total }
}
