import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Values and Fears',
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return children
}
