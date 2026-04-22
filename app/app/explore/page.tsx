'use client'

import Link from 'next/link'
import { useEffect } from 'react'

type ExploreActivityCardProps = {
  title: string
  description: string
  href?: string
  status?: 'available' | 'coming_soon'
  index: number
}

const CARD_STYLES = [
  { bg: 'bg-[#BBABF4]', text: 'text-[#130426]', pill: 'bg-[#130426] text-[#f8f4eb]' },
  { bg: 'bg-[#f8f4eb]', text: 'text-[#130426]', pill: 'bg-[#2C3777] text-[#f8f4eb]' },
  // Coral instead of navy — navy cards blend into the navy page background
  { bg: 'bg-[#DB5835]', text: 'text-[#130426]', pill: 'bg-[#130426] text-[#f8f4eb]' },
]

export default function ExplorePage() {
  useEffect(() => {
    const elements = document.querySelectorAll('.ns-title-wrap')
    if (!elements.length) return
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('ns-visible')
            observer.unobserve(entry.target)
          }
        })
      },
      { threshold: 0.1 },
    )
    elements.forEach((el) => observer.observe(el))
    return () => observer.disconnect()
  }, [])

  return (
    <>
      <style>{`
        .ns-title-wrap {
          opacity: 0;
          transform: translateY(12px);
          transition: opacity 350ms ease-out, transform 350ms ease-out;
        }
        .ns-title-wrap.ns-visible {
          opacity: 1;
          transform: translateY(0);
        }
        .ns-title-underline {
          position: relative;
          display: inline;
        }
        .ns-title-underline::after {
          content: '';
          position: absolute;
          left: 0;
          bottom: -5px;
          width: 100%;
          height: 4px;
          background: #F29836;
          border-radius: 999px;
          transform: scaleX(0);
          transform-origin: left;
          transition: transform 350ms ease-out 100ms;
        }
        .ns-title-wrap.ns-visible .ns-title-underline::after {
          transform: scaleX(1);
        }
      `}</style>
    <div className="min-h-screen bg-[#2C3777]">
      <div className="max-w-5xl mx-auto px-4 py-16">
        <div className="mb-12">
          <div className="ns-title-wrap">
            <h1 className="ns-title-section text-white"><span className="ns-title-underline">Explore</span></h1>
          </div>
          <p className="ns-lead-section text-white" style={{ marginTop: '20px' }}>
            Work through guided activities that help you test ideas, clarify what
            matters, and create material you can return to later.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <ExploreActivityCard
            title="Values & Fears Ranking"
            description="Sort and prioritize what matters most to you — and what you most want to avoid — using a guided card-based activity."
            href="/app/explore/values-and-fears"
            status="available"
            index={0}
          />

          <ExploreActivityCard
            title="Scenario Navigator"
            description="Work through realistic situations to see how your values and preferences might apply in practice."
            href="/app/explore/scenario-navigator"
            status="available"
            index={1}
          />

          <ExploreActivityCard
            title="Legacy Map"
            description="Explore what you want to pass on, document, or make visible to others after your death."
            href="/app/explore/legacy-map"
            status="available"
            index={2}
          />
        </div>
      </div>
    </div>
    </>
  )
}

function ExploreActivityCard({
  title,
  description,
  href,
  status = 'available',
  index,
}: ExploreActivityCardProps) {
  const style = CARD_STYLES[index % CARD_STYLES.length]
  const isAvailable = status === 'available' && !!href

  const inner = (
    <div className={`rounded-2xl px-8 py-8 h-full min-h-[280px] flex flex-col ${style.bg} ${isAvailable ? 'transition hover:opacity-90' : 'opacity-50'}`}>
      <div className="flex-1">
        <h2 className={`text-2xl font-bold mb-3 ${style.text}`}>{title}</h2>
        <p className={`text-base leading-relaxed ${style.text}`}>{description}</p>
      </div>
      <div className="pt-8">
        <span className={`inline-flex items-center text-sm font-semibold rounded-full px-5 py-2 ${style.pill}`}>
          {isAvailable ? 'Begin →' : 'Coming soon'}
        </span>
      </div>
    </div>
  )

  if (!isAvailable) return inner

  return <Link href={href!} className="h-full block">{inner}</Link>
}
