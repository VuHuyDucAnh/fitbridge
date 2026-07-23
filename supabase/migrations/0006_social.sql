-- FitBridge social layer: posts, kudos, follows. RLS enforces visibility.

create table if not exists public.posts (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  kind        text not null default 'text',      -- 'text' | 'workout' | 'run'
  ref_id      text not null default '',           -- workout/run id when relevant
  caption     text not null default '',
  stat        jsonb not null default '{}'::jsonb, -- denormalized headline stats
  visibility  text not null default 'public',     -- 'public' | 'followers'
  created_at  timestamptz not null default now()
);
create index if not exists posts_user_created_idx on public.posts (user_id, created_at desc);
create index if not exists posts_created_idx on public.posts (created_at desc);

create table if not exists public.follows (
  follower_id uuid not null references auth.users(id) on delete cascade,
  followee_id uuid not null references auth.users(id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (follower_id, followee_id)
);
create index if not exists follows_followee_idx on public.follows (followee_id);

create table if not exists public.kudos (
  post_id    uuid not null references public.posts(id) on delete cascade,
  user_id    uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);
create index if not exists kudos_post_idx on public.kudos (post_id);

alter table public.posts   enable row level security;
alter table public.follows enable row level security;
alter table public.kudos   enable row level security;

-- Posts: readable if public, your own, or a followers-only post by someone you follow.
drop policy if exists "posts_select" on public.posts;
create policy "posts_select" on public.posts
  for select using (
    visibility = 'public'
    or user_id = auth.uid()
    or exists (
      select 1 from public.follows f
      where f.follower_id = auth.uid() and f.followee_id = posts.user_id
    )
  );

drop policy if exists "posts_insert" on public.posts;
create policy "posts_insert" on public.posts
  for insert with check (user_id = auth.uid());

drop policy if exists "posts_update" on public.posts;
create policy "posts_update" on public.posts
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "posts_delete" on public.posts;
create policy "posts_delete" on public.posts
  for delete using (user_id = auth.uid());

-- Follows: anyone can read the graph; you manage only your own follow rows.
drop policy if exists "follows_select" on public.follows;
create policy "follows_select" on public.follows for select using (true);

drop policy if exists "follows_write" on public.follows;
create policy "follows_write" on public.follows
  for all using (follower_id = auth.uid()) with check (follower_id = auth.uid());

-- Kudos: readable by all (for counts); you add/remove only your own.
drop policy if exists "kudos_select" on public.kudos;
create policy "kudos_select" on public.kudos for select using (true);

drop policy if exists "kudos_write" on public.kudos;
create policy "kudos_write" on public.kudos
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
