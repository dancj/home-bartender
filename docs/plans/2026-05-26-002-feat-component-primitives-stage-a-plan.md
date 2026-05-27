---
title: 'feat: Stage A — typed recipe components with frontmatter-driven body sections'
type: feat
status: active
date: 2026-05-26
---

# feat: Stage A — typed recipe components with frontmatter-driven body sections

## Summary

Move recipe `## Ingredients`, `## Steps`, `## House-Made <Thing>`, and `## How to Batch It` content out of freeform markdown body sections and into structured YAML frontmatter (`ingredients[]`, `steps[]`, `house_made{}`, `batch{}`, plus top-level `garnish` and `float`). A small set of typed Astro components renders the structured data from inside the existing `<article data-pagefind-body>` wrapper in `src/layouts/RecipeLayout.astro`. Body collapses to `## Notes` and any narrative-only prose. A one-time migration script rewrites all 20 existing recipes in place, the body linter in `scripts/validate.mjs` inverts its rules to enforce the new contract, and `TEMPLATE.md` / `CLAUDE.md` document the new shape. Stage B (the `ingredients/` content collection) is deferred until a downstream surface — shopping list, pantry filter — demands it.

---

## Problem Frame

Today every recipe re-invents its ingredient and step layout in prose markdown. That works for rendering but forecloses on downstream surfaces (shopping lists, "what can I make tonight" filters, substitution suggestions, ingredient-pivot pages) because no structured data exists to query. The body-structure linter shipped in PR #20 closes one gap — it enforces that the prose headings exist — but the layout is still re-invented per file, and the contents under each heading aren't typed data. Stage A is the architectural shift that turns recipe sections into structured data without yet investing in a separate ingredient ontology (Stage B). Once Stage A is in, the door to Stage B opens, but the cost to defer Stage B stays small because the change is local to a single file shape.

**Acknowledged contract reversal.** PR #20 shipped on 2026-05-25 and Stage A inverts its body-contract one week later — `## Ingredients` / `## Steps` go from "must exist in body" to "must NOT exist in body." This is not a sign PR #20 was wasted: it was the right interim gate to enforce the body contract while the structured-frontmatter direction was still being scoped, and the validator/test infrastructure it built is what Stage A's U7 rewrites against. The reversal is visible enough that it earns this explicit acknowledgment rather than being buried in a commit message.

---

## Requirements

- R1. Every published recipe (`publish: true`) carries its ingredients and steps as structured frontmatter (`ingredients: string[]`, `steps: string[]`), not as freeform body markdown headings.
- R2. Optional structured `house_made{ name, yield?, ingredients?, steps }` field captures the existing `## House-Made <Thing>` convention; `batch{ yield, ingredients?, instructions? }` captures `## How to Batch It` (with `instructions` optional — some recipes end the batch section after the scaled ingredient list); top-level `garnish` and `float` strings capture the existing `**Garnish:**` / `**Float:**` bold-callout pattern.
- R3. Recipe pages render the structured data via shared Astro components, preserving today's visual rhythm (uppercase eyebrow H2s, serif body, ingredient bullets, numbered steps).
- R4. Pagefind continues to index ingredient and step text — searching for "lime" or "shake" still surfaces the recipe pages it surfaces today.
- R5. The body-structure linter in `scripts/validate.mjs` is inverted: it errors on residual `## Ingredients` / `## Steps` / `## House-Made <…>` / `## How to Batch It` headings in the body (migration leftovers), errors on empty `ingredients[]` for `publish: true`, and preserves the existing craft-prep warning (now scanning `ingredients[]` strings) and batch-format warning (now checking `batch` field presence).
- R6. A one-time migration script (`scripts/migrate-body-to-frontmatter.mjs`) rewrites every existing recipe (~20 files across `recipes/{classics,originals,inbox}/` — the `seasonal/` directory does not exist yet) in place, with `--dry-run`, atomic per-file rollback on validation failure, and idempotent behavior on already-migrated files.
- R7. `TEMPLATE.md` and `CLAUDE.md` reflect the new contract: frontmatter is the structured-content surface, body is for `## Notes` and narrative-only prose.

---

## Scope Boundaries

