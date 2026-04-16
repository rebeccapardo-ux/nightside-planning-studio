import Link from 'next/link'
import { LEARN_AREAS } from '@/lib/learn-areas'

export default function LearnAreasPage() {
  const areas = LEARN_AREAS.filter((a) => a.id !== 'admin')

  const CARD_STYLES = [
    { bg: 'bg-[#BBABF4]', text: 'text-[#130426]', pill: 'bg-[#130426] text-[#f8f4eb]' },
    { bg: 'bg-[#f29836]', text: 'text-[#130426]', pill: 'bg-[#130426] text-[#f8f4eb]' },
    { bg: 'bg-[#f8f4eb]', text: 'text-[#130426]', pill: 'bg-[#2C3777] text-[#f8f4eb]' },
    { bg: 'bg-[#2C3777]', text: 'text-[#f8f4eb]', pill: 'bg-[#f8f4eb] text-[#130426]' },
    { bg: 'bg-[#DB5835]', text: 'text-[#130426]', pill: 'bg-[#130426] text-[#f8f4eb]' },
    { bg: 'bg-[#BBABF4]', text: 'text-[#130426]', pill: 'bg-[#2C3777] text-[#f8f4eb]' },
  ]

  return (
    <div className="max-w-5xl mx-auto px-4 py-16">
      <Link href="/app/learn" className="text-[#f8f4eb] hover:text-[#BBABF4] transition-colors text-sm">
        ← Back to Learn
      </Link>

      <div className="mt-8 mb-12">
        <h1 className="text-[40px] font-bold leading-[1.2] text-white mb-4 underline decoration-[#f29836] decoration-[3px] underline-offset-[8px]">Areas of planning</h1>
        <p className="text-[15px] text-app-body leading-relaxed">
          Explore key areas of end-of-life planning and understand your options.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        {areas.map((area, i) => {
          const style = CARD_STYLES[i % CARD_STYLES.length]
          return (
            <Link
              key={area.id}
              href={`/app/learn/${area.id}`}
              className={`block rounded-2xl px-8 py-8 transition hover:opacity-90 ${style.bg}`}
            >
              <div className={`text-2xl font-bold mb-3 ${style.text}`}>
                {area.title}
              </div>
              <div className={`text-base leading-relaxed mb-6 ${style.text}`}>
                {area.description}
              </div>
              <span className={`inline-block text-sm font-semibold rounded-full px-5 py-2 ${style.pill}`}>
                Explore →
              </span>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
