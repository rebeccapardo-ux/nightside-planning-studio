'use client'
import { useState, useEffect, useRef } from 'react'
import { createSupabaseBrowserClient } from '@/lib/supabase-browser'
import OnboardingStepIndicator from '@/app/components/OnboardingStepIndicator'

type Phase = 'loading' | 'hidden' | 'visible'

// Expand + fade duration for the bar's entrance and exit (tune to taste).
const REVEAL_MS = 600

export default function HomeOnboardingIndicator() {
  const [phase, setPhase] = useState<Phase>('loading')
  const [allComplete, setAllComplete] = useState(false)
  const [flourishIndex, setFlourishIndex] = useState(-1)
  // `entered` drives the expand-in / collapse-out; height is measured so the
  // max-height transition animates to the exact content height (no dead tail).
  const [entered, setEntered] = useState(false)
  const [contentHeight, setContentHeight] = useState(0)
  const innerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let cancelled = false

    async function check() {
      const supabase = createSupabaseBrowserClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user || cancelled) { setPhase('hidden'); return }

      const { data: profile } = await supabase
        .from('user_profiles')
        .select('onboarding_complete_shown')
        .eq('user_id', user.id)
        .maybeSingle()

      if (cancelled) return

      // If already shown (or column is null — treat as false, so show once), skip
      if (profile?.onboarding_complete_shown === true) {
        setPhase('hidden')
        return
      }

      // Check for primary legacy contact
      const { data: contacts } = await supabase
        .from('legacy_contacts')
        .select('id')
        .eq('user_id', user.id)
        .eq('contact_type', 'primary')
        .limit(1)

      if (cancelled) return

      if (!contacts || contacts.length === 0) {
        setPhase('hidden')
        return
      }

      // Show the indicator (it mounts collapsed; an effect on `phase` measures the
      // content and animates the expand-in, so the homepage doesn't jump).
      setPhase('visible')

      // After 500ms, transition step 5 to completed (navy checkmark)
      const t1 = setTimeout(() => {
        if (cancelled) return
        setAllComplete(true)

        // After allComplete + 600ms (transition complete), start flourish
        const t2 = setTimeout(() => {
          if (cancelled) return

          // Sequential flourish through circles 0–4
          const delays = [0, 70, 140, 210, 280]
          delays.forEach((delay, idx) => {
            setTimeout(() => {
              if (cancelled) return
              setFlourishIndex(idx)
            }, delay)
          })

          // After last flourish circle + 300ms, clear flourish glow and hold
          setTimeout(() => {
            if (cancelled) return
            setFlourishIndex(-1)

            // Hold the fully-completed state so the user can appreciate it
            setTimeout(() => {
              if (cancelled) return

              // Collapse + fade out (animates height so content slides up smoothly)
              setEntered(false)

              // After the reveal transition, unmount and mark shown
              setTimeout(() => {
                if (cancelled) return
                setPhase('hidden')
                fetch('/api/onboarding/complete-shown', { method: 'POST' }).catch(() => {})
              }, REVEAL_MS + 50)
            }, 1800)
          }, 280 + 300)
        }, 600)

        return () => clearTimeout(t2)
      }, 500)

      return () => clearTimeout(t1)
    }

    check()
    return () => { cancelled = true }
  }, [])

  // Once visible: the bar first paints collapsed (maxHeight 0). On the next tick —
  // after that paint — measure the content's natural height and flip `entered`, so
  // max-height animates 0 → height + opacity fades in (no synchronous setState here,
  // so the homepage slides down smoothly instead of the bar popping in).
  useEffect(() => {
    if (phase !== 'visible') return
    const t = setTimeout(() => {
      setContentHeight(innerRef.current?.scrollHeight ?? 0)
      setEntered(true)
    }, 30)
    return () => clearTimeout(t)
  }, [phase])

  if (phase !== 'visible') return null

  return (
    <div
      style={{
        width: '100%',
        overflow: 'hidden',
        maxHeight: entered ? contentHeight : 0,
        opacity: entered ? 1 : 0,
        transition: `max-height ${REVEAL_MS}ms ease-in-out, opacity ${REVEAL_MS}ms ease-in-out`,
      }}
    >
      <div ref={innerRef} style={{ background: '#F8F4EB', padding: '28px 24px 24px' }}>
        <OnboardingStepIndicator
          currentStep={allComplete ? 6 : 5}
          allComplete={allComplete}
          flourishIndex={flourishIndex}
        />
      </div>
    </div>
  )
}
