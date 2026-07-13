import type { Metadata } from 'next'
const hv = "'Helvetica Neue', Helvetica, Arial, sans-serif"

// Shared type styles so the two sections read consistently.
const bodyP = { fontFamily: hv, fontSize: 16, color: '#130426', lineHeight: 1.75, margin: 0 }
const h2Style = { fontFamily: hv, fontSize: 24, fontWeight: 600, color: '#130426', margin: '0 0 20px' }
const h3Style = { fontFamily: hv, fontSize: 18, fontWeight: 600, color: '#130426', margin: '28px 0 12px' }

export const metadata: Metadata = {
  title: "About",
  description: "About The Nightside Planning Studio: creator and approach",
}

export default function AboutPage() {
  return (
    <div style={{ background: '#F8F4EB', minHeight: '100vh', padding: '64px 24px 80px' }}>
      <style>{`.nightside-link { color: #130426; font-size: 15px; font-weight: 700; text-decoration: underline; text-underline-offset: 3px; }`}</style>
      <div style={{ maxWidth: 640, margin: '0 auto' }}>

        <h1 style={{ fontFamily: hv, fontSize: 32, fontWeight: 600, color: '#130426', margin: '0 0 32px' }}>
          About
        </h1>

        {/* ── About the founder ──────────────────────────────────────────── */}
        <h2 style={h2Style}>About the founder</h2>

        <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 32 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/rebecca-pardo.png"
            alt="Rebecca Pardo"
            style={{ width: 88, height: 88, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }}
          />
          <div>
            <p style={{ fontFamily: hv, fontSize: 18, fontWeight: 600, color: '#130426', margin: '0 0 4px' }}>
              Rebecca Pardo, PhD
            </p>
            <p style={{ fontFamily: hv, fontSize: 15, color: '#5F5E5A', margin: 0, lineHeight: 1.5 }}>
              Anthropologist · Designer · Death Doula<br />
              Founder,{' '}
              <a href="https://thenightside.net/" target="_blank" rel="noopener noreferrer" className="nightside-link">
                The Nightside
              </a>
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <p style={bodyP}>
            I&apos;m Rebecca Pardo, an anthropologist, technologist, and death doula. For nearly two decades I&apos;ve worked in research, design, and technology, exploring how technology mediates human behavior. I was introduced to the subject of death and digital legacy when I joined Facebook&apos;s Memorialization team, working on what happens when account holders die. Through international ethnographic research — observing and participating in death practices in Indonesia, India, and Mexico — I learned how variable beliefs and practices about death are cross-culturally, but also how much they have in common. Across my work I have seen that consciously engaging with death, rather than avoiding it, helps, and that avoidance and lack of planning leave families in distress, with compounded uncertainty and logistics on top of their grief.
          </p>
          <p style={bodyP}>
            When my dog Quincy got sick a few months later, what I had been researching became deeply personal. Drawing on what I had learned, and with the help of a mentor and friend, I leaned into conscious planning and ritual to give Quincy a good death, which involved bringing him to the beach, creating rituals that felt meaningful to me around the death, and spending time with him. This experience was transformative for me.
          </p>
          <p style={bodyP}>
            Not everyone can have the kind of death Quincy had. Some choices will be taken away by sudden illness or circumstance. And not everyone would want a death like his. There&apos;s no single version of a good death. But I have learned that when we understand our options, reflect on what is meaningful to us, and make intentional choices, we can transform our deaths, and our lives.
          </p>
          <p style={bodyP}>
            This platform is designed to help you do that work. I hope it brings relief, comfort, and empowerment to you and the people you care about.
          </p>
        </div>

        {/* ── Approach (anchor target for the homepage "Read more" link) ───── */}
        <h2
          id="approach"
          style={{ fontFamily: hv, fontSize: 24, fontWeight: 600, color: '#130426', margin: '56px 0 20px', paddingTop: 40, borderTop: '1px solid rgba(19,4,38,0.14)', scrollMarginTop: 96 }}
        >
          Approach
        </h2>

        <h3 style={{ ...h3Style, marginTop: 0 }}>Why I built this</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <p style={bodyP}>
            Most planning platforms treat this as a paperwork problem: filling out forms and checking boxes. But the reason people put this off isn&apos;t that the forms are too complicated; it&apos;s that planning for death means imagining yourself in circumstances you can&apos;t fully picture, on behalf of people who will have to interpret your wishes without you there to clarify. It&apos;s emotionally heavy, socially uncomfortable, and structurally strange in ways that a checklist doesn&apos;t capture.
          </p>
          <p style={bodyP}>
            I wanted to apply my experience in anthropology and user experience design here. I started from what I&apos;ve learned about how people actually approach mortality: what happens when they&apos;re given space to reflect, and what kinds of prompts and formats help people articulate things that they might not be used to talking about. The activities on this platform are designed to get at the underlying values, priorities, fears, and relationships that other tools tend to skip past, and that are crucial for creating plans that are meaningful and useful.
          </p>
        </div>

        <h3 style={h3Style}>Designed for reality</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <p style={bodyP}>
            End-of-life planning rarely happens all at once. It usually unfolds in scattered moments over time: a thought here, a conversation there, or something you read last week that you want to come back to. Sometimes circumstances change, and you want to revise what you decided six months ago. This platform is built to support that rhythm. You can jot down thoughts whenever they come up — including as voice notes, which are transcribed automatically — and the platform captures and organizes them for you, presenting them in context when you&apos;re working on relevant topics to help you turn your thinking into structured outputs.
          </p>
        </div>

        <h3 style={h3Style}>How to use it</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <p style={bodyP}>
            Planning for death is an inherently relational activity. Death and the care around it are community events, and the people closest to you are usually the ones who will make decisions on your behalf when you can&apos;t. Depending on where you live, that substitute decision-maker may carry as much legal weight than any document you leave behind. This means that planning isn&apos;t really finished when your documents are filed. It&apos;s finished when the people who will interpret them understand enough about you to make decisions on your behalf with confidence.
          </p>
          <p style={bodyP}>
            Any activity can be done solo or shared. You might work through the Reflection Prompts on your own, or use them to spark a conversation at the dinner table. You might use the Scenario Navigator as part of a larger conversation with someone you love. There&apos;s no correct order and no set pace.
          </p>
          <p style={bodyP}>
            If you&apos;d like to learn more, I&apos;ve written{' '}
            {/* PLACEHOLDER: swap this span for <a href="…" className="nightside-link">an essay</a>
                once the academia.edu essay URL is available. */}
            <span className="nightside-link">an essay</span>{' '}
            that goes deeper into the theory behind it.
          </p>
        </div>

      </div>
    </div>
  )
}
