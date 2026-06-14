---
title: "feat: Site polish batch — search wiring, related cards, branded 404"
date: 2026-06-14
type: feat
origin: docs/brainstorms/2026-06-14-site-polish-batch-requirements.md
---

# feat: Site Polish Batch — Search Wiring, Related Cards, Branded 404

## Summary

Three coordinated polish fixes shipped together: mount the orphaned Pagefind `Search` component as a compact header affordance, resolve `related[]` links to real recipe titles rendered as cards, and add a branded 404 backed by a new shared `EmptyState` component (with the home zero-results state refactored onto it). All work stays within the existing warm-editorial identity; no redesign.

---

## Problem Frame

Three small but visible gaps make a carefully-designed site read as unfinished (see origin: `docs/brainstorms/2026-06-14-site-polish-batch-requirements.md`):

- `src/components/Search.astro` is fully built and theme-styled but imported by no page or layout — site search does not exist for visitors.
- `src/layouts/RecipeLayout.astro:154` renders related links as `slug.replace(/-/g, ' ')`, printing lowercased "old fashioned" beside the page's own "Old Fashioned" and mangling any title with caps or punctuation.
- There is no `src/pages/404.astro`, so dead links — routine here, because the inbox→category publish flow renames slugs by design — drop visitors onto GitHub Pages' default error page. The only empty state on the site is inline in `src/pages/index.astro`.

Each is cheap; together they are the difference between "looks finished" and "looks finished until you leave the happy path."

---

## Key Technical Decisions

