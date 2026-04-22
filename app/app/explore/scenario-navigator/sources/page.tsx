import Link from 'next/link'
import { SOURCES } from '@/lib/scenario-navigator-data'

export default function ScenarioNavigatorSourcesPage() {
  const sources = Object.values(SOURCES)

  return (
    <div className="max-w-3xl mx-auto px-4 py-16">
      <Link
        href="/app/explore/scenario-navigator"
        className="text-[#f8f4eb] hover:text-[#BBABF4] transition-colors text-sm"
      >
        ← Back to Scenario Navigator
      </Link>

      <div className="mt-8 mb-12">
        <h1 className="ns-title-internal text-[#f8f4eb]">Sources</h1>
        <p className="ns-lead-internal text-[#f8f4eb]" style={{ marginTop: '12px' }}>
          References for the factual claims and statistics cited in the Scenario
          Navigator.
        </p>
      </div>

      <ul className="space-y-6">
        {sources.map((source) => (
          <li key={source.id} className="rounded-2xl bg-[#2C3777] px-7 py-6">
            <p className="text-[#f8f4eb] leading-relaxed mb-3">
              {source.citation}
            </p>
            <a
              href={source.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-[#BBABF4] hover:text-[#f8f4eb] transition-colors break-all underline underline-offset-2"
            >
              {source.url}
            </a>
          </li>
        ))}
      </ul>
    </div>
  )
}
