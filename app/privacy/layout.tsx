import type { Metadata } from 'next'
import LayoutShell from '@/app/components/LayoutShell'

export const metadata: Metadata = {
  title: 'Privacy Policy',
}

export default function PrivacyLayout({ children }: { children: React.ReactNode }) {
  return <LayoutShell>{children}</LayoutShell>
}
