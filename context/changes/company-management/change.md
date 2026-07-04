---
change_id: company-management
title: Company management — add, edit, archive, list, and set status on companies
status: impl_reviewed
created: 2026-07-04
updated: 2026-07-04
archived_at: null
---

## Notes

S-01 z @context/foundation/roadmap.md

Roadmap seed (S-01):
- **Outcome:** Founder can add, edit, archive (soft-delete, data preserved), and list companies, and set a relationship status manually.
- **PRD refs:** US-01, FR-001, FR-002, FR-003, FR-004, FR-005 (manual status set; AI inference of status is in S-02).
- **Prerequisites:** F-01 (`persistence-rls-baseline` — owner-scoped RLS convention). Parallel with F-02.
- **Risk:** Straightforward owner-scoped CRUD on top of F-01's RLS convention; sequenced before the north star (S-02) because the AI loop needs a company to attach content to. Low risk, high unlock value.
