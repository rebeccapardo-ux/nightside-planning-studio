'use client'

import { useEffect, useRef, useMemo, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { createSupabaseBrowserClient } from '@/lib/supabase-browser'
import { createPromptNote } from '@/lib/notes'
import VoiceNoteButton from '@/app/components/VoiceNoteButton'
import type { VoiceNoteSaveMode } from '@/app/components/VoiceNoteButton'

const DEFAULT_CONTAINER_ID = '98bbddf4-bc0c-495f-b3cf-99c65cf7ebc8'
const REVIEWED_PROMPTS_STORAGE_KEY = 'reflect-reviewed-prompts'
const AUTOSAVE_DELAY_MS = 1200

const PROMPTS = [
  { id: 'prompt_1',  label: 'What matters most to you right now?' },
  { id: 'prompt_2',  label: 'What would you want someone making decisions for you to understand?' },
  { id: 'prompt_3',  label: 'What feels unresolved or unclear?' },
  { id: 'prompt_4',  label: 'What was your earliest experience with death? What do you remember about it?' },
  { id: 'prompt_5',  label: 'If you could choose the setting for your final moments, where would you be and who would be with you?' },
  { id: 'prompt_6',  label: 'If you were unable to make decisions for yourself, who would you want to make those decisions, and why?' },
  { id: 'prompt_7',  label: 'What are a few of your favorite rituals or special traditions?' },
  { id: 'prompt_8',  label: 'What do you believe happens when we die? How does this influence your relationship to death?' },
  { id: 'prompt_9',  label: 'How would you want your body to be handled after death, and why?' },
  { id: 'prompt_10', label: 'If you could leave behind a time capsule for future generations of your family, what 3 items would you include and why?' },
  { id: 'prompt_11', label: 'Have you ever witnessed someone have a "good death"? What made it good?' },
  { id: 'prompt_12', label: 'If you could write your own obituary, what key elements would you include?' },
  { id: 'prompt_13', label: "Is there anyone you haven't spoken to in a long time that you would want to talk to before you died?" },
  { id: 'prompt_14', label: 'What is your favorite routine or habit?' },
  { id: 'prompt_15', label: "What is one goal or dream you've been putting off that you would regret not pursuing if you died tomorrow?" },
  { id: 'prompt_16', label: "What's one book, movie, or piece of art that has deeply influenced how you think about life or death?" },
  { id: 'prompt_17', label: "What's one thing you've been holding back from doing or saying that would bring you peace if you acted on it?" },
  { id: 'prompt_18', label: 'If you found out you had a few months left, what would you change about your life?' },
  { id: 'prompt_19', label: 'If you needed help going to the bathroom or bathing, who would you feel most comfortable asking?' },
  { id: 'prompt_20', label: 'What do you worry most about when thinking about your future health and care?' },
  { id: 'prompt_21', label: 'Who do you go to first for advice?' },
  { id: 'prompt_22', label: 'What does a good day look like for you?' },
  { id: 'prompt_23', label: 'What situations do you find stressful or difficult?' },
  { id: 'prompt_24', label: "Reflecting on challenges you've had in the past, what has brought you strength and comfort?" },
  { id: 'prompt_25', label: 'Fill in the blank: I want to live in my body as long as…' },
  { id: 'prompt_26', label: 'What does quality of life mean to you?' },
  { id: 'prompt_27', label: 'Is there anything you would want to be forgiven for before you die?' },
  { id: 'prompt_28', label: 'Is there anyone or anything you would want to forgive before you die?' },
  { id: 'prompt_29', label: 'If you had one year to live, what would you give yourself permission to do?' },
  { id: 'prompt_30', label: 'If you could control one aspect of your death, what would it be?' },
  { id: 'prompt_31', label: 'Who knows the best stories about you?' },
  { id: 'prompt_32', label: 'Who do you trust with your secrets?' },
  { id: 'prompt_33', label: 'What were your childhood experiences of funerals or memorials? What impressions did they leave on you?' },
  { id: 'prompt_34', label: 'What aspect of death or dying have you struggled the most to accept or understand?' },
  { id: 'prompt_35', label: 'What are three things that bring you the most joy in life?' },
  { id: 'prompt_36', label: "Think of a mentor or role model who has passed. What's the most valuable lesson they left you with?" },
  { id: 'prompt_37', label: 'If you could relive one moment in your life, not to change it but to experience it again, what moment would you choose?' },
  { id: 'prompt_38', label: "If you had the chance to write a letter to your younger self about life's most important lessons, what would you include?" },
  { id: 'prompt_39', label: "What's one thing you hope people will always remember about you, no matter how much time has passed?" },
  { id: 'prompt_40', label: 'What rituals or ceremonies—personal, cultural, or religious—are meaningful to you?' },
  { id: 'prompt_41', label: 'If you could choose one personal item to be included in your final resting place, what would it be?' },
  { id: 'prompt_42', label: 'If you could be remembered for one specific contribution to your community, family, or loved ones, what would it be?' },
  { id: 'prompt_43', label: 'You have the opportunity to donate to one cause in your will. What\'s the focus of your legacy gift?' },
]

const fontHelvetica = "'HelveticaNeue-Regular', 'Helvetica Neue', Helvetica, Arial, sans-serif"
const fontHelveticaMedium = "'HelveticaNeue-Medium', 'Helvetica Neue', Helvetica, Arial, sans-serif"
const fontApfelFett = "'ApfelGrotezk-Fett', 'ApfelGrotezk', sans-serif"
const fontApfelRegular = "'ApfelGrotezk-Regular', 'ApfelGrotezk', sans-serif"

type SaveStatus = 'idle' | 'pending' | 'saving' | 'saved'

function ReflectPromptsInner() {
  const searchParams = useSearchParams()
  const router = useRouter()

  const promptFromUrl = searchParams.get('prompt')

  const initialIndex = useMemo(() => {
    if (!promptFromUrl) return -1
    return PROMPTS.findIndex((p) => p.id === promptFromUrl)
  }, [promptFromUrl])

  const [currentIndex, setCurrentIndex] = useState(initialIndex)
  const [texts, setTexts] = useState<Record<string, string>>({})
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle')
  const [inputFocused, setInputFocused] = useState(false)
  const [voiceSaveMode, setVoiceSaveMode] = useState<VoiceNoteSaveMode | null>(null)
  const [preparingVoice, setPreparingVoice] = useState(false)
  const [hasVoiceNote, setHasVoiceNote] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const savedTextRef = useRef<Record<string, string>>({})

  useEffect(() => {
    if (initialIndex < 0) {
      router.replace('/app/reflect')
      return
    }
    setCurrentIndex(initialIndex)
    setSaveStatus('idle')
  }, [initialIndex, router])

  useEffect(() => {
    if (currentIndex < 0) return
    const currentPrompt = PROMPTS[currentIndex]
    if (!currentPrompt) return
    const stored = window.localStorage.getItem(REVIEWED_PROMPTS_STORAGE_KEY)
    let reviewedPromptIds: string[] = []
    try { reviewedPromptIds = stored ? JSON.parse(stored) : [] } catch { reviewedPromptIds = [] }
    if (!reviewedPromptIds.includes(currentPrompt.id)) {
      window.localStorage.setItem(REVIEWED_PROMPTS_STORAGE_KEY, JSON.stringify([...reviewedPromptIds, currentPrompt.id]))
    }
  }, [currentIndex])

  if (currentIndex < 0) return null

  const currentPrompt = PROMPTS[currentIndex]
  const currentText = texts[currentPrompt.id] || ''

  async function createReflectEntry(promptLabel: string, content: string): Promise<{ id: string } | null> {
    const supabase = createSupabaseBrowserClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null
    const { data: entry, error } = await supabase
      .from('entries')
      .insert({ title: promptLabel, content, container_id: DEFAULT_CONTAINER_ID, user_id: user.id, section: 'reflect', activity: 'reflection_prompts' })
      .select('id').single()
    if (error) { console.error('ENTRY SAVE ERROR:', JSON.stringify(error, null, 2)); return null }
    return entry
  }

  async function saveText(promptId: string, text: string, promptLabel: string) {
    if (!text.trim()) return
    if (savedTextRef.current[promptId] === text) return
    setSaveStatus('saving')
    const entry = await createReflectEntry(promptLabel, text)
    if (entry) {
      await createPromptNote(text, promptLabel, entry.id)
      savedTextRef.current[promptId] = text
      setSaveStatus('saved')
    } else {
      setSaveStatus('idle')
    }
  }

  // Returns a VoiceNoteSaveMode for the current prompt.
  // Creates the entry record first so the voice note has the right provenance.
  async function buildVoicePromptSaveMode(): Promise<VoiceNoteSaveMode | null> {
    const entry = await createReflectEntry(currentPrompt.label, '')
    if (!entry) return null
    return { kind: 'prompt', promptContext: currentPrompt.label, entryId: entry.id }
  }

  function handleTextChange(value: string) {
    setTexts((prev) => ({ ...prev, [currentPrompt.id]: value }))
    if (!value.trim()) { setSaveStatus('idle'); return }
    setSaveStatus('pending')
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      saveText(currentPrompt.id, value, currentPrompt.label)
    }, AUTOSAVE_DELAY_MS)
  }

  function goToPrompt(index: number) {
    const prompt = PROMPTS[index]
    if (!prompt) return
    if (debounceRef.current) clearTimeout(debounceRef.current)
    setCurrentIndex(index)
    setSaveStatus('idle')
    setVoiceSaveMode(null)
    setHasVoiceNote(false)
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

  const saveLabel =
    saveStatus === 'pending' || saveStatus === 'saving' ? 'Saving…' :
    saveStatus === 'saved' ? 'Saved' :
    null

  useEffect(() => {
    const elements = document.querySelectorAll('.ns-title-wrap')
    if (!elements.length) return
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('ns-visible')
            observer.unobserve(entry.target)
          }
        })
      },
      { threshold: 0.1 },
    )
    elements.forEach((el) => observer.observe(el))
    return () => observer.disconnect()
  }, [])

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <style>{`
        #reflect-note-input::placeholder { color: rgba(0,0,0,0.4); font-size: 16px; line-height: 24px; }
        .ns-title-wrap {
          opacity: 0;
          transform: translateY(12px);
          transition: opacity 350ms ease-out, transform 350ms ease-out;
        }
        .ns-title-wrap.ns-visible {
          opacity: 1;
          transform: translateY(0);
        }
        .ns-title-underline {
          position: relative;
          display: inline;
        }
        .ns-title-underline::after {
          content: '';
          position: absolute;
          left: 0;
          bottom: -5px;
          width: 100%;
          height: 4px;
          background: #F29836;
          border-radius: 999px;
          transform: scaleX(0);
          transform-origin: left;
          transition: transform 350ms ease-out 100ms;
        }
        .ns-title-wrap.ns-visible .ns-title-underline::after {
          transform: scaleX(1);
        }
      `}</style>

      {/* SECTION 1 — Dark header */}
      <div style={{ backgroundColor: '#130426', padding: '48px 24px 64px' }}>
        <div style={{ maxWidth: '640px', margin: '0 auto' }}>
          <button
            onClick={() => router.push('/app/reflect')}
            style={{ display: 'block', marginBottom: '32px', fontFamily: fontHelvetica, fontSize: '14px', lineHeight: '20px', color: 'rgba(255,255,255,0.75)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
          >
            ← Back to Reflect
          </button>
          <div className="ns-title-wrap">
            <h1 className="ns-title-section" style={{ color: '#FFFFFF' }}>
              <span className="ns-title-underline">Reflect</span>
            </h1>
          </div>
          <p className="ns-lead-section" style={{ color: '#FFFFFF', marginTop: '20px' }}>
            Move through these one at a time. You might write something down, or just think or talk it through. There&apos;s no need to capture something for every prompt.
          </p>
        </div>
      </div>

      {/* SECTION 2 — Cream content section */}
      <div style={{ flex: 1, backgroundColor: '#F8F4EB', padding: '64px 24px 120px' }}>
        <div style={{ maxWidth: '640px', margin: '0 auto' }}>

          {/* Prompt — reading content, dominant */}
          <p style={{ fontFamily: fontHelvetica, fontSize: '18px', lineHeight: '28px', fontWeight: 400, color: '#1A1A1A', margin: 0, maxWidth: '640px' }}>
            {currentPrompt.label}
          </p>

          {/* Input — interface content */}
          <div style={{ marginTop: '32px' }}>
            <textarea
              id="reflect-note-input"
              value={currentText}
              onChange={(e) => handleTextChange(e.target.value)}
              onFocus={() => setInputFocused(true)}
              onBlur={() => setInputFocused(false)}
              placeholder="Write here if you want to capture something…"
              style={{
                display: 'block',
                width: '100%',
                padding: '16px',
                borderRadius: '12px',
                border: inputFocused ? '1px solid #BBABF4' : '1px solid rgba(0,0,0,0.1)',
                background: 'rgba(255,255,255,0.6)',
                color: '#1A1A1A',
                fontFamily: fontHelvetica,
                fontSize: '16px',
                lineHeight: '24px',
                fontWeight: 400,
                resize: 'none',
                outline: 'none',
                minHeight: '120px',
                boxSizing: 'border-box',
              }}
            />
            {/* Helper text + save status */}
            <p style={{ fontFamily: fontHelvetica, fontSize: '14px', lineHeight: '20px', color: 'rgba(0,0,0,0.7)', margin: '10px 0 0 0' }}>
              {saveLabel ? (
                <span>{saveLabel}</span>
              ) : (
                <>
                  Your note is saved automatically.{' '}
                  <Link href="/app/materials" style={{ color: '#1A1A1A', textDecoration: 'underline', textUnderlineOffset: '3px' }}>
                    View in My Materials
                  </Link>
                </>
              )}
            </p>

            {/* Voice note option */}
            <div style={{ marginTop: '20px' }}>
              {voiceSaveMode ? (
                <VoiceNoteButton
                  saveMode={voiceSaveMode}
                  theme="light"
                  autoStart
                  onSaved={() => {
                    setSaveStatus('saved')
                    setHasVoiceNote(true)
                  }}
                  onDelete={() => {
                    setVoiceSaveMode(null)
                    setHasVoiceNote(false)
                  }}
                />
              ) : (
                <button
                  onClick={async () => {
                    setPreparingVoice(true)
                    const mode = await buildVoicePromptSaveMode()
                    setPreparingVoice(false)
                    if (mode) setVoiceSaveMode(mode)
                  }}
                  disabled={preparingVoice}
                  style={{
                    fontFamily: fontHelvetica,
                    fontSize: '13px',
                    color: preparingVoice ? 'rgba(0,0,0,0.4)' : 'rgba(0,0,0,0.72)',
                    background: 'none',
                    border: 'none',
                    cursor: preparingVoice ? 'default' : 'pointer',
                    padding: 0,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '7px',
                  }}
                >
                  {preparingVoice ? 'Preparing…' : (
                    <>
                      <svg width="14" height="18" viewBox="0 0 14 18" fill="none" aria-hidden>
                        <rect x="3" y="0.5" width="8" height="11" rx="4" fill="currentColor" />
                        <path d="M1 9c0 3.31 2.69 6 6 6s6-2.69 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" fill="none" />
                        <line x1="7" y1="15" x2="7" y2="17.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                        <line x1="4" y1="17.5" x2="10" y2="17.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                      </svg>
                      {hasVoiceNote ? 'Record another voice response' : 'Record a voice response instead'}
                    </>
                  )}
                </button>
              )}
            </div>
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '48px' }}>

            {/* Primary: Continue */}
            <button
              onClick={goToNext}
              style={{ background: '#F29836', color: '#130426', padding: '12px 24px', borderRadius: '999px', fontFamily: fontHelveticaMedium, fontSize: '15px', lineHeight: '20px', fontWeight: 500, border: 'none', cursor: 'pointer' }}
            >
              Next
            </button>

            {/* Tertiary: Back */}
            <button
              onClick={goToPrevious}
              style={{ background: 'none', border: 'none', fontFamily: fontHelveticaMedium, fontSize: '15px', lineHeight: '20px', fontWeight: 500, color: '#1A1A1A', cursor: 'pointer', padding: 0 }}
            >
              Back
            </button>

          </div>

        </div>
      </div>

    </div>
  )
}

import { Suspense } from 'react'

export default function ReflectPromptsPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: '100vh', backgroundColor: '#130426' }} />}>
      <ReflectPromptsInner />
    </Suspense>
  )
}
