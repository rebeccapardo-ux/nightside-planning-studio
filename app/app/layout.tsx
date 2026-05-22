import LayoutShell from '@/app/components/LayoutShell'
import AppEntryTracker from '@/app/components/AppEntryTracker'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <LayoutShell>
      <AppEntryTracker />
      {children}
    </LayoutShell>
  )
}
