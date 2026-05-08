'use client'
import { useEffect, useRef, useState } from 'react'
import { createSupabaseBrowserClient } from '@/lib/supabase-browser'

const apfel = "'ApfelGrotezk', sans-serif"
const hv = "'Helvetica Neue', Helvetica, Arial, sans-serif"

export default function WelcomeModal() {
  const [mounted, setMounted] = useState(false)
  const [leaving, setLeaving] = useState(false)
  const [gone, setGone] = useState(false)
  const [btnHovered, setBtnHovered] = useState(false)
  const buttonRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    const raf1 = requestAnimationFrame(() => {
      requestAnimationFrame(() => setMounted(true))
    })
    return () => cancelAnimationFrame(raf1)
  }, [])

  useEffect(() => {
    if (mounted && !leaving) {
      buttonRef.current?.focus()
    }
  }, [mounted, leaving])

  function handleDismiss() {
    const supabase = createSupabaseBrowserClient()
    supabase.auth.updateUser({ data: { has_seen_welcome: true } })
    setLeaving(true)
    setTimeout(() => setGone(true), 300)
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    // Trap focus — only one interactive element, so Tab goes nowhere
    if (e.key === 'Tab') {
      e.preventDefault()
    }
    // Escape intentionally does not dismiss
  }

  if (gone) return null

  const isVisible = mounted && !leaving

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="welcome-heading"
      onKeyDown={handleKeyDown}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 200,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: isVisible ? 'rgba(18, 13, 31, 0.7)' : 'rgba(18, 13, 31, 0)',
        backdropFilter: 'blur(4px)',
        WebkitBackdropFilter: 'blur(4px)',
        transition: 'background-color 200ms ease-out',
        padding: '24px',
      }}
    >
      <div
        style={{
          background: '#f7f3e8',
          borderRadius: '16px',
          maxWidth: '520px',
          width: '100%',
          padding: '48px',
          boxShadow: '0 24px 64px rgba(0,0,0,0.3)',
          textAlign: 'center',
          opacity: isVisible ? 1 : 0,
          transform: isVisible ? 'scale(1)' : 'scale(0.96)',
          transition: 'opacity 280ms ease-out, transform 280ms ease-out',
          transitionDelay: mounted && !leaving ? '80ms' : '0ms',
        }}
      >
        {/* Wordmark */}
        <div style={{ marginBottom: '32px' }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/The-Nightside-Wordmark-Black.svg"
            alt="The Nightside"
            style={{ height: '20px', width: 'auto', display: 'inline-block' }}
          />
        </div>

        {/* Heading */}
        <h2
          id="welcome-heading"
          style={{
            fontFamily: apfel,
            fontSize: '28px',
            fontWeight: 700,
            lineHeight: 1.2,
            color: '#1a1a1a',
            margin: '0 0 20px 0',
          }}
        >
          Welcome to The Nightside.
        </h2>

        {/* Body */}
        <div style={{ maxWidth: '400px', margin: '0 auto' }}>
          <p style={{
            fontFamily: hv,
            fontSize: '16px',
            lineHeight: 1.65,
            color: '#3a3a3a',
            margin: '0 0 20px 0',
          }}>
            This is your space to reflect on what matters, learn about your options, and document your wishes at your own pace.
          </p>
          <p style={{
            fontFamily: hv,
            fontSize: '16px',
            lineHeight: 1.65,
            color: '#3a3a3a',
            margin: 0,
          }}>
            Everything here is private by default. This platform is a thinking and documentation tool — not a source of legal or medical advice.
          </p>
        </div>

        {/* Button */}
        <button
          ref={buttonRef}
          onClick={handleDismiss}
          onMouseEnter={() => setBtnHovered(true)}
          onMouseLeave={() => setBtnHovered(false)}
          style={{
            display: 'inline-block',
            background: btnHovered ? '#3d4e8f' : '#2d3a6b',
            color: '#ffffff',
            fontFamily: hv,
            fontSize: '15px',
            fontWeight: 500,
            padding: '14px 32px',
            borderRadius: '100px',
            border: 'none',
            cursor: 'pointer',
            marginTop: '32px',
            transition: 'background 200ms ease',
          }}
        >
          Get started →
        </button>
      </div>
    </div>
  )
}
