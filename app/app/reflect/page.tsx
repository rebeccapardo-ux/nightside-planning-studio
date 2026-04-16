'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'

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

export default function ReflectPage() {
  const [reviewedPromptIds, setReviewedPromptIds] = useState<string[]>([])

  useEffect(() => {
    const stored = window.localStorage.getItem(REVIEWED_PROMPTS_STORAGE_KEY)

    if (!stored) {
      setReviewedPromptIds([])
      return
    }

    try {
      const parsed = JSON.parse(stored)

      if (Array.isArray(parsed)) {
        setReviewedPromptIds(parsed)
      } else {
        setReviewedPromptIds([])
      }
    } catch {
      setReviewedPromptIds([])
    }
  }, [])

  return (
    <div className="min-h-screen bg-[#BBABF4]">
      <div className="max-w-2xl mx-auto px-4 py-16">
        <h1 className="text-h1 text-[#130426] mb-4 underline decoration-[#f29836] decoration-[3px] underline-offset-[8px]">Reflect</h1>

        <p className="text-body text-[#130426] mb-3">
          These prompts are here to help you think, talk, or reflect. You can start anywhere and come back anytime.
        </p>

        <div className="mb-12" />

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {PROMPTS.map((prompt, i) => {
            const isReviewed = reviewedPromptIds.includes(prompt.id)
            // On lavender page: use cream and navy cards (not lavender — it would disappear)
            const isCream = i % 2 === 0
            const bg = isCream ? 'bg-[#f8f4eb]' : 'bg-[#2C3777]'
            const pillClass = isCream
              ? 'bg-[#2C3777] text-[#f8f4eb]'
              : 'bg-[#f8f4eb] text-[#130426]'

            return (
              <Link
                key={prompt.id}
                href={`/app/reflect/prompts?prompt=${prompt.id}`}
                className={`block rounded-2xl px-6 py-8 transition hover:opacity-90 ${bg}`}
                style={{ minHeight: '180px' }}
              >
                <p className={`text-h3 mb-6 ${isCream ? 'text-[#130426]' : 'text-[#f8f4eb]'}`}>
                  {prompt.label}
                </p>
                <span className={`inline-block text-small font-medium rounded-full px-4 py-1.5 ${pillClass}`}>
                  {isReviewed ? 'Explore →' : 'Begin →'}
                </span>
              </Link>
            )
          })}
        </div>
      </div>
    </div>
  )
}