# Owner-scoped Persistence + RLS Baseline — Plan Brief

> Full plan: `context/changes/persistence-rls-baseline/plan.md`

## What & Why

Stand up the persistence foundation (roadmap F-01) that every later slice rides on: wire
Supabase migration tooling into the repo and establish a **verified, owner-scoped,
per-operation RLS convention**, so each future entity (companies, tasks, content) persists
strictly private to the authenticated founder by default. The PRD makes per-user isolation a
binding privacy guardrail — getting this convention right once avoids reworking every table.

## Starting Point

The Supabase CLI and `config.toml` (PG 17, migrations enabled) are present, but there is no
`migrations/` dir, no npm workflow, no test runner, and the SSR client (anon-key, cookie-based)
is untyped. The RLS convention exists only as prose in `CLAUDE.md`.

## Desired End State

A real migration workflow (`db:new`/`db:reset`/`db:types`), one reusable `set_updated_at()`
trigger, a typed `Database` client, a canonical copy-paste RLS template doc, and an automated
Vitest test that proves two real users can't see each other's rows on a throwaway canary table.
No entity tables are created.

## Key Decisions Made

| Decision              | Choice                                                                                       | Why                                                                            | Source |
| --------------------- | -------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ | ------ |
| Verification strategy | Canary table created + asserted + dropped inside a test                                      | Proves the real template end-to-end; leaves zero schema cruft                  | Plan   |
| RLS policy shape      | 4 per-op policies, `authenticated` only, `auth.uid() = user_id`                              | Matches CLAUDE.md's per-operation/per-role rule; auditable                     | Plan   |
| Column convention     | `id`/`user_id`(→auth.users, `default auth.uid()`)/`created_at`/`updated_at` + shared trigger | One copy-paste block + one reusable trigger every slice reuses                 | Plan   |
| Test harness          | Vitest + supabase-js integration (two real users)                                            | Exercises the actual anon-key/JWT→`auth.uid()` path; runner slices need anyway | Plan   |
| Typed client          | Establish typegen now, wire `createServerClient<Database>`                                   | Completes the tooling story; S-01 just reruns `db:types`                       | Plan   |
| Workflow exposure     | npm scripts + `docs/reference/rls-convention.md`                                             | One discoverable workflow + a canonical copy-paste source                      | Plan   |

## Scope

**In scope:** migration tooling + npm scripts; reusable `set_updated_at()` trigger; typed DB
client + generated types; RLS convention doc + canary fixture; Vitest two-user isolation test.

**Out of scope:** entity tables (companies/tasks/content — S-01/S-02); Storage RLS (S-02);
service-role/bypass paths (F-02); seed data; wiring the DB test into GitHub CI; auth changes.

## Architecture / Approach

`set_updated_at()` is the only permanent DB object. The RLS template lives in a reference doc
and in a canary fixture. The test connects to local Postgres via `pg` for DDL setup/teardown,
creates two users via the service-role admin API, then drives two separate anon-key clients to
assert isolation across SELECT/INSERT/UPDATE/DELETE — the same path the real app uses.

## Phases at a Glance

| Phase                                | What it delivers                                         | Key risk                                                 |
| ------------------------------------ | -------------------------------------------------------- | -------------------------------------------------------- |
| 1. Migration tooling + DB primitives | `migrations/`, trigger fn, npm scripts, typed client     | Typegen produces near-empty `Database` until S-01        |
| 2. RLS convention: template + doc    | `rls-convention.md` + canary fixture + CLAUDE.md pointer | Fixture drifting from the documented template            |
| 3. Automated isolation test (Vitest) | Two-user canary test proving RLS + clean teardown        | Test needs local stack (Docker); flaky if teardown leaks |

**Prerequisites:** local Supabase stack runnable (Docker, ~7 GB RAM); `supabase start` for Phases 1 & 3.
**Estimated effort:** ~1–2 sessions across 3 phases (small code volume; care concentrated in the RLS template + test).

## Open Risks & Assumptions

- The canary test is a **local gate**, not CI — CI still runs lint+build only; DB-in-CI is a follow-up.
- Local email confirmation is bypassed via service-role `admin.createUser({ email_confirm: true })`.
- Initial `database.types.ts` is near-empty (no tables yet); its value is the wired pipeline.

## Success Criteria (Summary)

- `npm run db:reset` applies the trigger migration cleanly; `npm run build`/`lint` pass.
- `npm test` proves user A cannot read/update/delete user B's rows and tears the canary down.
- A future slice can add a private table by copy-pasting the documented template — nothing else.
