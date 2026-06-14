// Shared navigation skeleton for all six /app/learn/* area pages. They share an
// identical top structure: a #2C3777 navy hero band over a #F8F4EB cream body.
// Without a loading.tsx the LayoutShell's bg-[#130426] (navy) was the only
// background visible during the route transition, producing a navy flash.
// This skeleton paints the real page's two background regions so the transition
// is visually continuous. Re-exported by each learn area's loading.tsx.
export default function LearnLoading() {
  return (
    <div className="min-h-screen" style={{ background: '#F8F4EB' }}>
      <div style={{ background: '#2C3777', minHeight: 180 }} />
    </div>
  )
}
