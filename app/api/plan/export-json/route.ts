import { NextResponse } from 'next/server'
import { ACTIVITY, DOCUMENT_TYPES, DOCUMENT_TYPE_META, type DocumentType } from '@/lib/content-metadata'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { buildPlanExportEmail, notifyPrimaryAndRecovery, PLAN_EXPORT_SUBJECT } from '@/lib/account-notifications'

// Export-schema field name per document_type. This vocabulary is specific to
// this route's JSON output, so it stays local; title/category come from META.
const EXPORT_KEYS: Record<DocumentType, string> = {
  advance_directive_supplement: 'my_care_wishes',
  funeral_wishes:               'wishes_for_body_funeral_ceremony',
  personal_admin_info:          'personal_admin_information',
  important_contacts:           'important_contacts',
  financial_information:        'financial_information',
  devices_and_accounts:         'devices_and_accounts',
  keepsake_inventory:           'keepsakes_inventory',
}

const docTypesByCategory = (category: 'practical' | 'wishes'): Record<string, { key: string; title: string }> =>
  Object.fromEntries(
    DOCUMENT_TYPES.filter(c => DOCUMENT_TYPE_META[c].category === category)
      .map(c => [c, { key: EXPORT_KEYS[c], title: DOCUMENT_TYPE_META[c].label }])
  )

const PRACTICAL_DOC_TYPES = docTypesByCategory('practical')
const WISHES_DOC_TYPES = docTypesByCategory('wishes')

const ACTIVITY_KEYS: Record<string, string> = {
  [ACTIVITY.LEGACY_MAP]:      'legacy_map',
  [ACTIVITY.VALUES_RANKING]:  'values_ranking',
  [ACTIVITY.FEARS_RANKING]:   'fears_ranking',
}

type DocPayload = {
  title: string
  last_updated: string | null
  content: unknown
}

type LegacyContactRow = {
  contact_type: 'primary' | 'secondary'
  first_name: string | null
  last_name: string | null
  email: string | null
  relationship: string | null
  personal_message: string | null
  designated_at: string | null
}

function serializeLegacyContact(row: LegacyContactRow | undefined) {
  if (!row) return null
  return {
    first_name: row.first_name,
    last_name: row.last_name,
    email: row.email,
    relationship: row.relationship,
    personal_message: row.personal_message,
    designated_at: row.designated_at,
  }
}

