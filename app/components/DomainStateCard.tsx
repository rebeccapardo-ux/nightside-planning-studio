'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { loadDomainState, getOrient, getReadyStatus, type DomainState } from '@/lib/domain-state'

// ---------------------------------------------------------------------------
// Domain segment configs — topic keys in page order (orientation then readiness)
// ---------------------------------------------------------------------------

type SegmentDef = { key: string; type: 'orient' | 'ready' }

const DOMAIN_SEGMENT_CONFIGS: { match: string; segments: SegmentDef[] }[] = [
  {
    match: 'healthcare',
    segments: [
      { key: 'values_care_priorities',   type: 'orient' },
      { key: 'decision_making_framework', type: 'orient' },
      { key: 'who_would_speak',          type: 'orient' },
      { key: 'who_will_decide',          type: 'ready'  },
      { key: 'wishes_clear_shared',      type: 'ready'  },
    ],
  },
  {
    match: 'deathcare',
    segments: [
      { key: 'final_resting_place_wishes', type: 'orient' },
      { key: 'legal_options_province',     type: 'orient' },
      { key: 'final_resting_place_wishes', type: 'ready'  },
    ],
  },
  {
    match: 'will',
    segments: [
      { key: 'legal_will_requirements',     type: 'orient' },
      { key: 'executor_choice',             type: 'orient' },
      { key: 'asset_wishes',               type: 'orient' },
      { key: 'care_children_pets',         type: 'orient' },
      { key: 'additional_estate_planning', type: 'orient' },
      { key: 'legal_will_in_place',        type: 'ready'  },
      { key: 'other_estate_planning',      type: 'ready'  },
      { key: 'professional_support',       type: 'ready'  },
      { key: 'meaningful_objects',         type: 'ready'  },
    ],
  },
  {
    match: 'ritual',
    segments: [
      { key: 'meaningful_rituals',           type: 'orient' },
      { key: 'mark_or_remember',             type: 'orient' },
      { key: 'ritual_ceremony_preferences',  type: 'ready'  },
    ],
  },
  {
    match: 'legacy',
    segments: [
      { key: 'life_story_shaped',    type: 'orient' },
      { key: 'how_remembered',       type: 'orient' },
      { key: 'relationships_impact', type: 'orient' },
      { key: 'sharing_what_matters', type: 'ready'  },
    ],
  },
  {
    match: 'personal',
    segments: [
      { key: 'understand_personal_admin',    type: 'orient' },
      { key: 'personal_information',         type: 'ready'  },
      { key: 'important_contacts',           type: 'ready'  },
      { key: 'financial_information',        type: 'ready'  },
      { key: 'devices_and_accounts',         type: 'ready'  },
      { key: 'social_media_digital_assets',  type: 'ready'  },
    ],
  },
]

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

type Status = 'not_started' | 'in_progress' | 'complete'

function getSegmentStatusFromState(domainId: string, seg: SegmentDef, state: DomainState): Status {
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

function getDomainSegments(title: string): SegmentDef[] {
  const lower = title.toLowerCase()
  for (const config of DOMAIN_SEGMENT_CONFIGS) {
    if (lower.includes(config.match)) return config.segments
  }
  return []
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
  segments: SegmentDef[]
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
  { bg: 'bg-[#DB5835]', text: 'text-[#f8f4eb]', meta: 'text-[#f8f4eb]/65', labelColor: 'rgba(255,255,255,0.88)' },
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
          color: isDark ? '#FFFFFF' : '#1A1A1A',
          border: isDark ? '1px solid rgba(255,255,255,0.3)' : '1px solid rgba(0,0,0,0.15)',
        }}>
          Continue planning →
        </span>
      </div>
    </Link>
  )
}

