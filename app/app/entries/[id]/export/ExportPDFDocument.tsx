import { Document, Page, Text, View, Image, StyleSheet, Svg, Path } from '@react-pdf/renderer'
import type { PDFData, PDFFinancialAccount, PDFFinancialDebt, PDFContactEntry } from './pdfTypes'

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const S = StyleSheet.create({
  page: {
    fontFamily: 'Helvetica',
    backgroundColor: '#FFFFFF',
    paddingTop: 84,
    paddingBottom: 72,
    paddingLeft: 50,
    paddingRight: 50,
  },

  // Fixed header
  header: {
    position: 'absolute',
    top: 24,
    left: 50,
    right: 50,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 5,
  },
  headerText: {
    fontFamily: 'Helvetica',
    fontSize: 9,
    color: '#1A1A1A',
  },

  // Fixed footer
  footer: {
    position: 'absolute',
    bottom: 22,
    left: 50,
    right: 50,
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
  footerSpacer: {
    flex: 1,
  },
  footerText: {
    flex: 3,
    fontFamily: 'Helvetica',
    fontSize: 8.5,
    color: '#6B6B6B',
    textAlign: 'center',
  },
  pageNumber: {
    flex: 1,
    fontFamily: 'Helvetica',
    fontSize: 8.5,
    color: '#6B6B6B',
    textAlign: 'right',
  },

  // Document title block
  h1: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 28,
    color: '#1A1A1A',
    marginBottom: 6,
  },
  dateLine: {
    fontFamily: 'Helvetica',
    fontSize: 10,
    color: '#6B6B6B',
    marginBottom: 3,
  },
  disclaimer: {
    fontFamily: 'Helvetica',
    fontSize: 9,
    color: '#6B6B6B',
    lineHeight: 1.5,
    marginBottom: 14,
  },
  titleRule: {
    height: 0.5,
    backgroundColor: '#D0D0D0',
    marginBottom: 20,
  },
  headerRule: {
    height: 0.5,
    backgroundColor: '#C8C8C8',
  },

  // Section headers
  sectionWrap: {
    marginTop: 18,
    marginBottom: 10,
  },
  sectionLabel: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 9,
    color: '#444444',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  sectionRule: {
    height: 0.5,
    backgroundColor: '#D0D0D0',
  },

  // Entries
  entryWrap: {
    marginBottom: 10,
  },
  entryName: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 12,
    color: '#1A1A1A',
    marginBottom: 2,
  },
  entryLine: {
    fontFamily: 'Helvetica',
    fontSize: 10,
    color: '#666666',
    marginBottom: 1,
  },
  contactRole: {
    fontFamily: 'Helvetica',
    fontSize: 10,
    color: '#444444',
    marginBottom: 4,
  },

  // Intro paragraph (advance directive)
  introText: {
    fontFamily: 'Helvetica',
    fontSize: 10,
    color: '#4A4A4A',
    lineHeight: 1.65,
    marginBottom: 18,
  },

  // Generic fields
  fieldWrap: {
    marginBottom: 20,
  },
  fieldLabel: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 8.5,
    color: '#6B6B6B',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  fieldValue: {
    fontFamily: 'Helvetica',
    fontSize: 12,
    color: '#1A1A1A',
    lineHeight: 1.6,
  },

  // Values ranking
  rankingGroupWrap: {
    marginBottom: 14,
  },
  rankingGroupLabel: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 9,
    color: '#444444',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  rankingItem: {
    fontFamily: 'Helvetica',
    fontSize: 11,
    color: '#1A1A1A',
    marginBottom: 4,
    paddingLeft: 8,
  },

  // Legacy map moments
  momentRow: {
    flexDirection: 'row',
    gap: 10,
    paddingVertical: 8,
    borderBottomWidth: 0.5,
    borderBottomColor: '#E4E4E4',
    marginBottom: 2,
  },
  momentIndex: {
    fontFamily: 'Helvetica',
    fontSize: 8,
    color: '#C0C0C0',
    width: 18,
    paddingTop: 1,
  },
  momentTitle: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 11,
    color: '#1A1A1A',
    marginBottom: 2,
  },
  momentNote: {
    fontFamily: 'Helvetica',
    fontSize: 10,
    color: '#7A7A7A',
    lineHeight: 1.5,
    marginTop: 3,
  },
  reflectionLabel: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 9,
    color: '#6B6B6B',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginBottom: 4,
    marginTop: 16,
  },
  reflectionText: {
    fontFamily: 'Helvetica',
    fontSize: 11,
    color: '#1A1A1A',
    lineHeight: 1.6,
  },
})

