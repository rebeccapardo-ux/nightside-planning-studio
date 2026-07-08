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

// Item-level type markers (documents / activity outputs). Section tiles carry NO
// header icon — the title alone is enough; these signal type within the lists.
function DocIcon({ size = 22, color = '#2C3777' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0 }}>
      <path d="M3 2.5A1.5 1.5 0 0 1 4.5 1H10l3 3v9A1.5 1.5 0 0 1 11.5 14.5h-7A1.5 1.5 0 0 1 3 13V2.5z" stroke={color} strokeWidth="1.25" strokeLinejoin="round" fill="none"/>
      <path d="M10 1v3h3" stroke={color} strokeWidth="1.25" strokeLinejoin="round" fill="none"/>
      <path d="M5.5 7.5h5M5.5 10h5" stroke={color} strokeWidth="1.25" strokeLinecap="round"/>
    </svg>
  )
}

function ActivityOutputIcon({ size = 22, color = '#2C3777' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0 }}>
      <rect x="2" y="2.5" width="12" height="11" rx="1" stroke={color} strokeWidth="1.25" strokeLinejoin="round"/>
      <circle cx="5.5" cy="7" r="1.5" fill={color}/>
      <circle cx="8.5" cy="9.5" r="1.5" fill={color}/>
      <circle cx="11" cy="5.5" r="1.5" fill={color}/>
    </svg>
  )
}

