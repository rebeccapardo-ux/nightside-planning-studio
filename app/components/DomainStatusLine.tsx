'use client'

import { useEffect, useState } from 'react'

// Mirror of the planning items map — add entries here as new domains get planning items
const PLANNING_ITEMS_MAP: { match: string; keys: string[] }[] = [
  {
    match: 'healthcare',
    keys: ['decision_maker_healthcare', 'healthcare_wishes_documented'],
  },
  {
    match: 'death',
    keys: ['end_of_life_preferences', 'understanding_options', 'communication_documentation'],
  },
]

function getPlanningKeys(domainTitle: string): string[] {
  const lower = domainTitle.toLowerCase()
  for (const entry of PLANNING_ITEMS_MAP) {
    if (lower.includes(entry.match)) return entry.keys
  }
  return []
}

export default function DomainStatusLine({
  domainId,
  domainTitle,
  textClass = 'text-[10px]',
}: {
  domainId: string
  domainTitle: string
  textClass?: string
}) {
  const [summary, setSummary] = useState<string | null>(null)

  useEffect(() => {
    const keys = getPlanningKeys(domainTitle)
    if (keys.length === 0) return

    const counts: Record<string, number> = {}
    for (const key of keys) {
      const s = localStorage.getItem(`planning_${domainId}_${key}`)
      if (s) counts[s] = (counts[s] ?? 0) + 1
    }

    const parts: string[] = []
    if (counts.in_progress)  parts.push(`${counts.in_progress} in progress`)
    if (counts.needs_review)  parts.push(`${counts.needs_review} needs review`)
    if (counts.not_started)   parts.push(`${counts.not_started} not started`)
    if (counts.completed)     parts.push(`${counts.completed} completed`)

    if (parts.length > 0) setSummary(parts.join(' · '))
  }, [domainId, domainTitle])

  if (!summary) return null

  return <p className={`${textClass} leading-snug mt-0.5 opacity-70`}>{summary}</p>
}
