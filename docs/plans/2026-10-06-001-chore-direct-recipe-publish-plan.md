---
title: Direct Recipe Publish - Plan
type: chore
date: 2026-10-06
execution: code
---

# Direct Recipe Publish - Plan

Recipes the owner authors (given in chat, or a plain GitHub issue handed to `/lfg`) ship in one PR straight to a published category dir. The nanoclaw email intake and the `/ingest` bulk skill are retired. The inbox → review → promote flow stays only for the public "Submit a recipe" issue form. Docs-only change plus removing the `/ingest` skill; one PR from `chore-direct-recipe-publish` into `staging`.

**Decisions to honor (user-directed, 2026-10-05 brainstorm):** owner recipes skip the inbox (rejected: draft PR + promote PR, e.g. #226 + #228); issue form + `recipe-from-issue.yml` kept unchanged (public repo); nanoclaw email intake retired; `/ingest` retired; `staging → main` release + changelog PR ritual unchanged; no workflow or script changes.

## Implementation Units

### U1. CLAUDE.md — "Adding a recipe you wrote" (new primary path)
- Trigger: owner gives a recipe in chat, or hands a plain issue to `/lfg`.
- Write `recipes/classics/<slug>.md` with `category: classic`, `publish: true`; `originals/` only when the owner says it's their creation.
- Ask the owner about gaps (house-made recipe, measurements) before opening the PR — published recipes get full validation.
- Run `npm run validate`. Branch `feat-recipe-<slug>`, PR title `feat(recipe): add <Title>` (exact prefix `scripts/releaseCategorize.mjs` sorts into the release PR's Recipes section; `feat(recipes):` plural lands in Changes), body `Closes #N` when from an issue.
- Lead line: `recipes/inbox/` is not used for these.

### U2. CLAUDE.md — retire email intake, keep its rules
- Rename "Email Recipe Processing" → "Recipe normalization rules"; keep slug, enum inference, `ingredients[]`/`steps[]`, garnish/float, `house_made`/`batch`, attribution, notes, and body-shape rules.
- Drop the email trigger, inbox write, and `feat-inbox-*` branch/commit/PR steps, plus the token-permission fallback paragraph tied to them.

### U3. CLAUDE.md — scope the inbox to the issue form
- Directory tree: `inbox/` → issue-form submissions pending review.
- Recipe Pipeline → Lifecycle: draft/review/promote is the issue-form path; owner-authored recipes start published (so `npm run photos` applies immediately).
- "GitHub Issue Recipe Intake": drop "third intake path alongside email and `/ingest`"; note that plain issues don't trigger the workflow and go through U1.

### U4. Retire `/ingest`
- Delete `.claude/skills/ingest/`.
- Reword the `.gitignore` comment on `intake/` — the folder stays for `npm run photos` (`intake/photos/`).
- Leave historical `docs/brainstorms/`, `docs/ideation/`, `docs/plans/` untouched.

### U5. Retitle PR #228
- `feat(recipe): promote Mezcal Honey Saffron to classics` so it lands under Recipes in the next release PR.

## Verification
- No logic changes — TDD skip (docs/config). `npm test` and `npm run validate` stay green.
- Grep live files (excluding historical docs and CHANGELOG) for `Email Recipe`, `/ingest`, `nanoclaw`, and instructions sending owner recipes to `inbox/` — none remain.
