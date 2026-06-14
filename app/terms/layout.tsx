import type { Metadata } from 'next'
import LayoutShell from '@/app/components/LayoutShell'

export const metadata: Metadata = {
  title: 'Terms of Service',
}

export default function TermsLayout({ children }: { children: React.ReactNode }) {
  return <LayoutShell>{children}</LayoutShell>
}