export async function GET() {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const userMeta = (user.user_metadata ?? {}) as Record<string, unknown>

  // Entries: practical docs, wishes docs, activity outputs all live here.
  const { data: entries } = await supabase
    .from('entries')
    .select('id, content, activity, document_type, created_at, updated_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  const wishesDocuments: Record<string, DocPayload> = {}
  const practicalDocuments: Record<string, DocPayload> = {}
  const activityOutputs: Record<string, unknown> = {}

  for (const entry of entries ?? []) {
    const docType = entry.document_type ?? ''
    const activity = entry.activity ?? ''
    const lastUpdated = entry.updated_at ?? entry.created_at ?? null

    if (WISHES_DOC_TYPES[docType] && !wishesDocuments[WISHES_DOC_TYPES[docType].key]) {
      const m = WISHES_DOC_TYPES[docType]
      wishesDocuments[m.key] = {
        title: m.title,
        last_updated: lastUpdated,
        content: entry.content,
      }
    } else if (PRACTICAL_DOC_TYPES[docType] && !practicalDocuments[PRACTICAL_DOC_TYPES[docType].key]) {
      const m = PRACTICAL_DOC_TYPES[docType]
      practicalDocuments[m.key] = {
        title: m.title,
        last_updated: lastUpdated,
        content: entry.content,
      }
    } else if (ACTIVITY_KEYS[activity] && !activityOutputs[ACTIVITY_KEYS[activity]]) {
      activityOutputs[ACTIVITY_KEYS[activity]] = {
        last_updated: lastUpdated,
        content: entry.content,
      }
    }
  }

  // Notes — split text notes from voice transcripts.
  const { data: noteRows } = await supabase
    .from('notes')
    .select('id, content, prompt_context, origin_type, note_mode, transcript, duration_seconds, created_at, updated_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: true })

  const textNotes: unknown[] = []
  const voiceTranscripts: unknown[] = []
  for (const n of noteRows ?? []) {
    if (n.note_mode === 'audio') {
      voiceTranscripts.push({
        transcript: n.transcript ?? null,
        source_context: n.prompt_context ?? null,
        origin_type: n.origin_type ?? null,
        duration_seconds: n.duration_seconds ?? null,
        created_at: n.created_at ?? null,
      })
    } else {
      textNotes.push({
        content: n.content ?? '',
        source_context: n.prompt_context ?? null,
        origin_type: n.origin_type ?? null,
        created_at: n.created_at ?? null,
        updated_at: n.updated_at ?? null,
      })
    }
  }

  // Legacy contact(s).
  const { data: lcRows } = await supabase
    .from('legacy_contacts')
    .select('contact_type, first_name, last_name, email, relationship, personal_message, designated_at')
    .eq('user_id', user.id)

  const primary = (lcRows ?? []).find((r) => r.contact_type === 'primary') as LegacyContactRow | undefined
  const secondary = (lcRows ?? []).find((r) => r.contact_type === 'secondary') as LegacyContactRow | undefined

  // Release preferences.
  const { data: releaseRow } = await supabase
    .from('user_release_preferences')
    .select('include_care_wishes, include_legacy_map, include_values_ranking, include_fears_ranking, updated_at')
    .eq('user_id', user.id)
    .maybeSingle()

  // Onboarding timestamps live on user_profiles + auth.users metadata.
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('terms_accepted_at, platform_entered_at, last_sign_in_at, onboarding_complete_shown_at, created_at')
    .eq('user_id', user.id)
    .maybeSingle()

  // Payment completion timestamp from Stripe metadata, if present.
  const paymentCompletedAt =
    typeof userMeta.payment_completed_at === 'string' ? userMeta.payment_completed_at : null

  // Legacy Contact designated_at: use the earliest designation across contacts.
  const designatedAts = (lcRows ?? [])
    .map((r) => r.designated_at)
    .filter((v): v is string => typeof v === 'string')
    .sort()
  const legacyContactDesignatedAt = designatedAts[0] ?? null

  const payload = {
    exported_at: new Date().toISOString(),
    platform_version: '1.0',
    account: {
      first_name: typeof userMeta.first_name === 'string' ? userMeta.first_name : null,
      last_name: typeof userMeta.last_name === 'string' ? userMeta.last_name : null,
      email: user.email ?? null,
      province: typeof userMeta.province === 'string' ? userMeta.province : null,
      account_created_at: user.created_at ?? null,
      last_sign_in_at: profile?.last_sign_in_at ?? null,
    },
    wishes_documents: wishesDocuments,
    practical_documents: practicalDocuments,
    activity_outputs: activityOutputs,
    notes: textNotes,
    voice_note_transcripts: voiceTranscripts,
    legacy_contact: {
      primary: serializeLegacyContact(primary),
      secondary: serializeLegacyContact(secondary),
    },
    release_preferences: releaseRow
      ? {
          include_care_wishes: releaseRow.include_care_wishes ?? null,
          include_legacy_map: releaseRow.include_legacy_map ?? null,
          include_values_ranking: releaseRow.include_values_ranking ?? null,
          include_fears_ranking: releaseRow.include_fears_ranking ?? null,
          updated_at: releaseRow.updated_at ?? null,
        }
      : null,
    onboarding: {
      signup_at: profile?.created_at ?? user.created_at ?? null,
      email_confirmed_at: user.email_confirmed_at ?? null,
      payment_completed_at: paymentCompletedAt,
      legacy_contact_designated_at: legacyContactDesignatedAt,
      platform_entered_at: profile?.platform_entered_at ?? null,
    },
  }

  const todayStr = new Date().toISOString().slice(0, 10)
  const body = JSON.stringify(payload, null, 2)

  // Full export → notify primary + verified recovery (best-effort; never fail the export).
  try {
    const firstName = (user.user_metadata?.first_name as string | undefined) ?? ''
    await notifyPrimaryAndRecovery(supabase, user.id, user.email, PLAN_EXPORT_SUBJECT, buildPlanExportEmail(firstName))
  } catch (err) {
    console.error('[export-json] notification failed', err)
  }

  return new NextResponse(body, {
    status: 200,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Content-Disposition': `attachment; filename="nightside-plan-${todayStr}.json"`,
      'Cache-Control': 'no-store',
    },
  })
}
