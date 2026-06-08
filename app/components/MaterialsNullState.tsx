import Link from 'next/link'

const hv = "'Helvetica Neue', Helvetica, Arial, sans-serif"

// Shown in the wishes-docs "Relevant materials" panel when it has NOTHING to show
// (no recommended and no other materials — i.e. no tagged notes/activity outputs and
// nothing manually added). Manually-added materials land in the "other" tail, so they
// keep the panel non-empty and this never fires for them.
export default function MaterialsNullState() {
  const linkStyle: React.CSSProperties = {
    color: '#130426',
    textDecoration: 'underline',
    textUnderlineOffset: '2px',
    fontWeight: 500,
  }
  return (
    <p
      style={{
        fontFamily: hv,
        fontSize: 13,
        lineHeight: '20px',
        color: 'rgba(19,4,38,0.62)',
        margin: 0,
      }}
    >
      No materials yet. Try working through some{' '}
      <Link href="/app/reflect" className="hover:opacity-70 transition-opacity" style={linkStyle}>
        reflect activities
      </Link>{' '}
      and{' '}
      <Link href="/app/learn" className="hover:opacity-70 transition-opacity" style={linkStyle}>
        learn sections
      </Link>{' '}
      — as you write notes and complete activities, relevant materials will appear here.
    </p>
  )
}
