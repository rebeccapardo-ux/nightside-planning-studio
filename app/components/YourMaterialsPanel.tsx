'use client'

import { useEffect, useState } from 'react'
import { DOCUMENT_TYPE_META, DOCUMENT_TYPES, entryExportHref } from '@/lib/content-metadata'
import Link from 'next/link'
import PlanNotesGridComp from '@/app/components/PlanNotesGrid'
import type { Container } from '@/lib/notes'

const hv  = "'Helvetica Neue', Helvetica, Arial, sans-serif"

type InProgressDoc  = { type: string; label: string; href: string; entryId: string }
type NotStartedDoc  = { type: string; label: string; href: string }
type InProgressAct  = { activity: string; label: string; href: string; entryId: string }
type NotStartedAct  = { activity: string; label: string; href: string }
type NoteRow = {
  id: string
  content: string | null
  origin_type: string | null
  prompt_context: string | null
  note_mode: string | null
  transcript: string | null
  audio_url?: string | null
  duration_seconds?: number | null
  transcription_status?: 'pending' | 'complete' | 'failed' | null
}

// Icons take a `size`/`color` so the same glyph reads as a weighty section
// identifier (~36px) in a header and as a card marker (~22px) inside an item.
function DocIcon({ size = 16, color = '#2C3777' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0 }}>
      <path d="M3 2.5A1.5 1.5 0 0 1 4.5 1H10l3 3v9A1.5 1.5 0 0 1 11.5 14.5h-7A1.5 1.5 0 0 1 3 13V2.5z" stroke={color} strokeWidth="1.25" strokeLinejoin="round" fill="none"/>
      <path d="M10 1v3h3" stroke={color} strokeWidth="1.25" strokeLinejoin="round" fill="none"/>
      <path d="M5.5 7.5h5M5.5 10h5" stroke={color} strokeWidth="1.25" strokeLinecap="round"/>
    </svg>
  )
}

function ActivityOutputIcon({ size = 16, color = '#2C3777' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0 }}>
      <rect x="2" y="2.5" width="12" height="11" rx="1" stroke={color} strokeWidth="1.25" strokeLinejoin="round"/>
      <circle cx="5.5" cy="7" r="1.5" fill={color}/>
      <circle cx="8.5" cy="9.5" r="1.5" fill={color}/>
      <circle cx="11" cy="5.5" r="1.5" fill={color}/>
    </svg>
  )
}

// Clipboard-style note glyph (matches the NoteIcon used in the wishes docs).
function NoteIcon({ size = 16, color = '#2C3777' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0 }}>
      <rect x="2" y="4" width="12" height="11" rx="2" stroke={color} strokeWidth="1.3"/>
      <circle cx="8" cy="4" r="2.5" fill={color}/>
    </svg>
  )
}

