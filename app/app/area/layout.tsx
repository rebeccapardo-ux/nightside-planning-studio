// The `theme-area` wrapper sets --section-accent (lavender) for the whole Plan-by-area
// section (landing + area sub-pages), so its banners/accents derive the section color.
// Transparent to layout; the pages keep their own metadata.
export default function Layout({ children }: { children: React.ReactNode }) {
  return <div className="theme-area">{children}</div>
}
