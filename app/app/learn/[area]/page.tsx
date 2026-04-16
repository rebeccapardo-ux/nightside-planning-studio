import { notFound } from 'next/navigation'
import { LEARN_AREAS } from '@/lib/learn-areas'

type LearnAreaPageProps = {
  params: Promise<{
    area: string
  }>
}

export default async function LearnAreaPage({ params }: LearnAreaPageProps) {
  const { area: areaId } = await params
  const area = LEARN_AREAS.find((item) => item.id === areaId)

  if (!area) {
    notFound()
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-16">
      <h1 className="text-[40px] font-bold leading-[1.2] text-white mb-4 underline decoration-[#f29836] decoration-[3px] underline-offset-[8px]">
        {area.title}
      </h1>

      <p className="text-[15px] text-app-body leading-relaxed mb-10">
        {area.description}
      </p>

      <div className="mb-10">
        <h2 className="text-[20px] font-semibold tracking-[0.02em] text-white mb-4">
          Key considerations
        </h2>

        <ul className="space-y-3">
          {area.keyPoints.map((point) => (
            <li key={point} className="flex items-start gap-3 text-[15px] text-app-body leading-snug">
              <span className="text-[#BBABF4] mt-0.5 shrink-0 select-none">·</span>
              {point}
            </li>
          ))}
        </ul>
      </div>

      <div className="space-y-3">
        {area.resources.canadaWide && (
          <a
            href={area.resources.canadaWide}
            className="block text-[#f29836] text-[15px] hover:underline"
          >
            View Canada-wide resources →
          </a>
        )}

        {area.resources.provinceSpecific && (
          <a
            href={area.resources.provinceSpecific}
            className="block text-[#f29836] text-[15px] hover:underline"
          >
            View province-specific resources →
          </a>
        )}

        {area.resources.cultural && (
          <a
            href={area.resources.cultural}
            className="block text-[#f29836] text-[15px] hover:underline"
          >
            View culturally sensitive resources →
          </a>
        )}

        {area.resources.templates && (
          <a
            href={area.resources.templates}
            className="block text-[#f29836] text-[15px] hover:underline"
          >
            View templates →
          </a>
        )}
      </div>
    </div>
  )
}