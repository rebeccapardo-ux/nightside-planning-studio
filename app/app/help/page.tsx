'use client'

import { Suspense, useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'

const hv = "'Helvetica Neue', Helvetica, Arial, sans-serif"

const subHead: React.CSSProperties = { margin: '18px 0 4px', fontFamily: hv, fontSize: 13, fontWeight: 500, color: 'rgba(19,4,38,0.65)', lineHeight: 1.4 }

const PRIVACY_ANSWER = (
  <div style={{ fontFamily: hv, fontSize: 15, color: 'rgba(19,4,38,0.75)', lineHeight: 1.7, paddingRight: 32, paddingBottom: 20 }}>
    <p style={{ margin: '0 0 14px' }}>Yes. Your work on this platform is yours, and we&apos;ve built the platform to protect it.</p>

    <p style={subHead}>What&apos;s protected on the platform.</p>
    <p style={{ margin: '0 0 0' }}>Everything you enter — your contacts, document locations, wishes, reflections, account inventories, and personal details — is stored in our encrypted database. Only you can access it through your account. We don&apos;t sell, share, or use this information for anything beyond providing you with the planning platform.</p>

    <p style={subHead}>What you add only at export.</p>
    <p style={{ margin: '0 0 0' }}>Some fields are designed to be added at the moment of export rather than saved to Your Plan. These include identification and health numbers (in Personal Admin), account numbers (in Financial Information), and passwords, PINs, and access details (in Devices &amp; Accounts). You add them at the moment of export so they&apos;re included in your final document but never saved to our servers.</p>

    <p style={subHead}>A note on broader sensitivity.</p>
    <p style={{ margin: '0 0 0' }}>Even the information that is stored — names, birthdates, addresses, family details, contact information — is sensitive. Together, these pieces can be used to verify identity in financial, governmental, and online contexts. Once you export your plan, the PDF contains all of this in one document. We recommend storing exported copies somewhere secure, and being thoughtful about who you share them with.</p>

    <p style={subHead}>Your work is yours to revisit.</p>
    <p style={{ margin: '0 0 0' }}>Everything you save is yours to return to. You can update any document, activity, or note at any time; what you&apos;ve saved stays private to your account until you choose to share or export it.</p>

    <p style={subHead}>Your role.</p>
    <p style={{ margin: '0 0 14px' }}>You decide what to fill in and when. Some users prefer to keep certain information off the platform and add it only at export; the platform is designed to support that choice.</p>

    <p style={{ margin: 0 }}>For full details, see our <Link href="/privacy" style={{ color: 'rgba(19,4,38,0.75)', textDecoration: 'underline' }}>Privacy Policy →</Link></p>
  </div>
)

const LEGAL_ANSWER = (
  <div style={{ fontFamily: hv, fontSize: 15, color: 'rgba(19,4,38,0.75)', lineHeight: 1.7, paddingRight: 32, paddingBottom: 20 }}>
    <p style={{ margin: '0 0 14px' }}>No. The Nightside Planning Studio is a planning and organizational tool. The documents and plans you create are not legally binding — they are not a will, advance directive, power of attorney, or legal contract.</p>
    <p style={{ margin: 0 }}>We recommend working with a lawyer in your province for any legally binding end-of-life documents. Many people use The Nightside to think through their preferences first, then bring that thinking to a lawyer to formalize.</p>
  </div>
)

const LEGACY_WHAT_ANSWER = (
  <div style={{ fontFamily: hv, fontSize: 15, color: 'rgba(19,4,38,0.75)', lineHeight: 1.7, paddingRight: 32, paddingBottom: 20 }}>
    <p style={{ margin: '0 0 14px' }}>When you sign up for The Nightside, you designate a Legacy Contact. This is someone we can release your practical planning materials to if you die — your wishes for your body and funeral, important contacts, financial information, and other administrative details.</p>
    <p style={{ margin: 0 }}>Your Legacy Contact does not have access to your plan while you&apos;re alive. They have no legal authority over your estate, healthcare decisions, or any other matter. Their role is solely to receive your planning materials from this platform if you die.</p>
  </div>
)

const LEGACY_AFTER_ANSWER = (
  <div style={{ fontFamily: hv, fontSize: 15, color: 'rgba(19,4,38,0.75)', lineHeight: 1.7, paddingRight: 32, paddingBottom: 20 }}>
    <p style={{ margin: '0 0 14px' }}>If you&apos;ve exported and shared your plan with the people who&apos;ll need it, your Legacy Contact may never need to be involved. The Legacy Contact mechanism is a safety net for cases where this didn&apos;t happen, or where your plan was updated after you last shared it.</p>
    <p style={{ margin: '0 0 14px' }}>If your Legacy Contact contacts us after your death, we work with them to verify what has happened and release your designated planning materials. Verification may include a death certificate, a Statement of Death from a funeral director, or other comparable documentation.</p>
    <p style={{ margin: 0 }}>
      For full details, see the &ldquo;What happens if you die&rdquo; section of our{' '}
      <Link href="/privacy" style={{ color: 'rgba(19,4,38,0.75)', textDecoration: 'underline' }}>Privacy Policy →</Link>
    </p>
  </div>
)

type FaqItem = { key: string; q: string; a: React.ReactNode }

const CATEGORIES: { title: string; items: FaqItem[] }[] = [
  {
    title: 'Using the platform',
    items: [
      {
        key: 'edit',
        q: 'Can I come back and edit things later?',
        a: 'Yes. Everything you save is yours to return to. You can update any document, activity, or note at any time. The platform is designed for return, not for one-time completion.',
      },
      {
        key: 'export',
        q: 'Can I export my plan?',
        a: 'Yes. Go to Plan → Preview & Export to generate a printable summary of your completed documents and activities. You can download it as a PDF or print it directly.',
      },
      {
        key: 'voice',
        q: 'What happens to my voice notes?',
        a: 'Voice notes are automatically transcribed and saved to Your Plan. They appear in Your Materials alongside your written notes and documents.',
      },
      {
        key: 'legal',
        q: 'Is this a legal will or advance directive?',
        a: LEGAL_ANSWER,
      },
    ],
  },
  {
    title: 'Your data and privacy',
    items: [
      {
        key: 'privacy',
        q: 'Is my information private?',
        a: PRIVACY_ANSWER,
      },
      {
        key: 'inactive',
        q: 'What happens to my account if I stop using it?',
        a: 'Your account stays active indefinitely. We don\'t deactivate accounts for inactivity; the platform is designed for return, and your work waits for you whenever you come back.',
      },
      {
        key: 'shutdown',
        q: 'What happens if The Nightside shuts down?',
        a: 'If we ever discontinue the platform, we will give you reasonable advance notice and ensure you have an opportunity to export your content before it goes away. Your work would remain yours.',
      },
    ],
  },
  {
    title: 'Your account',
    items: [
      {
        key: 'password',
        q: 'How do I change my password?',
        a: 'Go to My Account (linked in the footer) and use the Change Password section under Account Access.',
      },
      {
        key: 'email',
        q: 'How do I change my email address?',
        a: 'Go to My Account → Account Access → Change email. You\'ll need to enter your current password. We\'ll send a confirmation link to your new email address, and the change applies once you confirm. We\'ll also notify your current email about the change.',
      },
      {
        key: 'recover-account',
        q: 'How do I recover my account if I\'ve lost access to my email?',
        a: (
          <div style={{ fontFamily: hv, fontSize: 15, color: 'rgba(19,4,38,0.75)', lineHeight: 1.7, paddingRight: 32, paddingBottom: 20 }}>
            <p style={{ margin: '0 0 14px' }}>If you have a verified recovery email set up on your account, you can use it to recover access when your primary email is no longer available.</p>
            <p style={{ margin: '0 0 14px' }}>To start: from the sign-in page, click &ldquo;Lost access to your email?&rdquo; and enter your primary email. We&apos;ll send a recovery link to your verified recovery email. You&apos;ll set a new password and be signed in. All other sessions will be signed out for security.</p>
            <p style={{ margin: '0 0 14px' }}>If you didn&apos;t set up a recovery email in advance, your account can&apos;t be recovered. This is by design — we don&apos;t manually verify identity for account recovery. We strongly recommend setting up a recovery email from your account settings now if you haven&apos;t.</p>
            <p style={{ margin: 0 }}>Recovery links expire after 60 minutes. If yours expires, you can request a new one from the sign-in page.</p>
          </div>
        ),
      },
      {
        key: 'name',
        q: 'How do I update my name or province?',
        a: 'Go to My Account → Account Info → Edit account info. Changes save immediately.',
      },
      {
        key: 'delete',
        q: 'How do I delete my account?',
        a: 'Go to My Account and scroll to the Delete Account section. You\'ll be asked to confirm with your password before anything is deleted. Deletion is permanent and removes all of your content.',
      },
    ],
  },
  {
    title: 'Legacy Contact and what happens after death',
    items: [
      {
        key: 'legacy-what',
        q: 'What is a Legacy Contact?',
        a: LEGACY_WHAT_ANSWER,
      },
      {
        key: 'legacy-update',
        q: 'How do I update or change my Legacy Contact?',
        a: 'Go to My Account → Legacy Contacts and click Update on the contact you want to change. You can update their details or designate a different person entirely. All changes require your password.',
      },
      {
        key: 'legacy-email',
        q: 'What if my Legacy Contact moves or changes their email?',
        a: 'You can update their email address at any time through My Account. We\'ll send a notification to their new email letting them know their contact info has been updated.',
      },
      {
        key: 'legacy-after',
        q: 'What happens to my plan after I die?',
        a: LEGACY_AFTER_ANSWER,
      },
    ],
  },
  {
    title: 'Support and contact',
    items: [
      {
        key: 'contact',
        q: 'How can I get help?',
        a: 'Reach out to us at contact@thenightside.net. We aim to respond as soon as we can.',
      },
      {
        key: 'before-contact',
        q: 'What should I check before contacting support?',
        a: 'This FAQ page covers the most common questions. If your question isn\'t answered here, please reach out — we\'re happy to help.',
      },
    ],
  },
]

function FaqEntry({ faqKey, q, a, defaultOpen, itemRef }: {
  faqKey: string
  q: string
  a: React.ReactNode
  defaultOpen: boolean
  itemRef?: (el: HTMLDivElement | null) => void
}) {
  const [open, setOpen] = useState(defaultOpen)

  return (
    <div ref={itemRef} style={{ borderBottom: '1px solid rgba(19,4,38,0.1)' }}>
      <button
        onClick={() => setOpen((v) => !v)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          background: 'none', border: 'none', padding: '18px 0', cursor: 'pointer', gap: 16, textAlign: 'left',
        }}
      >
        <span style={{ fontFamily: hv, fontSize: 16, fontWeight: 600, color: '#130426' }}>{q}</span>
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0, transition: 'transform 200ms ease', transform: open ? 'rotate(180deg)' : 'rotate(0deg)' }}>
          <path d="M3 6l5 5 5-5" stroke="#130426" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      {open && (
        typeof a === 'string'
          ? <p style={{ fontFamily: hv, fontSize: 15, color: 'rgba(19,4,38,0.75)', lineHeight: 1.7, margin: '0 0 20px', paddingRight: 32 }}>{a}</p>
          : a
      )}
    </div>
  )
}

