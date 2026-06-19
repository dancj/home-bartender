---
title: "fix: Site polish batch 2 — cards, families view, mobile tabs, search"
type: fix
date: 2026-06-18
status: ready
depth: standard
issues: [90, 91, 92, 93]
---

# fix: Site polish batch 2 — cards, families view, mobile tabs, search

## Summary

Four independent front-end fixes against the generated Astro site, each tracked by a GitHub issue:

- **#90** — Homepage recipe cards show a difficulty mini-badge; replace it with flavor icons.
- **#91** — Families view (the per-family branching map) has cramped spacing, an undersized root family icon, no per-recipe flavor signal, and nodes that bunch/overlap on mobile.
- **#92** — On mobile the family **tab nav** overflows the viewport / runs off the page.
- **#93** — Pagefind search throws in the console and never loads: the core `pagefind.js` is requested at the domain root instead of under the site `base`.

All four are bug/polish fixes on existing components. Only #91's flavor-delta logic is feature-bearing (touches the unit-tested `familyMap.ts` model) and follows TDD; the rest are CSS, markup, and a one-token config fix.

---

## Problem Frame

The site shipped a families map and Pagefind search in the recent polish batch (commits around `3cb90f8`). Real-device use surfaced four defects, captured with screenshots in issues #90–#93. None are regressions in shared infra — each is contained to one or two components — so they can land as one batched `fix` branch with per-issue commits.

**Root causes (confirmed by reading source):**

- **#93** is a Pagefind API mismatch. `src/components/Search.astro:20` passes `bundleDirectory` to `PagefindUI`. Pagefind UI **v1.x** (repo is on `pagefind ^1.5.0`) renamed that option to `bundlePath`. Verified in the built bundle: `dist/pagefind/pagefind-ui.js` references `bundlePath` 8×, zero references to `bundleDirectory`, and constructs the core loader as `` `${this.options.bundlePath}pagefind.js` ``. With the option unset, `bundlePath` defaults to root → `https://dancj.github.io/pagefind/pagefind.js` (no `/home-bartender/`), which GitHub Pages serves as a 404 HTML page → "disallowed MIME type" block → the `undefined` crash in the console trace. The explicit `await import(`${base}/pagefind/pagefind-ui.js`)` already uses the base correctly, which is why the UI script itself loads but the core fails.
- **#90 / #91 flavor signal** — flavors already exist per recipe (`recipe.data.flavors`) and flavor SVG icons already exist (`src/assets/icons/flavors/*.svg`), rendered via the generic `Icon` component (`field="flavor"`). No new asset pipeline needed; this is wiring, not net-new infra.
- **#91 spacing/mobile** — the map geometry is a fixed viewBox (`familyMap.ts`: `VB_WIDTH=600`, `ROW_HEIGHT=76`, etc.) scaled to container width with absolutely-positioned HTML node pills overlaid by percentage. On a narrow viewport the viewBox scales down but the pill labels are real DOM at a fixed font size, so they keep their pixel size while their anchor points compress → overlap/bunching (visible in the mobile screenshot). The root glyph is `--icon-size: 40px` (`FamilyMap.astro:223`), which reads small against the root pill.
- **#92** — `families.astro` already has a `max-width: 30rem` block giving `.family-tabs` `overflow-x: auto`, but the strip still pushes page width on mobile (no `min-width: 0` / containment on the flex track, and the breakpoint may not cover the device width in the screenshot).

---

## Requirements

| ID | Issue | Requirement |
|----|-------|-------------|
| R1 | #90 | Homepage recipe cards no longer render the difficulty badge. |
| R2 | #90 | Cards render flavor icons driven by each recipe's `flavors[]`; cards with no flavors degrade with no empty/broken slot. |
| R3 | #91 | Family-map nodes are spaced so labels don't crowd each other (desktop and mobile). |
| R4 | #91 | Each branch / sub-branch shows flavor icons for what that recipe **adds over its base** (delta vs. parent), not its full flavor set. |
| R5 | #91 | The root family glyph is visibly larger. |
| R6 | #91 | On mobile, map nodes don't overlap/bunch on top of each other. |
| R7 | #92 | The family tab nav stays within the viewport on mobile; tabs remain usable (contained scroll or wrap) with no page-level horizontal scroll. |
| R8 | #93 | Pagefind loads its core bundle under the site `base` and search returns results with no console errors. |

---

## Key Technical Decisions

