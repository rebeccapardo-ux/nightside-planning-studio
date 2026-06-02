import { Document, Page, Text, View, Image, StyleSheet, Svg, Path } from '@react-pdf/renderer'
import {
  DocHeader,
  DocFooter,
  TitleBlock,
  FinancialContent,
  ContactsContent,
  KeepsakeContent,
  GenericContent,
  ValuesRankingContent,
  PersonalAdminContent,
  DevicesAccountsContent,
  LegacyMapContent,
  LegacyMapLandscapePage,
  WatermarkBanner,
} from './ExportPDFDocument'
import type { PDFData } from './types'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const ALL_POSSIBLE_MATERIAL_TITLES = [
  'My Care Wishes',
  'Wishes for My Body, Funeral & Ceremony',
  'Personal Admin Information',
  'Important Contacts',
  'Financial Information',
  'Devices & Accounts',
  'Keepsakes Inventory',
  'Values Ranking',
  'Fears Ranking',
  'Legacy Map',
]

const DOMAIN_DISPLAY_ORDER = ['healthcare', 'deathcare', 'legacy', 'will', 'personal', 'ritual']

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type PlanKeyDetail = {
  label: string
  value: string | null
  details?: string[]
}

export type PlanCheckboxItem = {
  label: string
  checked: boolean
}

export type PlanReadinessGroup = {
  title: string
  items: PlanCheckboxItem[]
}

export type PlanDomainStatus = {
  title: string
  label: string
  topicsStarted: number
  totalTopics: number
  readinessGroups: PlanReadinessGroup[]
}

export type PlanMaterial = {
  title: string
  pdfData: PDFData
}

export type PlanPDFProps = {
  userName: string
  exportDate: string
  keyDetails: PlanKeyDetail[]
  domainStatuses: PlanDomainStatus[]
  materials: PlanMaterial[]
  mode: 'summary' | 'full'
  // Optional: explicit logo URL for SSR contexts (release script). Browser
  // contexts fall back to window.location.origin via resolveLogoUrl.
  logoUrl?: string
  // Optional: visible top-of-page banner (e.g. "DRAFT") rendered on every
  // page when the release script runs in --dry-run mode. Unset for normal
  // in-app exports.
  watermark?: string
}

// ---------------------------------------------------------------------------
// Summary page styles
// ---------------------------------------------------------------------------

const SP = StyleSheet.create({
  page: {
    fontFamily: 'Helvetica',
    backgroundColor: '#FFFFFF',
    paddingTop: 80,
    paddingBottom: 60,
    paddingLeft: 56,
    paddingRight: 56,
  },
  fixedHeader: {
    position: 'absolute',
    top: 24,
    left: 56,
    right: 56,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 5,
  },
  headerRule: {
    height: 0.5,
    backgroundColor: '#C8C8C8',
  },
  fixedFooter: {
    position: 'absolute',
    bottom: 22,
    left: 56,
    right: 56,
  },
  footerRule: {
    height: 0.5,
    backgroundColor: '#D0D0D0',
    marginBottom: 7,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  pageTitle: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 24,
    color: '#1A1A1A',
    marginBottom: 3,
  },
  pageSub: {
    fontFamily: 'Helvetica',
    fontSize: 10,
    color: '#888888',
    marginBottom: 22,
  },
  sectionLabel: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 8.5,
    color: '#555555',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginTop: 20,
    marginBottom: 4,
  },
  sectionRule: {
    height: 0.5,
    backgroundColor: '#D8D8D8',
    marginBottom: 10,
  },
  kdRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottomWidth: 0.5,
    borderBottomColor: '#EEEEEE',
    borderBottomStyle: 'solid',
  },
  kdLabel: {
    fontFamily: 'Helvetica',
    fontSize: 10,
    color: '#555555',
    width: '52%',
  },
  kdValue: {
    fontFamily: 'Helvetica',
    fontSize: 10,
    color: '#1A1A1A',
    width: '48%',
    textAlign: 'right',
  },
  kdValueMuted: {
    fontFamily: 'Helvetica',
    fontSize: 10,
    color: '#BBBBBB',
    width: '48%',
    textAlign: 'right',
    fontStyle: 'italic',
  },
  kdDetail: {
    fontFamily: 'Helvetica',
    fontSize: 8.5,
    color: '#999999',
    paddingLeft: 8,
    marginTop: 2,
    marginBottom: 4,
  },
  domainRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 5,
    borderBottomWidth: 0.5,
    borderBottomColor: '#F0F0F0',
    borderBottomStyle: 'solid',
  },
  psDomainName: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 10,
    color: '#130426',
    marginBottom: 3,
  },
  psDomainLabel: {
    fontFamily: 'Helvetica',
    fontSize: 9,
    color: 'rgba(19,4,38,0.5)',
    marginBottom: 5,
  },
  psTopicName: {
    fontFamily: 'Helvetica',
    fontSize: 9,
    color: '#130426',
    flex: 1,
  },
  psTopicNameMuted: {
    fontFamily: 'Helvetica',
    fontSize: 9,
    color: 'rgba(19,4,38,0.5)',
    flex: 1,
  },
  psRowTitle: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 9,
    color: 'rgba(19,4,38,0.7)',
    marginTop: 4,
    marginBottom: 3,
  },
  psCheckboxChecked: {
    width: 9,
    height: 9,
    backgroundColor: '#2C3777',
    borderRadius: 2,
    flexShrink: 0,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 6,
  },
  psCheckboxUnchecked: {
    width: 9,
    height: 9,
    borderWidth: 1,
    borderColor: 'rgba(19,4,38,0.25)',
    borderStyle: 'solid',
    borderRadius: 2,
    flexShrink: 0,
    marginRight: 6,
  },
  tocItem: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  tocBullet: {
    fontFamily: 'Helvetica',
    fontSize: 10,
    color: '#BBBBBB',
    width: 14,
  },
  tocTitle: {
    fontFamily: 'Helvetica',
    fontSize: 10,
    color: '#1A1A1A',
  },
  tocNotStarted: {
    fontFamily: 'Helvetica-Oblique',
    fontSize: 10,
    color: '#999999',
    marginLeft: 5,
  },
  checkboxChecked: {
    width: 11,
    height: 11,
    backgroundColor: '#130426',
    borderRadius: 2,
    flexShrink: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxUnchecked: {
    width: 11,
    height: 11,
    borderWidth: 1.5,
    borderColor: '#CCCCCC',
    borderStyle: 'solid',
    borderRadius: 2,
    flexShrink: 0,
  },
})

