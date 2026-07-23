import type { Metadata } from 'next'
import Link from 'next/link'
import LandingContainer from '@/app/components/LandingContainer'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { ensureCanonicalDomains } from '@/lib/ensure-canonical-domains'
import { AREAS } from '@/lib/areas'
import { LEARN_AREAS } from '@/lib/learn-areas'
import SectionTitleReveal from '@/app/components/SectionTitleReveal'
import AreaIcon from '@/app/components/AreaIcon'

export const metadata: Metadata = {
  title: 'Plan by area',
}

const hv = "'Helvetica Neue', Helvetica, Arial, sans-serif"

// Short per-area blurb, from the canonical Learn-area config (matched on learnId).
function areaDescription(learnId: string): string {
  return LEARN_AREAS.find((a) => a.id === learnId)?.description ?? ''
}

// Plan by area landing — orientation entry point for the six area pages. Header treatment
// matches the Activities landing + Your materials (SectionTitleReveal on cream + navy nav);
// the six area cards mirror the Activities landing's card style, unified in Dusk.
export default async function PlanByAreaPage() {
  // Primary entry point — seed canonical domain containers (idempotent) so the area pages
  // this links to resolve.
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (user) await ensureCanonicalDomains(supabase, user.id)

  return (
    <div style={{ minHeight: '100vh', background: '#F8F4EB' }}>
      <style>{`
        .pba-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 24px; margin-top: 48px; }
        @media (max-width: 640px) { .pba-grid { grid-template-columns: 1fr; } }
        .pba-card { border: 2px solid #000000; box-shadow: 6px 6px 0 rgba(0,0,0,0.75); transition: transform 140ms ease, box-shadow 140ms ease; }
        .pba-card:hover { transform: translateY(-3px); box-shadow: 8px 8px 0 rgba(0,0,0,0.88); }
      `}</style>

      <LandingContainer>
        <SectionTitleReveal title="Plan by area" color="#130426" underlineColor="#DB5835" />

        <div style={{ maxWidth: 720, marginTop: 20 }}>
          <p style={{ fontFamily: hv, fontSize: 18, lineHeight: 1.7, color: 'rgba(19,4,38,0.85)', margin: '0 0 18px' }}>
            End-of-life planning involves reflection and conversation as well as practical decisions and documentation. This is where you&rsquo;ll work through each area of planning.
          </p>
          <p style={{ fontFamily: hv, fontSize: 18, lineHeight: 1.7, color: 'rgba(19,4,38,0.85)', margin: 0 }}>
            You should periodically revisit this section to ensure your decisions and documentation are up-to-date, particularly as your circumstances, values, or relationships change.
          </p>
        </div>

        <div className="pba-grid">
          {AREAS.map((area) => (
            <Link
              key={area.slug}
              href={`/app/area/${area.slug}`}
              className="pba-card"
              style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: 220, padding: 32, borderRadius: 20, background: '#BBABF4', textDecoration: 'none' }}
            >
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                  <h2 style={{ fontFamily: hv, fontSize: 24, fontWeight: 600, lineHeight: 1.2, color: '#130426', margin: 0 }}>{area.title}</h2>
                  {/* Area identity icon — top-right, mirrors ActivityIcon on the Activities cards. */}
                  <AreaIcon slug={area.slug} size={31} color="#130426" />
                </div>
                <p style={{ fontFamily: hv, fontSize: 16, fontWeight: 400, lineHeight: 1.55, color: 'rgba(19,4,38,0.78)', margin: '12px 0 0' }}>{areaDescription(area.learnId)}</p>
              </div>
              <span style={{ marginTop: 24, height: 48, paddingLeft: 24, paddingRight: 24, borderRadius: 999, fontSize: 14, fontWeight: 500, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: '#130426', color: '#FFFFFF', alignSelf: 'flex-start', fontFamily: hv }}>Open →</span>
            </Link>
          ))}
        </div>
      </LandingContainer>
    </div>
  )
}
