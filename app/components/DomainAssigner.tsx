'use client'

import { useState } from 'react'
import {
  addNoteToContainer,
  removeNoteFromContainer,
  addEntryToContainer,
  removeEntryFromContainer,
  type Container,
} from '@/lib/notes'

export default function DomainAssigner({
  itemId,
  itemType,
  allDomains,
  initialLinkedDomainIds,
  label = 'Add to',
  theme = 'dark',
  showCount = true,
  onToggled,
  onDone,
}: {
  itemId: string
  itemType: 'note' | 'entry'
  allDomains: Container[]
  initialLinkedDomainIds: string[]
  label?: string
  theme?: 'dark' | 'light'
  showCount?: boolean
  onToggled?: (domainId: string, isNowLinked: boolean) => void
  onDone?: (currentLinkedIds: string[]) => void
}) {
  const [linkedIds, setLinkedIds] = useState<string[]>(initialLinkedDomainIds)
  const [open, setOpen] = useState(false)

  if (allDomains.length === 0) return null

  async function handleToggle(domainId: string) {
    const isLinked = linkedIds.includes(domainId)
    const isNowLinked = !isLinked

    setLinkedIds((prev) =>
      isLinked ? prev.filter((id) => id !== domainId) : [...prev, domainId]
    )

    if (itemType === 'note') {
      if (isLinked) await removeNoteFromContainer(itemId, domainId)
      else await addNoteToContainer(itemId, domainId)
    } else {
      if (isLinked) await removeEntryFromContainer(itemId, domainId)
      else await addEntryToContainer(itemId, domainId)
    }

    onToggled?.(domainId, isNowLinked)
  }

  const linkedCount = linkedIds.length

  return (
    <div className="relative inline-block">
      <button
        onClick={(e) => { e.stopPropagation(); setOpen((o) => !o) }}
        className={`text-xs transition-colors ${
          theme === 'light'
            ? 'text-[#130426]/40 hover:text-[#130426]/70'
            : 'text-[#f8f4eb]/60 hover:text-[#f8f4eb]/90'
        }`}
      >
        {label}{showCount && linkedCount > 0 ? ` · ${linkedCount}` : ''}
      </button>

      {open && (
        <>
          {/* Intercepts clicks outside without letting them propagate to links below */}
          <div className="fixed inset-0 z-40" onClick={() => { setOpen(false); onDone?.(linkedIds) }} />

          <div className="absolute left-0 top-full mt-1.5 z-50 min-w-[160px] rounded-xl bg-[#2C3777] border border-[#f8f4eb]/10 shadow-xl">
            <div className="py-1.5">
              {allDomains.map((domain) => {
                const linked = linkedIds.includes(domain.id)
                return (
                  <label
                    key={domain.id}
                    className="flex items-center gap-2.5 px-4 py-2 text-xs text-[#f8f4eb]/80 hover:bg-[#f8f4eb]/[0.07] cursor-pointer select-none"
                  >
                    <input
                      type="checkbox"
                      checked={linked}
                      onChange={() => handleToggle(domain.id)}
                      className="accent-[#BBABF4] shrink-0"
                    />
                    {domain.title}
                  </label>
                )
              })}
            </div>
            <div className="border-t border-[#f8f4eb]/10 px-4 py-2 flex items-center gap-3">
              <button
                onClick={() => { setOpen(false); onDone?.(linkedIds) }}
                className="text-xs text-app-secondary hover:text-[#f8f4eb] transition-colors"
              >
                Done
              </button>
              <button
                onClick={() => setOpen(false)}
                className="text-xs text-app-tertiary hover:text-[#f8f4eb] transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
