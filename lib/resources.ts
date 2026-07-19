// Province-specific resource data for the area pages — replaces the old external
// Resource Hub link-out. Static content module (like DOMAIN_STRUCTURES / lib/areas.ts /
// the Learn content); no DB, no query layer. Rendered by app/components/area/AreaResources.
//
// A resource belongs to exactly ONE domain (single-domain model — no multi-domain tagging;
// cross-domain relevance is handled by cross-pointer PAGE COPY, not by duplicating a
// resource). Domain keys are containers.domain_code (lib/areas.ts AREAS).
//
// Data vs. page copy: label/url/domain/section/scope/note are DATA (here). Section intro
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
  domain: DomainCode
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
    'Housing',
    {
      group: 'Equitable and culturally-sensitive planning',
      sections: [
        'Understanding your rights',
        '2SLGBTQ+ resources',
        'Indigenous resources',
        'Medical Assistance in Dying (MAiD)',
      ],
    },
  ],
}

export const RESOURCES: Resource[] = [
  // ═══════════════════════════ HEALTHCARE — Canada-wide ═══════════════════════════
  { domain: 'healthcare', scope: 'canadaWide', section: 'Advance Care Planning',
    label: 'Advance care planning Canada', url: 'https://www.advancecareplanning.ca/' },

  { domain: 'healthcare', scope: 'canadaWide', section: 'Housing',
    label: 'Planning for future housing needs', url: 'https://www.canada.ca/en/employment-social-development/corporate/seniors-forum-federal-provincial-territorial/housing-needs-planning.html' },
  { domain: 'healthcare', scope: 'canadaWide', section: 'Housing',
    label: 'Housing Options for Seniors', url: 'https://www.canada.ca/en/financial-consumer-agency/services/retirement-planning/cost-seniors-housing.html' },
  { domain: 'healthcare', scope: 'canadaWide', section: 'Housing',
    label: 'Thinking about aging in place', url: 'https://www.canada.ca/en/employment-social-development/corporate/seniors-forum-federal-provincial-territorial/aging.html' },
  { domain: 'healthcare', scope: 'canadaWide', section: 'Housing',
    label: 'CanAge: Caregiving, Long-Term Care, Home Care, and Housing Resources', url: 'https://canage.ca/advocacy/policy-book/caregiving-long-term-care-home-care-and-housing-resources/' },

  { domain: 'healthcare', scope: 'canadaWide', section: 'Understanding your rights',
    label: 'Dying with Dignity Canada: Patient Rights Guide', url: 'https://www.dyingwithdignity.ca/education-resources/patient-rights-guide/' },
  { domain: 'healthcare', scope: 'canadaWide', section: 'Understanding your rights',
    label: 'Patient Rights 101 Webinar', url: 'https://www.dyingwithdignity.ca/education-resources/patient-rights-101/' },

  { domain: 'healthcare', scope: 'canadaWide', section: '2SLGBTQ+ resources',
    label: 'Rainbow Health Ontario', url: 'https://www.rainbowhealthontario.ca/' },
  { domain: 'healthcare', scope: 'canadaWide', section: '2SLGBTQ+ resources',
    label: 'The National Resource Center on 2SLGBTQI Aging', url: 'https://2slgbtqi-aging.ca/' },
  { domain: 'healthcare', scope: 'canadaWide', section: '2SLGBTQ+ resources',
    label: 'Canadian Virtual Hospice: Two-Spirit and LGBTQ+ Resources', url: 'https://www.virtualhospice.ca/2SLGBTQ' },
  { domain: 'healthcare', scope: 'canadaWide', section: '2SLGBTQ+ resources',
    label: 'My Choices for Safe and Inclusive Healthcare', url: 'https://www.virtualhospice.ca/2SLGBTQ/articles/my-choices-for-safe-and-inclusive-healthcare/' },

  { domain: 'healthcare', scope: 'canadaWide', section: 'Indigenous resources',
    label: 'Living My Culture: First Nations Resources', url: 'https://livingmyculture.ca/culture/first-nations/' },
  { domain: 'healthcare', scope: 'canadaWide', section: 'Indigenous resources',
    label: 'First Nations Health Authority: End-of-Life Journey', url: 'https://fnha.ca/services-and-support/access-and-support/end-of-life-journey/' },
  { domain: 'healthcare', scope: 'canadaWide', section: 'Indigenous resources',
    label: 'First Nations Health Authority: Advance Care Planning', url: 'https://fnha.ca/services-and-support/access-and-support/advance-care-planning/' },
  { domain: 'healthcare', scope: 'canadaWide', section: 'Indigenous resources',
    label: 'Reclaiming cultural teachings about mortality, grief, loss, death and dying (essay by Chrystal Waban Toop)', url: 'https://www.dyingwithdignity.ca/blog/reclaiming-cultural-teachings-about-mortality-grief-loss-death-and-dying/' },

  { domain: 'healthcare', scope: 'canadaWide', section: 'Medical Assistance in Dying (MAiD)',
    label: 'MAiD Family Support Society', url: 'https://www.dyingwithdignity.ca/education-resources/maid-family-support-society/' },
  { domain: 'healthcare', scope: 'canadaWide', section: 'Medical Assistance in Dying (MAiD)',
    label: 'MAiD Fact Sheet', url: 'https://www.dyingwithdignity.ca/education-resources/fact-sheet-what-is-maid/' },
  { domain: 'healthcare', scope: 'canadaWide', section: 'Medical Assistance in Dying (MAiD)',
    label: 'MAiD Information and Province-Specific Resources', url: 'https://www.canada.ca/en/health-canada/services/health-services-benefits/medical-assistance-dying/supports-resources.html' },

  // ═══════════════════════════ HEALTHCARE — By province ═══════════════════════════
  // British Columbia
  { domain: 'healthcare', scope: 'British Columbia', section: '',
    label: 'Incapacity Planning', url: 'https://www2.gov.bc.ca/gov/content/health/managing-your-health/incapacity-planning' },
  { domain: 'healthcare', scope: 'British Columbia', section: '',
    label: 'Substitute Decision Making', url: 'https://www2.gov.bc.ca/gov/content/family-social-supports/seniors/financial-legal-matters/substitute-decision-making' },
  { domain: 'healthcare', scope: 'British Columbia', section: '',
    label: 'Representation Agreements', url: 'https://www.trustee.bc.ca/adults/personal-planning-tools#ra-details' },
  { domain: 'healthcare', scope: 'British Columbia', section: '',
    label: 'Advance Care Planning', url: 'https://www2.gov.bc.ca/gov/content/family-social-supports/seniors/health-safety/advance-care-planning' },
  { domain: 'healthcare', scope: 'British Columbia', section: '',
    label: 'Advance Directives', url: 'https://www2.gov.bc.ca/assets/gov/people/seniors/health-safety/pdf/faqadvancecareplanning.pdf' },

  // Alberta
  { domain: 'healthcare', scope: 'Alberta', section: '',
    label: 'Advance Care Planning', url: 'https://www.alberta.ca/decision-making-advance-planning' },
  { domain: 'healthcare', scope: 'Alberta', section: '',
    label: 'Personal Directives', url: 'https://www.alberta.ca/personal-directive' },

  // Saskatchewan
  { domain: 'healthcare', scope: 'Saskatchewan', section: '',
    label: 'Advance Care Planning', url: 'https://www.saskhealthauthority.ca/your-health/conditions-diseases-services/advance-care-planning' },
  { domain: 'healthcare', scope: 'Saskatchewan', section: '',
    label: 'Substitute Decision Makers', url: 'https://www.saskhealthauthority.ca/sites/default/files/2022-02/CS-PIER-0001-ACP-Appointing-a-Proxy.pdf' },
  { domain: 'healthcare', scope: 'Saskatchewan', section: '',
    label: 'Healthcare Directives', url: 'https://publications.saskatchewan.ca/#/categories/5390' },
  { domain: 'healthcare', scope: 'Saskatchewan', section: '',
    label: 'Healthcare Directive Template', url: 'https://dyingwithdignity.ca/wp-content/uploads/2023/03/DWDC_2024ACP_SaskatchewanForm_ENG.pdf' },

  // Ontario
  { domain: 'healthcare', scope: 'Ontario', section: '',
    label: 'Advance Care Planning', url: 'https://www.advancecareplanningontario.ca/' },
  { domain: 'healthcare', scope: 'Ontario', section: '',
    label: 'Substitute Decision Makers', url: 'https://ontariohealthathome.ca/getting-started/substitute-decision-maker/' },
  { domain: 'healthcare', scope: 'Ontario', section: '',
    label: 'Powers of Attorney', url: 'https://www.ontario.ca/page/make-power-attorney' },
  { domain: 'healthcare', scope: 'Ontario', section: '',
    label: 'Powers of Attorney Templates', url: 'https://www.publications.gov.on.ca/300975' },
  { domain: 'healthcare', scope: 'Ontario', section: '',
    label: 'Advance Directive and POA templates', url: 'https://dyingwithdignity.ca/wp-content/uploads/2023/03/DWDC_2024ACP_OntarioForm_ENG.pdf' },

  // Quebec
  { domain: 'healthcare', scope: 'Quebec', section: '',
    label: 'Advance Directives', url: 'https://www.quebec.ca/en/health/health-system-and-services/end-of-life-care/advance-medical-directives' },
  { domain: 'healthcare', scope: 'Quebec', section: '',
    label: 'Advance Directive Template', url: 'https://dyingwithdignity.ca/wp-content/uploads/2023/03/DWDC_2024ACP_QuebecForm_ENG.pdf' },
  { domain: 'healthcare', scope: 'Quebec', section: '',
    label: 'Substitute Decision Making', url: 'https://www.quebec.ca/en/family-and-support-for-individuals/incapacity-loss-independance/consent-care-incapacity' },
  { domain: 'healthcare', scope: 'Quebec', section: '',
    label: 'Protection Mandates', url: 'https://www.quebec.ca/en/justice-and-civil-status/legal-protection/protection-mandate/about-protection-mandate' },
  { domain: 'healthcare', scope: 'Quebec', section: '',
    label: 'Incapacity Planning and Mandataries', url: 'https://educaloi.qc.ca/en/capsules/protection-mandates-naming-someone-to-act-for-you/' },
  { domain: 'healthcare', scope: 'Quebec', section: '',
    label: 'Protection Mandate Template', url: 'https://cdn-contenu.quebec.ca/cdn-contenu/curateur-public/pdf/form_mandat_en.pdf' },
  { domain: 'healthcare', scope: 'Quebec', section: '',
    label: 'Responsibilities of Mandataries', url: 'https://www.quebec.ca/en/justice-and-civil-status/legal-protection/protection-mandate/role-responsibilities-mandatary' },

  // Manitoba
  { domain: 'healthcare', scope: 'Manitoba', section: '',
    label: 'Advance Care Planning', url: 'https://wrha.mb.ca/advance-care-planning/' },
  { domain: 'healthcare', scope: 'Manitoba', section: '',
    label: 'Healthcare directives and proxies', url: 'https://www.gov.mb.ca/health/livingwill.html' },
  { domain: 'healthcare', scope: 'Manitoba', section: '',
    label: 'Healthcare Directive Templates', url: 'https://www.gov.mb.ca/health/documents/health_care_directive.pdf' },
  { domain: 'healthcare', scope: 'Manitoba', section: '',
    label: 'Healthcare Directive Template (Dying With Dignity)', url: 'https://dyingwithdignity.ca/wp-content/uploads/2023/03/DWDC_2024ACP_ManitobaForm_ENG.pdf' },
  { domain: 'healthcare', scope: 'Manitoba', section: '',
    label: 'Legal guide on wills, powers of attorney, and health care directives', url: 'https://www.gov.mb.ca/publictrustee/pdf/legal_guide_seniors.pdf' },

  // New Brunswick
  { domain: 'healthcare', scope: 'New Brunswick', section: '',
    label: 'Advance Care Planning', url: 'https://horizonnb.ca/patients-visitors/advance-care-planning/' },
  { domain: 'healthcare', scope: 'New Brunswick', section: '',
    label: 'Healthcare Directives Guide and Templates', url: 'https://www.legal-info-legale.nb.ca/en/uploads/file/pdfs/health_law/Health_Care_Directives_EN.pdf' },
  { domain: 'healthcare', scope: 'New Brunswick', section: '',
    label: 'Advance Care Planning Form (Dying With Dignity)', url: 'https://dyingwithdignity.ca/wp-content/uploads/2023/03/DWDC_2024ACP_NewBrunswickForm_ENG.pdf' },
  { domain: 'healthcare', scope: 'New Brunswick', section: '',
    label: 'Enduring Powers of Attorney', url: 'https://socialsupportsnb.ca/en/simple_page/enduring-powers-attorney' },
  { domain: 'healthcare', scope: 'New Brunswick', section: '',
    label: 'Enduring Power of Attorney Template', url: 'https://www.legal-info-legale.nb.ca/en/uploads/file/pdfs/planning_ahead/F-1.%20Enduring%20Power%20of%20Attorney%20for%20Personal%20Care%20-%20Forms%20-%20English.pdf' },

  // Nova Scotia
  { domain: 'healthcare', scope: 'Nova Scotia', section: '',
    label: 'Advance Care Planning', url: 'https://www.nshealth.ca/patient-education-resources/1942' },
  { domain: 'healthcare', scope: 'Nova Scotia', section: '',
    label: 'Personal Directives Information and Template', url: 'https://novascotia.ca/just/pda/' },
  { domain: 'healthcare', scope: 'Nova Scotia', section: '',
    label: 'Personal Directive Template (Dying With Dignity)', url: 'https://www.dyingwithdignity.ca/wp-content/uploads/2023/03/DWDC_2024ACP_NovaScotiaForm_ENG_.pdf' },

  // Prince Edward Island
  { domain: 'healthcare', scope: 'Prince Edward Island', section: '',
    label: 'Advance Care Planning and Goals of Care Designations', url: 'https://www.princeedwardisland.ca/en/information/health-pei/advance-care-planning' },
  { domain: 'healthcare', scope: 'Prince Edward Island', section: '',
    label: 'Healthcare Directive and Proxy Designation Template', url: 'https://www.princeedwardisland.ca/sites/default/files/publications/health_care_directive_form.pdf' },
  { domain: 'healthcare', scope: 'Prince Edward Island', section: '',
    label: 'Goals of Care Form Template', url: 'https://www.princeedwardisland.ca/sites/default/files/forms/goals_of_care_form.pdf' },

  // Newfoundland and Labrador
  { domain: 'healthcare', scope: 'Newfoundland and Labrador', section: '',
    label: 'Advance Care Planning', url: 'https://peolc.easternhealth.ca/planning-for-future-care/advance-care-planning/' },
  { domain: 'healthcare', scope: 'Newfoundland and Labrador', section: '',
    label: 'Advance Healthcare Directives', url: 'https://publiclegalinfo.com/legal-info/wills-and-estates/advance-health-care-directives/' },
  { domain: 'healthcare', scope: 'Newfoundland and Labrador', section: '',
    label: 'Substitute Decision Makers', url: 'https://peolc.easternhealth.ca/planning-for-future-care/substitute-decision-maker/' },
  { domain: 'healthcare', scope: 'Newfoundland and Labrador', section: '',
    label: 'Advance Healthcare Directive Template', url: 'https://dyingwithdignity.ca/wp-content/uploads/2023/03/DWDC_2024ACP_NewfoundlandForm_ENG.pdf', note: 'Includes substitute decision maker designation.' },

  // Yukon
  { domain: 'healthcare', scope: 'Yukon', section: '',
    label: 'Advance Care Planning and Proxies', url: 'https://yukon.ca/en/health-and-wellness/care-services/plan-your-future-health-care-decisions' },
  { domain: 'healthcare', scope: 'Yukon', section: '',
    label: 'Advance Care Planning Booklet', url: 'https://yukon.ca/sites/default/files/hss/hss-planning-your-future-healthcare-choices-advance_directives-yukon.pdf' },
  { domain: 'healthcare', scope: 'Yukon', section: '',
    label: 'Advance Directive Template', url: 'https://yukon.ca/en/abbreviated-advance-directive-valid-under-yukon-care-consent-act', note: 'Includes proxy designation.' },

  // Northwest Territories
  { domain: 'healthcare', scope: 'Northwest Territories', section: '',
    label: 'Personal Directives', url: 'https://www.hss.gov.nt.ca/en/services/personal-directives' },
  { domain: 'healthcare', scope: 'Northwest Territories', section: '',
    label: 'Personal Directive Template', url: 'https://dyingwithdignity.ca/wp-content/uploads/2023/03/DWDC_2024ACP_NWTForm_ENG.pdf' },

  // Nunavut
  { domain: 'healthcare', scope: 'Nunavut', section: '',
    label: 'Personal Directive Template', url: 'https://dyingwithdignity.ca/wp-content/uploads/2023/03/DWDC_2024ACP_NunavutForm_ENG.pdf' },
]

// Everything the AreaResources component needs in one call: Canada-wide resources for the
// domain, plus the resources for the user's province (empty if province is unset/unknown).
export function resourcesFor(domain: string, province: string | undefined): {
  canadaWide: Resource[]
  provincial: Resource[]
} {
  const inDomain = RESOURCES.filter((r) => r.domain === domain)
  return {
    canadaWide: inDomain.filter((r) => r.scope === 'canadaWide'),
    provincial: province ? inDomain.filter((r) => r.scope === province) : [],
  }
}

// Whether a domain has any resources to show yet (Canada-wide is the floor). Gates the
// Resources section on the area page — a domain with no data renders no section, so the
// other five areas stay unchanged until their data lands.
export function hasResources(domain: string): boolean {
  return RESOURCES.some((r) => r.domain === domain && r.scope === 'canadaWide')
}
