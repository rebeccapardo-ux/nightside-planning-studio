import Link from 'next/link'

const SECTION_CARDS = [
  {
    href: '/app/reflect',
    title: 'Reflect',
    description: 'Surface your values, fears, and assumptions',
    bg: 'bg-[#BBABF4]',
    text: 'text-[#130426]',
    pill: 'bg-[#130426] text-[#f8f4eb]',
  },
  {
    href: '/app/learn',
    title: 'Learn',
    description: 'Understand your options and planning areas',
    bg: 'bg-[#2C3777]',
    text: 'text-[#f8f4eb]',
    pill: 'bg-[#f8f4eb] text-[#130426]',
  },
  {
    href: '/app/explore',
    title: 'Explore',
    description: 'Work through realistic scenarios',
    bg: 'bg-[#DB5835]',
    text: 'text-[#130426]',
    pill: 'bg-[#130426] text-[#f8f4eb]',
  },
  {
    href: '/app/capture',
    title: 'Capture',
    description: 'Document your wishes and important details',
    bg: 'bg-[#f29836]',
    text: 'text-[#130426]',
    pill: 'bg-[#130426] text-[#f8f4eb]',
  },
]

export default function AppHomePage() {
  return (
    <div className="min-h-screen bg-[#f8f4eb]">
      <div className="max-w-6xl mx-auto px-4 py-16">
        <div className="mb-16">
          <h1 className="text-h1 text-[#130426] mb-4">
            Welcome to your Planning Studio
          </h1>
          <p className="text-body text-[#130426] max-w-2xl">
            This is a space to reflect, learn, explore possibilities, and capture what matters to you.
            You can start anywhere and move at your own pace.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
          {SECTION_CARDS.map((card) => (
            <Link
              key={card.href}
              href={card.href}
              className={`flex flex-col rounded-2xl px-6 py-8 transition hover:opacity-90 ${card.bg}`}
            >
              <h2 className={`text-h3 mb-2 ${card.text}`}>{card.title}</h2>
              <p className={`text-body mb-6 flex-1 ${card.text}`}>{card.description}</p>
              <span className={`self-start inline-block text-small font-medium rounded-full px-4 py-1.5 ${card.pill}`}>
                Enter →
              </span>
            </Link>
          ))}
        </div>

        <Link
          href="/app/materials"
          className="block rounded-2xl bg-[#130426] px-8 py-8 transition hover:opacity-90"
        >
          <h2 className="text-h3 text-[#f8f4eb] mb-2">My Materials</h2>
          <p className="text-body text-[#f8f4eb] mb-6">
            Everything you've created, in one place. Revisit, refine, or prepare to share.
          </p>
          <span className="inline-block text-small font-medium rounded-full bg-[#f8f4eb] text-[#130426] px-4 py-1.5">
            View →
          </span>
        </Link>
      </div>
    </div>
  )
}
