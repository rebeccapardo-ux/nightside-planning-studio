import type { Metadata } from 'next'
import Link from 'next/link'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import Breadcrumbs from '@/app/components/navigation/Breadcrumbs'
import { DOCUMENT_TYPE_META } from '@/lib/content-metadata'
import DomainPlanningButton from '@/app/components/DomainPlanningButton'
import { ActivityIcon, DocumentIcon } from '@/app/components/LearnNextStepsIcons'


export const metadata: Metadata = {
  title: "Learn: Legacy",
}

export default async function LegacyLearnPage() {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  let legacyDomainHref = '/app/plan/areas'
  if (user) {
    const { data: domains } = await supabase
      .from('containers')
      .select('id, title')
      .eq('type', 'domain')
      .eq('domain_code', 'legacy')
      .limit(1)
    if (domains && domains.length > 0) {
      legacyDomainHref = `/app/domains/${domains[0].id}`
    }
  }

  const apfel = "'ApfelGrotezk', sans-serif"
  const hv = "'Helvetica Neue', Helvetica, Arial, sans-serif"
  const inner = { maxWidth: '1280px', marginLeft: 'auto' as const, marginRight: 'auto' as const }

  return (
    <>
      <style>{`
        .lg-activity-row {
          display: flex;
          align-items: center;
          padding: 16px 20px;
          border-radius: 12px;
          background: rgba(0,0,0,0.06);
          text-decoration: none;
          transition: background 150ms ease;
        }
        .lg-activity-row:hover {
          background: rgba(0,0,0,0.12);
        }
        .lg-activity-row:hover .lg-arrow {
          transform: translateX(4px);
        }
        .lg-arrow {
          font-size: 18px;
          opacity: 0.6;
          transition: transform 150ms ease;
          flex-shrink: 0;
        }
        .lg-source-link {
          font-size: 13px;
          color: var(--color-sunset-deep);
          text-decoration: underline;
          text-underline-offset: 2px;
          margin-left: 4px;
          white-space: nowrap;
        }
        .lg-source-link:hover {
          color: #130426;
        }
        @media (max-width: 767px) {
          .learn-next-steps-row { grid-template-columns: 1fr !important; gap: 20px !important; }
        }
      `}</style>

      <div>

        {/* ── 1. HERO ── navy */}
        <section style={{ background: '#2C3777' }}>
          <div className="px-5 md:px-16" style={{ ...inner, paddingTop: '80px', paddingBottom: '88px' }}>

            <div style={{ marginBottom: 24 }}>
              <Breadcrumbs
                theme="navy"
                items={[
                  { label: 'Learn', href: '/app/learn' },
                  { label: 'Legacy' },
                ]}
              />
            </div>

            <h1 className="ns-title-activity" style={{ color: '#FFFFFF', margin: '0 0 16px 0' }}>
              Legacy
            </h1>

            <p className="ns-lead-activity" style={{ color: '#FFFFFF', maxWidth: '680px', marginBottom: '24px' }}>
              The word &ldquo;legacy&rdquo; can feel like it belongs only to people with long careers, complicated estates, or their names on buildings. But legacy belongs to everyone, and can include simple things like the way you made people laugh, or a story you told that resonated with someone.
            </p>
            <p className="ns-lead-activity" style={{ color: '#FFFFFF', maxWidth: '680px' }}>
              Legacy planning is the practice of consciously reflecting on what you want to leave behind, and doing that reflecting while you&apos;re still here to shape it. This can mean creating artifacts, like writing letters, recording stories, or other projects. It can also mean simply deciding how you want your values and relationships to be remembered, and having intentional conversations to share this with the people in your life.
            </p>

          </div>
        </section>

        {/* ── 2. WHY THIS MATTERS ── cream, single column */}
        <section style={{ width: '100%', background: '#F8F4EB', paddingTop: '72px', paddingBottom: '72px' }}>
          <div className="px-5 md:px-16" style={{ maxWidth: '1180px', marginLeft: 'auto', marginRight: 'auto' }}>

            <h2 style={{ fontFamily: apfel, fontSize: '36px', fontWeight: 600, lineHeight: '1.05', color: '#130426', marginTop: 0, marginBottom: '36px' }}>
              Why this matters
            </h2>

            <div style={{ maxWidth: '640px' }}>
              <p style={{ fontFamily: hv, fontSize: '18px', lineHeight: '1.7', color: '#130426', marginTop: 0, marginBottom: '24px' }}>
                Without intentional reflection, the most meaningful parts of a life often go undocumented, or may be interpreted by others after the fact. Legacy work is a way of telling your own story, in your own words, on your own terms.
              </p>
              <p style={{ fontFamily: hv, fontSize: '18px', lineHeight: '1.7', color: '#130426', marginTop: 0, marginBottom: '24px' }}>
                Psychologist David Kessler, who collaborated with Elisabeth K&uuml;bler-Ross, identified <strong style={{ fontWeight: 600 }}>meaning-making as a distinct part of how we process loss</strong> — not just for those left behind, but for the person dying. Shifting focus from a life being lost to a life that has been lived is one of the more significant things legacy work can do.
              </p>
              <p style={{ fontFamily: hv, fontSize: '18px', lineHeight: '1.7', color: '#130426', marginTop: 0, marginBottom: 0 }}>
                It also tends to change the quality of conversations. People who engage in this kind of reflection often find themselves having exchanges with family that wouldn&apos;t have happened otherwise, hearing stories for the first time, or finally saying things that had gone unsaid.
              </p>
            </div>

            {/* Did You Know? panel */}
            <div style={{ marginTop: '48px', maxWidth: '640px', background: '#FFFFFF', borderRadius: '16px', padding: '32px 36px' }}>
              <div style={{ fontFamily: hv, fontSize: '14px', fontWeight: 700, letterSpacing: '0.1em', color: '#130426', textTransform: 'uppercase', marginBottom: '16px' }}>
                Did You Know?
              </div>
              <p style={{ fontFamily: hv, fontSize: '16px', lineHeight: '1.7', color: '#130426', marginTop: 0, marginBottom: '16px' }}>
                Research on legacy work in end-of-life care has found that <strong style={{ fontWeight: 600 }}>people who engage in structured life reflection experience reduced anticipatory grief</strong>. Families report feeling more connected to the dying person, and less anxious about what&apos;s ahead.
              </p>
              <p style={{ fontFamily: hv, fontSize: '16px', lineHeight: '1.7', color: '#130426', marginTop: 0, marginBottom: 0 }}>
                In some studies, people who engaged in meaning-making practices reported that physical symptoms, such as pain and difficulty breathing, felt more manageable, likely connected to reduced psychological distress.<a href="https://pmc.ncbi.nlm.nih.gov/articles/PMC2664509/" target="_blank" rel="noopener noreferrer" className="lg-source-link">[source]</a>
              </p>
            </div>

          </div>
        </section>

        {/* ── 3. WHAT LEGACY WORK CAN LOOK LIKE ── cream */}
        <section style={{ width: '100%', background: '#F8F4EB', borderTop: '1px solid rgba(19,4,38,0.08)', paddingTop: '72px', paddingBottom: '72px' }}>
          <div className="px-5 md:px-16" style={{ maxWidth: '1180px', marginLeft: 'auto', marginRight: 'auto' }}>

            <h2 style={{ fontFamily: apfel, fontSize: '36px', fontWeight: 600, lineHeight: '1.05', color: '#130426', marginTop: 0, marginBottom: '36px' }}>
              What legacy work can look like
            </h2>

            <div style={{ maxWidth: '640px' }}>
              <p style={{ fontFamily: hv, fontSize: '18px', lineHeight: '1.7', color: '#130426', marginTop: 0, marginBottom: '24px' }}>
                There are no rules, and no required format. Legacy work is whatever is meaningful to the person doing it.
              </p>
              <p style={{ fontFamily: hv, fontSize: '18px', lineHeight: '1.7', color: '#130426', marginTop: 0, marginBottom: '24px' }}>
                Some people write letters for milestones they won&apos;t be present for, or to say things that might otherwise go unsaid. Some record audio or video, telling stories in their own voice. Others make something physical: a collection of recipes, a quilt from meaningful clothing, a hand casting made together with someone they love. Cultural traditions like altars or shrines offer their own form of legacy-making, as do scholarships, dedicated benches, or causes given in someone&apos;s name.
              </p>
              <p style={{ fontFamily: hv, fontSize: '18px', lineHeight: '1.7', color: '#130426', marginTop: 0, marginBottom: '24px' }}>
                There&apos;s no single right time to begin. Some people start years before any illness, others at diagnosis, while others return to it in pieces over time. If you&apos;re living with a serious illness, it&apos;s worth starting sooner rather than later, while you have the most energy and clarity to shape it.
              </p>
              <p style={{ fontFamily: hv, fontSize: '18px', lineHeight: '1.7', color: '#130426', marginTop: 0, marginBottom: 0 }}>
                Legacy work often surfaces memories and clarifies priorities. It&apos;s often worth doing with someone rather than alone, because the conversations it opens with the people around you can be as meaningful as whatever tangible outputs get created.
              </p>
            </div>

          </div>
        </section>

        {/* ── 4. NEXT STEPS ── deep purple */}
        <section style={{ width: '100%', background: '#130426', paddingTop: '104px', paddingBottom: '104px' }}>
          <div className="px-5 md:px-16" style={inner}>

            <h2 style={{ fontFamily: apfel, fontSize: '44px', fontWeight: 600, lineHeight: '1.12', letterSpacing: '0.01em', color: '#FFFFFF', marginBottom: '12px' }}>
              Next steps
            </h2>
            <p style={{ fontFamily: hv, fontSize: '16px', fontWeight: 400, lineHeight: '1.5', color: 'rgba(255,255,255,0.90)', maxWidth: '620px', marginBottom: '40px' }}>
              Use these activities and resources to keep moving in your legacy planning.
            </p>

            {/* Single panel + CTA to its right (Legacy has no Explore-resources card,
                so the button fills the second column rather than sitting underneath). */}
            <div className="learn-next-steps-row" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '24px' }}>
              <div style={{ background: '#F29836', borderRadius: '24px', padding: '36px' }}>
                <h3 style={{ fontFamily: apfel, fontSize: '28px', fontWeight: 600, lineHeight: '1.2', color: '#130426', marginBottom: '20px' }}>
                  Relevant Activities and Documents
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {[
                    { href: '/app/activities/legacy-map', label: 'Legacy Map', type: 'activity' },
                    { href: DOCUMENT_TYPE_META.advance_directive_supplement.href, label: DOCUMENT_TYPE_META.advance_directive_supplement.label, type: 'document' },
                    { href: DOCUMENT_TYPE_META.keepsake_inventory.href, label: DOCUMENT_TYPE_META.keepsake_inventory.label, type: 'document' },
                  ].map(({ href, label, type }) => (
                    <Link key={label} href={href} className="lg-activity-row" style={{ display: 'flex', width: '100%' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '10px' }}>
                        {type === 'document' ? <DocumentIcon /> : <ActivityIcon />}
                        <span style={{ fontFamily: hv, fontSize: '18px', fontWeight: 500, lineHeight: '1.5', color: '#130426' }}>
                          {label}
                        </span>
                        <span className="lg-arrow" style={{ color: '#130426', fontSize: '18px', opacity: 0.6 }}>→</span>
                      </span>
                    </Link>
                  ))}
                </div>
              </div>
              {/* CTA into this area's planning page (Areas of Planning) */}
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <DomainPlanningButton href={legacyDomainHref} label="Legacy Planning" marginTop={0} />
              </div>
            </div>

          </div>
        </section>

      </div>
    </>
  )
}
