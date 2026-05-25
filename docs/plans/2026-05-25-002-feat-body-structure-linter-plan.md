---
title: "feat: Add body-structure linter (markdownlint + custom rules) for recipes"
status: active
plan_type: feat
plan_depth: standard
created: 2026-05-25
issue: 19
origin: https://github.com/dancj/home-bartender/issues/19
---

# feat: Add body-structure linter for recipes

## Summary

Extend `scripts/validate.mjs` with a hand-rolled body-structure linter that enforces CLAUDE.md Recipe Pipeline §2's body contract. Hard rules (errors, fail `npm run validate` exit code) for any recipe with `publish: true`: a `## Ingredients` heading must exist, a `## Steps` heading must exist, and the `## Ingredients` section must parse as a non-empty markdown list. Soft rules (warnings, non-fatal) catch missing prep sections: ingredient lines that mention `shrub`, `tincture`, `cordial`, `infusion`, `*-washed`, or `[adjective] syrup` (excluding bare `simple syrup` / `maple syrup`) require a `## House-Made …` section; `format: batch` or `format: punch` recipes require `## How to Batch It`. Also adds a pre-flight body-lint inside `scripts/promote.mjs` so inbox→publish transitions surface body failures before the `git mv`, not after.

Closes [#19](https://github.com/dancj/home-bartender/issues/19). Origin: `docs/ideation/2026-05-23-site-and-pipeline-ideation.md` (idea #5).

---

## Problem Frame

`scripts/validate.mjs` and the Zod schema in `src/content.config.ts` validate recipe **frontmatter** — taxonomy enums, cross-refs, slug uniqueness, dir/category match — but never look at the recipe **body**.

CLAUDE.md → Recipe Pipeline §2 already declares the contract:

> verify the body has at minimum `## Ingredients` and `## Steps` (plus `## House-Made …`, `## How to Batch It`, `## Notes` where relevant)

…but nothing automated enforces it. A recipe could ship today with empty ingredients, no steps, or a missing `## House-Made` section for a syrup it references, and every gate would still pass. Body-structure issues are the most likely silent-bad-content failure mode and the cheapest to catch in CI.

**Corpus baseline** (from research): all 20 recipes in the tree pass the proposed hard rules today (every recipe has `## Ingredients` and `## Steps`, every Ingredients section is a non-empty `-` list with uniform heading case). No corpus fix-up is required for hard-rule activation. The single soft-rule violator that survives trigger refinement is `recipes/originals/prosecco-mojito.md` (mentions bare `simple syrup` — store-bought, correctly excluded by the refined trigger; would NOT warn).

## Goals

- Enforce `## Ingredients` and `## Steps` headings as hard rules on `publish: true` recipes.
- Enforce non-empty `## Ingredients` list as a hard rule.
- Surface missing `## House-Made …` and `## How to Batch It` sections as soft warnings when triggers fire.
- Wire the body linter into `npm run validate` so it gates locally and in CI without a new workflow.
- Add a pre-flight body lint inside `scripts/promote.mjs` so inbox→publish promotion surfaces body failures before mutating the working tree.

## Non-Goals

- Linting `sections/` prose pages — body contract there is much looser (per issue #19).
- Replacing freeform ingredient strings with structured data — covered separately by the ingredient-ontology track.
- Enforcing section ordering — every recipe already follows the canonical order and ordering isn't called out in `TEMPLATE.md` as a rule.
- Adding `method: batched` to the taxonomy — out of scope. See Scope Boundaries → Deferred to Follow-Up Work.
- Replacing the existing hand-rolled frontmatter parser with a YAML library.

---

## Key Technical Decisions

### KTD-1: Hand-rolled line-based body parser, no external dependency

Implement body parsing as a small line-scan helper (~50 lines) following the shape of `parseFrontmatter` at `scripts/validate.mjs:41-72`. Do not introduce `unified`, `remark`, `marked`, or `markdown-it`.

**Why.** The repo has zero markdown-parsing dependencies today; the existing frontmatter parser is hand-rolled and line-based as a deliberate house style. The body rules here are limited (heading-presence, list-presence-between-headings, regex matches against ingredient lines) and don't justify pulling in a markdown AST library plus its sub-dependencies. Matches the `parseFrontmatter` precedent and stays consistent with the rest of `scripts/`.

### KTD-2: Inline `lintBody` in `scripts/validate.mjs`

Add `lintBody(body, frontmatter)` as an exported function in `scripts/validate.mjs` alongside the existing `parseFrontmatter` and `parseScalar` exports, rather than creating a sibling `scripts/lint-body.mjs`.

**Why.** Mirrors the existing one-file-per-concern style and the `scripts/promote.mjs` import precedent — `promote.mjs:20` already imports `CATEGORY_BY_DIR` from `./validate.mjs`. The body linter is conceptually part of recipe validation; splitting it out would create a fragmented import surface for marginal gain. If the linter grows substantially later (e.g., adds a markdown AST), a refactor split is cheap.

### KTD-3: House-Made trigger excludes store-bought tokens

The soft rule fires when an ingredient line contains any of: `shrub`, `tincture`, `cordial`, `infusion`, a `*-washed` form (e.g., `bacon-washed`, `fat-washed`), OR the word `syrup` preceded by a non-store-bought modifier. Bare `simple syrup` and `maple syrup` do NOT trigger the rule.

**Why.** Research scanned all published recipes. Five mention syrup; four have a House-Made section (`honey-ginger syrup`, `cinnamon syrup`, `mango habanero syrup`, `lavender honey syrup` — all custom). The fifth uses bare `simple syrup` (store-bought; correctly excluded). Triggering the rule on every occurrence of "syrup" would generate noise on `prosecco-mojito.md` immediately and on multiple inbox drafts after promotion. Excluding `simple` / `maple` keeps the rule signal-positive on day one.

### KTD-4: Batch rule scoped to `format: batch | punch`

The soft rule fires when frontmatter `format` is `batch` or `punch`. Do NOT add `method: batched` to the taxonomy as part of this PR.

**Why.** Research confirmed `method: batched` is not a valid enum value in `data/taxonomy.yaml`, and `batch_size` is not a schema field. `format: batch` and `format: punch` already exist as valid enum values. No recipe currently uses either, so the rule is dormant but correctly shaped — it will fire the first time a batch-format recipe lands. Adding a taxonomy value plus running codegen plus committing generated artifacts is a separate change; bundling it here muddles the PR and re-litigates schema decisions.

### KTD-5: Hard rules fatal (exit 1), soft rules non-fatal

Hard rules push to `errors`, soft rules push to `warnings`. The existing `scripts/validate.mjs:129-132` pattern (`for (const w of warnings) console.warn('WARN: ...'); for (const e of errors) console.error('ERROR: ...'); if (errors.length) process.exit(1);`) handles both channels unchanged.

**Why.** This is the established convention in `scripts/validate.mjs`. Hard rules describe the publishable-recipe contract that must hold for the site to render correctly; soft rules describe optional craft conventions that authors might intentionally violate (e.g., a future recipe that references a syrup the author doesn't want to homebrew). Two channels, one exit-code rule, no new infrastructure.

### KTD-6: Pre-flight body lint in `scripts/promote.mjs`

Before the `git mv`, `promote()` reads the inbox file, computes the rewritten frontmatter, and calls `lintBody(body, { ...rewrittenFm, publish: true })`. If body errors surface, throw before mutating the working tree.

**Why.** Adding body rules to `validate` introduces a transition asymmetry: a recipe with `publish: false` skips body rules (correctly — drafts may be incomplete), then `npm run promote` flips `publish: true` and runs `npm run validate`. Without pre-flight, body failures only surface after the file is written and `git mv`'d; the existing atomic rollback handles correctness but the UX is "we mutated then reverted" rather than "we refused to start." Pre-flight is one import + one call inside the existing pure phase of `promote()` (before any side effects), aligns with the existing `assertValidCategory` placement, and keeps the rollback path reserved for genuine post-mutation failures (e.g., slug collisions caught by the validator).

---

## High-Level Technical Design

The body-lint flow, expressed as directional pseudo-code (illustrates intended approach; not implementation specification):

```
lintBody(body, frontmatter) -> { errors: string[], warnings: string[] }:
  if frontmatter.publish !== true:
    return { errors: [], warnings: [] }       # inbox drafts skip

  headings = scan(body) for /^##\s+(.+)$/    # H2 only; no fenced-code escaping needed (corpus has none)
  ingredientLines = lines under "## Ingredients" until next H2-or-EOF

  # Hard rules
  if "Ingredients" not in headings:
    errors.push("missing required heading: ## Ingredients")
  if "Steps" not in headings:
    errors.push("missing required heading: ## Steps")
  if "Ingredients" in headings and ingredientLines.filter(isListItem).isEmpty:
    errors.push("## Ingredients section is empty or has no list items")

  # Soft rules
  if any(ingredientLines, mentionsHouseMadeWorthyPrep):
    if no heading starts with "House-Made":
      warnings.push("ingredient line references a House-Made-worthy prep but no ## House-Made … section found")

  if frontmatter.format in {"batch", "punch"}:
    if "How to Batch It" not in headings:
      warnings.push("format is batch/punch but no ## How to Batch It section found")

  return { errors, warnings }

mentionsHouseMadeWorthyPrep(line):
  return /\b(shrub|tincture|cordial|infusion)\b/.test(line)
      || /\b\w+-washed\b/.test(line)
      || (/\bsyrup\b/.test(line) && !/\b(simple|maple)\s+syrup\b/.test(line))
```

Wiring into `scripts/validate.mjs` `main()` (per-file loop, after frontmatter checks at line 113):

```
for each recipe file:
  fm = parseFrontmatter(raw)
  # ... existing frontmatter checks ...
  if fm.publish === true:
    body = raw.slice(after closing --- fence)
    { errors: be, warnings: bw } = lintBody(body, fm)
    for e in be: errors.push(`${rel}: ${e}`)
    for w in bw: warnings.push(`${rel}: ${w}`)
```

Pre-flight inside `scripts/promote.mjs` (before the existing `writeFile`/`git mv` block):

```
# After rewritePromotionFrontmatter, before any side effects
newFm = { ...originalFm, category, publish: true }
body = newContent.slice(after closing --- fence)
{ errors } = lintBody(body, newFm)
if errors.length: throw new Error("Body validation failed; cannot promote: ...")
```

---

## Implementation Units

### U1. Pure `lintBody` helper with hard rules + tests

**Goal:** Add the body parser and hard-rule checks as pure exported functions. Test with string fixtures, no filesystem.

**Requirements:** Supports KTD-1, KTD-2, KTD-5. Closes the hard-rule portion of issue #19.

**Dependencies:** None.

**Files:**
- `scripts/validate.mjs` — append `lintBody(body, frontmatter)` and any small helpers (e.g., `extractH2Headings(body)`, `linesBetween(body, startHeading, untilNextH2)`) as exported functions.
- `scripts/validate.test.mjs` — extend with `describe('lintBody — hard rules', ...)` blocks.

**Approach:** Line-scan over the body string. `extractH2Headings(body)` returns an array of heading title strings (everything after `## `). Use it to detect presence of `Ingredients`, `Steps`. `linesBetween(body, 'Ingredients')` returns lines under the Ingredients heading until the next H2 or EOF. Filter those for list items (`/^\s*-\s+\S/`). When `frontmatter.publish !== true`, return `{ errors: [], warnings: [] }` immediately. Exact heading text match is case-sensitive (`## Ingredients` not `## ingredients`) — the corpus is uniform on case.

**Execution note:** Test-first per CLAUDE.md TDD discipline (lines 31–46). Write each rule's failing test before implementation.

**Patterns to follow:**
- `scripts/validate.mjs:41-72` — `parseFrontmatter` line-scan style.
- `scripts/validate.test.mjs` — pure-function test style with `[...].join('\n')` string fixtures.

**Test scenarios:**
- **Happy path** — a canonical published recipe (Ingredients heading + non-empty `-` list + Steps heading) returns `{ errors: [], warnings: [] }`.
- **Inbox skip** — same body with `frontmatter.publish === false` returns `{ errors: [], warnings: [] }` regardless of body shape.
- **Missing `## Ingredients`** — body has only `## Steps` → returns `errors: ['missing required heading: ## Ingredients']`.
- **Missing `## Steps`** — body has only `## Ingredients` with valid list → returns `errors: ['missing required heading: ## Steps']`.
- **Empty `## Ingredients` section** — heading present, but only blank lines until next H2 → returns one error.
- **Non-list `## Ingredients` section** — heading present, body is prose paragraphs with no `-` items → returns one error.
- **`## Ingredients` followed by a bold callout but no list** — e.g., `## Ingredients\n\n**Garnish:** lime\n\n## Steps` → returns one error (no list items between Ingredients and Steps).
- **`## Ingredients` followed by list AND a bold callout** — canonical case with `**Garnish:**` after the list (matches `recipes/classics/penicillin.md:43` pattern). The list-items check passes; no error.
- **`*` bullets** — body uses `*` instead of `-`. Acceptance depends on parser: spec the parser to accept `-` only (corpus is uniform) and the test asserts this scoping decision.
- **Multiple errors at once** — recipe missing both `## Ingredients` and `## Steps` returns two errors, both messages present.
- **Frontmatter object shape** — `lintBody(body, { publish: true, format: 'single' })` runs hard rules; `lintBody(body, { publish: undefined })` is treated as non-published (no rules run).

**Verification:** `npm test` passes; new `lintBody` test cases appear in the Vitest summary.

---

### U2. Soft rules added to `lintBody` + tests

**Goal:** Add the House-Made and batch-format warnings. Same pure function, additional rule branches.

**Requirements:** Supports KTD-3, KTD-4, KTD-5. Closes the soft-rule portion of issue #19.

**Dependencies:** U1.

**Files:**
- `scripts/validate.mjs` — extend `lintBody` with the two warning branches and the `mentionsHouseMadeWorthyPrep(line)` helper.
- `scripts/validate.test.mjs` — extend with `describe('lintBody — soft rules', ...)` blocks.

**Approach:** Refer to the High-Level Technical Design pseudo-code for `mentionsHouseMadeWorthyPrep`. Iterate the ingredient lines (already extracted in U1's `linesBetween`); if any line matches the predicate AND no heading starts with `House-Made`, push the warning. For the batch rule: read `frontmatter.format`; if it's `batch` or `punch` AND no heading is exactly `How to Batch It`, push the warning. House-Made heading detection is `/^House-Made\s+\S/` (after the `## ` prefix is stripped by `extractH2Headings`).

**Execution note:** Test-first. Test the trigger predicate (`mentionsHouseMadeWorthyPrep`) directly with table-driven cases, plus integration through `lintBody`.

**Patterns to follow:** Same as U1.

**Test scenarios:**
- **House-Made trigger positives** — ingredient lines containing each of: `honey-ginger syrup`, `cinnamon syrup`, `mango habanero syrup`, `lavender honey syrup`, `bacon-washed bourbon`, `fat-washed rye`, `apple shrub`, `cherry cordial`, `orange tincture`, `lavender infusion` → each trigger the rule (and absence of `## House-Made` heading → warning).
- **House-Made trigger negatives (store-bought)** — `simple syrup`, `maple syrup`, `½ oz simple syrup`, `1 bar spoon maple syrup` → do NOT trigger the rule even with no House-Made heading.
- **House-Made positive but heading present** — `honey-ginger syrup` ingredient line PLUS `## House-Made Honey-Ginger Syrup` heading → no warning (matches `recipes/classics/penicillin.md`).
- **House-Made trigger fires but only `## House-Made …` heading variant present** — heading is `## House-Made Bacon-Washed Bourbon` and the rule fires for a syrup mention — single heading satisfies the existence check, no warning. (Existing rule scope is "any House-Made heading"; cross-validation that the heading matches the specific ingredient is out of scope.)
- **Batch trigger — format: batch, no `## How to Batch It`** → returns one warning.
- **Batch trigger — format: punch, no `## How to Batch It`** → returns one warning.
- **Batch trigger — format: single** → no warning regardless of `## How to Batch It` presence.
- **Batch trigger — format: batch AND `## How to Batch It` present** → no warning.
- **Both soft rules silent on the canonical happy-path corpus recipe** — fixture mirrors `recipes/classics/paloma.md` body shape; `lintBody` returns empty arrays.
- **Inbox skip** — soft rules also skip when `publish !== true`.

**Verification:** `npm test` passes; soft-rule tests cover both predicate positives and the integration cases above.

---

### U3. Wire `lintBody` into `scripts/validate.mjs` main loop

**Goal:** Have `npm run validate` actually run the body linter on every published recipe.

**Requirements:** Supports KTD-2, KTD-5.

**Dependencies:** U2.

**Files:**
- `scripts/validate.mjs` — add the integration call inside the per-file loop, after the existing frontmatter checks (around line 113, before the second cross-file pass).

**Approach:** For each file in the first pass: after the existing frontmatter checks, slice the body from the raw content (everything after the closing `\n---\n` fence — the index is already computed inside `parseFrontmatter`; the integration can recompute it cheaply or `parseFrontmatter` can be extended to also return the body offset, whichever keeps the diff smaller). Pass the body and parsed frontmatter to `lintBody`; prefix each returned error/warning with the relative path and push into the existing `errors` / `warnings` arrays. The exit-code logic at line 132 is unchanged.

**Patterns to follow:**
- `scripts/validate.mjs:86-132` — existing main-loop structure, error-aggregation pattern.
- `scripts/migrate-styles-to-tags.mjs:63-83` — alternative body-offset computation pattern (slice from the closing fence) if `parseFrontmatter` should stay unchanged.

**Test scenarios:**
- **Run `npm run validate` against the current corpus** — should report zero new errors and zero new warnings (verified manually post-implementation; the corpus baseline survey is in research notes).
- The pure `lintBody` tests already cover the rule logic; the integration test surface here is mostly "wired and runs without crashing on real files."
- Add one Vitest case that exercises the body-offset computation path (e.g., `lintBodyFromRawFile(raw)` if a helper is extracted), or rely on the existing `parseFrontmatter` test coverage plus the manual `npm run validate` smoke.

**Verification:** `npm run validate` exits 0 on the current corpus. Hand-mutate one inbox file (set `publish: true` and delete `## Steps`) and confirm `npm run validate` exits 1 with a clear error. Revert.

---

### U4. Pre-flight body lint inside `scripts/promote.mjs`

**Goal:** Surface body-rule failures before `promote()` mutates the working tree.

**Requirements:** Supports KTD-6. Closes the inbox→publish transition asymmetry introduced by U3.

**Dependencies:** U3 (the linter must be live in `validate.mjs` and importable).

**Files:**
- `scripts/promote.mjs` — extend the existing pure phase with a `lintBody` call against the rewritten content. Add the `lintBody` import next to the existing `CATEGORY_BY_DIR` import at line 20.
- `scripts/promote.test.mjs` — extend the existing `describe('promote — error paths', ...)` block.

**Approach:** After `rewritePromotionFrontmatter` produces `newContent` (existing flow at `scripts/promote.mjs` orchestrator), slice its body, synthesize the post-promotion frontmatter as `{ ...parsedOriginalFm, category, publish: true }`, and call `lintBody`. If `errors.length > 0`, throw a clear error message that includes the rule violations and the slug — before the existing `writeFile` / `git mv` calls. Warnings can be surfaced as `console.warn` lines but should not block promotion (matches the validator's soft-rule convention).

The existing collision check, `writeFile`, `git mv`, and validation-failure rollback paths are unchanged. The new pre-flight runs entirely in the existing pure phase before any side effects, so failure is naturally clean.

**Execution note:** Test-first. Write a failing test that promotes a recipe with a deliberately broken body (e.g., remove `## Steps`); assert the orchestrator throws before `writeFile` / `exec` are called.

**Patterns to follow:**
- `scripts/promote.mjs` — existing `assertValidCategory` call placement marks the canonical "pure-phase error" pattern; the body lint slots in alongside it.
- `scripts/promote.test.mjs` — `makeDeps()` factory and the existing error-path tests (e.g., the already-promoted-file case).

**Test scenarios:**
- **Happy path unchanged** — promoting a body-valid recipe still succeeds; one additional `parseFrontmatter`-equivalent call appears (or no new dep calls if the lint can use already-read content) but `writeFile` + `exec` counts and arguments match the existing happy-path assertions.
- **Body-invalid recipe blocks promotion** — inbox file missing `## Steps`; `promote(...)` rejects before any `writeFile` or `exec` call; error message mentions the missing heading and the slug.
- **Body warnings do NOT block promotion** — inbox file with `format: batch` but no `## How to Batch It` proceeds to mutation as normal; warnings printed to stderr but `promote()` resolves successfully.
- **Dry-run still surfaces body errors** — `dryRun: true` plus a body-invalid file rejects with the same error; no `writeFile`/`exec`.
- **Pre-flight runs after collision check** — order of operations is documented; if both collision AND body error exist, only one is surfaced (specify whichever feels right; pick collision-first since it's the cheaper check, and assert in tests).

**Verification:** `npm test` passes; `npm run promote -- <slug> --category=classic --dry-run` against an existing valid inbox file still prints "would promote"; hand-broken inbox file rejects cleanly.

---

### U5. Update `CLAUDE.md` Recipe Pipeline §2 to note enforcement

**Goal:** Update the contributor docs to reflect that the body contract is now automated, not aspirational.

**Requirements:** Closes the documentation loop with issue #19.

**Dependencies:** U3 (the rule is live in `validate`).

**Files:**
- `CLAUDE.md` — extend the Recipe Pipeline §2 Review bullet (around line 125) with a one-sentence note that the body contract is enforced by `npm run validate` (errors on missing required headings or empty Ingredients lists; warnings on missing House-Made / Batch sections when triggers fire).

**Approach:** Conservative one-line addition; keep the existing wording and append the enforcement note. No restructuring.

**Patterns to follow:** The Lifecycle and Validate steps already cross-reference `npm run validate` and `npm run promote` (the latter landed in PR #29). The body-linter note follows the same prose shape.

**Test scenarios:** `Test expectation: none -- docs-only change. CLAUDE.md is not lint-gated.`

**Verification:** `CLAUDE.md` renders correctly on GitHub; the §2 Review prose remains coherent and the cross-reference reads naturally.

---

## Scope Boundaries

**In scope (this PR):**
- `lintBody` exported helper in `scripts/validate.mjs` with hard and soft rules.
- Integration into `npm run validate` main loop.
- Pre-flight body lint inside `scripts/promote.mjs`.
- Test coverage in `scripts/validate.test.mjs` and `scripts/promote.test.mjs`.
- One-line update to `CLAUDE.md` Recipe Pipeline §2.

**Out of scope (per issue #19):**
- Linting `sections/` prose pages — body contract there is much looser.
- Replacing freeform ingredient strings with structured data (covered by the ingredient-ontology track).
- Enforcing section ordering.

### Deferred to Follow-Up Work

- **Add `method: batched` to the taxonomy.** Out of scope here; the batch soft rule uses the existing `format: batch | punch` enum values instead.
- **Cross-validation of House-Made section content** — e.g., assert that `## House-Made Honey-Ginger Syrup` matches the specific syrup the recipe references. The current soft rule only checks that *any* `## House-Made` heading exists when the trigger fires. Tightening this requires content-level NLP and is out of scope.
- **Body-rule pre-commit hook.** Issue #19 hints at this for issue #3 (pre-commit hook tracking). When that lands, `npm run validate` will pick up the new rules transparently.
- **Capture `docs/solutions/`-bootstrapping learnings** from this PR — the body-rule convention being set here (hand-rolled vs library, error vs warning channels, trigger-refinement strategy) is precedent for future linters. Worth a `/ce-compound` pass post-merge.
- **`scripts/migrate-to-frontmatter.mjs` re-run question** — if the body parser ever needs to re-process existing recipes (e.g., for a future structural migration), it could reuse the same scan helpers. Not a current need.

---

## Risks & Open Questions

### R1: Soft rule trigger refinement leaves a small false-negative hole

**Risk:** The House-Made trigger refinement excludes `simple syrup` and `maple syrup` (correctly — they're store-bought). A future recipe that legitimately house-makes a `simple syrup` variant (e.g., demerara-simple syrup, brown-butter simple syrup) would NOT trigger the warning. False negative.

**Mitigation:** The rule is intentionally tuned to the current corpus. The trigger is a simple regex easy to extend when a real false-negative shows up. The plan does not promise universal coverage of all craft preparations; it promises zero day-one warning noise plus high signal-positivity on the demonstrated corpus patterns.

**Confidence:** High — refinement is opinionated but bounded, and the rule is one regex away from extension.

### R2: Body parser misclassifies content inside fenced code blocks

**Risk:** If a recipe ever includes a fenced code block (` ``` `) containing text that looks like an H2 (`## Something`), the line-based parser would misread it as a real heading.

**Mitigation:** Research confirmed zero recipes currently contain fenced code blocks. Add a brief defensive note to the implementer to keep an eye on this if the corpus ever grows code-block-bearing recipes; for now, accept the limitation as documented behavior. If it becomes a real problem, the fix is a small state machine that toggles "inside-fence" on each `^```` line.

**Confidence:** High — verified absent in the current corpus; clear fix path if it ever surfaces.

### R3: Pre-flight body lint in `promote.mjs` adds an import-time coupling

**Risk:** `scripts/promote.mjs` now imports `lintBody` from `scripts/validate.mjs`, deepening the existing import relationship (which already pulls `CATEGORY_BY_DIR`). If `validate.mjs` is later refactored — e.g., `lintBody` extracted to a sibling — the promote import will need updating in lockstep.

**Mitigation:** Both files are in `scripts/` and ship together; cross-module refactors will surface both call sites in any rename. The risk is bounded to within-scripts coupling.

**Confidence:** High — same shape as the existing `CATEGORY_BY_DIR` coupling, which has been stable.

### Open questions (deferred to implementation)

- Exact body-offset computation: extend `parseFrontmatter` to return the end-index, or recompute the offset inside the body-lint call. Both are fine; pick whichever yields the smaller diff.
- Whether the hard-rule list-detection regex should accept both `-` and `*` bullets, or `-` only. Plan defaults to `-` only (corpus is uniform); flip to permissive if a future recipe author requests it.
- Warning prefix wording: current `WARN: ` and `ERROR: ` prefixes are convention; the body-rule messages reuse this without ceremony.

---

## System-Wide Impact

**Surface touched.** Two new exported functions in `scripts/validate.mjs` (`lintBody` plus one or two small helpers), one integration call in the existing `main()` loop, one new import + one new pure-phase call in `scripts/promote.mjs`, one one-line note in `CLAUDE.md`, and tests added to two existing test files.

**Contracts changed.**
- `scripts/validate.mjs` gains new exports (`lintBody` + helpers). Existing exports (`parseFrontmatter`, `parseScalar`, `CATEGORY_BY_DIR`) and CLI behavior are unchanged for currently-passing recipes.
- `scripts/promote.mjs` gains an additional pre-flight failure mode (body errors → throw before mutation). Existing happy-path callers see no change.
- `npm run validate` exit-code contract is unchanged: 0 on clean, 1 on errors, warnings always print but do not affect exit.

**Affected parties.**
- **Recipe authors.** Drafts in `recipes/inbox/` are unaffected (body rules skip). Published recipes that pass the hard rules today (all 20 in the corpus, confirmed) are unaffected. Future authors get clearer immediate feedback when they forget `## Steps` or write an empty ingredients list.
- **CI.** No CI config changes. The body rules run inside `npm run validate`, which is already gated by `.github/workflows/test.yml` and `.github/workflows/deploy.yml`.
- **`scripts/promote.mjs` users.** Pre-flight body lint adds one more error class to the script's known failure modes; documented in U4 tests and the script's leading comment.

**Performance / operational.** Negligible. The body parser is O(lines per file × file count). Twenty recipes, ~40 lines each → an additional ~10ms in `npm run validate`. Production deploy is unaffected (validate is already on the deploy critical path).

---

## Verification Strategy

- **Unit (Vitest):** Every `lintBody` hard rule + soft rule + the `mentionsHouseMadeWorthyPrep` predicate covered with table-driven and direct cases. The promote pre-flight covered with happy-path + body-error path + warning path + dry-run-still-rejects path.
- **Integration (manual):**
  - `npm run validate` against the unmodified corpus → exits 0; no new warnings (verified post-implementation against the corpus baseline survey).
  - Hand-mutate one inbox file (`publish: true` + delete `## Steps`); `npm run validate` exits 1 with a clear error mentioning the file and missing heading; revert.
  - `npm run promote -- <inbox-slug> --category=classic --dry-run` on a body-valid inbox file → prints "would promote", working tree unchanged.
  - Same command on a body-broken inbox file → rejects with a clear pre-flight error, working tree unchanged.
- **Astro / TypeScript:** `npm run build` runs `astro check`. Script changes don't touch TypeScript; this is a regression guard.

---

## Out-of-Band References

- Issue: [#19](https://github.com/dancj/home-bartender/issues/19) "Add body-structure linter (markdownlint + custom rules) for recipes"
- Source ideation: `docs/ideation/2026-05-23-site-and-pipeline-ideation.md` (idea #5)
- Related (just merged): [PR #29](https://github.com/dancj/home-bartender/pull/29) — `scripts/promote.mjs` (the pre-flight U4 extends this script)
- Closest in-repo precedents: `scripts/validate.mjs` (parser style, error/warning channels, exit-code contract), `scripts/promote.mjs` (pure-phase error pattern, DI orchestrator), `scripts/validate.test.mjs` (pure-function test style), `scripts/migrate-styles-to-tags.mjs` (body-offset slicing precedent)
- CLAUDE.md: Recipe Pipeline §2 body contract (line 125), TDD discipline (lines 31–46), Branch naming (`feat-19-body-structure-linter`), PR-closing keywords (`Closes #19`)
