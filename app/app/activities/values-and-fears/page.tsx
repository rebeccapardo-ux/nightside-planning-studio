'use client'

import Link from 'next/link'
import Breadcrumbs from '@/app/components/navigation/Breadcrumbs'
import { BANNER_CLASS, BANNER_STYLE } from '@/app/components/pageBanner'

const hv = "'Helvetica Neue', Helvetica, Arial, sans-serif"

export default function ValuesAndFearsPage() {
  return (
    <div className="min-h-screen" style={{ background: '#F8F4EB' }}>
      {/* Navy banner — the same treatment as the Values / Fears sub-pages, via the shared
          page-banner source. Simple variant (no right-side control). This is a landing, so the
          copy is orientation for the two-part exercise, not the sub-pages' card mechanics. */}
      <div className={`${BANNER_CLASS} md:pr-8`} style={BANNER_STYLE}>
        <div style={{ marginBottom: 18 }}>
          <Breadcrumbs
            theme="navy"
            items={[
              { label: 'Activities', href: '/app/activities' },
              { label: 'Values & Fears Ranking' },
            ]}
          />
        </div>
        <h1 className="ns-title-activity text-white">
          Values &amp; Fears Ranking
        </h1>
        <p style={{ fontFamily: hv, fontSize: 16, color: 'rgba(255,255,255,0.8)', maxWidth: 560, margin: '20px 0 12px', lineHeight: 1.55 }}>
          Two complementary exercises for clarifying what matters most to you, and what worries you, as you think about serious illness or the end of life. Values Ranking helps surface your priorities; Fears Ranking helps name your concerns so they can be shared and addressed.
        </p>
        <p style={{ fontFamily: hv, fontSize: 16, color: 'rgba(255,255,255,0.8)', maxWidth: 560, margin: 0, lineHeight: 1.55 }}>
          You can start with either one and return to the other whenever you like. Your responses save automatically as you go.
        </p>
      </div>

      {/* Two distinct entry cards, spaced apart, both sunrise-orange (was a single connected
          split-panel with a lavender/orange pair). */}
      <div className="mx-auto w-full max-w-[1200px] px-6 pb-24 pt-12 md:px-10">
        <section className="grid gap-6 md:grid-cols-2">
          <Link
            href="/app/activities/values-ranking"
            className="group rounded-[24px] bg-[#F29836] p-8 text-[#140028] transition hover:bg-[#f5a840] md:p-10"
          >
            <h2 className="text-[28px] leading-tight font-semibold tracking-[-0.02em] md:text-[34px]">
              Values
            </h2>
            <p className="mt-4 max-w-xl text-[17px] leading-relaxed text-[#140028]/82 md:text-[18px]">
              Explore what matters most to you in the context of end-of-life.
            </p>
            <div className="mt-8 inline-flex items-center rounded-full bg-[#140028] px-5 py-3 text-[15px] font-medium text-[#f8f4eb] transition group-hover:translate-x-0.5">
              Begin →
            </div>
          </Link>

          <Link
            href="/app/activities/fears-ranking"
            className="group rounded-[24px] bg-[#F29836] p-8 text-[#140028] transition hover:bg-[#f5a840] md:p-10"
          >
            <h2 className="text-[28px] leading-tight font-semibold tracking-[-0.02em] md:text-[34px]">
              Fears
            </h2>
            <p className="mt-4 max-w-xl text-[17px] leading-relaxed text-[#140028]/82 md:text-[18px]">
              Clarify your worries, so they can be communicated and addressed.
            </p>
            <div className="mt-8 inline-flex items-center rounded-full bg-[#140028] px-5 py-3 text-[15px] font-medium text-[#f8f4eb] transition group-hover:translate-x-0.5">
              Begin →
            </div>
          </Link>
        </section>
      </div>
    </div>
  )
}
