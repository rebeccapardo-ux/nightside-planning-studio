// Rendered automatically by Next.js between route navigation start and the
// client component mounting + fetching data. Without this file, the parent
// LayoutShell's bg-[#130426] (navy) was the only background visible during
// the transition, producing a navy flash on every domain page click.
//
// This skeleton mirrors the dark gradient header band + lavender body the
// real page renders, so the transition is visually continuous.
export default function DomainLoading() {
  return (
    <div className="min-h-screen" style={{ background: '#EDE7FF' }}>
      <div
        style={{
          background: 'radial-gradient(circle at 20% 20%, #1a0535 0%, #130426 70%)',
          minHeight: 180,
        }}
      />
    </div>
  )
}