function HelpContent() {
  const searchParams = useSearchParams()
  const expandedParam = searchParams.get('expanded')
  const privacyRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (expandedParam === 'privacy' && privacyRef.current) {
      const timer = setTimeout(() => {
        const top = privacyRef.current!.getBoundingClientRect().top + window.scrollY - 96
        window.scrollTo({ top, behavior: 'smooth' })
      }, 100)
      return () => clearTimeout(timer)
    }
  }, [expandedParam])

  return (
    <div style={{ background: '#F8F4EB', minHeight: '100vh', padding: '64px 24px 80px' }}>
      <div style={{ maxWidth: 640, margin: '0 auto' }}>

        <h1 style={{ fontFamily: hv, fontSize: 32, fontWeight: 600, color: '#130426', margin: '0 0 8px' }}>
          Help
        </h1>
        <p style={{ fontFamily: hv, fontSize: 16, color: 'rgba(19,4,38,0.6)', margin: '0 0 56px', lineHeight: 1.6 }}>
          Answers to common questions about using The Nightside Planning Studio.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 56 }}>
          {CATEGORIES.map((cat) => (
            <div key={cat.title}>
              <h2 style={{ fontFamily: hv, fontSize: 14, fontWeight: 700, color: '#130426', textTransform: 'uppercase', letterSpacing: '0.07em', margin: '0 0 4px' }}>
                {cat.title}
              </h2>
              <div style={{ borderTop: '2px solid rgba(219,88,53,0.2)' }}>
                {cat.items.map((faq) => (
                  <FaqEntry
                    key={faq.key}
                    faqKey={faq.key}
                    q={faq.q}
                    a={faq.a}
                    defaultOpen={faq.key === 'privacy' && expandedParam === 'privacy'}
                    itemRef={faq.key === 'privacy' ? (el) => { privacyRef.current = el } : undefined}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>

        <div style={{ marginTop: 72, background: '#EDE9F4', borderRadius: 12, padding: '28px 32px' }}>
          <p style={{ fontFamily: hv, fontSize: 16, fontWeight: 600, color: '#130426', margin: '0 0 8px' }}>
            Still have questions?
          </p>
          <p style={{ fontFamily: hv, fontSize: 15, color: 'rgba(19,4,38,0.75)', margin: '0 0 16px', lineHeight: 1.6 }}>
            Reach out and we&apos;ll get back to you as soon as we can.
          </p>
          <a
            href="mailto:contact@thenightside.net"
            style={{ fontFamily: hv, fontSize: 15, fontWeight: 600, color: '#130426', textDecoration: 'underline', textUnderlineOffset: 3 }}
            className="help-email-link"
          >
            contact@thenightside.net →
          </a>
        </div>

      </div>
      <style>{`.help-email-link:hover { text-decoration: underline !important; }`}</style>
    </div>
  )
}

export default function HelpPage() {
  return (
    <Suspense fallback={
      <div style={{ background: '#F8F4EB', minHeight: '100vh', padding: '64px 24px 80px' }}>
        <div style={{ maxWidth: 640, margin: '0 auto' }}>
          <h1 style={{ fontFamily: hv, fontSize: 32, fontWeight: 600, color: '#130426', margin: '0 0 48px' }}>Help</h1>
        </div>
      </div>
    }>
      <HelpContent />
    </Suspense>
  )
}
