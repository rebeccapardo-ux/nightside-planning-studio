import { para, heading, TermList } from './shared'

// Wills & Estates Overview band content — reflowed verbatim from the original Learn page
// ("Why this matters" two-column body, the estate-plan list, and the resources panel)
// into the band's single reading column. Don't regenerate; reflow only.
export default function WillsLearnContent() {
  return (
    <div>
      <h2 style={{ ...heading, marginTop: 0 }}>Why this matters</h2>
      <p style={para}><strong style={{ fontWeight: 600 }}>If you die without a will, the law determines how your estate is distributed</strong>, regardless of your personal relationships, priorities, or intentions. This can lead to delays, conflict, and outcomes that don&rsquo;t reflect what you would have wanted.</p>
      <p style={para}>A will allows you to name beneficiaries, appoint an executor, and make decisions about guardianship, assets, and distribution, ensuring your wishes are clearly documented and legally recognized.</p>
      <p style={para}>A will is just one part of estate planning. A complete plan considers how your finances, assets, and responsibilities are managed both during your lifetime and after your death.</p>
      <p style={para}>Life changes, such as marriage, divorce, or new family members, can affect your plan. Reviewing and updating your documents over time helps ensure they continue to reflect your wishes.</p>
      <p style={{ ...para, marginBottom: 32 }}>Without clear planning, loved ones may be left to navigate legal and financial decisions under pressure, often with limited guidance.</p>

      <h2 style={heading}>An estate plan may also include</h2>
      <TermList
        items={[
          { term: 'Powers of Attorney', detail: 'managing financial or legal decisions if you’re unable to' },
          { term: 'Trusts', detail: 'managing assets for specific purposes or beneficiaries' },
          { term: 'Life Insurance', detail: 'providing financial support for loved ones' },
          { term: 'Asset and Liability Documentation', detail: 'listing property, debts, and accounts' },
          { term: 'Tax Strategies', detail: 'supporting efficient distribution of your estate' },
        ]}
      />
    </div>
  )
}
