-- Security hardening for the trigger functions (clears advisor warnings).

-- Pin search_path on the updated_at trigger function.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public as $$
begin
  new.updated_at = now();
  return new;
end; $$;

-- handle_new_user / set_updated_at are trigger-only; they must not be callable
-- directly over the REST RPC surface by anon or authenticated roles.
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.set_updated_at() from public, anon, authenticated;
