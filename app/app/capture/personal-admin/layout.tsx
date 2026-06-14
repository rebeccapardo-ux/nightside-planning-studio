import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Personal Admin Information',
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return children
}
