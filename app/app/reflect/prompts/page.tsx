'use client'

import { useEffect, useMemo, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { createSupabaseBrowserClient } from '@/lib/supabase-browser'
import { createPromptNote } from '@/lib/notes'

const DEFAULT_CONTAINER_ID = '98bbddf4-bc0c-495f-b3cf-99c65cf7ebc8'
const REVIEWED_PROMPTS_STORAGE_KEY = 'reflect-reviewed-prompts'

const PROMPTS = [
  {
    id: 'prompt_1',
    label: 'What matters most to you right now?',
  },
  {
    id: 'prompt_2',
    label: 'What would you want someone making decisions for you to understand?',
  },
  {
    id: 'prompt_3',
    label: 'What feels unresolved or unclear?',
  },
]

export default function ReflectPromptsPage() {
  const searchParams = useSearchParams()
  const router = useRouter()

  const promptFromUrl = searchParams.get('prompt')

  const initialIndex = useMemo(() => {
    if (!promptFromUrl) return -1
    return PROMPTS.findIndex((prompt) => prompt.id === promptFromUrl)
  }, [promptFromUrl])

  const [currentIndex, setCurrentIndex] = useState(initialIndex)
  const [texts, setTexts] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const [justSaved, setJustSaved] = useState(false)
  const [showContinueWarning, setShowContinueWarning] = useState(false)

  useEffect(() => {
    if (initialIndex < 0) {
      router.replace('/app/reflect')
      return
    }
    setCurrentIndex(initialIndex)
    setShowContinueWarning(false)
    setJustSaved(false)
  }, [initialIndex, router])

  useEffect(() => {
    if (currentIndex < 0) return

    const currentPrompt = PROMPTS[currentIndex]
    if (!currentPrompt) return

    const stored = window.localStorage.getItem(REVIEWED_PROMPTS_STORAGE_KEY)
    let reviewedPromptIds: string[] = []
    try {
      reviewedPromptIds = stored ? JSON.parse(stored) : []
    } catch {
      reviewedPromptIds = []
    }

    if (!reviewedPromptIds.includes(currentPrompt.id)) {
      const updatedPromptIds = [...reviewedPromptIds, currentPrompt.id]
      window.localStorage.setItem(
        REVIEWED_PROMPTS_STORAGE_KEY,
        JSON.stringify(updatedPromptIds)
      )
    }
  }, [currentIndex])

  if (currentIndex < 0) {
    return null
  }

  const currentPrompt = PROMPTS[currentIndex]
  const currentText = texts[currentPrompt.id] || ''

  function handleTextChange(value: string) {
    setTexts((prev) => ({ ...prev, [currentPrompt.id]: value }))
    setShowContinueWarning(false)
    setJustSaved(false)
  }

  function goToPrompt(index: number) {
    const prompt = PROMPTS[index]
    if (!prompt) return
    setCurrentIndex(index)
    setShowContinueWarning(false)
    setJustSaved(false)
    router.replace(`/app/reflect/prompts?prompt=${prompt.id}`)
  }

  function goToNext() {
    if (currentIndex < PROMPTS.length - 1) {
      setTexts((prev) => ({ ...prev, [currentPrompt.id]: '' }))
      goToPrompt(currentIndex + 1)
    } else {
      router.push('/app/reflect')
    }
  }

  function goToPrevious() {
    if (currentIndex > 0) {
      setTexts((prev) => ({ ...prev, [currentPrompt.id]: '' }))
      goToPrompt(currentIndex - 1)
    } else {
      router.push('/app/reflect')
    }
  }

  async function handleCapture() {
    const text = currentText
    if (!text.trim()) return

    setSaving(true)
    setShowContinueWarning(false)

    const supabase = createSupabaseBrowserClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      setSaving(false)
      alert('Not logged in')
      return
    }

    const { data: entry, error } = await supabase
      .from('entries')
      .insert({
        title: currentPrompt.label,
        content: text,
        container_id: DEFAULT_CONTAINER_ID,
        user_id: user.id,
        section: 'reflect',
        activity: 'reflection_prompts',
      })
      .select('id')
      .single()

    if (!error && entry) {
      await createPromptNote(text, currentPrompt.label, entry.id)
    }

    setSaving(false)

    if (error) {
      console.error('SAVE ERROR:', JSON.stringify(error, null, 2))
      alert('Error saving')
    } else {
      setTexts((prev) => ({ ...prev, [currentPrompt.id]: '' }))
      setJustSaved(true)
    }
  }

  function handleContinue() {
    if (currentText.trim()) {
      setShowContinueWarning(true)
      return
    }
    goToNext()
  }

  function handleContinueAnyway() {
    setShowContinueWarning(false)
    goToNext()
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-16">
      <button
        onClick={() => router.push('/app/reflect')}
        className="text-[#f8f4eb] hover:text-[#BBABF4] transition-colors mb-12 text-sm"
      >
        ← Back to Reflect
      </button>

      <p className="text-[#f8f4eb] mb-14 text-base leading-relaxed">
        Move through these one at a time. You might write something down, or just think or talk it through. There's no need to capture something for every prompt.
      </p>

      {/* Prompt card — lavender background, featured moment */}
      <div className="bg-[#BBABF4] rounded-2xl px-8 py-10 mb-10">
        <h2 className="text-4xl leading-snug font-bold text-[#130426]">
          {currentPrompt.label}
        </h2>
      </div>

      {/* Input section — cream background, clearly interactive */}
      <div className="bg-[#f8f4eb] rounded-2xl px-8 py-8 mb-10">
        <label className="block text-xs uppercase tracking-widest text-[#130426] mb-4 font-semibold">
          Optional note
        </label>
        <textarea
          value={currentText}
          onChange={(e) => handleTextChange(e.target.value)}
          placeholder="Jot something down if you want to keep a trace of what came up."
          className="w-full h-28 bg-transparent text-[#130426] text-base leading-relaxed placeholder:text-[#2C3777] focus:outline-none resize-none"
        />
      </div>

      {showContinueWarning && (
        <div className="bg-[#2C3777] rounded-2xl px-8 py-6 mb-10">
          <p className="text-[#f8f4eb] mb-5 leading-relaxed">
            You wrote something here. Capture it before continuing if you want to keep it.
          </p>
          <div className="flex items-center gap-4">
            <button
              onClick={handleCapture}
              disabled={saving}
              className="rounded-full bg-[#f29836] text-[#130426] px-6 py-2.5 text-sm font-semibold hover:bg-[#DB5835] transition-colors disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Capture note'}
            </button>
            <button
              onClick={handleContinueAnyway}
              className="text-[#f8f4eb] hover:text-[#BBABF4] transition-colors text-sm"
            >
              Continue anyway
            </button>
          </div>
        </div>
      )}

      {justSaved ? (
        <div className="mb-10">
          <p className="text-[#f8f4eb] mb-6 leading-relaxed">
            Saved to your Materials.{' '}
            <Link
              href="/app/materials"
              className="text-[#BBABF4] underline underline-offset-4 hover:text-[#f29836] transition-colors"
            >
              View in My Materials →
            </Link>
          </p>
          <div className="flex items-center gap-4">
            <button
              onClick={goToNext}
              className="rounded-full bg-[#2C3777] text-[#f8f4eb] px-6 py-2.5 text-sm font-semibold hover:bg-[#BBABF4] hover:text-[#130426] transition-colors"
            >
              Continue
            </button>
            <button
              onClick={goToPrevious}
              className="text-[#f8f4eb] hover:text-[#BBABF4] transition-colors text-sm"
            >
              Back
            </button>
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-4 mb-10">
          <button
            onClick={handleCapture}
            disabled={saving || !currentText.trim()}
            className="rounded-full bg-[#f29836] text-[#130426] px-6 py-2.5 text-sm font-semibold hover:bg-[#DB5835] transition-colors disabled:opacity-40"
          >
            {saving ? 'Saving...' : 'Capture note'}
          </button>

          <button
            onClick={handleContinue}
            className="rounded-full bg-[#2C3777] text-[#f8f4eb] px-6 py-2.5 text-sm font-semibold hover:bg-[#BBABF4] hover:text-[#130426] transition-colors"
          >
            Continue
          </button>

          <button
            onClick={goToPrevious}
            className="ml-auto text-[#f8f4eb] hover:text-[#BBABF4] transition-colors text-sm"
          >
            Back
          </button>
        </div>
      )}
    </div>
  )
}
