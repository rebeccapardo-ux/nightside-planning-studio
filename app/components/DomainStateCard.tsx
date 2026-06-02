'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { loadDomainState, getOrient, getReadyStatus, type DomainState } from '@/lib/domain-state'
import { getDomainSegments, type DomainSegment } from '@/lib/domain-structure'

// ---------------------------------------------------------------------------
// Domain segment configs — topic keys in page order (orientation then readiness)
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

type Status = 'not_started' | 'in_progress' | 'complete'

function getSegmentStatusFromState(domainId: string, seg: DomainSegment, state: DomainState): Status {
  if (seg.type === 'orient') return getOrient(state, domainId, seg.key)
  return getReadyStatus(state, domainId, seg.key)
}

function qualitativeLabel(exploredCount: number, totalCount: number): string {
  if (exploredCount === 0 || totalCount === 0) return 'Not yet started'
  const pct = exploredCount / totalCount
  if (pct >= 1)    return 'Deeply explored'
  if (pct >= 0.67) return 'Well underway'
  if (pct >= 0.34) return 'Taking shape'
  return 'Just beginning'
}

// ---------------------------------------------------------------------------
// MiniSegmentBar — always 5 segments, proportional fill
// ---------------------------------------------------------------------------

function MiniSegmentBar({
  domainId,
  segments,
  labelColor,
}: {
  domainId: string
  segments: DomainSegment[]
  labelColor: string
}) {
  const [statuses, setStatuses] = useState<Status[]>(() =>
    segments.map(() => 'not_started')
  )

  useEffect(() => {
    let cancelled = false
    void (async () => {
      const { state } = await loadDomainState()
      if (cancelled) return
      setStatuses(segments.map((seg) => getSegmentStatusFromState(domainId, seg, state)))
    })()
    return () => { cancelled = true }
  }, [domainId, segments])

  const totalCount   = segments.length
  const exploredCount = statuses.filter((s) => s !== 'not_started').length
  const ORDER: Record<Status, number> = { complete: 0, in_progress: 1, not_started: 2 }
  const sortedStatuses = [...statuses].sort((a, b) => ORDER[a] - ORDER[b])

  function segColor(status: Status): string {
    if (status === 'complete')    return '#D85A30'
    if (status === 'in_progress') return '#F0997B'
    return '#F8F4EB'
  }

  return (
    <div>
      <div style={{ display: 'flex', gap: 4, marginBottom: 8 }}>
        {sortedStatuses.map((status, i) => (
          <div
            key={i}
            style={{ width: 24, height: 6, borderRadius: 3, flexShrink: 0, background: segColor(status), border: '1px solid rgba(216,90,48,0.45)' }}
          />
        ))}
      </div>
      <p style={{ fontSize: 13, fontWeight: 600, color: labelColor, margin: '0 0 4px 0' }}>
        {qualitativeLabel(exploredCount, totalCount)}
      </p>
      <p style={{ fontSize: 12, color: labelColor, margin: 0 }}>
        {exploredCount} of {totalCount} topics started
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
  domain: { id: string; title: string }
  colorIndex: number
}) {
  const style    = DOMAIN_STYLES[colorIndex % DOMAIN_STYLES.length]
  const segments = getDomainSegments(domain.title)
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
        {segments.length > 0 ? (
          <MiniSegmentBar
            domainId={domain.id}
            segments={segments}
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

