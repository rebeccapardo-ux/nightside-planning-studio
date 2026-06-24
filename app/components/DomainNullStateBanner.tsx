'use client'

import { useEffect, useState } from 'react'
import { loadDomainState } from '@/lib/domain-state'
import { computeDomainProgress } from '@/lib/domain-status'
import type { UserTask } from '@/lib/user-tasks'

export default function DomainNullStateBanner({
  domains,
  tasksByDomain = {},
}: {
  domains: { id: string; title: string; domain_code?: string | null }[]
  tasksByDomain?: Record<string, UserTask[]>
}) {
  const [isNullState, setIsNullState] = useState(false)

  useEffect(() => {
    let cancelled = false
    void (async () => {
      const { state } = await loadDomainState()
      if (cancelled) return
      const anyStarted = domains.some(
        (d) => computeDomainProgress(d.id, d.domain_code, state, tasksByDomain[d.id] ?? []).checked > 0,
      )
      setIsNullState(!anyStarted)
    })()
    return () => { cancelled = true }
  }, [domains, tasksByDomain])

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
