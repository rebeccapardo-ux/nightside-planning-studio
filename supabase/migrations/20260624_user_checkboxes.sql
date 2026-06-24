-- Domain user-defined tasks (Phase 1) — SETUP (additive, pre-deploy).
--
-- Creates the table backing user-added task checkboxes on domain pages. A row is
-- one user-authored checkbox living under a predefined readiness row (row_key =
-- that row's key from lib/domain-structure.ts) OR under the synthetic catch-all
-- ('other'). User checkboxes count toward a domain's planning-status progress
-- exactly like platform checkboxes (via computeDomainProgress in lib/domain-status.ts).
--
-- This migration is PURELY ADDITIVE and inert until consumed: no shipped code reads
-- or writes user_checkboxes yet (the read paths land in the next PR, write paths
-- after). Safe to apply any time, including before that code deploys.
--
-- Design decisions baked in here:
--   * domain_id is uuid with an FK to containers(id) ON DELETE CASCADE — matching
--     how domain_state / domain_hidden_notes key on the container UUID, and (unlike
--     domain_hidden_notes' bare text domain_id) preventing orphaned rows if a
--     container is ever deleted.
--   * row_key 'other' is RESERVED for the synthetic catch-all row. No predefined
--     readiness row in lib/domain-structure.ts is or may be named 'other' — a
--     user_checkboxes row whose row_key matches no current readiness key falls
--     through to the 'other' row at render time (graceful degradation if a key
--     is ever changed).
--   * No constraint on label content beyond the column type (freeform user input,
--     treated like every other freeform field on the platform).
--   * updated_at is maintained APP-SIDE (set on each UPDATE), consistent with the
--     rest of the app — no DB trigger.
--   * RLS uses PER-COMMAND policies (per the junction-table policy direction),
--     not a single FOR ALL.
--
-- Idempotent and safe to re-run.

CREATE TABLE IF NOT EXISTS user_checkboxes (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users on delete cascade,
  domain_id  uuid not null references containers (id) on delete cascade,
  row_key    text not null,
  label      text not null,
  checked    boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table user_checkboxes enable row level security;

-- Per-command policies: a user may only see/insert/update/delete their own rows.
drop policy if exists "user_checkboxes select own" on user_checkboxes;
create policy "user_checkboxes select own"
  on user_checkboxes for select
  using (auth.uid() = user_id);

drop policy if exists "user_checkboxes insert own" on user_checkboxes;
create policy "user_checkboxes insert own"
  on user_checkboxes for insert
  with check (auth.uid() = user_id);

drop policy if exists "user_checkboxes update own" on user_checkboxes;
create policy "user_checkboxes update own"
  on user_checkboxes for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "user_checkboxes delete own" on user_checkboxes;
create policy "user_checkboxes delete own"
  on user_checkboxes for delete
  using (auth.uid() = user_id);

-- Page-render query pattern: "all of this user's tasks for this domain."
create index if not exists user_checkboxes_user_domain_idx
  on user_checkboxes (user_id, domain_id);

DO $$
BEGIN
  RAISE NOTICE 'user_checkboxes ready (domain user-defined tasks; inert until consumed).';
END $$;
