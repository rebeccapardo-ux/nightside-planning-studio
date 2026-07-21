import Breadcrumbs from '@/app/components/navigation/Breadcrumbs'
import { BANNER_TOP_CLASS, BANNER_PADDING_BOTTOM } from '@/app/components/pageBanner'

const hv = "'Helvetica Neue', Helvetica, Arial, sans-serif"

// Shared header banner for capture documents (all except Keepsakes, which has a bespoke design).
// A full-bleed SUNSET (terracotta #DB5835) band — the "Your materials" section color — carrying
// the breadcrumb + doc title + instructions, formatted like the activity-page banners so
// documents read as consistent siblings of the activity sub-pages. Ink is cream #F8F4EB (the
// same color the homepage "Your materials" card uses on its terracotta fill / --section-on-accent
// for theme-materials). Breadcrumb always roots at "Your materials" (documents belong to Your
// materials regardless of where the user navigated in from).
//
// `maxWidth` matches the document's own content column so the title/instructions left-align with
// the fields below (720 for the practical docs; the wishes docs pass their wider max-w-6xl ≈ 1152).
// Instruction paragraphs are passed as children and should use cream ink via the exported
// `docBannerIntro` / `docBannerNote` style objects (primary + secondary weight).
export default function DocHeaderBanner({
  title, crumbLabel, docCategory, maxWidth = 1152, children,
}: {
  title: React.ReactNode
  crumbLabel: string
  // Middle breadcrumb — reinforces the surface type ("you're inside a document"). No page to
  // link to (the Wishes/Practical groups are panels on Your materials, not routes), so it's a
  // non-link label; the Breadcrumbs component renders a hrefless intermediate crumb muted.
  docCategory: 'wishes' | 'practical'
  maxWidth?: number
  children?: React.ReactNode
}) {
  const sectionCrumb = docCategory === 'wishes' ? 'Wishes documents' : 'Practical documents'
  return (
    <div style={{ background: '#DB5835', color: '#F8F4EB', paddingBottom: BANNER_PADDING_BOTTOM }}>
      <div className={BANNER_TOP_CLASS} style={{ maxWidth, marginLeft: 'auto', marginRight: 'auto', paddingLeft: 24, paddingRight: 24 }}>
        <Breadcrumbs
          theme="navy"
          items={[
            { label: 'Your materials', href: '/app/materials' },
            { label: sectionCrumb },
            { label: crumbLabel },
          ]}
        />
        <h1 className="ns-title-activity" style={{ marginTop: 24, marginBottom: 0 }}>{title}</h1>
        {children && <div style={{ marginTop: 20, maxWidth: 620 }}>{children}</div>}
      </div>
    </div>
  )
}

// Instruction paragraph styles for the sunset banner (cream ink). Exported so the doc pages
// style their moved-in instructions consistently.
export const docBannerIntro: React.CSSProperties = { fontFamily: hv, fontSize: 17, lineHeight: 1.55, fontWeight: 400, color: '#F8F4EB', margin: '0 0 16px' }
export const docBannerNote: React.CSSProperties = { fontFamily: hv, fontSize: 15, lineHeight: 1.5, fontWeight: 400, color: 'rgba(248,244,235,0.82)', margin: '0 0 16px' }
