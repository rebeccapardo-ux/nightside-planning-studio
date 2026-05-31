'use client'

import Link from 'next/link'
import Breadcrumbs from '@/app/components/navigation/Breadcrumbs'

export default function ValuesAndFearsPage() {
  return (
    <div className="min-h-screen bg-[#F8F4EB]">
      <div className="mx-auto w-full max-w-[1200px] px-6 pb-24 pt-16 md:px-10">
        <div style={{ marginBottom: 32 }}>
          <Breadcrumbs
            theme="light"
            items={[
              { label: 'Reflect', href: '/app/reflect' },
              { label: 'Values & Fears Ranking' },
            ]}
          />
        </div>

        <section className="max-w-3xl">
          <h1 className="text-[36px] leading-tight font-semibold tracking-[-0.02em] md:text-[42px]" style={{ color: '#130426' }}>
            Values &amp; Fears Ranking
          </h1>

          <p className="mt-4 text-[17px] leading-relaxed md:text-[18px]" style={{ color: 'rgba(19,4,38,0.72)' }}>
            These exercises help you clarify what&apos;s most important to you as
            you think about serious illness or the end of life.
          </p>
        </section>

        <section className="mt-10 overflow-hidden rounded-[24px] bg-[#ee9732] text-[#140028]">
          <div className="grid gap-px bg-[#130426]/10 md:grid-cols-2">
            <Link
              href="/app/reflect/values-ranking"
              className="group bg-[#b7a7ea] p-8 transition hover:bg-[#c2b4ef] md:p-10"
            >
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
              href="/app/reflect/fears-ranking"
              className="group bg-[#F29836] p-8 transition hover:bg-[#f5a840] md:p-10"
            >
              <h2 className="mt-3 text-[28px] leading-tight font-semibold tracking-[-0.02em] md:text-[34px]">
                Fears
              </h2>

              <p className="mt-4 max-w-xl text-[17px] leading-relaxed text-[#140028]/82 md:text-[18px]">
                Reflect on what worries you most, so your concerns can be
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
