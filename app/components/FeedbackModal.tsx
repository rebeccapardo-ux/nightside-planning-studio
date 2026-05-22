'use client'
import { useEffect, useRef, useState } from 'react'
import { createSupabaseBrowserClient } from '@/lib/supabase-browser'

const hv = "'Helvetica Neue', Helvetica, Arial, sans-serif"

const inputBase: React.CSSProperties = {
  fontFamily: hv, fontSize: 14, color: '#130426',
  background: '#ffffff',
  borderRadius: 8, padding: '9px 12px',
  width: '100%', boxSizing: 'border-box',
  outline: 'none',
}

export default function FeedbackModal({ onClose }: { onClose: () => void }) {
  const [isAuthed, setIsAuthed] = useState<boolean | null>(null)
  const [subject,  setSubject]  = useState('')
  const [message,  setMessage]  = useState('')
  const [email,    setEmail]    = useState('')
  const [status,   setStatus]   = useState<'idle' | 'submitting' | 'success' | 'error'>('idle')
  const [errors,   setErrors]   = useState<{ message?: string; email?: string }>({})
  const messageRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    const supabase = createSupabaseBrowserClient()
    supabase.auth.getSession().then(({ data: { session } }) => setIsAuthed(!!session))
  }, [])

  // Close on Escape
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  // Focus message field once auth state resolves
  useEffect(() => {
    if (isAuthed !== null) setTimeout(() => messageRef.current?.focus(), 50)
  }, [isAuthed])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const errs: { message?: string; email?: string } = {}
    if (!message.trim())                        errs.message = 'Please enter a message.'
    if (isAuthed === false && !email.trim())     errs.email   = 'Please enter your email.'
    if (Object.keys(errs).length) { setErrors(errs); return }

    setStatus('submitting')
    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject: subject.trim() || undefined,
          message: message.trim(),
          ...(isAuthed === false ? { email: email.trim() } : {}),
        }),
      })
      if (!res.ok) throw new Error()
      setStatus('success')
    } catch {
      setStatus('error')
    }
  }

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 200,
        background: 'rgba(19,4,38,0.55)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 24,
      }}
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        style={{
          background: '#F8F4EB',
          borderRadius: 16,
          width: '100%', maxWidth: 480,
          padding: '36px 36px 32px',
          boxShadow: '0 8px 40px rgba(19,4,38,0.2)',
        }}
        onClick={e => e.stopPropagation()}
      >
        {status === 'success' ? (
          <>
            <h2 style={{ fontFamily: hv, fontSize: 20, fontWeight: 600, color: '#130426', margin: '0 0 12px' }}>
              Feedback sent
            </h2>
            <p style={{ fontFamily: hv, fontSize: 15, color: '#130426', lineHeight: 1.65, margin: '0 0 28px' }}>
              Thanks for the feedback. We&apos;ve received your message and will reply if needed.
            </p>
            <button
              onClick={onClose}
              style={{ fontFamily: hv, fontSize: 14, fontWeight: 500, color: '#130426', background: 'none', border: '1.5px solid rgba(19,4,38,0.25)', borderRadius: 999, padding: '9px 20px', cursor: 'pointer' }}
            >
              Close
            </button>
          </>
        ) : (
          <>
            <h2 style={{ fontFamily: hv, fontSize: 20, fontWeight: 600, color: '#130426', margin: '0 0 8px' }}>
              Send us feedback
            </h2>
            <p style={{ fontFamily: hv, fontSize: 14, color: 'rgba(19,4,38,0.65)', lineHeight: 1.6, margin: '0 0 24px' }}>
              We&apos;d love to hear your thoughts about the platform: what&apos;s working, what&apos;s not, or anything else you&apos;d like to share.
            </p>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Subject */}
              <div>
                <label style={{ fontFamily: hv, fontSize: 13, fontWeight: 500, color: 'rgba(19,4,38,0.7)', display: 'block', marginBottom: 6 }}>
                  Subject (optional)
                </label>
                <input
                  type="text"
                  value={subject}
                  onChange={e => setSubject(e.target.value)}
                  maxLength={200}
                  placeholder="e.g. A suggestion about…"
                  style={{ ...inputBase, border: '1.5px solid rgba(19,4,38,0.15)' }}
                />
              </div>

              {/* Message */}
              <div>
                <label style={{ fontFamily: hv, fontSize: 13, fontWeight: 500, color: 'rgba(19,4,38,0.7)', display: 'block', marginBottom: 6 }}>
                  Your message <span style={{ color: '#C04828' }}>*</span>
                </label>
                <textarea
                  ref={messageRef}
                  value={message}
                  onChange={e => { setMessage(e.target.value); if (errors.message) setErrors(p => ({ ...p, message: undefined })) }}
                  rows={5}
                  placeholder="Tell us what's on your mind…"
                  style={{ ...inputBase, border: `1.5px solid ${errors.message ? '#C04828' : 'rgba(19,4,38,0.15)'}`, resize: 'vertical' }}
                />
                {errors.message && (
                  <p style={{ fontFamily: hv, fontSize: 12, color: '#C04828', margin: '4px 0 0' }}>{errors.message}</p>
                )}
              </div>

              {/* Email — unauthenticated only */}
              {isAuthed === false && (
                <div>
                  <label style={{ fontFamily: hv, fontSize: 13, fontWeight: 500, color: 'rgba(19,4,38,0.7)', display: 'block', marginBottom: 6 }}>
                    Your email (so we can reply) <span style={{ color: '#C04828' }}>*</span>
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={e => { setEmail(e.target.value); if (errors.email) setErrors(p => ({ ...p, email: undefined })) }}
                    placeholder="you@example.com"
                    style={{ ...inputBase, border: `1.5px solid ${errors.email ? '#C04828' : 'rgba(19,4,38,0.15)'}` }}
                  />
                  {errors.email && (
                    <p style={{ fontFamily: hv, fontSize: 12, color: '#C04828', margin: '4px 0 0' }}>{errors.email}</p>
                  )}
                </div>
              )}

              {/* Error state */}
              {status === 'error' && (
                <p style={{ fontFamily: hv, fontSize: 13, color: '#C04828', margin: 0, lineHeight: 1.55 }}>
                  Something went wrong sending your feedback. Please try again, or email us directly at{' '}
                  <a href="mailto:contact@thenightside.net" style={{ color: '#C04828' }}>contact@thenightside.net</a>.
                </p>
              )}

              {/* Actions */}
              <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 4 }}>
                <button
                  type="button"
                  onClick={onClose}
                  style={{ fontFamily: hv, fontSize: 14, fontWeight: 500, color: 'rgba(19,4,38,0.6)', background: 'none', border: 'none', padding: '9px 4px', cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={status === 'submitting'}
                  style={{ fontFamily: hv, fontSize: 14, fontWeight: 500, color: '#F8F4EB', background: '#130426', borderRadius: 999, padding: '9px 22px', border: 'none', cursor: status === 'submitting' ? 'default' : 'pointer', opacity: status === 'submitting' ? 0.65 : 1 }}
                >
                  {status === 'submitting' ? 'Sending…' : 'Send'}
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  )
}
