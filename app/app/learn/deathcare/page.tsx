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
            className="text-[#130426] hover:text-[#2C3777] text-sm font-semibold transition-colors"
          >
            ← Areas of planning
          </Link>

          <div className="mt-10">
            <h1 className="text-[40px] font-bold leading-[1.2] text-[#130426] mb-6 underline decoration-[#2C3777] decoration-[3px] underline-offset-[8px]">
              Deathcare & Body Disposition
            </h1>
            <p className="text-[15px] text-[#130426] leading-relaxed max-w-2xl">
              Deathcare planning involves decisions about how your body will be cared for after you die. This includes choosing a final resting place for your body, such as traditional burial, cremation, green burial, or alternative methods like aquamation. Without clear instructions, decisions may be made based on default practices, family assumptions, or costs rather than personal wishes.
            </p>
          </div>
        </div>
      </div>

      {/* MAIN CONTENT SECTION */}
      <div className="flex-1 px-4 py-16" style={{ background: '#130426' }}>
        <div className="max-w-5xl mx-auto">
          {/* Grid 1: Why this matters + Relevant Activities */}
          <div className="grid gap-8 md:grid-cols-2 mb-16">

          {/* SECTION 2 — WHY THIS MATTERS (left) */}
          <section className="rounded-2xl px-8 py-8" style={{ background: '#2C3777', border: '3px solid #2C3777' }}>
            <h2 className="text-[20px] font-semibold tracking-[0.02em] text-white mb-4">Why this matters</h2>
            <p className="text-[15px] text-white leading-relaxed mb-3">
              Planning ahead ensures your choices reflect your values—spiritual, environmental, cultural, or personal—and reduces stress for loved ones.
            </p>
            <p className="text-[15px] text-white leading-relaxed">
              Your preferences for body disposition should be documented in your will to ensure they are legally recognized.
            </p>
          </section>

          {/* SECTION 5 — RELEVANT ACTIVITIES (right) */}
          <section className="rounded-2xl px-8 py-8" style={{ background: '#BBABF4', border: '3px solid #BBABF4' }}>
            <h2 className="text-[20px] font-semibold tracking-[0.02em] text-[#130426] mb-5">
              Relevant Activities
            </h2>
            <ul className="space-y-3">
              <li className="flex items-start gap-3">
                <span className="text-[#130426] mt-1 shrink-0 select-none font-bold">·</span>
                <Link href="/app/reflect" className="text-[15px] text-[#130426] hover:text-[#2C3777] transition-colors underline font-semibold">
                  Reflection Prompts
                </Link>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-[#130426] mt-1 shrink-0 select-none font-bold">·</span>
                <Link href="/app/learn/trivia" className="text-[15px] text-[#130426] hover:text-[#2C3777] transition-colors underline font-semibold">
                  Deathcare Trivia
                </Link>
              </li>
            </ul>
          </section>

        </div>

        {/* SECTION 3 — EXPLORE PROVINCE-SPECIFIC RESOURCES (full width) */}
        <section className="mb-16 rounded-2xl px-8 py-8" style={{ background: '#130426', border: '3px solid #130426' }}>
          <h2 className="text-[20px] font-semibold tracking-[0.02em] text-white mb-4">
            Explore province-specific resources
          </h2>
          <p className="text-[15px] text-white leading-relaxed mb-6">
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

        {/* SECTION 4 — CONTINUE IN YOUR PLAN (full width, rust red) */}
        <div className="rounded-2xl px-8 py-8" style={{ background: '#DB5835', border: '3px solid #DB5835' }}>
          <h3 className="text-[20px] font-semibold tracking-[0.02em] text-white mb-6">
            Continue in your plan
          </h3>
          <p className="text-[15px] text-white leading-relaxed mb-6">
            Documenting your preferences and sharing your choices with loved ones and decision makers ensures they understand your wishes and can carry them out.
          </p>
          <Link
            href={deathcareDomainHref}
            className="inline-block rounded-full text-[#130426] px-6 py-2.5 text-[14px] font-semibold hover:opacity-90 transition-opacity"
            style={{ background: '#F8F4EB' }}
          >
            Go to Deathcare Materials →
          </Link>
        </div>

      </div>
    </div>
    </div>
  )
}
