import Link from 'next/link'

const apfel = "'Apfel Grotezk', sans-serif"

// The Next-steps CTA on each Learn page — links to that area's page under Areas of
// Planning (the domain page, or the /app/plan/areas fallback). Replaces the old
// "Continue in Your Plan" panel; its relevant documents moved into the Relevant
// Activities panel. A lavender pill (ties to the Plan/Areas lavender) on the dark
// Next-steps background.
export default function DomainPlanningButton({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="hover:opacity-90 transition-opacity"
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 10, marginTop: 28,
        background: '#BBABF4', color: '#130426', fontFamily: apfel, fontSize: 20, fontWeight: 600,
        padding: '18px 34px', borderRadius: 999, textDecoration: 'none',
      }}
    >
      {label} →
    </Link>
  )
}
