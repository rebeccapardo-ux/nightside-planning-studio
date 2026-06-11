'use client'

import { useEffect, useRef, useMemo, useState } from 'react'
import { ACTIVITY } from '@/lib/content-metadata'
import { useSearchParams, useRouter } from 'next/navigation'
import { createSupabaseBrowserClient } from '@/lib/supabase-browser'
import { createPromptNote, updateNote } from '@/lib/notes'
import { holdSavingIndicator } from '@/lib/ui'
import VoiceNoteButton from '@/app/components/VoiceNoteButton'
import type { VoiceNoteSaveMode } from '@/app/components/VoiceNoteButton'
import Breadcrumbs from '@/app/components/navigation/Breadcrumbs'
import AutosaveNotice from '@/app/components/AutosaveNotice'

const REVIEWED_PROMPTS_STORAGE_KEY = 'reflect-reviewed-prompts'
const AUTOSAVE_DELAY_MS = 1500

const PROMPTS = [
  { id: 'prompt_1',  label: 'What matters most to you right now?',                                                                                          crumb: 'What matters most' },
  { id: 'prompt_2',  label: 'What would you want someone making decisions for you to understand?',                                                           crumb: 'Guidance for decision-makers' },
  { id: 'prompt_3',  label: 'What feels unresolved or unclear?',                                                                                             crumb: "What's unresolved" },
  { id: 'prompt_4',  label: 'What was your earliest experience with death? What do you remember about it?',                                                  crumb: 'First experience with death' },
  { id: 'prompt_5',  label: 'If you could choose the setting for your final moments, where would you be and who would be with you?',                          crumb: 'Your final moments' },
  { id: 'prompt_6',  label: 'If you were unable to make decisions for yourself, who would you want to make those decisions, and why?',                        crumb: 'Choosing a decision-maker' },
  { id: 'prompt_7',  label: 'What are a few of your favorite special traditions?',                                                                            crumb: 'Favorite traditions' },
  { id: 'prompt_8',  label: 'What do you believe happens when we die? How does this influence your relationship to death?',                                   crumb: 'Beliefs about death' },
  { id: 'prompt_9',  label: 'How would you want your body to be handled after death, and why?',                                                               crumb: 'Wishes for your body' },
  { id: 'prompt_10', label: 'If you could leave behind a time capsule for future generations of your family, what 3 items would you include and why?',        crumb: 'Your time capsule' },
  { id: 'prompt_11', label: 'Have you ever witnessed someone have a "good death"? What made it good?',                                                        crumb: 'Witnessing a good death' },
  { id: 'prompt_12', label: 'If you could write your own obituary, what key elements would you include?',                                                     crumb: 'Your obituary' },
  { id: 'prompt_13', label: "Is there anyone you haven't spoken to in a long time that you would want to talk to before you died?",                           crumb: 'Reconnecting before death' },
  { id: 'prompt_14', label: 'What is your favorite routine or habit?',                                                                                        crumb: 'Favorite routine' },
  { id: 'prompt_15', label: "What is one goal or dream you've been putting off that you would regret not pursuing if you died tomorrow?",                     crumb: 'A deferred dream' },
  { id: 'prompt_16', label: "What's one book, movie, or piece of art that has deeply influenced how you think about life or death?",                          crumb: 'Art that shaped you' },
  { id: 'prompt_17', label: "What's one thing you've been holding back from doing or saying that would bring you peace if you acted on it?",                  crumb: 'Something held back' },
  { id: 'prompt_18', label: 'If you found out you had a few months left, what would you change about your life?',                                             crumb: 'With months to live' },
  { id: 'prompt_19', label: 'If you needed help going to the bathroom or bathing, who would you feel most comfortable asking?',                               crumb: 'Accepting personal care' },
  { id: 'prompt_20', label: 'What do you worry most about when thinking about your future health and care?',                                                   crumb: 'Health care worries' },
  { id: 'prompt_21', label: 'Who do you go to first for advice?',                                                                                             crumb: 'First for advice' },
  { id: 'prompt_22', label: 'What does a good day look like for you?',                                                                                        crumb: 'Your ideal day' },
  { id: 'prompt_23', label: 'What situations do you find stressful or difficult?',                                                                             crumb: 'Stressful situations' },
  { id: 'prompt_24', label: "Reflecting on challenges you've had in the past, what has brought you strength and comfort?",                                    crumb: 'Sources of strength' },
  { id: 'prompt_25', label: 'Fill in the blank: I want to live in my body as long as…',                                                                       crumb: 'Living in your body' },
  { id: 'prompt_26', label: 'What does quality of life mean to you?',                                                                                         crumb: 'Quality of life' },
  { id: 'prompt_27', label: 'Is there anything you would want to be forgiven for before you die?',                                                            crumb: 'Seeking forgiveness' },
  { id: 'prompt_28', label: 'Is there anyone or anything you would want to forgive before you die?',                                                          crumb: 'Offering forgiveness' },
  { id: 'prompt_29', label: 'If you had one year to live, what would you give yourself permission to do?',                                                    crumb: 'Permission to live' },
  { id: 'prompt_30', label: 'If you could control one aspect of your death, what would it be?',                                                               crumb: 'Controlling your death' },
  { id: 'prompt_31', label: 'Who knows the best stories about you?',                                                                                          crumb: 'Keeper of your stories' },
  { id: 'prompt_32', label: 'Who do you trust with your secrets?',                                                                                            crumb: 'Trusted with secrets' },
  { id: 'prompt_33', label: 'What were your childhood experiences of funerals or memorials? What impressions did they leave on you?',                         crumb: 'Childhood funeral memories' },
  { id: 'prompt_34', label: 'What aspect of death or dying have you struggled the most to accept or understand?',                                             crumb: 'Hardest to accept' },
  { id: 'prompt_35', label: 'What are three things that bring you the most joy in life?',                                                                     crumb: 'Sources of joy' },
  { id: 'prompt_36', label: "Think of a mentor or role model who has passed. What's the most valuable lesson they left you with?",                            crumb: "A mentor's lesson" },
  { id: 'prompt_37', label: 'If you could relive one moment in your life, not to change it but to experience it again, what moment would you choose?',        crumb: 'A moment to relive' },
  { id: 'prompt_38', label: "If you had the chance to write a letter to your younger self about life's most important lessons, what would you include?",      crumb: 'Letter to younger self' },
  { id: 'prompt_39', label: "What's one thing you hope people will always remember about you, no matter how much time has passed?",                           crumb: "How you'll be remembered" },
  { id: 'prompt_40', label: 'What rituals or ceremonies—personal, cultural, or religious—are meaningful to you?',                                             crumb: 'Meaningful rituals' },
  { id: 'prompt_41', label: 'If you could choose one personal item to be included in your final resting place, what would it be?',                            crumb: 'Item for your resting place' },
  { id: 'prompt_42', label: 'If you could be remembered for one specific contribution to your community, family, or loved ones, what would it be?',           crumb: 'Your greatest contribution' },
  { id: 'prompt_43', label: "You have the opportunity to donate to one cause in your will. What's the focus of your legacy gift?",                            crumb: 'Your legacy gift' },
]