function Chevron({ open }: { open: boolean }) {
  return (
    <svg width={26} height={26} viewBox="0 0 20 20" fill="none"
      style={{ flexShrink: 0, transition: 'transform 200ms ease', transform: open ? 'rotate(180deg)' : 'rotate(0deg)' }}>
      <path d="M5 7.5l5 5 5-5" stroke="#130426" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

const WISHES_TYPES = new Set<string>(DOCUMENT_TYPES.filter(c => DOCUMENT_TYPE_META[c].category === 'wishes'))

// One combined object of per-section collapsed flags; a missing key = expanded
// (the default — Your Materials is a library, users expect to see their stuff).
const COLLAPSE_KEY = 'nightside.materialsCollapsed'

export default function YourMaterialsPanel({
  inProgressDocs,
  notStartedDocs,
  inProgressActivities,
  notStartedActivities,
  allNotes,
  allDomains,
  userId,
}: {
  inProgressDocs: InProgressDoc[]
  notStartedDocs: NotStartedDoc[]
  inProgressActivities: InProgressAct[]
  notStartedActivities: NotStartedAct[]
  allNotes: NoteRow[]
  allDomains: Container[]
  userId: string
}) {
  const [showTooltip, setShowTooltip] = useState(false)
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>(() => {
    if (typeof window === 'undefined') return {}
    try { return JSON.parse(localStorage.getItem(COLLAPSE_KEY) || '{}') as Record<string, boolean> } catch { return {} }
  })

  useEffect(() => {
    if (!userId || allNotes.length > 0) return
    const key = `nightside.tooltip.notesIntro:${userId}`
    if (localStorage.getItem(key) !== 'dismissed') setShowTooltip(true)
  }, [userId]) // eslint-disable-line react-hooks/exhaustive-deps

  function dismissTooltip() {
    if (userId) localStorage.setItem(`nightside.tooltip.notesIntro:${userId}`, 'dismissed')
    setShowTooltip(false)
  }

  function toggleSection(key: string) {
    setCollapsed((prev) => {
      const next = { ...prev, [key]: !prev[key] }
      try { localStorage.setItem(COLLAPSE_KEY, JSON.stringify(next)) } catch { /* private mode */ }
      return next
    })
  }

  const inProgressWishes    = inProgressDocs.filter(d => WISHES_TYPES.has(d.type))
  const notStartedWishes    = notStartedDocs.filter(d => WISHES_TYPES.has(d.type))
  const inProgressPractical = inProgressDocs.filter(d => !WISHES_TYPES.has(d.type))
  const notStartedPractical = notStartedDocs.filter(d => !WISHES_TYPES.has(d.type))

  // ── Shared styles ──────────────────────────────────────────────────────────
  const columnHeader: React.CSSProperties = {
    fontFamily: hv, fontSize: 14, fontWeight: 700, color: '#130426',
    textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 16, marginTop: 0,
  }
  // Library-feel item card: generous padding, white on the lavender section.
  const itemCard: React.CSSProperties = {
    position: 'relative', width: '100%', background: '#ffffff',
    border: '1px solid rgba(19,4,38,0.1)', borderRadius: 18, padding: '18px 20px',
    display: 'flex', flexDirection: 'column', alignItems: 'flex-start',
    gap: 16, transition: 'background 150ms ease', boxSizing: 'border-box',
  }
  const cardTitle: React.CSSProperties = {
    fontFamily: hv, fontSize: 16, fontWeight: 600, color: '#1A1A1A',
    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
  }
  // Filled navy pill — the action reads clearly (replaces the old outlined chip).
  const navyPill: React.CSSProperties = {
    fontFamily: hv, fontSize: 14, fontWeight: 600, color: '#F8F4EB', background: '#2C3777',
    borderRadius: 999, padding: '9px 18px', textDecoration: 'none', display: 'inline-block', whiteSpace: 'nowrap',
  }
  const exportLink: React.CSSProperties = {
    fontFamily: hv, fontSize: 14, fontWeight: 500, color: '#2C3777', textDecoration: 'none', whiteSpace: 'nowrap',
  }
  const emptyText: React.CSSProperties = { fontFamily: hv, fontSize: 13, color: 'rgba(19,4,38,0.7)', margin: 0 }

  // ── Item-card renderers (plain functions → no remount) ──────────────────────
  function renderDocCard(doc: InProgressDoc | NotStartedDoc, inProgress: boolean) {
    return (
      <div key={doc.type} className="plan-pill-doc" style={itemCard}>
        <Link href={doc.href} style={{ position: 'absolute', inset: 0, borderRadius: 'inherit' }} aria-hidden="true" tabIndex={-1} />
        <div style={{ position: 'relative', zIndex: 1, display: 'flex', alignItems: 'center', gap: 12 }}>
          <DocIcon size={22} />
          <span style={cardTitle}>{doc.label}</span>
        </div>
        <div style={{ position: 'relative', zIndex: 1, display: 'flex', alignItems: 'center', gap: 18 }}>
          <Link href={doc.href} className="plan-primary-btn" style={navyPill}>{inProgress ? 'Continue' : 'Start'}</Link>
          {inProgress && (
            <Link href={entryExportHref((doc as InProgressDoc).entryId, doc.type)} className="plan-export-link" style={exportLink}>Export</Link>
          )}
        </div>
      </div>
    )
  }

  function renderActivityCard(act: InProgressAct | NotStartedAct, inProgress: boolean) {
    return (
      <div key={act.activity} className="plan-pill-out" style={itemCard}>
        <Link href={act.href} style={{ position: 'absolute', inset: 0, borderRadius: 'inherit' }} aria-hidden="true" tabIndex={-1} />
        <div style={{ position: 'relative', zIndex: 1, display: 'flex', alignItems: 'center', gap: 12 }}>
          <ActivityOutputIcon size={22} />
          <span style={cardTitle}>{act.label}</span>
        </div>
        <div style={{ position: 'relative', zIndex: 1, display: 'flex', alignItems: 'center', gap: 18 }}>
          <Link href={act.href} className="plan-primary-btn" style={navyPill}>{inProgress ? 'Continue' : 'Start'}</Link>
          {inProgress && (
            <Link href={`/app/entries/${(act as InProgressAct).entryId}/export`} className="plan-export-link" style={exportLink}>Export</Link>
          )}
        </div>
      </div>
    )
  }

  // In Progress | Not Started two-column split (shared by doc + activity sections).
  function statusColumns(
    inProg: React.ReactNode[], notStarted: React.ReactNode[],
    inProgEmpty: string, notStartedEmpty: string,
  ) {
    return (
      <div className="ym-status-cols" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 40 }}>
        <div style={{ paddingRight: 10 }}>
          <p style={columnHeader}>In progress</p>
          {inProg.length > 0
            ? <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>{inProg}</div>
            : <p style={emptyText}>{inProgEmpty}</p>}
        </div>
        <div style={{ paddingRight: 10 }}>
          <p style={columnHeader}>Not started</p>
          {notStarted.length > 0
            ? <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>{notStarted}</div>
            : <p style={emptyText}>{notStartedEmpty}</p>}
        </div>
      </div>
    )
  }

  // ── Collapsible section card ────────────────────────────────────────────────
  function section(id: string, icon: React.ReactNode, title: string, summary: string, body: React.ReactNode, isLast = false) {
    const isCollapsed = collapsed[id] === true
    return (
      <div key={id} className="ym-section" style={{ background: '#BBABF4', borderRadius: 20, padding: '24px 28px', marginBottom: isLast ? 0 : 18 }}>
        <button
          type="button"
          className="ym-section-header"
          onClick={() => toggleSection(id)}
          aria-expanded={!isCollapsed}
          style={{ display: 'flex', width: '100%', alignItems: 'center', gap: 14, background: 'none', border: 'none', cursor: 'pointer', padding: 0, textAlign: 'left' }}
        >
          {icon}
          <h2 style={{ fontFamily: hv, fontSize: 24, fontWeight: 600, color: '#130426', margin: 0, flex: 1, lineHeight: 1.15 }}>{title}</h2>
          <span className="ym-chevron"><Chevron open={!isCollapsed} /></span>
        </button>
        {isCollapsed
          ? <p style={{ fontFamily: hv, fontSize: 14, color: 'rgba(19,4,38,0.7)', margin: '10px 0 0', paddingLeft: 50 }}>{summary}</p>
          : <div style={{ marginTop: 22 }}>{body}</div>}
      </div>
    )
  }

  const docCount = (a: unknown[], b: unknown[]) => `${a.length} in progress, ${b.length} not started`

  return (
    <div>
      <style>{`
        .plan-pill-doc:hover  { background: #f7f6fc !important; }
        .plan-pill-out:hover  { background: #f7f6fc !important; }
        .plan-primary-btn:hover { background: #1f2a5e !important; }
        .plan-export-link:hover { text-decoration: underline !important; }
        .ym-section-header:hover .ym-chevron { opacity: 0.65; }
        @media (max-width: 767px) {
          .ym-section { padding: 20px 18px !important; }
          .ym-status-cols {
            grid-template-columns: 1fr !important;
            gap: 24px !important;
          }
          /* Keep cards inside the panel; let long titles wrap next to the icon
             and actions stack rather than overflow. */
          .plan-pill-doc,
          .plan-pill-out {
            max-width: 100% !important;
            overflow: hidden !important;
          }
          .plan-pill-doc > div,
          .plan-pill-out > div {
            max-width: 100%;
            min-width: 0;
            flex-wrap: wrap;
          }
          .plan-pill-doc > div:nth-child(2),
          .plan-pill-out > div:nth-child(2) {
            flex-wrap: nowrap !important;
            align-items: flex-start !important;
          }
          .plan-pill-doc > div:nth-child(2) > span,
          .plan-pill-out > div:nth-child(2) > span {
            white-space: normal !important;
            overflow: visible !important;
            text-overflow: clip !important;
          }
        }
      `}</style>

      {/* 1 · Wishes documents */}
      {section(
        'wishes',
        <DocIcon size={36} />,
        'Wishes documents',
        docCount(inProgressWishes, notStartedWishes),
        <>
          <p style={{ fontFamily: hv, fontSize: 15, fontWeight: 400, color: 'rgba(19,4,38,0.7)', maxWidth: 560, marginBottom: 28, marginTop: 0, lineHeight: 1.55 }}>
            Documents to help synthesize your values, priorities, and preferences; recommended to fill in after exploring the{' '}
            <Link href="/app/reflect" style={{ color: 'rgba(19,4,38,0.7)', textDecoration: 'underline' }}>Reflect</Link>{' '}
            and{' '}
            <Link href="/app/learn" style={{ color: 'rgba(19,4,38,0.7)', textDecoration: 'underline' }}>Learn</Link>{' '}
            sections.
          </p>
          {statusColumns(
            inProgressWishes.map((d) => renderDocCard(d, true)),
            notStartedWishes.map((d) => renderDocCard(d, false)),
            'None yet', 'All started',
          )}
        </>,
      )}

      {/* 2 · Practical documents */}
      {section(
        'practical',
        <DocIcon size={36} />,
        'Practical documents',
        docCount(inProgressPractical, notStartedPractical),
        <>
          <p style={{ fontFamily: hv, fontSize: 15, fontWeight: 400, color: 'rgba(19,4,38,0.7)', maxWidth: 520, marginBottom: 28, marginTop: 0, lineHeight: 1.55 }}>
            Templates for practical information; fill them in at any time.
          </p>
          {statusColumns(
            inProgressPractical.map((d) => renderDocCard(d, true)),
            notStartedPractical.map((d) => renderDocCard(d, false)),
            'None yet', 'All started',
          )}
        </>,
      )}

      {/* 3 · Activity outputs */}
      {section(
        'activity',
        <ActivityOutputIcon size={36} />,
        'Activity outputs',
        docCount(inProgressActivities, notStartedActivities),
        statusColumns(
          inProgressActivities.map((a) => renderActivityCard(a, true)),
          notStartedActivities.map((a) => renderActivityCard(a, false)),
          'None yet', 'All started',
        ),
      )}

      {/* 4 · Notes */}
      {section(
        'notes',
        <NoteIcon size={36} />,
        'Notes',
        `${allNotes.length} total`,
        allNotes.length > 0 ? (
          <PlanNotesGridComp notes={allNotes} allDomains={allDomains} />
        ) : (
          <div style={{ position: 'relative' }}>
            <p style={{ fontFamily: hv, fontSize: 13, color: 'rgba(19,4,38,0.7)', margin: 0, textAlign: 'center', padding: '12px 0' }}>
              No notes yet
            </p>
            {showTooltip && (
              <div
                onClick={dismissTooltip}
                style={{
                  position: 'absolute', top: '100%', left: 0, marginTop: 10,
                  background: '#130426', color: '#f8f4eb', borderRadius: 10,
                  padding: '12px 16px', maxWidth: 340, zIndex: 10, cursor: 'pointer',
                  boxShadow: '0 4px 16px rgba(0,0,0,0.2)',
                }}
              >
                <button
                  onClick={(e) => { e.stopPropagation(); dismissTooltip() }}
                  aria-label="Dismiss"
                  style={{ position: 'absolute', top: 8, right: 10, background: 'none', border: 'none', color: '#F8F4EB', cursor: 'pointer', fontSize: 16, lineHeight: 1, padding: 0 }}
                >
                  ×
                </button>
                <p style={{ fontFamily: hv, fontSize: 13, lineHeight: 1.55, margin: 0, paddingRight: 16 }}>
                  You can take notes within any activity or by using the Notepad tool. They&rsquo;ll auto-save here for easy reference.
                </p>
              </div>
            )}
          </div>
        ),
        true,
      )}
    </div>
  )
}
