// Province-specific advance-care-planning summaries for the Healthcare area page's
// "What you need to know" section. Keyed by the full-name province string (the value stored
// at auth.users.user_metadata.province — the same key the Resources section reads). Ontario
// only for now; the other 12 provinces/territories extend later. A province with no entry →
// no ACP sub-section (the Overview falls back to the plain single "Overview" band).
//
// Content is lightweight markdown authored in the CSV source:
//   **text** = bold key term (province-specific documents/roles)   *text* = italic
//   <n>      = an inline source marker → links to sources[n-1].url (rendered small + quiet)
// The takeaway is a scannable bold lead line and carries NO source marker. A source whose
// `url` is null has no linkable page in the source column → its marker is omitted (no link).

import type { Province } from '@/lib/provinces'

export type AcpSource = { n: number; url: string | null }
export type AcpSummary = {
  takeaway: string // markdown (bold/italic), no source markers
  body: string     // markdown with <n> markers; blank lines separate paragraphs
  sources: AcpSource[]
}

export const HEALTHCARE_SUMMARIES: Partial<Record<Province, AcpSummary>> = {
  Ontario: {
    takeaway:
      'In Ontario, advance care planning comes down to two things: naming your **Substitute Decision-Maker**, and communicating your wishes to them.',
    body: `In Ontario, the person who makes healthcare decisions for you if you can't is called your **Substitute Decision-Maker (SDM)**. Your SDM can only act once a health professional assesses that you can't make the decision yourself, and they must follow your known wishes, or, where your wishes aren't known, act in your best interests. <1>

You can formally name your SDM in a legal document called a **Power of Attorney for Personal Care**. <2> If you don't, Ontario law sets a ranked default, starting with any guardian or attorney you've appointed, then your spouse or partner, then family, and finally the Public Guardian and Trustee if no one else qualifies. So you always have an SDM; naming one just means you choose who. <3>

Ontario has **no legal "advance directive" document**, so there's no required form for recording your wishes: you can write them down, record them, or simply talk them through. <4> Documenting your wishes, and above all communicating them to your SDM, is what gives them the guidance to speak for you. <5>

Decisions about your finances and property, if you can't make them yourself, are a separate matter with different rules. *(See Wills & Estates.)*`,
    sources: [
      { n: 1, url: 'https://www.ontario.ca/laws/statute/96h02' }, // HCCA s.20 (statute is the friendly page here)
      { n: 2, url: 'https://ontariohealthathome.ca/getting-started/substitute-decision-maker/' },
      { n: 3, url: 'https://www.ontario.ca/laws/statute/96h02' }, // HCCA s.20
      { n: 4, url: 'https://www.advancecareplanningontario.ca/' },
      { n: 5, url: null }, // source column lists "Ontario ACP guidance" with no URL → marker omitted (flagged)
    ],
  },
}

// The ACP summary for a province, or null (no province set, or no summary authored yet).
export function healthcareSummaryFor(province: string | undefined): AcpSummary | null {
  if (!province) return null
  return HEALTHCARE_SUMMARIES[province as Province] ?? null
}
