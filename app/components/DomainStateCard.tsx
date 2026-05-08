'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'

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

function getSegmentStatus(domainId: string, seg: SegmentDef): Status {
  const key = seg.type === 'orient'
    ? `orient_${domainId}_${seg.key}`
    : `ready_${domainId}_${seg.key}`
  const val = localStorage.getItem(key)
  if (val === 'complete')    return 'complete'
  if (val === 'in_progress') return 'in_progress'
  return 'not_started'
}

function qualitativeLabel(exploredCount: number): string {
  if (exploredCount === 0) return 'Not yet started'
  if (exploredCount <= 2)  return 'Just beginning'
  if (exploredCount <= 4)  return 'Taking shape'
  if (exploredCount <= 6)  return 'Well underway'
  return 'Deeply explored'
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
    setStatuses(segments.map((seg) => getSegmentStatus(domainId, seg)))
  }, [domainId, segments])

  const totalCount    = segments.length
  const completedCount = statuses.filter((s) => s === 'complete').length
  const exploredCount  = statuses.filter((s) => s !== 'not_started').length
  const inProgress     = statuses.some((s) => s === 'in_progress')

  // Fixed 5 segments — fill count proportional to completed topics; in_progress shown as lighter partial
  const filledCount = totalCount > 0
    ? Math.min(5, Math.max(0, Math.round((completedCount / totalCount) * 5)))
    : 0
  const hasPartial = inProgress && filledCount < 5

  const segStyle = (i: number): React.CSSProperties => {
    if (i < filledCount)
      return { background: '#D85A30' }
    if (i === filledCount && hasPartial)
      return { background: '#F0997B' }
    return { background: '#FAECE7', border: '1px solid #7A4A2E' }
  }

  return (
    <div>
      <div style={{ display: 'flex', gap: 3, width: '100%', marginBottom: 8 }}>
        {[0, 1, 2, 3, 4].map((i) => (
          <div
            key={i}
            style={{ flex: '1 1 0', height: 10, borderRadius: 4, ...segStyle(i) }}
          />
        ))}
      </div>
      <p style={{ fontSize: 13, fontWeight: 600, color: labelColor, margin: '0 0 4px 0' }}>
        {qualitativeLabel(exploredCount)}
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

