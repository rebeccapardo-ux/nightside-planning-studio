import Link from 'next/link'
import { createSupabaseServerClient } from '@/lib/supabase-server'

export default async function DeathcareLearnPage() {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  let deathcareDomainHref = '/app/materials'
  if (user) {
    const { data: domains } = await supabase
      .from('containers')
      .select('id, title')
      .eq('type', 'domain')
      .ilike('title', '%deathcare%')
      .limit(1)
    if (domains && domains.length > 0) {
      deathcareDomainHref = `/app/domains/${domains[0].id}`
    }
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* HERO SECTION */}
      <div style={{ background: '#F29836' }}>
        <div style={{ maxWidth: '1120px', marginLeft: 'auto', marginRight: 'auto', paddingLeft: '32px', paddingRight: '32px', paddingTop: '48px', paddingBottom: '120px' }}>
          <Link
            href="/app/learn/areas"
            className="text-white hover:text-white/80 text-sm font-semibold transition-colors"
            style={{ display: 'block', marginBottom: '40px' }}
          >
            ← Areas of planning
          </Link>

          <h1 style={{ fontSize: '88px', fontWeight: 500, lineHeight: '0.95', color: 'white', maxWidth: '720px' }}>
            Deathcare & Body<br />Disposition
          </h1>
          <p style={{ fontSize: '20px', color: 'white', lineHeight: '1.6', maxWidth: '560px', marginTop: '32px' }}>
            Deathcare planning involves decisions about how your body will be cared for after you die. This includes choosing a final resting place for your body, such as traditional burial, cremation, green burial, or alternative methods like aquamation. Without clear instructions, decisions may be made based on default practices, family assumptions, or costs rather than personal wishes.
          </p>
        </div>
      </div>

      {/* MAIN CONTENT SECTION */}
      <div className="flex-1" style={{ background: '#130426', paddingTop: '96px', paddingBottom: '120px' }}>
        <div className="w-full flex flex-col">

          {/* GROUPED CONTEXT SECTION: Why this matters + Relevant Activities */}
          <div className="max-w-[1120px] mx-auto px-8" style={{ display: 'grid', gridTemplateColumns: '560px 360px', columnGap: '120px', alignItems: 'start', marginBottom: '120px' }}>

            {/* SECTION 2 — WHY THIS MATTERS */}
            <section className="max-w-[560px]">
              <h2 style={{ fontSize: '28px', fontWeight: 500, lineHeight: '1.15', color: 'white', marginBottom: '16px' }}>Why this matters</h2>
              <p style={{ fontSize: '18px', lineHeight: '1.6', color: 'white', marginBottom: '16px', maxWidth: '560px' }}>
                Planning ahead ensures your choices reflect your values—spiritual, environmental, cultural, or personal—and reduces stress for loved ones.
              </p>
              <p style={{ fontSize: '18px', lineHeight: '1.6', color: 'white', maxWidth: '560px' }}>
                Your preferences for body disposition should be documented in your will to ensure they are legally recognized.
              </p>
            </section>

            {/* SECTION 3 — RELEVANT ACTIVITIES */}
            <section style={{ width: '360px', paddingTop: '8px' }}>
              <h2 style={{ fontSize: '32px', fontWeight: 500, lineHeight: '1.15', color: 'white', marginBottom: '24px' }}>
                Relevant Activities
              </h2>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                <li style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', marginBottom: '16px' }}>
                  <span style={{ color: 'white', fontWeight: 'bold', marginTop: '2px', flexShrink: 0 }}>·</span>
                  <Link href="/app/reflect" style={{ fontSize: '16px', lineHeight: '1.6', color: 'white', textDecoration: 'underline', fontWeight: 600 }} className="hover:text-white/80 transition-colors">
                    Reflection Prompts
                  </Link>
                </li>
                <li style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                  <span style={{ color: 'white', fontWeight: 'bold', marginTop: '2px', flexShrink: 0 }}>·</span>
                  <Link href="/app/learn/trivia" style={{ fontSize: '16px', lineHeight: '1.6', color: 'white', textDecoration: 'underline', fontWeight: 600 }} className="hover:text-white/80 transition-colors">
                    Deathcare Trivia
                  </Link>
                </li>
              </ul>
            </section>

          </div>

          {/* BALANCED TWO-COLUMN LAYOUT: Primary CTA + Secondary Resources */}
          <div className="max-w-[1120px] mx-auto px-8" style={{ display: 'grid', gridTemplateColumns: '520px 440px', columnGap: '80px', alignItems: 'start' }}>

            {/* SECTION 4 — CONTINUE IN YOUR PLAN (primary column) */}
            <section style={{ background: 'rgba(38, 47, 105, 0.95)', borderRadius: '16px', padding: '32px', maxWidth: '520px', boxShadow: 'none' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 700, lineHeight: '1.25', color: 'white', marginBottom: '12px' }}>
                Continue in your plan
              </h3>
              <p style={{ fontSize: '16px', lineHeight: '1.6', color: 'white', marginBottom: '20px' }}>
                Documenting your preferences and sharing your choices with loved ones and decision makers ensures they understand your wishes and can carry them out.
              </p>
              <Link
                href={deathcareDomainHref}
                className="inline-block rounded-full text-white px-6 py-2.5 text-[14px] font-semibold hover:opacity-90 transition-opacity"
                style={{ background: '#DB5835' }}
              >
                Go to Deathcare Materials →
              </Link>
            </section>

            {/* SECTION 5 — EXPLORE PROVINCE-SPECIFIC RESOURCES (secondary column) */}
            <section style={{ background: 'rgba(235, 228, 218, 0.95)', borderRadius: '16px', padding: '32px', maxWidth: '440px', boxShadow: 'none' }}>
              <h2 style={{ fontSize: '18px', fontWeight: 700, lineHeight: '1.25', color: '#130426', marginBottom: '12px' }}>
                Explore province-specific resources
              </h2>
              <p style={{ fontSize: '16px', lineHeight: '1.6', color: '#130426', marginBottom: '20px' }}>
                Options for body disposition vary across provinces. For example, green burial and aquamation may not be available everywhere, and provincial laws may regulate burial locations or ashes scattering. Understanding these specifics ensures your preferences can be carried out.
              </p>
              <a
                href="https://thenightside.net/resources"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block rounded-full text-white px-6 py-2.5 text-[14px] font-semibold hover:opacity-90 transition-opacity"
                style={{ background: '#DB5835' }}
              >
                View Resources →
              </a>
            </section>

          </div>

      </div>
    </div>
    </div>
  )
}
