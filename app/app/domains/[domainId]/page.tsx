'use client'

import { use } from 'react'
import AreaPlanSection from '@/app/components/area/AreaPlanSection'

// Legacy /app/domains/[domainId] route — kept working during the area-pages
// migration (parallel structure) by rendering the shared <AreaPlanSection> in its
// standalone 'domain' variant. Slated for removal in Phase 4 once the new
// /app/area/[slug] pages are validated; until then, content review still works here.
export default function DomainDetailPage({ params }: { params: Promise<{ domainId: string }> }) {
  const { domainId } = use(params)
  return <AreaPlanSection domainId={domainId} variant="domain" />
}
