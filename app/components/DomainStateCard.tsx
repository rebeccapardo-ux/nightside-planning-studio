'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'

type DomainStyle = {
  bg: string
  text: string
  meta: string
  helper: string
  stateBadge: string
}

const DOMAIN_STYLES: DomainStyle[] = [
  { bg: 'bg-[#BBABF4]', text: 'text-[#130426]',    meta: 'text-[#130426]/65', helper: 'text-[#130426]/50', stateBadge: 'bg-[#130426]/[0.09]  text-[#130426]' },
  { bg: 'bg-[#2C3777]', text: 'text-[#f8f4eb]',    meta: 'text-[#f8f4eb]/65', helper: 'text-[#f8f4eb]/50', stateBadge: 'bg-[#f8f4eb]/[0.12]  text-[#f8f4eb]' },
  { bg: 'bg-[#f8f4eb]', text: 'text-[#130426]',    meta: 'text-[#130426]/65', helper: 'text-[#130426]/50', stateBadge: 'bg-[#130426]/[0.07]  text-[#130426]' },
  { bg: 'bg-[#f29836]', text: 'text-[#130426]',    meta: 'text-[#130426]/65', helper: 'text-[#130426]/50', stateBadge: 'bg-[#130426]/[0.09]  text-[#130426]' },
  { bg: 'bg-[#DB5835]', text: 'text-[#f8f4eb]',    meta: 'text-[#f8f4eb]/65', helper: 'text-[#f8f4eb]/50', stateBadge: 'bg-[#f8f4eb]/[0.12]  text-[#f8f4eb]' },
]

type StateSignal = {
  label: string
  secondary: string
  isAttention: boolean
}

function computeState(
  domainId: string,
  totalCount: number,
  docsCount: number,
  outputsCount: number,
): StateSignal {
  // Read planning statuses from localStorage
  let activePlanning = 0

  if (typeof window !== 'undefined') {
    const allKeys = Object.keys(localStorage)

    const orientKeys = allKeys.filter(
      (k) => k.startsWith(`orient_${domainId}_`) && !k.endsWith('_updated'),
    )
    const readyKeys = allKeys.filter(
      (k) => k.startsWith(`ready_${domainId}_`) && !k.endsWith('_updated'),
    )

    for (const k of orientKeys) {
      const v = localStorage.getItem(k)
      // Normalize to 3-status: in_progress/complete count as active planning
      const normalized =
        v === 'in_progress' || v === 'complete' ? v :
        ['in_motion', 'drafted', 'revisited', 'needs_attention', 'started', 'needs_review'].includes(v ?? '') ? 'in_progress' :
        v === 'in_place' ? 'complete' :
        'not_started'
      if (normalized !== 'not_started') activePlanning++
    }
    for (const k of readyKeys) {
      const v = localStorage.getItem(k)
      // In the new system there is no "needs attention" state — skip attention counting
      void v
    }
  }

  const hasStructuredWork = docsCount > 0 || outputsCount > 0

  let label: string
  if (totalCount >= 3 && hasStructuredWork) {
    label = 'Taking shape'
  } else if (activePlanning >= 2 || totalCount >= 3) {
    label = 'In motion'
  } else if (activePlanning >= 1 || totalCount >= 1) {
    label = 'Started'
  } else {
    label = 'Not started'
  }

  let secondary: string
  if (activePlanning > 0 && totalCount === 0) {
    secondary = 'Planning in motion'
  } else if (totalCount > 0) {
    secondary = `${totalCount} material${totalCount === 1 ? '' : 's'} contributing`
  } else {
    secondary = 'Nothing added yet'
  }

  return { label, secondary, isAttention: false }
}

export default function DomainStateCard({
  domain,
  colorIndex,
  totalCount,
  docsCount,
  outputsCount,
}: {
  domain: { id: string; title: string }
  colorIndex: number
  totalCount: number
  docsCount: number
  outputsCount: number
}) {
  const style = DOMAIN_STYLES[colorIndex % DOMAIN_STYLES.length]

  // Hydrate state from localStorage on client
  const [signal, setSignal] = useState<StateSignal>(() =>
    computeState(domain.id, totalCount, docsCount, outputsCount),
  )

  useEffect(() => {
    setSignal(computeState(domain.id, totalCount, docsCount, outputsCount))
  }, [domain.id, totalCount, docsCount, outputsCount])

  return (
    <Link
      href={`/app/domains/${domain.id}`}
      className={`flex flex-col h-full rounded-2xl px-6 py-6 transition hover:opacity-90 ${style.bg}`}
    >
      {/* Title */}
      <div className={`text-[18px] font-semibold leading-snug mb-4 ${style.text}`}>
        {domain.title}
      </div>

      {/* State signal — primary */}
      <div className="flex-1">
        <div
          className={`inline-block text-[12px] font-semibold rounded-full px-2.5 py-0.5 mb-2 ${style.stateBadge} ${signal.isAttention ? 'ring-1 ring-current/20' : ''}`}
        >
          {signal.label}
        </div>
        <p className={`text-[13px] leading-snug ${signal.isAttention ? style.text : style.meta}`}>
          {signal.secondary}
        </p>
      </div>

      {/* Entry affordance */}
      <div className={`text-[14px] font-semibold ${style.meta} mt-5`}>
        Open →
      </div>
    </Link>
  )
}