- **#93 is a one-token rename, not a refactor.** Change `bundleDirectory` → `bundlePath` in `Search.astro`. Keep the existing `await import(...)` and CSS link as-is (already base-correct). This is the minimal correct fix and matches the installed Pagefind major version. Do **not** add a `basePath`/manual core-load workaround.
- **Flavor-delta logic lives in `familyMap.ts`, not the component.** Carry `flavors: string[]` onto `MapNode`, and compute each node's delta against its base in the pure, unit-tested model layer (same seam as the existing `buildFamilyMap`). The component just renders icons. This keeps the logic testable per the repo's `headerProgress`/`familyMap` testing convention.
- **"Base drink" definition for the delta (R4):** sub-branch base = its parent branch; top-level branch base = the family's archetypal recipe when present (the member whose slug equals the family slug, e.g. `old-fashioned` in the Old Fashioned family), else the branch shows its own flavors (no delta to subtract). Document this rule in the model; it is the only judgment call and must be explicit so tests pin it.
- **Spacing/overlap (#91) is geometry + responsive type, handled in CSS/layout constants, not a new mobile coordinate set.** Prefer bumping `ROW_HEIGHT` / `SUB_OFFSET_Y` and/or clamping node label font-size with `clamp()` so pills shrink with the viewBox. Avoid introducing a separate mobile layout branch unless CSS tuning proves insufficient during `ce-work` (deferred decision, see Open Questions).
- **Mobile tab containment (#92):** keep the existing scroll-strip approach; add `min-width: 0` containment and verify the breakpoint actually covers common phone widths. Do not switch to a hamburger/select — scroll-snap strip is the established pattern.

---

## Implementation Units

### U1. #93 — Fix Pagefind bundle path option

**Goal:** Search loads and returns results on the deployed base-pathed site.
**Requirements:** R8
**Dependencies:** none
**Files:** `src/components/Search.astro`
**Approach:** Rename the `PagefindUI` option `bundleDirectory` → `bundlePath` (line ~20). Value stays `` `${base}/pagefind/` ``. No other change.
**Patterns to follow:** existing `base` derivation already in the file.
**Test scenarios:** `Test expectation: none — config/API-name fix with no unit-testable seam.` Verify via browser: search box on `/learn/` (and header) returns results, console clean, network shows `…/home-bartender/pagefind/pagefind.js` 200. Covered by Phase 7 browser test.
**Verification:** No console errors on search; results render; core bundle requested under `/home-bartender/`.

### U2. #90 — Replace difficulty badge with flavor icons on recipe cards

**Goal:** Cards surface flavor at a glance instead of difficulty.
**Requirements:** R1, R2
**Dependencies:** none
**Files:** `src/components/RecipeCard.astro`
**Approach:** Remove the difficulty `<span>` (and its preceding `·` separator) from `.recipe-card-meta` (lines ~28–29). Render one `Icon field="flavor" slug={f}` per entry in `data.flavors`. Decide placement: either inline in the meta row or a dedicated `.recipe-card-flavors` row — keep method/format badges intact. Drop `data-difficulty` only if nothing else consumes it (homepage filter uses `data-flavors`, `data-spirits`, `data-method`; confirm no difficulty filter before removing the attribute — if a difficulty filter exists, leave the attribute and only remove the visible badge). Guard the icon loop so an empty `flavors[]` renders nothing (no empty wrapper).
**Patterns to follow:** flavor Icon usage in `src/pages/index.astro:70-76`; meta-icon sizing in the existing `.recipe-card-meta :global(.tax-icon)` rule.
**Test scenarios:**
- Card with flavors → renders a flavor icon per slug, no difficulty label/icon present.
- Card with empty `flavors[]` → no flavor icons and no empty/broken slot.
- Method (and non-`single` format) badge still renders.
**Verification:** Homepage cards show flavor icons, no difficulty; empty-flavor card is clean; `npm run build` + `astro check` pass.

### U3. #91 — Carry flavors + compute flavor deltas in the family-map model

**Goal:** The model exposes, per node, the flavors that node adds over its base.
**Requirements:** R4
**Dependencies:** none
**Files:** `src/lib/familyMap.ts`, `src/lib/familyMap.test.ts` (or the existing test file for this module)
**Approach:** Add `flavors: string[]` to `MapNode` (populated in `toNode` from `recipe.data.flavors`). Add a `deltaFlavors` field (or a helper) computed as node flavors minus base flavors, where base is resolved per the KTD rule (sub-branch → parent branch; top-level branch → family-slug member if present, else empty base). Keep it pure and deterministic.
**Execution note:** Test-first — this is the one feature-bearing unit; write failing model tests before the implementation.
**Patterns to follow:** existing `buildFamilyMap` structure and the `slugOf` / `memberBySlug` helpers already in the file.
**Test scenarios:**
- Top-level branch with a family-archetype base → delta excludes flavors already on the base, includes only added ones.
- Top-level branch when no family-slug member exists → base empty → delta equals own flavors.
- Sub-branch → delta computed against its parent branch's flavors, not the root.
- Node whose flavors are a subset of base → empty delta.
- Order/determinism: deltas stable across runs (same input → same output).
**Verification:** `npm test` green for `familyMap`; no change to existing branch/sub-branch placement tests.

### U4. #91 — Render delta flavor icons + enlarge root glyph in FamilyMap

**Goal:** Each node pill shows its delta-flavor icons; the root glyph reads larger.
**Requirements:** R4, R5
**Dependencies:** U3
**Files:** `src/components/FamilyMap.astro`
**Approach:** For each branch and sub-branch node, render `Icon field="flavor"` for each slug in the node's `deltaFlavors`, inside or beside the `.family-map-label` pill. Keep pills as links; icons decorative (`aria-hidden`). Bump `.family-map-glyph` `--icon-size` from `40px` to a larger value (e.g. `clamp(48px, …, 64px)`), keeping it centered in the root pill. Ensure added icons don't break the `white-space: nowrap` pill or the percentage node positioning.
**Patterns to follow:** `Icon` usage already imported in this component; existing `.family-map-glyph` rule (line ~222).
**Test scenarios:** `Test expectation: none — presentational; behavior is covered by U3 model tests.` Visual verification in Phase 7.
**Verification:** Branch pills show only added-flavor icons; root glyph visibly larger; build/astro check pass.

### U5. #91 — Fix family-map node spacing & mobile overlap

**Goal:** Nodes don't crowd on desktop and don't bunch/overlap on mobile.
**Requirements:** R3, R6
**Dependencies:** U4 (tune after icons are present, since icons change pill width/height)
**Files:** `src/lib/familyMap.ts` (layout constants), `src/components/FamilyMap.astro` (CSS)
**Approach:** Increase vertical pitch where labels crowd (`ROW_HEIGHT`, `SUB_OFFSET_Y`) and/or clamp node label font-size so pills scale down with the viewBox on narrow screens (`font-size: clamp(...)` on `.family-map-label`). Re-check `BOTTOM_PAD`/height math still clears the lowest node after any constant change. Verify on a ~360px viewport that pills no longer overlap. If pure CSS/constant tuning can't resolve mobile overlap, fall back to the deferred narrow-layout option (Open Questions).
**Patterns to follow:** existing geometry constants and `aspect-ratio` overlay scheme in `familyMap.ts` / `FamilyMap.astro`.
**Test scenarios:** If layout-constant changes affect height/placement math, update/extend the existing `layoutFamilyMap` tests (e.g. lowest-node clearance, height ≥ maxNodeY + pad). Otherwise `Test expectation: none — CSS-only`. Visual check in Phase 7 at desktop + ~360px.
**Verification:** No overlap at desktop and ~360px; height still clears lowest node; `npm test` green.

### U6. #92 — Contain family tab nav on mobile

**Goal:** Tab strip stays inside the viewport on mobile; no page-level horizontal scroll.
**Requirements:** R7
**Dependencies:** none
**Files:** `src/pages/families.astro`
**Approach:** In the responsive block (`@media (max-width: 30rem)` and/or a wider breakpoint), ensure the `.family-tabs` flex track is contained: add `min-width: 0` / confirm the scroll container can't push page width, and verify the breakpoint covers common phone widths (the screenshot device appears wider than 30rem — consider raising to ~48rem or making the strip always horizontally scrollable below the wide breakpoint). Keep scroll-snap and tab styling. Optionally add an edge fade affordance.
**Patterns to follow:** the existing `overflow-x: auto` + `scroll-snap` rules already in `families.astro:131-143`.
**Test scenarios:** `Test expectation: none — responsive CSS.` Visual check in Phase 7: at ~390px the page does not scroll horizontally and all tabs are reachable via the contained strip.
**Verification:** No horizontal page scroll on mobile; tabs scrollable/reachable; desktop unchanged.

---

## Scope Boundaries

**In scope:** the four issues above, as contained component/config/CSS/model changes, landed on one `fix` branch with per-issue commits.

### Deferred to Follow-Up Work
- A dedicated `FlavorIcon` wrapper component (current generic `Icon field="flavor"` is sufficient for #90/#91).
- A separate mobile coordinate set / alternate narrow layout for the family map — only pursue if U5's CSS/constant tuning can't resolve overlap (see Open Questions).
- Tab-nav redesign (hamburger/select) — out of scope; scroll-strip stays.

---

## Open Questions (execution-time)

- **U5 fallback:** does clamping label font-size + bumping pitch fully resolve mobile overlap, or is a narrow-viewport layout branch needed? Resolve by testing at ~360px during `ce-work`; only escalate to a layout branch if CSS can't.
- **U2 attribute:** is `data-difficulty` consumed by any homepage filter? Confirm before removing the attribute (remove visible badge regardless).

---

## Verification Strategy

- `npm test` — model tests (U3, possibly U5) green.
- `npm run build` / `astro check` — type + content checks pass; Pagefind index rebuilds.
- Browser pass (Phase 7): search returns results with a clean console (#93); homepage cards show flavor icons, no difficulty (#90); family map at desktop + ~360px shows delta icons, larger glyph, no overlap (#91); family tabs contained on mobile with no horizontal page scroll (#92).

## Sources & Research

- Pagefind option name confirmed against installed `dist/pagefind/pagefind-ui.js` (`bundlePath` ×8, core load `` `${this.options.bundlePath}pagefind.js` ``).
- Issue screenshots #90–#93 (desktop + mobile family map, console trace).
- Existing components read: `Search.astro`, `RecipeCard.astro`, `families.astro`, `FamilyMap.astro`, `lib/familyMap.ts`.
