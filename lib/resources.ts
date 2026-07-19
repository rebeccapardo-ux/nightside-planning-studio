// Province-specific resource data for the area pages — replaces the old external
// Resource Hub link-out. Static content module (like DOMAIN_STRUCTURES / lib/areas.ts /
// the Learn content); no DB, no query layer. Rendered by app/components/area/AreaResources.
//
// A resource carries a `domains` ARRAY. The overwhelming majority belong to exactly one
// domain (a one-element array). Multi-domain is the EXCEPTION, not the norm: a genuinely-dual
// resource — e.g. an Enduring/Power of Attorney that legally covers BOTH personal care
// (Healthcare) and property (Wills & Estates), and whose page discusses both — is a SINGLE
// entry tagged with both domains, maintained once and surfaced in each area. This replaces
// the old single-domain model (which forced duplication into two entries for one URL — the
// drift risk this avoids); ordinary cross-domain relevance is still handled by cross-pointer
// PAGE COPY, not by tagging two domains. Domain keys are containers.domain_code (lib/areas.ts).
//
// Data vs. page copy: label/url/domains/section/scope/note are DATA (here). Section intro
// paragraphs and cross-pointers are PAGE COPY (authored in AreaResources), NOT stored here.
//
// This build seeds HEALTHCARE only; the other five domains extend later (same shape).

import type { Province } from '@/lib/provinces'

export type DomainCode =
  | 'healthcare'
  | 'deathcare'
  | 'wills_estates'
  | 'legacy'
  | 'personal_admin'
  | 'ritual'

export type Resource = {
  label: string
  url: string
  // Domains this resource belongs to. Almost always ONE (a one-element array, e.g.
  // ['healthcare']). A genuinely-dual resource (see file header) carries two — it surfaces in
  // each area, maintained once. Multi-domain is the exception; keep the common case simple.
  domains: DomainCode[]
  // Sub-heading this sits under within its tier. For a province tier rendered as a flat
  // list (Healthcare's by-province resources), section is '' and the component ignores it.
  section: string
  // Canada-wide, or a specific province (full-name string, matching lib/provinces).
  scope: 'canadaWide' | Province
  // Optional per-entry contextual note (rendered under the link).
  note?: string
}

// Per-domain section reading order (LAYOUT CONFIG, not data). An entry is either a flat
// section name, or a { group, sections } node that renders a parent heading with its
// sub-sections nested (e.g. Healthcare's equity cluster). The strings here must match the
// `section` values in RESOURCES for that domain. Order here IS the reading order.
export type SectionOrderNode = string | { group: string; sections: string[] }
export const SECTION_ORDER: Record<string, SectionOrderNode[]> = {
  healthcare: [
    'Advance Care Planning',
    // MAiD is a top-level sibling (not a child of the equity group), placed here between
    // Advance Care Planning and Housing.
    'Medical Assistance in Dying (MAiD)',
    'Housing',
    {
      group: 'Equitable and culturally-sensitive planning',
      sections: [
        'Understanding your rights',
        '2SLGBTQ+ resources',
        'Indigenous resources',
      ],
    },
  ],
  wills_estates: [
    'General Information',
    'Financial & Tax Considerations',
  ],
  deathcare: [
    'Understanding your rights',
  ],
}

