export type PDFContactEntry = {
  name: string
  role?: string
  phone?: string
  email?: string
  address?: string
}

export type PDFFinancialAccount = {
  id: string
  name: string
  typeOfAccount?: string
  contactInfo?: string
}

export type PDFFinancialDebt = {
  id: string
  name: string
  type?: string
  amount?: string
  contactInfo?: string
}

type PDFBase = {
  displayTitle: string
  createdDate: string | null
  filename: string
  userName?: string
}

export type PDFData = PDFBase &
  (
    | {
        kind: 'financial'
        banking: PDFFinancialAccount[]
        investments: PDFFinancialAccount[]
        retirement: PDFFinancialAccount[]
        debts: PDFFinancialDebt[]
        acctNums: Record<string, string>
      }
    | {
        kind: 'generic'
        fields: { label: string; value: string }[]
        intro?: string
      }
    | {
        kind: 'important_contacts'
        sections: { label: string; contacts: PDFContactEntry[] }[]
      }
    | {
        kind: 'keepsake_inventory'
        items: { object: string; recipient?: string; meaning?: string }[]
      }
    | {
        kind: 'values_ranking'
        groups: { label: string; items: string[] }[]
        reflection?: string
        intro?: string
      }
    | {
        kind: 'fears_ranking'
        groups: { label: string; items: string[] }[]
        reflection?: string
        intro?: string
      }
    | {
        kind: 'legacy_map'
        moments: { title: string; note?: string; xPercent: number }[]
        reflection?: string
        intro?: string
        userName?: string
        monthYear?: string
      }
    | {
        kind: 'devices_accounts'
        sections: {
          label: string
          entries: { name: string; fields: { label: string; value: string }[] }[]
        }[]
      }
    | {
        kind: 'personal_admin'
        sections: {
          label: string
          fields: { label: string; value: string }[]
          docs?: { name?: string; location?: string; instructions?: string }[]
        }[]
      }
  )
