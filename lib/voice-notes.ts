import { createSupabaseBrowserClient } from './supabase-browser'

export const VOICE_NOTES_BUCKET = 'voice-notes'

export function getSupportedMimeType(): string {
  if (typeof MediaRecorder === 'undefined') return ''
  const candidates = [
    'audio/webm;codecs=opus',
    'audio/webm',
    'audio/mp4',
    'audio/ogg;codecs=opus',
    '',
  ]
  for (const t of candidates) {
    if (!t || MediaRecorder.isTypeSupported(t)) return t
  }
  return ''
}

export function mimeTypeToExtension(mimeType: string): string {
  if (mimeType.includes('mp4')) return 'mp4'
  if (mimeType.includes('ogg')) return 'ogg'
  return 'webm'
}

export function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

export async function uploadAudioBlob(
  blob: Blob,
  userId: string,
  noteId: string,
): Promise<string | null> {
  const supabase = createSupabaseBrowserClient()
  const ext = mimeTypeToExtension(blob.type)
  const path = `${userId}/${noteId}.${ext}`

  const { error } = await supabase.storage
    .from(VOICE_NOTES_BUCKET)
    .upload(path, blob, { contentType: blob.type, upsert: false })

  if (error) {
    console.error('Audio upload error:', error.message)
    return null
  }
  return path
}

export async function getAudioSignedUrl(storagePath: string): Promise<string | null> {
  const supabase = createSupabaseBrowserClient()
  const { data, error } = await supabase.storage
    .from(VOICE_NOTES_BUCKET)
    .createSignedUrl(storagePath, 3600)

  if (error) {
    console.error('Signed URL error:', error.message)
    return null
  }
  return data?.signedUrl ?? null
}