const fontHelvetica = "'HelveticaNeue-Regular', 'Helvetica Neue', Helvetica, Arial, sans-serif"
const fontHelveticaMedium = "'HelveticaNeue-Medium', 'Helvetica Neue', Helvetica, Arial, sans-serif"

type SaveStatus = 'idle' | 'pending' | 'saving' | 'saved' | 'error'

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
  const savedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const savedEntryIdRef = useRef<string | null>(null)
  const savedNoteIdRef = useRef<string | null>(null)
  const userIdRef = useRef<string | null>(null)

  useEffect(() => {
    fetch('/api/analytics/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ eventName: 'activity_engaged', metadata: { activity: ACTIVITY.REFLECTION_PROMPTS } }),
    }).catch(() => {})
  }, [])

  useEffect(() => {
    if (initialIndex < 0) {
      router.replace('/app/reflect/reflection-prompts')
      return
    }
    setCurrentIndex(initialIndex)
    setSaveStatus('idle')
  }, [initialIndex, router])

  // Load existing entry/note for current prompt — enables upsert on save
  // Also marks the prompt as reviewed (user-scoped) once user is confirmed
  useEffect(() => {
    if (currentIndex < 0) return
    const currentPrompt = PROMPTS[currentIndex]
    if (!currentPrompt) return

    savedEntryIdRef.current = null
    savedNoteIdRef.current = null

    async function loadExisting() {
      const supabase = createSupabaseBrowserClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      userIdRef.current = user.id

      // Mark prompt as reviewed (user-scoped)
      const reviewedKey = `${REVIEWED_PROMPTS_STORAGE_KEY}:${user.id}`
      const stored = window.localStorage.getItem(reviewedKey)
      let reviewedPromptIds: string[] = []
      try { reviewedPromptIds = stored ? JSON.parse(stored) : [] } catch { reviewedPromptIds = [] }
      if (!reviewedPromptIds.includes(currentPrompt.id)) {
        window.localStorage.setItem(reviewedKey, JSON.stringify([...reviewedPromptIds, currentPrompt.id]))
      }

      const { data: existingEntry } = await supabase
        .from('entries')
        .select('id, content')
        .eq('user_id', user.id)
        .eq('activity', ACTIVITY.REFLECTION_PROMPTS)
        .eq('title', currentPrompt.label)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (existingEntry) {
        savedEntryIdRef.current = existingEntry.id
        const existingText = typeof existingEntry.content === 'string' ? existingEntry.content : ''
        if (existingText) {
          setTexts(prev => ({ ...prev, [currentPrompt.id]: existingText }))
        }
      }

      const { data: existingNote } = await supabase
        .from('notes')
        .select('id')
        .eq('user_id', user.id)
        .eq('origin_type', 'prompt')
        .eq('prompt_id', currentPrompt.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (existingNote) {
        savedNoteIdRef.current = existingNote.id
      }
    }

    loadExisting()
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
      .insert({ title: promptLabel, content, user_id: user.id, section: 'reflect', activity: ACTIVITY.REFLECTION_PROMPTS })
      .select('id').single()
    if (error) { console.error('ENTRY SAVE ERROR:', JSON.stringify(error, null, 2)); return null }
    return entry
  }

  async function saveText(promptId: string, text: string, promptLabel: string) {
    if (!text.trim()) return

    const supabase = createSupabaseBrowserClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    setSaveStatus('saving')
    const startedAt = Date.now()

    try {
      if (savedEntryIdRef.current) {
        const { error } = await supabase
          .from('entries')
          .update({ content: text })
          .eq('id', savedEntryIdRef.current)
        if (error) throw error

        if (savedNoteIdRef.current) {
          await updateNote(savedNoteIdRef.current, text)
        }
      } else {
        const entry = await createReflectEntry(promptLabel, text)
        if (!entry) throw new Error('Failed to create entry')
        savedEntryIdRef.current = entry.id

        const note = await createPromptNote(text, promptLabel, entry.id, promptId)
        if (note) savedNoteIdRef.current = note.id
      }

      await holdSavingIndicator(startedAt)
      setSaveStatus('saved')
      if (savedTimerRef.current) clearTimeout(savedTimerRef.current)
      savedTimerRef.current = setTimeout(() => setSaveStatus('idle'), 3000)
    } catch {
      setSaveStatus('error')
    }
  }

  async function buildVoicePromptSaveMode(): Promise<VoiceNoteSaveMode | null> {
    if (savedEntryIdRef.current) {
      return { kind: 'prompt', promptContext: currentPrompt.label, promptId: currentPrompt.id, entryId: savedEntryIdRef.current }
    }
    const entry = await createReflectEntry(currentPrompt.label, '')
    if (!entry) return null
    savedEntryIdRef.current = entry.id
    return { kind: 'prompt', promptContext: currentPrompt.label, promptId: currentPrompt.id, entryId: entry.id }
  }

  function handleTextChange(value: string) {
    setTexts((prev) => ({ ...prev, [currentPrompt.id]: value }))
    if (!value.trim()) { setSaveStatus('idle'); return }
    setSaveStatus('pending')
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      debounceRef.current = null
      saveText(currentPrompt.id, value, currentPrompt.label)
    }, AUTOSAVE_DELAY_MS)
  }

  function goToPrompt(index: number) {
    const prompt = PROMPTS[index]
    if (!prompt) return
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (savedTimerRef.current) clearTimeout(savedTimerRef.current)
    setCurrentIndex(index)
    setSaveStatus('idle')
    setVoiceSaveMode(null)
    setHasVoiceNote(false)
    router.replace(`/app/reflect/prompts?prompt=${prompt.id}`)
  }

  function goToNext() {
    if (currentIndex < PROMPTS.length - 1) {
      goToPrompt(currentIndex + 1)
    } else {
      router.push('/app/reflect/reflection-prompts')
    }
  }

  function goToPrevious() {
    if (currentIndex > 0) {
      goToPrompt(currentIndex - 1)
    } else {
      router.push('/app/reflect/reflection-prompts')
    }
  }

  const saveLabel =
    saveStatus === 'pending' || saveStatus === 'saving' ? 'Saving…' :
    saveStatus === 'saved' ? 'Saved' :
    saveStatus === 'error' ? "Couldn't save" :
    null

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(180deg, #BBABF4 0%, #F8F4EB 100%)' }}>
      <style>{`
        #reflect-note-input::placeholder { color: rgba(19,4,38,0.65); font-size: 15px; line-height: 24px; }
      `}</style>

      {/* Breadcrumb */}
      <div style={{ maxWidth: '448px', margin: '0 auto', padding: '40px 24px 0' }}>
        <Breadcrumbs
          theme="light"
          items={[
            { label: 'Reflect', href: '/app/reflect' },
            { label: 'Reflection Prompts', href: '/app/reflect/reflection-prompts' },
            { label: currentPrompt.crumb },
          ]}
        />
      </div>

      {/* Card */}
      <div style={{ maxWidth: '448px', margin: '20px auto 96px', padding: '0 24px' }}>
        <div style={{ borderRadius: '20px', overflow: 'hidden', boxShadow: '0 8px 40px rgba(0,0,0,0.14)' }}>

          {/* Card top — cream, prompt text */}
          <div style={{ background: '#F8F4EB', padding: '36px 28px 32px' }}>
            <p style={{
              fontFamily: fontHelveticaMedium,
              fontSize: '20px',
              lineHeight: 1.45,
              fontWeight: 500,
              color: '#130426',
              margin: 0,
            }}>
              {currentPrompt.label}
            </p>
          </div>

          {/* Card bottom — navy, note UI */}
          <div style={{ background: '#2C3777', padding: '28px' }}>

            <AutosaveNotice theme="dark" style={{ marginBottom: 12 }} />

            <textarea
              id="reflect-note-input"
              value={currentText}
              onChange={(e) => handleTextChange(e.target.value)}
              onFocus={() => setInputFocused(true)}
              onBlur={() => {
                setInputFocused(false)
                if (debounceRef.current) {
                  clearTimeout(debounceRef.current)
                  debounceRef.current = null
                  const text = texts[currentPrompt.id] || ''
                  if (text.trim()) saveText(currentPrompt.id, text, currentPrompt.label)
                }
              }}
              placeholder="Capture anything that comes up…"
              style={{
                display: 'block',
                width: '100%',
                padding: '12px',
                borderRadius: '10px',
                border: inputFocused ? '1px solid #2C3777' : '1px solid #2C3777',
                background: '#FFFFFF',
                color: '#130426',
                fontFamily: fontHelvetica,
                fontSize: '15px',
                lineHeight: '24px',
                resize: 'none',
                outline: 'none',
                minHeight: '108px',
                boxSizing: 'border-box',
              }}
            />

            {/* Save status */}
            <div style={{ minHeight: '18px', marginTop: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
              {saveStatus === 'saved' && (
                <>
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true" style={{ flexShrink: 0 }}>
                    <circle cx="7" cy="7" r="6" stroke="rgba(255,255,255,0.85)" strokeWidth="1.3" />
                    <path d="M4.5 7L6.2 8.8L9.5 5.5" stroke="rgba(255,255,255,0.85)" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  <span style={{ fontFamily: fontHelvetica, fontSize: '12px', color: 'rgba(255,255,255,0.85)' }}>Saved to Your Plan</span>
                </>
              )}
              {(saveStatus === 'pending' || saveStatus === 'saving') && (
                <span style={{ fontFamily: fontHelvetica, fontSize: '12px', color: 'rgba(255,255,255,0.85)' }}>Saving…</span>
              )}
              {saveStatus === 'error' && (
                <span style={{ fontFamily: fontHelvetica, fontSize: '12px', color: 'rgba(255,255,255,0.85)' }}>Couldn&apos;t save</span>
              )}
            </div>

            {/* Voice note */}
            <div style={{ marginTop: '10px' }}>
              {voiceSaveMode ? (
                <VoiceNoteButton
                  saveMode={voiceSaveMode}
                  theme="dark"
                  autoStart
                  onSaved={() => { setHasVoiceNote(true) }}
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
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    width: '100%',
                    padding: '11px 16px',
                    borderRadius: 10,
                    cursor: preparingVoice ? 'default' : 'pointer',
                    background: 'rgba(255,255,255,0.1)',
                    border: '1.5px solid rgba(255,255,255,0.22)',
                    boxSizing: 'border-box' as const,
                    opacity: preparingVoice ? 0.6 : 1,
                    transition: 'opacity 0.15s ease',
                  }}
                >
                  {preparingVoice ? (
                    <span style={{ fontFamily: fontHelvetica, fontSize: 14, fontWeight: 700, color: '#ffffff' }}>Preparing…</span>
                  ) : (
                    <>
                      <svg width="18" height="18" viewBox="0 0 12 16" fill="none" aria-hidden style={{ flexShrink: 0 }}>
                        <rect x="2.5" y="0.5" width="7" height="9" rx="3.5" fill="rgba(255,255,255,0.9)" />
                        <path d="M0.5 8c0 2.76 2.24 5 5.5 5s5.5-2.24 5.5-5" stroke="rgba(255,255,255,0.9)" strokeWidth="1.5" strokeLinecap="round" fill="none" />
                        <line x1="6" y1="13" x2="6" y2="15.5" stroke="rgba(255,255,255,0.9)" strokeWidth="1.5" strokeLinecap="round" />
                        <line x1="3.5" y1="15.5" x2="8.5" y2="15.5" stroke="rgba(255,255,255,0.9)" strokeWidth="1.5" strokeLinecap="round" />
                      </svg>
                      <span style={{ fontFamily: fontHelvetica, fontSize: 14, fontWeight: 700, color: '#ffffff' }}>Record a voice note</span>
                      <span style={{ fontFamily: fontHelvetica, fontSize: 11, fontWeight: 600, borderRadius: 100, padding: '3px 10px', background: 'rgba(255,255,255,0.15)', color: '#ffffff', border: '1px solid rgba(255,255,255,0.25)' }}>auto-transcribed</span>
                    </>
                  )}
                </button>
              )}
            </div>

            {/* Navigation */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '28px' }}>
              <button
                onClick={goToNext}
                style={{ background: '#F29836', color: '#130426', padding: '11px 22px', borderRadius: '999px', fontFamily: fontHelveticaMedium, fontSize: '14px', lineHeight: '20px', fontWeight: 500, border: 'none', cursor: 'pointer' }}
              >
                Next card →
              </button>
              <button
                onClick={() => router.push('/app/reflect/reflection-prompts')}
                style={{ background: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.82)', padding: '11px 22px', borderRadius: '999px', fontFamily: fontHelveticaMedium, fontSize: '14px', lineHeight: '20px', fontWeight: 500, border: 'none', cursor: 'pointer' }}
              >
                Back to deck
              </button>
            </div>

          </div>
        </div>
      </div>

    </div>
  )
}

import { Suspense } from 'react'

export default function ReflectPromptsPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: '100vh', background: 'linear-gradient(180deg, #BBABF4 0%, #F8F4EB 100%)' }} />}>
      <ReflectPromptsInner />
    </Suspense>
  )
}
