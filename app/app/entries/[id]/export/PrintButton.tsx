'use client'

export default function PrintButton({ filename }: { filename?: string }) {
  function handlePrint() {
    if (filename) {
      const orig = document.title
      document.title = filename
      window.print()
      document.title = orig
    } else {
      window.print()
    }
  }

  return (
    <button
      onClick={handlePrint}
      className="text-sm text-[#130426]/70 border border-[#130426]/20 rounded-lg px-4 py-2 hover:bg-[#130426]/5 transition-colors"
    >
      Export as PDF
    </button>
  )
}
