---
change_id: testing-rls-isolation-harness
title: RLS isolation harness — reusable owner-scoped isolation test for entity tables
status: new
created: 2026-07-04
updated: 2026-07-04
archived_at: null
---

## Notes

Rollout Phase 1 of `context/foundation/test-plan.md`: "RLS isolation harness".

- **Risk covered:** #4 — new entity tables (companies, tasks, content) expose one
  founder's data to another account (owner-scoped RLS regression).
- **Test types planned:** integration (DB/RLS).
- **Risk response intent:** Prove that Founder A's client cannot read/write Founder
  B's rows on the REAL entity tables (companies/tasks/content) as they land — not
  just the dummy canary table. Challenge the assumption "canary green = all tables
  safe"; each table applies RLS separately.
- **Goal:** a reusable owner-scoped isolation harness generalized from
  `tests/rls-canary.test.ts`.
- **Sequencing caveat (from §3):** only F-01 is implemented today; real entity
  tables land in S-01/S-02. If those tables don't yet exist, research grounds
  against the canary as the reference and the harness is built to accept new
  tables as they arrive.
