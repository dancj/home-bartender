---
title: "feat: Bulk ingest skill, My Bar filter, index scaling (issues #113–#115)"
date: 2026-07-04
artifact_contract: ce-unified-plan/v1
artifact_readiness: implementation-ready
execution: code
product_contract_source: ce-plan-bootstrap
origin: "GitHub issues #113, #114, #115"
---

# feat: Bulk ingest skill, My Bar filter, index scaling

## Summary

Ship three independent PRs, one per open issue:

- **#113** — a `/ingest` project skill plus gitignored `intake/` folder for bulk recipe ingestion into `recipes/inbox/`.
- **#114** — a "My Bar" inventory filter on the index: mark owned spirits (localStorage), toggle "what can I make".
- **#115** — index browse scaling: client-side sort control and a compact list view toggle.

Product contract source is the three GitHub issues (filed 2026-07-04). Product Contract unchanged from the issues; #115 is deliberately scoped to its smallest useful slice (see Assumptions).

---

## Problem Frame

The site has ~20 recipes and a large un-ingested backlog. The email pipeline handles one recipe at a time (#113). Once content lands, visitors need "what can I make with what I own" (#114) and the flat index needs ordering/density controls to stay browsable at 100+ recipes (#115).

## Requirements

- **R1** (#113): Dropping raw recipe material (text files, images) into a gitignored `intake/` folder and invoking `/ingest` produces normalized `recipes/inbox/*.md` drafts on one branch/PR, following the existing email-pipeline rules in `CLAUDE.md`.
- **R2** (#114): A visitor can mark spirits they own; the selection persists across visits (localStorage, no accounts).
- **R3** (#114): A "what can I make" mode filters the index to recipes whose `spirits[]` are fully covered by the owned set. Spirit-level matching only.
- **R4** (#115): The visitor can re-sort the index (title A–Z default, primary spirit, difficulty) and switch to a compact list view; view preference persists.
- **R5** (all): Existing filter-bar behavior (URL-param filters, chip toggling, empty state, count) keeps working alongside the new controls.

---

## Key Technical Decisions

- **KTD1 — Skill as instructions, not code.** #113 ships as `.claude/skills/ingest/SKILL.md` (project skill) + one `.gitignore` line. No new scripts: parsing/normalization is agent work governed by the existing email-pipeline rules; validation and promotion reuse `scripts/validate.mjs` and `scripts/promote.mjs`. Rationale: zero new infra, single source of truth for normalization rules stays `CLAUDE.md`/`TEMPLATE.md`.
- **KTD2 — Extend the existing inline filter script, not a framework.** #114 and #115 build on `src/pages/index.astro`'s established pattern: server-rendered cards carrying `data-*` attributes, one `is:inline` script, URL params for shareable filter state. My Bar ownership and view density are personal, not shareable, so they persist in `localStorage`; the makeable toggle is a URL param like other filters.
- **KTD3 — Pure logic in `src/lib`, tested with Vitest.** Makeable predicate and sort comparators are pure TypeScript in `src/lib/` with sibling `*.test.ts`, mirroring `src/lib/related.ts` / `src/lib/taxonomy.ts`. Preferred wiring: convert the index script to a processed (non-`is:inline`) module script that imports the lib functions directly, so the tested code is the shipped code. Fall back to `is:inline` + hand-mirrored copies only if the module conversion shows a concrete regression (e.g. visible flash of unfiltered/unsorted content before the deferred module runs) — and record that constraint in the code if so. If mirroring is needed, the lib versions are the tested specification; keep mirrors ≤10 lines and byte-similar.
- **KTD4 — One PR per issue, branched off `staging`.** Branches `feat-113-bulk-ingest-skill`, `feat-114-my-bar-filter`, `feat-115-index-scaling`. #114 and #115 both edit `index.astro`; land #114 first and rebase #115 if needed.

## Scope Boundaries

**In scope:** the three issues as filed, at the depth described above.

**Out of scope (true non-goals):**
- Ingredient-level (non-spirit) inventory matching (#114 issue notes it as a later refinement).
- Accounts or server-side persistence.
- Pagination/progressive loading (#115 lists it as an option; sort + density is the chosen first slice).

### Deferred to Follow-Up Work
- Grouped index sections by spirit/category with jump nav (#115 option — revisit once real recipe volume shows the shape).
- "Recently added" sort — the schema already defines `created: z.coerce.date().optional()` (`src/content.config.ts`) and the current corpus populates it, so this is near-free (one `data-created` attribute + comparator); deferred as a deliberate scope choice, not a data gap.
- Modifier/liqueur-level My Bar matching.

## Assumptions

- User explicitly requested PRs for all three issues now, overriding the "wait for content" note on #114/#115 — honored.
- #115's first slice is sort control + compact list view (not grouping or pagination); issue leaves the choice open and this is the smallest useful step.
- My Bar spirit list derives from spirits present in published recipes (same derivation the filter bar already uses), not the full taxonomy — no point owning a spirit with zero recipes.
- No external research needed: all patterns (inline filter script, lib+vitest, skills format) exist locally.

---

## Implementation Units

### U1. Bulk ingest skill and intake folder (#113)

**Goal:** `/ingest` skill that batch-normalizes raw material from `intake/` into `recipes/inbox/` drafts and ships them as one PR.

**Requirements:** R1

**Dependencies:** none

**Files:**
- `.claude/skills/ingest/SKILL.md` (new)
- `.gitignore` (add `intake/`)

**Approach:** SKILL.md instructs the agent to: create `intake/` if missing; enumerate `intake/*` (text and image files — images read directly); process at most ~10 intake files per invocation (oldest first), reporting the remaining count so the user re-invokes for the next chunk — one branch/PR per chunk, keeping each PR reviewably small; flag unsupported/unreadable formats (e.g. HEIC) instead of silently skipping; parse each recipe; normalize per the "Email Recipe Processing" rules in `CLAUDE.md` (slug, `category: inbox`, `publish: false`, frontmatter `ingredients[]`/`steps[]`/`garnish`/`house_made`/`batch`, conservative attribution, missing measurements left blank, body = `## Notes` only); write to `recipes/inbox/<slug>.md`; run `npm run validate`; commit all drafts on one `feat-inbox-bulk-<date>` branch; push and open one PR whose body lists parsed recipes and flags missing measurements/guessed values; report per-file outcomes including files it could not parse. Duplicate slugs against existing recipes get a suffix or are flagged, not overwritten.

**Patterns to follow:** `CLAUDE.md` Email Recipe Processing section; skills format used by `.claude/skills/edit-writing.md` (frontmatter `name`/`description` + markdown body).

**Test scenarios:** Test expectation: none — instruction file + gitignore entry; no runtime code. Verification is a dry run.

**Verification:** `intake/` is ignored by git (`git check-ignore intake/x` passes). A dry run of the skill against 2–3 sample files (one text recipe, one with a house-made syrup, one unparseable) produces valid inbox drafts (`npm run validate` clean) and flags the unparseable file.

---

### U2. Makeable-predicate library (#114)

**Goal:** Tested pure logic for "can I make this recipe with owned spirits" and My Bar persistence parsing.

**Requirements:** R2, R3

**Dependencies:** none

**Files:**
- `src/lib/myBar.ts` (new)
- `src/lib/myBar.test.ts` (new)

**Approach:** Two pure functions: `isMakeable(recipeSpirits: string[], owned: Set<string> | string[]): boolean` (true iff every recipe spirit is owned) and `parseOwnedSpirits(raw: string | null, validSlugs: string[]): string[]` (safe parse of the localStorage JSON payload — tolerates null, malformed JSON, and non-arrays by returning `[]`; unknown slugs are filtered for matching/display only). Ownership is durable user data: validate against the full taxonomy `SPIRITS` list (not the published-recipe subset) when deciding what to persist, and never rewrite the stored payload just because a slug has no published recipe right now — a spirit whose recipes unpublish must survive the round-trip. Storage key namespaced, e.g. `hb:my-bar`.

**Execution note:** Implement test-first — this is the behavioral core of #114.

**Patterns to follow:** `src/lib/related.ts` + `src/lib/related.test.ts` (small pure module, vitest).

**Test scenarios:**
- Happy path: recipe `[gin]` with owned `[gin, rum]` → makeable; recipe `[rum, rhum-agricole]` with owned `[rum]` → not makeable.
- Edge: recipe with empty `spirits[]` → makeable (nothing required); owned empty → only zero-spirit recipes makeable.
- Error paths for `parseOwnedSpirits`: `null` → `[]`; `"not json"` → `[]`; `"{\"a\":1}"` (non-array) → `[]`; `'["gin","made-up-spirit"]'` with valid slugs `["gin"]` → `["gin"]` for matching purposes.
- Durability: a persisted slug absent from the published-recipe set is retained in storage across a read/write cycle (only taxonomy-invalid junk is ever pruned).

**Verification:** `npm test` green; scenarios above all covered.

---

### U3. My Bar UI on the index (#114)

**Goal:** My Bar spirit selection + "what can I make" toggle wired into the existing filter bar.

**Requirements:** R2, R3, R5

**Dependencies:** U2

**Files:**
- `src/pages/index.astro` (modify)

**Approach:** Add a "My Bar" filter group to the existing `details.filter-bar`: multi-select spirit chips (derived from the same `spirits` list already computed) that toggle membership in the localStorage-persisted owned set, plus a "What can I make" toggle chip. The makeable toggle is a URL param (e.g. `?makeable=1`) so it composes with existing filters in `cardMatches` (card fails when `makeable` is on and `ds.spirits` isn't covered by the owned set). Owned-set changes re-run `apply()`. Inline script mirrors U2's `isMakeable`/`parseOwnedSpirits` logic (KTD3); the mirror must treat an empty `data-spirits` string as an empty list (`"".split(',')` yields `[""]` — filter empty segments) so the zero-spirit-makeable edge matches the lib spec. Multi-select chips need independent active-state handling from the existing single-select filter chips — keep them in a distinct group (e.g. `data-mybar` instead of `data-filter`) so the existing single-select loop is untouched. When `makeable` is on and the owned set is empty, show a distinct empty-state message ("Mark spirits in My Bar to see what you can make.") instead of the generic filter message — this is the most common first encounter with the feature. My Bar chips must be visually distinguishable from the single-select Spirit filter chips above them (opposite semantics: persistent ownership vs transient filter) — give them a distinct affordance, e.g. an owned-checkmark or outlined chip variant, rather than reusing `.chip-active` verbatim.

**Patterns to follow:** existing filter-group markup, chip styles, `readFilters`/`writeFilters`/`apply` flow in `src/pages/index.astro`.

**Test scenarios:** Logic is covered by U2's unit tests; the wiring is DOM-glue. Test expectation: none beyond U2 — manual verification below. (No DOM test harness exists in the repo; introducing one is out of scope.)

**Verification:** In a built preview: mark two spirits, reload → selection persists; enable "what can I make" → only fully-covered recipes visible, count/empty-state correct; combine with a flavor filter → intersection applies; clear filters clears `makeable` but not bar ownership.

---

### U4. Index sort comparators library (#115)

**Goal:** Tested pure sort logic for the index.

**Requirements:** R4

**Dependencies:** none

**Files:**
- `src/lib/indexSort.ts` (new)
- `src/lib/indexSort.test.ts` (new)

**Approach:** `sortKeyFns` or a single `compareCards(a, b, mode)` over a minimal card-shaped record `{ title, primarySpirit, difficulty }` with modes `title` (localeCompare), `spirit` (primary spirit label A–Z, ties by title), `difficulty` (easy → medium → advanced order from taxonomy, ties by title). Export the difficulty order from the generated taxonomy constants rather than hardcoding.

**Execution note:** Test-first.

**Patterns to follow:** `src/lib/breadcrumbs.ts` + test; difficulty order from `src/taxonomy.generated.ts` (`DIFFICULTIES`).

**Test scenarios:**
- Happy: `title` mode sorts case-insensitively A–Z; `spirit` mode groups gin before rum; `difficulty` mode orders easy < medium < advanced.
- Edge: missing/empty primary spirit sorts last in `spirit` mode; equal spirits fall back to title; unknown difficulty value sorts last.

**Verification:** `npm test` green.

---

### U5. Sort control and compact view on the index (#115)

**Goal:** Visitor-facing sort select and card/list density toggle.

**Requirements:** R4, R5

**Dependencies:** U4; lands after U3 merges (same file — rebase, don't fork).

**Files:**
- `src/pages/index.astro` (modify)
- `src/components/RecipeCard.astro` (modify only if a data attribute for title/difficulty is missing for sorting)

**Approach:** Toolbar row above the grid: a labeled `<select>` for sort (Title A–Z default / Spirit / Difficulty; `<label for="sort-select">Sort by</label>` or `aria-label="Sort recipes"`, matching the codebase's existing aria-label convention) and a two-state view toggle (cards / compact list). Sort re-orders by `grid.appendChild(card)` in comparator order using card `data-*` (add `data-title` if needed; `data-difficulty` already exists, primary spirit is first entry of `data-spirits`). Sort state in URL param (`?sort=`), shareable like filters — but the existing script's `writeFilters` rebuilds `URLSearchParams` from scratch and `readFilters` whitelists only FIELDS, so it would strip `?sort=` on any chip click: seed `writeFilters` from `location.search` and delete only filter keys, keep `sort` out of the active-filter count and out of the clear-filters reset, and apply the sort order inside `apply()` so popstate and chip clicks preserve ordering. Unknown `?sort=` values fall back to title order. View density in localStorage (`hb:index-view`), applied as a class on the grid with a compact CSS variant (smaller cards, single-column rows, blurb hidden). Native `<select>`, no custom dropdown.

**Patterns to follow:** existing inline-script + data-attribute pattern; chip/eyebrow styles for the toolbar.

**Test scenarios:** Comparator logic covered in U4. Test expectation: none beyond U4 — DOM glue + CSS; manual verification below.

**Verification:** In a built preview: switching sort reorders cards correctly and survives reload via URL param; compact view persists across reloads; filters + sort + makeable compose without breaking count/empty state; keyboard focus order follows visual order after re-sort.

---

## Verification Contract

- `npm test` green (gates CI on every PR).
- `npm run build` green (`astro check` + build + pagefind).
- `npm run validate` green (recipe corpus untouched, but promote/validate must stay clean).
- Manual preview checks per U3/U5 verification lists.
- Each PR body carries `Closes #<issue>`.

## Definition of Done

Three merged-ready PRs open, one per issue, each green in CI:
1. `feat-113-bulk-ingest-skill` → `Closes #113` — skill file + gitignore.
2. `feat-114-my-bar-filter` → `Closes #114` — U2 + U3.
3. `feat-115-index-scaling` → `Closes #115` — U4 + U5.

## Risks & Dependencies

- **Same-file collision (#114/#115):** both edit `index.astro`. Mitigation: KTD4 ordering — land #114 first; #115 branches from or rebases onto it.
- **Inline-script/lib drift (KTD3):** mirrored logic can desync. Mitigation: lib tests are the specification; keep mirrored functions byte-similar and small (≤10 lines each).
- **LocalStorage unavailable (private mode):** wrap reads/writes in try/catch; features degrade to session-only, never throw.
- **Base path:** site serves under `/home-bartender/`; any new links/assets must respect `import.meta.env.BASE_URL` (existing pattern in `RecipeCard.astro`).
