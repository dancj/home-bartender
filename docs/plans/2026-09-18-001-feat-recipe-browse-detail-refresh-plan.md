---
title: "feat: Recipe browse + detail visual refresh (photo-first cards, hairline facts)"
date: 2026-09-18
artifact_contract: ce-unified-plan/v1
product_contract_source: ce-plan-bootstrap
execution: code
plan_type: feat
depth: standard
origin: docs/design/2026-09-18-recipe-browse-refresh-handoff (external handoff bundle)
---

# feat: Recipe browse + detail visual refresh (photo-first cards, hairline facts)

## Summary

Recreate the high-fidelity design handoff for two screens — the recipe **browse** index and the recipe **detail** page — inside the existing Astro + Tailwind v4 codebase, using its `@theme` tokens and `.card` / `.chip` / `.eyebrow` primitives (never the prototype's inline styles). Browse moves from a collapsed "Filters" disclosure + typographic cards to always-visible chip rows + a photo-first card grid. Detail moves from an icon-heavy fact block to a sticky photo rail + a bordered hairline facts grid, keeping the existing Recipe / Batching / Notes / Source tabs untouched. The brief: fewer line icons, more photography, a light splash of color (per-spirit accent hues), clean and sophisticated.

Photography does not exist yet — cards and the detail hero render fallback tiles (gated on `hero_image`) until real images land, and the gallery row drops when empty. The shared header change proposed in the handoff is **deferred** (see Open Questions Q1).

---

## Problem Frame

- **What's wrong:** The browse cards are icon-led and typographic; filters hide behind a disclosure. The detail page leads with an icon-and-label fact card. The brief wants the collection to read as photography-forward and modern, with the line-icon density cut on these two screens.
- **Where:** `src/pages/index.astro` (browse), `src/components/RecipeCard.astro` (card), `src/layouts/RecipeLayout.astro` (detail), `src/styles/global.css` (tokens + primitives).
- **Constraints that shape the fix:**
  - Static Astro on GitHub Pages — no SSR, no runtime framework. Client behavior is plain module islands (the index filter script, the `recipeTabs` island) already in place.
  - The index filter/sort/My-Bar behavior is driven by tested pure libs (`src/lib/myBar.ts`, `src/lib/indexSort.ts`) reading `data-*` attributes off each card `<li>`. Those attributes and libs must survive the re-skin unchanged.
  - The detail tabs are a progressive-enhancement island over stacked `<section>`s (`src/scripts/recipeTabs.ts` + inline wiring). The refresh restyles their chrome only — it does not touch tab logic, ARIA, or the no-JS fallback.
  - All spirit/flavor accent hues are used only for dots, badges, and fallback tiles — never body text. The handoff certifies them at 4.5:1 on `#FBF8F2` at badge sizes.

---

## Product Contract

### Requirements

Traceability: the design handoff `README.md` (screen specs + Design Tokens table). Section references below are to that document.

**Design tokens (handoff §Design Tokens)**
- R1 — New `@theme` tokens exist for every spirit accent hue in `data/taxonomy.yaml` (the 8 named in the handoff plus `whiskey`, `scotch`, `brandy`, `aperitif`, `liqueur`, `wine`, kept in the same L 40–48% / low-chroma band), every flavor accent hue, and the three loose values `#3A3128` / `#EAE3D4` / `#F1E9DC`. No component hardcodes these hexes.
- R2 — New radius tokens cover card `20px`, hero `22px`, secondary photo `16px`, facts grid `18px`, root callout `20px` (the existing `--radius-card` is `22px`; add what's missing rather than repurpose it).

**Browse screen (handoff §Screen 1)**
- R3 — Filters render as always-visible chip rows with eyebrow labels, replacing the collapsed disclosure. Spirit chips each carry a 7px dot in that spirit's accent hue; the active chip uses the terracotta fill and a cream dot.
- R4 — Existing filter behavior is preserved: every axis filterable today (spirit, flavor, method, difficulty, `makeable`/My Bar) still filters, chips toggle `aria-pressed`, and sort + Cards/List density still work. Only the presentation moves from a disclosure to always-visible rows.
- R5 — A result count ("N recipes") and a Cards/List segmented pill control sit on the filter block's trailing row; the segmented control drives the existing `cards`/`compact` density toggle.
- R6 — The card grid uses `repeat(auto-fill, minmax(256px, 1fr))` with a `22px` gap and reflows 4→1 column responsively.
- R7 — Each card is a single `<a>` wrapping the whole card (middle-click, keyboard focus, `:focus-visible` all work), links to `/recipes/<slug>/`, and carries: a 4:5 image (or fallback tile), a spirit badge over the image in that spirit's accent hue, a Newsreader title, an italic blurb, and a bottom meta row of method + flavors in small caps with **no icons**.
- R8 — When `hero_image` is empty, the image area is replaced by a same-ratio (4:5) fallback tile: the spirit accent hue at 8% alpha, a bottom hairline at ~13% alpha, a centered glass icon masked in the accent hue (`.tax-icon` technique, per-glass SVG from `src/assets/icons/glassware/`), and the spirit name in accent-hue italic. The spirit badge still renders.

**Detail screen (handoff §Screen 2)**
- R9 — The page is a two-column grid (`repeat(auto-fit, minmax(300px, 1fr))`, `40px` gap) that stacks to one column below ~700px.
- R10 — Left column is a sticky photo rail (hero 4:5 + up to two 1:1 secondary photos from `gallery`); the row of secondaries drops entirely when `gallery` is empty, and the column drops its stickiness when the layout stacks. With no `hero_image`, the hero shows the same fallback-tile treatment as the card.
- R11 — Right column carries, in order: an eyebrow (`<PRIMARY SPIRIT> · <CATEGORY>`), an H1 (fluid `clamp(2.25rem, 5vw, 3.375rem)`), an italic lede (the blurb), a hairline facts grid, flavor chips, the existing tabs, and a root callout.
- R12 — The facts grid is a bordered hairline grid (1px gaps on a `--color-rule` background, `18px` radius, overflow hidden) with cells Glass · Method · Ice · Difficulty · Serves, each a small-caps label over a Newsreader value, and **no icons**. `Serves` reads `data.serves`.
- R13 — Flavor chips use the shared chip shape in the inactive state, each with a 7px dot in its flavor accent hue, linking to `/by-flavor/<slug>/` as today.
- R14 — The tabs (Recipe / Batching / Notes / Source) keep their current logic, ARIA, hash sync, keyboard nav, and no-JS fallback; only their visual chrome matches the handoff (uppercase, 2px terracotta active underline). Tab content rows (ingredients, numbered steps with the accent-soft number circle, batch, notes prose) are restyled per the handoff.
- R15 — A root callout renders at the bottom when the recipe has a root: a dark slab with an eyebrow "ROOT", the root name in Newsreader, and a terracotta "See the family →" pill linking to `/by-root/<root>/`. When there are multiple roots, the first is featured (others already appear via existing nav).

**Cross-cutting**
- R16 — Reduced-motion is honored: card hover lift and transitions collapse under the existing `prefers-reduced-motion` zeroing. `:focus-visible` stays the existing `2px solid var(--color-accent)` / `outline-offset 3px`.
- R17 — No prototype-only artifacts ship: `image-slot.js` and inline-style scaffolding are not introduced. Line icons stay in `src/assets/icons/` (still used on Roots, taxonomy pages, My Bar) — they are only removed from these two screens.

### Key Decisions

- KD1 — **Preserve all existing filter behavior; re-present, don't reduce.** The prototype depicts only Spirit + Mood rows, but the handoff states behavior is unchanged. Keep every current axis (spirit, flavor→"Mood", method, difficulty) as always-visible rows plus My Bar and sort. *Governs R4.* (Rejected: shipping only the two depicted rows — silently drops working Method/Difficulty/My-Bar filtering, a functional regression the handoff does not sanction. Flagged for confirmation: Q2.)
- KD2 — **Defer the shared-header change.** The handoff swaps the five-glass lockup for a single coupe + wordmark but explicitly says "confirm before shipping if the lockup is load-bearing for brand," and the current header is a tested collapsing-header system (`BaseLayout.astro` + `headerProgress.ts`, plan `2026-05-28-001`). Keep it as-is; the two named screens don't depend on it. *Governs R11 sticky offset* (use the real compact-header height, not the prototype's assumed `104px`). (Rejected: rebuilding the header in this PR — invasive, contested, out of the two-screen scope. Flagged: Q1.)
- KD3 — **Fallback tile now, real-image pipeline later.** `hero_image`/`gallery` are empty across the collection. Gate on them and render fallback tiles today; wire Astro's `<Image>`/`getImage` responsive pipeline only once real assets exist. *Governs R8, R10.* (Rejected: standing up the image pipeline against zero assets — dead code.)

---

## Planning Contract

### Key Technical Decisions

- KTD1 — **Accent hues live in `@theme`, resolved through a tested pure lib.** Add `--color-spirit-<slug>` and `--color-flavor-<slug>` custom properties to `@theme` in `global.css`, and a `src/lib/accents.ts` that maps a slug → its CSS `var(...)` reference with a neutral fallback (`--color-rule-strong`) for any slug without a specific hue. Astro components call the lib and set the hue via an inline `--accent` custom property on the element; CSS consumes `var(--accent)` for the dot/badge/tile. *(session-settled: user-directed — chosen over hardcoding hexes in components: handoff mandates `@theme`.)* Governs R1, R8, R13. Rejected: a Tailwind arbitrary-value class per hue — 14 spirit + 19 flavor variants is noise, and the dot color must also feed `color-mix` for the tile alpha.
- KTD2 — **Card `<a>` wraps the card; `data-*` stay on the `<li>`.** Keep the `<li class="recipe-card" data-*>` wrapper (the index script queries it) and the inner `<a class="card">` (already the shape today), restructured to photo-first. *(session-settled: user-directed — chosen over a JS click handler on the `<li>`: middle-click, keyboard focus, `:focus-visible` must work.)* Governs R7. The compact/List view already restyles `.card` to a row via `:global()` — the photo/badge must degrade sanely there (hide the image in compact, keep title + meta), preserving the tested density toggle.
- KTD3 — **Restyle the detail tabs in place; do not touch the island.** `recipeTabs.ts`, `buildTabList`, the ARIA wiring, and the no-JS stacked fallback are unchanged. The refresh edits only the `.recipe-tab*` / `.recipe-body` CSS and the ingredient/step/facts markup around the panels. Governs R14. Rejected: reworking tab logic — out of scope and already tested.
- KTD4 — **Facts grid is CSS-gap hairlines, not borders per cell.** A grid with `gap: 1px` on a `--color-rule` background + a 1px outer border + `overflow: hidden` renders single hairlines between cells (the handoff technique). Governs R12.
- KTD5 — **Sticky offset from the real header, not the prototype's number.** The compact collapsing header is `--hb-compact` (`4rem` = 64px). Set the sticky left column `top` to clear that (≈`5rem`), not the prototype's `104px` which assumed the deferred new header. Governs R10. See KD2.

### High-Level Technical Design

Layer map (unchanged data flow; only presentation and one new lib):

```
data/taxonomy.yaml ──codegen──> src/taxonomy.generated.ts (slug lists, unchanged)
global.css @theme  ──(+ accent tokens, radii) ─────────────┐
src/lib/accents.ts (NEW, pure, tested) ── slug → var(--color-*) ┐
                                                            ▼   ▼
  RecipeCard.astro ── hasPhoto? photo : fallback-tile ── uses accents + glass Icon mask
  index.astro ────── always-visible chip rows (spirit dots) + segmented control
                     └── existing filter/sort/mybar SCRIPT + data-* attrs: UNCHANGED
  RecipeLayout.astro ─ 2-col sticky rail + hairline facts + flavor dots + root callout
                     └── recipeTabs island + buildTabList: UNCHANGED (chrome restyled)
```

### Assumptions

- A1 — "Mood" in the handoff maps to the existing **flavor** axis (relabeled); the depicted chips (Bright, Spirit-forward, Refreshing = flavors; Nightcap = occasion) are illustrative, not a new filter axis. Occasion filtering is not added to the index in this PR.
- A2 — The **Source** tab (present in the code, absent from the handoff's "Recipe/Batching/Notes" wording) is kept — it's conditional and load-bearing for attributed classics. The handoff omitted it because its sample recipe has none.
- A3 — The eyebrow "GIN · CLASSIC" = `label('spirits', data.spirits[0]) · label('category', data.category)`.
- A4 — Glass fallback-tile icon uses the per-glass SVG under `src/assets/icons/glassware/<glass>.svg` via `iconUrl('glass', data.glass)`; the brand coupe PNG is not used for tiles (handoff production note).
- A5 — Card grid `minmax(256px)` and gap `22px` are new values specific to the photo grid; the shared `.recipe-grid` used by Related keeps its current `minmax(17rem)`/`0.85rem` unless a Related-card refresh is requested (out of scope).

### Sequencing

U1 → U2 (tokens + lib first; everything else consumes them) → U3 (card) and U5 (detail) can proceed in parallel → U4 (browse page) depends on U3. U6 (docs/validation) last.

---

## Implementation Units

### U1. Design tokens in `@theme`
- Goal: Add every new token the two screens need so no component hardcodes a hex or radius.
- Requirements: R1, R2.
- Files: `src/styles/global.css`.
- Approach: Under `@theme`, add `--color-spirit-{slug}` for all 14 spirits (handoff hues + banded values for whiskey/scotch/brandy/aperitif/liqueur/wine), `--color-flavor-{slug}` for all 19 flavors (handoff hues for citrus/nutty/botanical/bright; banded values for the rest), `--color-notes-prose:#3A3128`, `--color-rule-ingredient:#EAE3D4`, `--color-chip-soft:#F1E9DC`, and `--radius-card-lg`/`--radius-hero`/`--radius-photo`/`--radius-facts`/`--radius-callout`. Keep names token-shaped so Tailwind exposes utilities.
- Test Scenarios: none — pure token declarations. Test expectation: none — config/styling; the resolver that reads them is U2.
- Verification: `npm run build`'s `astro check` and a visual pass; no unresolved `var()`.

### U2. Accent resolver lib (TDD)
- Goal: A pure module mapping a taxonomy slug to its accent CSS variable with a safe fallback.
- Requirements: R1 (consumption), R8, R13.
- Files: `src/lib/accents.ts`, `src/lib/accents.test.ts`.
- Approach: Export `spiritAccentVar(slug)` and `flavorAccentVar(slug)` returning `var(--color-spirit-<slug>)` / `var(--color-flavor-<slug>)` for known slugs (validated against `SPIRITS`/`FLAVORS` from `taxonomy.generated`) and `var(--color-rule-strong)` for unknown/empty input. Keep it string-only (no DOM) so it runs in the `node` vitest env, mirroring `taxonomy.ts`.
- Test Scenarios:
  - Happy: `spiritAccentVar('gin')` → `var(--color-spirit-gin)`; `flavorAccentVar('citrus')` → `var(--color-flavor-citrus)`.
  - Edge: unknown slug (`'unobtanium'`) and empty string → the neutral fallback var.
  - Coverage: every `SPIRITS` slug and every `FLAVORS` slug resolves to a `var(--color-...)` (guards against a taxonomy addition silently losing its hue → the fallback), asserted by iterating the generated arrays.
- Verification: `npm test` green.

### U3. Photo-first RecipeCard
- Goal: Rebuild the card as a photo-first (or fallback-tile) linked card with a spirit badge and icon-free meta row, preserving the `<li>` `data-*` contract and compact-view behavior.
- Requirements: R6 (grid consumed by U4), R7, R8, R16, R17.
- Files: `src/components/RecipeCard.astro`.
- Approach: Keep the `<li class="recipe-card" data-*>` wrapper and inner `<a class="card">`. Add a 4:5 image block: `data.hero_image` present → `<img>` (plain `src` for now, KD3); absent → fallback tile (accent-at-8%, hairline, masked glass icon in accent hue, spirit-name italic) using `accents.ts` + `iconUrl('glass', data.glass)`. Absolute spirit badge top-left in the accent hue. Body: title (Newsreader 21/1.15), italic blurb, `margin-top:auto` meta row (method + flavors, small caps, dot separators, **no icons**). Set `--accent` inline from `spiritAccentVar(primarySpirit)`. In compact/List view (`.grid-compact :global(.card)`), hide the image/tile and keep the row layout working.
- Test Scenarios: none new (Astro component; styling). Regression guard: the index filter/sort tests (U-none, existing) must still pass because `data-title/spirits/flavors/method/difficulty` are unchanged.
- Verification: `npm test` (existing index/lib suites still green), visual pass in `npm run dev` for a recipe with and without `hero_image`.

### U4. Browse page — always-visible filters + grid
- Goal: Replace the Filters disclosure with always-visible chip rows and the new toolbar, preserving all filter/sort/My-Bar behavior.
- Requirements: R3, R4, R5, R6.
- Files: `src/pages/index.astro`.
- Approach: Convert the `<details class="filter-bar">` groups into always-visible `<div class="filter-row">`s (eyebrow + chip list) for Spirit (chips carry a `--accent` dot via `accents.ts`), Mood/Flavor, Method, Difficulty. Keep the `button[data-filter][data-value]` shape so the existing script binds unchanged. Keep My Bar (`chip-makeable` + bar) and the sort `<select>`. Replace the Cards/List `.view-toggle` markup with the segmented pill per handoff (same `data-view` buttons → script unchanged). Add a result-count element the script already can populate (reuse/extend `#filter-count`, or add `N recipes` text). Widen the grid to `minmax(256px,1fr)`/gap `22px` for the photo cards. Do **not** edit the `<script>` logic except selectors that must match new markup.
- Test Scenarios: none new. Regression: `src/lib/myBar.test.ts`, `src/lib/indexSort.test.ts` still pass; manual check that spirit/flavor/method/difficulty/makeable/sort/density all still work.
- Verification: `npm test`, manual filter/sort/density smoke in dev.

### U5. Recipe detail — sticky rail, hairline facts, root callout
- Goal: Rebuild the detail layout to the two-column sticky spec, keeping the tab island intact.
- Requirements: R9, R10, R11, R12, R13, R14, R15, R16.
- Files: `src/layouts/RecipeLayout.astro`.
- Approach: Wrap the header + tabs in a two-column grid; left = sticky photo rail (hero + up to two `gallery` 1:1s, drop row when empty, fallback tile when no `hero_image`), `top` per KTD5. Right column: eyebrow (`spirit · category`), H1 (fluid clamp), italic lede, hairline facts grid (Glass/Method/Ice/Difficulty/Serves, no icons, KTD4), flavor chips with `--accent` dots, the existing `.recipe-tabs` block (restyle `.recipe-tab*` chrome + `.recipe-body` ingredient/step rows: accent-soft number circles, hairline ingredient rows), then the root callout (dark slab, "See the family →" pill → `/by-root/<root>/`). Remove the old `.facts` `<dl>` and `.taxonomy` spirit chips (spirit now in eyebrow; flavor chips retained). Keep `data-pagefind-body`, the `is:inline` js-tabs guard, and both `<script>`s.
- Test Scenarios: none new (styling + template). Regression: `src/scripts/recipeTabs.test.ts` still passes (logic untouched); manual: tab switch, deep-link `#panel-batching`, keyboard arrows, no-JS stack, print.
- Verification: `npm test`, `npm run build` (astro check + Pagefind), manual detail smoke incl. a recipe with `batch` (Army & Navy) and one with attribution.

### U6. Validate + docs
- Goal: Keep the recipe pipeline and generated artifacts consistent; no doc claims drift.
- Requirements: R17.
- Files: none expected (no taxonomy/schema change). Run `npm run validate` and `npm run build`.
- Approach: Confirm no `@theme`/codegen coupling was needed (accent tokens are pure CSS, not taxonomy enums, so no `npm run codegen`). Confirm `image-slot.js` and prototype inline styles were not introduced. Update `docs/design/direction.md` only if a token rename touched documented values (accent tokens are additive, so likely a no-op).
- Test Scenarios: none.
- Verification: `npm run validate` clean; `npm run build` succeeds.

---

## Verification Contract

- `npm test` — Vitest unit suites; U2 adds `accents.test.ts`; all existing lib/script suites must stay green (they gate the preserved filter/sort/tab behavior). CI runs this on every PR (`.github/workflows/test.yml`).
- `npm run validate` — recipe frontmatter / taxonomy / `related[]` checks; must be clean (no recipe files change, so expected no-op).
- `npm run build` — runs `astro check` (Zod + TS: catches any unresolved token or type error) and rebuilds the Pagefind index; must succeed. This is also the release gate (`deploy.yml`).
- Manual smoke in `npm run dev`: browse filters/sort/density all functional; a card with and without `hero_image`; detail two-column → single-column reflow below ~700px; sticky rail clears the header and un-sticks when stacked; tabs (switch, `#panel-batching` deep link, keyboard, no-JS, print); root callout links to the family page; reduced-motion disables the hover lift.

## Definition of Done

- All Requirements R1–R17 satisfied; KD1–KD3 honored (all filter behavior preserved, header deferred, fallback tiles in place).
- `npm test`, `npm run validate`, and `npm run build` all pass locally.
- No prototype-only code (`image-slot.js`, inline-style scaffolding) in the diff; no hardcoded accent hexes outside `@theme`.
- Existing filter/sort/My-Bar and tab behavior verified unchanged (tests green + manual smoke).
- Open Questions Q1 (header) and Q2 (filter-row scope) flagged in the PR body for human confirmation before merge; abandoned/experimental CSS removed.

## Open Questions

- Q1 (blocking-for-merge, not-for-implementation) — **Ship the header change?** The handoff replaces the five-glass lockup with a single coupe + wordmark and asks to confirm whether the lockup is load-bearing for brand. Deferred here (KD2). Confirm before a follow-up PR touches `BaseLayout.astro`.
- Q2 (confirm-in-review) — **Filter rows: keep all four axes always-visible, or only the two the prototype depicts?** This plan keeps all four to avoid a functional regression (KD1). If the design intends only Spirit + Mood, Method/Difficulty can move behind a compact "More" affordance in a follow-up.
- Q3 (deferred) — **Real photography + Astro image pipeline.** Populate `hero_image`/`gallery` and swap fallback tiles for responsive `<Image>` (4:5 cards/hero, 1:1 gallery) once assets exist (KD3).
