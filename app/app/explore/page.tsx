import Link from 'next/link'

type ExploreActivityCardProps = {
  title: string
  description: string
  href?: string
  status?: 'available' | 'coming_soon'
  index: number
}

const CARD_STYLES = [
  { bg: 'bg-[#BBABF4]', text: 'text-[#130426]', pill: 'bg-[#130426] text-[#f8f4eb]' },
  { bg: 'bg-[#f8f4eb]', text: 'text-[#130426]', pill: 'bg-[#2C3777] text-[#f8f4eb]' },
  // Coral instead of navy — navy cards blend into the navy page background
  { bg: 'bg-[#DB5835]', text: 'text-[#130426]', pill: 'bg-[#130426] text-[#f8f4eb]' },
]

export default function ExplorePage() {
  return (
    <div className="min-h-screen bg-[#2C3777]">
      <div className="max-w-5xl mx-auto px-4 py-16">
        <div className="mb-12">
          <h1 className="text-[40px] font-bold leading-[1.2] text-white mb-4 underline decoration-[#f29836] decoration-[3px] underline-offset-[8px]">Explore</h1>
          <p className="text-[15px] text-white/80 max-w-2xl leading-relaxed">
            Work through guided activities that help you test ideas, clarify what
            matters, and create material you can return to later.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <ExploreActivityCard
            title="Values & Fears Ranking"
            description="Sort and prioritize what matters most to you — and what you most want to avoid — using a guided card-based activity."
            href="/app/explore/values-and-fears"
            status="available"
            index={0}
          />

          <ExploreActivityCard
            title="Scenario Navigator"
            description="Work through realistic situations to see how your values and preferences might apply in practice."
            href="/app/explore/scenario-navigator"
            status="available"
            index={1}
          />

          <ExploreActivityCard
  title="Legacy Map"
  description="Explore what you want to pass on, document, or make visible to others after your death."
  href="/app/explore/legacy-map"
  status="available"
  index={2}
/>
        </div>
      </div>
    </div>
  )
}

function ExploreActivityCard({
  title,
  description,
  href,
  status = 'available',
  index,
}: ExploreActivityCardProps) {
  const style = CARD_STYLES[index % CARD_STYLES.length]
  const isAvailable = status === 'available' && !!href

  const inner = (
    <div className={`rounded-2xl px-8 py-8 h-full ${style.bg} ${isAvailable ? 'transition hover:opacity-90' : 'opacity-50'}`}>
      <h2 className={`text-2xl font-bold mb-3 ${style.text}`}>{title}</h2>
      <p className={`text-base leading-relaxed mb-6 ${style.text}`}>{description}</p>
      <span className={`inline-block text-sm font-semibold rounded-full px-5 py-2 ${style.pill}`}>
        {isAvailable ? 'Begin →' : 'Coming soon'}
      </span>
    </div>
  )

  if (!isAvailable) return inner

  return <Link href={href!}>{inner}</Link>
}
