import { headers } from 'next/headers'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'

// Pages in the /auth/signup/ payment flow are accessible to authenticated users.
const PAYMENT_FLOW_PATHS = [
  '/auth/signup/payment',
  '/auth/signup/success',
  '/auth/signup/cancel',
]

export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  const headersList = await headers()
  const pathname = headersList.get('x-pathname') ?? ''

  // Let the payment flow pages through without an auth check.
  if (PAYMENT_FLOW_PATHS.includes(pathname)) {
    return <>{children}</>
  }

  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (user) {
    redirect('/app')
  }

  return <>{children}</>
}
