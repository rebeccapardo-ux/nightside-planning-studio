import Link from 'next/link'
import { createSupabaseServerClient } from '@/lib/supabase-server'

export default async function WillsLearnPage() {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  let willsDomainHref = '/app/materials'
  if (user) {
    const { data: domains } = await supabase
      .from('containers')
      .select('id, title')
      .eq('type', 'domain')
      .ilike('title', '%wills%')
      .limit(1)
    if (domains && domains.length > 0) {
      willsDomainHref = `/app/domains/${domains[0].id}`
    }
  }

  return (
    <div className="min-h-screen" style={{ background: '#BBABF4' }}>
      <div className="max-w-5xl mx-auto px-4 py-16">

        {/* Back link */}
        <Link
          href="/app/learn/areas"
          className="text-[#130426] hover:text-[#2C3777] text-sm font-semibold transition-colors"
        >
          ← Areas of planning
        </Link>

        {/* SECTION 1 — HEADER (full width) */}
        <div className="mb-16 mt-10">
          <h1 className="text-[40px] font-bold leading-[1.2] text-[#130426] mb-6 underline decoration-[#2C3777] decoration-[3px] underline-offset-[8px]">
            Wills & Estates
          </h1>
          <p className="text-[15px] text-[#130426] leading-relaxed max-w-2xl mb-6">
            A will is a legal document that outlines how your assets, debts, and belongings will be handled after your death. It names an executor, identifies beneficiaries, appoints guardians for minor children or pets, and can include provisions for charitable donations or trusts. While essential, a will is just one part of estate planning—a broader process for managing your assets and property during your lifetime and beyond.
          </p>
          <div className="text-[15px] text-[#130426] leading-relaxed max-w-2xl">
            <p className="font-semibold mb-3">An estate plan may also include:</p>
            <ul className="space-y-2">
              <li className="flex items-start gap-3">
                <span className="shrink-0 select-none">•</span>
                <span><span className="font-semibold">Powers of Attorney:</span> Appointing someone to manage your finances or legal matters if you're unable to.</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="shrink-0 select-none">•</span>
                <span><span className="font-semibold">Trusts:</span> Managing assets for specific purposes or beneficiaries.</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="shrink-0 select-none">•</span>
                <span><span className="font-semibold">Life Insurance Policies:</span> Providing financial security for loved ones.</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="shrink-0 select-none">•</span>
                <span><span className="font-semibold">Asset and Liability Documentation:</span> Listing property, debts, and digital accounts.</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="shrink-0 select-none">•</span>
                <span><span className="font-semibold">Tax Strategies:</span> Reducing taxes and ensuring efficient distribution of your estate.</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Grid 1: Why this matters + Relevant Activities */}
        <div className="grid gap-8 md:grid-cols-2 mb-16">

          {/* SECTION 2 — WHY THIS MATTERS (left) */}
          <section className="rounded-2xl px-8 py-8" style={{ background: '#2C3777', border: '3px solid #2C3777' }}>
            <h2 className="text-[20px] font-semibold tracking-[0.02em] text-white mb-4">Why this matters</h2>
            <p className="text-[15px] text-white leading-relaxed mb-3">
              If you die intestate (without a will), the law decides who inherits and manages your estate, potentially causing delays, conflicts, and decisions that don't reflect your wishes.
            </p>
            <p className="text-[15px] text-white leading-relaxed mb-3">
              For First Nations individuals living on reserves, the Indian Act determines asset distribution, not personal wishes, meaning only family can inherit—excluding friends or charities.
            </p>
            <p className="text-[15px] text-white leading-relaxed mb-3">
              Anyone of legal age should have a will. It's especially important for those with dependents, significant assets, or specific wishes. Regular updates ensure it reflects life changes, like marriage, divorce, or new family members.
            </p>
          </section>

          {/* SECTION 3 — RELEVANT ACTIVITIES (right) */}
          <section className="rounded-2xl px-8 py-8" style={{ background: '#F29836', border: '3px solid #F29836' }}>
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
                <Link href="/app/materials" className="text-[15px] text-[#130426] hover:text-[#2C3777] transition-colors underline font-semibold">
                  Estate Planning Resources
                </Link>
              </li>
            </ul>
          </section>

        </div>

        {/* SECTION 4 — WRITING A LEGAL WILL (full width) */}
        <section className="mb-16 rounded-2xl px-8 py-8" style={{ background: '#DB5835', border: '3px solid #DB5835' }}>
          <h2 className="text-[20px] font-semibold tracking-[0.02em] text-white mb-4">
            Writing a legal will
          </h2>
          <p className="text-[15px] text-white leading-relaxed mb-4">
            While requirements vary across provinces, here are general guidelines to create a valid will in Canada:
          </p>
          <ul className="space-y-3">
            <li className="flex items-start gap-3 text-[15px] text-white leading-snug">
              <span className="shrink-0 select-none font-semibold">·</span>
              <span><span className="font-semibold">Age and Mental Capacity:</span> You must be of sound mind and the age of majority (usually 18). Exceptions may apply for minors in certain cases, like marriage or military service.</span>
            </li>
            <li className="flex items-start gap-3 text-[15px] text-white leading-snug">
              <span className="shrink-0 select-none font-semibold">·</span>
              <span><span className="font-semibold">Written and Signed:</span> A will must be written (typically typed and printed) and signed by you at the end. British Columbia also allows electronic wills.</span>
            </li>
            <li className="flex items-start gap-3 text-[15px] text-white leading-snug">
              <span className="shrink-0 select-none font-semibold">·</span>
              <span><span className="font-semibold">Witnesses:</span> Two witnesses (not beneficiaries or their spouses) must watch you sign and sign the document themselves.</span>
            </li>
            <li className="flex items-start gap-3 text-[15px] text-white leading-snug">
              <span className="shrink-0 select-none font-semibold">·</span>
              <span><span className="font-semibold">Handwritten Wills:</span> Holographic (handwritten) wills are valid in some provinces, like Ontario, but not everywhere.</span>
            </li>
            <li className="flex items-start gap-3 text-[15px] text-white leading-snug">
              <span className="shrink-0 select-none font-semibold">·</span>
              <span><span className="font-semibold">Safe Storage:</span> Store the original signed copy in a secure place.</span>
            </li>
          </ul>
        </section>

        {/* SECTION 5 — QUICK TIPS (full width) */}
        <section className="mb-16 rounded-2xl px-8 py-8" style={{ background: '#130426', border: '3px solid #130426' }}>
          <h2 className="text-[20px] font-semibold tracking-[0.02em] text-white mb-4">
            Quick Tips
          </h2>
          <ul className="space-y-3">
            <li className="flex items-start gap-3 text-[15px] text-white leading-snug">
              <span className="text-[#F29836] shrink-0 select-none">·</span>
              Choose an executor, guardians, and beneficiaries.
            </li>
            <li className="flex items-start gap-3 text-[15px] text-white leading-snug">
              <span className="text-[#F29836] shrink-0 select-none">·</span>
              Update your will after major life changes (e.g., marriage, divorce).
            </li>
            <li className="flex items-start gap-3 text-[15px] text-white leading-snug">
              <span className="text-[#F29836] shrink-0 select-none">·</span>
              Discuss your wishes with loved ones to avoid surprises.
            </li>
            <li className="flex items-start gap-3 text-[15px] text-white leading-snug">
              <span className="text-[#F29836] shrink-0 select-none">·</span>
              Consult a lawyer for more complex estates.
            </li>
          </ul>
        </section>

        {/* SECTION 6 & 7 — EXPLORE RESOURCES + CONTINUE IN GRID */}
        <div className="grid gap-8 md:grid-cols-2">
          {/* SECTION 6 — EXPLORE PROVINCE-SPECIFIC RESOURCES (left) */}
          <section className="rounded-2xl px-8 py-8" style={{ background: '#F8F4EB', border: '3px solid #F8F4EB' }}>
            <h2 className="text-[20px] font-semibold tracking-[0.02em] text-[#130426] mb-3">
              Explore province-specific resources
            </h2>
            <p className="text-[15px] text-[#130426] leading-relaxed mb-6">
              Provincial rules vary on wills and estates.
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

          {/* SECTION 7 — CONTINUE IN YOUR PLAN (right) */}
          <div className="rounded-2xl px-8 py-8" style={{ background: '#2C3777', border: '3px solid #2C3777' }}>
            <h3 className="text-[20px] font-semibold tracking-[0.02em] text-white mb-6">
              Continue in your plan
            </h3>
            <p className="text-[15px] text-white leading-relaxed mb-6">
              Start documenting your estate details and creating your will to ensure your wishes are carried out.
            </p>
            <Link
              href={willsDomainHref}
              className="inline-block rounded-full px-6 py-2.5 text-[14px] font-semibold hover:opacity-90 transition-opacity text-white"
              style={{ background: '#F8F4EB', color: '#130426' }}
            >
              Go to Wills & Estates Materials →
            </Link>
          </div>
        </div>

      </div>
    </div>
  )
}
