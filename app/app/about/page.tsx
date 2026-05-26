const hv = "'Helvetica Neue', Helvetica, Arial, sans-serif"

export default function AboutPage() {
  return (
    <div style={{ background: '#F8F4EB', minHeight: '100vh', padding: '64px 24px 80px' }}>
      <style>{`.nightside-link { color: #DB5835; font-size: 15px; font-weight: 700; text-decoration: none; } .nightside-link:hover { text-decoration: underline; }`}</style>
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
            I&apos;m Rebecca Pardo — an anthropologist, technologist, and death doula. For over 15 years I&apos;ve worked in research, design, and technology, exploring how technology shapes human behavior. My focus shifted when I began working in end-of-life spaces, bringing my expertise in design and interaction to help create more supportive and compassionate experiences around dying, death, and grief.
          </p>
          <p style={{ fontFamily: hv, fontSize: 16, color: '#130426', lineHeight: 1.75, margin: 0 }}>
            My perspective changed dramatically when I joined Facebook&apos;s Memorialization team, studying what happens when account holders die. Through international ethnographic research — observing and participating in death rituals in Indonesia, India, and Mexico — I saw firsthand how deeply personal and complex death planning is. I also saw how avoidance and a lack of planning leave families in distress, with unanswered questions and uncertainty.
          </p>
          <p style={{ fontFamily: hv, fontSize: 16, color: '#130426', lineHeight: 1.75, margin: 0 }}>
            And then, my dog Quincy got sick. Suddenly, what I had been researching became deeply personal. Drawing on my research and leaning into rituals, I transformed what could have been a devastating experience into one of peace, meaning, and love. It changed how I approached death and life forever. This platform is the culmination of that journey — designed to empower you to make informed, compassionate choices, not just for yourself but for the people you care about most.
          </p>
        </div>

        <div style={{ borderTop: '1px solid rgba(19,4,38,0.1)', marginTop: 40, paddingTop: 24 }}>
          <p style={{ fontFamily: hv, fontSize: 15, color: '#5F5E5A', margin: 0, lineHeight: 1.6 }}>
            Rebecca Pardo, PhD · Anthropologist · Designer · Death Doula<br />
            Founder,{' '}
            <a href="https://thenightside.net/" target="_blank" rel="noopener noreferrer" className="nightside-link">
              The Nightside
            </a>
          </p>
        </div>

      </div>
    </div>
  )
}
