import { redirect } from 'next/navigation'

// "Progress Tracking" was renamed to "Areas of Planning" and moved to
// /app/plan/areas. This stub keeps old bookmarks/links to /app/plan/progress
// working by redirecting to the new path.
export default function ProgressTrackingRedirect() {
  redirect('/app/plan/areas')
}
