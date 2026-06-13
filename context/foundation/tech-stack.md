---
starter_id: 10x-astro-starter
package_manager: npm
project_name: crm
hints:
  language_family: js
  team_size: solo
  deployment_target: cloudflare-pages
  ci_provider: github-actions
  ci_default_flow: auto-deploy-on-merge
  bootstrapper_confidence: first-class
  path_taken: standard
  quality_override: false
  self_check_answers: null
  has_auth: true
  has_payments: false
  has_realtime: false
  has_ai: true
  has_background_jobs: true
---

## Why this stack

A solo founder shipping a 5-week after-hours MVP with auth, AI content analysis, and
file uploads needs a battle-tested, agent-friendly starter that handles auth, database,
and storage out of the box — without assembling the stack from scratch. The 10x Astro
Starter (Astro + Supabase + Cloudflare Pages) is the recommended default for
`(web-app, js)`, clears all four agent-friendly gates, and maps directly to three
PRD feature flags: auth via Supabase Auth, AI integration via the TypeScript SDK with
explicit types at every boundary, and file storage via Supabase Storage. The one
constraint — background AI processing that must run non-blocking — is handled by
routing analysis through Supabase Edge Functions rather than Cloudflare Workers,
keeping the compute close to the data layer. CI runs on GitHub Actions with
auto-deploy-on-merge, matching what the starter ships with.

## Resolved decisions (2026-06-13)

- **AI provider: Anthropic Claude API.** Chosen for the privacy NFR — Anthropic does
  not train on inputs/outputs of the commercial API by default. Citation and
  no-fabrication requirements (FR-007) are enforced via structured outputs
  (`output_config.format` / strict tool schema). Model tier is decided per change in
  `/10x-plan` — candidates: Sonnet 4.6 ($3/$15 per MTok, balanced default), Opus 4.8
  ($5/$25, max accuracy), Haiku 4.5 ($1/$5, cheapest). Caveat: Claude Fable 5 requires
  30-day retention (no zero-data-retention) — only relevant if ZDR is later required.
- **AI completion notification: client-side status polling** (not Supabase Realtime).
  The browser polls a job/result status field and toasts on completion. Avoids the
  WebSocket-through-Workers risk flagged in `infrastructure.md`; the PRD imposes no
  latency cap. Realtime stays a post-MVP UX upgrade.
