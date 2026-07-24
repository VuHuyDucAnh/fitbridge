-- FitBridge nutrition: per-user meal log with detected items + macros.
-- Photos live in a `meal-photos` bucket whose listing is scoped to the owner.

create table if not exists public.meals (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  eaten_on   date not null default (now() at time zone 'utc')::date,
  slot       text not null default 'breakfast',   -- breakfast|lunch|dinner|snack
  title      text not null default '',
  photo_url  text not null default '',
  items      jsonb not null default '[]'::jsonb,   -- ["2 eggs","toast",...]
  kcal       numeric not null default 0,
  protein    numeric not null default 0,
  carbs      numeric not null default 0,
  fat        numeric not null default 0,
  ai         boolean not null default false,       -- estimated by vision model
  created_at timestamptz not null default now()
);
create index if not exists meals_user_day_idx on public.meals (user_id, eaten_on);

alter table public.meals enable row level security;

drop policy if exists "meals_all" on public.meals;
create policy "meals_all" on public.meals
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Nutrition target on the profile (kept simple; derived from goal by default).
alter table public.profiles add column if not exists kcal_target numeric not null default 0;

-- Meal photo bucket. Public for object-URL access, but SELECT is scoped to the
-- owner's own folder so clients can't list everyone's meal photos.
insert into storage.buckets (id, name, public)
values ('meal-photos', 'meal-photos', true)
on conflict (id) do nothing;

drop policy if exists "meal_photos_owner_read" on storage.objects;
create policy "meal_photos_owner_read" on storage.objects
  for select using (
    bucket_id = 'meal-photos' and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "meal_photos_own_insert" on storage.objects;
create policy "meal_photos_own_insert" on storage.objects
  for insert with check (
    bucket_id = 'meal-photos' and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "meal_photos_own_delete" on storage.objects;
create policy "meal_photos_own_delete" on storage.objects
  for delete using (
    bucket_id = 'meal-photos' and (storage.foldername(name))[1] = auth.uid()::text
  );
