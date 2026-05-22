'use client'
import { useState, useEffect } from 'react'
import { createSupabaseBrowserClient } from '@/lib/supabase-browser'
import OnboardingStepIndicator from '@/app/components/OnboardingStepIndicator'

type Phase = 'loading' | 'hidden' | 'visible'

export default function HomeOnboardingIndicator() {
  const [phase, setPhase] = useState<Phase>('loading')
  const [allComplete, setAllComplete] = useState(false)
  const [flourishIndex, setFlourishIndex] = useState(-1)
  const [containerOpacity, setContainerOpacity] = useState(1)

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

      // Show the indicator
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

              // Start fading
              setContainerOpacity(0)

              // After fade completes (800ms transition), unmount and mark shown
              setTimeout(() => {
                if (cancelled) return
                setPhase('hidden')
                fetch('/api/onboarding/complete-shown', { method: 'POST' }).catch(() => {})
              }, 900)
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

  if (phase !== 'visible') return null

  return (
    <div
      style={{
        width: '100%',
        background: '#F8F4EB',
        padding: '28px 24px 24px',
        opacity: containerOpacity,
        transition: 'opacity 800ms ease-in-out',
      }}
    >
      <OnboardingStepIndicator
        currentStep={allComplete ? 6 : 5}
        allComplete={allComplete}
        flourishIndex={flourishIndex}
      />
    </div>
  )
}
