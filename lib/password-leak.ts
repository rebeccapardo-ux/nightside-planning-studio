import crypto from 'node:crypto'

// Leaked-password check via the HIBP Pwned Passwords range API (k-anonymity): we
// SHA-1 the password and send only the first 5 hex chars — never the password or
// the full hash — then scan the returned suffix list. Shared by the password-change
// route (Phase 3) and the lost-email recovery route (Phase 4) so neither flow is a
// backdoor around leaked-password protection (which the admin write bypasses).
//
// **Fail-OPEN**: a HIBP outage must not block a legitimate password set (matches
// Supabase's own behavior and our legitimate-user-access threat-model bias).
export async function isPasswordLeaked(password: string): Promise<boolean> {
  try {
    const hash   = crypto.createHash('sha1').update(password).digest('hex').toUpperCase()
    const prefix = hash.slice(0, 5)
    const suffix = hash.slice(5)
    const res = await fetch(`https://api.pwnedpasswords.com/range/${prefix}`, {
      headers: { 'Add-Padding': 'true' }, // pad the response so its size can't leak the count
    })
    if (!res.ok) return false
    const text = await res.text()
    return text.split('\n').some(line => line.split(':')[0]?.trim().toUpperCase() === suffix)
  } catch {
    return false // fail-open
  }
}
