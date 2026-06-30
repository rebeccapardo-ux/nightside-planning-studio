import { para, heading, ResourcesPanel, TermList } from './shared'

// Ritual & Ceremony Overview band content — reflowed verbatim from /app/learn/ritual
// ("Why this matters" two-column body, "Planning for marginalized communities" note,
// and the equity resources panel) into the band's single reading column. Reflow only.
export default function RitualLearnContent() {
  return (
    <div>
      <h2 style={{ ...heading, marginTop: 0 }}>Why this matters</h2>
      <p style={para}>Rituals and ceremonies are how we mark loss, honor a life, and create space for connection and remembrance. They can take many forms, from formal services to small, personal moments.</p>
      <p style={para}>Without clear guidance, these decisions are often made by others in a time of grief, based on assumptions, traditions, or logistical constraints.</p>
      <p style={para}>Taking time to reflect on what feels meaningful to you — whether cultural, spiritual, or personal — can help ensure these moments reflect your values and identity.</p>
      <p style={{ ...para, marginBottom: 32 }}>It can also make things easier for the people planning on your behalf, giving them clarity and confidence during an emotionally difficult time.</p>

      <h2 style={heading}>Planning for marginalized communities</h2>
      <p style={para}>End-of-life planning matters for everyone, but individuals from marginalized communities often face additional barriers. Documenting your wishes clearly can help ensure they are respected.</p>
      <TermList
        items={[
          { term: 'Healthcare discrimination', detail: 'LGBTQ+ individuals may face bias in medical settings; identifying chosen family and substitute decision-makers in advance is essential.' },
          { term: 'Cultural sensitivity', detail: 'Indigenous and other communities with distinct traditions may find their practices are not automatically understood or respected.' },
          { term: 'Family dynamics', detail: 'preferences that differ from family expectations can create conflict; documenting your wishes reduces ambiguity.' },
          { term: 'Knowing your rights', detail: 'legal rights around funerals, body care, and ceremonies vary by province; knowing your options helps ensure your wishes are followed.' },
        ]}
      />

      <ResourcesPanel title="Explore resources for equitable and culturally-sensitive planning" href="https://thenightside.net/equitable-deathcare">
        Without clear plans, wishes related to gender identity, sexuality, cultural practices, or religious traditions may not be honored. It&rsquo;s important to understand your rights and options for funeral practices and body care.
      </ResourcesPanel>
    </div>
  )
}
