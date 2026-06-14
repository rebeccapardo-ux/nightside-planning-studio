import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Reflection Prompt',
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return children
}
