'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { loadDomainState, type DomainState } from '@/lib/domain-state'
import { getDomainCheckboxSlots, type CheckboxSlot } from '@/lib/domain-structure'
import { qualitativeLabel } from '@/lib/domain-status'

// ---------------------------------------------------------------------------
// Helpers — each segment is one readiness checkbox; binary done / not-done.
// ---------------------------------------------------------------------------

function slotDone(domainId: string, slot: CheckboxSlot, state: DomainState): boolean {
  return state[domainId]?.checkboxes?.[slot.rowKey]?.[slot.index] === true
}

// ---------------------------------------------------------------------------
// MiniSegmentBar — one binary segment per readiness checkbox
// ---------------------------------------------------------------------------

function MiniSegmentBar({
  domainId,
  slots,
  labelColor,
}: {
  domainId: string
  slots: CheckboxSlot[]
  labelColor: string
}) {
  const [done, setDone] = useState<boolean[]>(() => slots.map(() => false))

  useEffect(() => {
    let cancelled = false
    void (async () => {
      const { state } = await loadDomainState()
      if (cancelled) return
      setDone(slots.map((slot) => slotDone(domainId, slot, state)))
    })()
    return () => { cancelled = true }
  }, [domainId, slots])

  const total   = slots.length
  const checked = done.filter(Boolean).length
  // Filled-left progress fill: completed segments first, then the rest.
  const sorted  = [...done].sort((a, b) => Number(b) - Number(a))

  return (
    <div>
      <div style={{ display: 'flex', gap: 4, marginBottom: 8, flexWrap: 'wrap' }}>
        {sorted.map((isDone, i) => (
          <div
            key={i}
            style={{ width: 24, height: 6, borderRadius: 3, flexShrink: 0, background: isDone ? '#D85A30' : '#F8F4EB', border: '1px solid rgba(216,90,48,0.45)' }}
          />
        ))}
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
          <MiniSegmentBar
            domainId={domain.id}
            slots={slots}
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

