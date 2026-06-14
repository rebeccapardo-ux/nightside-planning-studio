import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'My Care Wishes',
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return children
}
