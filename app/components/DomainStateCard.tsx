'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { loadDomainState } from '@/lib/domain-state'
import { getDomainCheckboxSlots } from '@/lib/domain-structure'
import { qualitativeLabel, computeDomainProgress, type DomainProgress } from '@/lib/domain-status'

// ---------------------------------------------------------------------------
// MiniProgressBar — proportional fill (fraction = checked / total)
// ---------------------------------------------------------------------------

function MiniProgressBar({
  domainId,
  code,
  labelColor,
}: {
  domainId: string
  code: string | null | undefined
  labelColor: string
}) {
  const [{ checked, total, pct }, setProgress] = useState<DomainProgress>({ checked: 0, total: 0, pct: 0 })

  useEffect(() => {
    let cancelled = false
    void (async () => {
      const { state } = await loadDomainState()
      if (cancelled) return
      setProgress(computeDomainProgress(domainId, code, state, []))   // PR3: real user tasks
    })()
    return () => { cancelled = true }
  }, [domainId, code])

  return (
    <div>
      <div style={{ height: 6, marginBottom: 8, borderRadius: 3, background: '#F8F4EB', border: '1px solid rgba(216,90,48,0.45)', overflow: 'hidden' }}>
        <div style={{ width: `${Math.round(pct * 100)}%`, height: '100%', background: '#D85A30', transition: 'width 200ms ease' }} />
      </div>
      <p style={{ fontSize: 13, fontWeight: 600, color: labelColor, margin: '0 0 4px 0' }}>
        {qualitativeLabel(checked, total)}
      </p>
      <p style={{ fontSize: 12, color: labelColor, margin: 0 }}>
        {checked} of {total} complete
      </p>
    </div>
  )
}

// ---------------------------------------------------------------------------
// DomainStateCard
// ---------------------------------------------------------------------------

const DOMAIN_STYLES = [
  { bg: 'bg-[#BBABF4]', text: 'text-[#130426]', meta: 'text-[#130426]/65', labelColor: 'rgba(0,0,0,0.82)'    },
  { bg: 'bg-[#2C3777]', text: 'text-[#f8f4eb]', meta: 'text-[#f8f4eb]/65', labelColor: 'rgba(255,255,255,0.88)' },
  { bg: 'bg-[#f29836]', text: 'text-[#130426]', meta: 'text-[#130426]/65', labelColor: 'rgba(0,0,0,0.82)'    },
  { bg: 'bg-[#130426]', text: 'text-[#f8f4eb]', meta: 'text-[#f8f4eb]/65', labelColor: 'rgba(255,255,255,0.88)' },
  { bg: 'bg-[#DB5835]', text: 'text-[#130426]', meta: 'text-[#130426]', labelColor: '#130426' },
]

export default function DomainStateCard({
  domain,
  colorIndex,
}: {
  domain: { id: string; title: string; domain_code?: string | null }
  colorIndex: number
}) {
  const style    = DOMAIN_STYLES[colorIndex % DOMAIN_STYLES.length]
  const slots    = getDomainCheckboxSlots(domain.domain_code)
  const isDark   = style.text === 'text-[#f8f4eb]'

  return (
    <Link
      href={`/app/domains/${domain.id}`}
      className={`flex flex-col h-full transition-transform duration-150 ease-out hover:scale-[1.02] ${style.bg}`}
      style={{ borderRadius: 20, minHeight: 220, padding: 34, overflow: 'hidden' }}
    >
      <div className={`text-[18px] font-semibold leading-snug mb-4 ${style.text}`}>
        {domain.title}
      </div>

      <div className="flex-1 mb-4">
        {slots.length > 0 ? (
          <MiniProgressBar
            domainId={domain.id}
            code={domain.domain_code}
            labelColor={style.labelColor}
          />
        ) : (
          <p style={{ fontSize: 12, color: style.labelColor, margin: 0 }}>
            No topics yet
          </p>
        )}
      </div>

      {/* CTA */}
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <span style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '8px 14px',
          borderRadius: 999,
          fontSize: 14,
          fontWeight: 500,
          background: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.05)',
          color: isDark ? '#FFFFFF' : '#130426',
          border: isDark ? '1px solid rgba(255,255,255,0.3)' : '1px solid rgba(0,0,0,0.15)',
        }}>
          Continue planning →
        </span>
      </div>
    </Link>
  )
}

