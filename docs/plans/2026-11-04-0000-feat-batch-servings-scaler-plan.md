---
title: Custom serving count for batch recipes - Plan
type: feat
date: 2026-11-04
artifact_contract: ce-unified-plan/v1
product_contract_source: ce-plan-bootstrap
execution: code
---

# Custom serving count for batch recipes - Plan

## Goal Capsule

- **Objective:** On a recipe with a "How to Batch It" section, a reader types how many servings they want and every batch amount updates, so they can batch for their actual party size without doing math.
- **Product authority:** GitHub issue #254 ("Make the batch drinks customizable so you can enter a number of servings and have all the batching amounts updated accordingly").
- **Open blockers:** none.

## Product Contract

### Problem Frame

Batch blocks are written for a fixed count (almost always 8 servings). Hosting 5 or 14 people means rescaling every line by hand.

### Requirements

- R1. When a recipe's `batch.yield` states a serving count (`N servings`), the batch section shows a number input prefilled with N.
- R2. Changing the input rescales every batch ingredient's leading amount by `new / N`, and updates the number in the yield line.
- R3. Amounts inside parentheticals that carry a unit (`(2 cups)`, `(750ml)`) scale too; ratios like `(1:1)` do not.
- R4. Lines with no leading amount (e.g. "Basil leaves for each serving…") and the `instructions` text stay unchanged (instructions describe per-glass steps).
- R5. Without JavaScript, or when `yield` states no serving count, the section renders exactly as today.

### Scope Boundaries

- Not in scope: generating batches for recipes that have no `batch` block; unit conversion (oz → cups/bottles); scaling `house_made` or single-serve ingredients; persisting the chosen count.

### Success Criteria

Paper Plane at 4 servings shows 3 oz / 3 oz / 3 oz / 2 oz and "Makes 4 servings:"; Oaxaca Old Fashioned at 12 shows 18 oz, 6 oz, 6 oz, 24 dashes.

## Planning Contract

### Key Technical Decisions

- KTD1. **Pure DOM-free module `src/lib/batchScale.ts`**, unit-tested, imported by a client `<script>` — same pattern as `src/scripts/recipeTabs.ts` + `RecipeLayout.astro`. `src/lib/abv.mjs`'s parser is not reused: it reads `fs` at import (server-only) and strips parentheticals, which R3 needs kept.
- KTD2. **Parse free-text strings; no schema change.** Leading amount grammar matches abv.mjs: integers, decimals, unicode fractions (`¼ ½ ¾ ⅓ ⅔`), mixed (`1½`), ranges (`2–3`, both ends scaled). Base servings from `yield` via `/(\d+)\s+servings?/i`.
- KTD3. **Rounding:** `oz` and `cups` to the nearest ¼, printed with unicode fractions (`2¼`); everything else (dashes, ml, counts, bottles) to the nearest whole, minimum 1 when the original was > 0. Integers print without decimals.
- KTD4. **Server render unchanged** (R5): the component renders today's markup plus, when base servings parse, an `<input type="number" min="1" max="99">` and `data-base` / `data-original` attributes holding original strings. The script rewrites text from the originals on each `input` event, so repeated edits never compound rounding.
- KTD5. **Pluralization:** a tiny map for the units seen in the corpus (`cup/cups`, `dash/dashes`, `bottle/bottles`, `serving/servings`) — singular when the scaled value is exactly 1, plural otherwise. Other words pass through untouched.

### Assumptions

- Input range 1–99; invalid/empty input leaves the last rendered amounts in place.
- The one batch with no serving count (Spritz, "My 6x batch from the card:") gets no input.

## Implementation Units

- U1. **Scaling module**
  - Files: `src/lib/batchScale.ts`, test `src/lib/batchScale.test.ts`
  - Approach: export `baseServings(yieldText): number | null`, `scaleLine(line, factor): string`, `scaleYield(yieldText, servings): string`. Per KTD2–KTD3.
  - Execution note: test-first (repo TDD rule).
  - Test scenarios:
    - `baseServings("Makes 8 servings:")` → 8; `"Makes 8 servings (~1 L dispenser)."` → 8; `"My 6x batch from the card:"` → null.
    - `scaleLine("6 oz Aperol", 0.5)` → `"3 oz Aperol"`; `("6 oz Aperol", 3/8)` → `"2¼ oz Aperol"`; `("16 dashes cocoa bitters", 12/8)` → `"24 dashes cocoa bitters"`.
    - `("16 oz (2 cups) gin", 0.5)` → `"8 oz (1 cup) gin"`; `("1 bottle (750ml) prosecco", 2)` → `"2 bottles (1500ml) prosecco"` (KTD5).
    - `("6 oz agave nectar (1:1)", 2)` → `"12 oz agave nectar (1:1)"` (ratio untouched).
    - `("Basil leaves for each serving (muddle…)", 2)` → unchanged.
    - `("2–3 dashes bitters", 2)` → `"4–6 dashes bitters"`; `("1½ oz lime", 1)` → `"1½ oz lime"`.
    - `scaleYield("Makes 8 servings:", 12)` → `"Makes 12 servings:"`; singular `1` → `"Makes 1 serving:"`.
- U2. **Batch component + script**
  - Files: `src/components/recipe/BatchInstructions.astro`
  - Approach: per KTD4. Labelled input ("Servings") beside the yield line; `<script>` in the component imports U1 and wires every `[data-batch-scaler]` on the page.
  - Test expectation: none — wiring over U1-tested functions; verify via build + browser check.

## Verification Contract

- `npm test`, `npm run validate`, `npx astro check` (0 errors), `npm run build`; browser check of Paper Plane and Oaxaca Old Fashioned against Success Criteria, plus Spritz showing no input.

## Definition of Done

U1 tests green, both units landed, Success Criteria pass in the browser, PR to `staging` with `Closes #254`.
