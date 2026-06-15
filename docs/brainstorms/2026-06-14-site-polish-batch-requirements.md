---
date: 2026-06-14
topic: site-polish-batch
---

# Site Polish Batch — Requirements

## Summary

One "quick polish" PR bundling three coordinated fixes to the Home Bartender site: mount the orphaned Pagefind search as a compact header overlay, resolve `related[]` links to real recipe titles rendered as mini cards, and introduce a shared `EmptyState` component behind a new branded 404 and the home zero-results state.

## Problem Frame

Three small but visible gaps make a carefully-designed site read as unfinished. `src/components/Search.astro` is fully built and theme-styled but imported into zero pages — site search effectively does not exist. `src/layouts/RecipeLayout.astro:154` renders related links as `slug.replace(/-/g, ' ')`, printing lowercased "old fashioned" next to the page's own "Old Fashioned" and breaking any title with caps or punctuation. There is no `src/pages/404.astro`, so a dead link (routine here — the inbox→category publish flow renames slugs by design) drops the visitor onto GitHub Pages' default error page, and the only empty state on the site lives inline in `src/pages/index.astro`. Each is cheap to fix; together they are the difference between "looks finished" and "looks finished until you leave the happy path."

## Key Decisions

- **Header-overlay-only search, no `/search` route.** An everywhere-present search affordance beats a destination page for a catalog this size. The 404's search box reuses the same `Search.astro` component inline (full mode) rather than linking to a search page.
- **Related links as mini cards, not bare titles.** Reuses the existing RecipeCard vocabulary so related links read as part of the same collection. A build-time lookup resolves each related slug to its full recipe entry; the validator already guarantees every `related[]` slug resolves, so the lookup is total and needs no missing-title fallback.
- **One `EmptyState` component, two adopters now.** Ship the reusable component but limit this batch's blast radius to the 404 and the home zero-results state; defer `/by-*` facets and inbox to a later cohesion pass.

## Requirements

**Search wiring**

- R1. `Search.astro` (compact mode) mounts in `BaseLayout`'s header, present on every page and persisting across the hero→compact header collapse.
- R2. Activating header search reveals a dismissable Pagefind results overlay.
- R3. No dedicated `/search` route ships; the header overlay is the only standalone search affordance.

**Related links**

- R4. Related links render the target recipe's real title from frontmatter, never the de-slugged string.
- R5. Related links render as mini RecipeCards matching the site's card vocabulary, replacing the current bare `<li><a>` list.

**Empty states & 404**

- R6. A single `EmptyState` component provides the shared "nothing here" treatment (icon + message + recovery affordances), on-brand and consistent with the dark-header chrome preference.
- R7. A branded 404 page (`src/pages/404.astro`) uses `EmptyState` with apology copy, browse links, and an inline search box (`Search.astro` full mode).
- R8. The home zero-results state is refactored to render via `EmptyState`, preserving the existing client-side filter show/hide behavior unchanged.
- R9. `EmptyState` adoption is limited to the 404 and home in this batch; `/by-*` facets and inbox are left unchanged.

## Acceptance Examples

- AE1. **Covers R2.** User activates header search and types a query → overlay shows Pagefind results; an empty query or zero matches renders the component's no-results state, not an error.
- AE2. **Covers R7.** In a production build the 404 search returns results; in `npm run dev` (no Pagefind index) the search degrades to its "unavailable" state rather than erroring.
- AE3. **Covers R8.** Applying filters that match zero recipes on home shows the `EmptyState`; clearing filters restores the grid — behavior identical to today.
- AE4. **Covers R4, R5.** A related entry with slug `old-fashioned` renders a card titled "Old Fashioned"; a title with punctuation ("Naked & Famous") renders correctly.

## Scope Boundaries

- Dedicated `/search` route — deferred; header overlay is the only search affordance.
- `EmptyState` adoption by `/by-*` facets and inbox — deferred to a later cohesion pass.
- Dev-mode search parity, typo tolerance, and any Pagefind UX rework — out of scope.
- The other ideation survivors (token tiers, OG/schema, flavor descriptors, make-mode) and the two larger bets — out of scope for this PR.

## Dependencies / Assumptions

- The Pagefind index is built only by `npm run build` / `npm run search:index` (output to `dist` / `public/pagefind`), so header and 404 search are inert under `npm run dev`; the component's graceful "search unavailable" degrade covers this, and no dev-parity fix is in scope.
- `Search.astro` already supports compact and full modes — no new modes are introduced.
- Work follows TDD with Vitest and ships via PR; never push to `main`.

## Outstanding Questions

**Deferred to Planning**

- Exact compact-search affordance within the header's two states (icon button that expands vs. always-visible input).
- The minimal set of "browse links" on the 404 (home, a by-spirit entry point, a few recipes).
- Whether mini related-cards reuse `RecipeCard` as-is or need a reduced variant.

## Sources

- `docs/ideation/2026-06-14-site-polish-cohesion-ideation.html` — survivors #1–#3 this batch implements.
- `src/components/Search.astro`, `src/layouts/RecipeLayout.astro` (line 154), `src/pages/index.astro` — the three touch points.
- `package.json` — `search:index` / `build` scripts (Pagefind index timing).
