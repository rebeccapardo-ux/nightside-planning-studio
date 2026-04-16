'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createSupabaseBrowserClient } from '@/lib/supabase-browser'

export default function DeleteEntryButton({
  entryId,
  theme = 'dark',
  compact = false,
}: {
  entryId: string
  theme?: 'dark' | 'light'
  compact?: boolean
}) {
  const [confirming, setConfirming] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const router = useRouter()
  const lt = theme === 'light'

  async function handleDelete() {
    setDeleting(true)
    const supabase = createSupabaseBrowserClient()
    await supabase.from('entries').delete().eq('id', entryId)
    router.refresh()
  }

  if (confirming) {
    return (
      <div className={`flex flex-wrap items-center gap-3 py-3 text-sm ${lt ? 'text-[#130426]' : 'text-[#f8f4eb]'}`}>
        <span>Are you sure? Deleting this will permanently remove it from your materials.</span>
        <button
          onClick={handleDelete}
          disabled={deleting}
          className="rounded-full bg-[#DB5835] text-[#f8f4eb] px-4 py-1.5 text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          {deleting ? 'Deleting…' : 'Yes, delete'}
        </button>
        <button
          onClick={() => setConfirming(false)}
          className={`text-sm font-medium hover:underline ${lt ? 'text-[#130426]' : 'text-[#f8f4eb]'}`}
        >
          Cancel
        </button>
      </div>
    )
  }

  if (compact) {
    return (
      <button
        onClick={() => setConfirming(true)}
        className="text-xs text-[#DB5835]/60 hover:text-[#DB5835] transition-colors"
      >
        Delete
      </button>
    )
  }

  return (
    <button
      onClick={() => setConfirming(true)}
      className={`text-sm font-medium underline underline-offset-2 transition-colors ${lt ? 'text-[#DB5835]' : 'text-[#DB5835]'}`}
    >
      Delete
    </button>
  )
}