function Chevron({ open }: { open: boolean }) {
  return (
    <svg width={24} height={24} viewBox="0 0 20 20" fill="none"
      style={{ flexShrink: 0, transition: 'transform 200ms ease', transform: open ? 'rotate(180deg)' : 'rotate(0deg)' }}>
      <path d="M5 7.5l5 5 5-5" stroke="#130426" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

const WISHES_TYPES = new Set<string>(DOCUMENT_TYPES.filter(c => DOCUMENT_TYPE_META[c].category === 'wishes'))

// Per-section EXPANDED flags (a missing key = collapsed, the default — the four
// collapsed tiles ARE the library, scannable at a glance).
const EXPANDED_KEY = 'nightside.materialsExpanded'

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
  const [expanded, setExpanded] = useState<Record<string, boolean>>(() => {
    if (typeof window === 'undefined') return {}
    try { return JSON.parse(localStorage.getItem(EXPANDED_KEY) || '{}') as Record<string, boolean> } catch { return {} }
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
    setExpanded((prev) => {
      const next = { ...prev, [key]: !prev[key] }
      try { localStorage.setItem(EXPANDED_KEY, JSON.stringify(next)) } catch { /* private mode */ }
      return next
    })
  }

  const inProgressWishes    = inProgressDocs.filter(d => WISHES_TYPES.has(d.type))
  const notStartedWishes    = notStartedDocs.filter(d => WISHES_TYPES.has(d.type))
  const inProgressPractical = inProgressDocs.filter(d => !WISHES_TYPES.has(d.type))
  const notStartedPractical = notStartedDocs.filter(d => !WISHES_TYPES.has(d.type))

  // ── Shared styles ──────────────────────────────────────────────────────────
  const tileDesc: React.CSSProperties = {
    fontFamily: hv, fontSize: 14.5, fontWeight: 400, color: 'rgba(19,4,38,0.72)', margin: '12px 0 0', lineHeight: 1.5,
  }
  const columnHeader: React.CSSProperties = {
    fontFamily: hv, fontSize: 13, fontWeight: 700, color: '#130426',
    textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 14, marginTop: 0,
  }
  const itemCard: React.CSSProperties = {
    position: 'relative', width: '100%', background: '#F8F4EB',
    border: '1px solid #130426', borderRadius: 18, padding: '18px 20px',
    display: 'flex', flexDirection: 'column', alignItems: 'flex-start',
    gap: 16, transition: 'background 150ms ease', boxSizing: 'border-box',
  }
  const cardTitle: React.CSSProperties = {
    fontFamily: hv, fontSize: 16, fontWeight: 600, color: '#1A1A1A',
    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
  }
  // 44px min tap target (project standard — matches .home4-sub, the nav controls, AppFooter).
  const navyPill: React.CSSProperties = {
    fontFamily: hv, fontSize: 14, fontWeight: 600, color: '#F8F4EB', background: '#2C3777',
    borderRadius: 999, padding: '0 18px', minHeight: 44, boxSizing: 'border-box',
    textDecoration: 'none', display: 'inline-flex', alignItems: 'center', whiteSpace: 'nowrap',
  }
  const exportLink: React.CSSProperties = {
    fontFamily: hv, fontSize: 14, fontWeight: 500, color: '#2C3777', textDecoration: 'none',
    whiteSpace: 'nowrap', display: 'inline-flex', alignItems: 'center', minHeight: 44,
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
          <Link href={act.href} className="plan-primary-btn" style={navyPill}>{inProgress ? 'Revisit activity' : 'Start'}</Link>
          {inProgress && (
            <Link href={`/app/entries/${(act as InProgressAct).entryId}/export`} className="plan-export-link" style={exportLink}>Export</Link>
          )}
        </div>
      </div>
    )
  }

  // In Progress / Not Started, STACKED vertically (tiles are half-width — side-by-side
  // sub-columns would cramp; the labels keep the split legible).
  function statusStack(
    inProg: React.ReactNode[], notStarted: React.ReactNode[],
    inProgEmpty: string, notStartedEmpty: string,
  ) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        <div>
          <p style={columnHeader}>In progress</p>
          {inProg.length > 0
            ? <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>{inProg}</div>
            : <p style={emptyText}>{inProgEmpty}</p>}
        </div>
        <div>
          <p style={columnHeader}>Not started</p>
          {notStarted.length > 0
            ? <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>{notStarted}</div>
            : <p style={emptyText}>{notStartedEmpty}</p>}
        </div>
      </div>
    )
  }

  // ── Collapsible tile (one grid cell) ────────────────────────────────────────
  // Single cream card + sunset outline. Title + chevron are midnight (#130426) for a strong,
  // readable header row; the sunset identity carries purely in the outline. NOT a filled bar —
  // a saturated bar over a lighter body reads as an already-expanded accordion. One-color
  // card keeps all text dark on cream (AA throughout). The title row is the toggle; the
  // description (what) shows
  // in BOTH states; the count summary (how much) when collapsed; the lists when expanded.
  // A shared collapsed min-height (+ the grid's align-items:start) keeps all four tiles
  // equal at rest, while an expanded tile leaves its row-mate collapsed (space opens below).
  function tile(id: string, title: string, description: React.ReactNode, summary: string, body: React.ReactNode) {
    const isExpanded = expanded[id] === true
    return (
      <div key={id} className="ym-tile" style={{ background: '#FFFFFF', border: '1.5px solid #DB5835', borderRadius: 16, padding: '26px 28px', minHeight: isExpanded ? undefined : 248, display: 'flex', flexDirection: 'column' }}>
        <button
          type="button"
          className="ym-tile-header"
          onClick={() => toggleSection(id)}
          aria-expanded={isExpanded}
          style={{ display: 'flex', width: '100%', alignItems: 'flex-start', gap: 12, background: 'none', border: 'none', cursor: 'pointer', padding: 0, minHeight: 44, textAlign: 'left' }}
        >
          <h2 style={{ fontFamily: hv, fontSize: 22, fontWeight: 600, color: '#130426', margin: 0, lineHeight: 1.2, flex: 1, minWidth: 0 }}>{title}</h2>
          <span className="ym-chevron" style={{ marginTop: 2 }}><Chevron open={isExpanded} /></span>
        </button>
        {description}
        {/* Count summary — pushed to the tile's bottom edge (margin-top:auto) so the
            counters share a baseline across tiles regardless of description length, and
            set apart from the prose above by a divider + smaller, muted, label-weight
            text so it reads as at-a-glance status, not more body copy. */}
        {!isExpanded && (
          <p style={{ fontFamily: hv, fontSize: 12.5, fontWeight: 600, color: 'rgba(19,4,38,0.5)', margin: 0, marginTop: 'auto', paddingTop: 14, borderTop: '1px solid rgba(19,4,38,0.14)', lineHeight: 1.4 }}>{summary}</p>
        )}
        {isExpanded && <div style={{ marginTop: 22 }}>{body}</div>}
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
        .ym-tile-header:hover .ym-chevron { opacity: 0.65; }
        @media (max-width: 767px) {
          .ym-grid { grid-template-columns: 1fr !important; }
          .ym-tile { padding: 22px 20px !important; }
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

      {/* 2×2 grid of collapsible tiles (no outer wrapper). The shared collapsed min-height
          (248) already makes all four equal at rest, so align-items:start (NOT stretch) —
          expanding a tile leaves its collapsed row-mate at its normal size with space
          opening below it, rather than stretching the row-mate to match. 1 col mobile. */}
      <div className="ym-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18, alignItems: 'start' }}>

        {/* Wishes documents */}
        {tile(
          'wishes',
          'Wishes documents',
          <p style={tileDesc}>
            Documents to help synthesize your values, priorities, and preferences; recommended to fill in after exploring the{' '}
            <Link href="/app/activities" style={{ color: 'rgba(19,4,38,0.72)', textDecoration: 'underline' }}>Activities</Link>{' '}
            and{' '}
            <Link href="/app/area" style={{ color: 'rgba(19,4,38,0.72)', textDecoration: 'underline' }}>Plan by area</Link>{' '}
            sections.
          </p>,
          docCount(inProgressWishes, notStartedWishes),
          statusStack(
            inProgressWishes.map((d) => renderDocCard(d, true)),
            notStartedWishes.map((d) => renderDocCard(d, false)),
            'None yet', 'All started',
          ),
        )}

        {/* Practical documents */}
        {tile(
          'practical',
          'Practical documents',
          <p style={tileDesc}>Templates for practical information; fill them in at any time.</p>,
          docCount(inProgressPractical, notStartedPractical),
          statusStack(
            inProgressPractical.map((d) => renderDocCard(d, true)),
            notStartedPractical.map((d) => renderDocCard(d, false)),
            'None yet', 'All started',
          ),
        )}

        {/* Activity outputs */}
        {tile(
          'activity',
          'Activity outputs',
          <p style={tileDesc}>Your work from Activities.</p>,
          docCount(inProgressActivities, notStartedActivities),
          statusStack(
            inProgressActivities.map((a) => renderActivityCard(a, true)),
            notStartedActivities.map((a) => renderActivityCard(a, false)),
            'None yet', 'All started',
          ),
        )}

        {/* Notes */}
        {tile(
          'notes',
          'Notes',
          <p style={tileDesc}>Text and voice notes you&rsquo;ve captured across the platform.</p>,
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
        )}
      </div>
    </div>
  )
}
