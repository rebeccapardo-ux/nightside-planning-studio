import Link from 'next/link'
import { createSupabaseServerClient } from '@/lib/supabase-server'

export default async function HealthcareLearnPage() {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  let healthcareDomainHref = '/app/materials'
  if (user) {
    const { data: domains } = await supabase
      .from('containers')
      .select('id, title')
      .eq('type', 'domain')
      .ilike('title', '%healthcare%')
      .limit(1)
    if (domains && domains.length > 0) {
      healthcareDomainHref = `/app/domains/${domains[0].id}`
    }
  }

  return (
    <div className="min-h-screen" style={{ background: '#130426' }}>
      <div className="max-w-5xl mx-auto px-4 py-16">

        {/* Back link */}
        <Link
          href="/app/learn/areas"
          className="text-[#F29836] hover:text-[#BBABF4] text-small font-medium transition-colors"
        >
          ← Areas of planning
        </Link>

        {/* SECTION 1 — HEADER (full width) */}
        <div className="mb-20">
          <h1 className="text-h1 text-white mb-6 underline decoration-[#f29836] decoration-[3px] underline-offset-[8px]">
            Healthcare
          </h1>
          <p className="text-body text-app-body max-w-2xl">
            Advance care planning helps prepare for a time when you may be seriously ill or unable to speak for yourself. It involves reflecting on and communicating your wishes, appointing a Substitute Decision Maker, and documenting your preferences (legal documentation varies by province; see below).
          </p>
        </div>

        {/* Grid 1: Why this matters + Relevant Activities */}
        <div className="grid gap-8 md:grid-cols-2 mb-20">

          {/* SECTION 2 — WHY THIS MATTERS (left) */}
          <section className="rounded-2xl px-8 py-8" style={{ background: '#BBABF4', border: '3px solid #BBABF4' }}>
            <h2 className="text-h3 text-[#130426] mb-4">Why this matters</h2>
            <p className="text-body text-[#130426] mb-3">
              Without clear communication, your loved ones and care providers may face painful choices, uncertainty, and conflict.
            </p>
            <p className="text-body text-[#130426]">
              A good plan can ease their burden and help ensure your wishes are respected.
            </p>
          </section>

          {/* SECTION 5 — RELEVANT ACTIVITIES (right) */}
          <section className="rounded-2xl px-8 py-8" style={{ background: '#F29836', border: '3px solid #F29836' }}>
            <h2 className="text-h3 text-[#130426] mb-5">
              Relevant Activities
            </h2>
            <ul className="space-y-3">
              <li className="flex items-start gap-3">
                <span className="text-[#130426] mt-1 shrink-0 select-none font-bold">·</span>
                <Link href="/app/reflect/values" className="text-body text-[#130426] hover:text-[#2C3777] transition-colors underline font-medium">
                  Values and Fears Ranking
                </Link>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-[#130426] mt-1 shrink-0 select-none font-bold">·</span>
                <Link href="/app/learn/areas" className="text-body text-[#130426] hover:text-[#2C3777] transition-colors underline font-medium">
                  Reflect Prompts
                </Link>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-[#130426] mt-1 shrink-0 select-none font-bold">·</span>
                <Link href="/app/learn/areas" className="text-body text-[#130426] hover:text-[#2C3777] transition-colors underline font-medium">
                  Scenario Navigator
                </Link>
              </li>
            </ul>
          </section>

        </div>

        {/* SECTION 4 — BEYOND CHECKLISTS (full width, no panel) */}
        <section className="max-w-3xl" style={{ marginTop: '72px', marginBottom: '72px' }}>
          <h2 className="text-h3 text-white mb-6">
            Beyond Checklists
          </h2>
          <p className="text-body text-app-body mb-4">
            Most people think of advance care planning as listing treatments they would or wouldn't want—ventilators, feeding tubes, resuscitation, etc. That approach can be helpful, but it has limits. It's hard to predict how you'd feel in a situation you've never been in, and ableist assumptions about what life with illness or disability might be like can distort decisions. For example, someone might say "no machines" without knowing the range of options or experiences, or assume they wouldn't want to live without being able to speak, without realizing what assistive tools exist.
          </p>
          <p className="text-body text-app-body">
            That's why this platform goes beyond checklists, with activities designed to help you reflect on the values behind those choices. The reflection exercises are designed to help you give your SDM the context they need to make thoughtful decisions on your behalf—even in unexpected scenarios. You can choose what to share—like including the Values and Fears Rankings from the Reflect section, or the supplementary form in the Capture section alongside your Advance Directive. Doing this work with others, especially your SDM, can be a powerful way to start the conversation.
          </p>
        </section>

        {/* Grid 2: Choosing SDM + Resources */}
        <div className="grid gap-8 md:grid-cols-2 mb-20">

          {/* SECTION 3 — CHOOSING A DECISION MAKER (left) */}
          <section className="rounded-2xl px-8 py-8" style={{ background: '#2C3777', border: '3px solid #2C3777' }}>
            <h2 className="text-h3 text-white mb-4">
              Choosing your Substitute Decision Maker
            </h2>
            <p className="text-body text-[#f8f4eb] mb-4">Ask yourself:</p>
            <ul className="space-y-3">
              {[
                'Do they understand my values?',
                'Can I trust them to speak up for me?',
                'Are they able to handle tough conversations under pressure?',
              ].map((q) => (
                <li key={q} className="flex items-start gap-3 text-body text-[#f8f4eb]">
                  <span className="text-[#f29836] mt-0.5 shrink-0 select-none">·</span>
                  {q}
                </li>
              ))}
            </ul>
          </section>

          {/* SECTION 6 — RESOURCE HUB CALLOUT (right) */}
          <div className="rounded-2xl px-8 py-8" style={{ background: '#F8F4EB', border: '3px solid #F8F4EB' }}>
            <h3 className="text-h3 text-[#130426] mb-3">
              Explore province-specific resources
            </h3>
            <p className="text-body text-[#130426] mb-6">
              It's important to know that legal requirements vary by province. In the Resource Hub, you'll find province-specific templates for things like designating a decision-maker or completing an Advance Directive.
            </p>
            <a
              href="https://thenightside.net/resources"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block rounded-full text-white px-6 py-2.5 text-small font-medium hover:opacity-90 transition-opacity"
              style={{ background: '#DB5835' }}
            >
              View resources →
            </a>
          </div>

        </div>

        {/* CONNECT TO DOMAIN */}
        <div className="rounded-2xl px-8 py-8" style={{ background: '#2C3777', border: '3px solid #2C3777' }}>
          <h3 className="text-h3 text-white mb-6">
            Continue in your plan
          </h3>
          <ul className="space-y-2 mb-6">
            <li className="flex items-center gap-2.5 text-body text-[#f8f4eb]">
              <span className="text-[#f29836] shrink-0 select-none">·</span>
              Identify a decision maker
            </li>
            <li className="flex items-center gap-2.5 text-body text-[#f8f4eb]">
              <span className="text-[#f29836] shrink-0 select-none">·</span>
              Document your healthcare wishes
            </li>
          </ul>
          <Link
            href={healthcareDomainHref}
            className="inline-block rounded-full bg-white text-[#130426] px-6 py-2.5 text-small font-medium hover:opacity-90 transition-opacity"
          >
            Go to Healthcare Materials →
          </Link>
        </div>

      </div>
    </div>
  )
}
