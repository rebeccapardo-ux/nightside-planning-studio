import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  // Refresh session and get user
  const { data: { user } } = await supabase.auth.getUser();

  // Routes that remain accessible before Legacy Contact designation
  const UNGUARDED = [
    '/app/onboarding',
    '/app/privacy',
    '/app/terms',
    '/app/help',
    '/app/about',
    '/app/account',
    '/account-deleted',
  ]

  // Legacy contact guard: redirect authenticated /app/* users to onboarding if not designated
  if (
    user &&
    pathname.startsWith('/app') &&
    !UNGUARDED.some(p => pathname.startsWith(p))
  ) {
    const { data: lc } = await supabase
      .from('legacy_contacts')
      .select('id')
      .eq('user_id', user.id)
      .eq('contact_type', 'primary')
      .maybeSingle();

    if (!lc) {
      return NextResponse.redirect(new URL('/app/onboarding/legacy-contact', request.url));
    }
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
