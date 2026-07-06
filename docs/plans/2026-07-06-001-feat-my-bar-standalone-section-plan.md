---
title: "feat: Move My Bar / \"What can I make\" out of Filters into its own bar"
date: 2026-07-06
artifact_contract: ce-unified-plan/v1
artifact_readiness: implementation-ready
execution: code
product_contract_source: ce-plan-bootstrap
origin: "User request: 'i want \"what can i make\" to be separate bar/section from the filters'"
---

# feat: Move My Bar into its own bar on the index

## Summary

My Bar (spirit ownership + "What can I make?") currently lives as the fifth group inside the collapsed Filters panel, where it's buried and semantically wrong — ownership is persistent personal state, not a transient filter. Move it into its own collapsible bar directly below Filters, with the "What can I make?" toggle visible in the bar's always-visible summary row so the headline action is one click from page load.

## Requirements

- **R1**: My Bar renders as its own bar/section on the index, visually separate from the Filters panel; the My Bar group is removed from inside Filters.
- **R2**: "What can I make?" is togglable without expanding anything — it sits in the My Bar summary row.
- **R3**: All existing behavior is preserved: localStorage ownership persistence, `?makeable=1` URL param composing with filters, zero-owned empty state, chip styling distinctions.
- **R4**: Filters panel bookkeeping no longer counts My Bar: the "N active" count, the auto-open-on-active behavior, and "Clear filters" cover only the panel's own axes (spirit/difficulty/method/flavor). The makeable toggle is turned off via its own chip, not Clear filters. The My Bar bar defaults to closed (matching Filters, no open-state persistence — within-page-view state only), and auto-opens whenever `makeable` is active while the owned set is empty — on initial load, when the chip is clicked with nothing owned, and when the owned set transitions to empty while makeable is on — so the "mark spirits" affordance is always visible exactly when the empty state points at it.

## Key Technical Decisions

- **KTD1 — Own `<details>` bar, reusing the filter-bar visual pattern.** A second collapsible bar (`<details class="filter-bar my-bar">`) below Filters: summary row = "My Bar" label + owned-count hint (e.g. "3 spirits") + the "What can I make?" chip right-aligned; panel body = hint text + spirit ownership chips. Reuses the existing `.filter-bar` styles wholesale; only additions are scoped. Rationale: separate bar per the request without doubling page height with 14 always-visible chips.
- **KTD2 — Makeable chip is a CSS-positioned sibling, not a `<summary>` child.** Nesting a real button inside `<summary>` creates interactive-inside-interactive semantics (screen readers fold the chip's label into the disclosure's accessible name and announce it twice). Instead the chip is a DOM sibling of `<summary>` inside the `<details>`, positioned into the header row with CSS (`.my-bar { position: relative }`, chip absolutely positioned right). No propagation hacks needed; disclosure semantics stay clean. It stays a `data-filter="makeable"` chip so the existing URL-param plumbing (`readFilters`/`writeFilters`/`cardMatches`) is untouched. Note: content after `<summary>` inside a closed `<details>` is hidden — the absolutely-positioned chip must therefore live outside the `<details>` element, in a wrapper that visually forms the bar (e.g. `<div class="my-bar-wrap"><details>…</details><button class="chip-makeable">…</button></div>`), so it remains visible and clickable when the bar is collapsed.
- **KTD3 — Split panel bookkeeping from filter state.** Script keeps `FIELDS` (all URL-param axes incl. `makeable`) for read/write/matching, and introduces `PANEL_FIELDS` (without `makeable`) for the Filters count, auto-open, and Clear filters. No lib changes — `myBar.ts`/`indexSort.ts` and their tests are untouched.

## Assumptions

(Headless run — inferred choices recorded rather than confirmed.)

- Placement: My Bar bar sits between the Filters panel and the sort/view toolbar.
- "Clear filters" no longer clears `makeable` (it has its own visible toggle now). Previous behavior cleared it; this is a deliberate change consistent with the separation.
- Collapsible (not always-open) is acceptable since the makeable toggle and owned count are visible in the header row.
- No open-state persistence for the disclosure across reloads — matches the Filters-bar precedent; only the ownership set persists.

## Implementation Units

### U1. Restructure index.astro: standalone My Bar bar

**Goal:** My Bar as its own collapsible bar with summary-row makeable toggle; Filters panel back to four groups.

**Requirements:** R1, R2, R3, R4

**Dependencies:** none

**Files:**
- `src/pages/index.astro` (modify — markup, scoped styles, client script)

**Approach:** Move the `.filter-group-mybar` markup out of `details.filter-bar` into a new bar immediately after it, shaped per KTD2: a relative-positioned wrapper containing `<details class="filter-bar my-bar">` (summary = "My Bar" label + owned-count element, id-addressed, blank at zero) and the `chip-makeable` button absolutely positioned into the header row as the wrapper's child (visible/clickable while collapsed, outside the disclosure's accessible name). Panel body carries the existing hint + `data-mybar` chips (bring along the group's padding/border styles it loses by leaving `.filter-groups`). Script: add `PANEL_FIELDS` (spirit/difficulty/method/flavor) used for the Filters count, panel auto-open, and the clear handler; `FIELDS` (with `makeable`) keeps driving `readFilters`/`writeFilters`/`cardMatches` unchanged. Exact clear wiring: the clear handler preserves makeable explicitly — `writeFilters({ makeable: readFilters().makeable ?? '' })` (the existing `if (v)` guard drops the empty case) — while `writeFilters` itself continues to delete all `FIELDS` keys so the makeable chip can still toggle its param off. Auto-open: one shared `maybeRevealMyBar()` check (makeable active && owned empty → set the details `open`) invoked on initial load, in the makeable chip's toggle path, and on ownership changes — covers the first-click-with-empty-bar flow, not just load. Update owned-count text wherever ownership changes.

**Patterns to follow:** existing `details.filter-bar` summary/chevron markup and styles; `chip-makeable`/`chip-mybar` styles already scoped in this file; aria-pressed handling in the existing chip loops.

**Test scenarios:** Test expectation: none — markup/CSS + DOM glue only; the tested lib functions (`isMakeable`, `parseOwnedSpirits`, comparators) are untouched, and the repo's accepted no-DOM-harness exception applies. Existing 421 tests must stay green.

**Verification:** `npm test` green; `npm run build` (astro check) green. In built output: My Bar bar is a sibling of (not inside) the Filters `<details>`; makeable chip is outside the `<summary>`/`<details>` accessible tree but renders in the header row. Manual checks in preview: makeable chip is visible and clickable while the bar is collapsed and toggling it never expands/collapses the disclosure; **first click on makeable with zero owned spirits auto-opens the bar** (and the My Bar empty state shows); un-owning the last spirit while makeable is on also reveals the bar; chip clicks inside Filters don't strip `?makeable=1`; Filters count/auto-open ignore makeable; Clear filters leaves makeable on; owned count in the header updates when marking spirits.

## Verification Contract

- `npm test` green (421 existing tests, no changes expected).
- `npm run build` green.
- Manual/built-output checks per U1 verification list.
- PR body carries `Closes` reference only if an issue exists (none filed for this request — omit).

## Definition of Done

One PR against `staging` (branch `feat-mybar-standalone-section`, no issue ref — slug form per CLAUDE.md) containing U1, CI green.

## Scope Boundaries

**Out of scope:** any change to lib logic, taxonomy, sort/view toolbar, other pages; the residual issues #116–#118 (tracked separately).

### Deferred to Follow-Up Work
- Owned-spirit management UI beyond the current chips (relates to #118).