// ---------------------------------------------------------------------------
// Shared layout fragments
// ---------------------------------------------------------------------------

function DocHeader() {
  const logoUrl = `${window.location.origin}/nightside-wordmark-black.png`
  return (
    <View fixed style={S.header}>
      <View style={S.headerRow}>
        <Image src={logoUrl} style={{ height: 15 }} />
      </View>
      <View style={S.headerRule} />
    </View>
  )
}

function DocFooter() {
  return (
    <View fixed style={S.footer}>
      <View style={S.footerRule} />
      <View style={S.footerRow}>
        <Text style={S.footerSpacer}> </Text>
        <Text style={S.footerText}>
          This document was generated from your materials in Nightside Planning Studio.
        </Text>
        <Text
          style={S.pageNumber}
          render={({ pageNumber, totalPages }) => `${pageNumber}/${totalPages}`}
        />
      </View>
    </View>
  )
}

function TitleBlock({ displayTitle, createdDate, isActivity }: { displayTitle: string; createdDate: string | null; isActivity?: boolean }) {
  return (
    <View>
      <Text style={S.h1}>{displayTitle}</Text>
      {createdDate && (
        <Text style={S.dateLine}>{isActivity ? 'Generated' : 'Last saved'} {createdDate}</Text>
      )}
      <Text style={S.disclaimer}>
        {isActivity
          ? 'This is a generated record of your responses. It is not a legal document.'
          : 'This is a record of your responses at the time of your last save. It is not a legal document.'}
      </Text>
      <View style={S.titleRule} />
    </View>
  )
}

function SectionHeader({ label }: { label: string }) {
  return (
    <View style={S.sectionWrap}>
      <Text style={S.sectionLabel}>{label}</Text>
      <View style={S.sectionRule} />
    </View>
  )
}

// ---------------------------------------------------------------------------
// Normalization helpers
// ---------------------------------------------------------------------------

function toTitleCase(str: string): string {
  return str.trim().split(/\s+/).map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
}

function toSentenceCase(str: string): string {
  const s = str.trim()
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s
}

// ---------------------------------------------------------------------------
// Content renderers by kind
// ---------------------------------------------------------------------------

