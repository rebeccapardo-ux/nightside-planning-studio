export type TranscriptionInput = {
  audioBuffer: ArrayBuffer
  mimeType: string // base MIME only, no codec params — e.g. "audio/webm"
}

export type TranscriptionResult =
  | { ok: true; transcript: string }
  | { ok: false; error: string }
