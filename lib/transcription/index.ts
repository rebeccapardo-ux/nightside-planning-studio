import type { TranscriptionInput, TranscriptionResult } from './types'
import { transcribeWithOpenAI } from './openai'

export type { TranscriptionInput, TranscriptionResult }

export async function transcribeAudio(input: TranscriptionInput): Promise<TranscriptionResult> {
  const provider = process.env.TRANSCRIPTION_PROVIDER ?? 'openai'

  switch (provider) {
    case 'openai':
      return transcribeWithOpenAI(input)
    default:
      return { ok: false, error: `Unknown TRANSCRIPTION_PROVIDER: "${provider}"` }
  }
}
