-- S-01 company-management: owner-scoped companies table
-- Copied from docs/reference/rls-convention.md (the canonical owner-scoped table + RLS block).
-- Entity columns: name, status (CHECK over the 5 relationship states), archived_at (soft-delete).

create table public.companies (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  name text not null,
  status text not null default 'lead'
    check (status in ('lead', 'in_progress', 'negotiating', 'investor', 'inactive')),
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.companies enable row level security;

create trigger set_companies_updated_at
  before update on public.companies
  for each row execute function public.set_updated_at();

create policy "companies_select_own" on public.companies
  for select to authenticated using (auth.uid() = user_id);
create policy "companies_insert_own" on public.companies
  for insert to authenticated with check (auth.uid() = user_id);
create policy "companies_update_own" on public.companies
  for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "companies_delete_own" on public.companies
  for delete to authenticated using (auth.uid() = user_id);
