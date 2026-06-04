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
  const { pathname, search } = request.nextUrl

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

  try {
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
        !pathname.startsWith('/auth/signup/reconcile') &&
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
      // Must be authenticated. Preserve destination via ?next= for post-signin redirect.
      if (!user) {
        const next = encodeURIComponent(pathname + search)
        return NextResponse.redirect(new URL(`/auth/signin?next=${next}`, request.url), 307)
      }

      // Must have paid. maybeSingle() so a missing profile row is "not paid"
      // instead of throwing (handles the brief race with the
      // handle_new_user_profile trigger at signup time).
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('paid_at, stripe_session_id')
        .eq('user_id', user.id)
        .maybeSingle()

      if (!profile?.paid_at) {
        // Paid-but-paid_at-null edge case: if a Checkout session is on record,
        // route through the Node reconcile endpoint (it can call Stripe) to
        // self-heal before falling back to payment. No session on record →
        // straight to payment, so a brand-new unpaid visit never triggers a
        // Stripe lookup in this hot path.
        if (profile?.stripe_session_id) {
          const next = encodeURIComponent(pathname + search)
          return NextResponse.redirect(new URL(`/auth/signup/reconcile?next=${next}`, request.url), 307)
        }
        return NextResponse.redirect(new URL('/auth/signup/payment', request.url), 307)
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
          return NextResponse.redirect(new URL('/app/onboarding/legacy-contact', request.url), 307)
        }
      }
    }

    return response
  } catch (err) {
    // Fail closed for /app/* — auth or DB errors bounce the user to signin
    // rather than serving a 500. Public paths pass through so a Supabase
    // outage doesn't take down /privacy, /terms, the auth pages, etc.
    console.error('[proxy] error:', err)
    if (pathname.startsWith('/app')) {
      const next = encodeURIComponent(pathname + search)
      return NextResponse.redirect(new URL(`/auth/signin?next=${next}`, request.url), 307)
    }
    return response
  }
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
