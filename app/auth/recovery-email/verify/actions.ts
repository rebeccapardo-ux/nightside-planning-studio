'use server'

import { redirect } from 'next/navigation'
import { confirmVerifyToken } from '@/lib/recovery-email'

// Confirm button → POST. Consuming the token only on an explicit POST keeps the
// link prefetch-safe (email clients that prefetch the GET link can't consume it).
export async function confirmRecoveryEmail(formData: FormData) {
  const token = (formData.get('token') as string | null)?.trim() ?? ''
  const result = await confirmVerifyToken(token)
  const status = result === 'verified' ? 'verified' : result === 'stale' ? 'stale' : 'expired'
  redirect(`/auth/recovery-email/verify?status=${status}`)
}
