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

function DocIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0 }}>
      <path d="M3 2.5A1.5 1.5 0 0 1 4.5 1H10l3 3v9A1.5 1.5 0 0 1 11.5 14.5h-7A1.5 1.5 0 0 1 3 13V2.5z" stroke="#2C3777" strokeWidth="1.25" strokeLinejoin="round" fill="none"/>
      <path d="M10 1v3h3" stroke="#2C3777" strokeWidth="1.25" strokeLinejoin="round" fill="none"/>
      <path d="M5.5 7.5h5M5.5 10h5" stroke="#2C3777" strokeWidth="1.25" strokeLinecap="round"/>
    </svg>
  )
}

function ActivityOutputIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0 }}>
      <rect x="2" y="2.5" width="12" height="11" rx="1" stroke="#2C3777" strokeWidth="1.25" strokeLinejoin="round"/>
      <circle cx="5.5" cy="7" r="1.5" fill="#2C3777"/>
      <circle cx="8.5" cy="9.5" r="1.5" fill="#2C3777"/>
      <circle cx="11" cy="5.5" r="1.5" fill="#2C3777"/>
    </svg>
  )
}

const WISHES_TYPES = new Set<string>(DOCUMENT_TYPES.filter(c => DOCUMENT_TYPE_META[c].category === 'wishes'))

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

  useEffect(() => {
    if (!userId || allNotes.length > 0) return
    const key = `nightside.tooltip.notesIntro:${userId}`
    if (localStorage.getItem(key) !== 'dismissed') setShowTooltip(true)
  }, [userId]) // eslint-disable-line react-hooks/exhaustive-deps

  function dismissTooltip() {
    if (userId) localStorage.setItem(`nightside.tooltip.notesIntro:${userId}`, 'dismissed')
    setShowTooltip(false)
  }

  const inProgressWishes    = inProgressDocs.filter(d => WISHES_TYPES.has(d.type))
  const notStartedWishes    = notStartedDocs.filter(d => WISHES_TYPES.has(d.type))
  const inProgressPractical = inProgressDocs.filter(d => !WISHES_TYPES.has(d.type))
  const notStartedPractical = notStartedDocs.filter(d => !WISHES_TYPES.has(d.type))

  const groupPanel: React.CSSProperties = {
    background: '#ede9f8',
    border: '1px solid rgba(19,4,38,0.08)',
    borderRadius: 12,
    padding: '20px 24px',
    marginBottom: 16,
  }
  const groupHeader: React.CSSProperties = {
    fontFamily: hv, fontSize: 18, fontWeight: 600, color: '#130426', marginBottom: 16, marginTop: 0,
  }
  const columnHeader: React.CSSProperties = {
    fontFamily: hv, fontSize: 14, fontWeight: 700, color: '#130426',
    textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 16, marginTop: 0,
  }
  const docButton: React.CSSProperties = {
    position: 'relative', width: '100%', background: '#ffffff',
    border: '1px solid rgba(19,4,38,0.1)', borderRadius: 22, padding: '14px 16px',
    display: 'flex', flexDirection: 'column', alignItems: 'flex-start',
    gap: 10, transition: 'background 150ms ease', boxSizing: 'border-box',
  }
  const outputButton: React.CSSProperties = {
    width: 220, minHeight: 36, background: '#ffffff',
    border: '1px solid rgba(19,4,38,0.1)', borderRadius: 22, padding: '8px 14px',
    display: 'inline-flex', alignItems: 'center', justifyContent: 'space-between',
    gap: 8, transition: 'background 150ms ease',
  }

  return (
    <div>
      <style>{`
        .plan-pill-doc:hover  { background: #f5f5f5 !important; }
        .plan-primary-btn:hover { background: rgba(19,4,38,0.06) !important; }
        .plan-export-link:hover { text-decoration: underline !important; }
        .plan-pill-out:hover  { background: #f5f5f5 !important; }
        @media (max-width: 767px) {
          .ym-status-cols {
            grid-template-columns: 1fr !important;
            gap: 24px !important;
          }
          /* Constrain card widths so content never overflows the panel on
             mobile. Allow inner flex rows to wrap and shrink so long labels
             ellipsize cleanly and Continue/Export buttons stack if needed. */
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
          /* Icon + title row (first child div after the absolute Link)
             must NOT flex-wrap onto two rows — otherwise long Wishes-doc
             titles push the title below the icon. Force the row to stay
             inline (icon + title side by side), let the title text wrap
             to multiple lines next to the icon, and align the icon to
             the top so it sits with the first line of the title. */
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
          .plan-pill-doc > div + div {
            margin-left: 0 !important;
          }
        }
      `}</style>

      <div style={{ background: '#BBABF4', borderRadius: 20, padding: 28 }}>

        {/* Content shown directly — no panel header. The page H1 "Your Materials"
            already identifies this surface; the group sub-headers (Wishes documents,
            Practical documents, Activity outputs, Notes) do the organizing. */}
        <>
            {/* Wishes documents group */}
            <div style={groupPanel}>
              <h3 style={groupHeader}>Wishes documents</h3>
              <p style={{ fontFamily: hv, fontSize: 15, fontWeight: 400, color: 'rgba(19,4,38,0.7)', maxWidth: 520, marginBottom: 36, marginTop: 0, lineHeight: 1.55 }}>
                Documents to help synthesize your values, priorities, and preferences; recommended to fill in after exploring the{' '}
                <Link href="/app/reflect" style={{ color: 'rgba(19,4,38,0.65)', textDecoration: 'underline' }}>Reflect</Link>{' '}
                and{' '}
                <Link href="/app/learn" style={{ color: 'rgba(19,4,38,0.65)', textDecoration: 'underline' }}>Learn</Link>{' '}
                sections.
              </p>
              <div className="ym-status-cols" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 40 }}>
                <div style={{ paddingRight: 10 }}>
                  <p style={columnHeader}>In progress</p>
                  {inProgressWishes.length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                      {inProgressWishes.map((doc) => (
                        <div key={doc.type} className="plan-pill-doc" style={docButton}>
                          <Link href={doc.href} style={{ position: 'absolute', inset: 0, borderRadius: 'inherit' }} aria-hidden="true" tabIndex={-1} />
                          <div style={{ position: 'relative', zIndex: 1, display: 'flex', alignItems: 'center', gap: 8 }}>
                            <DocIcon />
                            <span style={{ fontFamily: hv, fontSize: 15, fontWeight: 600, color: '#1A1A1A', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{doc.label}</span>
                          </div>
                          <div style={{ position: 'relative', zIndex: 1, display: 'flex', alignItems: 'center', gap: 14, marginLeft: 24 }}>
                            <Link href={doc.href} className="plan-primary-btn" style={{ fontFamily: hv, fontSize: 14, fontWeight: 500, color: '#2C3777', background: 'transparent', border: '1px solid #2C3777', borderRadius: 999, padding: '8px 12px', textDecoration: 'none', display: 'inline-block', whiteSpace: 'nowrap' }}>
                              Continue
                            </Link>
                            <Link href={entryExportHref(doc.entryId, doc.type)} className="plan-export-link" style={{ fontFamily: hv, fontSize: 14, fontWeight: 500, color: '#2C3777', textDecoration: 'none', whiteSpace: 'nowrap' }}>
                              Export
                            </Link>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p style={{ fontFamily: hv, fontSize: 13, color: 'rgba(19,4,38,0.7)', margin: 0 }}>None yet</p>
                  )}
                </div>
                <div style={{ paddingRight: 10 }}>
                  <p style={columnHeader}>Not started</p>
                  {notStartedWishes.length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                      {notStartedWishes.map((doc) => (
                        <div key={doc.type} className="plan-pill-doc" style={docButton}>
                          <Link href={doc.href} style={{ position: 'absolute', inset: 0, borderRadius: 'inherit' }} aria-hidden="true" tabIndex={-1} />
                          <div style={{ position: 'relative', zIndex: 1, display: 'flex', alignItems: 'center', gap: 8 }}>
                            <DocIcon />
                            <span style={{ fontFamily: hv, fontSize: 15, fontWeight: 600, color: '#1A1A1A', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{doc.label}</span>
                          </div>
                          <div style={{ position: 'relative', zIndex: 1, marginLeft: 24 }}>
                            <Link href={doc.href} className="plan-primary-btn" style={{ fontFamily: hv, fontSize: 14, fontWeight: 500, color: '#2C3777', background: 'transparent', border: '1px solid #2C3777', borderRadius: 999, padding: '8px 12px', textDecoration: 'none', display: 'inline-block', whiteSpace: 'nowrap' }}>
                              Start
                            </Link>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p style={{ fontFamily: hv, fontSize: 13, color: 'rgba(19,4,38,0.7)', margin: 0 }}>All started</p>
                  )}
                </div>
              </div>
            </div>

            {/* Practical documents group */}
            <div style={groupPanel}>
              <h3 style={groupHeader}>Practical documents</h3>
              <p style={{ fontFamily: hv, fontSize: 15, fontWeight: 400, color: 'rgba(19,4,38,0.7)', maxWidth: 480, marginBottom: 36, marginTop: 0, lineHeight: 1.55 }}>
                Templates for practical information; fill them in at any time.
              </p>
              <div className="ym-status-cols" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 40 }}>
                <div style={{ paddingRight: 10 }}>
                  <p style={columnHeader}>In progress</p>
                  {inProgressPractical.length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                      {inProgressPractical.map((doc) => (
                        <div key={doc.type} className="plan-pill-doc" style={docButton}>
                          <Link href={doc.href} style={{ position: 'absolute', inset: 0, borderRadius: 'inherit' }} aria-hidden="true" tabIndex={-1} />
                          <div style={{ position: 'relative', zIndex: 1, display: 'flex', alignItems: 'center', gap: 8 }}>
                            <DocIcon />
                            <span style={{ fontFamily: hv, fontSize: 15, fontWeight: 600, color: '#1A1A1A', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{doc.label}</span>
                          </div>
                          <div style={{ position: 'relative', zIndex: 1, display: 'flex', alignItems: 'center', gap: 14, marginLeft: 24 }}>
                            <Link href={doc.href} className="plan-primary-btn" style={{ fontFamily: hv, fontSize: 14, fontWeight: 500, color: '#2C3777', background: 'transparent', border: '1px solid #2C3777', borderRadius: 999, padding: '8px 12px', textDecoration: 'none', display: 'inline-block', whiteSpace: 'nowrap' }}>
                              Continue
                            </Link>
                            <Link href={entryExportHref(doc.entryId, doc.type)} className="plan-export-link" style={{ fontFamily: hv, fontSize: 14, fontWeight: 500, color: '#2C3777', textDecoration: 'none', whiteSpace: 'nowrap' }}>
                              Export
                            </Link>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p style={{ fontFamily: hv, fontSize: 13, color: 'rgba(19,4,38,0.7)', margin: 0 }}>None yet</p>
                  )}
                </div>
                <div style={{ paddingRight: 10 }}>
                  <p style={columnHeader}>Not started</p>
                  {notStartedPractical.length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                      {notStartedPractical.map((doc) => (
                        <div key={doc.type} className="plan-pill-doc" style={docButton}>
                          <Link href={doc.href} style={{ position: 'absolute', inset: 0, borderRadius: 'inherit' }} aria-hidden="true" tabIndex={-1} />
                          <div style={{ position: 'relative', zIndex: 1, display: 'flex', alignItems: 'center', gap: 8 }}>
                            <DocIcon />
                            <span style={{ fontFamily: hv, fontSize: 15, fontWeight: 600, color: '#1A1A1A', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{doc.label}</span>
                          </div>
                          <div style={{ position: 'relative', zIndex: 1, marginLeft: 24 }}>
                            <Link href={doc.href} className="plan-primary-btn" style={{ fontFamily: hv, fontSize: 14, fontWeight: 500, color: '#2C3777', background: 'transparent', border: '1px solid #2C3777', borderRadius: 999, padding: '8px 12px', textDecoration: 'none', display: 'inline-block', whiteSpace: 'nowrap' }}>
                              Start
                            </Link>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p style={{ fontFamily: hv, fontSize: 13, color: 'rgba(19,4,38,0.7)', margin: 0 }}>All started</p>
                  )}
                </div>
              </div>
            </div>

            {/* Activity outputs group */}
            <div style={groupPanel}>
              <h3 style={groupHeader}>Activity outputs</h3>
              <div className="ym-status-cols" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 40 }}>
                <div style={{ paddingRight: 10 }}>
                  <p style={columnHeader}>In progress</p>
                  {inProgressActivities.length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                      {inProgressActivities.map((act) => (
                        <div key={act.activity} className="plan-pill-out" style={{ ...outputButton, position: 'relative', width: '100%', borderRadius: 22, display: 'flex', flexDirection: 'column', alignItems: 'flex-start', justifyContent: 'flex-start', gap: 10, padding: '14px 16px', boxSizing: 'border-box' }}>
                          <Link href={act.href} style={{ position: 'absolute', inset: 0, borderRadius: 'inherit' }} aria-hidden="true" tabIndex={-1} />
                          <div style={{ position: 'relative', zIndex: 1, display: 'flex', alignItems: 'center', gap: 8 }}>
                            <ActivityOutputIcon />
                            <span style={{ fontFamily: hv, fontSize: 15, fontWeight: 600, color: '#1A1A1A' }}>{act.label}</span>
                          </div>
                          <div style={{ position: 'relative', zIndex: 1, display: 'flex', alignItems: 'center', gap: 14 }}>
                            <Link href={act.href} className="plan-primary-btn" style={{ fontFamily: hv, fontSize: 14, fontWeight: 500, color: '#2C3777', background: 'transparent', border: '1px solid #2C3777', borderRadius: 999, padding: '8px 12px', textDecoration: 'none', display: 'inline-block', whiteSpace: 'nowrap' }}>
                              Continue
                            </Link>
                            <Link href={`/app/entries/${act.entryId}/export`} className="plan-export-link" style={{ fontFamily: hv, fontSize: 14, fontWeight: 500, color: '#2C3777', textDecoration: 'none', whiteSpace: 'nowrap' }}>
                              Export
                            </Link>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p style={{ fontFamily: hv, fontSize: 13, color: 'rgba(19,4,38,0.7)', margin: 0 }}>None yet</p>
                  )}
                </div>
                <div style={{ paddingRight: 10 }}>
                  <p style={columnHeader}>Not started</p>
                  {notStartedActivities.length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                      {notStartedActivities.map((act) => (
                        <div key={act.activity} className="plan-pill-out" style={{ ...outputButton, position: 'relative', width: '100%', borderRadius: 22, display: 'flex', flexDirection: 'column', alignItems: 'flex-start', justifyContent: 'flex-start', gap: 10, padding: '14px 16px', boxSizing: 'border-box' }}>
                          <Link href={act.href} style={{ position: 'absolute', inset: 0, borderRadius: 'inherit' }} aria-hidden="true" tabIndex={-1} />
                          <div style={{ position: 'relative', zIndex: 1, display: 'flex', alignItems: 'center', gap: 8 }}>
                            <ActivityOutputIcon />
                            <span style={{ fontFamily: hv, fontSize: 15, fontWeight: 600, color: '#1A1A1A' }}>{act.label}</span>
                          </div>
                          <div style={{ position: 'relative', zIndex: 1 }}>
                            <Link href={act.href} className="plan-primary-btn" style={{ fontFamily: hv, fontSize: 14, fontWeight: 500, color: '#2C3777', background: 'transparent', border: '1px solid #2C3777', borderRadius: 999, padding: '8px 12px', textDecoration: 'none', display: 'inline-block', whiteSpace: 'nowrap' }}>
                              Start
                            </Link>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p style={{ fontFamily: hv, fontSize: 13, color: 'rgba(19,4,38,0.7)', margin: 0 }}>All started</p>
                  )}
                </div>
              </div>
            </div>

            {/* Notes group — always shown */}
            <div style={{ ...groupPanel, marginBottom: 0 }}>
              <h3 style={groupHeader}>Notes</h3>
              {allNotes.length > 0 ? (
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
                        position: 'absolute',
                        top: '100%',
                        left: 0,
                        marginTop: 10,
                        background: '#130426',
                        color: '#f8f4eb',
                        borderRadius: 10,
                        padding: '12px 16px',
                        maxWidth: 340,
                        zIndex: 10,
                        cursor: 'pointer',
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
              )}
            </div>
          </>
      </div>
    </div>
  )
}
