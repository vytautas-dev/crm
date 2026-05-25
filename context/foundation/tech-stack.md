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
