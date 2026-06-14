import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Financial Information',
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return children
}
