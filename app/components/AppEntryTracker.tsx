'use client'
import { useEffect } from 'react'

export default function AppEntryTracker() {
  useEffect(() => {
    fetch('/api/analytics/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ eventName: 'platform_entered' }),
    }).catch(() => {})
  }, [])

  return null
}
