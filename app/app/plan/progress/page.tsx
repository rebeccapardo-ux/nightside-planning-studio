import { redirect } from 'next/navigation'

// The whole /app/plan section is deprecated (Phase 3); the proxy already redirects
// /app/plan/* → /app before this renders. This stub redirects to /app directly as a
// belt-and-suspenders fallback.
export default function ProgressTrackingRedirect() {
  redirect('/app')
}