- No `ingredients/` content collection (Stage B) — single-string ingredient lines stay freeform text in this stage; unit/amount extraction is explicitly deferred until a downstream surface requires it.
- No new structured fields for `sections/` (prose pages) — that collection's body stays freeform markdown.
- No changes to the canonical taxonomy registry (`data/taxonomy.yaml`) — Stage A does not introduce a `units` enum.
- No PR preview deploys, no visual regression harness — those are separate ideation items (#4 / future work).
- No changes to the auto-release-pr workflow or the CHANGELOG bot — they continue to operate on commit history.

### Deferred to Follow-Up Work

- **Stage B — `ingredients/` content collection**: Defer until at least one downstream surface (shopping list, pantry filter, ingredient-pivot page) is real and demanding it. Filed as the second stage of issue #23; reopen after the first surface request.
- **`recipes/seasonal/` directory creation**: The validator and schema both accept `category: seasonal`, but the directory does not exist. Not a Stage A blocker; create when the first seasonal recipe lands.
- **Ingredient-unit enum / amount parser**: Extracting `oz` / `tsp` / `dash` / `bar spoon` and the numeric amount into typed fields is part of Stage B, not Stage A.
- **Multiple `house_made` preparations per recipe**: Today's corpus has at most one per recipe. Extend to `house_made: HouseMade[]` if a recipe needs more — additive change, no migration needed.
- **Optional/substitution structure**: Parenthetical and italic substitutions on ingredient lines (e.g., `2 oz tequila (or mezcal for a smokier variation)`) stay as freeform string content in Stage A; structured `substitutes[]` arrives with Stage B.

---

## Context & Research

### Relevant Code and Patterns

- `src/content.config.ts` — Zod schema for the `recipes` collection. Single flat `z.object`; new structured fields slot in alongside today's flat keys.
- `src/layouts/RecipeLayout.astro` — single splice point at line 81: `<div class="recipe-body"><slot /></div>`. The existing `:global(h2)` / `:global(li)` styling inside `.recipe-body` (lines 189–236) already produces the uppercase-eyebrow / serif-body / bulleted-list look that components must preserve.
- `src/pages/recipes/[id].astro` — calls `await render(recipe)` then `<RecipeLayout recipe={recipe}><Content /></RecipeLayout>`. The `<Content />` is the rendered markdown body; the layout's `<slot />` is where it lands.
- `scripts/validate.mjs` — hand-rolled `parseFrontmatter` (lines 41–72) only matches `^([a-z_]+):` keys with one level of nesting. **Cannot parse nested arrays-of-objects or block scalars**. Must upgrade to the `yaml` package (already a dep) before the linter can introspect the new structured fields.
- `scripts/validate.mjs` lines 137–168 — the body linter rules that flip in U7: heading existence checks (137–144) invert to non-existence checks, empty-list check (146–160) moves to `ingredients[].length` against Zod, House-Made trigger (`mentionsHouseMadeWorthyPrep`) scans `data.ingredients[]` instead of `linesUnderHeading('Ingredients')`, batch warning (162–168) checks `data.batch` instead of `## How to Batch It` heading.
- `scripts/promote.mjs` — gold-standard migration script pattern: dependency injection (`makeDeps` factory), `execFile` not shell strings, pre-flight validation (lines 147–174), atomic rollback (187–207), `--dry-run`. The Stage A migration script should mirror this shape, with the addition of the `yaml` package for proper YAML read/write.
- `scripts/promote.mjs:165` — synthesizes frontmatter and calls `lintBody` as a pre-flight check; will need to update when the linter contract flips in U7.
- `scripts/migrate-to-frontmatter.mjs` and `scripts/migrate-styles-to-tags.mjs` — historical bulk-mutation scripts, useful for the file-walking pattern but both hand-roll YAML emit (brittle for structured shapes — do not copy).
- `scripts/validate.test.mjs` — inline multi-line strings as fixtures (no `__fixtures__/` dir); `it.each` for predicate tables; preserves the `mentionsHouseMadeWorthyPrep` table (lines 261–286) — keep this contract intact in U7.
- `scripts/promote.test.mjs` — DI-mock pattern for filesystem mutation tests (`makeDeps` with mocked `exec` / `readFile` / `writeFile`, assertions on `calls.exec` / `calls.writeFile`). Migration script tests in U5 follow this shape.
- `scripts/codegen-taxonomy.mjs` — uses `yaml` package's `parse` for read; pattern for proper YAML handling.
- `package.json` — `yaml` (`^2.9.0`) is already a dep; no new dependencies required for the migration script.
- `TEMPLATE.md` — lines 7–56 (frontmatter schema), 58–75 (taxonomy table, codegen-managed), 77–119 (body schema), 121–135 (migration history). U8 rewrites lines 7–56 and 77–119; taxonomy block (58–75) is untouched.
- `CLAUDE.md` — Recipe Pipeline §2 (review stage) hard-codes the body contract: "the body has at minimum `## Ingredients` and `## Steps`". U8 rewrites this paragraph and the inline frontmatter sketch under "Recipe Template Quick Reference".

### Institutional Learnings

- `docs/solutions/` does not yet exist in this repo. No prior learnings to draw from for Astro content-collection migrations, markdown-to-frontmatter conversions, or Pagefind index behavior under structured content. Stage A is itself a learning-generating opportunity — capture the migration script's idempotency story and any Astro 6 component-composition gotchas via `/ce-compound` once it lands.

### External References

- Skipped per Phase 1.2: the codebase already has strong local patterns for content-collection schemas (existing Zod object), one-shot bulk migrations (`migrate-to-frontmatter.mjs`, `migrate-styles-to-tags.mjs`), and proper YAML serialization (`codegen-taxonomy.mjs`). The migration is low-risk (one-time write across 20 files, atomic per-file rollback, no external systems).

---

## Key Technical Decisions

- **Frontmatter-driven, not MDX-in-body.** Structured sections live in YAML; `RecipeLayout.astro` renders them via shared components. Reason: Astro Content Layer is built around frontmatter, the validator already reads frontmatter, the body linter from #20 stays focused on prose body, Stage B extends naturally (`ingredients[].ref` becomes a typed slug), and Pagefind indexes the rendered component output without config changes. The alternative — converting every `.md` to `.mdx` and using `<Ingredients>…</Ingredients>` inline — adds per-recipe surface area, complicates Pagefind, and makes Stage B querying harder.
- **Single-string ingredient lines, no inner structure.** `ingredients: string[]`, not `ingredients: { amount, unit, item }[]`. Reason: today's corpus uses ~6 distinct units across vulgar fractions, ranges, parenthetical substitutions, and garnish-as-list-item lines; enum-ing units in Stage A would lose fidelity ("1 egg white", "6 fresh mint leaves", "Pinch of salt" don't fit cleanly). Stage B introduces the structured shape alongside the `ingredients/` collection, when there's a downstream consumer to justify the precision.
- **Garnish and float as top-level fields, not list items.** ~30% of recipes today use `**Garnish:** Luxardo cherry` and `**Float:** ¼ oz Laphroaig` as bold callouts *outside* the ingredient list, not as final list items. Modeling them as separate top-level strings (`garnish`, `float`) preserves the existing convention and lets the renderer style them distinctly. The remaining recipes that put garnish inline as `- Salt rim` migrate to the top-level `garnish` field too — one canonical place to read them.
- **Single `house_made` per recipe.** Today's corpus has at most one craft-prep per recipe. `house_made: { name, yield?, ingredients?, steps }` is sufficient. The `ingredients?` field is optional because bacon-washed-bourbon-style preparations have only steps. If a multi-prep recipe ever lands, change to `house_made: HouseMade[]` additively.
- **Layout splice is conditional.** `<Ingredients items={data.ingredients} />` only renders when `data.ingredients.length > 0`. This lets U1 (schema) + U3 (components) + U4 (layout wire-up) ship before U6 (corpus migration) without breaking any pre-migration recipes — old recipes keep rendering their body markdown through the `<slot />` after the structured renderers (which are no-ops when empty). Net result: the migration moment is the moment recipes flip, not a coordinated big-bang.
- **Upgrade `parseFrontmatter` in `validate.mjs` to the `yaml` package.** The hand-rolled parser cannot handle nested arrays-of-objects or block scalars — both required by U7's linter rule changes (introspecting `data.ingredients[]` strings, checking `data.house_made` shape, checking `data.batch.instructions`). The `yaml` package is already a dep; the change is a drop-in replacement with broader existing-fixture coverage in `validate.test.mjs`.
- **TDD-first for U2, U5, U7.** Migration script (U5) and validator changes (U2, U7) are pure-logic units that benefit most from inline-string fixtures. Tests describe the input recipe shape and the expected output frontmatter / lint result before the implementation lands. U3 (components) and U4 (layout) are visual; `astro check` + manual dev-server verification gates them per existing repo convention. U1 (schema) and U8 (docs) are config/documentation; no test scenarios.

---

## Open Questions

### Resolved During Planning

- **What's the per-ingredient shape?** Resolved: single freeform string per item (`ingredients: string[]`). Deferred enum/structured shape to Stage B.
- **How do `**Garnish:**` and `**Float:**` bold callouts migrate?** Resolved: become top-level `garnish: string` and `float: string` fields, separate from `ingredients[]`. Inline `- Salt rim` list items also migrate to `garnish`.
- **Does `house_made` need to be an array?** Resolved: single object for Stage A; additive change to array if multi-prep recipes ever land.
- **Does `batch.instructions` need rich markdown?** Resolved: yes — store as a single string (YAML block scalar) so the existing prose-paragraph batch instructions migrate verbatim; render via Astro's markdown helper or `set:html` (decide in U3) so links/emphasis survive.
- **Does the validator's `parseFrontmatter` need upgrading?** Resolved: yes — switch to the `yaml` package (already a dep). Prerequisite for U7's introspection of `ingredients[]` / `house_made` / `batch`.
- **Does Pagefind need re-configuration?** Resolved: no — `<article data-pagefind-body>` in `RecipeLayout.astro` still wraps the rendered output of the new components; Pagefind crawls the resulting HTML. Verification in U4.
- **Do inbox (`publish: false`) recipes have to migrate?** Resolved: yes — they're rendered at `/inbox/?preview=1` and use the same layout. The migration script runs across all four category dirs.

### Deferred to Implementation

- **Exact YAML shape of `batch.ingredients`.** Today's corpus has scaled-from-base-recipe ingredients and "from the card"-style hand-written batch lists. Implementation can decide whether the new field is `batch.ingredients: string[]` (same shape as top-level) or something narrower; prefer the simpler shape unless implementation reveals a reason.
- **Component file layout — flat `src/components/` or new `src/components/recipe/` subdirectory?** Today's components live flat (`RecipeCard.astro`, `Search.astro`). Adding 4–5 recipe-section components doubles the count; let implementation decide based on file count and the user's preference at the moment.
- **Whether to keep the `preparations` reserved frontmatter field.** Schema-defined but unused. Either leave dormant (safest), repurpose for the new `house_made` shape (breaking — requires data migration), or delete (additive but loses the reserved-name slot). Implementation can decide; default is leave it dormant and use a fresh `house_made` key.
- **Whether the migration script emits `git mv` summaries.** `promote.mjs` runs `git mv`; this migration only mutates file contents in place, no renames. Plain `writeFile` is the expected pattern.

---

## High-Level Technical Design

> *This illustrates the intended approach and is directional guidance for review, not implementation specification. The implementing agent should treat it as context, not code to reproduce.*

The post-migration recipe file shape:

```yaml
---
title: Penicillin
blurb: Honey-ginger-lemon scotch with a smoky Islay float.
category: classic
publish: true

glass: rocks
method: shaken
ice: large-cube
difficulty: medium
spirits: [scotch]
flavors: [honey, ginger, citrus]

attribution:
  creator: Sam Ross
  bar: Milk & Honey
  year: '2005'

ingredients:
  - 2 oz blended scotch
  - ¾ oz fresh lemon juice
  - ¾ oz honey-ginger syrup

float: ¼ oz Laphroaig (or other Islay single malt)

steps:
  - Combine scotch, lemon juice, and honey-ginger syrup in a shaker with ice.
  - Shake hard for 10 seconds.
  - Strain into a rocks glass over a large cube.
  - Float the Laphroaig by pouring slowly over the back of a bar spoon.

house_made:
  name: Honey-Ginger Syrup
  yield: Makes ~4 oz. Keeps 2–3 weeks refrigerated.
  ingredients:
    - 1 cup honey
    - 1 cup water
    - 4-inch piece fresh ginger, sliced
  steps:
    - Combine honey and water in a small saucepan.
    - Add the sliced ginger.
    - Simmer 10 minutes, then strain and cool.

batch:
  yield: Makes 8 servings.
  ingredients:
    - 16 oz blended scotch
    - 6 oz fresh lemon juice
    - 6 oz honey-ginger syrup
  instructions: |
    Combine all in a pitcher. Stir to chill.
    Pour over large cubes; float Laphroaig per glass.
---

## Notes

Sam Ross's original spec calls for the float to be Laphroaig 10 specifically.
Use whatever Islay is in the cabinet.
```

The `<slot />` splice in `RecipeLayout.astro` becomes, conceptually:

```astro
<div class="recipe-body">
  {data.ingredients.length > 0 && <Ingredients items={data.ingredients} garnish={data.garnish} float={data.float} />}
  {data.house_made && <HouseMade {...data.house_made} />}
  {data.steps.length > 0 && <Steps items={data.steps} />}
  {data.batch && <BatchInstructions {...data.batch} />}
  <slot />   {/* Notes + any prose-only sections */}
</div>
```

Each component emits its own `<h2>` heading (e.g., `<h2>Ingredients</h2>`) so the existing `:global(h2)` cascade inside `.recipe-body` continues to style them as uppercase eyebrow headings without additional component-scoped CSS.

Migration script flow per file:

```
read file → parse frontmatter (yaml package) → walk body for known H2 sections
  → extract Ingredients lines into ingredients[] (pulling **Garnish:**/**Float:** callouts into top-level garnish/float)
  → extract Steps numbered list into steps[]
  → extract ## House-Made <Name> block into house_made{ name, yield, ingredients?, steps }
  → extract ## How to Batch It block into batch{ yield, ingredients?, instructions }
  → leave ## Notes and unrecognized H2 sections in the body
  → re-emit frontmatter via yaml.stringify + new body
  → run lintBody on result; rollback file on validation failure
  → next file
```

---

## Implementation Units

### U1. Extend recipe Zod schema with structured body fields

**Goal:** Add the structured fields (`ingredients`, `steps`, `house_made`, `batch`, `garnish`, `float`) to the `recipes` collection schema. All additive and optional — pre-migration recipes still parse cleanly.

**Requirements:** R1, R2

**Dependencies:** None

**Files:**
- Modify: `src/content.config.ts`

**Approach:**
- Add to the `recipes` collection's `z.object`:
  - `ingredients: z.array(z.string()).default([])`
  - `steps: z.array(z.string()).default([])`
  - `garnish: z.string().optional().default('')`
  - `float: z.string().optional().default('')`
  - `house_made: z.object({ name, yield?, ingredients?, steps }).optional()`
  - `batch: z.object({ yield, ingredients?, instructions? }).optional()` — `instructions` optional because some recipes end the batch section after the scaled ingredient list (`spice-trade.md`).
- Leave the `preparations` reserved field dormant — distinct from `house_made`.
- Schema accepts the legacy empty-arrays default so pre-migration recipes still parse during U3/U4 build verification.

**Patterns to follow:**
- Existing flat `z.object` shape in `src/content.config.ts`.
- `attribution` is the model for nested object fields (`.default(() => ({…}))` factory).

**Test scenarios:**
- Test expectation: none — schema additivity is verified by `astro check` against real recipes in U4 and U6. The repo has no Zod-schema-direct test convention; trust the build gate per existing pattern.

**Verification:**
- `npm run build` succeeds with the legacy recipe corpus untouched.
- A throwaway recipe with all six new fields populated parses through `astro check` without errors.

---

### U2. Upgrade `parseFrontmatter` in `scripts/validate.mjs` to the `yaml` package

**Goal:** Replace the hand-rolled YAML parser in `scripts/validate.mjs` with `yaml.parse` so the body linter and migration script can introspect nested arrays-of-objects and block scalars. Prerequisite for U7.

**Requirements:** R5

**Dependencies:** None (U2 can run in parallel with U1, U3)

**Files:**
- Modify: `scripts/validate.mjs`
- Modify: `scripts/validate.test.mjs`

