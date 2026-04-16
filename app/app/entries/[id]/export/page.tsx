import { notFound } from 'next/navigation'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import ExportButton from './PrintButton'

type ExportPageProps = {
  params: Promise<{ id: string }>
}

type EntryRow = {
  id: string
  title: string | null
  content: unknown
  created_at: string | null
  activity: string | null
}

type RankingContent = {
  essential: string[]
  important: string[]
  less_central: string[]
  reflection?: string
}

type LegacyMoment = { id: string; title: string; note: string; xPercent: number }
type LegacyMapContent = {
  moments: LegacyMoment[]
  themes: string
  surprises: string
  valuesToPassOn: string
  legacyProjects: string
}

export default async function ExportPage({ params }: ExportPageProps) {
  const { id } = await params
  const supabase = await createSupabaseServerClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) notFound()

  const { data: entry, error } = await supabase
    .from('entries')
    .select('id, title, content, created_at, activity')
    .eq('id', id)
    .eq('user_id', user.id)
    .single<EntryRow>()

  if (error || !entry) notFound()
  if (entry.activity !== 'values_ranking' && entry.activity !== 'legacy_map') notFound()

  const createdDate = formatDate(entry.created_at)
  const exportedDate = formatDate(new Date().toISOString())

  // Legacy Map export
  if (entry.activity === 'legacy_map') {
    const mapContent = getLegacyMapContent(entry)
    if (!mapContent) notFound()
    return <LegacyMapExportPage id={id} mapContent={mapContent} createdDate={createdDate} exportedDate={exportedDate} />
  }

  const ranking = getRankingContent(entry)
  if (!ranking) notFound()

  const hasEssential = ranking.essential.length > 0
  const hasImportant = ranking.important.length > 0
  const hasLessCentral = ranking.less_central.length > 0
  const hasReflection = !!(ranking.reflection?.trim())

  return (
    <>
      <style>{`
        @media print {
          nav, .no-print { display: none !important; }
          body { background: white !important; }
          @page { margin: 1.8cm; }
        }
      `}</style>

      <div className="bg-white min-h-screen">
        <div className="max-w-2xl mx-auto px-10 py-14">

          {/* Screen-only controls */}
          <div className="no-print flex items-center justify-between mb-12">
            <a
              href={`/app/entries/${id}`}
              className="text-sm text-gray-400 hover:text-gray-700 transition-colors"
            >
              ← Back to snapshot
            </a>
            <ExportButton />
          </div>

          {/* Context header — communicates this is a generated view, not a primary document */}
          <div className="mb-10 pb-8 border-b border-gray-100">
            <p className="text-xs uppercase tracking-widest text-gray-400 mb-4">Snapshot export</p>
            <h1 className="text-2xl font-semibold text-gray-800 mb-6">Values Ranking</h1>

            <div className="space-y-1.5 text-sm text-gray-500">
              <div className="flex gap-3">
                <span className="w-24 shrink-0 text-gray-400">Generated from</span>
                <span>Values Ranking exercise</span>
              </div>
              {createdDate && (
                <div className="flex gap-3">
                  <span className="w-24 shrink-0 text-gray-400">Created</span>
                  <span>{createdDate}</span>
                </div>
              )}
              {exportedDate && (
                <div className="flex gap-3">
                  <span className="w-24 shrink-0 text-gray-400">Exported</span>
                  <span>{exportedDate}</span>
                </div>
              )}
            </div>

            <p className="mt-5 text-xs text-gray-400 leading-relaxed">
              This is a generated view of your responses at the time of export. It is not a final or authoritative document.
            </p>
          </div>

          {/* Value groups — structured list, not heavy cards */}
          <div className="space-y-10">
            {hasEssential && (
              <section>
                <h2 className="text-xs font-medium uppercase tracking-widest text-gray-400 mb-4">
                  Most central to me
                </h2>
                <div className="flex flex-wrap gap-2">
                  {ranking.essential.map((item) => (
                    <span
                      key={item}
                      className="bg-gray-100 text-gray-700 rounded px-3 py-1.5 text-sm leading-snug"
                    >
                      {item}
                    </span>
                  ))}
                </div>
              </section>
            )}

            {hasImportant && (
              <section>
                <h2 className="text-xs font-medium uppercase tracking-widest text-gray-400 mb-4">
                  Also important
                </h2>
                <div className="flex flex-wrap gap-2">
                  {ranking.important.map((item) => (
                    <span
                      key={item}
                      className="bg-gray-50 text-gray-500 rounded px-3 py-1.5 text-sm leading-snug"
                    >
                      {item}
                    </span>
                  ))}
                </div>
              </section>
            )}

            {hasLessCentral && (
              <section>
                <h2 className="text-xs font-medium uppercase tracking-widest text-gray-300 mb-4">
                  Less central right now
                </h2>
                <div className="flex flex-wrap gap-2">
                  {ranking.less_central.map((item) => (
                    <span
                      key={item}
                      className="text-gray-400 rounded px-3 py-1.5 text-sm leading-snug"
                      style={{ background: 'rgba(0,0,0,0.04)' }}
                    >
                      {item}
                    </span>
                  ))}
                </div>
              </section>
            )}

            {hasReflection && (
              <section className="border-t border-gray-100 pt-8">
                <h2 className="text-xs font-medium uppercase tracking-widest text-gray-400 mb-4">
                  A note I wrote
                </h2>
                <p className="text-sm text-gray-600 leading-relaxed italic whitespace-pre-wrap">
                  {ranking.reflection!.trim()}
                </p>
              </section>
            )}
          </div>

          {/* Footer — printed and on-screen */}
          <div className="mt-16 pt-6 border-t border-gray-100">
            <p className="text-xs text-gray-300 leading-relaxed">
              This document was generated from your materials in Nightside Planning Studio.
            </p>
          </div>

        </div>
      </div>
    </>
  )
}

