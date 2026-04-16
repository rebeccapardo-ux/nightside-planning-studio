'use client'

export default function PrintButton() {
  return (
    <button
      onClick={() => window.print()}
      className="text-sm text-[#130426]/70 border border-[#130426]/20 rounded-lg px-4 py-2 hover:bg-[#130426]/5 transition-colors"
    >
      Export as PDF
    </button>
  )
}
