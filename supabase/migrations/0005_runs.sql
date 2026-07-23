-- FitBridge run tracking: GPS-tracked runs, owned per-user, RLS protected.
-- The GPS path is stored as JSONB ([{lat,lng,t}]) so a run is a single row;
-- split summaries are derived on the client from the path + duration.

create table if not exists public.runs (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references auth.users(id) on delete cascade,
  started_at     timestamptz not null default now(),
  duration_sec   integer not null default 0,
  distance_m     numeric not null default 0,      -- metres
  avg_pace_sec   numeric not null default 0,      -- seconds per km
  calories       numeric not null default 0,
  path           jsonb not null default '[]'::jsonb,  -- [{lat,lng,t}]
  note           text not null default '',
  created_at     timestamptz not null default now()
);
create index if not exists runs_user_started_idx on public.runs (user_id, started_at desc);

alter table public.runs enable row level security;

drop policy if exists "runs_all" on public.runs;
create policy "runs_all" on public.runs
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
