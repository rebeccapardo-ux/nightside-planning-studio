'use client'

import { useEffect, useState } from 'react'
import { ACTIVITY } from '@/lib/content-metadata'
import { createSupabaseBrowserClient } from '@/lib/supabase-browser'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type FragmentType = 'value' | 'care_specific'

type Fragment = {
  text: string
  type: FragmentType
}

// ---------------------------------------------------------------------------
// Domain eligibility matrix
// ---------------------------------------------------------------------------

function getDomainAllowedTypes(domainTitle: string): FragmentType[] {
  const lower = domainTitle.toLowerCase()
  if (lower.includes('healthcare') || lower.includes('deathcare')) {
    return ['value', 'care_specific']
  }
  // wills, legacy, personal admin, all others
  return ['value']
}

// ---------------------------------------------------------------------------
// Source D — reflect prompt notes, domain-specific allowed lists.
// Keyed by stable REFLECT_PROMPT_META id (prompt_N), matched against notes.prompt_id.
// ---------------------------------------------------------------------------

const DOMAIN_FRAGMENT_PROMPT_IDS: Record<string, string[]> = {
  legacy: [
    'prompt_1', 'prompt_7', 'prompt_10', 'prompt_12', 'prompt_35', 'prompt_36',
    'prompt_37', 'prompt_38', 'prompt_39', 'prompt_40', 'prompt_42', 'prompt_43',
  ],
  deathcare: [
    'prompt_1', 'prompt_5', 'prompt_7', 'prompt_11', 'prompt_39', 'prompt_40', 'prompt_41',
  ],
}

function getDomainKeyForFragments(domainTitle: string): string | null {
  const lower = domainTitle.toLowerCase()
  if (lower.includes('legacy')) return 'legacy'
  if (lower.includes('deathcare') || lower.includes('death care')) return 'deathcare'
  return null
}

// ---------------------------------------------------------------------------
// Suitability filter
// ---------------------------------------------------------------------------

const FORBIDDEN_WORDS = [
  'fear', 'afraid', 'terrified', 'panic', 'burden',
  'suffer', 'suffering', 'pain', 'dying alone', 'trauma',
  'scared', 'worried', 'anxious', 'conflict', 'unclear', 'unresolved',
]

function wordCount(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length
}

function hasMultipleClauses(text: string): boolean {
  if (wordCount(text) <= 5) return false
  return /\b(and|but|because)\b/i.test(text)
}

function isSuitable(text: string): boolean {
  if (!text || text.trim().length === 0) return false
  if (wordCount(text) > 10) return false
  if (wordCount(text) < 2) return false
  if (text.includes('?')) return false
  const lower = text.toLowerCase()
  for (const w of FORBIDDEN_WORDS) {
    if (lower.includes(w)) return false
  }
  if (hasMultipleClauses(text)) return false
  return true
}

// ---------------------------------------------------------------------------
// Normalization
// ---------------------------------------------------------------------------