- **Testable logic lives in `src/lib`; `.astro` files stay thin.** The repo has no component-render harness — every test is a pure function under `src/lib/*.test.ts` or `scripts/*.test.mjs` (e.g., `src/scripts/headerProgress.test.ts`, `src/lib/breadcrumbs.test.ts`). Related-link resolution is extracted into `src/lib/recipes.ts` and unit-tested there; the `.astro` units are presentational wiring verified by build + `astro check` + manual review, consistent with CLAUDE.md's TDD exemption for styling/wiring.
- **`Search` must take a unique element id.** `Search.astro` hardcodes `id="search"` and binds `PagefindUI` to `#search`. The header search renders on *every* page, including the 404, whose body also embeds a full-mode search — two `#search` elements and a double Pagefind init on one page. The component gains an `id` prop (default preserves today's behavior) and its CSS hooks stop depending on the fixed `#search` id.
- **Header search is a dismissable trigger/panel, not an inline input.** The header brand and nav are absolute-positioned inside `.site-header__content`, interpolated by `--header-progress` (see `src/layouts/BaseLayout.astro`). A live input wedged into that morphing cluster would fight the transforms. Instead a search trigger toggles a panel that hosts the compact `Search`; the panel sits outside the interpolated cluster and works in both hero and compact states.
- **Related links reuse `RecipeCard` as-is.** `RecipeCard` already renders a self-contained `<li>` and takes a full `Recipe`. Rendering related as a grid of `RecipeCard`s (rather than a new "mini" variant) maximizes cohesion at lowest cost. A reduced variant is deferred unless the full card reads too heavy in the related context.
- **`EmptyState` is one component with a flexible content slot.** Minimal on home (message only), rich on the 404 (apology copy + browse links + inline full-mode search). It must preserve home's existing JS contract: the inline filter script in `src/pages/index.astro` toggles the empty element via `getElementById('empty-state')` and the `hidden` attribute, so the refactored markup keeps `id="empty-state"` and stays `hidden`-toggleable.

---

## Requirements Traceability

| Requirement (origin) | Units |
|---|---|
| R1 Search compact mounts in header, all pages, survives collapse | U4 |
| R2 Activating header search shows a dismissable results overlay | U4 |
| R3 No `/search` route | U4 (none created) |
| R4 Related links render real frontmatter titles | U1, U2 |
| R5 Related links render as mini RecipeCards | U2 |
| R6 Single `EmptyState` component, on-brand | U5 |
| R7 Branded `404.astro` with copy + browse links + inline search | U6 |
| R8 Home zero-results refactored onto `EmptyState`, behavior unchanged | U7 |
| R9 `EmptyState` adoption limited to 404 + home this batch | U5, U6, U7 (scope) |

Acceptance Examples AE1–AE4 carried from origin; mapped in unit test scenarios and verification.

---

## Implementation Units

### U1. Related-recipe resolution helper

- **Goal:** Resolve a recipe's `related[]` slugs to their full `Recipe` entries (and thus real titles) at build time.
- **Requirements:** R4. Covers AE4.
- **Dependencies:** none.
- **Files:** `src/lib/recipes.ts` (add helper), `src/lib/recipes.test.ts` (new).
- **Approach:** Add a function that, given the published recipe set and a `related[]` slug list, returns matching `Recipe` entries in the order listed. Slug derivation mirrors the existing convention (`recipe.id.split('/').pop()`). Validator guarantees resolution, but resolve defensively: drop any unresolved slug rather than throwing, so a content edit mid-flight can't break the build. Consider exposing a slug→`Recipe` map builder so callers don't re-scan per recipe.
- **Execution note:** Implement test-first — this is the one feature-bearing unit.
- **Patterns to follow:** Existing pure-lib + colocated test pattern in `src/lib/familyMap.ts` / `familyMap.test.ts` and `src/lib/breadcrumbs.ts`. Reuse `publishedRecipes`/`Recipe` already exported from `src/lib/recipes.ts`.
- **Test scenarios:**
  - Covers AE4. Given a collection containing a recipe whose frontmatter title is "Old Fashioned" at slug `old-fashioned`, resolving `related: ['old-fashioned']` returns that entry; the resolved `data.title` is "Old Fashioned", not "old fashioned".
  - Covers AE4. A title with punctuation/ampersand ("Naked & Famous" at `naked-and-famous`) is returned verbatim from frontmatter.
  - Order is preserved: `related: ['a','b','c']` returns entries in that order.
  - Slug derivation handles nested ids (`recipes/classics/old-fashioned` → `old-fashioned`).
  - Defensive: an unresolved slug is omitted from the result and does not throw.
- **Verification:** `npm test` passes the new cases; helper exported and typed.

### U2. Render related links as recipe cards

- **Goal:** Replace the slug-mangled related list with a grid of `RecipeCard`s using resolved entries.
- **Requirements:** R4, R5.
- **Dependencies:** U1.
- **Files:** `src/layouts/RecipeLayout.astro`.
- **Approach:** In the `data.related.length > 0` block (currently lines 149–158), call the U1 helper to resolve entries and render each via `RecipeCard` inside a grid that mirrors `.recipe-grid`. Remove the `slug.replace(/-/g, ' ')` link and the pill-style `.related li a` markup it depended on. Keep the `<h2 class="aside-title">` "Related" heading. The aside loads published recipes (via `publishedRecipes`) to feed the resolver.
- **Patterns to follow:** `RecipeCard` usage and `.recipe-grid` in `src/pages/index.astro`; existing aside structure in `RecipeLayout.astro`.
- **Test scenarios:** Test expectation: none — presentational wiring over the U1 helper (which carries the behavioral tests). Resolution correctness is covered by U1.
- **Verification:** `astro check` clean; build renders a recipe with `related[]` showing titled cards (e.g., "Old Fashioned" cased correctly); no lowercased de-slugged text remains.

### U3. Parameterize the Search element id

- **Goal:** Allow multiple `Search` instances on one page without an id collision or double Pagefind init.
- **Requirements:** Enables R1, R7.
- **Dependencies:** none.
- **Files:** `src/components/Search.astro`.
- **Approach:** Add an optional `id` prop (default preserves current single-instance behavior). Use it for the mount element, the `PagefindUI` `element` selector, and the fallback `getElementById`. Decouple the mode CSS hooks (`#search.compact`, `#search.full`) from the fixed id — target a stable class on the element instead — so styling holds regardless of id. `bundleDirectory`/asset paths are unchanged.
- **Patterns to follow:** Existing prop + `define:vars` pattern already in `Search.astro`.
- **Test scenarios:** Test expectation: none — `.astro` config change, no extractable logic.
- **Verification:** `astro check` clean; a page mounting two `Search` instances (different ids) initializes both independently without console id-collision/double-init errors.

### U4. Mount compact search in the header

- **Goal:** Make search reachable from every page via a dismissable header affordance.
- **Requirements:** R1, R2, R3.
- **Dependencies:** U3.
- **Files:** `src/layouts/BaseLayout.astro`.
- **Approach:** Add a search trigger (icon button) to the header chrome and a dismissable panel that hosts `<Search mode="compact" id="header-search" />`. Place the trigger and panel so they do not disturb the `--header-progress` interpolation of `.brand` / `.nav-links` (e.g., positioned independently of the morphing cluster). Panel toggling is small inline/script-driven show/hide with dismiss (click-away or Escape). No `/search` route is added (R3).
- **Execution note:** Verify against the collapsing header's three states — hero, compact, and reduced-motion (which forces compact) — plus mobile (<40rem) where the coupe/wordmark crossfade applies.
- **Patterns to follow:** Header markup and `--header-progress` model in `src/layouts/BaseLayout.astro`; reduced-motion handling in its inline script.
- **Test scenarios:** Test expectation: none — layout/wiring; no extractable logic (header collapse math already covered by `src/scripts/headerProgress.test.ts`).
- **Verification:** Covers AE1. In a production build, activating the header trigger reveals the panel and typing returns Pagefind results; dismiss hides it. Header collapse, reduced-motion, and mobile layouts are visually unbroken in both states.

### U5. EmptyState component

- **Goal:** One on-brand "nothing here" component reusable by home and the 404.
- **Requirements:** R6, R9.
- **Dependencies:** none.
- **Files:** `src/components/EmptyState.astro`.
- **Approach:** A component rendering an icon/message in the existing empty-state visual language (mirror the `.empty` treatment in `src/pages/index.astro`), with a slot (or optional props) for extras like browse links and an inline search. Accept an `id` and render a root that can be `hidden`-toggled, so home's filter JS keeps working unchanged. On-brand per the cream/terracotta tokens and the owner's dark-chrome preference.
- **Patterns to follow:** `.empty` styling in `src/pages/index.astro`; token usage and component conventions across `src/components`.
- **Test scenarios:** Test expectation: none — presentational component, no extractable logic.
- **Verification:** `astro check` clean; renders with message-only and with-extras (links + search slot) configurations.

### U6. Branded 404 page

- **Goal:** Replace the GitHub Pages default 404 with an on-brand recovery surface.
- **Requirements:** R7.
- **Dependencies:** U3, U5.
- **Files:** `src/pages/404.astro`.
- **Approach:** A page using `BaseLayout` + `EmptyState` with apology copy, browse links (the three nav destinations — recipes/home, families, learn), and an inline `<Search mode="full" id="notfound-search" />`. The distinct id (U3) prevents collision with the header search that `BaseLayout` also renders on this page. Astro emits `dist/404.html`, which GitHub Pages serves automatically for unknown paths.
- **Patterns to follow:** `BaseLayout` usage in existing pages; `Search` full-mode usage shape.
- **Test scenarios:** Test expectation: none — layout/wiring; search behavior is the component's, recovery links are static.
- **Verification:** Covers AE2. Build produces `dist/404.html`; in production the inline search returns results, and under `npm run dev` (no Pagefind index) it shows the component's "index not built" fallback rather than erroring. Header search and inline search coexist without id collision.

### U7. Refactor home zero-results onto EmptyState

- **Goal:** Home's empty state renders via `EmptyState` with no behavior change.
- **Requirements:** R8.
- **Dependencies:** U5.
- **Files:** `src/pages/index.astro`.
- **Approach:** Replace the inline `<p id="empty-state" class="empty" hidden>` with `EmptyState` (message-only variant), preserving `id="empty-state"` and the `hidden` attribute so the existing inline filter script (`emptyEl.hidden = visible > 0`) keeps toggling it. No change to the filter JS itself.
- **Patterns to follow:** Existing empty-state usage and the inline filter script in `src/pages/index.astro`.
- **Test scenarios:** Test expectation: none — presentational refactor; the toggle contract is verified manually (harness has no DOM/jsdom environment — `vitest` runs `environment: node`).
- **Verification:** Covers AE3. Applying filters that match zero recipes shows the `EmptyState`; clearing filters restores the grid — behavior identical to before. The filter-count summary still updates.

---

## System-Wide Impact

- **Every page** gains a header search affordance (U4) and is re-rendered through the changed `BaseLayout`.
- **Every recipe page** changes its related-links rendering (U2).
- **New route:** `/404` (U6). No other routes added; no `/search` route (R3).
- No data model, schema, taxonomy, or content changes; no dependency additions (Pagefind already present).

---

## Risks & Dependencies

- **Header layout regression.** The collapsing header is intricate (absolute positioning interpolated by `--header-progress`). Mitigation: render the search trigger/panel outside the interpolated cluster (KTD) and verify hero/compact/reduced-motion/mobile (U4 execution note).
- **Pagefind double-init / id collision.** The 404 carries both header and inline search. Mitigation: U3 lands before U4 and U6; distinct ids per instance.
- **Home empty-state JS breakage.** Refactor must keep `id="empty-state"` + `hidden` toggling. Mitigation: KTD + AE3 verification (U7).
- **Search inert in dev (assumption).** Pagefind index is built only by `npm run build` / `npm run search:index` (output `dist` / `public/pagefind`), so header and 404 search show the component's "index not built" fallback under `npm run dev`. Accepted; no dev-parity work in this batch.

---

## Scope Boundaries

Carried from origin.

- Dedicated `/search` route — out; header overlay is the only search affordance.
- `EmptyState` adoption by `/by-*` facets and inbox — deferred.
- Dev-mode search parity, typo tolerance, Pagefind UX rework — out.
- Other ideation survivors (token tiers, OG/schema, flavor descriptors, make-mode) and the two larger bets — out.

### Deferred to Follow-Up Work

- A reduced "mini" `RecipeCard` variant, only if the full card reads too heavy in the related context (KTD).
- Rolling `EmptyState` out to `/by-*` facet pages and inbox.

---

## Sequencing

Three independent tracks; ship order within each:

- **Related:** U1 → U2
- **Search:** U3 → U4
- **Empty/404:** U5 → U6 (also needs U3), U7

U3 is shared infrastructure for both the header mount and the 404; land it before U4 and U6.

---

## Sources & Research

- Origin requirements: `docs/brainstorms/2026-06-14-site-polish-batch-requirements.md`.
- Ideation: `docs/ideation/2026-06-14-site-polish-cohesion-ideation.html` (survivors #1–#3).
- Touch points read during planning: `src/components/Search.astro`, `src/components/RecipeCard.astro`, `src/layouts/RecipeLayout.astro` (related block ~line 149), `src/layouts/BaseLayout.astro` (collapsing header), `src/pages/index.astro` (empty state + filter script), `src/lib/recipes.ts`.
- Test convention: `vitest.config.ts` (`environment: node`, includes `scripts/**/*.test.mjs` + `src/**/*.test.ts`); no component-render harness — pure-lib tests only.
