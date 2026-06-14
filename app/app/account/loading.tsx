// Navigation skeleton: the account page is full cream (#F8F4EB). Without this
// file the LayoutShell's bg-[#130426] (navy) was the only background during the
// route transition, producing a navy-→-cream flash. The in-component load gate
// then holds this same cream chrome (with the "My Account" heading) while the
// profile / contacts / recovery-email / release-prefs fetches resolve.
export default function AccountLoading() {
  return <div className="min-h-screen" style={{ background: '#F8F4EB' }} />
}