function FinancialContent({ data }: { data: Extract<PDFData, { kind: 'financial' }> }) {
  const sections: { label: string; entries: PDFFinancialAccount[] }[] = [
    { label: 'BANKING & CREDIT',    entries: data.banking.filter(e => e.name?.trim()) },
    { label: 'INVESTMENTS',         entries: data.investments.filter(e => e.name?.trim()) },
    { label: 'RETIREMENT & INCOME', entries: data.retirement.filter(e => e.name?.trim()) },
  ]
  const debts: PDFFinancialDebt[] = data.debts.filter(e => e.name?.trim())

  return (
    <View>
      {sections.map(({ label, entries }) => {
        if (entries.length === 0) return null
        return (
          <View key={label}>
            <SectionHeader label={label} />
            {entries.map((e) => {
              const acct = data.acctNums[e.id]?.trim()
              return (
                <View key={e.id} style={S.entryWrap}>
                  <Text style={S.entryName}>{toTitleCase(e.name)}</Text>
                  {e.typeOfAccount?.trim() && <Text style={S.entryLine}>{toSentenceCase(e.typeOfAccount)}</Text>}
                  {acct && <Text style={S.entryLine}>{acct}</Text>}
                  {e.contactInfo?.trim() && <Text style={S.entryLine}>{toSentenceCase(e.contactInfo)}</Text>}
                </View>
              )
            })}
          </View>
        )
      })}

      {debts.length > 0 && (
        <View>
          <SectionHeader label="DEBTS & LOANS" />
          {debts.map((e) => {
            const acct = data.acctNums[e.id]?.trim()
            return (
              <View key={e.id} style={S.entryWrap}>
                <Text style={S.entryName}>{toTitleCase(e.name)}</Text>
                {e.type?.trim() && <Text style={S.entryLine}>{toSentenceCase(e.type)}</Text>}
                {e.amount?.trim() && <Text style={S.entryLine}>{e.amount.trim()}</Text>}
                {acct && <Text style={S.entryLine}>{acct}</Text>}
                {e.contactInfo?.trim() && <Text style={S.entryLine}>{toSentenceCase(e.contactInfo)}</Text>}
              </View>
            )
          })}
        </View>
      )}
    </View>
  )
}

function ContactsContent({ data }: { data: Extract<PDFData, { kind: 'important_contacts' }> }) {
  return (
    <View>
      {data.sections.map(({ label, contacts }) => (
        <View key={label}>
          <SectionHeader label={label} />
          {contacts.map((c, i) => (
            <View key={i} style={{ marginBottom: i < contacts.length - 1 ? 14 : 0 }}>
              <Text style={S.entryName}>{c.name}</Text>
              {c.role?.trim() && <Text style={S.contactRole}>{c.role}</Text>}
              {c.phone?.trim() && <Text style={S.entryLine}>{c.phone}</Text>}
              {c.email?.trim() && <Text style={S.entryLine}>{c.email}</Text>}
              {c.address?.trim() && <Text style={S.entryLine}>{c.address}</Text>}
            </View>
          ))}
        </View>
      ))}
    </View>
  )
}

function KeepsakeContent({ data }: { data: Extract<PDFData, { kind: 'keepsake_inventory' }> }) {
  return (
    <View>
      {data.items.map((item, i) => (
        <View key={i} style={S.momentRow}>
          <Text style={S.momentIndex}>{i + 1}</Text>
          <View style={{ flex: 1 }}>
            <Text style={S.momentTitle}>{item.object}</Text>
            {item.recipient?.trim() && (
              <Text style={{ ...S.entryLine, marginBottom: 0 }}>
                <Text style={{ color: '#AAAAAA' }}>For </Text>
                <Text style={{ color: '#555555' }}>{item.recipient}</Text>
              </Text>
            )}
            {item.meaning?.trim() && <Text style={S.momentNote}>{item.meaning}</Text>}
          </View>
        </View>
      ))}
    </View>
  )
}

function GenericContent({ data }: { data: Extract<PDFData, { kind: 'generic' }> }) {
  return (
    <View>
      {data.intro?.trim() && (
        <Text style={S.introText}>{data.intro}</Text>
      )}
      {data.fields.map(({ label, value }) => (
        <View key={label} style={S.fieldWrap}>
          <Text style={S.fieldLabel}>{label}</Text>
          <Text style={S.fieldValue}>{value}</Text>
        </View>
      ))}
    </View>
  )
}

function ValuesRankingContent({ data }: { data: Extract<PDFData, { kind: 'values_ranking' }> | Extract<PDFData, { kind: 'fears_ranking' }> }) {
  return (
    <View>
      {data.intro?.trim() && (
        <Text style={S.introText}>{data.intro}</Text>
      )}
      {data.groups.map(({ label, items }) => (
        <View key={label} style={S.rankingGroupWrap}>
          <Text style={S.rankingGroupLabel}>{label}</Text>
          {items.map((item) => (
            <Text key={item} style={S.rankingItem}>· {item}</Text>
          ))}
        </View>
      ))}
      {data.reflection?.trim() && (
        <View style={{ marginTop: 16 }}>
          <Text style={S.reflectionLabel}>Reflection note</Text>
          <Text style={S.reflectionText}>{data.reflection.trim()}</Text>
        </View>
      )}
    </View>
  )
}

