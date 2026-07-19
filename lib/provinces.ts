// Canonical Canadian province/territory list — the SINGLE source for the signup +
// account province dropdowns AND the province-keyed resource data (lib/resources.ts).
// These are the exact full-name strings stored at auth.users.user_metadata.province.
//
// Keep this current: this list is the join key between the province a user picks at
// signup and province-scoped resources. Treat these strings as immutable identifiers —
// a stored user_metadata.province and every Resource `scope` keyed on it must still
// match. Reference this const everywhere (signup, account, resources); do NOT re-declare
// the list. (It previously lived duplicated in app/auth/signup + app/app/account — that
// duplication was the one real drift risk in the province-resources feature.)
export const PROVINCES = [
  'Alberta',
  'British Columbia',
  'Manitoba',
  'New Brunswick',
  'Newfoundland and Labrador',
  'Nova Scotia',
  'Ontario',
  'Prince Edward Island',
  'Quebec',
  'Saskatchewan',
  'Northwest Territories',
  'Nunavut',
  'Yukon',
] as const

export type Province = (typeof PROVINCES)[number]
