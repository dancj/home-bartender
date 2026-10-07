---
title: Estimated ABV on recipe pages - Plan
type: feat
date: 2026-10-07
artifact_contract: ce-unified-plan/v1
product_contract_source: ce-plan-bootstrap
execution: code
---

# Estimated ABV on recipe pages - Plan

## Goal Capsule

- **Objective:** On a recipe's detail page, a reader sees an approximate ABV for the finished drink, so they can tell a spirit-forward sipper from a session drink at a glance.
- **Product authority:** GitHub issue #171 plus the owner's choice in this session (detail page only).
- **Open blockers:** none.

## Product Contract

### Problem Frame

Recipes list ingredients but give no sense of strength. Pacing and picking a second round need a rough number.

### Requirements

- R1. The recipe detail page shows an estimated ABV as a rounded whole percent prefixed with `~`, labelled as an estimate.
- R2. The estimate is alcohol volume divided by post-dilution liquid volume.
- R3. When any ingredient's ABV is unknown, or an alcoholic ingredient's amount cannot be parsed, no estimate is shown for that recipe.
- R4. The detail page offers a short breakdown: alcohol volume, pre-dilution volume, dilution assumed, final volume.
- R5. `npm run validate` warns, per published recipe, about ingredients that block an estimate (R3).
- R6. A recipe can override the dilution factor and per-ingredient ABV in frontmatter.

### Key Decisions

- Display on the detail page only; recipe cards are unchanged. (session-settled: user-directed — chosen over "~N%" on card + detail and over a band+number display: keeps cards clean.) Governs R1.

### Scope Boundaries

- Not in scope: card display, strength bands, sorting/filtering by strength, standard drinks per serving.

### Success Criteria

Spot checks land in the issue's published ranges: Martini 28–30%, Negroni 22–24%, Daiquiri 18–20%, Mojito 10–12%.

## Planning Contract

### Key Technical Decisions

- KTD1. **One shared plain-JS module, `src/lib/abv.mjs`.** Both the Astro layout and `scripts/validate.mjs` (plain Node, no TS) import it. Avoids a second copy of the parser.
- KTD2. **Lookup lives in `data/ingredient-abv.yaml`** as a list of `{ match: [keywords], abv }` (abv as a fraction or percent — pick percent, e.g. `47`). Matching lowercases the ingredient name and takes the **longest** keyword that appears as a substring, so `sweet vermouth` beats `vermouth` and `bacon-washed bourbon` resolves to `bourbon`. Non-alcoholic items (juice, syrup, nectar, seltzer, soda, egg white, leaves, tepache) are entries with `abv: 0`. Loaded with the already-installed `yaml` package via `fs` at module load.
- KTD3. **Parse existing free-text `ingredients[]` strings; no schema reshape.** Strip `*(...)*` notes and `(...)` parentheticals first. Amounts: integers, decimals, unicode fractions (`½ ¾ ¼ ⅓ ⅔`), mixed (`1½`), ranges (`2–3` → midpoint). Units: `oz`; `dash`/`dashes`/`Dash of` ≈ 0.8 ml; `bar spoon`/`barspoon`/`tsp` ≈ 5 ml; `Splash` ≈ 0.5 oz; `Top`/`top with` ≈ 2 oz; `egg white` ≈ 1 oz at 0%; count items with no unit (leaves) contribute no volume. An unparseable amount on a 0% ingredient is ignored; on an alcoholic one it blocks the estimate (R3). The top-level `float` string is parsed the same way and added after dilution.
- KTD4. **Dilution by method, ice as modifier:** stirred 22%, shaken 28%, blended 50%; built → 15% on ice, 25% on crushed, 0% when `ice: none`. Calibrated so the spot checks in Success Criteria hold.
- KTD5. **Override shape:** optional frontmatter `abv: { dilution?: number (percent), ingredients?: { <keyword>: <percent> } }`, added to the Zod schema in `src/content.config.ts`. Ingredient overrides are matched the same way as the lookup and win over it.
- KTD6. **Display:** a fourth `fact-cell` "ABV" in the existing `facts-grid` of `src/layouts/RecipeLayout.astro` showing `~N%` with an `est.` fact-note, plus a small `<details>` "How it's estimated" below the grid carrying the R4 breakdown and the line "Estimate — varies by bottle and technique." Omitted entirely when R3 applies.