function PersonalAdminContent({ data }: { data: Extract<PDFData, { kind: 'personal_admin' }> }) {
  return (
    <View>
      {data.sections.map(({ label, fields, docs }) => {
        const hasDocs = docs && docs.length > 0
        if (fields.length === 0 && !hasDocs) return null
        return (
          <View key={label}>
            <SectionHeader label={label.toUpperCase()} />
            {hasDocs
              ? docs!.map((doc, i) => (
                  <View key={i} style={S.entryWrap}>
                    {doc.name?.trim() && <Text style={S.entryName}>{doc.name.trim()}</Text>}
                    {doc.location?.trim() && <Text style={S.entryLine}>Location: {doc.location.trim()}</Text>}
                    {doc.instructions?.trim() && <Text style={S.entryLine}>{doc.instructions.trim()}</Text>}
                  </View>
                ))
              : fields.map(({ label: fieldLabel, value }) => (
                  <View key={fieldLabel} style={S.fieldWrap}>
                    <Text style={S.fieldLabel}>{fieldLabel}</Text>
                    <Text style={S.fieldValue}>{value}</Text>
                  </View>
                ))
            }
          </View>
        )
      })}
    </View>
  )
}

function DevicesAccountsContent({ data }: { data: Extract<PDFData, { kind: 'devices_accounts' }> }) {
  return (
    <View>
      {data.sections.map(({ label, entries }) => (
        <View key={label}>
          <SectionHeader label={label.toUpperCase()} />
          {entries.map((entry, ei) => (
            <View key={ei} style={S.entryWrap}>
              <Text style={S.entryName}>{entry.name}</Text>
              {entry.fields.map(({ label: fieldLabel, value }) => (
                <Text key={fieldLabel} style={S.entryLine}>{fieldLabel}: {value}</Text>
              ))}
            </View>
          ))}
        </View>
      ))}
    </View>
  )
}

// ---------------------------------------------------------------------------
// Legacy Map geometry (mirrors the snapshot page constants)
// ---------------------------------------------------------------------------

const LM_VB_W = 1000
const LM_VB_H = 200
const LM_MID_Y = 100
const LM_AMP_Y = 50
const PDF_MAP_W = 490
const PDF_MAP_H = 98 // = 490 * 200/1000

function lmPathPoint(xPct: number): { x: number; y: number } {
  const t = Math.max(0, Math.min(1, xPct / 100))
  return { x: 50 + t * 900, y: LM_MID_Y + LM_AMP_Y * Math.sin(t * 2 * Math.PI) }
}

const LM_PATH_D = (() => {
  const pts: string[] = []
  for (let i = 0; i <= 100; i++) {
    const t = i / 100
    pts.push(`${(50 + t * 900).toFixed(1)},${(LM_MID_Y + LM_AMP_Y * Math.sin(t * 2 * Math.PI)).toFixed(1)}`)
  }
  return `M ${pts.join(' L ')}`
})()

// ---------------------------------------------------------------------------