function normalize(text: string): string {
  let t = text.trim()
  t = t.replace(/\s+/g, ' ')
  t = t.replace(/^["'"'\u2018\u2019\u201C\u201D]|["'"'\u2018\u2019\u201C\u201D]$/g, '')
  t = t.replace(/\.$/, '')
  return t.trim()
}

// ---------------------------------------------------------------------------
// Source B extraction
// ---------------------------------------------------------------------------

const FILLER_PREFIXES: RegExp[] = [
  /^I think[,\s]*/i,
  /^I guess[,\s]*/i,
  /^maybe[,\s]*/i,
  /^for me[,\s]*/i,
  /^right now[,\s]*/i,
  /^that[,\s]*/i,
]

function extractReflectPhrase(raw: string): string | null {
  if (!raw || !raw.trim()) return null
  // Take first sentence
  let text = raw.trim().split(/[.!?]/)[0].trim()
  // Strip filler prefixes
  for (const rx of FILLER_PREFIXES) {
    text = text.replace(rx, '').trim()
  }
  if (!text) return null
  // Enforce 10-word limit
  const words = text.split(/\s+/)
  if (words.length > 10) text = words.slice(0, 10).join(' ')
  return text.trim() || null
}

// ---------------------------------------------------------------------------
// Fragment type assignment
// ---------------------------------------------------------------------------

const CARE_KEYWORDS = [
  'home', 'caregiver', 'hospital', 'toilet', 'pain', 'medical',
  'treatment', 'machine', 'life support', 'bed', 'comfort', 'calm', 'body',
]

function assignType(text: string, source: 'A' | 'B' | 'C'): FragmentType {
  if (source === 'A') return 'value'
  if (source === 'C') return 'care_specific'
  const lower = text.toLowerCase()
  for (const kw of CARE_KEYWORDS) {
    if (lower.includes(kw)) return 'care_specific'
  }
  return 'value'
}


// ---------------------------------------------------------------------------
// Data fetching + fragment extraction
// ---------------------------------------------------------------------------

type RawEntry = {
  id: string
  title: string | null
  content: Record<string, unknown> | string | null
  activity: string | null
  document_type: string | null
}

async function buildFragments(domainTitle: string): Promise<Fragment[]> {
  const supabase = createSupabaseBrowserClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const allowedTypes = getDomainAllowedTypes(domainTitle)
  const results: Fragment[] = []
  const seen = new Set<string>()

  function addCandidate(raw: string, source: 'A' | 'B' | 'C') {
    const text = normalize(raw)
    if (!text || !isSuitable(text) || seen.has(text.toLowerCase())) return
    const type = assignType(text, source)
    if (!allowedTypes.includes(type)) return
    seen.add(text.toLowerCase())
    results.push({ text, type })
  }

  // Source D — reflect prompt notes for this domain
  const domainKey = getDomainKeyForFragments(domainTitle)
  const allowedPromptIds = domainKey ? (DOMAIN_FRAGMENT_PROMPT_IDS[domainKey] ?? []) : []

  // Fetch all sources in parallel (Source D only runs when domain has allowed prompts)
  const [valuesRes, reflectRes, adRes, promptNotesRes] = await Promise.all([
    supabase
      .from('entries')
      .select('id, title, content, activity, document_type')
      .eq('user_id', user.id)
      .eq('activity', ACTIVITY.VALUES_RANKING),
    supabase
      .from('entries')
      .select('id, title, content, activity, document_type')
      .eq('user_id', user.id)
      .eq('activity', ACTIVITY.REFLECTION_PROMPTS),
    supabase
      .from('entries')
      .select('id, title, content, activity, document_type')
      .eq('user_id', user.id)
      .eq('document_type', 'advance_directive_supplement'),
    allowedPromptIds.length > 0
      ? supabase
          .from('notes')
          .select('id, content, prompt_id')
          .eq('user_id', user.id)
          .eq('origin_type', 'prompt')
          .in('prompt_id', allowedPromptIds)
      : Promise.resolve({ data: null, error: null }),
  ])

  // SOURCE A — Values Ranking: top row only (essential)
  for (const entry of (valuesRes.data ?? []) as RawEntry[]) {
    const c = entry.content
    if (!c || typeof c !== 'object' || Array.isArray(c)) continue
    const essential = (c as Record<string, unknown>).essential
    if (!Array.isArray(essential)) continue
    for (const item of essential) {
      if (typeof item === 'string' && item.trim()) {
        addCandidate(item, 'A')
      }
    }
  }

  // SOURCE B — Reflect: only "What matters most to you right now"
  for (const entry of (reflectRes.data ?? []) as RawEntry[]) {
    const title = (entry.title ?? '').toLowerCase()
    if (!title.includes('matters') || !title.includes('most')) continue
    const content = typeof entry.content === 'string' ? entry.content : null
    if (!content || !content.trim()) continue
    const phrase = extractReflectPhrase(content)
    if (phrase) addCandidate(phrase, 'B')
  }

  // SOURCE C — Advance Directive: three eligible fields only
  const AD_FIELDS = ['perfectDeath', 'whatMatters', 'values'] as const
  for (const entry of (adRes.data ?? []) as RawEntry[]) {
    const c = entry.content
    if (!c || typeof c !== 'object' || Array.isArray(c)) continue
    const obj = c as Record<string, unknown>
    for (const field of AD_FIELDS) {
      const val = obj[field]
      if (typeof val !== 'string' || !val.trim()) continue
      // Extract first clause up to 10 words
      let phrase = val.trim().split(/[.!?]/)[0].trim()
      const words = phrase.split(/\s+/)
      if (words.length > 10) phrase = words.slice(0, 10).join(' ')
      if (phrase) addCandidate(phrase, 'C')
    }
  }

  // SOURCE D — Reflect prompt notes: filtered by prompt_id, domain-specific list
  for (const note of ((promptNotesRes.data ?? []) as { id: string; content: string; prompt_id: string | null }[])) {
    if (typeof note.content === 'string' && note.content.trim()) {
      const phrase = extractReflectPhrase(note.content)
      if (phrase) addCandidate(phrase, 'B')
    }
  }

  return results.slice(0, 8)
}

// ---------------------------------------------------------------------------
// Rendering — State 1: 1-2 fragments (pulse)
// ---------------------------------------------------------------------------

function State1({ fragments }: { fragments: Fragment[] }) {
  return (
    <>
      <style>{`
        @keyframes ff-pulse {
          0%, 100% { opacity: 0.72; }
          50% { opacity: 0.9; }
        }
      `}</style>
      <div style={{
        maxWidth: '900px',
        lineHeight: 1.8,
        textAlign: 'left',
        animation: 'ff-pulse 8s ease-in-out infinite',
      }}>
        {fragments.map((f, i) => (
          <>
            {i > 0 && (
              <span key={`sep-${i}`} style={{
                display: 'inline-block',
                marginLeft: '8px',
                marginRight: '8px',
                fontSize: '0.7em',
                color: '#f29836',
                opacity: 0.6,
                transform: 'translateY(-1px)',
              }}>✱</span>
            )}
            <span key={f.text} style={{
              display: 'inline-block',
              fontSize: '28px',
              fontWeight: 400,
              letterSpacing: '-0.01em',
              color: 'rgba(255,255,255,1)',
              opacity: 0.85,
              marginRight: 0,
              marginBottom: '10px',
              padding: '4px 6px',
            }}>
              {f.text}
            </span>
          </>
        ))}
      </div>
    </>
  )
}

// ---------------------------------------------------------------------------
// Rendering — State 2: 3-4 fragments (rotating pair)
// ---------------------------------------------------------------------------

function State2({ fragments }: { fragments: Fragment[] }) {
  const [idx, setIdx] = useState(0)
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    const timer = setInterval(() => {
      setVisible(false)
      setTimeout(() => {
        setIdx((prev) => (prev + 2) % fragments.length)
        setVisible(true)
      }, 400)
    }, 7000)
    return () => clearInterval(timer)
  }, [fragments.length])

  const shown = [
    fragments[idx % fragments.length],
    fragments[(idx + 1) % fragments.length],
  ]

  return (
    <>
      <style>{`
        @keyframes ff-fadein { from { opacity: 0; } to { opacity: 1; } }
        @keyframes ff-fadeout { from { opacity: 1; } to { opacity: 0; } }
      `}</style>
      <div style={{
        maxWidth: '900px',
        lineHeight: 1.8,
        textAlign: 'left',
        transition: 'opacity 400ms ease-out',
        opacity: visible ? 1 : 0,
      }}>
        {shown.map((f, i) => (
          <>
            {i > 0 && (
              <span key={`sep-${i}`} style={{
                display: 'inline-block',
                marginLeft: '8px',
                marginRight: '8px',
                fontSize: '0.7em',
                color: '#f29836',
                opacity: 0.6,
                transform: 'translateY(-1px)',
              }}>✱</span>
            )}
            <span key={f.text} style={{
              display: 'inline-block',
              fontSize: '28px',
              fontWeight: 400,
              letterSpacing: '-0.01em',
              color: 'rgba(255,255,255,1)',
              opacity: 0.85,
              marginRight: 0,
              marginBottom: '10px',
              padding: '4px 6px',
            }}>
              {f.text}
            </span>
          </>
        ))}
      </div>
    </>
  )
}

