import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'

// Paths that never require auth or payment — always pass through.
const ALWAYS_PUBLIC_PREFIXES = [
  '/auth/',          // all auth pages including payment flow
  '/privacy',
  '/terms',
  '/account-deleted',
  '/login',
]

// Within /app/*, these paths are accessible after paying but before Legacy Contact designation.
const UNGUARDED_APP_PREFIXES = [
  '/app/onboarding',
  '/app/help',
  '/app/about',
  '/app/account',
]

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  let response = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options)
          })
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  // ── Always-public paths ──────────────────────────────────────────────────
  if (ALWAYS_PUBLIC_PREFIXES.some(p => pathname.startsWith(p))) {
    // Redirect authenticated users away from plain auth pages (signin, signup)
    // but not from the payment flow pages (/auth/signup/payment etc.).
    if (
      user &&
      pathname.startsWith('/auth/') &&
      !pathname.startsWith('/auth/signup/payment') &&
      !pathname.startsWith('/auth/signup/success') &&
      !pathname.startsWith('/auth/signup/cancel') &&
      !pathname.startsWith('/auth/reset-password')
    ) {
      const url = request.nextUrl.clone()
      url.pathname = '/app'
      return NextResponse.redirect(url)
    }
    return response
  }

  // ── /app/* routes ────────────────────────────────────────────────────────
  if (pathname.startsWith('/app')) {
    // Must be authenticated.
    if (!user) {
      const url = request.nextUrl.clone()
      url.pathname = '/auth/signin'
      return NextResponse.redirect(url)
    }

    // Must have paid.
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('paid_at')
      .eq('user_id', user.id)
      .single()

    if (!profile?.paid_at) {
      const url = request.nextUrl.clone()
      url.pathname = '/auth/signup/payment'
      return NextResponse.redirect(url)
    }

    // Must have a Legacy Contact (except for unguarded pages).
    if (!UNGUARDED_APP_PREFIXES.some(p => pathname.startsWith(p))) {
      const { data: lc } = await supabase
        .from('legacy_contacts')
        .select('id')
        .eq('user_id', user.id)
        .eq('contact_type', 'primary')
        .maybeSingle()

      if (!lc) {
        const url = request.nextUrl.clone()
        url.pathname = '/app/onboarding/legacy-contact'
        return NextResponse.redirect(url)
      }
    }
  }

  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
