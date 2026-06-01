-- ─────────────────────────────────────────────────────────────────────────────
-- Phase A of the Legacy Contact post-death release infrastructure.
--
-- The platform's Privacy Policy describes a process for releasing a deceased
-- user's planning materials to their designated Legacy Contact. The actual
-- release is performed manually by an admin (out-of-band — see /privacy and
-- /app/help for the verification process). This migration adds the schema
-- needed to RECORD a release in the existing audit log table.
--
-- Two changes:
--   1. Extend the legacy_contact_action ENUM with 'released'.
--   2. Add nullable metadata columns to legacy_contact_audit_log for the
--      release-specific fields. Existing designated/updated/removed rows
--      are unaffected (the columns remain NULL for those).
--
-- The existing log_legacy_contact_change trigger only writes
-- (user_id, action, contact_type, previous_data, new_data) — it does not
-- reference the new columns and continues to work unchanged. Release rows
-- are inserted directly by the release tooling (Phase B), not by the trigger.
--
-- Retention note: the user_id FK to auth.users has ON DELETE CASCADE
-- (inherited from the original legacy_contact_audit_log definition), so
-- release records share the user's retention lifecycle — deleted with the
-- user account. The new released_to_contact_id FK to legacy_contacts uses
-- ON DELETE SET NULL so an audit row survives if the LC designation is
-- later changed (the historical "who received the release" is preserved
-- via the JSONB and contact-name fields below, plus the released_by /
-- verification_documentation_ref text record).
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Extend the action ENUM.
-- IF NOT EXISTS makes this idempotent across re-runs. PostgreSQL does not
-- permit ALTER TYPE ADD VALUE in the same transaction as code that
-- references the new value, but no code in this migration does so — the
-- value is only consumed by the Phase B release script.
ALTER TYPE legacy_contact_action ADD VALUE IF NOT EXISTS 'released';

-- 2. Add release-specific columns. All nullable; populated only for
-- action='released' rows inserted by the Phase B release script.
ALTER TABLE public.legacy_contact_audit_log
  ADD COLUMN IF NOT EXISTS released_to_contact_id          UUID REFERENCES public.legacy_contacts(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS released_items                  JSONB,
  ADD COLUMN IF NOT EXISTS released_by                     TEXT,
  ADD COLUMN IF NOT EXISTS verification_documentation_ref  TEXT,
  ADD COLUMN IF NOT EXISTS release_request_received_at     TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS release_artifact_hash           TEXT,
  ADD COLUMN IF NOT EXISTS notes                           TEXT;