### Assumptions

- Spot-check fixtures use classic specs: Martini 2 oz gin (47%) + 1 oz dry vermouth (17%), stirred; Negroni 1/1/1 gin/Campari/sweet vermouth, stirred; Daiquiri 2 oz white rum (40%), ¾ lime, ¾ simple, shaken; Mojito 2 oz white rum, ¾ lime, ¾ simple, 2 oz soda, built on crushed. None of these exist as repo recipes, so they are test fixtures.
- Default proofs: gin 47, vodka/rum/tequila/mezcal/bourbon/rye/scotch/whiskey 40, overproof/"high-proof" not special-cased (override via R6), Campari 24, Aperol 11, sweet/dry vermouth 16/17, Cointreau/triple sec 40, Green Chartreuse 55, Yellow 40, maraschino 32, St-Germain 20, Amaro Nonino 35, limoncello 30, chocolate liqueur 20, prosecco/champagne/sparkling wine 12, Angostura 44.7, other bitters 40.

## Implementation Units

- U1. **ABV core module + lookup**
  - Files: `src/lib/abv.mjs`, `data/ingredient-abv.yaml`, test `src/lib/abv.test.ts`
  - Approach: export `parseIngredient(line)` → `{ name, oz | null }`, `lookupAbv(name, overrides)` → percent | null, `estimateAbv(recipeData)` → `{ abv, alcoholOz, preOz, dilution, finalOz }` or `{ abv: null, blockers: string[] }`. Per KTD1–KTD5.
  - Execution note: test-first (repo TDD rule).
  - Test scenarios:
    - parse `1½ oz white rum` → 1.5 oz; `¾ oz fresh lime juice` → 0.75; `"0.8 oz elderflower liqueur (St-Germain)"` → 0.8, name without parenthetical; `2–3 dashes cocoa bitters` → 2.5 dashes in oz; `1 bar spoon maple syrup` → ~0.17 oz; `Dash of hot bitters` → 1 dash; `Splash of club soda` → 0.5 oz; `8–10 fresh mint leaves` → 0 oz; `1 egg white` → 1 oz.
    - lookup: `sweet vermouth` → 16 not dry; `bacon-washed bourbon` → 40; `Cointreau or triple sec` → 40; unknown `yuzu kosho` → null.
    - estimate spot checks: Martini 28–30, Negroni 22–24, Daiquiri 18–20, Mojito 10–12 (rounded).
    - blockers: one unknown ingredient → `abv: null` with that ingredient named; unparseable amount on a 0% ingredient → still estimates.
    - overrides: `abv.dilution: 0` changes result; `abv.ingredients.gin: 57` raises it.
    - dilution: built + `ice: none` → 0.
- U2. **Schema field for overrides**
  - Files: `src/content.config.ts`
  - Approach: optional `abv` object per KTD5.
  - Test expectation: none -- schema wiring; covered by `npx astro check`.
- U3. **Validator warning**
  - Files: `scripts/validate.mjs`, test `scripts/validate.test.mjs`
  - Approach: for `publish: true` recipes, call `estimateAbv` and push one warning naming blockers. Keep it a warning, not an error.
  - Test scenarios: recipe with all-known ingredients → no ABV warning; recipe with an unknown ingredient → warning text names it.
  - After implementing, run `npm run validate` against the real corpus and extend `data/ingredient-abv.yaml` until every published recipe estimates, unless an ingredient genuinely has no sensible default.
- U4. **Detail-page display**
  - Files: `src/layouts/RecipeLayout.astro`
  - Approach: per KTD6; reuse `fact-cell`/`fact-label`/`fact-value`/`fact-note` classes.
  - Test expectation: none -- presentation over the U1-tested function; verify via build.

## Verification Contract

- `npm test`, `npm run validate` (0 errors; no ABV warnings for published recipes unless documented in the PR), `npx astro check` (0 errors), `npm run build`.

## Definition of Done

All units landed with tests green; every published recipe either shows an ABV or has its blocker listed in the PR body; PR to `staging` with `Closes #171`.
