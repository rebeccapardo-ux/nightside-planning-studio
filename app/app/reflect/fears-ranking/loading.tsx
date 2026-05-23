// Navigation skeleton: dark midnight banner band over the night-blue
// workspace, mirroring the real page's structure. Without this file the
// LayoutShell's bg-[#130426] was the only background visible during the
// route transition, producing a midnight-→-night colour shift the moment
// the page mounted.
export default function FearsRankingLoading() {
  return (
    <div className="min-h-screen" style={{ background: '#2C3777' }}>
      <div style={{ background: '#130426', minHeight: 180 }} />
    </div>
  )
}
