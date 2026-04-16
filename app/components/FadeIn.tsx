'use client'

import { useEffect, useState } from 'react'

export default function FadeIn({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    // rAF ensures the initial hidden state is painted before transitioning
    const id = requestAnimationFrame(() => setVisible(true))
    return () => cancelAnimationFrame(id)
  }, [])

  return (
    <div
      className={className}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(10px)',
        transition: 'opacity 0.45s ease, transform 0.45s ease',
      }}
    >
      {children}
    </div>
  )
}
