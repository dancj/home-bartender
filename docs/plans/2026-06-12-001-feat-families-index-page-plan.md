---
title: "feat: Add /families/ index page"
type: feat
date: 2026-06-12
status: ready
depth: lightweight
issue: 61
---

# feat: Add `/families/` index page

## Summary

Add a top-level `/families/` landing page that lists all six Cocktail Codex root families in one place — the index PR #60 deliberately left out (see issue #61). Each family links to its existing `/by-family/[family]/` browse page and shows its recipe count plus the structural `note` from `data/taxonomy.yaml` (e.g. "Spirit + citrus + sweetener (shaken)"). All six roots render even when empty (Flip currently has 0 members, shown greyed at count 0) to support the "these are the roots all cocktails descend from" framing. Add `/families/` as a third primary nav tab.

To surface the structural `note` through the project's blessed generated-constants path, extend `codegen-taxonomy.mjs` to emit a `FAMILY_NOTES` constant alongside `FAMILY_LABELS`, and regenerate the artifacts.

---

## Problem Frame

The site has per-family browse pages (`/by-family/[family]/`, from PR #60) but no single page that presents the six Codex roots together. A reader can land on one family but cannot discover the taxonomy as a whole or compare the structural formulas. Issue #61 asks for the landing/index page.

Constraint surfaced by recon: the structural `note` text lives in `data/taxonomy.yaml` but is **not** exposed through the generated constants today — `codegen-taxonomy.mjs` emits only the slug arrays and `*_LABELS` maps. The notes must reach the page through the generated layer (per issue intent and the project's source-of-truth discipline with CI staleness checks), so codegen must emit them.

---

## Requirements

- **R1** — A page at `/families/` lists all six root families: Old Fashioned, Martini, Daiquiri, Sidecar, Whiskey Highball, Flip.
- **R2** — Each family links to its `/by-family/[family]/` page.
- **R3** — Each family shows its published-recipe count via `groupByTax(recipes, 'families')`.
- **R4** — Each family shows its structural `note` from `data/taxonomy.yaml`.
- **R5** — All six render even at count 0 (Flip), with empty roots visually de-emphasised (greyed).
- **R6** — Family entries, labels, and notes are sourced from generated constants (`FAMILIES`, `FAMILY_LABELS`, `FAMILY_NOTES`), not a hardcoded list.
- **R7** — `/families/` appears as a third top-level nav tab; nav active-state highlights the correct tab on each route.
- **R8** — Layout mirrors the existing landing patterns (`src/pages/learn/index.astro` card grid + `width="wide"` page head).

Out of scope (per issue): family badge on `RecipeCard` in the recipe grid — separate follow-up.

---

## Key Technical Decisions

- **Surface `note` via codegen (`FAMILY_NOTES`), not a direct YAML read in the page.** Matches issue #61's "via generated constants" intent and keeps `data/taxonomy.yaml` → generated artifacts as the single app-facing path, which CI already guards for staleness. Rejected: reading `data/taxonomy.yaml` directly in the page frontmatter (faster, one file, but introduces a second app-side YAML reader outside codegen and bypasses the staleness gate).
- **Emit `_NOTES` maps generically, only for fields whose entries carry a `note`.** Currently only `families` has notes, so only `FAMILY_NOTES` is emitted today; the rule stays general so future noted fields work without further codegen edits.
- **Third nav tab, not a recipe-page-only link.** Confirmed with user. Gives the families taxonomy first-class discoverability alongside Recipes and Learn.
- **Render all six roots including empty ones.** Per issue recommendation — more educational and matches the root-family framing. Empty roots are greyed and count 0, but still link to their (empty) `/by-family/` page.

---

## Implementation Units

### U1. Emit `FAMILY_NOTES` from codegen and regenerate artifacts

**Goal:** Expose each family's structural `note` through the generated TypeScript constants so the page can consume it without reading YAML directly.

**Requirements:** R4, R6

**Dependencies:** none

**Files:**
- `scripts/codegen-taxonomy.mjs` — extend `emitZodModule` to also emit a `${SINGULAR}_NOTES: Record<Type, string>` map for any field whose entries include a `note`.
- `scripts/codegen-taxonomy.test.mjs` — add assertion for the new notes-map emission.
- `src/taxonomy.generated.ts` — regenerated (adds `FAMILY_NOTES`). Do not hand-edit; produced by `npm run codegen`.
- `scripts/taxonomy.generated.mjs` — regenerated (validator module; unchanged in practice since it emits only slug arrays, but re-run for consistency).
- `TEMPLATE.md` — regenerated marker region (unchanged in practice; notes don't appear in the allowed-values table, but confirm no drift).

**Approach:** In `emitZodModule`, after building the `*_LABELS` block per field, check whether any entry has a non-empty `note`. If so, build a parallel `${SINGULAR}_NOTES` `Record<Type, string>` map keyed by slug with `JSON.stringify(note)` values, and append it to the section. Keep the existing label-map emission untouched. Run `npm run codegen` to regenerate all three artifacts.

**Patterns to follow:** Mirror the existing `mapBlock` construction in `emitZodModule` (`scripts/codegen-taxonomy.mjs:50-56`) — same slug iteration, same `JSON.stringify` value quoting, same `Record<Type, string>` shape.

**Test scenarios:**
- Given a parsed taxonomy where `families` entries carry `note` fields, `emitZodModule` output contains `export const FAMILY_NOTES: Record<Family, string> = {` with one `'slug': "note text",` line per family. (extends existing `codegen-taxonomy.test.mjs`)
- Given a field whose entries have **no** `note` (e.g. `methods`), the output contains no `METHOD_NOTES` map (notes maps are emitted only when present).
- Note text containing characters needing escaping (parentheses, `+`) round-trips correctly via `JSON.stringify` — assert the Daiquiri note `"Spirit + citrus + sweetener (shaken)"` appears verbatim.

**Verification:** `npm run codegen` produces a `FAMILY_NOTES` export in `src/taxonomy.generated.ts` with all six families; `npm test` passes including the new codegen assertions; `git diff` on generated files shows only the additive notes map (no churn elsewhere).

---

### U2. Add the `/families/` index page

**Goal:** Render the six-root landing page with counts, notes, and links.

**Requirements:** R1, R2, R3, R4, R5, R8

**Dependencies:** U1 (needs `FAMILY_NOTES`)

**Files:**
- `src/pages/families.astro` — new page.

**Approach:** Static page (no `getStaticPaths`). In frontmatter: load `publishedRecipes()`, compute `const counts = groupByTax(recipes, 'families')`, import `FAMILIES`, `FAMILY_LABELS`, `FAMILY_NOTES` from the generated constants (or via `src/lib/taxonomy.ts` re-exports — add a `FAMILY_NOTES` re-export there to match the existing label re-export pattern). Iterate `FAMILIES` (canonical order) rather than the counts map so all six render including Flip at 0. For each: `displayName = FAMILY_LABELS[slug]`, `note = FAMILY_NOTES[slug]`, `count = counts.get(slug)?.length ?? 0`, link `${base}/by-family/${slug}/`. Use `BaseLayout` with `width="wide"` and a `page-head` block mirroring the by-family page. Apply a card grid mirroring `learn/index.astro`'s `.section-list`; add an `is-empty` modifier class when `count === 0` for the greyed treatment, and show the `<Icon field="family" slug={slug} />` per the by-family head usage.

**Patterns to follow:**
- `src/pages/learn/index.astro` — card-grid landing layout, `width="wide"`, `.section-list` grid CSS to mirror.
- `src/pages/by-family/[family].astro` — `page-head`/`eyebrow`/`lede` structure, `Icon field="family"` usage, `base` derivation.
- `src/lib/taxonomy.ts` — re-export `FAMILY_NOTES` alongside the existing `FAMILY_LABELS` re-export if consuming via the lib (preferred over importing the generated file directly, matching current convention).

**Test scenarios:** `Test expectation: none — pure presentational Astro page with no behavioral logic beyond count/label/note lookup already covered by U1's constants and existing `groupByTax` coverage.` Validate via build + visual check in Verification.

**Verification:** `npm run build` succeeds and emits `/families/`; the page lists all six families in canonical order; Flip shows count 0 with the greyed `is-empty` treatment; each row links to the correct `/by-family/<slug>/`; counts match `groupByTax`; notes match `data/taxonomy.yaml`.

---

### U3. Add `/families/` as a third primary nav tab

**Goal:** Surface the families index in the primary navigation with correct active-state highlighting.

**Requirements:** R7

**Dependencies:** U2 (page must exist for the link target)

**Files:**
- `src/layouts/BaseLayout.astro` — extend `navLinks` and the active-state logic.

**Approach:** Add `const isFamilies = path.startsWith(`${base}/families`);` alongside the existing `isLearn`. Add `{ href: `${base}/families/`, label: 'Families', current: isFamilies }` to `navLinks`. Adjust the Recipes entry's `current` so it is active only on recipe routes — i.e. `current: !isLearn && !isFamilies` — so the families route highlights the Families tab, not Recipes. No CSS change needed (folder-tab nav styles already apply to all `.nav-links a`).

**Patterns to follow:** Existing `navLinks` array and `isLearn` derivation in `src/layouts/BaseLayout.astro:21-27`.

**Test scenarios:** `Test expectation: none — config-shaped nav array edit; no test harness for layout nav currently exists.` Verify by build + visual check.

**Verification:** On `/families/` the Families tab shows `aria-current="page"` and Recipes does not; on `/` Recipes is current; on `/learn/` Learn is current; folder-tab styling renders identically across all three tabs.

---

## Sequencing

U1 → U2 → U3. U1 unblocks the note constant; U2 needs it; U3 links to the page U2 creates. Could land as one PR (all small, one feature) or three commits; leave commit/PR shape to execution.

## Verification (whole feature)

- `npm test` green (codegen assertions from U1).
- `npm run codegen` leaves generated artifacts clean (CI staleness gate passes).
- `npm run build` + `astro check` succeed.
- Manual: `/families/` renders six roots, correct counts/notes/links, Flip greyed at 0, Families nav tab active.

## Deferred to Follow-Up Work

- Family badge on `RecipeCard` in the recipe grid (issue #61 explicitly out of scope).
- Linking the recipe-page "Family" fact to `/families/` (currently links to `/by-family/<slug>/`; could additionally surface the index — not required here).
