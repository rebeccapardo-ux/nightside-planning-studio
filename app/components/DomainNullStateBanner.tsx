'use client'

import { useEffect, useState } from 'react'
import { loadDomainState, getOrient, getReadyStatus } from '@/lib/domain-state'
import { getDomainSegments } from '@/lib/domain-structure'

export default function DomainNullStateBanner({
  domains,
}: {
  domains: { id: string; title: string }[]
}) {
  const [isNullState, setIsNullState] = useState(false)

  useEffect(() => {
    let cancelled = false
    void (async () => {
      const { state } = await loadDomainState()
      if (cancelled) return
      let anyStarted = false
      outer: for (const domain of domains) {
        for (const seg of getDomainSegments(domain.title)) {
          const status = seg.type === 'orient'
            ? getOrient(state, domain.id, seg.key)
            : getReadyStatus(state, domain.id, seg.key)
          if (status === 'complete' || status === 'in_progress') {
            anyStarted = true
            break outer
          }
        }
      }
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
