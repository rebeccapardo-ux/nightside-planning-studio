// Navigation skeleton: the legacy-map page is a #2f3f8f blue workspace under a
// #130426 midnight banner band. Without this file the LayoutShell's bg-[#130426]
// (navy) was the only background during the route transition, producing a
// navy-→-blue flash the moment the page mounted. Mirrors the real page's chrome
// (the in-component isLoaded gate then holds this same chrome while data loads).
export default function LegacyMapLoading() {
  return (
    <div className="min-h-screen" style={{ background: '#2f3f8f' }}>
      <div style={{ background: '#130426', minHeight: 180 }} />
    </div>
  )
}
