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
