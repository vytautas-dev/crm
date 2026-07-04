# Owner-scoped table + RLS convention

This is the canonical source every owner-scoped table in this project copies from.
The PRD privacy guardrail is binding: each user's data is **strictly private to the
authenticated user — no leakage between accounts**. Postgres Row-Level Security (RLS)
is the enforcement layer, not application code.

Our Supabase client (`src/lib/supabase.ts`) is a cookie-based SSR client built with the
**anon key**, so a signed-in user's JWT flows through to Postgres and `auth.uid()` is the
ownership key. Every table below isolates rows by `auth.uid() = user_id`.

> This convention is verified end-to-end by `npm test` — see [How to verify](#how-to-verify).

## The standard owner-scoped table

Copy this block into a new migration, replacing `<entity>` with the table name (e.g.
`companies`, `tasks`). Add your entity columns where marked; everything else is fixed.

```sql
-- Standard owner-scoped table
create table public.<entity> (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  -- ...entity columns...
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.<entity> enable row level security;

create trigger set_<entity>_updated_at
  before update on public.<entity>
  for each row execute function public.set_updated_at();

create policy "<entity>_select_own" on public.<entity>
  for select to authenticated using (auth.uid() = user_id);
create policy "<entity>_insert_own" on public.<entity>
  for insert to authenticated with check (auth.uid() = user_id);
create policy "<entity>_update_own" on public.<entity>
  for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "<entity>_delete_own" on public.<entity>
  for delete to authenticated using (auth.uid() = user_id);
```

## Why each piece is the way it is

- **`id uuid default gen_random_uuid()`** — PG 17 (pinned in `supabase/config.toml`) ships
  `gen_random_uuid()` in core, so no `pgcrypto`/`uuid-ossp` extension is needed.
- **`user_id ... references auth.users(id) on delete cascade`** — ownership is keyed to the
  Supabase auth user; deleting the user removes their rows.
- **`default auth.uid()` on `user_id`** — inserts are owner-safe even if the client omits
  `user_id`; the value is taken from the caller's JWT. The INSERT policy's `with check` still
  enforces `auth.uid() = user_id`, so a client that _forges_ a different `user_id` is rejected.
- **`set_<entity>_updated_at` trigger** — reuses the shared `public.set_updated_at()` function
  (migration `…_set_updated_at_function.sql`), keeping `updated_at` current at the DB layer
  rather than trusting the client. This is the one permanent DB primitive of the F-01 baseline.
- **Four per-operation policies for `authenticated`** — granular SELECT / INSERT / UPDATE /
  DELETE policies (not one `for all`) so each operation's intent is explicit and auditable.
  - `using` filters which existing rows the operation can see/affect (SELECT, UPDATE, DELETE).
  - `with check` validates the row _after_ the write (INSERT, UPDATE) — this is what blocks a
    forged `user_id`.
- **No `anon` policy** — with RLS enabled and no policy granting the `anon` role access, anon is
  **denied by default**. There is no need for an explicit deny policy; absence of a grant _is_
  the denial.

## The silent-filter gotcha (important)

RLS does not raise an error when a write touches rows the caller can't see — it silently
filters them out. A `update`/`delete` against another user's row simply affects **zero rows**
and returns success. So:

- Do **not** assert isolation by expecting a thrown error on UPDATE/DELETE.
- **Do** chain `.select()` on the write and assert the returned array is empty, and/or read the
  row back as its real owner and confirm it is unchanged.

The INSERT-with-forged-`user_id` case is the exception: `with check` _does_ raise an error.

## How to verify

`tests/rls-canary.test.ts` (run via `npm test`, against a running local stack) applies
`supabase/tests/fixtures/canary_table.sql` — a throwaway `public.canary` table built from the
exact template above — signs in two real users, and proves user A cannot SELECT, UPDATE, or
DELETE user B's rows, then tears everything down. Keep the fixture in lockstep with the SQL
block above: if this convention changes, update both.
