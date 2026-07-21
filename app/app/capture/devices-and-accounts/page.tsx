'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { DOCUMENT_TYPE_META } from '@/lib/content-metadata'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createSupabaseBrowserClient } from '@/lib/supabase-browser'
import { SECTION_SCROLL_MARGIN_TOP, holdSavingIndicator } from '@/lib/ui'
import AlertIcon from '@/app/components/AlertIcon'
import ExportFieldHelper from '@/app/components/ExportFieldHelper'
import AutosaveNotice from '@/app/components/AutosaveNotice'
import DocHeaderBanner, { docBannerIntro, docBannerNote } from '@/app/components/capture/DocHeaderBanner'

const DOCUMENT_TYPE = DOCUMENT_TYPE_META.devices_and_accounts.code
const DOCUMENT_TITLE = DOCUMENT_TYPE_META.devices_and_accounts.label

type FormState = {
  device1Name: string; device1LoginAccount: string; device1PasswordPin: string; device1Notes: string
  device2Name: string; device2LoginAccount: string; device2PasswordPin: string; device2Notes: string
  device3Name: string; device3LoginAccount: string; device3PasswordPin: string; device3Notes: string
  device4Name: string; device4LoginAccount: string; device4PasswordPin: string; device4Notes: string
  device5Name: string; device5LoginAccount: string; device5PasswordPin: string; device5Notes: string
  socialMedia1Platform: string; socialMedia1Username: string; socialMedia1Password: string; socialMedia1WishesOnDeath: string
  socialMedia2Platform: string; socialMedia2Username: string; socialMedia2Password: string; socialMedia2WishesOnDeath: string
  socialMedia3Platform: string; socialMedia3Username: string; socialMedia3Password: string; socialMedia3WishesOnDeath: string
  socialMedia4Platform: string; socialMedia4Username: string; socialMedia4Password: string; socialMedia4WishesOnDeath: string
  socialMedia5Platform: string; socialMedia5Username: string; socialMedia5Password: string; socialMedia5WishesOnDeath: string
  otherAccount1Name: string; otherAccount1Username: string; otherAccount1Password: string; otherAccount1Notes: string
  otherAccount2Name: string; otherAccount2Username: string; otherAccount2Password: string; otherAccount2Notes: string
  otherAccount3Name: string; otherAccount3Username: string; otherAccount3Password: string; otherAccount3Notes: string
  otherAccount4Name: string; otherAccount4Username: string; otherAccount4Password: string; otherAccount4Notes: string
  otherAccount5Name: string; otherAccount5Username: string; otherAccount5Password: string; otherAccount5Notes: string
  digitalAsset1Name: string; digitalAsset1AccessDetails: string; digitalAsset1Location: string; digitalAsset1Notes: string
  digitalAsset2Name: string; digitalAsset2AccessDetails: string; digitalAsset2Location: string; digitalAsset2Notes: string
  digitalAsset3Name: string; digitalAsset3AccessDetails: string; digitalAsset3Location: string; digitalAsset3Notes: string
  digitalAsset4Name: string; digitalAsset4AccessDetails: string; digitalAsset4Location: string; digitalAsset4Notes: string
  digitalAsset5Name: string; digitalAsset5AccessDetails: string; digitalAsset5Location: string; digitalAsset5Notes: string
}

const EMPTY_FORM: FormState = {
  device1Name: '', device1LoginAccount: '', device1PasswordPin: '', device1Notes: '',
  device2Name: '', device2LoginAccount: '', device2PasswordPin: '', device2Notes: '',
  device3Name: '', device3LoginAccount: '', device3PasswordPin: '', device3Notes: '',
  device4Name: '', device4LoginAccount: '', device4PasswordPin: '', device4Notes: '',
  device5Name: '', device5LoginAccount: '', device5PasswordPin: '', device5Notes: '',
  socialMedia1Platform: '', socialMedia1Username: '', socialMedia1Password: '', socialMedia1WishesOnDeath: '',
  socialMedia2Platform: '', socialMedia2Username: '', socialMedia2Password: '', socialMedia2WishesOnDeath: '',
  socialMedia3Platform: '', socialMedia3Username: '', socialMedia3Password: '', socialMedia3WishesOnDeath: '',
  socialMedia4Platform: '', socialMedia4Username: '', socialMedia4Password: '', socialMedia4WishesOnDeath: '',
  socialMedia5Platform: '', socialMedia5Username: '', socialMedia5Password: '', socialMedia5WishesOnDeath: '',
  otherAccount1Name: '', otherAccount1Username: '', otherAccount1Password: '', otherAccount1Notes: '',
  otherAccount2Name: '', otherAccount2Username: '', otherAccount2Password: '', otherAccount2Notes: '',
  otherAccount3Name: '', otherAccount3Username: '', otherAccount3Password: '', otherAccount3Notes: '',
  otherAccount4Name: '', otherAccount4Username: '', otherAccount4Password: '', otherAccount4Notes: '',
  otherAccount5Name: '', otherAccount5Username: '', otherAccount5Password: '', otherAccount5Notes: '',
  digitalAsset1Name: '', digitalAsset1AccessDetails: '', digitalAsset1Location: '', digitalAsset1Notes: '',
  digitalAsset2Name: '', digitalAsset2AccessDetails: '', digitalAsset2Location: '', digitalAsset2Notes: '',
  digitalAsset3Name: '', digitalAsset3AccessDetails: '', digitalAsset3Location: '', digitalAsset3Notes: '',
  digitalAsset4Name: '', digitalAsset4AccessDetails: '', digitalAsset4Location: '', digitalAsset4Notes: '',
  digitalAsset5Name: '', digitalAsset5AccessDetails: '', digitalAsset5Location: '', digitalAsset5Notes: '',
}

