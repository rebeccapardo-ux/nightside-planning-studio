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
      <div className="px-4 py-16" style={{ background: '#F29836' }}>
        <div className="max-w-5xl mx-auto">
          <Link
            href="/app/learn/areas"
            className="text-white hover:text-white/80 text-sm font-semibold transition-colors"
          >
            ← Areas of planning
          </Link>

          <div className="mt-10">
            <h1 style={{ fontSize: '64px', fontWeight: 600, lineHeight: '1.1', color: 'white', marginBottom: '20px', maxWidth: '700px' }}>
              Deathcare & Body Disposition
            </h1>
            <p style={{ fontSize: '20px', color: 'white', lineHeight: '1.6', maxWidth: '640px' }}>
              Deathcare planning involves decisions about how your body will be cared for after you die. This includes choosing a final resting place for your body, such as traditional burial, cremation, green burial, or alternative methods like aquamation. Without clear instructions, decisions may be made based on default practices, family assumptions, or costs rather than personal wishes.
            </p>
          </div>
        </div>
      </div>

      {/* MAIN CONTENT SECTION */}
      <div className="flex-1 px-4" style={{ background: '#130426', paddingTop: '72px', paddingBottom: '72px' }}>
        <div className="max-w-5xl mx-auto flex flex-col">

          {/* GROUPED CONTEXT SECTION: Why this matters + Relevant Activities */}
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 560px) 320px', columnGap: '96px', alignItems: 'start' }}>

            {/* SECTION 2 — WHY THIS MATTERS */}
            <section>
              <h2 style={{ fontSize: '28px', fontWeight: 500, lineHeight: '1.15', color: 'white', marginBottom: '20px' }}>Why this matters</h2>
              <p style={{ fontSize: '16px', lineHeight: '1.6', color: 'white', marginBottom: '16px', maxWidth: '560px' }}>
                Planning ahead ensures your choices reflect your values—spiritual, environmental, cultural, or personal—and reduces stress for loved ones.
              </p>
              <p style={{ fontSize: '16px', lineHeight: '1.6', color: 'white', maxWidth: '560px' }}>
                Your preferences for body disposition should be documented in your will to ensure they are legally recognized.
              </p>
            </section>

            {/* SECTION 3 — RELEVANT ACTIVITIES */}
            <section style={{ maxWidth: '320px' }}>
              <h2 style={{ fontSize: '28px', fontWeight: 500, lineHeight: '1.15', color: 'white', marginBottom: '24px' }}>
                Relevant Activities
              </h2>
              <ul style={{ listStyle: 'none', padding: 0 }}>
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
          <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', columnGap: '48px', alignItems: 'start', marginTop: '72px' }}>

            {/* SECTION 4 — CONTINUE IN YOUR PLAN (primary column) */}
            <section className="rounded-2xl" style={{ background: '#2C3777', padding: '32px', maxWidth: '640px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 700, lineHeight: '1.25', color: 'white', marginBottom: '12px' }}>
                Continue in your plan
              </h3>
              <p style={{ fontSize: '16px', lineHeight: '1.6', color: 'white', marginBottom: '20px', maxWidth: '560px' }}>
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
            <section className="rounded-2xl" style={{ background: '#F8F4EB', padding: '28px', maxWidth: '420px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: 700, lineHeight: '1.25', color: '#130426', marginBottom: '12px' }}>
                Explore province-specific resources
              </h2>
              <p style={{ fontSize: '16px', lineHeight: '1.6', color: '#130426', marginBottom: '20px', maxWidth: '560px' }}>
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
