import LayoutShell from '@/app/components/LayoutShell'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return <LayoutShell>{children}</LayoutShell>
}
