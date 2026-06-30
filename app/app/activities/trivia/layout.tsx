import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Deathcare Trivia',
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return children
}
