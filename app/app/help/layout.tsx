import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Help',
  description:
    'Help, documentation, and answers to common questions about using The Nightside Planning Studio.',
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return children
}