// ---------------------------------------------------------------------------
// Material page styles (mirrors ExportPDFDocument's S.page)
// ---------------------------------------------------------------------------

const MP = StyleSheet.create({
  page: {
    fontFamily: 'Helvetica',
    backgroundColor: '#FFFFFF',
    paddingTop: 84,
    paddingBottom: 72,
    paddingLeft: 50,
    paddingRight: 50,
  },
})

// ---------------------------------------------------------------------------
// Summary page
// ---------------------------------------------------------------------------

function SummaryPage({ planProps }: { planProps: PlanPDFProps }) {
  const resolvedLogo = planProps.logoUrl
    ?? (typeof window !== 'undefined' ? `${window.location.origin}/nightside-wordmark-black.png` : null)

  return (
    <Page size="A4" style={SP.page}>
      <WatermarkBanner text={planProps.watermark} />

      {/* Fixed header */}
      <View fixed style={SP.fixedHeader}>
        <View style={SP.headerRow}>
          {resolvedLogo ? (
            // eslint-disable-next-line jsx-a11y/alt-text -- @react-pdf/renderer Image renders to PDF, not DOM
            <Image src={resolvedLogo} style={{ height: 14 }} />
          ) : <View style={{ height: 14 }} />}
          <Text style={{ fontFamily: 'Helvetica', fontSize: 9, color: 'rgba(19,4,38,0.45)' }}>
            {planProps.userName}
          </Text>
        </View>
        <View style={SP.headerRule} />
      </View>

      {/* Fixed footer */}
      <View fixed style={SP.fixedFooter}>
        <View style={SP.footerRule} />
        <View style={SP.footerRow}>
          <Text style={{ flex: 1, fontFamily: 'Helvetica', fontSize: 8.5, color: '#6B6B6B' }}> </Text>
          <Text style={{ flex: 3, fontFamily: 'Helvetica', fontSize: 8.5, color: '#6B6B6B', textAlign: 'center' }}>
            Generated from Nightside Planning Studio
          </Text>
          <Text
            style={{ flex: 1, fontFamily: 'Helvetica', fontSize: 8.5, color: '#6B6B6B', textAlign: 'right' }}
            render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`}
          />
        </View>
      </View>

      {/* Page title */}
      <Text style={SP.pageTitle}>Your Plan</Text>
      <Text style={SP.pageSub}>{planProps.userName} · {planProps.exportDate}</Text>

      {/* Summary header */}
      <Text style={{ fontFamily: 'Helvetica', fontSize: 20, color: '#130426', marginBottom: 18 }}>Summary</Text>

      {/* Key Details */}
      <Text style={SP.sectionLabel}>Key Details</Text>
      <View style={SP.sectionRule} />
      {planProps.keyDetails.map((row, i) => (
        <View key={i}>
          <View style={SP.kdRow}>
            <Text style={SP.kdLabel}>{row.label}</Text>
            {row.value
              ? <Text style={SP.kdValue}>{row.value}</Text>
              : <Text style={SP.kdValueMuted}>Not recorded</Text>
            }
          </View>
          {row.details?.map((d, j) => (
            <Text key={j} style={SP.kdDetail}>{d}</Text>
          ))}
        </View>
      ))}

      {/* Planning Status */}
      {(() => {
        if (planProps.domainStatuses.length === 0) return null
        const sorted = [...planProps.domainStatuses].sort((a, b) => {
          const ai = DOMAIN_DISPLAY_ORDER.findIndex(m => a.title.toLowerCase().includes(m))
          const bi = DOMAIN_DISPLAY_ORDER.findIndex(m => b.title.toLowerCase().includes(m))
          return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi)
        })
        const pairs: (typeof sorted)[] = []
        for (let i = 0; i < sorted.length; i += 2) pairs.push(sorted.slice(i, i + 2))
        return (
          <View>
            <Text style={SP.sectionLabel}>Practical Readiness</Text>
            <View style={SP.sectionRule} />
            {pairs.map((pair, pi) => (
              <View key={pi} style={{ flexDirection: 'row', marginBottom: 14 }}>
                {pair.map((domain, di) => (
                  <View key={di} style={{ flex: 1, paddingRight: di === 0 ? 12 : 0, paddingLeft: di === 1 ? 12 : 0 }}>
                    <Text style={SP.psDomainName}>{domain.title}</Text>
                    <Text style={SP.psDomainLabel}>{domain.label}</Text>
                    {domain.topicsStarted > 0 && domain.readinessGroups.map((group, gi) => (
                      <View key={gi}>
                        <Text style={SP.psRowTitle}>{group.title}</Text>
                        {group.items.map((item, ti) => (
                          <View key={ti} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 3 }}>
                            {item.checked ? (
                              <View style={SP.psCheckboxChecked}>
                                <Svg width="6" height="5" viewBox="0 0 8 6">
                                  <Path d="M1 3L3 5L7 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                                </Svg>
                              </View>
                            ) : (
                              <View style={SP.psCheckboxUnchecked} />
                            )}
                            <Text style={item.checked ? SP.psTopicName : SP.psTopicNameMuted}>{item.label}</Text>
                          </View>
                        ))}
                      </View>
                    ))}
                  </View>
                ))}
              </View>
            ))}
          </View>
        )
      })()}

      {/* What's included — full mode only */}
      {planProps.mode === 'full' && (() => {
        const includedTitles = new Set(planProps.materials.map(m => m.title))
        const includedCount = includedTitles.size
        const sorted = [...ALL_POSSIBLE_MATERIAL_TITLES].sort((a, b) => {
          return (includedTitles.has(a) ? 0 : 1) - (includedTitles.has(b) ? 0 : 1)
        })
        return (
          <View>
            <Text style={SP.sectionLabel}>
              {`What's included (${includedCount} of ${ALL_POSSIBLE_MATERIAL_TITLES.length} materials)`}
            </Text>
            <View style={SP.sectionRule} />
            {sorted.map((title, i) => {
              const included = includedTitles.has(title)
              return (
                <View key={i} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
                  {included ? (
                    <View style={SP.checkboxChecked}>
                      <Svg width="7" height="5" viewBox="0 0 8 6">
                        <Path d="M1 3L3 5L7 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      </Svg>
                    </View>
                  ) : (
                    <View style={SP.checkboxUnchecked} />
                  )}
                  <Text style={{ fontFamily: 'Helvetica', fontSize: 10, color: '#1A1A1A', marginLeft: 7 }}>
                    {title}
                  </Text>
                  {!included && (
                    <Text style={SP.tocNotStarted}>{' — Not yet started'}</Text>
                  )}
                </View>
              )
            })}
          </View>
        )
      })()}

    </Page>
  )
}