const MAX = 5
const afG = "'Apfel Grotezk', 'Helvetica Neue', Helvetica, Arial, sans-serif"
const hv = "'Helvetica Neue', Helvetica, Arial, sans-serif"

// Strip ephemeral fields before persisting. Passwords / PINs / access details
// are entered at export time via the Snapshot → sessionStorage → ExportClient
// flow; they must never be saved to the entries table. Matches the toSaveable
// pattern in financial-information (accountNumber) and personal-admin
// (socialInsuranceNumber, healthCardNumber). Defensive: the capture UI does
// not currently render inputs for these fields, but this function is the
// safety net if one is added.
function toSaveable(f: FormState): Omit<
  FormState,
  | 'device1PasswordPin' | 'device2PasswordPin' | 'device3PasswordPin' | 'device4PasswordPin' | 'device5PasswordPin'
  | 'socialMedia1Password' | 'socialMedia2Password' | 'socialMedia3Password' | 'socialMedia4Password' | 'socialMedia5Password'
  | 'otherAccount1Password' | 'otherAccount2Password' | 'otherAccount3Password' | 'otherAccount4Password' | 'otherAccount5Password'
  | 'digitalAsset1AccessDetails' | 'digitalAsset2AccessDetails' | 'digitalAsset3AccessDetails' | 'digitalAsset4AccessDetails' | 'digitalAsset5AccessDetails'
> {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const {
    device1PasswordPin, device2PasswordPin, device3PasswordPin, device4PasswordPin, device5PasswordPin,
    socialMedia1Password, socialMedia2Password, socialMedia3Password, socialMedia4Password, socialMedia5Password,
    otherAccount1Password, otherAccount2Password, otherAccount3Password, otherAccount4Password, otherAccount5Password,
    digitalAsset1AccessDetails, digitalAsset2AccessDetails, digitalAsset3AccessDetails, digitalAsset4AccessDetails, digitalAsset5AccessDetails,
    ...safe
  } = f
  return safe
}

