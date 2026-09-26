---
title: Remove Difficulty and Serves - Plan
type: chore
date: 2026-09-25
artifact_contract: ce-unified-plan/v1
product_contract_source: ce-plan-bootstrap
execution: code
---

# Remove Difficulty and Serves - Plan

## Goal Capsule

- **Objective:** A visitor's recipe meta row shows only Glass · Method · Ice, and no page, filter, sort, feed, or intake path mentions difficulty or serves.
- **Means:** Delete both fields end-to-end — taxonomy, schema, data, UI, routes, icons, intake, docs — with no shim (KTD1).
- **Authority:** GitHub issue #206 > settled decisions below > this plan.
- **Stop conditions:** Stop if removing `difficulty` from the taxonomy breaks a consumer this plan did not list and the fix would change behavior beyond deletion.
- **Ships as:** one PR from `chore-206-remove-difficulty-serves` into `staging`, body `Closes #206`. Not merged by the agent.

## Product Contract

### Summary

Remove the Difficulty and Serves facts from recipes and every surface that reads them.

### Problem Frame

Difficulty and Serves add noise to the meta row: every recipe serves 1, and difficulty labels are subjective. The issue asks for their removal from the schema, the meta component, and any filtering.

### Requirements

- **R1.** The recipe detail facts grid renders Glass, Method, Ice only.
- **R2.** `difficulty` and `serves` are gone from the Zod schema, `data/taxonomy.yaml`, and the generated taxonomy artifacts.
- **R3.** No published recipe frontmatter carries `difficulty:` or `serves:`; only those lines change in recipe files.
- **R4.** Index filtering and sorting no longer reference difficulty; `/by-difficulty/*` pages no longer build.
- **R5.** `/recipes.json` entries no longer include `difficulty`.
- **R6.** Intake paths (issue form, issue workflow, ingest skill, CLAUDE.md email flow, TEMPLATE.md) no longer ask for or write difficulty/serves.
- **R7.** Glass, Method, Ice behavior is unchanged.

### Scope Boundaries

- Historical docs (`docs/plans/`, `docs/brainstorms/`, `docs/ideation/`) are not edited.
- `scripts/migrate-to-frontmatter.mjs` is a completed one-shot migration with its own local enum; left as history.
- `scripts/codegen-taxonomy.test.mjs` uses a synthetic `difficulties` fixture to test pluralisation; unaffected.
- `scripts/migrate-body-to-frontmatter.test.mjs` fixtures contain `difficulty: easy` as passthrough input; unaffected.
- Illustrative comments in `scripts/prep-icons.mjs` ("difficulty pips") and `scripts/codegen-taxonomy.mjs` (pluralisation example) stay unchanged.

### Assumptions

