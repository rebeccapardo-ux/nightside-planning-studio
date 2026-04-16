import Link from 'next/link'

export default function LearnPage() {
  return (
    <div className="min-h-screen bg-[#f29836]">
      <div className="max-w-5xl mx-auto px-4 py-16">
        <h1 className="text-[40px] font-bold leading-[1.2] text-[#130426] mb-4 underline decoration-[#130426] decoration-[3px] underline-offset-[8px]">Learn</h1>
        <p className="text-[15px] text-[#130426]/80 mb-14 leading-relaxed">
          Choose how you want to engage.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">

          {/* Option 1 — Trivia: active, game-based */}
          <Link
            href="/app/learn/trivia"
            className="block rounded-2xl bg-[#130426] px-10 py-10 transition hover:opacity-90"
          >
            <div className="text-xs font-bold uppercase tracking-widest text-white mb-6 opacity-50">
              Interactive
            </div>
            <h2 className="text-3xl font-bold text-white mb-4 leading-snug">
              Deathcare Trivia
            </h2>
            <p className="text-base text-white leading-relaxed mb-10">
              A game-based way to learn. Test what you know, discover what you don't.
            </p>
            <span className="inline-block rounded-full bg-[#f29836] text-[#130426] px-5 py-2 text-sm font-semibold">
              Play →
            </span>
          </Link>

          {/* Option 2 — Topics: informational, exploratory */}
          <Link
            href="/app/learn/areas"
            className="block rounded-2xl bg-[#2C3777] px-10 py-10 transition hover:opacity-90"
          >
            <div className="text-xs font-bold uppercase tracking-widest text-white mb-6 opacity-70">
              Exploratory
            </div>
            <h2 className="text-3xl font-bold text-white mb-4 leading-snug">
              Explore areas of planning
            </h2>
            <p className="text-base text-white leading-relaxed mb-10">
              Read about healthcare, wills, deathcare, legacy, and more — at your own pace.
            </p>
            <span className="inline-block rounded-full bg-[#f8f4eb] text-[#130426] px-5 py-2 text-sm font-semibold">
              Browse →
            </span>
          </Link>

        </div>
      </div>
    </div>
  )
}
