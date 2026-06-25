import type { Metadata } from 'next'
import Link from 'next/link'
import SectionTitleReveal from '@/app/components/SectionTitleReveal'

export const metadata: Metadata = {
  title: 'Your Plan',
}

const apfel = "'Apfel Grotezk', sans-serif"
const inter = "'Helvetica Neue', Helvetica, Arial, sans-serif"

// /app/plan — the Plan section landing: a lightweight chooser between the two
// surfaces (Progress Tracking · Your Materials). The section root, so it gets the
// landing title treatment (SectionTitleReveal's orange reveal-underline) and no
// breadcrumb. Deliberately a chooser, not a content destination — no key details,
// null-state banner, or export here.
export default function PlanLandingPage() {
  return (
    <div className="min-h-screen" style={{ background: '#F8F4EB' }}>
      <style>{`
        .plan-chooser-card { transition: transform 150ms ease, box-shadow 150ms ease; }
        .plan-chooser-card:hover { transform: translateY(-2px); box-shadow: 0 10px 28px rgba(19,4,38,0.14); }
        @media (max-width: 767px) {
          .plan-chooser-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '64px 24px 96px' }}>
        <SectionTitleReveal title="Your Plan" color="#130426" size={64} />
        <p style={{ fontFamily: inter, fontSize: 18, color: 'rgba(19,4,38,0.72)', maxWidth: 560, margin: '20px 0 0', lineHeight: 1.6 }}>
          Your plan is made up of two spaces: one to track your progress, and one to hold all of your stuff.
        </p>

        <div className="plan-chooser-grid" style={{ marginTop: 44, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
          {/* Progress Tracking */}
          <Link
            href="/app/plan/progress"
            className="plan-chooser-card"
            style={{ display: 'block', background: '#BBABF4', borderRadius: 24, padding: 40, textDecoration: 'none', color: '#130426' }}
          >
            <h2 style={{ fontFamily: apfel, fontSize: 30, fontWeight: 600, lineHeight: 1.1, margin: 0 }}>
              Progress Tracking
            </h2>
            <p style={{ fontFamily: inter, fontSize: 17, lineHeight: 1.6, color: 'rgba(19,4,38,0.78)', margin: '16px 0 0', maxWidth: 380 }}>
              See your progress across each area of planning, and work through the tasks that matter to you.
            </p>
            <span style={{ display: 'inline-flex', alignItems: 'center', marginTop: 28, padding: '12px 22px', borderRadius: 999, background: '#2C3777', color: '#F8F4EB', fontFamily: inter, fontSize: 15, fontWeight: 500 }}>
              Begin →
            </span>
          </Link>

          {/* Your Materials */}
          <Link
            href="/app/plan/materials"
            className="plan-chooser-card"
            style={{ display: 'block', background: '#F29836', borderRadius: 24, padding: 40, textDecoration: 'none', color: '#130426' }}
          >
            <h2 style={{ fontFamily: apfel, fontSize: 30, fontWeight: 600, lineHeight: 1.1, margin: 0 }}>
              Your Materials
            </h2>
            <p style={{ fontFamily: inter, fontSize: 17, lineHeight: 1.6, color: 'rgba(19,4,38,0.78)', margin: '16px 0 0', maxWidth: 380 }}>
              All your notes and activity outputs, as well as documents to fill out.
            </p>
            <span style={{ display: 'inline-flex', alignItems: 'center', marginTop: 28, padding: '12px 22px', borderRadius: 999, background: '#2C3777', color: '#F8F4EB', fontFamily: inter, fontSize: 15, fontWeight: 500 }}>
              Begin →
            </span>
          </Link>
        </div>
      </div>
    </div>
  )
}
