// Navigation skeleton. The plan page is full cream (#F8F4EB) with its header
// rendered on the cream bg — no dark band — so a flat cream screen is the right
// mirror. Without this file the LayoutShell's bg-[#130426] (navy) was the only
// background visible during the route transition, producing a navy flash.
export default function PlanLoading() {
  return <div className="min-h-screen" style={{ background: '#F8F4EB' }} />
}
