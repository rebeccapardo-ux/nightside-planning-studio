'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'

type CardDef = {
  href: string
  title: string
  description: string
  bg: string
  titleColor: string
  bodyColor: string
  ctaBg: string
  ctaColor: string
  border?: string
}

const WISHES_CARDS: CardDef[] = [
  {
    href: '/app/capture/advance-directive',
    title: 'My Care Wishes',
    description: 'Express your care values and preferences in your own words. Designed to support and complement legal documents.',
    bg: '#BBABF4',
    titleColor: '#130426',
    bodyColor: 'rgba(19,4,38,0.78)',
    ctaBg: '#130426',
    ctaColor: '#FFFFFF',
  },
  {
    href: '/app/capture/keepsake-inventory',
    title: 'Meaningful Keepsakes',
    description: 'Document the objects you want to pass on and what others should understand about them.',
    bg: '#2C3777',
    titleColor: '#FFFFFF',
    bodyColor: 'rgba(255,255,255,0.82)',
    ctaBg: '#F8F4EB',
    ctaColor: '#130426',
  },
]

const ADMIN_CARDS: CardDef[] = [
  {
    href: '/app/capture/personal-admin',
    title: 'Personal Admin Information',
    description: 'Biographical details, important documents, and end of life wishes.',
    bg: '#F8F4EB',
    titleColor: '#130426',
    bodyColor: 'rgba(19,4,38,0.78)',
    ctaBg: '#130426',
    ctaColor: '#FFFFFF',
    border: '1px solid rgba(26,26,26,0.10)',
  },
  {
    href: '/app/capture/important-contacts',
    title: 'Important Contacts',
    description: 'Doctors, attorneys, relatives, friends, and others to reach when needed.',
    bg: '#2C3777',
    titleColor: '#FFFFFF',
    bodyColor: 'rgba(255,255,255,0.82)',
    ctaBg: '#F8F4EB',
    ctaColor: '#130426',
  },
  {
    href: '/app/capture/devices-and-accounts',
    title: 'Devices & Accounts',
    description: 'Devices, social media, and other online accounts.',
    bg: '#F29836',
    titleColor: '#130426',
    bodyColor: 'rgba(19,4,38,0.78)',
    ctaBg: '#130426',
    ctaColor: '#FFFFFF',
  },
  {
    href: '/app/capture/financial-information',
    title: 'Financial Information',
    description: 'Banks, credit cards, retirement accounts, and outstanding loans.',
    bg: '#FFFFFF',
    titleColor: '#130426',
    bodyColor: 'rgba(19,4,38,0.78)',
    ctaBg: '#2C3777',
    ctaColor: '#FFFFFF',
    border: '1px solid rgba(26,26,26,0.10)',
  },
]

function CaptureCard({ href, title, description, bg, titleColor, bodyColor, ctaBg, ctaColor, border }: CardDef) {
  const [hovered, setHovered] = useState(false)
  const [pressed, setPressed] = useState(false)

  return (
    <Link href={href} style={{ display: 'block', textDecoration: 'none' }}>
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          minHeight: 280,
          padding: 32,
          borderRadius: 20,
          backgroundColor: bg,
          border: border ?? 'none',
          boxShadow: hovered && !pressed
            ? '0 8px 24px rgba(0,0,0,0.08)'
            : '0 1px 2px rgba(0,0,0,0.02)',
          transform: hovered && !pressed ? 'translateY(-2px)' : 'translateY(0)',
          transition: 'transform 140ms ease, box-shadow 140ms ease, border-color 140ms ease',
          boxSizing: 'border-box',
          cursor: 'pointer',
        }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => { setHovered(false); setPressed(false) }}
        onMouseDown={() => setPressed(true)}
        onMouseUp={() => setPressed(false)}
      >
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 500, lineHeight: 1.25, color: titleColor, margin: 0 }}>
            {title}
          </h2>
          <p style={{ fontSize: 16, fontWeight: 400, lineHeight: 1.55, color: bodyColor, marginTop: 12, marginBottom: 0 }}>
            {description}
          </p>
        </div>
        <div>
          <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            height: 48,
            paddingLeft: 24,
            paddingRight: 24,
            borderRadius: 999,
            fontSize: 14,
            fontWeight: 500,
            backgroundColor: ctaBg,
            color: ctaColor,
            border: 'none',
          }}>
            Open →
          </span>
        </div>
      </div>
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
        .capture-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 24px;
          align-items: start;
        }
        @media (max-width: 640px) {
          .capture-grid { grid-template-columns: 1fr; }
        }
      `}</style>
      <div className="min-h-screen bg-[#DB5835]">
        <div style={{
          maxWidth: 1200,
          margin: '0 auto',
          paddingLeft: 24,
          paddingRight: 24,
          paddingTop: 72,
          paddingBottom: 72,
        }}>

          <div className="ns-title-wrap">
            <h1 className="ns-title-section text-[#130426]" style={{ fontSize: 64, fontWeight: 500, lineHeight: 1.08, margin: 0 }}>
              <span className="ns-title-underline">Capture</span>
            </h1>
          </div>

          <p style={{
            fontSize: 20,
            fontWeight: 400,
            lineHeight: 1.55,
            color: 'rgba(255,255,255,0.94)',
            maxWidth: 760,
            marginTop: 20,
            marginBottom: 56,
          }}>
            Turn your reflections into documents you can keep, update, and share.
          </p>

          <div className="capture-grid">

            {/* Left column: Your Wishes */}
            <div>
              <h2 style={{
                fontSize: 28,
                fontWeight: 500,
                lineHeight: 1.25,
                color: '#FFFFFF',
                margin: '0 0 16px 0',
              }}>
                My Care Wishes
              </h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                {WISHES_CARDS.map((card) => (
                  <CaptureCard key={card.href} {...card} />
                ))}
              </div>
            </div>

            {/* Right column: Practical / Admin */}
            <div>
              <h2 style={{
                fontSize: 28,
                fontWeight: 500,
                lineHeight: 1.25,
                color: '#FFFFFF',
                margin: '0 0 16px 0',
              }}>
                Practical / Admin
              </h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
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
