'use client'

import { useRef, useState } from 'react'
import {
  addNoteToContainer,
  removeNoteFromContainer,
  addEntryToContainer,
  removeEntryFromContainer,
  type Container,
} from '@/lib/notes'

type DropdownPos = { top: number; left: number; openUp: boolean }

export default function DomainAssigner({
  itemId,
  itemType,
  allDomains,
  initialLinkedDomainIds,
  label = 'Add to',
  theme = 'dark',
  showCount = true,
  buttonVariant = 'text',
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
  buttonVariant?: 'text' | 'pill'
  onToggled?: (domainId: string, isNowLinked: boolean) => void
  onDone?: (currentLinkedIds: string[]) => void
}) {
  const [linkedIds, setLinkedIds] = useState<string[]>(initialLinkedDomainIds)
  const [open, setOpen] = useState(false)
  const [pos, setPos] = useState<DropdownPos | null>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)

  if (allDomains.length === 0) return null

  function handleOpen(e: React.MouseEvent) {
    e.stopPropagation()
    if (open) {
      setOpen(false)
      setPos(null)
      return
    }

    const rect = buttonRef.current?.getBoundingClientRect()
    if (!rect) return

    // Estimate dropdown height: ~34px per item + 48px for footer/padding
    const estimatedHeight = allDomains.length * 34 + 48
    const spaceBelow = window.innerHeight - rect.bottom
    const openUp = spaceBelow < estimatedHeight + 8 && rect.top > estimatedHeight

    setPos({
      top: openUp ? rect.top - estimatedHeight - 6 : rect.bottom + 6,
      left: rect.left,
      openUp,
    })
    setOpen(true)
  }

  function handleClose() {
    setOpen(false)
    setPos(null)
    onDone?.(linkedIds)
  }

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
      {buttonVariant === 'pill' ? (
        <button
          ref={buttonRef}
          onClick={handleOpen}
          style={{ fontSize: '12px', fontWeight: 600, color: '#FFFFFF', background: '#F29836', border: 'none', borderRadius: 999, padding: '6px 12px', cursor: 'pointer', lineHeight: '1.2', flexShrink: 0 }}
          className="hover:opacity-90 transition-opacity"
        >
          {label}{showCount && linkedCount > 0 ? ` · ${linkedCount}` : ''}
        </button>
      ) : (
        <button
          ref={buttonRef}
          onClick={handleOpen}
          className={`text-xs transition-colors ${
            theme === 'light'
              ? 'text-[#130426]/70 hover:text-[#130426]'
              : 'text-[#f8f4eb]/60 hover:text-[#f8f4eb]/90'
          }`}
        >
          {label}{showCount && linkedCount > 0 ? ` · ${linkedCount}` : ''}
        </button>
      )}

      {open && pos && (
        <>
          {/* Backdrop — intercepts outside clicks without propagation */}
          <div className="fixed inset-0 z-40" onClick={handleClose} />

          <div
            style={{ position: 'fixed', top: pos.top, left: pos.left, zIndex: 50 }}
            className="min-w-[160px] rounded-xl bg-[#2C3777] border border-[#f8f4eb]/10 shadow-xl"
          >
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
                onClick={handleClose}
                className="text-xs text-app-secondary hover:text-[#f8f4eb] transition-colors"
              >
                Done
              </button>
              <button
                onClick={() => { setOpen(false); setPos(null) }}
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
