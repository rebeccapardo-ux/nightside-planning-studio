'use client'
import { useEffect } from 'react'

export default function AppEntryTracker() {
  useEffect(() => {
    const track = (eventName: string) =>
      fetch('/api/analytics/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventName }),
      }).catch(() => {})

    track('platform_entered')
    track('return_visit')
  }, [])

  return null
}
