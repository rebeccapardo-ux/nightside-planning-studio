// Province-specific advance-care-planning summaries for the Healthcare area page's
// "What you need to know" section. Keyed by the full-name province string (the value stored
// at auth.users.user_metadata.province — the SAME key the Resources section reads, and the exact
// strings in lib/provinces.ts PROVINCES; a key that doesn't match one silently falls back to no
// summary). All 13 provinces/territories are authored. A province with no entry → no ACP
// sub-section (the Overview falls back to the plain single "Overview" band).
//
// Content is faithfully transcribed from the verified research CSV — do NOT paraphrase or
// re-author the legal content. Lightweight markdown:
//   **text** = bold key term (province-specific documents/roles)   *text* = italic
//   <n>      = an inline source marker → links to sources[n-1].url (rendered small + quiet)
// The takeaway is a scannable bold lead line and carries NO source marker. A source whose
// `url` is null has no linkable page → its marker is omitted (no link). Each source carries an
// inline comment with the CSV's verbatim citation so the resolved url is verifiable.

import type { Province } from '@/lib/provinces'

export type AcpSource = { n: number; url: string | null }
export type AcpSummary = {
  takeaway: string // markdown (bold/italic), no source markers
  body: string     // markdown with <n> markers; blank lines separate paragraphs
  sources: AcpSource[]
}

