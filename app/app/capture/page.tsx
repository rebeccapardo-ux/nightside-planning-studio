'use client'

import Link from 'next/link'
import { useEffect } from 'react'

type CardDef = {
  href: string
  title: string
  description: string
  bg: string
  text: string
  dimText: string
}

const WISHES_CARDS: CardDef[] = [
  {
    href: '/app/capture/advance-directive',
    title: 'Advance Directive Supplement',
    description: 'Express your care values and preferences in your own words. Designed to support and complement legal documents.',
    bg: 'bg-[#BBABF4]',
    text: 'text-[#130426]',
    dimText: 'text-[#130426]/75',
  },
  {
    href: '/app/capture/keepsake-inventory',
    title: 'Meaningful Keepsakes',
    description: "Document the objects you want to pass on and what others should understand about them.",
    bg: 'bg-[#2C3777]',
    text: 'text-[#f8f4eb]',
    dimText: 'text-[#f8f4eb]/75',
  },
]

const ADMIN_CARDS: CardDef[] = [
  {
    href: '/app/capture/personal-admin',
    title: 'Personal Admin Info',
    description: 'Biographical details, important documents, and end of life wishes.',
    bg: 'bg-[#f8f4eb]',
    text: 'text-[#130426]',
    dimText: 'text-[#130426]/75',
  },
  {
    href: '/app/capture/important-contacts',
    title: 'Important Contacts',
    description: 'Doctors, attorneys, relatives, friends, and others to reach when needed.',
    bg: 'bg-[#2C3777]',
    text: 'text-[#f8f4eb]',
    dimText: 'text-[#f8f4eb]/75',
  },
  {
    href: '/app/capture/devices-and-accounts',
    title: 'Devices & Accounts',
    description: 'Devices, social media, and other online accounts.',
    bg: 'bg-[#f29836]',
    text: 'text-[#130426]',
    dimText: 'text-[#130426]/75',
  },
  {
    href: '/app/capture/financial-information',
    title: 'Financial Information',
    description: 'Banks, credit cards, retirement accounts, and outstanding loans.',
    bg: 'bg-[#130426]',
    text: 'text-[#f8f4eb]',
    dimText: 'text-[#f8f4eb]/75',
  },
]

function CaptureCard({ href, title, description, bg, text, dimText }: CardDef) {
  return (
    <Link
      href={href}
      className={`flex flex-col h-[180px] rounded-2xl px-8 py-8 transition hover:opacity-90 ${bg}`}
    >
      <p className={`text-[18px] font-bold leading-snug mb-3 ${text}`}>{title}</p>
      <p className={`text-body leading-relaxed flex-1 ${dimText}`}>{description}</p>
      <span className={`text-[13px] font-semibold mt-4 ${dimText}`}>Open →</span>
    </Link>
  )
}

export default function CapturePage() {
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
    <div className="min-h-screen bg-[#DB5835]">
      <div className="max-w-5xl mx-auto px-4 py-16">
        <div className="ns-title-wrap">
          <h1 className="ns-title-section text-white">
            <span className="ns-title-underline">Capture</span>
          </h1>
        </div>
        <p className="ns-lead-section text-white" style={{ marginTop: '20px', marginBottom: '64px' }}>
          Turn your reflections into documents you can keep, update, and share.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-10 items-start">

          {/* Left column: Your Wishes */}
          <div>
            <h2 className="text-h3 text-white mb-6">
              Your Wishes
            </h2>
            <div className="space-y-4">
              {WISHES_CARDS.map((card) => (
                <CaptureCard key={card.href} {...card} />
              ))}
            </div>
          </div>

          {/* Right column: Practical / Admin */}
          <div>
            <h2 className="text-h3 text-white mb-6">
              Practical / Admin
            </h2>
            <div className="space-y-4">
              {ADMIN_CARDS.map((card) => (
                <CaptureCard key={card.href} {...card} />
              ))}
            </div>
          </div>

        </div>
      </div>
    </div>
    </>
  )
}
