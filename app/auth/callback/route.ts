import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { logEvent } from '@/lib/analytics'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')

  if (code) {
    const supabase = await createSupabaseServerClient()
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      if (data.user) {
        logEvent({ userId: data.user.id, eventName: 'email_confirmed' })
      }
      return NextResponse.redirect(`${origin}/auth/signup/payment`)
    }
  }

  return NextResponse.redirect(`${origin}/auth/signin?error=confirmation_failed`)
}
