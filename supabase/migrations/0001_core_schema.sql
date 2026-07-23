-- FitBridge core schema: profiles, workouts, weight logs.
-- Every table is owned per-user and protected by Row Level Security.
-- Applied to project wurkhgxhrqqhdzjzmawy.

-- ============ profiles ============
create table if not exists public.profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  name          text not null default '',
  gender        text not null default 'other',
  height        numeric not null default 175,
  weight        numeric not null default 70,
  age           integer not null default 24,
  level         text not null default 'beginner',
  goal          text not null default 'maintaining',
  bio           text not null default '',
  avatar_hue    integer not null default 22,
  metrics_public boolean not null default false,
  share_metrics boolean not null default true,
  beast_mode    boolean not null default true,
  onboarded     boolean not null default false,
  joined        timestamptz,
  last_checkin  timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- ============ workouts ============
create table if not exists public.workouts (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  exercise_id  text not null,
  performed_at timestamptz not null default now(),
  reps         integer not null default 0,
  sets         integer not null default 1,
  duration_sec integer not null default 0,
  form_score   numeric not null default 0,
  calories     numeric not null default 0,
  created_at   timestamptz not null default now()
);
create index if not exists workouts_user_perf_idx on public.workouts (user_id, performed_at desc);

-- ============ weight logs ============
create table if not exists public.weight_logs (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  logged_at  timestamptz not null default now(),
  weight     numeric not null,
  created_at timestamptz not null default now()
);
create index if not exists weight_logs_user_idx on public.weight_logs (user_id, logged_at);

-- ============ updated_at trigger ============
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end; $$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- ============ auto-create profile on signup ============
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public as $$
begin
  insert into public.profiles (id, name)
  values (new.id, coalesce(new.raw_user_meta_data->>'name', ''))
  on conflict (id) do nothing;
  return new;
end; $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============ row level security ============
alter table public.profiles    enable row level security;
alter table public.workouts    enable row level security;
alter table public.weight_logs enable row level security;

drop policy if exists "profiles_select" on public.profiles;
create policy "profiles_select" on public.profiles
  for select using (id = auth.uid() or metrics_public = true);

drop policy if exists "profiles_insert" on public.profiles;
create policy "profiles_insert" on public.profiles
  for insert with check (id = auth.uid());

drop policy if exists "profiles_update" on public.profiles;
create policy "profiles_update" on public.profiles
  for update using (id = auth.uid()) with check (id = auth.uid());

drop policy if exists "workouts_all" on public.workouts;
create policy "workouts_all" on public.workouts
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "weight_logs_all" on public.weight_logs;
create policy "weight_logs_all" on public.weight_logs
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
