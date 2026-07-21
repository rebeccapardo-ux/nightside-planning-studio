import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Activities',
}

// The `theme-activities` wrapper sets --section-accent (sunrise) for the whole Activities
// section, so its banners/accents derive the section color. Transparent to layout.
export default function Layout({ children }: { children: React.ReactNode }) {
  return <div className="theme-activities">{children}</div>
}
