'use client'

import Link from 'next/link'
import Breadcrumbs from '@/app/components/navigation/Breadcrumbs'
import { BANNER_TOP_CLASS, BANNER_STYLE, BANNER_INNER_STYLE } from '@/app/components/pageBanner'
import Panel from '@/app/components/Panel'

const hv = "'Helvetica Neue', Helvetica, Arial, sans-serif"

export default function ValuesAndFearsPage() {
  return (
    <div className="min-h-screen" style={{ background: '#F8F4EB' }}>
      {/* Navy banner — the same treatment as the Values / Fears sub-pages, via the shared
          page-banner source. Simple variant (no right-side control). This is a landing, so the
          copy is orientation for the two-part exercise, not the sub-pages' card mechanics. */}
      <div className={BANNER_TOP_CLASS} style={{ ...BANNER_STYLE, ...BANNER_INNER_STYLE }}>
        <div style={{ marginBottom: 18 }}>
          <Breadcrumbs
            theme="navy"
            items={[
              { label: 'Activities', href: '/app/activities' },
              { label: 'Values & Fears Ranking' },
            ]}
          />
        </div>
        <h1 className="ns-title-activity">
          Values &amp; Fears Ranking
        </h1>
        <p style={{ fontFamily: hv, fontSize: 16, color: 'var(--section-on-accent)', maxWidth: 560, margin: '20px 0 12px', lineHeight: 1.55 }}>
          Two complementary exercises for clarifying what matters most to you, and what worries you, as you think about serious illness or the end of life. Values Ranking helps surface your priorities; Fears Ranking helps name your concerns so they can be shared and addressed.
        </p>
        <p style={{ fontFamily: hv, fontSize: 16, color: 'var(--section-on-accent)', maxWidth: 560, margin: 0, lineHeight: 1.55 }}>
          You can start with either one and return to the other whenever you like. Your responses save automatically as you go.
        </p>
      </div>

      {/* Two distinct entry cards, spaced apart, both sunrise-orange (was a single connected
          split-panel with a lavender/orange pair). */}
      <div className="mx-auto w-full max-w-[1200px] px-6 pb-24 pt-12 md:px-10">
        <section className="grid gap-6 md:grid-cols-2">
          <Panel
            accent
            as={Link}
            href="/app/activities/values-ranking"
            className="group block rounded-[24px] p-8 transition hover:shadow-[0_10px_28px_rgba(19,4,38,0.15)] md:p-10"
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
          </Panel>

          <Panel
            accent
            as={Link}
            href="/app/activities/fears-ranking"
            className="group block rounded-[24px] p-8 transition hover:shadow-[0_10px_28px_rgba(19,4,38,0.15)] md:p-10"
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
          </Panel>
        </section>
      </div>
    </div>
  )
}
