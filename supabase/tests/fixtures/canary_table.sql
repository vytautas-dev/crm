-- Canary fixture for the RLS isolation test (tests/rls-canary.test.ts).
--
-- This is a throwaway instantiation of the owner-scoped table convention
-- documented in docs/reference/rls-convention.md, with <entity> = canary and
-- no extra entity columns. The test applies it, proves user A cannot reach
-- user B's rows, and drops it again — so the test verifies the ACTUAL
-- documented template, not a divergent copy.
--
-- Keep this in lockstep with the canonical SQL block in
-- docs/reference/rls-convention.md. If the convention changes, change both.
--
-- Drop-first so reruns are idempotent (the test also drops in teardown).
drop table if exists public.canary cascade;

create table public.canary (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.canary enable row level security;

create trigger set_canary_updated_at
  before update on public.canary
  for each row execute function public.set_updated_at();

create policy "canary_select_own" on public.canary
  for select to authenticated using (auth.uid() = user_id);
create policy "canary_insert_own" on public.canary
  for insert to authenticated with check (auth.uid() = user_id);
create policy "canary_update_own" on public.canary
  for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "canary_delete_own" on public.canary
  for delete to authenticated using (auth.uid() = user_id);