**Approach:**
- Replace `parseFrontmatter` (lines 41–72) with a thin wrapper around `import { parse } from 'yaml'`.
- Public signature unchanged — returns the parsed frontmatter object — so downstream callers (`promote.mjs`, the validator's own body-lint code path, the migration script in U5) don't need to change.
- Preserve the `parseScalar` helper if other code paths use it; otherwise delete.

**Execution note:** Test-first. Add test scenarios that exercise nested arrays-of-objects and block scalars *before* the replacement; the existing tests should also pass against the new parser unchanged.

**Patterns to follow:**
- `scripts/codegen-taxonomy.mjs` — already uses `parse` from `yaml` for read.
- Existing `parseFrontmatter` callers in `validate.mjs` and `promote.mjs`.

**Test scenarios:**
- Happy path: parses today's full frontmatter shape (all flat fields + nested `attribution`) — regression coverage from existing tests passes unchanged.
- Happy path: parses `ingredients: [- "2 oz tequila", - "1 oz lime"]` into `{ ingredients: ['2 oz tequila', '1 oz lime'] }`.
- Happy path: parses `house_made: { name: …, ingredients: [...], steps: [...] }` into the expected nested object.
- Happy path: parses a block scalar (`batch.instructions: |` followed by multi-line prose) preserving line breaks.
- Edge case: malformed YAML produces a clear error (regression on today's silent-skip behavior).
- Edge case: missing frontmatter delimiters still returns `{}` or null, matching today's behavior.

**Verification:**
- `npm test` passes (existing `validate.test.mjs` regression coverage unchanged).
- Running `node scripts/validate.mjs` against a recipe with the post-migration shape (a manually-crafted fixture) parses every structured field correctly.

---

### U3. Build typed Astro components for the structured sections

**Goal:** Create the shared components that render each structured frontmatter section. Each component emits semantic HTML inside the `.recipe-body` cascade so the existing `:global(h2)` / `:global(li)` styling produces today's visual rhythm with no per-component CSS.

**Requirements:** R3, R4

**Dependencies:** U1 (schema must exist for prop types)

**Files:**
- Create: `src/components/recipe/Ingredients.astro` (or `src/components/Ingredients.astro` if the implementer prefers flat)
- Create: `src/components/recipe/Steps.astro`
- Create: `src/components/recipe/HouseMade.astro`
- Create: `src/components/recipe/BatchInstructions.astro`

**Approach:**
- `Ingredients` props: `items: string[]`, `garnish?: string`, `float?: string`. Renders `<h2>Ingredients</h2>` followed by `<ul>` of items, then optional `<p><strong>Garnish:</strong> …</p>` and `<p><strong>Float:</strong> …</p>` blocks beneath the list.
- `Steps` props: `items: string[]`. Renders `<h2>Steps</h2>` followed by `<ol>` of items.
- `HouseMade` props: `name: string`, `yield?: string`, `ingredients?: string[]`, `steps: string[]`. Renders `<h2>House-Made {name}</h2>`, optional italic `<em>{yield}</em>` line, optional bulleted ingredients, numbered steps.
- `BatchInstructions` props: `yield: string`, `ingredients?: string[]`, `instructions?: string`. Renders `<h2>How to Batch It</h2>`, italic yield line, optional ingredients, and the instructions string when present. **Suppress the instructions block entirely when `instructions` is undefined or empty** — recipes like `spice-trade.md` end the batch section after the ingredient list with no closing prose, and the component must not emit an empty paragraph. **Instructions render as plain text** (per the 2026-05-27 P0 resolution in Open Questions): split on blank lines into separate `<p>` blocks, preserve line breaks within paragraphs (e.g., via `white-space: pre-wrap` or explicit `<br>` insertion at intra-paragraph newlines). No markdown processing — markdown syntax in the field renders literally. U8 documents this explicitly in TEMPLATE.md so future recipe authors know not to embed markdown in `batch.instructions`.
- No component-scoped styles needed — rely on the existing `.recipe-body :global(h2/li/p/em/strong)` cascade in `RecipeLayout.astro` (lines 189–236).

**Patterns to follow:**
- `src/components/RecipeCard.astro` — flat Astro component pulling typed props from frontmatter.
- `.recipe-body :global(…)` cascade in `RecipeLayout.astro` — inherits the styling rather than duplicating it.

**Test scenarios:**
- Test expectation: none — Astro components have no unit-test pattern in this repo. `astro check` (run as part of `npm run build`) gates compilation; visual verification covers correctness in U4.

**Verification:**
- `npm run build` succeeds with all four components present.
- `astro check` reports no type errors on the components or their use sites.

---

### U4. Wire components into `RecipeLayout.astro` with conditional rendering

**Goal:** Splice the four components into the recipe body slot in `src/layouts/RecipeLayout.astro`. Conditional render so pre-migration recipes (which have empty `ingredients[]` / `steps[]` and undefined `house_made` / `batch`) continue to render their body markdown via the residual `<slot />`.

**Requirements:** R3, R4

**Dependencies:** U1, U3

**Files:**
- Modify: `src/layouts/RecipeLayout.astro`

**Approach:**
- Replace the bare `<slot />` at line 81 with: structured component invocations guarded by `length > 0` / truthiness checks, then a residual `<slot />` for body prose (`## Notes` and any narrative-only sections).
- Order matches today's recipe conventions: Ingredients → House-Made → Steps → Batch → Notes (slot).
- Both the existing `<article data-pagefind-body>` wrapper (line 16) and the `.recipe-body` `<div>` (line 80) stay in place — Pagefind continues to index the rendered output, and the existing `:global(h2)` cascade continues to style the component headings.

**Patterns to follow:**
- Existing `<slot />` splice point (`RecipeLayout.astro` line 81).
- Existing conditional `{data.attribution.creator && …}` pattern in the same file (line 84) for truthy guards.

**Test scenarios:**
- Test expectation: none for the layout itself (visual verification only). Pagefind regression behavior is covered by U6's smoke check.

**Verification:**
- Dev server (`npm run dev`) renders at least one pre-migration recipe (e.g., `recipes/classics/penicillin.md` before U6) with body markdown intact via the slot — no broken sections, no empty H2s emitted by the new components.
- Dev server renders a recipe with the post-migration shape — for U4 verification before U6 runs, hand-edit one throwaway recipe to match the new frontmatter schema; once U6 lands, the verification target switches to actual migrated recipes — with all four structured sections in the right order, matching today's visual rhythm (uppercase eyebrows, serif ingredient bullets, numbered steps).
- `npm run build` succeeds.

---

### U5. Migration script `scripts/migrate-body-to-frontmatter.mjs`

**Goal:** One-time bulk-mutation script that walks all `recipes/**/*.md` files, parses the body markdown for known H2 sections, extracts them to frontmatter, and rewrites the file in place. Idempotent on re-run; `--dry-run` reports per-file diffs; atomic rollback on validation failure.

**Requirements:** R6

**Dependencies:** U1 (schema accepts new fields). U5 imports the `yaml` package directly for its own frontmatter parsing — it does not depend on U2 for read-side work. U5 *does* depend on the U7-flipped `lintBody` contract at execution time; see the `lintBody` dep-injection note below.

**Files:**
- Create: `scripts/migrate-body-to-frontmatter.mjs`
- Create: `scripts/migrate-body-to-frontmatter.test.mjs`

**Approach:**
- DI factory `makeDeps({ readFile, writeFile, glob, lintBody })` mirroring `promote.mjs`'s `makeDeps`. `lintBody` is dep-injected (rather than imported directly from `validate.mjs`) so the post-write rollback gate uses whichever contract is active at execution time — pre-flip in tests, post-flip in production once U7 lands.
- Top-level `migrate({ pattern, dryRun, deps })` function returns `{ migrated, skipped, errors }` summary; CLI entry parses flags via `parseArgs` and prints a per-file table at the end.
- Per-file flow:
  1. `readFile`. Parse frontmatter via `yaml.parse`.
  2. **Idempotency check:** if any of `ingredients`, `steps`, `house_made`, `batch` already exist in frontmatter with content, skip and report.
  3. Walk body markdown line-by-line, tracking the current H2 heading.
  4. Under `## Ingredients`: pull list items into `ingredients[]`. Detect `**Garnish:** X` / `**Float:** X` callouts (whether they're inside or outside the list block under the heading) and extract them to top-level `garnish` / `float`. Detect bare `- Salt rim` / `- Lime wedge` / `- … for garnish` list items and route them to `garnish` too (single-string join if multiple).
  5. Under `## Steps`: pull numbered-list items into `steps[]`. Preserve text verbatim (substitutions in parens/italics, vulgar fractions, en-dashes).
  6. Under `## House-Made <Name>`: capture `<Name>` from the heading. The yield line, when present, is an italic paragraph as the first child after the heading (recognized by leading `*` emphasis markers); when absent, the section opens directly with a list or paragraph. **Discriminator for the next blocks:** a bulleted list (`-` markers) immediately after the yield/heading is `house_made.ingredients[]` (optional); a numbered list (`1.`, `2.`) is `house_made.steps[]`; if no list follows, a prose paragraph is also `house_made.steps` with the paragraph captured verbatim as a single element. **Apply the rule that the first list under the section is `ingredients` only if it is bulleted** — if the first list is numbered, treat it as `steps` and leave `ingredients` undefined (the bacon-washed-bourbon shape).
  7. Under `## How to Batch It`: capture italic yield line, sub-list (optional), and remaining prose into `instructions` (block scalar).
  8. Preserve `## Notes` and any other unrecognized H2 in the body verbatim.
  9. Re-emit frontmatter via `yaml.stringify` (proper YAML — preserves vulgar fractions and en-dashes as-is since UTF-8) followed by the residual body.
  10. `writeFile`. Call the dep-injected `lintBody` (sourced from U7's flipped contract in production; tests can substitute a mock or the pre-flip implementation to verify rollback behavior). The rollback gate's correctness is tied to whichever contract is active at run time — see the U6/U7 coupling in Dependencies, which requires the flipped contract is in place when the migration runs on the real corpus.
  11. On any failure (parse error, lint error post-write): restore original content and report.
- `--dry-run`: print proposed changes per file (counts of ingredients, steps, presence of house_made/batch), do not write.
- Idempotent: re-running on already-migrated files is a no-op (step 2 short-circuits).

**Execution note:** Test-first. The fixture-based test suite is the migration spec; implementation lands once tests describe every recipe pattern from the research digest.

**Technical design:** *(directional)*

```
walk(recipes/) -> for each .md file:
  parse → idempotency check → walk body lines, switching state on H2:
    "Ingredients" → collect list, pluck **Garnish:**/**Float:** + standalone garnish lines
    "Steps" → collect numbered list
    "House-Made <X>" → state: { name: X, yield, ingredients?, steps }
    "How to Batch It" → state: { yield, ingredients?, instructions }
    "Notes" or unknown → keep in residual body
  → re-emit frontmatter + residual body
  → writeFile
  → validate; on failure, restore original
```

**Patterns to follow:**
- `scripts/promote.mjs` — DI factory, pre-flight + rollback shape, `parseArgs` for CLI flags, `execFile` not shell strings.
- `scripts/codegen-taxonomy.mjs` — `yaml` package usage.
- `scripts/migrate-styles-to-tags.mjs` — small bulk-rewrite precedent (but use proper YAML emit, not its hand-rolled approach).
- `scripts/promote.test.mjs` — DI mock pattern (`makeDeps` returning `{ exec, readFile, writeFile, calls }` for assertions).
- `scripts/validate.test.mjs` — inline multi-line strings as fixtures (no fixture files on disk).

**Test scenarios:**
- Happy path: recipe with `## Ingredients` (bulleted), `## Steps` (numbered), `## Notes` (prose) produces correct `ingredients[]`, `steps[]`, and body containing only `## Notes`.
- Happy path: recipe with `## House-Made Honey-Ginger Syrup` (variant heading) produces `house_made.name: "Honey-Ginger Syrup"` and pulls the sub-list into `house_made.ingredients[]`, numbered steps into `house_made.steps[]`.
- Edge case: recipe with `## House-Made Bacon-Washed Bourbon` (yield line → numbered list with no preceding bulleted sub-list) produces `house_made.ingredients: undefined`, `house_made.steps: [...]` non-empty. **Pins the bulleted-vs-numbered discriminator: numbered list immediately after yield = steps, not ingredients.**
- Edge case: recipe with `## House-Made Cinnamon Syrup` (`spice-trade.md` shape — no yield line, opens directly with the ingredient sub-list, then a single prose paragraph for the procedure) produces `house_made.yield: undefined`, `house_made.ingredients: [...]`, `house_made.steps: ['<the prose paragraph verbatim>']`. **Pins the no-yield-line case AND the prose-paragraph-as-steps fallback.**
- Edge case: recipe with `## How to Batch It` whose section ends after the ingredient list with no closing prose (`spice-trade.md` shape) produces `batch.instructions: undefined` (not empty string). Confirms the optional-instructions schema decision.
- Edge case: recipe with `## How to Batch It` containing prose paragraphs preserves the prose as `batch.instructions` block scalar (multi-line, blank lines between paragraphs preserved).
- Edge case: recipe with `**Garnish:** Luxardo cherry (or quality maraschino)` as a bold callout outside the ingredient list produces top-level `garnish: "Luxardo cherry (or quality maraschino)"`.
- Edge case: recipe with `**Float:** ¼ oz Laphroaig` produces top-level `float: "¼ oz Laphroaig"`.
- Edge case: recipe with garnish as inline list item (`- Salt rim`, `- Lime wedge`, `- Flamed orange peel, for garnish`) extracts it to top-level `garnish` and removes from `ingredients[]`.
- Edge case: recipe with vulgar fractions (½, ¾, 1½) and en-dashes (2–3, ~30 seconds) preserves them verbatim in the output (UTF-8 through `yaml.stringify`).
- Edge case: recipe with parenthetical / italic substitution (`2 oz tequila (or mezcal for a smokier variation)`, `1½ oz blanco tequila *(can sub rum)*`) preserves the text in the ingredient string verbatim.
- Edge case: recipe whose batch yield uses a non-numeric scale (`*My 6x batch from the card:*`) preserves the yield text verbatim.
- Edge case: recipe with `## Notes` containing italic / bold / hyperlinks survives unchanged in the residual body.
- Edge case: recipe with `## Notes` plus an unrecognized H2 (e.g., `## Variations`) preserves both in the residual body.
- Edge case: idempotency — running migration twice on the same file produces no diff on the second run; reported as `skipped`.
- Edge case: `--dry-run` returns proposed changes without writing; subsequent file read shows no mutation.
- Error path: file with malformed frontmatter (broken YAML) reports an error and does not write; original file untouched.
- Error path: file whose post-migration shape fails `lintBody` triggers atomic rollback; original content restored.
- Error path: rollback itself fails (e.g., write error during restore) surfaces a distinct "Validation failed AND rollback failed" error path with both contexts.
- Integration: DI mocks for `readFile` / `writeFile` verify per-file write sequence (read → write → optional restore).

**Verification:**
- `npm test` passes for the new test file.
- `node scripts/migrate-body-to-frontmatter.mjs --dry-run` against `recipes/classics/penicillin.md` shows the expected before/after structure in console output (manual sanity check).

---

### U6. Run the migration and verify rendering across the corpus

**Goal:** Execute the migration script (U5) across all 20 recipes in `recipes/{classics,originals,inbox}/`, then manually verify each rendered recipe page matches the pre-migration visual output. This is the gate moment where the corpus flips from body markdown to structured frontmatter.

**Requirements:** R1, R2, R3, R4

**Dependencies:** U1, U3, U4, U5, U7 (the linter flip must be in place when the migration runs on the real corpus — see the U5/U6/U7 coupling). U6 covers all 20 recipes including the 12 inbox drafts, so no pre-migration inbox recipes exist after U6 lands.

**Files:**
- Modify: all `recipes/**/*.md` (in-place mutation by the migration script — no manual edits in this unit; manual hand-edits in U6 are scope creep and should be folded back into U5 as additional test scenarios)

**Approach:**
- Run `node scripts/migrate-body-to-frontmatter.mjs --dry-run` first; spot-check the output for at least one recipe per category and one craft-prep, one batch, one float, one inline-garnish recipe.
- Run the migration for real.
- Run `npm run validate` — passes because U7 is a declared dependency: the linter flip is in place when this step runs, so the migrated body (just `## Notes`) is the expected shape, not an error.
- Run `npm run build`; visually verify every recipe page in the dev server matches the pre-migration appearance (compare side-by-side via a freshly-built `git stash`-then-`git stash pop` flow, or just verify the visual rhythm matches the layout's existing styling).
- Grep `dist/pagefind/` (or the Pagefind index files) for representative ingredient strings (`lime`, `mezcal`, `lavender`) to confirm Pagefind still indexes the moved content.

**Patterns to follow:**
- None — this is a one-shot execution + observation step.

**Test scenarios:**
- Test expectation: none — this is execution-time verification, not test code. Automated coverage lives in U5's test suite.

**Verification:**
- After migration: every `recipes/**/*.md` body contains at most `## Notes` (and possibly a residual unrecognized H2, which is fine).
- `npm run validate` passes (assuming U7 ships in the same change — see note above).
- `npm run build` succeeds.
- Visual verification: 3–5 representative recipe pages (a classic with a House-Made, an original with batch, an inbox draft, a recipe with float, a recipe with garnish) render identically to their pre-migration form in the dev server.
- Pagefind query parity: before migrating, run a search via the dev server (`/?search=lime`, etc.) for representative ingredient terms (`lime`, `mezcal`, `lavender`, `bourbon`) and record the recipe URLs returned. Post-migration, repeat the same searches against a freshly-built site. The result URL sets must match the pre-migration baseline (order may vary; presence must not).

---

### U7. Flip the body-structure linter rules in `scripts/validate.mjs`

**Goal:** Update the body linter so post-migration recipes pass (`## Ingredients` / `## Steps` / `## House-Made` / `## How to Batch It` headings in the body are now errors, and the structural checks move to introspecting frontmatter fields). Preserve the craft-prep warning (`mentionsHouseMadeWorthyPrep` predicate scans `data.ingredients[]` strings) and batch-format warning (checks `data.batch` field presence). Update `scripts/promote.mjs`'s pre-flight to match.

**Requirements:** R5

**Dependencies:** U2, U6 (the corpus must be migrated before the linter flips, or both ship coupled — recommend coupled)

**Files:**
- Modify: `scripts/validate.mjs`
- Modify: `scripts/validate.test.mjs`
- Modify: `scripts/promote.mjs` (line ~165 pre-flight)
- Modify: `scripts/promote.test.mjs` (any tests that exercise the lint pre-flight)

**Approach:**
- Replace the heading-existence checks (`validate.mjs` lines 137–144) with heading-non-existence checks: presence of `## Ingredients`, `## Steps`, `## House-Made <…>`, or `## How to Batch It` in the body is now an error (migration leftover).
- Replace the empty-list check (lines 146–160) with `data.ingredients.length === 0 && data.publish === true` → error.
- Update the craft-prep warning trigger: iterate `data.ingredients[]` (and optionally `data.batch.ingredients[]`) calling `mentionsHouseMadeWorthyPrep` on each string; if any match and `data.house_made` is undefined, warn. Preserve the existing `mentionsHouseMadeWorthyPrep` predicate and its `it.each` test table verbatim — the predicate itself doesn't change.
- Update the batch warning (lines 162–168): `data.format === 'batch' || data.format === 'punch'` + `data.batch === undefined` → warn.
- Update `scripts/promote.mjs:165` pre-flight: it currently calls `lintBody` against synthesized frontmatter on the in-memory promoted content. With the new contract, the pre-flight either reduces to "frontmatter has non-empty `ingredients[]` and `steps[]`" (covered by Zod) or keeps the lint call against the new shape.
- Refresh `scripts/validate.test.mjs` to cover the new rules; preserve all `mentionsHouseMadeWorthyPrep` tests (lines 261–286).

**Execution note:** Test-first. Add failing tests for the new linter rules before flipping the implementation. Existing tests will fail when the implementation flips — update them to match the new contract; do not delete coverage, transform it.

**Patterns to follow:**
- Existing `lintBody` signature and error/warning return shape in `validate.mjs`.
- Existing inline-string fixture pattern in `validate.test.mjs` (e.g., `CANONICAL_BODY` at lines 121–140).
- `mentionsHouseMadeWorthyPrep` predicate and test contract (preserved verbatim).

**Test scenarios:**
- Error path: recipe body containing `## Ingredients` heading → error (migration leftover).
- Error path: recipe body containing `## Steps` heading → error.
- Error path: recipe body containing `## House-Made Honey-Ginger Syrup` heading → error.
- Error path: recipe body containing `## How to Batch It` heading → error.
- Error path: recipe with `publish: true` and `ingredients: []` → error ("ingredients[] is empty on a published recipe").
- Happy path: recipe with `publish: false` (inbox draft) and `ingredients: []` → no error (drafts may be incomplete).
- Warning: recipe with `ingredients: ["1 oz honey-ginger syrup", …]` and no `house_made` field → warn.
- Warning suppressed: same recipe with `house_made: { name: "Honey-Ginger Syrup", … }` → no warning.
- Warning: recipe with `format: batch` and no `batch` field → warn.
- Warning suppressed: recipe with `format: batch` and `batch: { … }` → no warning.
- Happy path: post-migration recipe body containing only `## Notes` → no error, no warning.
- Happy path: post-migration recipe body containing `## Notes` + an unrecognized H2 (e.g., `## Variations`) → no error.
- Edge case: `mentionsHouseMadeWorthyPrep` predicate table preserved verbatim from today.
- Integration: `scripts/promote.mjs` pre-flight against a post-migration shape recipe still passes.
- Error path: hypothetical pre-migration shape recipe (still has `## Ingredients` / `## Steps` body sections) sent through `promote.mjs` pre-flight after U7 produces an error message that explicitly identifies the body-headings as migration leftovers, not as missing structured frontmatter. This is the failure mode if someone hand-authors a body-shape recipe after U7 lands; the error must be discoverable rather than cryptic.

**Verification:**
- `npm test` passes (updated validator tests + preserved predicate table + promote-script tests).
- `npm run validate` passes against the migrated recipe corpus (no errors, only intentional warnings if any).

---

### U8. Update `TEMPLATE.md` and `CLAUDE.md` to reflect the new contract

**Goal:** Document the post-migration contract so future contributions follow the structured-frontmatter shape, not the old body-headings shape.

**Requirements:** R7

**Dependencies:** U1 (frontmatter shape settled), U7 (linter rules settled)

**Files:**
- Modify: `TEMPLATE.md`
- Modify: `CLAUDE.md`

**Approach:**
- `TEMPLATE.md` lines 7–56: extend the example frontmatter block to include `ingredients[]`, `steps[]`, `garnish`, `float`, `house_made{}`, `batch{}`. Show one realistic example of each, including the optional yield string in `house_made` and `batch`.
- `TEMPLATE.md` lines 77–119 (body schema section): collapse to just `## Notes` + a one-sentence note: "Body is for narrative prose — `## Notes` and any narrative-only sections. Structured content (ingredients, steps, house-made preparations, batch instructions) lives in frontmatter and renders via the recipe layout."
- `TEMPLATE.md` lines 121–135 (migration history): add a one-line note about `scripts/migrate-body-to-frontmatter.mjs` and the date it ran.
- `TEMPLATE.md` example frontmatter: add an inline comment beside `batch.instructions` noting it is plain text — markdown syntax renders literally (per the 2026-05-27 P0 resolution).
- `TEMPLATE.md` lines 58–75 (taxonomy table): **do not touch** — codegen-managed between `<!-- taxonomy:start --> / <!-- taxonomy:end -->` markers.
- `CLAUDE.md` Recipe Pipeline §2: rewrite the body-contract paragraph from "the body has at minimum `## Ingredients` and `## Steps`" to "frontmatter has non-empty `ingredients[]` and `steps[]`". Update the canonical syrup detection paragraph to refer to `data.ingredients[]` scanning.
- `CLAUDE.md` Recipe Template Quick Reference (last section): update the inline minimal frontmatter sketch and body shape to match the new contract.
- Email Recipe Processing section: update Step 2 to write structured `ingredients` / `steps` to frontmatter, not body sections. Inferred field examples (`glass`, `method`, `ice`, `difficulty`, `spirits[]`) stay; structured-body fields are added.

**Patterns to follow:**
- Existing TEMPLATE.md structure (frontmatter block + body schema + migration history).
- Existing CLAUDE.md tone — declarative, references actual files, calls out load-bearing constraints.

**Test scenarios:**
- Test expectation: none — documentation changes. Verification by reading the diff and confirming the prose matches the new contract.

**Verification:**
- `TEMPLATE.md`'s example frontmatter and body sections match the actual shape of a migrated recipe (spot-check against `recipes/classics/penicillin.md` post-U6).
- `CLAUDE.md` Recipe Pipeline §2 no longer mentions `## Ingredients` / `## Steps` as body requirements.
- `CLAUDE.md` Email Recipe Processing instructions match the new frontmatter shape so future email-ingestion runs produce conformant recipes.

---

## System-Wide Impact

- **Interaction graph:** `scripts/validate.mjs` is the central recipe gate; its linter and frontmatter parser are called by (a) `npm run validate` (CI + local), (b) `scripts/promote.mjs` pre-flight, (c) `.husky/pre-commit` via `lint-staged` (the pre-commit hook from the just-shipped DX bundle). U2 and U7 affect all three call sites; the contract change must hold consistently across them.
- **Error propagation:** Migration script (U5) per-file failures are isolated — atomic rollback restores the file, other files continue. A whole-corpus dry-run before the real run surfaces shape issues across the corpus, not just per-file.
- **State lifecycle risks:** The migration is a one-time write; the only partial-write risk is the migration script itself dying mid-corpus. Per-file atomicity (write + rollback on lint failure) means at worst one file is in a half-migrated state, which `npm run validate` will catch immediately. No long-running coordination across files.
- **API surface parity:** The frontmatter `ingredients` field name does not collide with the existing `attribution`, `flavors`, `occasions`, etc. The reserved `preparations` field is dormant — leave it dormant so it remains available for a future use case distinct from `house_made`.
- **Integration coverage:** U6's visual verification (manual dev-server pass + Pagefind index grep) is the end-to-end gate. Component unit tests can't prove that Pagefind continues to index rendered output through the data-pagefind-body wrapper; only the build + index grep does.
- **Unchanged invariants:** `data/taxonomy.yaml` codegen pipeline, the `attribution` field shape, the `related[]` cross-ref behavior, the `aliases[]` field, the auto-release-pr workflow, the CHANGELOG bot, and the Pagefind config (no `data-pagefind-meta` use today) are all untouched by Stage A.

---

## Risks & Dependencies

| Risk | Mitigation |
|------|------------|
| Migration script loses content (e.g., a `## Notes` paragraph gets silently dropped). | Test-first U5 with inline-string fixtures covering each recognized H2 and at least one unrecognized H2 case (`## Variations`). Idempotency check requires that the residual body is a verbatim subset of the original body — a content-loss invariant. Manual spot-check in U6 across 3–5 representative recipes before declaring done. |
| The `**Garnish:**` / `**Float:**` / inline-garnish extraction misclassifies a real ingredient. | Inline-fixture tests enumerate the corpus's patterns (research found ~10 distinct shapes); migration runs with `--dry-run` first so misclassifications surface as diffs before the real write. |
| `yaml.stringify` output is too aggressive on quoting (e.g., wraps `2 oz tequila` in quotes for "looks like a number"). | Use `yaml.stringify` with sensible defaults; validate output against `yaml.parse` round-trip equality in a test. Vulgar fractions and en-dashes are UTF-8 so they pass through unquoted; numbers leading ingredient strings should also pass through unquoted (the line starts with `2 oz`, not just `2`). |
| Pagefind silently stops indexing ingredient text because the rendered HTML structure changed. | U6 verification uses Pagefind's UI search (or its programmatic API in the built `dist/pagefind/pagefind.js`) to query representative ingredient terms (`lime`, `mezcal`, `lavender`, `bourbon`) before and after migration; the post-migration result set MUST contain the same recipe URLs as the pre-migration baseline. Byte-grep against the binary `.pf_fragment` index files is not used — chunk/compression boundaries make raw byte counts an unreliable proxy for search behavior. |
| Stage A schema decisions (single-string `ingredients[]`, single `house_made` object, top-level `garnish` / `float`, block-scalar `batch.instructions`) ship before Stage B's downstream consumer reveals the shape that consumer needs. The corpus migrates to today's shape; Stage B may require a second migration once the structured-amount fields land. | Accept the lock-in explicitly: the Stage A shape is sized to today's corpus and the renderer-component cleanup, not to any reasoned Stage B consumer. Plan for a second migration when Stage B begins — additive changes (`ingredients[].ref`, `amount`, `unit`) can layer on top, but if Stage B's consumer requires a structurally different shape (e.g., `ingredients` becomes an object array), every recipe migrates a second time. Budget the re-migration cost into Stage B's eventual plan rather than designing speculatively now. |
| `yaml.stringify` re-emits the full frontmatter on every migrated file, collapsing the blank-line groupings (Categorization / drink / Format / Filterable taxonomy / Attribution / Cross-linking / Reserved) that recipes use today and potentially rewriting quoting on individual scalars. | The migration PR will contain a large cosmetic reformatting diff on every recipe alongside the substantive new-field additions. Accept the noise (cheap option) or, if review fatigue becomes real, follow up with a "preserve block grouping" pass that uses a more surgical YAML edit strategy. Recommend acceptance for the first migration — the substantive diff is the load-bearing change. |
| `parseFrontmatter` upgrade breaks an unanticipated downstream caller. | U2 keeps the public signature identical (still returns the parsed frontmatter object). All existing `validate.test.mjs` tests pass before and after. The `promote.mjs` caller is the only other consumer; spot-test it against a real recipe after U2. |
| U6 (migration run) ships separately from U7 (linter flip), creating a brief window where `npm run validate` fails on the migrated corpus. | Ship U6 and U7 in the same change. Plan-level recommendation: bundle U6 + U7 so the corpus and linter flip atomically. ce-work can decide the exact PR shape. |
| Component file layout (`src/components/recipe/` subdirectory vs flat) is bikeshed. | Deferred to implementation — pick whichever the user prefers when there are 4 new components. Doesn't affect correctness. |

---

## Documentation / Operational Notes

- **TEMPLATE.md update (U8) is load-bearing for future email-to-recipe ingestion.** The Email Recipe Processing section of `CLAUDE.md` instructs the assistant to "Normalize into the `TEMPLATE.md` format". If TEMPLATE.md is updated correctly in U8, future email-to-recipe runs will produce conformant frontmatter automatically.
- **No CI workflow changes needed.** `.github/workflows/test.yml` runs `npm test` (covers U2, U5, U7); `.github/workflows/deploy.yml` runs `npm run validate` then `npm run build` (covers U1, U3, U4 via `astro check` and the new lint rules from U7).
- **No CHANGELOG bot changes needed.** The change ships as one or more PRs through the staging → main release flow; the auto-release-pr bot picks up commit messages as usual.
- **Post-ship learning capture.** Once Stage A lands, run `/ce-compound` to capture (a) the migration script's idempotency story, (b) any Astro 6 component-composition gotchas surfaced during U3/U4, and (c) the Pagefind behavior under the new structured-content shape — this is the repo's first body-to-frontmatter migration and the patterns established become the reference for any future structured-content migrations.

---

## Sources & References

- **Issue:** [#23 — Component primitives + ingredient ontology (Stage A: components, Stage B: ingredients collection)](https://github.com/dancj/home-bartender/issues/23)
- **Source ideation:** `docs/ideation/2026-05-23-site-and-pipeline-ideation.md` (idea #6)
- **Related shipped work:**
  - PR #20 (body-structure linter — the gate Stage A inverts): `docs/plans/2026-05-25-002-feat-body-structure-linter-plan.md`
  - PR #39 (DX hardening bundle — pre-commit hook that calls `scripts/validate.mjs --files`): `docs/plans/2026-05-26-001-feat-dx-hardening-bundle-plan.md`
  - Canonical taxonomy registry (the codegen pattern that won't expand for Stage A but will for Stage B): `docs/plans/2026-05-23-003-feat-canonical-taxonomy-registry-plan.md`
- **Deferred follow-up:** Stage B (`ingredients/` content collection) — not filed as a separate issue yet; reopen #23 or file a new one when the first downstream surface request arrives.
- **Key code:**
  - `src/content.config.ts` — schema extension point (U1)
  - `src/layouts/RecipeLayout.astro` — splice point at line 81 (U4)
  - `scripts/validate.mjs` — parser upgrade (U2) and linter flip (U7)
  - `scripts/promote.mjs` — gold-standard migration script pattern (referenced by U5)
  - `TEMPLATE.md`, `CLAUDE.md` — contract documentation (U8)

---

## Deferred / Open Questions

### From 2026-05-27 review

- **Stage A premise — no current downstream consumer; single-string `ingredients[]` is grep-equivalent to body markdown** — Problem Frame (P0, product-lens + adversarial, confidence 100)

  **Resolved 2026-05-27:** Proceed with full Stage A as planned. The user explicitly accepts that Stage A's deliverable is "renderer cleanup + Stage B path-clearing" rather than a user-facing capability, and accepts the PR #20 contract reversal as the cost of the architectural direction. The ideation's "risk of over-engineering" caveat is acknowledged and explicitly absorbed. The premise concern stays in the record so future readers see it was examined, not missed.

  Stage A delivers no user-facing capability on its own — R3 and R4 promise rendering and search parity, i.e., zero visible change for readers. The downstream-surface motivation (shopping lists, pantry filters, ingredient-pivot pages) is gated on Stage B, and Stage B is explicitly deferred until a real consumer surfaces. Meanwhile the chosen Stage A shape (`ingredients: string[]`) admits no more structured queries than `grep` over body markdown. For a 20-recipe solo personal corpus, options the user should weigh before committing to U1+: (a) re-scope Stage A to a smaller change (just `garnish` / `float` as top-level fields — the patterns already structured-ish via `**Garnish:**` callouts), (b) defer Stage A entirely until the first downstream surface emerges and design the schema with that consumer in hand, or (c) proceed as planned and accept the value is "architectural readiness for Stage B" rather than user-facing. The ideation flagged this as the lowest-confidence (65%) highest-cost survivor; the plan should not paper over that.

  <!-- dedup-key: section="problem frame" title="stage a premise no current downstream consumer singlestring ingredients is grepequivalent to body markdown" evidence="Today every recipe re-invents its ingredient and step layout in prose markdown. That works for rendering but" -->

- **`batch.instructions` render method — pick (a) `marked`/`markdown-it` dep + render at runtime, (b) convert markdown to HTML at migration time, or (c) drop markdown support** — U3 (P0, design-lens + feasibility, confidence 100)

  **Resolved 2026-05-27:** Option (c) — plain text. `BatchInstructions.astro` renders `batch.instructions` as plain text inside one or more `<p>` blocks (split on blank lines, preserve line breaks within paragraphs). No new dep. TEMPLATE.md and CLAUDE.md (U8) must document explicitly that `batch.instructions` is plain text and markdown syntax in the field will render literally. If a future recipe needs rich text in batch instructions, revisit additively.

  Astro 6 has no exported component-level helper that takes a markdown string and returns rendered HTML — the content-collection `render()` operates on collection entries, not arbitrary frontmatter strings. `set:html` does not process markdown; it renders raw HTML. The migration script stores raw markdown strings (U5 step 7 says "migrate verbatim"). An implementer who picks `set:html` will render asterisks literally; an implementer who picks markdown-at-runtime adds a new dep. The three real options are (a) add `marked` / `markdown-it` and render at runtime inside `BatchInstructions.astro`, (b) convert markdown to HTML during U5 migration and store HTML in `batch.instructions` (lossy if the field is ever hand-edited), or (c) treat `batch.instructions` as plain text and document that markdown is not supported there. Picking among these is an architectural decision (potential new dep), not implementation detail. Recommendation: (c) plain text is the simplest, and batch instructions in the current corpus are short prose without embedded links or emphasis — markdown processing is speculative.

  <!-- dedup-key: section="u3" title="batchinstructions render method pick marked markdownit dep render at runtime convert markdown to html at migration time or drop markdown support" evidence="render via Astro's built-in markdown rendering or a lightweight inline parser so links/emphasis survive" -->

- **Authoring-cost analysis — does YAML-as-recipe-shape make hand-authoring and LLM email-ingestion easier or harder than today's markdown body?** — Strategic consequences (P1, product-lens, confidence 75)

  For a solo project the owner is the primary user. Post-migration recipes carry ~50 lines of nested YAML (`ingredients[]`, `steps[]`, `house_made{}`, `batch{}`) where today's frontmatter is ~20 lines + a readable markdown body. Three things worth examining before committing: (a) hand-authoring a new recipe — is the YAML shape ergonomic, or does it slow the inbox-draft flow?, (b) LLM email-ingestion (CLAUDE.md's Email Recipe Processing) — does producing nested YAML stay reliable, or does the LLM regress on the more-structured shape?, (c) common edits (typo fixes, ingredient swaps, step rewording) — easier or harder under the new shape? The plan should add a brief Authoring Impact subsection capturing the owner's lived-experience answer before Stage A commits the corpus to the new shape.

  <!-- dedup-key: section="strategic consequences" title="authoringcost analysis does yamlasrecipeshape make handauthoring and llm emailingestion easier or harder than todays markdown body" evidence="The post-migration shape (plan lines 120-179) shows the Penicillin recipe with frontmatter that now contains" -->

- **Garnish duplication in rendered output — Steps text that names the garnish (`Manhattan` step 4 "Garnish with a cherry", `oaxaca-old-fashioned` step 5 flaming-peel technique) will appear alongside the extracted `garnish` field; choose suppression vs acceptance** — U3 / U5 (P2, design-lens + adversarial, confidence 100)

  Several recipes have a step that references the garnish by name. After extracting `**Garnish:** Luxardo cherry` (or `- Flamed orange peel, for garnish`) to top-level `garnish`, the Ingredients component renders it as a bold callout below the list, and the Steps component still renders the step verbatim — so the garnish appears in both places. Options: (a) the migration script detects "Garnish with X" steps that mention the extracted garnish and elides them (lossy — `oaxaca-old-fashioned` step 5 has 6 lines of flaming technique that should NOT be dropped), (b) accept the duplication and rely on visual review to spot recipes where it reads awkwardly, (c) the Ingredients component suppresses the garnish callout when the last step text-matches the garnish (heuristic, fragile). Recommend (b) for the first migration pass, with a Risks acknowledgment that some recipes will read with the garnish named twice; revisit if visual review shows it's worse than tolerable.

  <!-- dedup-key: section="u3  u5" title="garnish duplication in rendered output steps text that names the garnish manhattan step 4 garnish with a cherry oaxacaoldfashioned step 5" evidence="manhattan.md Step 4: 'Garnish with a cherry' — step references the garnish already captured in" -->

- **U6 as a peer Implementation Unit vs folded into U5 Verification** — U6 (P2, scope-guardian, confidence 75)

  U6 produces no code, no tests, no new files — it's "run the script, eyeball, query Pagefind." Other implementation units (U1, U2, U3, U4, U5, U7, U8) each produce at least one code or config artifact. Treating U6 as a peer unit inflates the apparent scope (8 units vs 7) and obscures that U6's content is really U5's acceptance criteria. Options: (a) rename U6 to "Acceptance Run" and explicitly mark it as a non-code-producing unit kept for visibility, (b) fold U6's content into U5's Verification section and drop U6 entirely, renumbering U7→U6 / U8→U7, (c) leave as-is (the unit count is not a correctness concern, and U6's visibility-as-a-distinct-step is itself a value). Structural preference call — not a correctness issue.

  <!-- dedup-key: section="u6" title="u6 as a peer implementation unit vs folded into u5 verification" evidence="U6 Files: 'Modify: all recipes/**/*.md (in-place mutation by the migration script — no manual edits in this unit)'" -->

- **`float` field for one recipe — separate top-level field vs folded into `garnish` vs left as a freeform ingredient line** — U1 (P2, scope-guardian, confidence 75)

  `**Float:**` appears in exactly one recipe today (`penicillin.md`); `**Garnish:**` appears in ~4 (cosmopolitan, chocolate-old-fashioned, sea-legs, manhattan). The plan's Key Technical Decisions cites "~30% of recipes today use **Garnish:** … and **Float:** …" — that figure conflates the two; float is ~5%. Modeling `float` as a separate top-level field for one recipe adds a permanent schema field, a `Ingredients` component prop, a U5 extraction path, a U7 lint check, and a test scenario. Options: (a) keep as planned (`float: string` top-level), (b) fold `float` into `garnish` semantically (a float is a decorative top-of-drink garnish), (c) leave penicillin's float as a regular ingredient string and skip the structured field. The renderer can still style "float" distinctly under (b) by string-pattern matching, but that's a hack. Schema-shape judgment call worth the user's input before U1 commits the field.

  <!-- dedup-key: section="u1" title="float field for one recipe separate toplevel field vs folded into garnish vs left as a freeform ingredient line" evidence="grep -rl '**Float:' recipes/ → /recipes/classics/penicillin.md (1 file only)" -->