function LegacyMapContent({ data }: { data: Extract<PDFData, { kind: 'legacy_map' }> }) {
  const reflections = [
    { label: 'THEMES THAT STOOD OUT', value: data.themes },
    { label: 'SURPRISES OR REALIZATIONS', value: data.surprises },
    { label: 'VALUES TO PASS ON', value: data.valuesToPassOn },
    { label: 'LEGACY PROJECT IDEAS', value: data.legacyProjects },
  ].filter(r => r.value?.trim())

  const sorted = [...data.moments].sort((a, b) => a.xPercent - b.xPercent)

  return (
    <View>
      {data.intro?.trim() && (
        <Text style={S.introText}>{data.intro}</Text>
      )}

      {sorted.length > 0 && (
        <View style={{ width: PDF_MAP_W, height: PDF_MAP_H, marginBottom: 16, borderWidth: 1, borderColor: '#1A1A1A', borderStyle: 'solid', borderRadius: 4 }}>
          <Svg viewBox={`0 0 ${LM_VB_W} ${LM_VB_H}`} width={PDF_MAP_W} height={PDF_MAP_H}>
            <Path d={LM_PATH_D} stroke="#1A1A1A" strokeWidth={2} fill="none" />
          </Svg>
          {sorted.map((m, i) => {
            const pt = lmPathPoint(m.xPercent)
            const cx = (pt.x / LM_VB_W) * PDF_MAP_W
            const cy = (pt.y / LM_VB_H) * PDF_MAP_H
            const R = 9
            return (
              <View
                key={i}
                style={{
                  position: 'absolute',
                  left: cx - R,
                  top: cy - R,
                  width: R * 2,
                  height: R * 2,
                  borderRadius: R,
                  backgroundColor: '#F8F4EB',
                  borderWidth: 1.5,
                  borderColor: '#1A1A1A',
                  borderStyle: 'solid',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Text style={{ fontFamily: 'Helvetica-Bold', fontSize: 7, color: '#1A1A1A', textAlign: 'center' }}>{i + 1}</Text>
              </View>
            )
          })}
          <View style={{ position: 'absolute', bottom: 5, left: 8 }}>
            <Text style={{ fontFamily: 'Helvetica', fontSize: 7, color: '#1A1A1A' }}>Birth</Text>
          </View>
          <View style={{ position: 'absolute', bottom: 5, right: 8 }}>
            <Text style={{ fontFamily: 'Helvetica', fontSize: 7, color: '#1A1A1A' }}>Now</Text>
          </View>
        </View>
      )}

      {sorted.map((m, i) => (
        <View key={i} style={S.momentRow}>
          <Text style={{ ...S.momentIndex, color: '#1A1A1A', fontFamily: 'Helvetica-Bold' }}>{i + 1}</Text>
          <View style={{ flex: 1 }}>
            <Text style={S.momentTitle}>{m.title}</Text>
            {m.note?.trim() && <Text style={S.momentNote}>{m.note}</Text>}
          </View>
        </View>
      ))}
      {reflections.map(({ label, value }) => (
        <View key={label}>
          <Text style={S.reflectionLabel}>{label}</Text>
          <Text style={S.reflectionText}>{value}</Text>
        </View>
      ))}
    </View>
  )
}

// ---------------------------------------------------------------------------
// Main document export
// ---------------------------------------------------------------------------

export default function ExportPDFDocument({ data }: { data: PDFData }) {
  const isActivity = data.kind === 'values_ranking' || data.kind === 'fears_ranking' || data.kind === 'legacy_map'

  return (
    <Document>
      <Page size="A4" style={S.page}>
        <DocHeader />
        <DocFooter />

        <TitleBlock
          displayTitle={data.displayTitle}
          createdDate={data.createdDate}
          isActivity={isActivity}
        />

        {data.kind === 'financial'         && <FinancialContent data={data} />}
        {data.kind === 'important_contacts' && <ContactsContent data={data} />}
        {data.kind === 'keepsake_inventory' && <KeepsakeContent data={data} />}
        {data.kind === 'generic'           && <GenericContent data={data} />}
        {(data.kind === 'values_ranking' || data.kind === 'fears_ranking') && <ValuesRankingContent data={data} />}
        {data.kind === 'legacy_map'         && <LegacyMapContent data={data} />}
        {data.kind === 'devices_accounts'   && <DevicesAccountsContent data={data} />}
        {data.kind === 'personal_admin'     && <PersonalAdminContent data={data} />}
      </Page>
    </Document>
  )
}
