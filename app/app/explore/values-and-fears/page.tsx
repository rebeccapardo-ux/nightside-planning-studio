'use client'

import Link from 'next/link'

export default function ValuesAndFearsPage() {
  return (
    <div className="min-h-screen bg-[#140028] text-white">
      <div className="mx-auto w-full max-w-[1200px] px-6 pb-24 pt-16 md:px-10">
        <Link
          href="/app/explore"
          className="inline-flex items-center text-sm text-white/70 transition hover:text-white"
        >
          ← Back to Explore
        </Link>

        <section className="mt-8 max-w-3xl">
          <h1 className="text-[36px] leading-tight font-semibold tracking-[-0.02em] md:text-[42px]">
            Values &amp; Fears Ranking
          </h1>

          <p className="mt-4 text-[17px] leading-relaxed text-white/80 md:text-[18px]">
            This exercise helps you reflect on what matters most to you — and what
            you most want to avoid — as you think about serious illness or the end
            of life.
          </p>
        </section>

        <section className="mt-10 overflow-hidden rounded-[24px] bg-[#ee9732] text-[#140028]">
          <div className="grid gap-px bg-[#140028]/10 md:grid-cols-2">
            <Link
              href="/app/explore/values-ranking"
              className="group bg-[#b7a7ea] p-8 transition hover:bg-[#c2b4ef] md:p-10"
            >
              <p className="text-xs uppercase tracking-[0.14em] text-[#140028]/60">
                Activity
              </p>

              <h2 className="mt-3 text-[28px] leading-tight font-semibold tracking-[-0.02em] md:text-[34px]">
                Values
              </h2>

              <p className="mt-4 max-w-xl text-[17px] leading-relaxed text-[#140028]/82 md:text-[18px]">
                Explore what matters most to you — comfort, connection, dignity,
                independence, and more.
              </p>

              <div className="mt-8 inline-flex items-center rounded-full bg-[#140028] px-5 py-3 text-[15px] font-medium text-[#f8f4eb] transition group-hover:translate-x-0.5">
                Begin →
              </div>
            </Link>

            <Link
              href="/app/explore/fears-ranking"
              className="group bg-[#f3eee3] p-8 transition hover:bg-[#f8f4eb] md:p-10"
            >
              <p className="text-xs uppercase tracking-[0.14em] text-[#140028]/60">
                Activity
              </p>

              <h2 className="mt-3 text-[28px] leading-tight font-semibold tracking-[-0.02em] md:text-[34px]">
                Fears
              </h2>

              <p className="mt-4 max-w-xl text-[17px] leading-relaxed text-[#140028]/82 md:text-[18px]">
                Reflect on what concerns or worries you most, so they can be
                acknowledged and addressed.
              </p>

              <div className="mt-8 inline-flex items-center rounded-full bg-[#2f3f8f] px-5 py-3 text-[15px] font-medium text-[#f8f4eb] transition group-hover:translate-x-0.5">
                Begin →
              </div>
            </Link>
          </div>
        </section>
      </div>
    </div>
  )
}