function getLegacyMapContent(entry: EntryRow): LegacyMapContent | null {
  if (!entry.content || typeof entry.content !== 'object') return null
  const c = entry.content as Record<string, unknown>
  return {
    moments: Array.isArray(c.moments)
      ? (c.moments as Record<string, unknown>[])
          .filter((m) => typeof m.title === 'string' && (m.title as string).trim())
          .map((m) => ({
            id: typeof m.id === 'string' ? m.id : '',
            title: m.title as string,
            note: typeof m.note === 'string' ? m.note : '',
            xPercent: typeof m.xPercent === 'number' ? m.xPercent : 50,
          }))
          .sort((a, b) => a.xPercent - b.xPercent)
      : [],
    themes: typeof c.themes === 'string' ? c.themes : '',
    surprises: typeof c.surprises === 'string' ? c.surprises : '',
    valuesToPassOn: typeof c.valuesToPassOn === 'string' ? c.valuesToPassOn : '',
    legacyProjects: typeof c.legacyProjects === 'string' ? c.legacyProjects : '',
  }
}

function LegacyMapExportPage({ id, mapContent, createdDate, exportedDate }: {
  id: string
  mapContent: LegacyMapContent
  createdDate: string | null
  exportedDate: string | null
}) {
  const hasReflection = mapContent.themes || mapContent.surprises || mapContent.valuesToPassOn || mapContent.legacyProjects
  return (
    <>
      <style>{`
        @media print {
          nav, .no-print { display: none !important; }
          body { background: white !important; }
          @page { margin: 1.8cm; }
        }
      `}</style>
      <div className="bg-white min-h-screen">
        <div className="max-w-2xl mx-auto px-10 py-14">
          <div className="no-print flex items-center justify-between mb-12">
            <a href={`/app/entries/${id}`} className="text-sm text-gray-400 hover:text-gray-700 transition-colors">← Back to snapshot</a>
            <ExportButton />
          </div>

          <div className="mb-10 pb-8 border-b border-gray-100">
            <p className="text-xs uppercase tracking-widest text-gray-400 mb-4">Snapshot export</p>
            <h1 className="text-2xl font-semibold text-gray-800 mb-6">Legacy Map</h1>
            <div className="space-y-1.5 text-sm text-gray-500">
              <div className="flex gap-3">
                <span className="w-24 shrink-0 text-gray-400">Generated from</span>
                <span>Legacy Map activity</span>
              </div>
              {createdDate && (
                <div className="flex gap-3">
                  <span className="w-24 shrink-0 text-gray-400">Last saved</span>
                  <span>{createdDate}</span>
                </div>
              )}
              {exportedDate && (
                <div className="flex gap-3">
                  <span className="w-24 shrink-0 text-gray-400">Exported</span>
                  <span>{exportedDate}</span>
                </div>
              )}
              {mapContent.moments.length > 0 && (
                <div className="flex gap-3">
                  <span className="w-24 shrink-0 text-gray-400">Moments</span>
                  <span>{mapContent.moments.length}</span>
                </div>
              )}
            </div>
            <p className="mt-5 text-xs text-gray-400 leading-relaxed">
              This is a generated view of your legacy map at the time of export. It is not a final or authoritative document.
            </p>
          </div>

          {mapContent.moments.length === 0 ? (
            <p className="text-gray-400 text-sm">No moments added yet.</p>
          ) : (
            <div className="space-y-8 mb-12">
              {mapContent.moments.map((m, i) => (
                <div key={m.id} className="flex gap-4 items-start">
                  <div className="shrink-0 w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center text-[11px] font-semibold text-gray-500 mt-0.5">
                    {i + 1}
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-gray-800 leading-snug">{m.title}</p>
                    {m.note && (
                      <p className="text-sm text-gray-500 leading-relaxed mt-1.5 whitespace-pre-wrap">{m.note}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {hasReflection && (
            <div className="space-y-8 pt-8 border-t border-gray-100">
              {mapContent.themes && (
                <div>
                  <h2 className="text-xs font-medium uppercase tracking-widest text-gray-400 mb-3">Themes that stood out</h2>
                  <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-wrap">{mapContent.themes}</p>
                </div>
              )}
              {mapContent.surprises && (
                <div>
                  <h2 className="text-xs font-medium uppercase tracking-widest text-gray-400 mb-3">Surprises or realizations</h2>
                  <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-wrap">{mapContent.surprises}</p>
                </div>
              )}
              {mapContent.valuesToPassOn && (
                <div>
                  <h2 className="text-xs font-medium uppercase tracking-widest text-gray-400 mb-3">Values to pass on</h2>
                  <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-wrap">{mapContent.valuesToPassOn}</p>
                </div>
              )}
              {mapContent.legacyProjects && (
                <div>
                  <h2 className="text-xs font-medium uppercase tracking-widest text-gray-400 mb-3">Legacy project ideas</h2>
                  <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-wrap">{mapContent.legacyProjects}</p>
                </div>
              )}
            </div>
          )}

          <div className="mt-16 pt-6 border-t border-gray-100">
            <p className="text-xs text-gray-300 leading-relaxed">
              This document was generated from your materials in Nightside Planning Studio.
            </p>
          </div>
        </div>
      </div>
    </>
  )
}

function getRankingContent(entry: EntryRow): RankingContent | null {
  if (!entry.content || typeof entry.content !== 'object') return null
  const c = entry.content as Record<string, unknown>
  return {
    essential: Array.isArray(c.essential) ? c.essential.filter((i): i is string => typeof i === 'string') : [],
    important: Array.isArray(c.important) ? c.important.filter((i): i is string => typeof i === 'string') : [],
    less_central: Array.isArray(c.less_central) ? c.less_central.filter((i): i is string => typeof i === 'string') : [],
    reflection: typeof c.reflection === 'string' ? c.reflection : undefined,
  }
}

function formatDate(dateString: string | null): string | null {
  if (!dateString) return null
  const date = new Date(dateString)
  if (Number.isNaN(date.getTime())) return null
  return date.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })
}
