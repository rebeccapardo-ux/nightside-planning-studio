// The `theme-materials` wrapper sets --section-accent (terracotta) for the whole Your-materials
// section (materials + export), so its banners/accents derive the section color. Transparent to
// layout; the pages keep their own metadata.
export default function Layout({ children }: { children: React.ReactNode }) {
  return <div className="theme-materials">{children}</div>
}
