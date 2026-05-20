'use client'

import { useEffect, useState } from 'react'

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

function getDomainSegments(title: string): SegmentDef[] {
  const lower = title.toLowerCase()
  for (const config of DOMAIN_SEGMENT_CONFIGS) {
    if (lower.includes(config.match)) return config.segments
  }
  return []
}

export default function DomainNullStateBanner({
  domains,
}: {
  domains: { id: string; title: string }[]
}) {
  const [isNullState, setIsNullState] = useState(false)

  useEffect(() => {
    let anyStarted = false
    outer: for (const domain of domains) {
      for (const seg of getDomainSegments(domain.title)) {
        const key = seg.type === 'orient'
          ? `orient_${domain.id}_${seg.key}`
          : `ready_${domain.id}_${seg.key}`
        const val = localStorage.getItem(key)
        if (val === 'complete' || val === 'in_progress') {
          anyStarted = true
          break outer
        }
      }
    }
    setIsNullState(!anyStarted)
  }, [domains])

  if (!isNullState) return null

  return (
    <p style={{
      fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif",
      fontSize: 15,
      color: 'rgba(19,4,38,0.55)',
      margin: '0 0 20px 0',
      lineHeight: 1.55,
    }}>
      If you&rsquo;re just getting started, consider exploring reflection or learning first. Your work there will appear in this section as you go.
    </p>
  )
}