// ---------------------------------------------------------------------------
// Rendering — State 3: 5-8 fragments (marquee)
// ---------------------------------------------------------------------------

function State3({ fragments }: { fragments: Fragment[] }) {
  function makeRowContent(frags: Fragment[]) {
    const items: React.ReactNode[] = []
    frags.forEach((f, i) => {
      if (i > 0) {
        items.push(
          <span key={`sep-${f.text}`} style={{
            display: 'inline-block',
            flexShrink: 0,
            marginLeft: '8px',
            marginRight: '8px',
            fontSize: '0.7em',
            color: '#f29836',
            opacity: 0.6,
            transform: 'translateY(-1px)',
          }}>✱</span>
        )
      }
      items.push(
        <span key={f.text} style={{
          display: 'inline-block',
          flexShrink: 0,
          opacity: 0.85,
          marginRight: 0,
          padding: '4px 6px',
        }}>
          {f.text}
        </span>
      )
    })
    return items
  }

  const rowContent = makeRowContent(fragments)

  return (
    <>
      <style>{`
        @keyframes ff-scroll-left {
          0%   { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        @keyframes ff-scroll-right {
          0%   { transform: translateX(-50%); }
          100% { transform: translateX(0); }
        }
      `}</style>
      <div style={{
        maxWidth: '1280px',
        marginLeft: 'auto',
        marginRight: 'auto',
        paddingLeft: '64px',
        paddingRight: '64px',
        overflow: 'hidden',
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

          {/* Row 1 — left */}
          <div style={{ overflow: 'hidden' }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0',
              whiteSpace: 'nowrap',
              width: 'max-content',
              animation: 'ff-scroll-left 56s linear infinite',
              fontSize: '26px',
              fontWeight: 400,
              lineHeight: 1.3,
              letterSpacing: '-0.01em',
              color: 'rgba(255,255,255,0.78)',
            }}>
              {/* Duplicated for seamless loop */}
              <span style={{ display: 'inline-flex', alignItems: 'center' }}>{rowContent}</span>
              <span style={{ display: 'inline-flex', alignItems: 'center' }}>{rowContent}</span>
            </div>
          </div>

          {/* Row 2 — right */}
          <div style={{ overflow: 'hidden' }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0',
              whiteSpace: 'nowrap',
              width: 'max-content',
              animation: 'ff-scroll-right 56s linear infinite',
              fontSize: '26px',
              fontWeight: 400,
              lineHeight: 1.3,
              letterSpacing: '-0.01em',
              color: 'rgba(255,255,255,0.78)',
            }}>
              <span style={{ display: 'inline-flex', alignItems: 'center' }}>{rowContent}</span>
              <span style={{ display: 'inline-flex', alignItems: 'center' }}>{rowContent}</span>
            </div>
          </div>

        </div>
      </div>
    </>
  )
}