export const HEALTHCARE_SUMMARIES: Partial<Record<Province, AcpSummary>> = {
  'Ontario': {
    takeaway:
      `In Ontario, advance care planning comes down to two things: naming your **Substitute Decision-Maker**, and communicating your wishes to them.`,
    body: `In Ontario, the person who makes healthcare decisions for you if you can't is called your **Substitute Decision-Maker (SDM)**. Your SDM can only act once a health professional assesses that you can't make the decision yourself, and they must follow your known wishes, or, where your wishes aren't known, act in your best interests. <1>

You can formally name your SDM in a legal document called a **Power of Attorney for Personal Care**. <2> If you don't, Ontario law sets a ranked default, starting with any guardian or attorney you've appointed, then your spouse or partner, then family, and finally the Public Guardian and Trustee if no one else qualifies. So you always have an SDM; naming one just means you choose who. <3>

Ontario has **no legal "advance directive" document**, so there's no required form for recording your wishes: you can write them down, record them, or simply talk them through. <4> Documenting your wishes, and above all communicating them to your SDM, is what gives them the guidance to speak for you. <5>

Decisions about your finances and property, if you can't make them yourself, are a separate matter with different rules. *(See Wills & Estates.)*`,
    sources: [
      { n: 1, url: 'https://www.ontario.ca/laws/statute/96h02' }, // HCCA s.20 (ontario.ca/laws/statute/96h02)
      { n: 2, url: 'https://ontariohealthathome.ca/getting-started/substitute-decision-maker/' }, // ontariohealthathome.ca/getting-started/substitute-decision-maker/
      { n: 3, url: 'https://www.ontario.ca/laws/statute/96h02' }, // spouse -> family; PGT backstop; always have an SDM" -> HCCA s.20 VERIFIED (ontario.ca/laws/statute/96h02)
      { n: 4, url: 'https://www.advancecareplanningontario.ca/' }, // advancecareplanningontario.ca
      { n: 5, url: null }, // Ontario ACP guidance
    ],
  },
  'British Columbia': {
    takeaway:
      `In British Columbia, there are two tools: a **Representation Agreement** to name someone to decide for you, and an optional **Advance Directive** for your own binding instructions.`,
    body: `In British Columbia, the person who makes healthcare decisions for you when you can't is called your **representative**. You appoint them in a legal document called a **Representation Agreement**: the personal and healthcare version (often shown as Section 9 or "RA9"). <1> Your representative can only act once a health professional assesses that you can't make the decision yourself, and they must follow your known wishes, or, where your wishes aren't known, act in your best interests. <2>

If you appoint no one, your provider selects a **Temporary Substitute Decision-Maker** from a ranked list set by law, starting with your spouse, then adult children and other family, then a close friend, with the Public Guardian and Trustee as a last resort. Appointing a representative overrides this default. <3>

BC also offers a separate, binding **Advance Directive**: written instructions to your provider giving or refusing consent to specific care, followed directly when they apply, with no representative needed for those. <4> Recording and sharing your broader wishes is still valuable so whoever speaks for you has guidance.

To be valid, these documents generally require you to be 19 or older, capable of understanding them, and properly witnessed. See the linked resources for the exact requirements. <5>

Decisions about your finances and property, if you can't make them yourself, are a separate matter with different rules. *(See Wills & Estates.)*`,
    sources: [
      { n: 1, url: 'https://canlii.org/en/bc/laws/stat/rsbc-1996-c-181/latest/' }, // Health Care (Consent) and Care Facility (Admission) Act RSBC 1996 c.181 (canlii.org/en/bc/laws/stat/rsbc-1996-c-181/latest/)
      { n: 2, url: 'https://trustee.bc.ca' }, // same Act + trustee.bc.ca
      { n: 3, url: 'https://trustee.bc.ca' }, // family->close friend; PGT last resort; representative overrides" -> Act s.16 VERIFIED + People's Law School + PGT (trustee.bc.ca)
      { n: 4, url: 'https://canlii.org/en/bc/laws/stat/rsbc-1996-c-181/latest/' }, // Act Part 2.1
      { n: 5, url: 'https://canlii.org/en/bc/laws/stat/rsbc-1996-c-181/latest/' }, // Act (point per G1)
    ],
  },
  'Alberta': {
    takeaway:
      `In Alberta, one document does both jobs: a **Personal Directive** names your decision-maker and records your wishes together.`,
    body: `In Alberta, the person who makes personal and healthcare decisions for you if you can't is called your **agent**. You name your agent in a single legal document called a **Personal Directive**, which both appoints your agent and records your wishes about things like medical treatment and where you want to live; there's no separate wishes form. <1>

Your agent can only act once a health professional assesses that you can't make the decision yourself, and they must follow your known wishes, or, where your wishes aren't known, act in your best interests. A properly-made Personal Directive carries legal weight, subject to the Act's requirements. See the linked resources for what makes one valid. <2>

If you haven't named an agent, Alberta doesn't automatically appoint one for ongoing care; for a single healthcare or placement decision a provider selects one relative in a set order (called specific decision-making, which excludes end-of-life decisions), and anything broader may require a court-appointed guardian. <3>

Decisions about your finances and property, if you can't make them yourself, are a separate matter with different rules. *(See Wills & Estates.)*`,
    sources: [
      { n: 1, url: 'https://alberta.ca/personal-directive' }, // alberta.ca/personal-directive
      { n: 2, url: 'https://canlii.org/en/ab/laws/stat/rsa-2000-c-p-6/latest/' }, // Personal Directives Act RSA 2000 c.P-6 (canlii.org/en/ab/laws/stat/rsa-2000-c-p-6/latest/)
      { n: 3, url: null }, // Alberta ACP / Adult Guardianship & Trusteeship Act
    ],
  },
  'Saskatchewan': {
    takeaway:
      `In Saskatchewan, you record your wishes in a **Health Care Directive**, and can optionally name a **proxy** to decide for you.`,
    body: `In Saskatchewan, you record your healthcare wishes in a **Health Care Directive**, a legally valid document that takes effect only once a health professional assesses that you can't make the decision yourself. You can also appoint someone to decide for you, called a **proxy**, either within your Health Care Directive or as a separate document. When a proxy acts, they must follow your known wishes, or, where your wishes aren't known, act in your best interests. <1>

There's no required form: you can use any template or plain paper, and it's legal as long as you sign and date it. See the linked resources for the details. <2> Even with detailed instructions, appointing a proxy still matters, because your written wishes can't anticipate every situation.

If you don't appoint anyone, Saskatchewan law sets out who decides, working through your closest relatives. See the linked resources for that order. <3>

Decisions about your finances and property, if you can't make them yourself, are a separate matter with different rules. *(See Wills & Estates.)*`,
    sources: [
      { n: 1, url: 'https://www.saskhealthauthority.ca/your-health/conditions-diseases-services/advance-care-planning' }, // saskhealthauthority.ca ACP + Health Care Directives and Substitute Health Care Decision Makers Act (s.4)
      { n: 2, url: null }, // SHA Appointing a Proxy (CS-PIER-0001)
      { n: 3, url: null }, // Act s.15 (point per G2)
    ],
  },
  'Quebec': {
    takeaway:
      `In Quebec, you name a decision-maker in a **protection mandate**, and can also set out binding **advance medical directives**.`,
    body: `In Quebec, the person you appoint to make decisions for you if you become incapable is named in a **protection mandate** (mandat de protection), which can cover both your personal care (including healthcare) and your property. <1> It doesn't take effect when you sign it: it applies only once you become incapable and after it's been officially confirmed and validated (a step called homologation), which can be done by either a notary or the court. Once in effect, your mandatary follows your known wishes and otherwise acts in your best interests. <2>

If you have no mandate, the Civil Code sets who may consent to your care: your spouse (married, civil union, or de facto), and if there's no spouse, a close relative or a person who shows a special interest in you. For everyday healthcare consent, they can act without the formal confirmation process. <3>

Quebec also recognizes **advance medical directives**: binding written instructions accepting or refusing specific care in defined situations. <4>

A protection mandate covers your incapacity during your lifetime; what happens to your property after death is handled separately, through a will. *(See Wills & Estates.)* <5>`,
    sources: [
      { n: 1, url: 'https://www.quebec.ca/en/justice-and-civil-status/legal-protection/protection-mandate' }, // quebec.ca protection-mandate + CCQ arts 2166+ (canlii.org/en/qc/laws/stat/cqlr-c-ccq-1991/latest/)
      { n: 2, url: 'https://www.quebec.ca/en/justice-and-civil-status/legal-protection/protection-mandate/having-protection-mandate-homologated' }, // Chambre des notaires du Quebec + juridiqc (VERIFIED)
      { n: 3, url: 'https://canlii.org/en/qc/laws/stat/cqlr-c-ccq-1991/latest/' }, // close relative OR interested person; everyday consent without homologation" -> CCQ art. 15 VERIFIED verbatim
      { n: 4, url: 'https://quebec.ca/advance-medical-directives' }, // quebec.ca/advance-medical-directives
      { n: 5, url: 'https://www.quebec.ca/en/justice-and-civil-status/legal-protection/protection-mandate' }, // will" -> quebec.ca
    ],
  },
  'Manitoba': {
    takeaway:
      `In Manitoba, a single **Health Care Directive** lets you record your wishes, name a **proxy**, or both.`,
    body: `In Manitoba, you record your healthcare wishes (and can name someone to decide for you, called a **proxy**) in a **Health Care Directive** (sometimes called a living will). It lets you set out instructions, appoint a proxy, or both. Your proxy acts once you can no longer make decisions yourself, following your known wishes, or, where your wishes aren't known, acting in your best interests. <1>

There's no mandatory form: the government provides one, but any signed and dated document with the right information works. Your written wishes carry real weight: they're generally binding on your family and providers, subject to accepted healthcare practices. See the linked resources for the details. <2>

Manitoba's Health Care Directives Act centres on directives and proxies; it doesn't set out a single general list of who decides if you appoint no proxy. In practice, providers will turn to your closest relatives. See the linked resources for how that works. <3>

Decisions about your finances and property, if you can't make them yourself, are a separate matter with different rules. *(See Wills & Estates.)*`,
    sources: [
      { n: 1, url: 'https://gov.mb.ca/health/livingwill.html' }, // gov.mb.ca/health/livingwill.html + Health Care Directives Act CCSM c.H27 (canlii.org/en/mb/laws/stat/ccsm-c-h27/latest/)
      { n: 2, url: 'https://gov.mb.ca/health/livingwill.html' }, // gov.mb.ca/health/livingwill.html + H27
      { n: 3, url: 'https://canlii.org/en/mb/laws/stat/ccsm-c-h27/latest/' }, // H27 (silent) + Advance Care Planning Canada (Manitoba)
    ],
  },
  'New Brunswick': {
    takeaway:
      `In New Brunswick, you name a decision-maker through an **Enduring Power of Attorney**, the current system since 2020.`,
    body: `In New Brunswick, the person you appoint to make personal and healthcare decisions for you if you can't is called your **Attorney for Personal Care**. You appoint them through an **Enduring Power of Attorney**, which can cover personal care, property, or both, in one document or separate ones. <1>

This replaced the old system: since July 1, 2020, you can no longer appoint a decision-maker through a "healthcare directive," and the term "proxy" has been retired. A healthcare directive still exists, but only to record your wishes; it doesn't appoint anyone. If you made one that appointed a proxy before July 1, 2020, it remains valid and is now treated as an Enduring Power of Attorney. <2>

Your Attorney for Personal Care can act only once a health professional assesses that you can't make the decision yourself, and they must follow your known wishes. One distinctive New Brunswick rule: creating an Enduring Power of Attorney that covers property requires a lawyer; a personal-care-only appointment can instead use two adult witnesses. See the linked resources for the exact requirements. <3>

If you appoint no one and lose capacity, New Brunswick has no automatic list of family substitutes: someone would have to apply to court to become your guardian, and if no one can, the court may ask the Public Trustee to act. <4>

Decisions about your finances and property are handled through the same Enduring Power of Attorney framework. *(See Wills & Estates.)*`,
    sources: [
      { n: 1, url: 'https://canlii.org/en/nb/laws/stat/snb-2019-c-30/latest/' }, // Enduring Powers of Attorney Act SNB 2019 c.30 (canlii.org/en/nb/laws/stat/snb-2019-c-30/latest/) VERIFIED
      { n: 2, url: 'https://canlii.org/en/nb/laws/stat/snb-2019-c-30/latest/' }, // s.19, s.29(4),(5) VERIFIED
      { n: 3, url: 'https://canlii.org/en/nb/laws/stat/snb-2019-c-30/latest/' }, // s.4 VERIFIED (point per G1)
      { n: 4, url: 'https://socialsupportsnb.ca/en/program/public-trustee-new-brunswick' }, // socialsupportsnb.ca/en/program/public-trustee-new-brunswick
    ],
  },
  'Nova Scotia': {
    takeaway:
      `In Nova Scotia, one document does both jobs: a **Personal Directive** names your **delegate** and records your wishes together.`,
    body: `In Nova Scotia, the person you choose to make healthcare decisions for you if you can't is called your **delegate**. You name your delegate in a single legal document called a **Personal Directive**, which both appoints your delegate and records your own instructions for personal care and healthcare decisions. <1>

Your Personal Directive only takes effect once a health professional assesses that you can't make the decision yourself. Your delegate must follow the clear instructions you've written down, or, where your wishes aren't known, act in your best interests. A properly-made Personal Directive carries weight: your written instructions are generally binding on your care providers and delegate, subject to the Act's limits. <2>

If you haven't named a delegate, Nova Scotia law sets out a ranked list of who decides, starting with a court-appointed guardian, then your nearest relative in order, and finally the Public Trustee. See the linked resources for the order. To be valid, your directive must be in writing, dated, signed before a witness, and made while you're capable. See the resources for the details. <3>

Decisions about your finances and property, if you can't make them yourself, are a separate matter with different rules. *(See Wills & Estates.)*`,
    sources: [
      { n: 1, url: 'https://novascotia.ca/just/pda/' }, // novascotia.ca/just/pda/ + Personal Directives Act SNS 2008 c.8 (canlii.org/en/ns/laws/stat/sns-2008-c-8/latest/)
      { n: 2, url: 'https://canlii.org/en/ns/laws/stat/sns-2008-c-8/latest/' }, // Act (per G4)
      { n: 3, url: 'https://canlii.org/en/ns/laws/stat/sns-2008-c-8/latest/' }, // nearest relative -> Public Trustee; validity written/dated/witnessed/capable" -> Act (point per G1/G2)
    ],
  },
  'Prince Edward Island': {
    takeaway:
      `In Prince Edward Island, one document does both jobs: a **Health Care Directive** names your **proxy** and records your wishes together.`,
    body: `In Prince Edward Island, the person you choose to make healthcare decisions for you if you can't is called your **proxy**. You appoint your proxy within a single document called a **Health Care Directive**, the same document where you write down your treatment wishes, so appointment and instructions live together. <1>

Your proxy only acts once a health professional assesses that you can't make the decision yourself, and they must follow your known wishes, or, where your wishes aren't known, act in your best interests. A properly-made Health Care Directive carries real weight. <2>

If you don't appoint anyone, PEI law sets out who decides, starting with a guardian if authorized, then your spouse and family, and a trusted friend. See the linked resources for the order. To be valid, your directive must be in writing, dated, and signed, and you must be at least 16 and capable when you make it. See the resources for the details. <3>

Decisions about your finances and property, if you can't make them yourself, are a separate matter with different rules. *(See Wills & Estates.)*`,
    sources: [
      { n: 1, url: 'https://www.princeedwardisland.ca/en/information/health-pei/advance-care-planning' }, // princeedwardisland.ca health-pei/advance-care-planning + Consent to Treatment and Health Care Directives Act RSPEI 1988 c.C-17.2 (canlii.org/en/pe/laws/stat/rspei-1988-c-c-17.2/latest/)
      { n: 2, url: 'https://canlii.org/en/pe/laws/stat/rspei-1988-c-c-17.2/latest/' }, // Act (per G4)
      { n: 3, url: 'https://canlii.org/en/pe/laws/stat/rspei-1988-c-c-17.2/latest/' }, // spouse -> family -> friend (s.11); validity written/dated/signed/16+/capable" -> Act (point per G1/G2)
    ],
  },
  'Newfoundland and Labrador': {
    takeaway:
      `In Newfoundland and Labrador, one document does both jobs: an **Advance Health Care Directive** names your **Substitute Decision-Maker** and records your wishes together.`,
    body: `In Newfoundland and Labrador, the person you appoint to make healthcare decisions for you if you can't is called your **Substitute Decision-Maker**. You name them in an **Advance Health Care Directive**, the document where you also record your wishes about future care, so appointment and instructions live together. <1>

It takes effect only once a health professional assesses that you can't make the decision yourself. Your Substitute Decision-Maker must follow your known wishes, or, where your wishes aren't known, act in your best interests. <2>

If you haven't named anyone, the Advance Health Care Directives Act sets a ranked default, starting with your spouse and moving through your family, and finally the responsible healthcare professional. See the linked resources for the order. To make a directive you must be at least 16 and capable, and it needs two independent witnesses. See the resources for the details. <3>

Decisions about your finances and property, if you can't make them yourself, are a separate matter with different rules. *(See Wills & Estates.)*`,
    sources: [
      { n: 1, url: 'https://publiclegalinfo.com/legal-info/wills-and-estates/advance-health-care-directives/' }, // publiclegalinfo.com + Advance Health Care Directives Act SNL 1995 c A-4.1 (assembly.nl.ca/legislation/sr/statutes/a04-1.htm)
      { n: 2, url: 'https://assembly.nl.ca/legislation/sr/statutes/a04-1.htm' }, // Act
      { n: 3, url: 'https://www.gov.nl.ca/cssd/files/publications-pdf-seniors-ahcd-booklet.pdf' }, // family->responsible health professional); 16+ and 2 independent witnesses" -> gov.nl.ca seniors booklet + CODNL cite s.10 VERIFIED (point per G1/G2)
    ],
  },
  'Yukon': {
    takeaway:
      `In Yukon, you name a **proxy** in an **advance directive**, which also records your wishes.`,
    body: `In Yukon, you can appoint someone to make care decisions for you (called a **proxy**) in an **advance directive**, which also lets you record your wishes and instructions for future care. <1>

A directive takes effect once a health professional assesses that you can't make the decision yourself. When your proxy acts, they must follow your known wishes, or, where your wishes aren't known, act in your best interests. <2>

If you haven't appointed a proxy, Yukon's Care Consent Act sets a ranked default: starting with any court-appointed guardian or a proxy you named, then your spouse and family, then a close friend, and, as a last resort, healthcare providers themselves. Whoever acts must be 19 or older (unless they're your spouse), available, willing, and in contact with you in the past year. See the linked resources for the full order. <3>

Decisions about your finances and property, if you can't make them yourself, are a separate matter with different rules. *(See Wills & Estates.)*`,
    sources: [
      { n: 1, url: 'https://canlii.org/en/yk/laws/stat/sy-2003-c-21-sch-b/latest/' }, // Care Consent Act SY 2003 c.21 Sch B (canlii.org/en/yk/laws/stat/sy-2003-c-21-sch-b/latest/) + yukon.ca giving-consent-health-care
      { n: 2, url: 'https://yukon.ca/en/advance-directives' }, // yukon.ca giving-consent-health-care
      { n: 3, url: 'https://yukon.ca/en/health-and-wellness/care-services/giving-consent-health-care' }, // proxy->spouse->family->close friend->health providers last resort); 19+ unless spouse, available, willing, 12-mo contact" -> Yukon HSS Practice Guidelines citing s.12 VERIFIED (point per G2)
    ],
  },
  'Northwest Territories': {
    takeaway:
      `In the Northwest Territories, one document does both jobs: a **Personal Directive** names your **agent** and records your wishes together.`,
    body: `In the Northwest Territories, the person you appoint to make personal and healthcare decisions for you if you can't is called your **agent**. You name your agent in a **Personal Directive**, which also records your values, beliefs, and instructions for future care; appointment and wishes live in one document. <1>

Your agent acts only once a health professional assesses that you can't make the decision yourself, and they must follow your known wishes, or, where your wishes aren't known, act in your best interests. A properly-made Personal Directive carries legal effect and must be followed, provided it meets the Act's requirements. See the linked resources for what those are. <2>

Because the territory relies on you having named an agent, making a Personal Directive is especially worth doing.

Decisions about your finances and property, if you can't make them yourself, are a separate matter with different rules. *(See Wills & Estates.)*`,
    sources: [
      { n: 1, url: 'https://www.hss.gov.nt.ca/en/services/personal-directives' }, // hss.gov.nt.ca personal-directives + Personal Directives Act SNWT 2005 c.16 (canlii.org/en/nt/laws/stat/snwt-2005-c-16/latest/)
      { n: 2, url: 'https://canlii.org/en/nt/laws/stat/snwt-2005-c-16/latest/' }, // Act ("Legal effect" + "Requirements not met") VERIFIED (per G4)
    ],
  },
  'Nunavut': {
    takeaway:
      `In Nunavut, there is no advance-directive legislation (as of 2026), so writing down and sharing your wishes is very important.`,
    body: `Nunavut is different from the rest of Canada here: **as of 2026, it has no legislation for advance directives or for appointing a substitute decision-maker in advance.** That means there's no recognized document that lets you name, ahead of time, who should make your healthcare decisions if you become unable to. <1>

If that happens, someone would need to apply to the court to be appointed your guardian under the Guardianship and Trusteeship Act, and the court can take your wishes into account, including who you'd want to serve. <2>

Because of this, it's genuinely worthwhile to write down and talk through your wishes for future care with the people close to you and your healthcare providers, even without a legal document to formalize them. See the linked resources for how guardianship works. <3>

Decisions about your finances and property are also handled through this court-appointed process (trusteeship), separate from healthcare. *(See Wills & Estates.)*`,
    sources: [
      { n: 1, url: null }, // CHPCA + Dying With Dignity Canada + ABSENCE in CanLII Nunavut statute list (VERIFIED negative)
      { n: 2, url: 'https://canlii.org/en/nu/laws/stat/snwt-nu-1994-c-29/latest/' }, // Guardianship and Trusteeship Act SNWT(Nu) 1994 c.29 (canlii.org/en/nu/laws/stat/snwt-nu-1994-c-29/latest/)
      { n: 3, url: null }, // DWD Nunavut guide
    ],
  },
}

// The ACP summary for a province, or null (no province set, or no summary authored yet).
export function healthcareSummaryFor(province: string | undefined): AcpSummary | null {
  if (!province) return null
  return HEALTHCARE_SUMMARIES[province as Province] ?? null
}
