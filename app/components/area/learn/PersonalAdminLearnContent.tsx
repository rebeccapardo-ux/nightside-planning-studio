import { para, heading, TermList } from './shared'

// Personal Admin Overview band content — reflowed verbatim from the original Learn page
// ("Why this matters" two-column body, "What personal admin covers" list, and the
// resources panel) into the band's single reading column. Reflow only.
export default function PersonalAdminLearnContent() {
  return (
    <div>
      <h2 style={{ ...heading, marginTop: 0 }}>Why this matters</h2>
      <p style={para}>When someone dies, the people they leave behind are already carrying a lot. Grief is hard enough on its own, but it often arrives alongside a cascade of practical tasks: locating accounts, tracking down passwords, notifying institutions, and figuring out what exists and how to cancel or access it.</p>
      <p style={para}>For many families, this administrative burden lands at the worst possible moment, with no roadmap and no preparation.</p>
      <p style={para}>The good news is that <strong style={{ fontWeight: 600 }}>a little organization now can make an enormous difference later</strong>. You don&rsquo;t need to have everything figured out; you just need to leave enough of a trail that the people you love aren&rsquo;t starting from zero.</p>
      <p style={{ ...para, marginBottom: 32 }}>Even small steps can reduce confusion, save time, and ease stress during an already difficult period.</p>

      <h2 style={heading}>What personal admin covers</h2>
      <p style={para}>Personal admin in the context of death planning is about making sure the practical details of your life are documented somewhere accessible. That includes:</p>
      <TermList
        items={[
          { term: 'Who you are and how to reach the people who matter', detail: 'basic information, emergency contacts, and who should be notified' },
          { term: 'Your financial life', detail: 'a record of accounts, debts, and insurance, so someone can know what exists and where to find it' },
          { term: 'Your digital life', detail: 'email, social media, subscriptions, and what should happen to those accounts' },
          { term: 'Passwords and access', detail: 'how trusted people can access what they need' },
          { term: 'Devices', detail: 'who should have access to your phone, computer, or other devices' },
        ]}
      />
    </div>
  )
}