// ---------------------------------------------------------------------------
// Main FragmentField component
// ---------------------------------------------------------------------------

export default function FragmentField({
  domainId,
  domainTitle,
  backgroundMode = false,
  minFragments = 1,
}: {
  domainId: string
  domainTitle: string
  backgroundMode?: boolean
  minFragments?: number
}) {
  const [fragments, setFragments] = useState<Fragment[] | null>(null)

  useEffect(() => {
    buildFragments(domainTitle).then(setFragments)
  }, [domainId, domainTitle])  // eslint-disable-line react-hooks/exhaustive-deps

  if (fragments === null || fragments.length === 0) return null

  // Background mode — single gently curved SVG textPath behind the header title
  if (backgroundMode) {
    // Respect minimum fragment threshold — render nothing if not enough content
    if (fragments.length < minFragments) return null

    // Wide separator so each phrase reads as distinct (≥24px space each side at 18px)
    const separator = '      ·      '
    const unit = fragments.map(f => f.text).join(separator) + separator
    const longContent = unit.repeat(20)

    return (
      <svg
        aria-hidden="true"
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          pointerEvents: 'none',
          overflow: 'hidden',
          zIndex: 0,
        }}
        // No viewBox — coordinates are CSS pixels, so font renders at natural proportions
      >
        <defs>
          {/*
            Path in actual CSS pixels (no viewBox = no scale distortion).
            Header is ~252px tall (56px top + ~100px content + 96px bottom padding).
            Title occupies top ~155px. Path sits in y=170–200 — clearly below the title.
            Bottom clearance: 252-200 = 52px > 40px minimum.
            x range covers -600 to 1800 (beyond any typical viewport width).
          */}
          <path
            id="hc-path1"
            d="M -600,110 S -200,140 0,140 S 400,110 600,110 S 1000,140 1200,140 S 1600,110 1800,110"
          />
        </defs>

        <text
          fill="#F29836"
          fillOpacity="1"
          fontSize="18"
          fontFamily="'Helvetica Neue', Helvetica, Arial, sans-serif"
          fontWeight="400"
        >
          <textPath href="#hc-path1">
            {longContent}
            <animate
              attributeName="startOffset"
              from="0"
              to="-1800"
              dur="30s"
              repeatCount="indefinite"
            />
          </textPath>
        </text>
      </svg>
    )
  }

  const count = fragments.length

  return (
    <div style={{ paddingLeft: count >= 5 ? 0 : '24px', paddingRight: count >= 5 ? 0 : '24px', paddingBottom: '4px' }}>
      {count <= 2 && <State1 fragments={fragments} />}
      {count >= 3 && count <= 4 && <State2 fragments={fragments} />}
      {count >= 5 && <State3 fragments={fragments} />}
    </div>
  )
}
