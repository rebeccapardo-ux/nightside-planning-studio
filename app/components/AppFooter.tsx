'use client'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'

const inter = "'Helvetica Neue', Helvetica, Arial, sans-serif"

function getEffectiveBg(el: Element | null): string | null {
  if (!el || el.tagName === 'BODY') return null
  const bg = window.getComputedStyle(el).backgroundColor
  if (bg && bg !== 'rgba(0, 0, 0, 0)' && bg !== 'transparent') return bg
  return getEffectiveBg(el.parentElement)
}

function isColorDark(color: string): boolean {
  const match = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/)
  if (!match) return true
  const r = +match[1], g = +match[2], b = +match[3]
  return (0.299 * r + 0.587 * g + 0.114 * b) < 128
}

export default function AppFooter() {
  const pathname = usePathname()
  const [light, setLight] = useState(false)

  useEffect(() => {
    const main = document.querySelector('main')
    const lastEl = main?.lastElementChild ?? null
    const bg = getEffectiveBg(lastEl)
    setLight(bg ? isColorDark(bg) : false)
  }, [pathname])

  const bg         = light ? '#F8F4EB'              : '#0d0220'
  const border     = light ? 'rgba(19,4,38,0.08)'   : 'rgba(248,244,235,0.08)'
  const textPrimary = light ? '#130426'              : '#f8f4eb'
  const textMuted  = light ? 'rgba(19,4,38,0.6)'    : 'rgba(248,244,235,0.6)'
  const dot        = light ? 'rgba(19,4,38,0.25)'   : 'rgba(248,244,235,0.25)'
  const disclaimer = light ? 'rgba(19,4,38,0.70)'   : 'rgba(248,244,235,0.70)'

  return (
    <footer style={{ background: bg, borderTop: `1px solid ${border}`, padding: '28px 24px', transition: 'background 200ms ease, border-color 200ms ease' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 16 }}>
          <span style={{ fontFamily: inter, fontSize: 13, color: textPrimary }}>
            © {new Date().getFullYear()} The Nightside
          </span>
          <nav style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
            {[
              { href: '/app/account', label: 'My Account' },
              { href: '/app/help',    label: 'Help'       },
              { href: '/app/about',   label: 'About'      },
            ].map(({ href, label }) => (
              <Link key={href} href={href} style={{ fontFamily: inter, fontSize: 13, color: textPrimary, textDecoration: 'none' }} className="footer-link">
                {label}
              </Link>
            ))}
            <span style={{ color: dot, fontSize: 13 }}>·</span>
            {[
              { href: '/privacy', label: 'Privacy' },
              { href: '/terms',   label: 'Terms'   },
            ].map(({ href, label }) => (
              <Link key={href} href={href} style={{ fontFamily: inter, fontSize: 13, color: textMuted, textDecoration: 'none' }} className="footer-link">
                {label}
              </Link>
            ))}
          </nav>
        </div>
        <p style={{ fontFamily: inter, fontSize: 11, fontStyle: 'italic', color: disclaimer, lineHeight: 1.6, textAlign: 'center', margin: 0 }}>
          The Nightside Planning Studio is a planning tool and educational resource.<br />It is not a substitute for legal, medical, or financial advice. For binding decisions, consult a qualified professional in your province.<br />See{' '}
          <Link href="/terms" style={{ color: disclaimer, textDecoration: 'underline' }}>Terms of Service</Link>
          {' '}for details.
        </p>
      </div>
      <style>{`.footer-link:hover { opacity: 0.7; }`}</style>
    </footer>
  )
}
