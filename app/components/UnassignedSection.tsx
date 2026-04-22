'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import DomainAssigner from './DomainAssigner'
import DeleteEntryButton from './DeleteEntryButton'
import SharedNoteCard from './notes/NoteCard'
import VoiceNoteCard from './notes/VoiceNoteCard'
import { deleteNote, updateNote, type Container } from '@/lib/notes'

export type UnassignedNote = {
  id: string
  content: string
  timestamp: string | null
  originType: string | null
  promptContext: string | null
  noteMode?: 'text' | 'audio' | null
  audioUrl?: string | null
  transcript?: string | null
  durationSeconds?: number | null
  transcriptionStatus?: 'pending' | 'complete' | 'failed' | null
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
// StickyNoteCard — sticky visual variant wrapping shared NoteCard behavior
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
  const isAudio = note.noteMode === 'audio'

  async function handleSave(newContent: string) {
    await updateNote(note.id, newContent)
    note.content = newContent
  }

  async function handleDelete() {
    await deleteNote(note.id)
    onDeleted()
  }

  // Voice note card
  if (isAudio) {
    const noteObj = {
      id: note.id,
      content: note.content,
      created_at: '',
      updated_at: '',
      note_mode: 'audio' as const,
      audio_url: note.audioUrl ?? null,
      transcript: note.transcript ?? null,
      duration_seconds: note.durationSeconds ?? null,
      transcription_status: note.transcriptionStatus ?? null,
    }
    return (
      <VoiceNoteCard
        note={noteObj}
        promptContext={note.originType === 'prompt' ? note.promptContext : null}
        actions={
          <>
            <button
              onClick={handleDelete}
              style={{ fontSize: '12px', fontWeight: 400, color: 'rgba(219,88,53,0.80)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
              className="hover:opacity-75 transition-opacity"
            >
              Delete
            </button>
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
          </>
        }
      />
    )
  }

  // Text note card — sticky square
  const stickyBg = STICKY_COLORS[idx % STICKY_COLORS.length]
  return (
    <SharedNoteCard
      content={note.content}
      promptContext={note.originType === 'prompt' ? note.promptContext : null}
      onContentSave={handleSave}
      stickyStyle={{
        backgroundColor: stickyBg,
        aspectRatio: '1 / 1',
        boxShadow: '3px 3px 8px rgba(19,4,38,0.25)',
        padding: '20px 10px 8px',
        borderRadius: '0',
      }}
      embellishment={
        <div style={{
          position: 'absolute',
          top: '-10px',
          left: '50%',
          transform: 'translateX(-50%) rotate(-1deg)',
          width: '32px',
          height: '18px',
          backgroundColor: 'rgba(255,255,255,0.7)',
        }} />
      }
      actions={
        <>
          <button
            onClick={handleDelete}
            style={{ fontSize: '12px', fontWeight: 400, color: 'rgba(219,88,53,0.80)' }}
            className="hover:opacity-75 transition-opacity"
          >
            Delete
          </button>
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
        </>
      }
    />
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
  showAll = false,
}: {
  notes: UnassignedNote[]
  entries: UnassignedEntry[]
  allDomains: Container[]
  hasDomains: boolean
  showAll?: boolean
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
  const showingCount = showAll ? totalCount : Math.min(totalCount, MAX_VISIBLE)
  const hasMore = !showAll && totalCount > MAX_VISIBLE

  const cappedIds = showAll
    ? new Set(allItems.map((i) => i.id))
    : new Set(allItems.slice(0, MAX_VISIBLE).map((i) => i.id))

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
          <div className="grid grid-cols-3 gap-3 pt-3 items-start">
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