// ---------------------------------------------------------------------------
// Material page (portrait, one per non-legacy-map material)
// ---------------------------------------------------------------------------

function MaterialPage({ material, logoUrl, watermark }: { material: PlanMaterial; logoUrl?: string; watermark?: string }) {
  const data = material.pdfData
  const isActivity = data.kind === 'values_ranking' || data.kind === 'fears_ranking'

  return (
    <Page size="A4" style={MP.page}>
      <WatermarkBanner text={watermark} />
      <DocHeader userName={data.userName} logoUrl={logoUrl} />
      <DocFooter />
      <TitleBlock
        displayTitle={data.displayTitle}
        createdDate={data.createdDate}
        isActivity={isActivity}
      />
      {data.kind === 'financial'          && <FinancialContent data={data} />}
      {data.kind === 'important_contacts' && <ContactsContent data={data} />}
      {data.kind === 'keepsake_inventory' && <KeepsakeContent data={data} />}
      {data.kind === 'generic'            && <GenericContent data={data} />}
      {(data.kind === 'values_ranking' || data.kind === 'fears_ranking') && <ValuesRankingContent data={data} />}
      {data.kind === 'devices_accounts'   && <DevicesAccountsContent data={data} />}
      {data.kind === 'personal_admin'     && <PersonalAdminContent data={data} />}
      {data.kind === 'legacy_map'         && <LegacyMapContent data={data} />}
    </Page>
  )
}

// ---------------------------------------------------------------------------
// Main document
// ---------------------------------------------------------------------------

export default function PlanPDFDocument({ planProps }: { planProps: PlanPDFProps }) {
  return (
    <Document>
      <SummaryPage planProps={planProps} />
      {planProps.mode === 'full' && planProps.materials.map((material, i) => {
        if (material.pdfData.kind === 'legacy_map') {
          return <LegacyMapLandscapePage key={i} data={material.pdfData} logoUrl={planProps.logoUrl} watermark={planProps.watermark} />
        }
        return <MaterialPage key={i} material={material} logoUrl={planProps.logoUrl} watermark={planProps.watermark} />
      })}
    </Document>
  )
}
