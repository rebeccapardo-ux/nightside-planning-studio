'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createSupabaseBrowserClient } from '@/lib/supabase-browser'

export default function DeleteEntryButton({
  entryId,
  theme = 'dark',
}: {
  entryId: string
  theme?: 'dark' | 'light'
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
          className="rounded-full bg-[#DB5835] text-[#130426] px-4 py-1.5 text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
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

  return (
    <button
      onClick={() => setConfirming(true)}
      className={`text-xs transition-colors ${lt ? 'text-light-secondary hover:text-[#130426]' : 'text-[#f8f4eb]/70 hover:text-[#f8f4eb]'}`}
    >
      Delete
    </button>
  )
}
