'use client'
import { Suspense, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import WelcomeModal from './WelcomeModal'

function ConfirmationModalInner() {
  const params = useSearchParams()
  // Lazy initializer runs once on first render — latches true before any re-render
  // triggered by URL cleanup, so the modal doesn't self-destruct.
  const [show] = useState(() => params.get('confirmed') !== null)

  useEffect(() => {
    if (show) window.history.replaceState({}, '', '/app')
  }, [show])

  if (!show) return null
  return <WelcomeModal />
}

export default function ConfirmationModal() {
  return (
    <Suspense>
      <ConfirmationModalInner />
    </Suspense>
  )
}