- `/by-difficulty/` URLs are deleted without redirects; the site's 404 page covers stale links (open area from brief, default taken).
- `/recipes.json` consumers tolerate a dropped field (the endpoint is a convenience feed from #150, no versioned contract).
- The difficulty icon SVGs, the `hbt_difficulty.png` source grid, and its `data/icon-grids.json` entry are removed so `npm run icons` cannot regenerate orphans.

## Planning Contract

### Key Technical Decisions

- **KTD1. Full deletion, no deprecation.** (session-settled: user-directed — chosen over hiding in UI only: issue says remove from schema.) Zod's default object strips unknown keys, so a stray `difficulty:` in a future inbox draft is harmless.
- **KTD2. Keep Glass/Method/Ice untouched.** (session-settled: user-directed — chosen over trimming more meta: issue scope.)
- **KTD3. Recipe files: delete only the `difficulty:` and `serves:` lines.** (session-settled: user-directed — chosen over reformatting frontmatter: parallel PRs #207/#208 must merge cleanly.)
- **KTD4. Sort/filter fallback reuses existing parsing.** `parseSortMode` already maps unknown values to `title`, so dropping `'difficulty'` from `SORT_MODES` makes `?sort=difficulty` degrade gracefully with no new code.
- **KTD5. Regenerate, don't hand-edit.** Remove `difficulties:` from `data/taxonomy.yaml`, run `npm run codegen`, commit YAML + `src/taxonomy.generated.ts` + `scripts/taxonomy.generated.mjs` + `TEMPLATE.md` together (CLAUDE.md rule).

### Sequencing

U1 (tests red) → U2 (code) → U3 (taxonomy+codegen, which removes `DIFFICULTIES` and so must follow U2 removing its importers) → U4 (data) → U5 (intake/docs).

## Implementation Units

### U1. Update tests to describe the removal (red)

- **Goal:** Failing tests that assert difficulty is gone from the pure libs.
- **Requirements:** R4, R5.
- **Files:** `src/lib/indexSort.test.ts`, `src/lib/recipesJson.test.ts`, `src/lib/breadcrumbs.test.ts`, `src/lib/icons.test.ts`.
- **Approach:** Replace difficulty-mode tests; drop difficulty fixtures.
- **Execution note:** Test-first; run `npm test` and confirm the new assertions fail before U2.
- **Test scenarios:**
  - `parseSortMode('difficulty')` returns `'title'`.
  - `recipeToJson(...)` output has no `difficulty` key.
  - `breadcrumbTrail('difficulty', 'x')` throws unknown facet.
  - `resolveIconKey('difficulty', 'easy')` returns `null`; parity map has no `difficulty` group.
- **Verification:** New assertions fail for the right reason.

### U2. Remove difficulty/serves from code paths (green)

- **Goal:** Libs, pages, components, schema no longer read either field.
- **Requirements:** R1, R2, R4, R5, R7.
- **Files:** `src/lib/indexSort.ts`, `src/lib/recipesJson.ts`, `src/pages/recipes.json.ts`, `src/lib/breadcrumbs.ts`, `src/lib/icons.ts`, `src/lib/taxonomy.ts`, `src/content.config.ts`, `src/layouts/RecipeLayout.astro`, `src/components/RecipeCard.astro`, `src/pages/index.astro`, delete `src/pages/by-difficulty/[difficulty].astro`, delete `src/assets/icons/difficulty/`, `data/icon-grids.json`, delete `docs/imgs/hbt_difficulty.png`, `scripts/migrate-styles-to-tags.mjs` (drop `DIFFICULTIES` import), `scripts/validate.mjs` (comment), `public/llms.txt`.
- **Approach:** Pure deletion; `serves` exists only in `src/content.config.ts` (no taxonomy entry). `index.astro` drops `difficulty` from `PANEL_FIELDS`, `cardMatches`, and the sort record.
- **Test scenarios:** U1 scenarios pass; existing title/spirit sort tests still pass.
- **Verification:** `npm test` green.

### U3. Taxonomy + codegen

- **Goal:** `difficulties` gone from the source of truth and all generated artifacts.
- **Requirements:** R2.
- **Files:** `data/taxonomy.yaml`, `src/taxonomy.generated.ts`, `scripts/taxonomy.generated.mjs`, `TEMPLATE.md` (table region via codegen; also frontmatter example lines by hand).
- **Test expectation:** none -- config/codegen; CI codegen staleness check and `astro check` cover it.
- **Verification:** `npm run codegen` produces no further diff; `npm test` green.

### U4. Recipe frontmatter

- **Goal:** Drop `difficulty:` and `serves:` lines from all recipes.
- **Requirements:** R3.
- **Files:** `recipes/classics/*.md`, `recipes/originals/*.md` (29 files with `difficulty`, 27 with `serves`).
- **Approach:** Line deletion only (KTD3); `git diff` should show only `-difficulty:`/`-serves:` lines.
- **Test expectation:** none -- data edit; `npm run validate` and `astro check` cover it.
- **Verification:** `grep -rE '^(difficulty|serves):' recipes` empty; `npm run validate` passes.

### U5. Intake paths and docs

- **Goal:** Nothing asks for or writes difficulty/serves.
- **Requirements:** R6.
- **Files:** `.github/ISSUE_TEMPLATE/recipe.yml`, `.github/workflows/recipe-from-issue.yml` (DIFFICULTIES array, pick, fm push, missing list, comments, PR body), `CLAUDE.md`, `README.md`, `.claude/skills/ingest/SKILL.md`, `docs/icon-set-prompts.md` (remove the Difficulty section with the retired icon grid).
- **Test expectation:** none -- config/docs.
- **Verification:** repo-wide grep for `difficult` shows only the Scope Boundaries exceptions.

## Verification Contract

- `npm test` (Vitest) green.
- `npm run validate` passes.
- `npm run build` (`astro check` + `astro build` + pagefind) passes; `dist/by-difficulty` absent.
- `npm run codegen` leaves the tree clean.
- `grep -rniE 'difficult|\bserves:' --exclude-dir={node_modules,dist,.astro,.git,docs} .` shows only the scope-boundary exceptions.

## Definition of Done

- R1–R7 met; all Verification Contract commands pass.
- Recipe file diffs contain only removed `difficulty:`/`serves:` lines.
- No abandoned-attempt code in the diff.
- PR open against `staging` with `Closes #206`.
