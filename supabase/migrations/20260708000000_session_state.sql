-- Shared simulation state for cross-device instructor <-> bedside sync.
-- Single-row ("singleton") snapshot; the instructor console upserts it and
-- late-joining bedside monitors read it once to hydrate before subscribing
-- to live broadcasts.
create table if not exists session_state (
  id text primary key default 'singleton',
  vitals jsonb not null,
  disconnect jsonb not null,
  alarm_limits jsonb not null,
  updated_at timestamptz default now()
);

alter table session_state enable row level security;

-- Single-user public tool: anonymous read + write. No auth layer.
drop policy if exists "public read" on session_state;
create policy "public read" on session_state for select using (true);

drop policy if exists "public write" on session_state;
create policy "public write" on session_state for all using (true);
