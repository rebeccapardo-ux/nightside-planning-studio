import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { transcribeAudio } from '@/lib/transcription'

export async function POST(req: NextRequest) {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const formData = await req.formData()
  const audio = formData.get('audio') as File | null
  const noteId = formData.get('noteId') as string | null

  if (!audio || !noteId) {
    return NextResponse.json({ error: 'Missing audio or noteId' }, { status: 400 })
  }

  const { data: noteRow } = await supabase
    .from('notes')
    .select('id')
    .eq('id', noteId)
    .eq('user_id', user.id)
    .single()

  if (!noteRow) {
    return NextResponse.json({ error: 'Note not found' }, { status: 404 })
  }

  const audioBuffer = await audio.arrayBuffer()
  const mimeType = (audio.type || 'audio/webm').split(';')[0].trim()

  console.log(`[transcribe] noteId=${noteId} size=${audioBuffer.byteLength}b mime=${mimeType}`)

  if (audioBuffer.byteLength === 0) {
    await supabase.from('notes').update({ transcription_status: 'failed' }).eq('id', noteId)
    return NextResponse.json({ error: 'Audio file is empty' }, { status: 400 })
  }

  const result = await transcribeAudio({ audioBuffer, mimeType })

  if (!result.ok) {
    console.error(`[transcribe] failed: ${result.error}`)
    await supabase.from('notes').update({ transcription_status: 'failed' }).eq('id', noteId)
    return NextResponse.json({ error: 'Transcription failed' }, { status: 500 })
  }

  console.log(`[transcribe] success — ${result.transcript.length} chars`)

  await supabase
    .from('notes')
    .update({
      content: result.transcript,
      transcript: result.transcript,
      transcription_status: 'complete',
    })
    .eq('id', noteId)

  return NextResponse.json({ transcript: result.transcript })
}