export default function DevicesAndAccountsPage() {
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const formRef = useRef<FormState>(EMPTY_FORM)
  const entryIdRef = useRef<string | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [loading, setLoading] = useState(true)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null)
  const [statusNow, setStatusNow] = useState(Date.now())

  const router = useRouter()
  const [savedEntryId, setSavedEntryId] = useState<string | null>(null)
  const [openSection, setOpenSection] = useState<number | null>(null)
  const [visibleDevice, setVisibleDevice] = useState(0)
  const [visibleSocial, setVisibleSocial] = useState(0)
  const [visibleOther, setVisibleOther] = useState(0)
  const [visibleAsset, setVisibleAsset] = useState(0)
  // Mirror the visible counters in refs so add/delete arithmetic is race-safe: a
  // blur-discard (delete of an empty trailing slot) and an Add click can fire in
  // the same tick; refs compose synchronously where the old non-functional
  // `setVisible(visible + 1)` read a stale value and churned an extra empty card.
  const visibleDeviceRef = useRef(0)
  const visibleSocialRef = useRef(0)
  const visibleOtherRef = useRef(0)
  const visibleAssetRef = useRef(0)
  const [openDeviceIdx, setOpenDeviceIdx] = useState<Set<number>>(new Set())
  const [openSocialIdx, setOpenSocialIdx] = useState<Set<number>>(new Set())
  const [openOtherIdx, setOpenOtherIdx] = useState<Set<number>>(new Set())
  const [openAssetIdx, setOpenAssetIdx] = useState<Set<number>>(new Set())

  const sectionRefs = useRef<(HTMLDivElement | null)[]>([])
  const deviceEntryRefs = useRef<(HTMLDivElement | null)[]>([])
  const socialEntryRefs = useRef<(HTMLDivElement | null)[]>([])
  const otherEntryRefs = useRef<(HTMLDivElement | null)[]>([])
  const assetEntryRefs = useRef<(HTMLDivElement | null)[]>([])

  const lastEditedEntryKeyRef = useRef<string | null>(null)
  const [savingEntryKey, setSavingEntryKey] = useState<string | null>(null)
  const [savedIndicatorKey, setSavedIndicatorKey] = useState<string | null>(null)
  const [savedIndicatorFading, setSavedIndicatorFading] = useState(false)
  const savedFadeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => { window.scrollTo(0, 0) }, [])

  useEffect(() => {
    async function load() {
      const supabase = createSupabaseBrowserClient()
      try {
        const { data: { user }, error: userError } = await supabase.auth.getUser()
        if (userError || !user) return
        const { data: rows, error: loadError } = await supabase
          .from('entries').select('id, content, created_at')
          .eq('user_id', user.id).eq('document_type', DOCUMENT_TYPE)
          .order('created_at', { ascending: false }).limit(1)
        if (loadError) { console.error('LOAD ERROR:', loadError); return }
        const existing = rows?.[0]
        if (existing) {
          entryIdRef.current = existing.id
          setSavedEntryId(existing.id)
          const storedSave = localStorage.getItem(`nightside.lastSaved.${user.id}.${existing.id}`)
          const savedDate = storedSave ? new Date(storedSave) : existing.created_at ? new Date(existing.created_at) : null
          if (savedDate) setLastSavedAt(savedDate)
          const merged = { ...EMPTY_FORM, ...(existing.content as object) } as FormState
          formRef.current = merged
          setForm(merged)
          const vd = countVisible(merged, 'device', ['Name', 'LoginAccount', 'PasswordPin', 'Notes'])
          const vs = countVisible(merged, 'socialMedia', ['Platform', 'Username', 'Password', 'WishesOnDeath'])
          const vo = countVisible(merged, 'otherAccount', ['Name', 'Username', 'Password', 'Notes'])
          const va = countVisible(merged, 'digitalAsset', ['Name', 'AccessDetails', 'Location', 'Notes'])
          setVisibleDevice(vd); visibleDeviceRef.current = vd
          setVisibleSocial(vs); visibleSocialRef.current = vs
          setVisibleOther(vo); visibleOtherRef.current = vo
          setVisibleAsset(va); visibleAssetRef.current = va
        }
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  useEffect(() => {
    if (!lastSavedAt) return
    const interval = window.setInterval(() => setStatusNow(Date.now()), 30000)
    return () => window.clearInterval(interval)
  }, [lastSavedAt])

  function countVisible(f: FormState, prefix: string, fields: string[]) {
    let count = 0
    for (let n = 1; n <= MAX; n++) {
      if (fields.some(field => (f as unknown as Record<string, string>)[`${prefix}${n}${field}`])) count = n
    }
    return count
  }

  // A slot is empty when none of its fields have content — same field lists as
  // countVisible, so live emptiness matches the load-time visible count. Drives
  // the per-card blur-discard.
  function isSlotEmpty(f: FormState, prefix: string, n: number, fields: string[]) {
    const r = f as unknown as Record<string, string>
    return !fields.some(field => r[`${prefix}${n}${field}`]?.trim())
  }

  function updateField(field: keyof FormState, value: string) {
    const newForm = { ...formRef.current, [field]: value }
    formRef.current = newForm
    setForm(newForm)
    const match = /^(device|socialMedia|otherAccount|digitalAsset)(\d)/.exec(field)
    if (match) {
      const prefix = match[1] === 'socialMedia' ? 'social' : match[1] === 'otherAccount' ? 'other' : match[1] === 'digitalAsset' ? 'asset' : 'device'
      lastEditedEntryKeyRef.current = `${prefix}-${parseInt(match[2]) - 1}`
    }
    scheduleAutosave()
  }

  function scheduleAutosave() {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => { debounceRef.current = null; performAutosave() }, 1500)
  }

  function handleBlur() {
    if (debounceRef.current) { clearTimeout(debounceRef.current); debounceRef.current = null; performAutosave() }
  }

  function triggerSavedIndicator(key: string | null) {
    if (!key) return
    if (savedFadeTimerRef.current) clearTimeout(savedFadeTimerRef.current)
    setSavedIndicatorKey(key)
    setSavedIndicatorFading(false)
    savedFadeTimerRef.current = setTimeout(() => {
      setSavedIndicatorFading(true)
      setTimeout(() => setSavedIndicatorKey(null), 400)
    }, 2600)
  }

  async function performAutosave() {
    const targetKey = lastEditedEntryKeyRef.current
    const currentForm = formRef.current
    setSaveStatus('saving')
    setSavingEntryKey(targetKey)
    const startedAt = Date.now()
    try {
      const supabase = createSupabaseBrowserClient()
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      if (userError || !user) { setSaveStatus('error'); setSavingEntryKey(null); return }
      if (!entryIdRef.current) {
        const { data: created, error } = await supabase.from('entries')
          .insert({ user_id: user.id, title: DOCUMENT_TITLE, section: 'capture', document_type: DOCUMENT_TYPE, content: toSaveable(currentForm) })
          .select('id').single()
        if (error) { setSaveStatus('error'); setSavingEntryKey(null); return }
        if (created) { entryIdRef.current = created.id; setSavedEntryId(created.id) }
      } else {
        const { error } = await supabase.from('entries').update({ content: toSaveable(currentForm) }).eq('id', entryIdRef.current)
        if (error) { setSaveStatus('error'); setSavingEntryKey(null); return }
      }
      if (entryIdRef.current) localStorage.setItem(`nightside.lastSaved.${user.id}.${entryIdRef.current}`, new Date().toISOString())
      await holdSavingIndicator(startedAt)
      setLastSavedAt(new Date()); setStatusNow(Date.now()); setSaveStatus('saved')
      setSavingEntryKey(null); triggerSavedIndicator(targetKey)
    } catch { setSaveStatus('error'); setSavingEntryKey(null) }
  }

  async function handlePreviewExport() {
    const id = entryIdRef.current
    if (!id) return
    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
      debounceRef.current = null
      await performAutosave()
    }
    router.push(`/app/entries/${id}`)
  }

  const hasAnyContent = useMemo(() => {
    return Object.values(form).some(v => typeof v === 'string' && v.trim().length > 0)
  }, [form])

  const saveStatusText = useMemo(() => {
    if (saveStatus === 'saving') return 'Saving…'
    if (saveStatus === 'error') return "Couldn't save"
    if (!lastSavedAt) return null
    const diff = Math.max(statusNow - lastSavedAt.getTime(), 0)
    const s = Math.floor(diff / 1000), m = Math.floor(s / 60), h = Math.floor(m / 60), d = Math.floor(h / 24), w = Math.floor(d / 7)
    if (s < 60) return 'Saved just now'
    if (m < 60) return `Saved ${m}m ago`
    if (h < 24) return h === 1 ? 'Saved 1h ago' : `Saved ${h}h ago`
    if (d < 7) return d === 1 ? 'Saved 1 day ago' : `Saved ${d} days ago`
    return w === 1 ? 'Saved 1 week ago' : `Saved ${w} weeks ago`
  }, [lastSavedAt, statusNow, saveStatus])

  function toggleSection(idx: number) {
    const next = openSection === idx ? null : idx
    setOpenSection(next)
    if (next !== null) setTimeout(() => sectionRefs.current[next]?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50)
  }

  function toggleEntry(setFn: React.Dispatch<React.SetStateAction<Set<number>>>, idx: number) {
    setFn(prev => { const n = new Set(prev); n.has(idx) ? n.delete(idx) : n.add(idx); return n })
  }

  // ── Device helpers ──
  function addDevice() {
    const cur = visibleDeviceRef.current
    // Reuse the trailing slot if it's already an empty (just-added) one, rather
    // than stacking another. Blur-discard can't catch Add→Add here — the slot is
    // never focused (no autofocus), so it never blurs.
    if (cur > 0 && isSlotEmpty(formRef.current, 'device', cur, ['Name', 'LoginAccount', 'PasswordPin', 'Notes'])) {
      setOpenDeviceIdx(prev => new Set([...prev, cur - 1]))
      setTimeout(() => deviceEntryRefs.current[cur - 1]?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 50)
      return
    }
    const next = cur + 1
    visibleDeviceRef.current = next
    setVisibleDevice(next)
    setOpenDeviceIdx(prev => new Set([...prev, next - 1]))
    setTimeout(() => deviceEntryRefs.current[next - 1]?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 50)
  }

  function deleteDevice(idx: number) {
    const f = { ...formRef.current } as unknown as Record<string, string>
    for (let i = idx; i < visibleDevice - 1; i++) {
      const n = i + 1, m = n + 1
      f[`device${n}Name`] = f[`device${m}Name`]
      f[`device${n}LoginAccount`] = f[`device${m}LoginAccount`]
      f[`device${n}PasswordPin`] = f[`device${m}PasswordPin`]
      f[`device${n}Notes`] = f[`device${m}Notes`]
    }
    const last = visibleDevice
    f[`device${last}Name`] = ''; f[`device${last}LoginAccount`] = ''; f[`device${last}PasswordPin`] = ''; f[`device${last}Notes`] = ''
    const newForm = f as unknown as FormState
    formRef.current = newForm; setForm(newForm)
    visibleDeviceRef.current -= 1
    setVisibleDevice(visibleDeviceRef.current)
    setOpenDeviceIdx(prev => { const n = new Set<number>(); prev.forEach(i => { if (i < idx) n.add(i); else if (i > idx) n.add(i - 1) }); return n })
    scheduleAutosave()
  }

  // ── Social media helpers ──
  function addSocial() {
    const cur = visibleSocialRef.current
    if (cur > 0 && isSlotEmpty(formRef.current, 'socialMedia', cur, ['Platform', 'Username', 'Password', 'WishesOnDeath'])) {
      setOpenSocialIdx(prev => new Set([...prev, cur - 1]))
      setTimeout(() => socialEntryRefs.current[cur - 1]?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 50)
      return
    }
    const next = cur + 1
    visibleSocialRef.current = next
    setVisibleSocial(next)
    setOpenSocialIdx(prev => new Set([...prev, next - 1]))
    setTimeout(() => socialEntryRefs.current[next - 1]?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 50)
  }

  function deleteSocial(idx: number) {
    const f = { ...formRef.current } as unknown as Record<string, string>
    for (let i = idx; i < visibleSocial - 1; i++) {
      const n = i + 1, m = n + 1
      f[`socialMedia${n}Platform`] = f[`socialMedia${m}Platform`]
      f[`socialMedia${n}Username`] = f[`socialMedia${m}Username`]
      f[`socialMedia${n}Password`] = f[`socialMedia${m}Password`]
      f[`socialMedia${n}WishesOnDeath`] = f[`socialMedia${m}WishesOnDeath`]
    }
    const last = visibleSocial
    f[`socialMedia${last}Platform`] = ''; f[`socialMedia${last}Username`] = ''
    f[`socialMedia${last}Password`] = ''; f[`socialMedia${last}WishesOnDeath`] = ''
    const newForm = f as unknown as FormState
    formRef.current = newForm; setForm(newForm)
    visibleSocialRef.current -= 1
    setVisibleSocial(visibleSocialRef.current)
    setOpenSocialIdx(prev => { const n = new Set<number>(); prev.forEach(i => { if (i < idx) n.add(i); else if (i > idx) n.add(i - 1) }); return n })
    scheduleAutosave()
  }

  // ── Other account helpers ──
  function addOther() {
    const cur = visibleOtherRef.current
    if (cur > 0 && isSlotEmpty(formRef.current, 'otherAccount', cur, ['Name', 'Username', 'Password', 'Notes'])) {
      setOpenOtherIdx(prev => new Set([...prev, cur - 1]))
      setTimeout(() => otherEntryRefs.current[cur - 1]?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 50)
      return
    }
    const next = cur + 1
    visibleOtherRef.current = next
    setVisibleOther(next)
    setOpenOtherIdx(prev => new Set([...prev, next - 1]))
    setTimeout(() => otherEntryRefs.current[next - 1]?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 50)
  }

  function deleteOther(idx: number) {
    const f = { ...formRef.current } as unknown as Record<string, string>
    for (let i = idx; i < visibleOther - 1; i++) {
      const n = i + 1, m = n + 1
      f[`otherAccount${n}Name`] = f[`otherAccount${m}Name`]
      f[`otherAccount${n}Username`] = f[`otherAccount${m}Username`]
      f[`otherAccount${n}Password`] = f[`otherAccount${m}Password`]
      f[`otherAccount${n}Notes`] = f[`otherAccount${m}Notes`]
    }
    const last = visibleOther
    f[`otherAccount${last}Name`] = ''; f[`otherAccount${last}Username`] = ''
    f[`otherAccount${last}Password`] = ''; f[`otherAccount${last}Notes`] = ''
    const newForm = f as unknown as FormState
    formRef.current = newForm; setForm(newForm)
    visibleOtherRef.current -= 1
    setVisibleOther(visibleOtherRef.current)
    setOpenOtherIdx(prev => { const n = new Set<number>(); prev.forEach(i => { if (i < idx) n.add(i); else if (i > idx) n.add(i - 1) }); return n })
    scheduleAutosave()
  }

  // ── Digital asset helpers ──
  function addAsset() {
    const cur = visibleAssetRef.current
    if (cur > 0 && isSlotEmpty(formRef.current, 'digitalAsset', cur, ['Name', 'AccessDetails', 'Location', 'Notes'])) {
      setOpenAssetIdx(prev => new Set([...prev, cur - 1]))
      setTimeout(() => assetEntryRefs.current[cur - 1]?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 50)
      return
    }
    const next = cur + 1
    visibleAssetRef.current = next
    setVisibleAsset(next)
    setOpenAssetIdx(prev => new Set([...prev, next - 1]))
    setTimeout(() => assetEntryRefs.current[next - 1]?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 50)
  }

  function deleteAsset(idx: number) {
    const f = { ...formRef.current } as unknown as Record<string, string>
    for (let i = idx; i < visibleAsset - 1; i++) {
      const n = i + 1, m = n + 1
      f[`digitalAsset${n}Name`] = f[`digitalAsset${m}Name`]
      f[`digitalAsset${n}AccessDetails`] = f[`digitalAsset${m}AccessDetails`]
      f[`digitalAsset${n}Location`] = f[`digitalAsset${m}Location`]
      f[`digitalAsset${n}Notes`] = f[`digitalAsset${m}Notes`]
    }
    const last = visibleAsset
    f[`digitalAsset${last}Name`] = ''; f[`digitalAsset${last}AccessDetails`] = ''
    f[`digitalAsset${last}Location`] = ''; f[`digitalAsset${last}Notes`] = ''
    const newForm = f as unknown as FormState
    formRef.current = newForm; setForm(newForm)
    visibleAssetRef.current -= 1
    setVisibleAsset(visibleAssetRef.current)
    setOpenAssetIdx(prev => { const n = new Set<number>(); prev.forEach(i => { if (i < idx) n.add(i); else if (i > idx) n.add(i - 1) }); return n })
    scheduleAutosave()
  }

  if (loading) return (
    <div style={{ minHeight: '100vh', background: '#F8F4EB' }}>
      <div style={{ maxWidth: 720, margin: '0 auto', padding: '64px 24px', fontFamily: hv, color: '#130426' }}>Loading…</div>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: '#F8F4EB', position: 'relative' }}>
      {savedEntryId && hasAnyContent && (
        <div className="capture-export-bar" style={{ position: 'absolute', top: 20, right: 152, zIndex: 10, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
          <button
            type="button"
            onClick={handlePreviewExport}
            disabled={saveStatus === 'saving'}
            className="transition-opacity mobile-sticky-export"
            onMouseEnter={(e) => { e.currentTarget.style.background = '#EAE4D8' }}
            onMouseLeave={(e) => { e.currentTarget.style.background = '#F8F4EB' }}
            style={{ display: 'flex', alignItems: 'center', gap: 6, borderRadius: 999, padding: '10px 20px', fontFamily: hv, fontSize: 14, fontWeight: 600, background: '#F8F4EB', color: '#130426', border: 'none', cursor: saveStatus === 'saving' ? 'default' : 'pointer', whiteSpace: 'nowrap', opacity: saveStatus === 'saving' ? 0.6 : 1 }}
          >
            <svg width="14" height="14" viewBox="0 0 13 13" fill="none" aria-hidden="true">
              <path d="M6.5 1.5v6M3.5 5.5L6.5 8.5L9.5 5.5" stroke="#130426" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M1.5 10.5h10" stroke="#130426" strokeWidth="1.4" strokeLinecap="round" />
            </svg>
            {saveStatus === 'saving' ? 'Preparing…' : 'Export'}
          </button>
          {saveStatusText && (
            <span style={{ fontSize: 12, fontWeight: 500, color: saveStatus === 'error' ? '#8B0000' : '#F8F4EB', fontFamily: hv }}>{saveStatus === 'error' && <AlertIcon color="#8B0000" />}{saveStatusText}</span>
          )}
        </div>
      )}
      <DocHeaderBanner title={<>Devices &amp; Accounts</>} crumbLabel="Devices & Accounts" docCategory="practical">
        <p style={docBannerIntro}>
          Your email, social media, photo libraries, subscriptions, and other online accounts may need to be accessed, memorialized, or closed. Without a written record, accounts get locked, recurring charges continue, and digital memories become inaccessible.
        </p>
        <p style={{ ...docBannerNote, fontSize: 14 }}>
          Financial account details (account numbers, balances) belong in{' '}
          <Link href="/app/capture/financial-information" style={{ color: 'inherit', textDecoration: 'underline' }}>
            Financial Information
          </Link>
          {' '}rather than here. This document focuses on access; that one focuses on the financial picture.
        </p>
        <p style={{ ...docBannerNote, fontSize: 14 }}>
          Passwords, PINs, and other access details are designed to be added at the moment of export rather than saved to Your materials. For passwords specifically, we recommend using a password manager and granting access to your executor or a trusted contact through that platform.{' '}
          <a href="/app/help?expanded=privacy" style={{ color: 'inherit', textDecoration: 'underline' }}>Learn more about how we handle your information →</a>
        </p>
      </DocHeaderBanner>

      <div style={{ maxWidth: 720, marginLeft: 'max(0px, calc((100% - 1152px) / 2))', marginRight: 'auto', padding: '40px 24px 96px' }}>

        <AutosaveNotice>Information you add will save automatically to Your materials.</AutosaveNotice>
        {saveStatusText && (
          <span className="mobile-saved-status" style={{ fontFamily: hv, fontSize: 13, color: saveStatus === 'error' ? '#8B0000' : 'rgba(19,4,38,0.65)', marginTop: 16, display: 'none' }}>{saveStatus === 'error' && <AlertIcon color="#8B0000" />}{saveStatusText}</span>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginTop: 24 }}>

          {/* ── Devices ── */}
          <AccordionSection
            idx={0} open={openSection === 0} onToggle={toggleSection}
            title="Devices"
            description="Phones, computers, tablets, and other devices that may need to be accessed or wiped."
            sectionRef={(el) => { sectionRefs.current[0] = el }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {Array.from({ length: visibleDevice }, (_, i) => {
                const n = (i + 1) as 1 | 2 | 3 | 4 | 5
                const isOpen = openDeviceIdx.has(i)
                const title = form[`device${n}Name`].trim() || 'Untitled device'
                return (
                  <EntryCard
                    key={i}
                    entryRef={(el) => { deviceEntryRefs.current[i] = el }}
                    title={title}
                    isOpen={isOpen}
                    onToggle={() => toggleEntry(setOpenDeviceIdx, i)}
                    onDelete={() => deleteDevice(i)}
                    isEmpty={isSlotEmpty(form, 'device', n, ['Name', 'LoginAccount', 'PasswordPin', 'Notes'])}
                    isSaving={savingEntryKey === `device-${i}`}
                    isSaved={savedIndicatorKey === `device-${i}`}
                    savedFading={savedIndicatorFading}
                  >
                    <Field label="Device:" value={form[`device${n}Name`]} onChange={(v) => updateField(`device${n}Name`, v)} onBlur={handleBlur} rows={1} />
                    <Field label="Account / Login (if applicable):" value={form[`device${n}LoginAccount`]} onChange={(v) => updateField(`device${n}LoginAccount`, v)} onBlur={handleBlur} rows={1} />
                    <SensitiveFieldDisplay label="Password/PIN:" />
                    <Field label="Notes:" value={form[`device${n}Notes`]} onChange={(v) => updateField(`device${n}Notes`, v)} onBlur={handleBlur} rows={2} />
                  </EntryCard>
                )
              })}
              {visibleDevice < MAX && (
                <AddButton label="Add device" onClick={addDevice} />
              )}
            </div>
          </AccordionSection>

          {/* ── Social Media ── */}
          <AccordionSection
            idx={1} open={openSection === 1} onToggle={toggleSection}
            title="Social Media"
            description="Accounts on platforms like Facebook, Instagram, LinkedIn, and others that may need to be memorialized, deactivated, or closed."
            sectionRef={(el) => { sectionRefs.current[1] = el }}
          >
            <p style={{ fontFamily: hv, fontSize: 14, color: 'rgba(26,26,26,0.7)', lineHeight: 1.55, margin: '0 0 16px 0' }}>
              Some platforms allow you to set what happens to your account after your death (e.g. memorialization, deletion, legacy contacts).{' '}
              <Link href="/app/area/personal-admin" style={{ color: '#2C3777', textDecoration: 'underline' }}>
                Learn how to set up digital legacy and account preferences →
              </Link>
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {Array.from({ length: visibleSocial }, (_, i) => {
                const n = (i + 1) as 1 | 2 | 3 | 4 | 5
                const isOpen = openSocialIdx.has(i)
                const title = form[`socialMedia${n}Platform`].trim() || 'Untitled account'
                return (
                  <EntryCard
                    key={i}
                    entryRef={(el) => { socialEntryRefs.current[i] = el }}
                    title={title}
                    isOpen={isOpen}
                    onToggle={() => toggleEntry(setOpenSocialIdx, i)}
                    onDelete={() => deleteSocial(i)}
                    isEmpty={isSlotEmpty(form, 'socialMedia', n, ['Platform', 'Username', 'Password', 'WishesOnDeath'])}
                    isSaving={savingEntryKey === `social-${i}`}
                    isSaved={savedIndicatorKey === `social-${i}`}
                    savedFading={savedIndicatorFading}
                  >
                    <Field label="Platform:" value={form[`socialMedia${n}Platform`]} onChange={(v) => updateField(`socialMedia${n}Platform`, v)} onBlur={handleBlur} rows={1} />
                    <Field label="Username:" value={form[`socialMedia${n}Username`]} onChange={(v) => updateField(`socialMedia${n}Username`, v)} onBlur={handleBlur} rows={1} />
                    <SensitiveFieldDisplay label="Password:" />
                    <Field label="My wishes for this account upon my death:" value={form[`socialMedia${n}WishesOnDeath`]} onChange={(v) => updateField(`socialMedia${n}WishesOnDeath`, v)} onBlur={handleBlur} rows={3} />
                  </EntryCard>
                )
              })}
              {visibleSocial < MAX && (
                <AddButton label="Add account" onClick={addSocial} />
              )}
            </div>
          </AccordionSection>

          {/* ── Other Accounts ── */}
          <AccordionSection
            idx={2} open={openSection === 2} onToggle={toggleSection}
            title="Other Accounts"
            description="Subscriptions, utilities, email accounts, and other online services that may need to be transferred or cancelled."
            sectionRef={(el) => { sectionRefs.current[2] = el }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {Array.from({ length: visibleOther }, (_, i) => {
                const n = (i + 1) as 1 | 2 | 3 | 4 | 5
                const isOpen = openOtherIdx.has(i)
                const title = form[`otherAccount${n}Name`].trim() || 'Untitled account'
                return (
                  <EntryCard
                    key={i}
                    entryRef={(el) => { otherEntryRefs.current[i] = el }}
                    title={title}
                    isOpen={isOpen}
                    onToggle={() => toggleEntry(setOpenOtherIdx, i)}
                    onDelete={() => deleteOther(i)}
                    isEmpty={isSlotEmpty(form, 'otherAccount', n, ['Name', 'Username', 'Password', 'Notes'])}
                    isSaving={savingEntryKey === `other-${i}`}
                    isSaved={savedIndicatorKey === `other-${i}`}
                    savedFading={savedIndicatorFading}
                  >
                    <Field label="Account:" value={form[`otherAccount${n}Name`]} onChange={(v) => updateField(`otherAccount${n}Name`, v)} onBlur={handleBlur} rows={1} />
                    <Field label="Username:" value={form[`otherAccount${n}Username`]} onChange={(v) => updateField(`otherAccount${n}Username`, v)} onBlur={handleBlur} rows={1} />
                    <SensitiveFieldDisplay label="Password:" />
                    <Field label="Notes:" value={form[`otherAccount${n}Notes`]} onChange={(v) => updateField(`otherAccount${n}Notes`, v)} onBlur={handleBlur} rows={2} />
                  </EntryCard>
                )
              })}
              {visibleOther < MAX && (
                <AddButton label="Add account" onClick={addOther} />
              )}
            </div>
          </AccordionSection>

          {/* ── Digital Assets ── */}
          <AccordionSection
            idx={3} open={openSection === 3} onToggle={toggleSection}
            title="Digital Assets"
            description="Cryptocurrency, NFTs, domain names, and other digital assets of value."
            sectionRef={(el) => { sectionRefs.current[3] = el }}
          >
            <p style={{ fontFamily: hv, fontSize: 14, color: 'rgba(26,26,26,0.7)', lineHeight: 1.55, margin: '0 0 16px 0' }}>
              Digital assets can include things like cryptocurrency, domain names, online businesses, or files stored in cloud services.{' '}
              <Link href="/app/area/personal-admin" style={{ color: '#2C3777', textDecoration: 'underline' }}>
                Learn how to set up digital legacy and account preferences →
              </Link>
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {Array.from({ length: visibleAsset }, (_, i) => {
                const n = (i + 1) as 1 | 2 | 3 | 4 | 5
                const isOpen = openAssetIdx.has(i)
                const title = form[`digitalAsset${n}Name`].trim() || 'Untitled asset'
                return (
                  <EntryCard
                    key={i}
                    entryRef={(el) => { assetEntryRefs.current[i] = el }}
                    title={title}
                    isOpen={isOpen}
                    onToggle={() => toggleEntry(setOpenAssetIdx, i)}
                    onDelete={() => deleteAsset(i)}
                    isEmpty={isSlotEmpty(form, 'digitalAsset', n, ['Name', 'AccessDetails', 'Location', 'Notes'])}
                    isSaving={savingEntryKey === `asset-${i}`}
                    isSaved={savedIndicatorKey === `asset-${i}`}
                    savedFading={savedIndicatorFading}
                  >
                    <Field label="Asset:" value={form[`digitalAsset${n}Name`]} onChange={(v) => updateField(`digitalAsset${n}Name`, v)} onBlur={handleBlur} rows={1} />
                    <SensitiveFieldDisplay label="Access details:" />
                    <Field label="Location / Platform:" value={form[`digitalAsset${n}Location`]} onChange={(v) => updateField(`digitalAsset${n}Location`, v)} onBlur={handleBlur} rows={1} />
                    <Field label="Notes:" value={form[`digitalAsset${n}Notes`]} onChange={(v) => updateField(`digitalAsset${n}Notes`, v)} onBlur={handleBlur} rows={2} />
                  </EntryCard>
                )
              })}
              {visibleAsset < MAX && (
                <AddButton label="Add asset" onClick={addAsset} />
              )}
            </div>
          </AccordionSection>

        </div>
      </div>
    </div>
  )
}

// ── AccordionSection ──────────────────────────────────────────────────────────

function AccordionSection({ idx, open, onToggle, title, description, sectionRef, children }: {
  idx: number
  open: boolean
  onToggle: (idx: number) => void
  title: string
  description?: string
  sectionRef: (el: HTMLDivElement | null) => void
  children: React.ReactNode
}) {
  return (
    <div
      ref={sectionRef}
      style={{ borderRadius: 16, border: open ? '2px solid #2C3777' : '1px solid #2C3777', overflow: 'hidden', background: '#FFFFFF', boxShadow: open ? '6px 6px 0 rgba(0,0,0,0.75)' : 'none', transition: 'box-shadow 150ms ease', scrollMarginTop: SECTION_SCROLL_MARGIN_TOP }}
    >
      <div style={{ display: 'flex' }}>
        {open && <div style={{ width: 6, background: '#BBABF4', flexShrink: 0 }} />}
        <div style={{ flex: 1 }}>
          <button
            type="button"
            onClick={() => onToggle(idx)}
            style={{ width: '100%', background: 'transparent', border: 'none', padding: 24, cursor: 'pointer', display: 'flex', alignItems: description ? 'flex-start' : 'center', justifyContent: 'space-between', gap: 16, textAlign: 'left' }}
          >
            <div>
              <p style={{ fontFamily: afG, fontSize: 24, fontWeight: 600, color: '#1A1A1A', margin: 0, lineHeight: 1.2 }}>
                {title}
              </p>
              {description && (
                <p style={{ fontFamily: hv, fontSize: 14, color: '#2C3777', margin: '6px 0 0', lineHeight: 1.4 }}>
                  {description}
                </p>
              )}
            </div>
            <svg width="14" height="9" viewBox="0 0 14 9" fill="none" style={{ flexShrink: 0, transition: 'transform 0.25s', transform: open ? 'rotate(180deg)' : 'rotate(0deg)', marginTop: description ? 4 : 0 }}>
              <path d="M1 1.5L7 7.5L13 1.5" stroke="#2C3777" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          {open && (
            <div style={{ padding: '0 24px 28px' }}>
              {children}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── EntryCard ─────────────────────────────────────────────────────────────────

function EntryCard({ title, isOpen, onToggle, onDelete, isEmpty, entryRef, isSaving, isSaved, savedFading, children }: {
  title: string
  isOpen: boolean
  onToggle: () => void
  onDelete: () => void
  isEmpty: boolean
  entryRef: (el: HTMLDivElement | null) => void
  isSaving: boolean
  isSaved: boolean
  savedFading: boolean
  children: React.ReactNode
}) {
  return (
    <div
      ref={entryRef}
      onBlur={(e) => {
        // Only when focus leaves the entire card (not moving between fields inside
        // it) AND the slot is still empty: discard it via the existing onDelete.
        // So clearing a field while focused never makes the card vanish — it goes
        // only when you leave an empty card.
        if (isEmpty && !e.currentTarget.contains(e.relatedTarget as Node)) onDelete()
      }}
      style={{ background: '#F8F4EB', border: '1px solid #2C3777', borderRadius: 12, overflow: 'hidden' }}
    >
      <button
        type="button"
        onClick={onToggle}
        style={{ width: '100%', background: 'transparent', border: 'none', padding: '14px 16px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, textAlign: 'left' }}
      >
        <span style={{ fontFamily: hv, fontSize: 16, color: '#1A1A1A', fontWeight: 500 }}>{title}</span>
        <svg width="12" height="8" viewBox="0 0 12 8" fill="none" style={{ flexShrink: 0, transition: 'transform 0.2s', transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}>
          <path d="M1 1.5L6 6.5L11 1.5" stroke="#2C3777" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      {isOpen && (
        <div style={{ padding: '0 16px 16px', borderTop: '1px solid #2C3777', display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div style={{ height: 16 }} />
          {children}
          <div style={{ paddingTop: 4, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
            <button
              type="button"
              onClick={onDelete}
              style={{ fontFamily: hv, fontSize: 13, color: '#2C3777', background: 'none', border: '1px solid #2C3777', borderRadius: 999, padding: '6px 14px', cursor: 'pointer' }}
            >
              Delete
            </button>
            {isSaving && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontFamily: hv, fontSize: 12, fontWeight: 500, color: 'rgba(19,4,38,0.65)' }}>Saving…</span>
              </div>
            )}
            {isSaved && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, opacity: savedFading ? 0 : 1, transition: 'opacity 0.4s ease' }}>
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true" style={{ flexShrink: 0 }}>
                  <circle cx="7" cy="7" r="6" stroke="rgba(19,4,38,0.65)" strokeWidth="1.3" />
                  <path d="M4.5 7L6.2 8.8L9.5 5.5" stroke="rgba(19,4,38,0.65)" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <span style={{ fontFamily: hv, fontSize: 12, fontWeight: 500, color: 'rgba(19,4,38,0.65)' }}>Saved to Your materials</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ── AddButton ─────────────────────────────────────────────────────────────────

function AddButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#FFFFFF', border: '1px solid #2C3777', borderRadius: 999, padding: '10px 18px', fontFamily: hv, fontSize: 14, color: '#2C3777', cursor: 'pointer', fontWeight: 500, alignSelf: 'flex-start' }}
    >
      + {label}
    </button>
  )
}

// ── SensitiveFieldDisplay ──────────────────────────────────────────────────────

function SensitiveFieldDisplay({ label }: { label: string }) {
  return (
    <div>
      <label style={{ display: 'block', fontFamily: hv, fontSize: 14, color: '#1A1A1A', marginBottom: 8 }}>
        {label}
      </label>
      <div
        style={{
          width: '100%',
          background: '#F5F5F5',
          color: 'rgba(26,26,26,0.45)',
          border: '1px solid #2C3777',
          borderRadius: 10,
          padding: 12,
          fontFamily: hv,
          fontSize: 15,
          lineHeight: 1.5,
          boxSizing: 'border-box' as const,
          cursor: 'default',
        }}
      >
        To be added when exporting document
      </div>
      <ExportFieldHelper />
    </div>
  )
}

// ── Field ─────────────────────────────────────────────────────────────────────

function Field({ label, value, onChange, onBlur, rows = 2 }: {
  label: string; value: string; onChange: (v: string) => void; onBlur?: () => void; rows?: number
}) {
  return (
    <div>
      <label style={{ display: 'block', fontFamily: hv, fontSize: 14, color: '#1A1A1A', marginBottom: 8 }}>{label}</label>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
        rows={rows}
        style={{ width: '100%', background: '#FFFFFF', color: '#1A1A1A', border: '1px solid #2C3777', borderRadius: 10, padding: 12, fontFamily: hv, fontSize: 15, lineHeight: 1.5, resize: 'none', outline: 'none', boxSizing: 'border-box' }}
      />
    </div>
  )
}
