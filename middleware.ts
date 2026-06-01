import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

// Central route protection for /app/*. Three checks, in order:
//   1. authenticated         → else redirect to /auth/signin?next=<original>
//   2. paid_at non-null      → else redirect to /auth/signup/payment
//   3. primary legacy contact (unless on /app/onboarding/*) → else redirect
//      to /app/onboarding/legacy-contact
//
// Fails closed: any error in the auth or DB calls treats the user as
// unauthenticated and redirects to signin. Supabase outage = everyone gets
// bounced (acceptable trade-off; correctness over availability for a
// security gate).
export async function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl
  let response = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          response = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          )
        },
      },
    },
  )

  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      const next = encodeURIComponent(pathname + search)
      return NextResponse.redirect(new URL(`/auth/signin?next=${next}`, request.url), 307)
    }

    const { data: profile } = await supabase
      .from('user_profiles')
      .select('paid_at')
      .eq('user_id', user.id)
      .maybeSingle()

    if (!profile?.paid_at) {
      return NextResponse.redirect(new URL('/auth/signup/payment', request.url), 307)
    }

    // /app/onboarding/* is reachable for paid users still completing onboarding —
    // it IS the gate they're being directed to clear.
    if (pathname.startsWith('/app/onboarding/')) {
      return response
    }

    const { data: legacyContact } = await supabase
      .from('legacy_contacts')
      .select('id')
      .eq('user_id', user.id)
      .eq('contact_type', 'primary')
      .limit(1)
      .maybeSingle()

    if (!legacyContact) {
      return NextResponse.redirect(new URL('/app/onboarding/legacy-contact', request.url), 307)
    }

    return response
  } catch (err) {
    console.error('[middleware] error:', err)
    const next = encodeURIComponent(pathname + search)
    return NextResponse.redirect(new URL(`/auth/signin?next=${next}`, request.url), 307)
  }
}

export const config = {
  matcher: ['/app', '/app/:path*'],
}
