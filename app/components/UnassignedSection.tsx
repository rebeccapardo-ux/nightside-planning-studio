'use client'

import { useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import DomainAssigner from './DomainAssigner'
import DeleteEntryButton from './DeleteEntryButton'
import { deleteNote, updateNote, type Container } from '@/lib/notes'

export type UnassignedNote = {
  id: string
  content: string
  timestamp: string | null
  originType: string | null
  promptContext: string | null
}

export type UnassignedEntry = {
  id: string
  title: string
  kind: string | null
  timestamp: string | null
  continueHref: string | null
  activity?: string | null
}

const MAX_VISIBLE = 5
const STICKY_COLORS = ['#fffde7', '#f0ecff', '#fef3e8']

// ---------------------------------------------------------------------------
// StickyNoteCard — sticky note visual for unassigned notes
// ---------------------------------------------------------------------------

function StickyNoteCard({
  note,
  idx = 0,
  allDomains,
  onDone,
  onDeleted,
}: {
  note: UnassignedNote
  idx?: number
  allDomains: Container[]
  onDone: (linkedIds: string[]) => void
  onDeleted: () => void
}) {
  const [editing, setEditing] = useState(false)
  const [editText, setEditText] = useState(note.content)
  const [saving, setSaving] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  async function handleSave() {
    const trimmed = editText.trim()
    if (!trimmed || trimmed === note.content) { setEditing(false); return }
    setSaving(true)
    await updateNote(note.id, trimmed)
    setSaving(false)
    setEditing(false)
    note.content = trimmed
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); handleSave() }
    if (e.key === 'Escape') { setEditText(note.content); setEditing(false) }
  }

  async function handleDelete() {
    await deleteNote(note.id)
    onDeleted()
  }

  const stickyBg = STICKY_COLORS[idx % STICKY_COLORS.length]

  return (
    <div
      className="relative"
      style={{
        backgroundColor: stickyBg,
        aspectRatio: '1 / 1',
        boxShadow: '3px 3px 8px rgba(19,4,38,0.25)',
        padding: '22px 10px 8px',
      }}
    >
      {/* Tape — white/frosted */}
      <div
        style={{
          position: 'absolute',
          top: '-10px',
          left: '50%',
          transform: 'translateX(-50%) rotate(-1deg)',
          width: '32px',
          height: '18px',
          backgroundColor: 'rgba(255,255,255,0.7)',
        }}
      />

      {editing ? (
        <div className="mb-1">
          <textarea
            ref={textareaRef}
            value={editText}
            autoFocus
            onChange={(e) => setEditText(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={3}
            className="w-full bg-[#130426]/[0.05] text-[11px] leading-snug text-[#130426]/85 resize-none outline-none"
          />
          <div className="flex gap-2 mt-1">
            <button onClick={handleSave} disabled={saving} className="text-[10px] text-[#130426]/60 hover:text-[#130426] transition-colors">
              {saving ? 'Saving…' : '⌘↵ Save'}
            </button>
            <button onClick={() => { setEditText(note.content); setEditing(false) }} className="text-[10px] text-[#130426]/55 hover:text-[#130426]/80 transition-colors">
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <p className="text-[#130426]/85 text-[11px] leading-snug line-clamp-4 whitespace-pre-wrap">
          {note.content}
        </p>
      )}

      {note.originType === 'prompt' && note.promptContext && !editing && (
        <p className="text-[9px] text-[#130426]/50 italic leading-snug mt-1.5 line-clamp-2">{note.promptContext}</p>
      )}

      {!editing && (
        <div className="flex items-center gap-1.5 absolute bottom-2 left-2.5 right-2.5 pt-1.5 border-t border-[#130426]/[0.10]">
          <button onClick={() => setEditing(true)} className="text-[10px] text-[#130426]/60 hover:text-[#130426] transition-colors">Open</button>
          <span className="text-[#130426]/25 text-[10px]">·</span>
          <button onClick={handleDelete} className="text-[10px] text-[#DB5835]/70 hover:text-[#DB5835] transition-colors">Delete</button>
          <span className="text-[#130426]/25 text-[10px]">·</span>
          <DomainAssigner
            itemId={note.id}
            itemType="note"
            allDomains={allDomains}
            initialLinkedDomainIds={[]}
            label="Add to"
            theme="light"
            showCount={false}
            onDone={onDone}
          />
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// DocumentCard — paper-like card for unassigned documents
// ---------------------------------------------------------------------------

function DocumentCard({
  entry,
  allDomains,
  onDone,
}: {
  entry: UnassignedEntry
  allDomains: Container[]
  onDone: (linkedIds: string[]) => void
}) {
  const editHref = entry.continueHref ?? `/app/entries/${entry.id}`
  return (
    <div className="bg-white rounded-lg border border-[#130426]/10 shadow-sm">
      <div className="flex">
        <div className="w-1 shrink-0 bg-[#2C3777]/40 rounded-l-lg" />
        <div className="flex-1 px-4 py-3">
          <Link href={editHref} className="block">
            <p className="text-sm font-medium text-[#130426]/85 leading-snug truncate hover:text-[#130426] transition-colors">
              {entry.title}
            </p>
          </Link>
          <div className="flex items-center gap-2.5 mt-2 pt-2 border-t border-[#130426]/[0.07]">
            <Link
              href={editHref}
              className="text-[11px] text-light-secondary hover:text-[#130426] transition-colors"
            >
              Open
            </Link>
            <span className="text-[#130426]/20 text-[11px]">·</span>
            <DeleteEntryButton entryId={entry.id} theme="light" compact />
            <span className="text-[#130426]/20 text-[11px]">·</span>
            <DomainAssigner
              itemId={entry.id}
              itemType="entry"
              allDomains={allDomains}
              initialLinkedDomainIds={[]}
              label="Add to"
              theme="light"
              showCount={false}
              onDone={onDone}
            />
          </div>
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// OutputCard — prominent card for unassigned working outputs
// ---------------------------------------------------------------------------

function OutputCard({
  entry,
  allDomains,
  onDone,
}: {
  entry: UnassignedEntry
  allDomains: Container[]
  onDone: (linkedIds: string[]) => void
}) {
  // continueHref now points to the snapshot view (/app/entries/[id])
  const viewHref = entry.continueHref ?? `/app/entries/${entry.id}`
  return (
    <div className="bg-white rounded-lg border border-[#130426]/10 shadow-sm">
      <div className="flex">
        <div className="w-1 shrink-0 bg-[#f29836] rounded-l-lg" />
        <div className="flex-1 px-4 py-3">
          <Link href={viewHref} className="block">
            <p className="text-sm font-medium text-[#130426]/85 leading-snug truncate hover:text-[#130426] transition-colors">
              {entry.title}
            </p>
          </Link>
          <div className="flex items-center gap-2.5 mt-2 pt-2 border-t border-[#130426]/[0.07]">
            <Link href={viewHref} className="text-[11px] text-light-secondary hover:text-[#130426] transition-colors">Open</Link>
            {entry.activity === 'values_ranking' && (
              <>
                <span className="text-[#130426]/20 text-[11px]">·</span>
                <Link href={`/app/entries/${entry.id}/export`} className="text-[11px] text-light-secondary hover:text-[#130426] transition-colors">Export</Link>
              </>
            )}
            <span className="text-[#130426]/20 text-[11px]">·</span>
            <DeleteEntryButton entryId={entry.id} theme="light" compact />
            <span className="text-[#130426]/20 text-[11px]">·</span>
            <DomainAssigner
              itemId={entry.id}
              itemType="entry"
              allDomains={allDomains}
              initialLinkedDomainIds={[]}
              label="Add to"
              theme="light"
              showCount={false}
              onDone={onDone}
            />
          </div>
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// UnassignedSection
// ---------------------------------------------------------------------------

export default function UnassignedSection({
  notes,
  entries,
  allDomains,
  hasDomains,
}: {
  notes: UnassignedNote[]
  entries: UnassignedEntry[]
  allDomains: Container[]
  hasDomains: boolean
}) {
  const router = useRouter()
  const [hiddenNoteIds, setHiddenNoteIds] = useState<Set<string>>(new Set())
  const [hiddenEntryIds, setHiddenEntryIds] = useState<Set<string>>(new Set())

  const visibleNotes = notes.filter((n) => !hiddenNoteIds.has(n.id))
  const visibleEntries = entries.filter((e) => !hiddenEntryIds.has(e.id))

  if (visibleNotes.length === 0 && visibleEntries.length === 0) return null

  function handleNoteDone(noteId: string, linkedIds: string[]) {
    if (linkedIds.length > 0) {
      setHiddenNoteIds((prev) => new Set([...prev, noteId]))
      router.refresh()
    }
  }

  function handleNoteDeleted(noteId: string) {
    setHiddenNoteIds((prev) => new Set([...prev, noteId]))
  }

  function handleEntryDone(entryId: string, linkedIds: string[]) {
    if (linkedIds.length > 0) {
      setHiddenEntryIds((prev) => new Set([...prev, entryId]))
      router.refresh()
    }
  }

  const visibleDocuments = visibleEntries.filter((e) => e.kind === 'Document')
  const visibleWorkingOutputs = visibleEntries.filter((e) => e.kind === 'Working output')

  const allItems = [
    ...visibleDocuments.map((e) => ({ type: 'doc' as const, id: e.id })),
    ...visibleWorkingOutputs.map((e) => ({ type: 'output' as const, id: e.id })),
    ...visibleNotes.map((n) => ({ type: 'note' as const, id: n.id })),
  ]
  const totalCount = allItems.length
  const showingCount = Math.min(totalCount, MAX_VISIBLE)
  const hasMore = totalCount > MAX_VISIBLE

  const cappedIds = new Set(allItems.slice(0, MAX_VISIBLE).map((i) => i.id))

  const cappedDocuments = visibleDocuments.filter((e) => cappedIds.has(e.id))
  const cappedWorkingOutputs = visibleWorkingOutputs.filter((e) => cappedIds.has(e.id))
  const cappedNotes = visibleNotes.filter((n) => cappedIds.has(n.id))

  return (
    <section>
      <div className="mb-8">
        <h2 className="text-h3 text-white underline decoration-[#f29836] decoration-[3px] underline-offset-[6px]" style={{ fontSize: '28px', marginTop: '48px' }}>
          {hasDomains ? 'Unassigned' : 'All materials'}
        </h2>
      </div>

      {cappedWorkingOutputs.length > 0 && (
        <div className="mb-6">
          <h3 className="text-xs font-bold uppercase tracking-[0.12em] text-[#f8f4eb]/80 mb-3">Working Outputs</h3>
          <div className="flex flex-col gap-2">
            {cappedWorkingOutputs.map((entry) => (
              <OutputCard
                key={entry.id}
                entry={entry}
                allDomains={allDomains}
                onDone={(linkedIds) => handleEntryDone(entry.id, linkedIds)}
              />
            ))}
          </div>
        </div>
      )}

      {cappedDocuments.length > 0 && (
        <div className="mb-6">
          <h3 className="text-xs font-bold uppercase tracking-[0.12em] text-[#f8f4eb]/80 mb-3">Documents</h3>
          <div className="flex flex-col gap-2">
            {cappedDocuments.map((entry) => (
              <DocumentCard
                key={entry.id}
                entry={entry}
                allDomains={allDomains}
                onDone={(linkedIds) => handleEntryDone(entry.id, linkedIds)}
              />
            ))}
          </div>
        </div>
      )}

      {cappedNotes.length > 0 && (
        <div className="mb-6">
          <h3 className="text-xs font-bold uppercase tracking-[0.12em] text-[#f8f4eb]/80 mb-3">Notes</h3>
          <div className="grid grid-cols-3 gap-3 pt-3">
            {cappedNotes.map((note, idx) => (
              <StickyNoteCard
                key={note.id}
                idx={idx}
                note={note}
                allDomains={allDomains}
                onDone={(linkedIds) => handleNoteDone(note.id, linkedIds)}
                onDeleted={() => handleNoteDeleted(note.id)}
              />
            ))}
          </div>
        </div>
      )}

      {hasMore && (
        <p className="text-xs text-app-tertiary mt-2">
          Showing {showingCount} of {totalCount} unassigned items.{' '}
          <Link href="/app/materials/all" className="underline hover:text-[#f8f4eb]/70 transition-colors">
            View all →
          </Link>
        </p>
      )}
    </section>
  )
}
