'use client'

import { useEffect, useState } from 'react'
import { loadDomainState } from '@/lib/domain-state'
import { computeDomainProgress } from '@/lib/domain-status'

export default function DomainNullStateBanner({
  domains,
}: {
  domains: { id: string; title: string; domain_code?: string | null }[]
}) {
  const [isNullState, setIsNullState] = useState(false)

  useEffect(() => {
    let cancelled = false
    void (async () => {
      const { state } = await loadDomainState()
      if (cancelled) return
      const anyStarted = domains.some(
        (d) => computeDomainProgress(d.id, d.domain_code, state, []).checked > 0,   // PR3: real user tasks
      )
      setIsNullState(!anyStarted)
    })()
    return () => { cancelled = true }
  }, [domains])

  if (!isNullState) return null

  return (
    <p style={{
      fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif",
      fontSize: 15,
      color: 'rgba(19,4,38,0.65)',
      margin: '0 0 20px 0',
      lineHeight: 1.55,
    }}>
      If you&rsquo;re just getting started, consider exploring reflection or learning first. Your work there will appear in this section as you go.
    </p>
  )
}
