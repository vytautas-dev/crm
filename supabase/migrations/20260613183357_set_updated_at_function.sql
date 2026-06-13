-- Reusable trigger function for owner-scoped tables.
-- Every table following the RLS convention (docs/reference/rls-convention.md)
-- attaches a BEFORE UPDATE trigger to this function to keep updated_at current
-- at the database layer. This is the one permanent DB primitive of the F-01
-- persistence baseline; entity tables arrive with their own slices.
--
-- search_path is pinned to '' to avoid the mutable-search-path security warning;
-- now() resolves from pg_catalog, which is always implicitly on the path.

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
