---
title: Inbox Draft for Mezcal Honey Saffron - Plan
type: feat
date: 2026-10-03
artifact_contract: ce-unified-plan/v1
product_contract_source: ce-plan-bootstrap
execution: code
---

# Inbox Draft for Mezcal Honey Saffron - Plan

## Goal Capsule

- **Objective:** The Mezcal Honey Saffron from issue #222 lands as a reviewable inbox draft, ready for promotion once the syrup and taxonomy are confirmed.
- **Means:** One recipe file, `recipes/inbox/mezcal-honey-saffron.md`, written to the repo's documented intake conventions (CLAUDE.md Email Recipe Processing / GitHub Issue Recipe Intake).
- **Authority:** GitHub issue #222 > CLAUDE.md intake rules > this plan.
- **Stop conditions:** Stop if `npm run validate` or `astro check` rejects the draft for a reason that needs a taxonomy change.
- **Ships as:** one PR from `feat-inbox-mezcal-honey-saffron` into `staging`, body `Closes #222`. Not merged by the agent.

## Product Contract

### Problem Frame

The owner filed a recipe via a plain issue (not the issue form, so no workflow drafted it). It needs to enter the collection the same way every intake path does: as an unpublished inbox draft a human reviews and promotes.

### Requirements

- **R1.** `recipes/inbox/mezcal-honey-saffron.md` exists with `category: inbox`, `publish: false`.
- **R2.** Frontmatter carries `ingredients[]` (1½ oz mezcal, ¾ oz saffron honey syrup, 2 dashes Angostura bitters), `steps[]` (shake with ice, strain into a chilled coupe, float), and top-level `float: ¼ oz Laphroaig`.
- **R3.** `title`, `blurb`, `glass`, `method`, `ice` are filled with valid taxonomy slugs, so the draft won't break the release build's `astro check`.
- **R4.** `attribution` stays empty (the restaurant is unnamed). No `house_made` block is invented; the syrup recipe isn't in the source.
- **R5.** Body is `# Title`, blurb quote, and `## Notes` only. Notes state that the drink is based on a local restaurant's drink (the source says so) and nothing inferred.

### Scope Boundaries

- Out: promotion (`npm run promote`), photos, a Syrups entry for saffron honey syrup — all need information the issue doesn't carry.

### Assumptions

- Inferred enums (reviewer may adjust at promotion): `glass: coupe`, `method: shaken`, `ice: none` (served up), `spirits: [mezcal, scotch]`, `flavors: [smoky, sweet, spirit-forward]`, `roots: []`.
- "laphroig" in the issue is Laphroaig; spelled correctly in the draft.

## Key Technical Decisions

- **KTD1 — Inbox draft, not direct publish.** Follows CLAUDE.md: every intake lands in `recipes/inbox/` with `publish: false`; promotion happens after merge.
- **KTD2 — Missing syrup stays missing.** The validator warns on a craft-prep ingredient with no `house_made` only for published recipes; the PR flags it for the reviewer instead of guessing a recipe.

## Implementation Units

### U1. Write the inbox draft
- File: `recipes/inbox/mezcal-honey-saffron.md` (pattern: `recipes/classics/penicillin.md` for float + frontmatter shape; `TEMPLATE.md` for body).

## Verification

- Execution note: content-only — TDD skip category (no logic).
- `npm run validate` passes; `npm test` green; `npx astro check` 0 errors with the draft present.