export const RESOURCES: Resource[] = [
  // ═══════════════════════════ HEALTHCARE — Canada-wide ═══════════════════════════
  { domains: ['healthcare'], scope: 'canadaWide', section: 'Advance Care Planning',
    label: 'Advance care planning Canada', url: 'https://www.advancecareplanning.ca/' },

  { domains: ['healthcare'], scope: 'canadaWide', section: 'Housing',
    label: 'Planning for future housing needs', url: 'https://www.canada.ca/en/employment-social-development/corporate/seniors-forum-federal-provincial-territorial/housing-needs-planning.html' },
  { domains: ['healthcare'], scope: 'canadaWide', section: 'Housing',
    label: 'Housing Options for Seniors', url: 'https://www.canada.ca/en/financial-consumer-agency/services/retirement-planning/cost-seniors-housing.html' },
  { domains: ['healthcare'], scope: 'canadaWide', section: 'Housing',
    label: 'Thinking about aging in place', url: 'https://www.canada.ca/en/employment-social-development/corporate/seniors-forum-federal-provincial-territorial/aging.html' },
  { domains: ['healthcare'], scope: 'canadaWide', section: 'Housing',
    label: 'CanAge: Caregiving, Long-Term Care, Home Care, and Housing Resources', url: 'https://canage.ca/advocacy/policy-book/caregiving-long-term-care-home-care-and-housing-resources/' },

  { domains: ['healthcare'], scope: 'canadaWide', section: 'Understanding your rights',
    label: 'Dying with Dignity Canada: Patient Rights Guide', url: 'https://www.dyingwithdignity.ca/education-resources/patient-rights-guide/' },
  { domains: ['healthcare'], scope: 'canadaWide', section: 'Understanding your rights',
    label: 'Patient Rights 101 Webinar', url: 'https://www.dyingwithdignity.ca/education-resources/patient-rights-101/' },

  { domains: ['healthcare'], scope: 'canadaWide', section: '2SLGBTQ+ resources',
    label: 'Rainbow Health Ontario', url: 'https://www.rainbowhealthontario.ca/' },
  { domains: ['healthcare'], scope: 'canadaWide', section: '2SLGBTQ+ resources',
    label: 'The National Resource Center on 2SLGBTQI Aging', url: 'https://2slgbtqi-aging.ca/' },
  { domains: ['healthcare'], scope: 'canadaWide', section: '2SLGBTQ+ resources',
    label: 'Canadian Virtual Hospice: Two-Spirit and LGBTQ+ Resources', url: 'https://www.virtualhospice.ca/2SLGBTQ' },
  { domains: ['healthcare'], scope: 'canadaWide', section: '2SLGBTQ+ resources',
    label: 'My Choices for Safe and Inclusive Healthcare', url: 'https://www.virtualhospice.ca/2SLGBTQ/articles/my-choices-for-safe-and-inclusive-healthcare/' },

  { domains: ['healthcare'], scope: 'canadaWide', section: 'Indigenous resources',
    label: 'Living My Culture: First Nations Resources', url: 'https://livingmyculture.ca/culture/first-nations/' },
  { domains: ['healthcare'], scope: 'canadaWide', section: 'Indigenous resources',
    label: 'First Nations Health Authority: End-of-Life Journey', url: 'https://fnha.ca/services-and-support/access-and-support/end-of-life-journey/' },
  { domains: ['healthcare'], scope: 'canadaWide', section: 'Indigenous resources',
    label: 'First Nations Health Authority: Advance Care Planning', url: 'https://fnha.ca/services-and-support/access-and-support/advance-care-planning/' },
  { domains: ['healthcare'], scope: 'canadaWide', section: 'Indigenous resources',
    label: 'Reclaiming cultural teachings about mortality, grief, loss, death and dying (essay by Chrystal Waban Toop)', url: 'https://www.dyingwithdignity.ca/blog/reclaiming-cultural-teachings-about-mortality-grief-loss-death-and-dying/' },

  { domains: ['healthcare'], scope: 'canadaWide', section: 'Medical Assistance in Dying (MAiD)',
    label: 'MAiD Family Support Society', url: 'https://www.dyingwithdignity.ca/education-resources/maid-family-support-society/' },
  { domains: ['healthcare'], scope: 'canadaWide', section: 'Medical Assistance in Dying (MAiD)',
    label: 'MAiD Fact Sheet', url: 'https://www.dyingwithdignity.ca/education-resources/fact-sheet-what-is-maid/' },
  { domains: ['healthcare'], scope: 'canadaWide', section: 'Medical Assistance in Dying (MAiD)',
    label: 'MAiD Information and Province-Specific Resources', url: 'https://www.canada.ca/en/health-canada/services/health-services-benefits/medical-assistance-dying/supports-resources.html' },

  // ═══════════════════════════ HEALTHCARE — By province ═══════════════════════════
  // British Columbia
  { domains: ['healthcare'], scope: 'British Columbia', section: '',
    label: 'Incapacity Planning', url: 'https://www2.gov.bc.ca/gov/content/health/managing-your-health/incapacity-planning' },
  { domains: ['healthcare'], scope: 'British Columbia', section: '',
    label: 'Substitute Decision Making', url: 'https://www2.gov.bc.ca/gov/content/family-social-supports/seniors/financial-legal-matters/substitute-decision-making' },
  { domains: ['healthcare'], scope: 'British Columbia', section: '',
    label: 'Representation Agreements', url: 'https://www.trustee.bc.ca/adults/personal-planning-tools#ra-details' },
  { domains: ['healthcare'], scope: 'British Columbia', section: '',
    label: 'Advance Care Planning', url: 'https://www2.gov.bc.ca/gov/content/family-social-supports/seniors/health-safety/advance-care-planning' },
  { domains: ['healthcare'], scope: 'British Columbia', section: '',
    label: 'Advance Directives', url: 'https://www2.gov.bc.ca/assets/gov/people/seniors/health-safety/pdf/faqadvancecareplanning.pdf' },

  // Alberta
  { domains: ['healthcare'], scope: 'Alberta', section: '',
    label: 'Advance Care Planning', url: 'https://www.alberta.ca/decision-making-advance-planning' },
  { domains: ['healthcare'], scope: 'Alberta', section: '',
    label: 'Personal Directives', url: 'https://www.alberta.ca/personal-directive' },

  // Saskatchewan
  { domains: ['healthcare'], scope: 'Saskatchewan', section: '',
    label: 'Advance Care Planning', url: 'https://www.saskhealthauthority.ca/your-health/conditions-diseases-services/advance-care-planning' },
  { domains: ['healthcare'], scope: 'Saskatchewan', section: '',
    label: 'Substitute Decision Makers', url: 'https://www.saskhealthauthority.ca/sites/default/files/2022-02/CS-PIER-0001-ACP-Appointing-a-Proxy.pdf' },
  { domains: ['healthcare'], scope: 'Saskatchewan', section: '',
    label: 'Healthcare Directives', url: 'https://publications.saskatchewan.ca/#/categories/5390' },
  { domains: ['healthcare'], scope: 'Saskatchewan', section: '',
    label: 'Healthcare Directive Template', url: 'https://dyingwithdignity.ca/wp-content/uploads/2023/03/DWDC_2024ACP_SaskatchewanForm_ENG.pdf' },

  // Ontario
  { domains: ['healthcare'], scope: 'Ontario', section: '',
    label: 'Advance Care Planning', url: 'https://www.advancecareplanningontario.ca/' },
  { domains: ['healthcare'], scope: 'Ontario', section: '',
    label: 'Substitute Decision Makers', url: 'https://ontariohealthathome.ca/getting-started/substitute-decision-maker/' },
  { domains: ['healthcare', 'wills_estates'], scope: 'Ontario', section: '', // dual: POA covers care + property
    label: 'Powers of Attorney', url: 'https://www.ontario.ca/page/make-power-attorney' },
  { domains: ['healthcare', 'wills_estates'], scope: 'Ontario', section: '', // dual: POA covers care + property
    label: 'Powers of Attorney Templates', url: 'https://www.publications.gov.on.ca/300975' },
  { domains: ['healthcare', 'wills_estates'], scope: 'Ontario', section: '', // dual: advance directive + POA
    label: 'Advance Directive and POA templates', url: 'https://dyingwithdignity.ca/wp-content/uploads/2023/03/DWDC_2024ACP_OntarioForm_ENG.pdf' },

  // Quebec
  { domains: ['healthcare'], scope: 'Quebec', section: '',
    label: 'Advance Directives', url: 'https://www.quebec.ca/en/health/health-system-and-services/end-of-life-care/advance-medical-directives' },
  { domains: ['healthcare'], scope: 'Quebec', section: '',
    label: 'Advance Directive Template', url: 'https://dyingwithdignity.ca/wp-content/uploads/2023/03/DWDC_2024ACP_QuebecForm_ENG.pdf' },
  { domains: ['healthcare'], scope: 'Quebec', section: '',
    label: 'Substitute Decision Making', url: 'https://www.quebec.ca/en/family-and-support-for-individuals/incapacity-loss-independance/consent-care-incapacity' },
  { domains: ['healthcare'], scope: 'Quebec', section: '',
    label: 'Protection Mandates', url: 'https://www.quebec.ca/en/justice-and-civil-status/legal-protection/protection-mandate/about-protection-mandate' },
  { domains: ['healthcare'], scope: 'Quebec', section: '',
    label: 'Incapacity Planning and Mandataries', url: 'https://educaloi.qc.ca/en/capsules/protection-mandates-naming-someone-to-act-for-you/' },
  { domains: ['healthcare'], scope: 'Quebec', section: '',
    label: 'Protection Mandate Template', url: 'https://cdn-contenu.quebec.ca/cdn-contenu/curateur-public/pdf/form_mandat_en.pdf' },
  { domains: ['healthcare'], scope: 'Quebec', section: '',
    label: 'Responsibilities of Mandataries', url: 'https://www.quebec.ca/en/justice-and-civil-status/legal-protection/protection-mandate/role-responsibilities-mandatary' },

  // Manitoba
  { domains: ['healthcare'], scope: 'Manitoba', section: '',
    label: 'Advance Care Planning', url: 'https://wrha.mb.ca/advance-care-planning/' },
  { domains: ['healthcare'], scope: 'Manitoba', section: '',
    label: 'Healthcare directives and proxies', url: 'https://www.gov.mb.ca/health/livingwill.html' },
  { domains: ['healthcare'], scope: 'Manitoba', section: '',
    label: 'Healthcare Directive Templates', url: 'https://www.gov.mb.ca/health/documents/health_care_directive.pdf' },
  { domains: ['healthcare'], scope: 'Manitoba', section: '',
    label: 'Healthcare Directive Template (Dying With Dignity)', url: 'https://dyingwithdignity.ca/wp-content/uploads/2023/03/DWDC_2024ACP_ManitobaForm_ENG.pdf' },
  { domains: ['healthcare', 'wills_estates'], scope: 'Manitoba', section: '', // dual: wills + POA + health care directives
    label: 'Legal guide on wills, powers of attorney, and health care directives', url: 'https://www.gov.mb.ca/publictrustee/pdf/legal_guide_seniors.pdf' },

  // New Brunswick
  { domains: ['healthcare'], scope: 'New Brunswick', section: '',
    label: 'Advance Care Planning', url: 'https://horizonnb.ca/patients-visitors/advance-care-planning/' },
  { domains: ['healthcare'], scope: 'New Brunswick', section: '',
    label: 'Healthcare Directives Guide and Templates', url: 'https://www.legal-info-legale.nb.ca/en/uploads/file/pdfs/health_law/Health_Care_Directives_EN.pdf' },
  { domains: ['healthcare'], scope: 'New Brunswick', section: '',
    label: 'Advance Care Planning Form (Dying With Dignity)', url: 'https://dyingwithdignity.ca/wp-content/uploads/2023/03/DWDC_2024ACP_NewBrunswickForm_ENG.pdf' },
  { domains: ['healthcare', 'wills_estates'], scope: 'New Brunswick', section: '', // dual: enduring POA covers care + property
    label: 'Enduring Powers of Attorney', url: 'https://socialsupportsnb.ca/en/simple_page/enduring-powers-attorney' },
  { domains: ['healthcare', 'wills_estates'], scope: 'New Brunswick', section: '', // dual: enduring POA covers care + property
    label: 'Enduring Power of Attorney Template', url: 'https://www.legal-info-legale.nb.ca/en/uploads/file/pdfs/planning_ahead/F-1.%20Enduring%20Power%20of%20Attorney%20for%20Personal%20Care%20-%20Forms%20-%20English.pdf' },

  // Nova Scotia
  { domains: ['healthcare'], scope: 'Nova Scotia', section: '',
    label: 'Advance Care Planning', url: 'https://www.nshealth.ca/patient-education-resources/1942' },
  { domains: ['healthcare'], scope: 'Nova Scotia', section: '',
    label: 'Personal Directives Information and Template', url: 'https://novascotia.ca/just/pda/' },
  { domains: ['healthcare'], scope: 'Nova Scotia', section: '',
    label: 'Personal Directive Template (Dying With Dignity)', url: 'https://www.dyingwithdignity.ca/wp-content/uploads/2023/03/DWDC_2024ACP_NovaScotiaForm_ENG_.pdf' },

  // Prince Edward Island
  { domains: ['healthcare'], scope: 'Prince Edward Island', section: '',
    label: 'Advance Care Planning and Goals of Care Designations', url: 'https://www.princeedwardisland.ca/en/information/health-pei/advance-care-planning' },
  { domains: ['healthcare'], scope: 'Prince Edward Island', section: '',
    label: 'Healthcare Directive and Proxy Designation Template', url: 'https://www.princeedwardisland.ca/sites/default/files/publications/health_care_directive_form.pdf' },
  { domains: ['healthcare'], scope: 'Prince Edward Island', section: '',
    label: 'Goals of Care Form Template', url: 'https://www.princeedwardisland.ca/sites/default/files/forms/goals_of_care_form.pdf' },

  // Newfoundland and Labrador
  { domains: ['healthcare'], scope: 'Newfoundland and Labrador', section: '',
    label: 'Advance Care Planning', url: 'https://peolc.easternhealth.ca/planning-for-future-care/advance-care-planning/' },
  { domains: ['healthcare'], scope: 'Newfoundland and Labrador', section: '',
    label: 'Advance Healthcare Directives', url: 'https://publiclegalinfo.com/legal-info/wills-and-estates/advance-health-care-directives/' },
  { domains: ['healthcare'], scope: 'Newfoundland and Labrador', section: '',
    label: 'Substitute Decision Makers', url: 'https://peolc.easternhealth.ca/planning-for-future-care/substitute-decision-maker/' },
  { domains: ['healthcare'], scope: 'Newfoundland and Labrador', section: '',
    label: 'Advance Healthcare Directive Template', url: 'https://dyingwithdignity.ca/wp-content/uploads/2023/03/DWDC_2024ACP_NewfoundlandForm_ENG.pdf', note: 'Includes substitute decision maker designation.' },

  // Yukon
  { domains: ['healthcare'], scope: 'Yukon', section: '',
    label: 'Advance Care Planning and Proxies', url: 'https://yukon.ca/en/health-and-wellness/care-services/plan-your-future-health-care-decisions' },
  { domains: ['healthcare'], scope: 'Yukon', section: '',
    label: 'Advance Care Planning Booklet', url: 'https://yukon.ca/sites/default/files/hss/hss-planning-your-future-healthcare-choices-advance_directives-yukon.pdf' },
  { domains: ['healthcare'], scope: 'Yukon', section: '',
    label: 'Advance Directive Template', url: 'https://yukon.ca/en/abbreviated-advance-directive-valid-under-yukon-care-consent-act', note: 'Includes proxy designation.' },

  // Northwest Territories
  { domains: ['healthcare'], scope: 'Northwest Territories', section: '',
    label: 'Personal Directives', url: 'https://www.hss.gov.nt.ca/en/services/personal-directives' },
  { domains: ['healthcare'], scope: 'Northwest Territories', section: '',
    label: 'Personal Directive Template', url: 'https://dyingwithdignity.ca/wp-content/uploads/2023/03/DWDC_2024ACP_NWTForm_ENG.pdf' },

  // Nunavut
  { domains: ['healthcare'], scope: 'Nunavut', section: '',
    label: 'Personal Directive Template', url: 'https://dyingwithdignity.ca/wp-content/uploads/2023/03/DWDC_2024ACP_NunavutForm_ENG.pdf' },

  // ═══════════════════════════ WILLS & ESTATES — Canada-wide ═══════════════════════════
  // NOTE: the 6 POA dual entries (ON ×3, MB ×1, NB ×2) live in the HEALTHCARE block above,
  // tagged ['healthcare','wills_estates'] — they surface here automatically and are NOT
  // repeated below (do not re-add them). Commercial sections (Digital Asset Planning, Online
  // Will Services) were intentionally dropped; digital-asset coverage is a Legacy cross-pointer.
  { domains: ['wills_estates'], scope: 'canadaWide', section: 'General Information',
    label: 'Estate law', url: 'https://www.canada.ca/en/services/life-events/death/estates-wills.html' },
  { domains: ['wills_estates'], scope: 'canadaWide', section: 'General Information',
    label: 'Having a will and making funeral plans', url: 'https://www.canada.ca/en/employment-social-development/corporate/seniors-forum-federal-provincial-territorial/will-funeral-plan.html' },
  { domains: ['wills_estates'], scope: 'canadaWide', section: 'General Information',
    label: 'Powers of Attorney for financial matters and property', url: 'https://www.canada.ca/en/employment-social-development/corporate/seniors-forum-federal-provincial-territorial/power-attorney-financial.html' },

  { domains: ['wills_estates'], scope: 'canadaWide', section: 'Financial & Tax Considerations',
    label: 'Canada Revenue Agency: Guide to Taxes After Death', url: 'https://www.canada.ca/en/revenue-agency/services/tax/individuals/life-events/doing-taxes-someone-died/prepare-returns.html' },
  { domains: ['wills_estates'], scope: 'canadaWide', section: 'Financial & Tax Considerations',
    label: 'Death of an RRSP Annuitant', url: 'https://www.canada.ca/en/revenue-agency/services/forms-publications/publications/rc4177/death-rrsp-annuitant-a-prpp-member.html' },
  { domains: ['wills_estates'], scope: 'canadaWide', section: 'Financial & Tax Considerations',
    label: 'Income from a Registered Retirement Income Fund (RRIF)', url: 'https://www.canada.ca/en/revenue-agency/services/tax/individuals/life-events/doing-taxes-someone-died/prepare-returns/report-income/rrif.html' },

  // ═══════════════════════════ WILLS & ESTATES — By province ═══════════════════════════
  // British Columbia (Willful commercial will link dropped)
  { domains: ['wills_estates'], scope: 'British Columbia', section: '',
    label: 'Powers of Attorney', url: 'https://www.trustee.bc.ca/adults/personal-planning-tools#epoa' },

  // Alberta
  { domains: ['wills_estates'], scope: 'Alberta', section: '',
    label: 'Writing a Will', url: 'https://www.alberta.ca/wills-in-alberta' },
  { domains: ['wills_estates'], scope: 'Alberta', section: '',
    label: 'Enduring Powers of Attorney', url: 'https://www.alberta.ca/enduring-power-of-attorney' },
  { domains: ['wills_estates'], scope: 'Alberta', section: '',
    label: "Deceased Persons' Estates", url: 'https://www.alberta.ca/deceased-persons-estates' },
  { domains: ['wills_estates'], scope: 'Alberta', section: '',
    label: 'More Legal Resources: Wills, Estates, Funerals', url: 'https://www.cplea.ca/willsandestates/' },

  // Saskatchewan (see-also promoted to its own entry)
  { domains: ['wills_estates'], scope: 'Saskatchewan', section: '',
    label: 'Writing a Will', url: 'https://www.saskatchewan.ca/residents/justice-crime-and-the-law/answering-legal-questions/wills/making-a-will' },
  { domains: ['wills_estates'], scope: 'Saskatchewan', section: '',
    label: 'Considerations When Planning Your Will', url: 'https://www.saskatchewan.ca/residents/justice-crime-and-the-law/answering-legal-questions/wills/considerations-when-planning-your-will' },

  // Ontario (POA, POA Templates, Advance Directive & POA templates are dual — in Healthcare block)
  { domains: ['wills_estates'], scope: 'Ontario', section: '',
    label: 'How to Make a Will', url: 'https://stepstojustice.ca/steps/wills-and-powers-of-attorney/1-decide-how-you-want-make-your-will/' },
  { domains: ['wills_estates'], scope: 'Ontario', section: '',
    label: 'Wills and Estate Planning', url: 'https://www.ontario.ca/page/estate-planning-and-wills' },

  // Quebec
  { domains: ['wills_estates'], scope: 'Quebec', section: '',
    label: 'Wills', url: 'https://www.quebec.ca/en/justice-and-civil-status/wills-estate/wills/forms-will' },
  { domains: ['wills_estates'], scope: 'Quebec', section: '',
    label: 'Requirements for a Legal Will', url: 'https://www.quebec.ca/en/justice-et-etat-civil/testament-succession/testament/formes-reconnues-testament/requirements' },
  { domains: ['wills_estates'], scope: 'Quebec', section: '',
    label: 'Estate Planning', url: 'https://educaloi.qc.ca/en/capsules/ten-steps-to-estate-planning/' },

  // Manitoba (Legal guide is dual — in Healthcare block)
  { domains: ['wills_estates'], scope: 'Manitoba', section: '',
    label: 'Wills', url: 'https://www.gov.mb.ca/familylaw/relationships/wills.html' },
  { domains: ['wills_estates'], scope: 'Manitoba', section: '',
    label: 'Estates', url: 'https://www.gov.mb.ca/familylaw/relationships/estates.html' },
  { domains: ['wills_estates'], scope: 'Manitoba', section: '',
    label: 'Powers of Attorney', url: 'https://www.gov.mb.ca/publictrustee/powers_of_attorney.html' },

  // New Brunswick (Enduring POA + Template are dual — in Healthcare block)
  { domains: ['wills_estates'], scope: 'New Brunswick', section: '',
    label: 'Writing a Legal Will', url: 'https://www.legal-info-legale.nb.ca/en/making_a_will' },
  { domains: ['wills_estates'], scope: 'New Brunswick', section: '',
    label: 'Wills and Estate Planning', url: 'https://socialsupportsnb.ca/en/simple_page/wills-and-estate-planning' },
  { domains: ['wills_estates'], scope: 'New Brunswick', section: '',
    label: 'Will Checklist', url: 'https://www.legal-info-legale.nb.ca/en/checklist_for_making_a_will' },
  { domains: ['wills_estates'], scope: 'New Brunswick', section: '',
    label: 'How to Make a Will', url: 'https://legalinfonb.ca/legal-info/wills-estates/how-to-make-a-will/' },

  // Nova Scotia (expired JWT POA link replaced with two authoritative sources)
  { domains: ['wills_estates'], scope: 'Nova Scotia', section: '',
    label: 'Making a Will', url: 'https://www.legalinfo.org/wills-and-estates-law/seniors-making-a-will' },
  { domains: ['wills_estates'], scope: 'Nova Scotia', section: '',
    label: 'Estates', url: 'https://www.legalinfo.org/i-have-a-legal-question/wills-and-estates-law/' },
  { domains: ['wills_estates'], scope: 'Nova Scotia', section: '',
    label: 'Powers of Attorney — Adult Capacity and Decision-making', url: 'https://novascotia.ca/just/pto/adult-capacity-decision.asp' },
  { domains: ['wills_estates'], scope: 'Nova Scotia', section: '',
    label: 'Make a Power of Attorney (LISNS app)', url: 'https://www.legalinfo.org/poa' },

  // Prince Edward Island
  { domains: ['wills_estates'], scope: 'Prince Edward Island', section: '',
    label: 'Wills and Estate Planning', url: 'https://legalinfopei.ca/wills/' },
  { domains: ['wills_estates'], scope: 'Prince Edward Island', section: '',
    label: 'Powers of Attorney', url: 'https://legalinfopei.ca/power-of-attorney-kit' },

  // Newfoundland and Labrador (Enduring POA confirmed property-only → single wills_estates)
  { domains: ['wills_estates'], scope: 'Newfoundland and Labrador', section: '',
    label: 'Wills', url: 'https://publiclegalinfo.com/legal-info/wills-and-estates/wills/' },
  { domains: ['wills_estates'], scope: 'Newfoundland and Labrador', section: '',
    label: 'Estate Administration', url: 'https://publiclegalinfo.com/legal-info/wills-and-estates/dying-without-a-will/' },
  { domains: ['wills_estates'], scope: 'Newfoundland and Labrador', section: '',
    label: 'Enduring Powers of Attorney', url: 'https://publiclegalinfo.com/legal-info/wills-and-estates/enduring-powers-of-attorney/' },

  // Yukon (Enduring POA confirmed property-only → single wills_estates; gov URL per adjudication)
  { domains: ['wills_estates'], scope: 'Yukon', section: '',
    label: 'Wills and Estates', url: 'https://yukon.ca/en/wills-and-estates' },
  { domains: ['wills_estates'], scope: 'Yukon', section: '',
    label: 'Enduring Powers of Attorney', url: 'https://yukon.ca/en/enduring-power-attorney-user-guide' },

  // Northwest Territories
  { domains: ['wills_estates'], scope: 'Northwest Territories', section: '',
    label: 'Wills', url: 'https://www.justice.gov.nt.ca/en/files/estate-administration/Questions%20and%20Answers%20about%20Wills.pdf' },
  { domains: ['wills_estates'], scope: 'Northwest Territories', section: '',
    label: 'Estate Administration', url: 'https://www.justice.gov.nt.ca/en/estate-administration/' },
  { domains: ['wills_estates'], scope: 'Northwest Territories', section: '',
    label: 'Powers of Attorney', url: 'https://www.justice.gov.nt.ca/en/power-of-attorney/' },

  // Nunavut (aging gov PDF kept per adjudication; HTTPS did not load, http retained)
  { domains: ['wills_estates'], scope: 'Nunavut', section: '',
    label: 'Wills and Estates', url: 'http://nulas.ca/wp-content/uploads/2015/02/wills_and_estates_edit.pdf' },

  // ═══════════════════════════ DEATHCARE — Canada-wide ═══════════════════════════
  { domains: ['deathcare'], scope: 'canadaWide', section: 'Understanding your rights',
    label: 'Canadian Funeral Consumer Rights', url: 'https://ised-isde.canada.ca/site/office-consumer-affairs/en/modern-marketplace/funerals' },
  { domains: ['deathcare'], scope: 'canadaWide', section: 'Understanding your rights',
    label: 'Funeral Law in Canada', url: 'https://www.canada.ca/en/services/benefits/after-death.html' },
  { domains: ['deathcare'], scope: 'canadaWide', section: 'Understanding your rights',
    label: 'Overview of disposition methods and legality across provinces and territories', url: 'https://ncceh.ca/resources/evidence-reviews/alternative-disposition-services-green-burial-alkaline-hydrolysis-and' },

  // ═══════════════════════════ DEATHCARE — By province ═══════════════════════════
  // Funeral-cost benefit entries are dual ['deathcare','personal_admin'] — one entry each,
  // surfacing in both areas (Personal Admin picks them up automatically when it's built).
  // British Columbia (bcfunerals.com kept — industry body; organ-donation upgraded to https)
  { domains: ['deathcare'], scope: 'British Columbia', section: '',
    label: 'Deathcare and Funeral Planning', url: 'https://www.bcfunerals.com/wp-content/uploads/2024/06/BCFA-Guide-On-Death-and-Dying-2024.pdf' },
  { domains: ['deathcare'], scope: 'British Columbia', section: '',
    label: 'Organ Donation', url: 'https://www.transplant.bc.ca/' },
  { domains: ['deathcare', 'personal_admin'], scope: 'British Columbia', section: '', // dual: funeral-cost benefit + admin
    label: 'Financial Support', url: 'https://www2.gov.bc.ca/gov/content/life-events/death/after-death/get-support#Get-Financial-Support' },

  // Alberta (canadianfunerals see-also dropped; AFSRB regulator added)
  { domains: ['deathcare'], scope: 'Alberta', section: '',
    label: 'Organ Donation', url: 'https://myhealth.alberta.ca/pages/otdrhome.aspx' },
  { domains: ['deathcare'], scope: 'Alberta', section: '',
    label: 'Funeral Planning', url: 'https://www.albertahealthservices.ca/services/Page3816.aspx' },
  { domains: ['deathcare'], scope: 'Alberta', section: '',
    label: 'Alberta Funeral Services Regulatory Board — Consumer Information', url: 'https://www.afsrb.ab.ca/consumer' },
  { domains: ['deathcare', 'personal_admin'], scope: 'Alberta', section: '', // dual
    label: 'Funeral Benefits', url: 'https://www.alberta.ca/funeral-benefits' },

  // Saskatchewan (plea.org kept — non-profit)
  { domains: ['deathcare'], scope: 'Saskatchewan', section: '',
    label: 'Funerals and Deathcare Options', url: 'https://www.plea.org/death-estates/a-death-in-the-family/funerals-cremation-burial' },
  { domains: ['deathcare'], scope: 'Saskatchewan', section: '',
    label: 'Organ Donation', url: 'https://www.saskatchewan.ca/residents/health/accessing-health-care-services/organ-and-tissue-donor-registry' },
  { domains: ['deathcare', 'personal_admin'], scope: 'Saskatchewan', section: '', // dual
    label: 'Funeral Benefits', url: 'https://www.saskatchewan.ca/residents/family-and-social-support/financial-help/saskatchewan-income-support-sis' },

  // Ontario (BAO consumer guide added — the ON funeral-regulator equivalent of the boards
  // above; a distinct BAO page from the consumer-FAQ used for ON financial support in PA)
  { domains: ['deathcare'], scope: 'Ontario', section: '',
    label: 'Organ Donation', url: 'https://beadonor.ca/' },
  { domains: ['deathcare'], scope: 'Ontario', section: '',
    label: 'A Guide to Death Care in Ontario (BAO)', url: 'https://thebao.ca/for-consumers/consumer-information-guide/' },

  // Quebec (7 mis-filed healthcare/incapacity entries dropped; canadianfunerals see-also dropped)
  { domains: ['deathcare'], scope: 'Quebec', section: '',
    label: 'Organ Donation', url: 'https://www.transplantquebec.ca/en' },
  { domains: ['deathcare'], scope: 'Quebec', section: '', // planning activity, not a funeral benefit → deathcare-only (not a PA dual)
    label: 'Pre-Arranged Funerals', url: 'https://educaloi.qc.ca/en/capsules/pre-arranged-funeral-contracts/' },

  // Manitoba (ethicaldeathcare.com dropped; Funeral Board of Manitoba added)
  { domains: ['deathcare'], scope: 'Manitoba', section: '',
    label: 'Organ Donation', url: 'https://www.transplantmanitoba.ca/transplant-program' },
  { domains: ['deathcare'], scope: 'Manitoba', section: '',
    label: 'Funeral Board of Manitoba', url: 'https://www.gov.mb.ca/funeraldirectorsboard/' },
  { domains: ['deathcare', 'personal_admin'], scope: 'Manitoba', section: '', // dual
    label: 'Employment and Income Assistance funeral benefits', url: 'https://www.gov.mb.ca/fs/eia_manual/23.html' },

  // New Brunswick (canadianfunerals + eirenecremations dropped; FCNB regulator added)
  { domains: ['deathcare'], scope: 'New Brunswick', section: '',
    label: 'Organ Donation', url: 'https://www2.gnb.ca/content/gnb/en/departments/health/Hospital-Services/content/organ_donation.html' },
  { domains: ['deathcare'], scope: 'New Brunswick', section: '',
    label: 'Funeral Providers — Financial and Consumer Services Commission', url: 'https://fcnb.ca/en/consumer-protections/funeral-providers' },
  { domains: ['deathcare', 'personal_admin'], scope: 'New Brunswick', section: '', // dual
    label: 'Funeral Benefits', url: 'https://www2.gnb.ca/content/gnb/en/services/services_renderer.201319.Funeral_Benefit.html' },

  // Nova Scotia (prose contact reformatted to a titled entry; caregiversns.org / legalinfo.org kept)
  { domains: ['deathcare'], scope: 'Nova Scotia', section: '',
    label: 'Organ Donation', url: 'https://www.nshealth.ca/clinics-programs-and-services/legacy-life' },
  { domains: ['deathcare'], scope: 'Nova Scotia', section: '',
    label: 'Funerals and Body Disposition', url: 'https://caregiversns.org/resources/peolc/funerals-and-burials/' },
  { domains: ['deathcare'], scope: 'Nova Scotia', section: '',
    label: 'Funeral Pre-Planning', url: 'https://www.legalinfo.org/wills-and-estates-law/funeral-plan' },
  { domains: ['deathcare'], scope: 'Nova Scotia', section: '',
    label: 'Funeral Expenses: Your Rights', url: 'https://beta.novascotia.ca/funeral-expenses-your-rights' },
  { domains: ['deathcare'], scope: 'Nova Scotia', section: '',
    label: 'Support for funeral costs — Community Services contacts', url: 'https://novascotia.ca/coms/department/contact/index.html' },

  // Prince Edward Island (canadianfunerals dropped; Funeral Services & Professions Board added)
  { domains: ['deathcare'], scope: 'Prince Edward Island', section: '',
    label: 'Organ Donation', url: 'https://www.princeedwardisland.ca/en/service/register-as-an-organ-andor-tissue-donor' },
  { domains: ['deathcare'], scope: 'Prince Edward Island', section: '',
    label: 'PEI Funeral Services and Professions Board', url: 'https://www.princeedwardisland.ca/en/information/health-and-wellness/about-the-pei-funeral-services-and-professions-board' },
  { domains: ['deathcare', 'personal_admin'], scope: 'Prince Edward Island', section: '', // dual
    label: 'Social Assistance with Burial Expenses', url: 'https://www.princeedwardisland.ca/en/publication/social-assistance-policy-burial-expenses' },

  // Newfoundland and Labrador (canadianfunerals dropped; Embalmers & Funeral Directors Board added)
  { domains: ['deathcare'], scope: 'Newfoundland and Labrador', section: '',
    label: 'Organ Donation', url: 'https://www.easternhealth.ca/find-health-care/organ-donation/' },
  { domains: ['deathcare'], scope: 'Newfoundland and Labrador', section: '',
    label: 'Embalmers and Funeral Directors Board of Newfoundland and Labrador', url: 'https://www.nlfuneralboard.ca/' },
  { domains: ['deathcare', 'personal_admin'], scope: 'Newfoundland and Labrador', section: '', // dual
    label: 'Funeral Assistance Program', url: 'https://www.gov.nl.ca/cssd/funeral-benefits/' },

  // Yukon (disposition-overview de-duplicated to Canada-wide; long parentheticals → notes)
  { domains: ['deathcare'], scope: 'Yukon', section: '',
    label: 'Organ Donation', url: 'https://yukon.ca/en/health-and-wellness/health-concerns-diseases-and-conditions/donate-your-organs' },
  { domains: ['deathcare'], scope: 'Yukon', section: '',
    label: 'Funeral Directors Act', url: 'https://laws.yukon.ca/cms/images/LEGISLATION/PRINCIPAL/2002/2002-0098/2002-0098.pdf', note: 'Regulates funeral practices.' },
  { domains: ['deathcare', 'personal_admin'], scope: 'Yukon', section: '', // dual
    label: 'Income Assistance Program', url: 'https://www.sac-isc.gc.ca/eng/1513197678048/1533317287697', note: 'Support for funeral costs for eligible individuals ordinarily resident on reserve or Status First Nations in Yukon.' },

  // Northwest Territories (disposition-overview de-duplicated to Canada-wide)
  { domains: ['deathcare'], scope: 'Northwest Territories', section: '',
    label: 'Organ Donation', url: 'https://www.hss.gov.nt.ca/en/services/organ-and-tissue-donation/organ-and-tissue-donation-registration-process' },
  { domains: ['deathcare', 'personal_admin'], scope: 'Northwest Territories', section: '', // dual
    label: 'Financial Support with Funerals and Burial', url: 'https://www.hss.gov.nt.ca/sites/hss/files/resources/md-funeral-burial-cremation-program-guidelines.pdf' },

  // Nunavut (organ donation managed by Alberta, per source)
  { domains: ['deathcare'], scope: 'Nunavut', section: '',
    label: 'Organ Donation', url: 'https://myhealth.alberta.ca/Pages/OTDRHome.aspx', note: 'Managed by Alberta.' },
  { domains: ['deathcare', 'personal_admin'], scope: 'Nunavut', section: '', // dual
    label: 'Seniors Burial Benefit', url: 'https://www.gov.nu.ca/en/newsroom/income-assistance-seniors-burial-benefit-2022-02-14' },
]

// Everything the AreaResources component needs in one call: Canada-wide resources for the
// domain, plus the resources for the user's province (empty if province is unset/unknown).
export function resourcesFor(domain: string, province: string | undefined): {
  canadaWide: Resource[]
  provincial: Resource[]
} {
  const inDomain = RESOURCES.filter((r) => r.domains.includes(domain as DomainCode))
  return {
    canadaWide: inDomain.filter((r) => r.scope === 'canadaWide'),
    provincial: province ? inDomain.filter((r) => r.scope === province) : [],
  }
}

// Whether a domain has any resources to show yet (Canada-wide is the floor). Gates the
// Resources section on the area page — a domain with no data renders no section, so the
// other five areas stay unchanged until their data lands.
export function hasResources(domain: string): boolean {
  return RESOURCES.some((r) => r.domains.includes(domain as DomainCode) && r.scope === 'canadaWide')
}
