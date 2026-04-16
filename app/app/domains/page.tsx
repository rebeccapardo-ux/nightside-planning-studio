'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { fetchDomainsWithCounts, type DomainWithCount } from '@/lib/notes'

const CARD_STYLES = [
  { bg: 'bg-[#BBABF4]', text: 'text-[#130426]', sub: 'text-[#2C3777]', pill: 'bg-[#130426] text-[#f8f4eb]' },
  { bg: 'bg-[#f8f4eb]',  text: 'text-[#130426]', sub: 'text-[#2C3777]', pill: 'bg-[#2C3777] text-[#f8f4eb]' },
  { bg: 'bg-[#2C3777]',  text: 'text-[#f8f4eb]', sub: 'text-[#BBABF4]', pill: 'bg-[#f8f4eb] text-[#130426]' },
  { bg: 'bg-[#f29836]',  text: 'text-[#130426]', sub: 'text-[#130426]', pill: 'bg-[#130426] text-[#f8f4eb]' },
  { bg: 'bg-[#DB5835]',  text: 'text-[#130426]', sub: 'text-[#130426]', pill: 'bg-[#130426] text-[#f8f4eb]' },
]

export default function DomainsPage() {
  const [domains, setDomains] = useState<DomainWithCount[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchDomainsWithCounts().then((data) => {
      setDomains(data)
      setLoading(false)
    })
  }, [])

  return (
    <div className="max-w-5xl mx-auto px-4 py-16">
      <h1 className="text-6xl font-bold text-[#f8f4eb] mb-4 underline decoration-[#f29836] decoration-[3px] underline-offset-[8px]">
        Domains
      </h1>
      <p className="text-[#f8f4eb] mb-12 leading-relaxed">
        Areas of planning where your materials are organized and developed.
      </p>

      {loading ? (
        <p className="text-[#f8f4eb]">Loading…</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {domains.map((domain, i) => {
            const style = CARD_STYLES[i % CARD_STYLES.length]
            return (
              <Link
                key={domain.id}
                href={`/app/domains/${domain.id}`}
                className={`block rounded-2xl px-8 py-8 transition hover:opacity-90 ${style.bg}`}
              >
                <div className={`text-2xl font-bold mb-2 ${style.text}`}>
                  {domain.title}
                </div>
                <div className={`text-sm mb-6 ${style.sub}`}>
                  {domain.noteCount === 0
                    ? 'No items yet'
                    : `${domain.noteCount} item${domain.noteCount === 1 ? '' : 's'}`}
                </div>
                <span className={`inline-block text-sm font-semibold rounded-full px-5 py-2 ${style.pill}`}>
                  Enter →
                </span>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
