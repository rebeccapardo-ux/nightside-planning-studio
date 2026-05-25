'use client'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { createSupabaseBrowserClient } from '@/lib/supabase-browser'
import FeedbackModal from '@/app/components/FeedbackModal'

const hv = "'Helvetica Neue', Helvetica, Arial, sans-serif"

const BG          = '#130426'
const LIGHT       = '#F8F4EB'
const DIVIDER     = 'rgba(248,244,235,0.15)'
const DISCLAIMER  = 'rgba(248,244,235,0.65)'
const COPYRIGHT   = 'rgba(248,244,235,0.70)'

function scrollToTop() {
  if (typeof window === 'undefined') return
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  window.scrollTo({ top: 0, behavior: reduced ? 'auto' : 'smooth' })
}

function ArrowUp({ size = 16 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden="true"
      style={{ flexShrink: 0 }}
    >
      <path d="M8 13V3M3.5 7.5L8 3l4.5 4.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export default function AppFooter() {
  const [isAuthed, setIsAuthed] = useState(false)
  const [feedbackOpen, setFeedbackOpen] = useState(false)

  useEffect(() => {
    const supabase = createSupabaseBrowserClient()
    supabase.auth.getSession().then(({ data: { session } }) => setIsAuthed(!!session))
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => setIsAuthed(!!session))
    return () => subscription.unsubscribe()
  }, [])

  // Six links per brief. My Account is hidden for signed-out visitors —
  // the rest are public.
  const links: Array<{ label: string; href?: string; onClick?: () => void; authed?: boolean }> = [
    { label: 'My Account',    href: '/app/account', authed: true },
    { label: 'Help',          href: '/app/help'    },
    { label: 'About',         href: '/app/about'   },
    { label: 'Send feedback', onClick: () => setFeedbackOpen(true) },
    { label: 'Privacy',       href: '/privacy'     },
    { label: 'Terms',         href: '/terms'       },
  ]
  const visibleLinks = links.filter((l) => !l.authed || isAuthed)

  return (
    <>
      {feedbackOpen && <FeedbackModal onClose={() => setFeedbackOpen(false)} />}
      <footer
        className="px-5 md:px-8 py-14 md:py-20"
        style={{ background: BG, color: LIGHT, fontFamily: hv }}
      >
        <div
          className="mx-auto flex flex-col gap-6 md:gap-8"
          style={{ maxWidth: 1100 }}
        >
          {/* 1. Links — horizontal row on desktop, stacked rows on mobile */}
          <nav aria-label="Footer">
            {/* Desktop: single horizontal row, gap-6 = 24px */}
            <ul className="hidden md:flex md:flex-row md:items-center md:justify-center md:gap-6 list-none m-0 p-0">
              {visibleLinks.map((link) => (
                <li key={link.label} className="m-0 p-0">
                  {link.onClick ? (
                    <button
                      type="button"
                      onClick={link.onClick}
                      className="footer-link"
                      style={{ fontFamily: hv, fontSize: 16, fontWeight: 500, color: LIGHT, background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}
                    >
                      {link.label}
                    </button>
                  ) : (
                    <Link
                      href={link.href!}
                      className="footer-link"
                      style={{ fontFamily: hv, fontSize: 16, fontWeight: 500, color: LIGHT, textDecoration: 'none' }}
                    >
                      {link.label}
                    </Link>
                  )}
                </li>
              ))}
            </ul>

            {/* Mobile: stacked rows. Tighter than before — text rows hug
                the type, with small flex gap and full-width tap target. */}
            <ul className="flex flex-col md:hidden list-none m-0 p-0" style={{ gap: 4 }}>
              {visibleLinks.map((link) => (
                <li key={link.label} className="m-0 p-0">
                  {link.onClick ? (
                    <button
                      type="button"
                      onClick={link.onClick}
                      style={{
                        fontFamily: hv,
                        fontSize: 16,
                        fontWeight: 500,
                        color: LIGHT,
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        width: '100%',
                        minHeight: 40,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: 0,
                      }}
                    >
                      {link.label}
                    </button>
                  ) : (
                    <Link
                      href={link.href!}
                      style={{
                        fontFamily: hv,
                        fontSize: 16,
                        fontWeight: 500,
                        color: LIGHT,
                        textDecoration: 'none',
                        width: '100%',
                        minHeight: 40,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      {link.label}
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          </nav>

          {/* 2. Divider */}
          <hr style={{ width: '100%', height: 1, border: 'none', background: DIVIDER, margin: 0 }} aria-hidden="true" />

          {/* 3. Disclaimer */}
          <p
            style={{
              fontFamily: hv,
              fontStyle: 'italic',
              color: DISCLAIMER,
              lineHeight: 1.6,
              textAlign: 'center',
              margin: '0 auto',
              maxWidth: 720,
            }}
            className="text-[14px] md:text-[15px] w-full"
          >
            The Nightside Planning Studio is a planning tool and educational resource. It is not a substitute for legal, medical, or financial advice. For binding decisions, consult a qualified professional in your province.
            <br />
            See{' '}
            <Link href="/terms" style={{ color: 'inherit', textDecoration: 'underline', textUnderlineOffset: 3 }}>
              Terms of Service
            </Link>
            {' '}for details.
          </p>

          {/* 4. Back to top + copyright row.
                 Desktop: copyright centered, Back-to-top right-aligned, same row.
                 Mobile:  Back-to-top stacked icon+text first, copyright below. */}
          {/* Desktop layout */}
          <div className="hidden md:grid md:grid-cols-3 md:items-center">
            <div /> {/* left column spacer to keep copyright visually centered */}
            <p style={{ fontFamily: hv, fontSize: 13, color: COPYRIGHT, textAlign: 'center', margin: 0 }}>
              © {new Date().getFullYear()} The Nightside
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={scrollToTop}
                className="footer-link"
                style={{
                  fontFamily: hv,
                  fontSize: 14,
                  color: LIGHT,
                  background: 'none',
                  border: 'none',
                  padding: 0,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                <ArrowUp />
                Back to top
              </button>
            </div>
          </div>

          {/* Mobile layout — copyright above, Back to top as the last
              element in the footer. */}
          <div className="flex flex-col items-center md:hidden" style={{ gap: 24 }}>
            <p style={{ fontFamily: hv, fontSize: 13, color: COPYRIGHT, textAlign: 'center', margin: 0 }}>
              © {new Date().getFullYear()} The Nightside
            </p>
            <button
              type="button"
              onClick={scrollToTop}
              style={{
                fontFamily: hv,
                fontSize: 14,
                color: LIGHT,
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                display: 'inline-flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 4,
                minHeight: 44,
                minWidth: 44,
                padding: '8px 16px',
              }}
            >
              <ArrowUp />
              Back to top
            </button>
          </div>
        </div>

        <style>{`.footer-link:hover { text-decoration: underline; text-underline-offset: 3px; }`}</style>
      </footer>
    </>
  )
}
