import { para, heading, hv } from './shared'

// Legacy Overview band content — reflowed verbatim from /app/learn/legacy. The page's
// second lead paragraph opens the band (the first lead paragraph is the area header
// intro), followed by "Why this matters" (incl. the "Did You Know?" callout) and "What
// legacy work can look like". Legacy has no province-resources panel. Reflow only.
export default function LegacyLearnContent() {
  return (
    <div>
      <p style={para}>Legacy planning is the practice of consciously reflecting on what you want to leave behind, and doing that reflecting while you&rsquo;re still here to shape it. This can mean creating artifacts, like writing letters, recording stories, or other projects. It can also mean simply deciding how you want your values and relationships to be remembered, and having intentional conversations to share this with the people in your life.</p>

      <h2 style={{ ...heading, marginTop: 28 }}>Why this matters</h2>
      <p style={para}>Without intentional reflection, the most meaningful parts of a life often go undocumented, or may be interpreted by others after the fact. Legacy work is a way of telling your own story, in your own words, on your own terms.</p>
      <p style={para}>Psychologist David Kessler, who collaborated with Elisabeth Kübler-Ross, identified <strong style={{ fontWeight: 600 }}>meaning-making as a distinct part of how we process loss</strong> — not just for those left behind, but for the person dying. Shifting focus from a life being lost to a life that has been lived is one of the more significant things legacy work can do.</p>
      <p style={{ ...para, marginBottom: 24 }}>It also tends to change the quality of conversations. People who engage in this kind of reflection often find themselves having exchanges with family that wouldn&rsquo;t have happened otherwise, hearing stories for the first time, or finally saying things that had gone unsaid.</p>

      <div style={{ background: 'rgba(187,171,244,0.18)', border: '1px solid rgba(19,4,38,0.1)', borderRadius: 16, padding: 28, marginBottom: 36 }}>
        <p style={{ fontFamily: hv, fontSize: 14, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(19,4,38,0.65)', margin: '0 0 12px' }}>Did You Know?</p>
        <p style={{ ...para, fontSize: 16 }}>Research on legacy work in end-of-life care has found that <strong style={{ fontWeight: 600 }}>people who engage in structured life reflection experience reduced anticipatory grief</strong>. Families report feeling more connected to the dying person, and less anxious about what&rsquo;s ahead.</p>
        <p style={{ ...para, fontSize: 16, marginBottom: 0 }}>In some studies, people who engaged in meaning-making practices reported that physical symptoms, such as pain and difficulty breathing, felt more manageable, likely connected to reduced psychological distress.<a href="https://pmc.ncbi.nlm.nih.gov/articles/PMC2664509/" target="_blank" rel="noopener noreferrer" style={{ fontSize: 13, textDecoration: 'underline', color: 'rgba(19,4,38,0.6)' }}>[source]</a></p>
      </div>

      <h2 style={heading}>What legacy work can look like</h2>
      <p style={para}>There are no rules, and no required format. Legacy work is whatever is meaningful to the person doing it.</p>
      <p style={para}>Some people write letters for milestones they won&rsquo;t be present for, or to say things that might otherwise go unsaid. Some record audio or video, telling stories in their own voice. Others make something physical: a collection of recipes, a quilt from meaningful clothing, a hand casting made together with someone they love. Cultural traditions like altars or shrines offer their own form of legacy-making, as do scholarships, dedicated benches, or causes given in someone&rsquo;s name.</p>
      <p style={para}>There&rsquo;s no single right time to begin. Some people start years before any illness, others at diagnosis, while others return to it in pieces over time. If you&rsquo;re living with a serious illness, it&rsquo;s worth starting sooner rather than later, while you have the most energy and clarity to shape it.</p>
      <p style={{ ...para, marginBottom: 0 }}>Legacy work often surfaces memories and clarifies priorities. It&rsquo;s often worth doing with someone rather than alone, because the conversations it opens with the people around you can be as meaningful as whatever tangible outputs get created.</p>
    </div>
  )
}
