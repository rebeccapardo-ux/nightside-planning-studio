-- Domain-page redesign (Pass 2) — SETUP (additive, pre-deploy).
--
-- Creates the per-domain note-suppression table that the Pass 2 code reads/writes.
-- Note suppression moves from per-row (the old hidden_row_notes:
-- user_id, note_id, domain_id, topic_id) to per-DOMAIN (user_id, note_id, domain_id).
-- "Remove" on a sticky in the domain's Your Thoughts stream writes a row here; the
-- stream is (container-linked notes ∪ auto-surfaced prompt notes) − domain_hidden_notes.
--
-- SAFE TO APPLY ANY TIME, including BEFORE the Pass 2 code deploys — it is purely
-- additive and nothing references it until the new code is live. Applying it first
-- avoids a window where "Remove" would no-op against a missing table.
-- The destructive counterpart (dropping the old tables + stripping orient) is the
-- separate post-deploy migration 20260623b_domain_page_pass2_cleanup.sql.
--
-- Idempotent and safe to re-run.

CREATE TABLE IF NOT EXISTS domain_hidden_notes (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users on delete cascade,
  note_id    uuid not null,
  domain_id  text not null,
  created_at timestamptz not null default now(),
  unique (user_id, note_id, domain_id)
);

alter table domain_hidden_notes enable row level security;

drop policy if exists "Users manage own domain_hidden_notes" on domain_hidden_notes;
create policy "Users manage own domain_hidden_notes"
  on domain_hidden_notes for all
  using  (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Query pattern: "which notes has this user hidden from this domain's stream."
create index if not exists domain_hidden_notes_user_domain_idx
  on domain_hidden_notes (user_id, domain_id);

DO $$
BEGIN
  RAISE NOTICE 'domain_hidden_notes ready (per-domain note suppression).';
END $$;
