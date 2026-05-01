-- domain_topic_notes: notes manually attached to a topic row on a domain page
create table if not exists domain_topic_notes (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users on delete cascade,
  note_id    uuid not null,
  domain_id  text not null,
  topic_id   text not null,
  created_at timestamptz not null default now(),
  unique(user_id, note_id, domain_id, topic_id)
);

alter table domain_topic_notes enable row level security;

create policy "Users manage own domain_topic_notes"
  on domain_topic_notes for all
  using  (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- hidden_row_notes: auto-surfaced notes the user has removed from a row
-- Prevents them from resurfacing and excludes them from "Your Thoughts"
create table if not exists hidden_row_notes (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users on delete cascade,
  note_id    uuid not null,
  domain_id  text not null,
  topic_id   text not null,
  created_at timestamptz not null default now(),
  unique(user_id, note_id, domain_id, topic_id)
);

alter table hidden_row_notes enable row level security;

create policy "Users manage own hidden_row_notes"
  on hidden_row_notes for all
  using  (auth.uid() = user_id)
  with check (auth.uid() = user_id);
