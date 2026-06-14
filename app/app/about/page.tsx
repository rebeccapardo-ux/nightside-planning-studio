import type { Metadata } from 'next'
const hv = "'Helvetica Neue', Helvetica, Arial, sans-serif"


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
          <p style={{ fontFamily: hv, fontSize: 16, color: '#130426', lineHeight: 1.75, margin: 0 }}>
            I&apos;m Rebecca Pardo, an anthropologist, technologist, and death doula. For nearly two decades I&apos;ve worked in research, design, and technology, exploring how technology mediates human behavior. I was introduced to the subject of death and digital legacy when I joined Facebook&apos;s Memorialization team, working on what happens when account holders die. Through international ethnographic research — observing and participating in death practices in Indonesia, India, and Mexico — I learned how variable beliefs and practices about death are cross-culturally, but also how much they have in common. Across my work I have seen that consciously engaging with death, rather than avoiding it, helps, and that avoidance and lack of planning leave families in distress, with compounded uncertainty and logistics on top of their grief.
          </p>
          <p style={{ fontFamily: hv, fontSize: 16, color: '#130426', lineHeight: 1.75, margin: 0 }}>
            When my dog Quincy got sick a few months later, what I had been researching became deeply personal. Drawing on what I had learned, and with the help of a mentor and friend, I leaned into conscious planning and ritual to give Quincy a good death, which involved bringing him to the beach, creating rituals that felt meaningful to me around the death, and spending time with him. This experience was transformative for me.
          </p>
          <p style={{ fontFamily: hv, fontSize: 16, color: '#130426', lineHeight: 1.75, margin: 0 }}>
            Not everyone can have the kind of death Quincy had. Some choices will be taken away by sudden illness or circumstance. And not everyone would want a death like his. There&apos;s no single version of a good death. But I have learned that when we understand our options, reflect on what is meaningful to us, and make intentional choices, we can transform our deaths, and our lives.
          </p>
          <p style={{ fontFamily: hv, fontSize: 16, color: '#130426', lineHeight: 1.75, margin: 0 }}>
            This platform is designed to help you do that work. I hope it brings relief, comfort, and empowerment to you and the people you care about.
          </p>
        </div>

      </div>
    </div>
  )
}
