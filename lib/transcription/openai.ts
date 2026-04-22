import type { TranscriptionInput, TranscriptionResult } from './types'

export async function transcribeWithOpenAI(input: TranscriptionInput): Promise<TranscriptionResult> {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) return { ok: false, error: 'OPENAI_API_KEY is not set' }

  const { audioBuffer, mimeType } = input
  const ext = mimeType.includes('mp4') ? 'mp4' : 'webm'
  const audioFile = new File([audioBuffer], `recording.${ext}`, { type: mimeType })

  const form = new FormData()
  form.append('file', audioFile)
  form.append('model', 'whisper-1')

  const res = await fetch('https://api.openai.com/v1/audio/transcriptions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}` },
    body: form,
  })

  if (!res.ok) {
    const body = await res.text()
    return { ok: false, error: `OpenAI ${res.status}: ${body}` }
  }

  const data = (await res.json()) as { text: string }
  return { ok: true, transcript: data.text?.trim() ?? '' }
}
