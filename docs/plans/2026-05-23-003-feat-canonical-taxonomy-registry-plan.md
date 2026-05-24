---
title: "feat: Canonical taxonomy registry"
type: feat
status: active
date: 2026-05-23
origin: docs/brainstorms/2026-05-23-canonical-taxonomy-registry-requirements.md
---

# feat: Canonical taxonomy registry

## Summary

Introduce `data/taxonomy.yaml` as the single source of truth for the 10 enum-shaped recipe frontmatter fields. A new `scripts/codegen-taxonomy.mjs` produces three artifacts in one run — `src/taxonomy.generated.ts` for the Zod schema, `scripts/taxonomy.generated.mjs` for the validator, and a regenerated Canonical Taxonomy region in `TEMPLATE.md` between HTML comment markers. CI fails when any artifact is stale. Schema additions: hard-enum `family` (Cocktail Codex 6), hard-enum `glass` + sibling `glass_note`. Field rename: `styles` → `tags` (free-form). All 20 existing recipes migrated in the same PR so the schema change doesn't break the build.

---

## Problem Frame

Today taxonomy lives in three files that must agree by hand: `src/content.config.ts` (Zod), `scripts/validate.mjs` (parallel `Set`s + warning-only canonical lists for `spirits`/`flavors`/`occasions`), and `TEMPLATE.md`'s Canonical Taxonomy table. `CLAUDE.md` instructs contributors to keep the first two in sync — documented discipline as the only enforcement. Drift is asymmetric and quiet (warning-only vs hard-fail vs silent-doc-rot). The site also has no concept of cocktail family even though Dan thinks in those terms — see origin: [docs/brainstorms/2026-05-23-canonical-taxonomy-registry-requirements.md](../brainstorms/2026-05-23-canonical-taxonomy-registry-requirements.md).

---

## Requirements

- R1. `data/taxonomy.yaml` is the single source for 10 enum fields: `category`, `method`, `ice`, `difficulty`, `format`, `glass`, `family`, `spirits`, `flavors`, `occasions`. Entries are objects with required `slug` + `label` and optional `source`, `note`, `aliases` (documentation only in v1).
- R2. The `family` enum holds exactly: `old-fashioned`, `martini`, `daiquiri`, `sidecar`, `whiskey-highball`, `flip` — each with `source: Cocktail Codex` and a one-line `note`.
- R3. The `glass` enum holds the 13 entries locked in the origin doc: `coupe`, `nick-and-nora`, `rocks`, `double-rocks`, `highball`, `collins`, `flute`, `wine`, `margarita`, `martini`, `mug`, `snifter`, `julep-tin`.
- R4. `scripts/codegen-taxonomy.mjs` reads the YAML and writes three artifacts: `src/taxonomy.generated.ts`, `scripts/taxonomy.generated.mjs`, and the marker-bounded region of `TEMPLATE.md`. All three are committed.
- R5. `src/content.config.ts` imports the generated TS and binds every enum-shaped field to it. `spirits`/`flavors`/`occasions` change from `z.array(z.string())` to `z.array(z.enum(...))` — hard enforcement via `astro check`. New `family` (optional, single-value) and `glass_note` (optional string) fields are added.
- R6. `scripts/validate.mjs` deletes its hardcoded `Set`s for taxonomy values and delegates enum membership entirely to Zod. It retains: `category` ↔ dir match, `related[]` resolution, duplicate slug detection, alias collision warning, `publish` ↔ dir coherence.
- R7. The existing `styles` frontmatter key is renamed to `tags` across all 20 existing recipes. `tags` remains free-form (not in the canonical YAML surface).
- R8. The existing free-form `glass` field is normalized per recipe to a canonical slug + optional `glass_note` for prose alternates. The new `family` field is left empty on existing recipes (filled in later, intentionally).
- R9. A new step in `.github/workflows/test.yml` runs `npm run codegen` and fails if any of the three generated artifacts (`src/taxonomy.generated.ts`, `scripts/taxonomy.generated.mjs`, the marker-bounded region of `TEMPLATE.md`) are not byte-identical with the committed version.
- R10. `CLAUDE.md` and `TEMPLATE.md` prose are updated to describe the new contributor flow (edit YAML → `npm run codegen` → commit) and stop referring to the "update both files" rule.

**Origin actors:** none (single-maintainer project; not surfaced in origin).
**Origin acceptance examples:** AE1 (covers R9), AE2 (covers R5), AE3 (covers R5), AE4 (covers R7), AE5 (covers R4, R10).

---

## Scope Boundaries

- Functional alias normalization: `aliases` in YAML entries is documentation only; the validator does not rewrite `agave-spirit` → `mezcal`. Hardening is a follow-up if demand emerges.
- Auto-populating `family` on the 20 existing recipes. The field stays empty; Dan fills it in per recipe over time.
- Site UI consumption of `source` / `note` metadata. Latent data; rendering surfaces (e.g., an `/about/taxonomy` page) are out.
- Ingredient ontology (idea #6 in the ideation doc) — separate, larger track. This plan stays within frontmatter enum fields, not recipe bodies.
- Structured editor / form UI generated from the YAML — out.
- JSON API export of the taxonomy — adjacent ideation track, not this PR.
- Pagefind search facets bound to the new fields — downstream.

---

## Context & Research

### Relevant Code and Patterns

- `scripts/validate.mjs` + `scripts/validate.test.mjs` — the current `Set`-based validator and its Vitest coverage. The validator's runtime parser (`parseFrontmatter`) is kept as-is; only the taxonomy checks are removed.
- `scripts/autoReleasePrRun.mjs` + `scripts/buildReleasePrBody.mjs` — existing precedent for one-script-per-concern and `.mjs` + co-located `.test.mjs` test naming convention.
- `scripts/migrate-to-frontmatter.mjs` — precedent for one-off migration scripts kept around as idempotent utilities (the README/CLAUDE-noted "Migration" pattern in `TEMPLATE.md`).
- `scripts/buildReleasePrBody.mjs` — produces the `<!-- release-pr:start -->` / `<!-- release-pr:end -->` managed block; same marker-comment pattern used here for `TEMPLATE.md` taxonomy region.
- `.github/workflows/test.yml` — runs `npm test` on every PR + push to staging/main. Right place for the codegen-staleness step (catches drift before merge, not at deploy).
- `src/content.config.ts` — Astro 6 Content Layer with `glob` loader; Zod schema for both `recipes` and `sections` collections.

### Institutional Learnings

- None recorded. `docs/solutions/` does not exist. Capturing this work's followups via `/ce-compound` would seed the directory (noted in the ideation doc that produced the brainstorm).

### External References

- `yaml` package on npm — straightforward Node YAML parser; modern, no transitive dependencies, used by similar codegen tooling.
- Astro 6 Content Layer API: collection schemas accept `z.enum([...])` bound to const arrays declared in TS — confirmed by current `src/content.config.ts` usage.

---

## Key Technical Decisions

- **One codegen script producing three artifacts in one run** (`scripts/codegen-taxonomy.mjs`). Matches the repo's one-script-per-concern convention; keeps the YAML→artifact mapping legible in a single file.
- **Codegen artifacts are committed, not generated at build time.** Diffs are inspectable in PRs (a single-line YAML change shows up as a coordinated multi-file commit). `astro build` and `validate.mjs` import the generated files directly with no codegen step in the deploy pipeline. The cost — a small "edit YAML → run codegen → commit all" ritual — is acceptable.
- **CI staleness check lives in `test.yml`, not `deploy.yml`.** Runs on every PR so drift is caught before merge, not at deploy time when the only fix is another commit on main.
- **Validator delegates enum membership entirely to Zod.** Drops the hardcoded `Set`s for taxonomy. Keeps the checks Zod can't do: `category` ↔ dir match, `related[]` resolution, duplicate slugs, alias-vs-slug collision warning, `publish` ↔ dir coherence. Single-source story: one place that knows what's canonical.
- **Migration is mixed: mechanical script for `styles` → `tags`, manual per-recipe edits for glass normalization.** The rename is purely structural and idempotent (good script target). Glass requires judgment per recipe (e.g., `"Champagne flute or coupe"` → `glass: flute, glass_note: "or coupe"` vs `glass: coupe, glass_note: "or champagne flute"`) — only 20 recipes; cheaper to review manually than to build an interactive script.
- **Single PR.** The schema change (U6 below) hard-fails on existing recipes until migration (U8, U9) runs. Codegen + YAML population (U1–U5) must come before the schema can compile. Internally consistent atomic unit; phased rollout would require keeping warning-only behavior alive during a transition (added complexity for no real benefit on a 20-recipe corpus).
- **TEMPLATE.md marker convention.** Use `<!-- taxonomy:start -->` / `<!-- taxonomy:end -->` — matches the `<!-- release-pr:start -->` / `<!-- release-pr:end -->` precedent.
- **Codegen output files use `.generated.ts` / `.generated.mjs` suffix.** Signals "do not edit by hand" via filename. No `gitignore` — files are committed.

---

## Open Questions

### Resolved During Planning

- **Where do generated files live?**: `src/taxonomy.generated.ts` (next to `content.config.ts` which imports it) and `scripts/taxonomy.generated.mjs` (next to `validate.mjs` which imports it). Co-located with consumer.
- **Single codegen script or multiple?**: Single (`scripts/codegen-taxonomy.mjs`), matches repo convention.
- **CI staleness check location**: New step in `.github/workflows/test.yml`, after the existing `npm test` step.
- **Validator's relationship to Zod for taxonomy**: Full delegation; hardcoded `Set`s deleted.
- **Migration mechanics**: Mechanical script for styles→tags; manual edits for glass.

### Deferred to Implementation

- Exact YAML parser package choice (`yaml` vs `js-yaml`) — `yaml` is the default unless the implementer finds a reason to prefer `js-yaml`.
- Codegen output formatting — pass through Prettier if it's already in the toolchain, otherwise emit consistent hand-formatted output. Decision at implementation time.
- Whether the codegen script should also run `astro check` as a self-test — defer; the CI step already catches drift, and adding it to codegen would slow the local loop.

---

## Implementation Units

### U1. Add YAML dependency and codegen scaffold

**Goal:** Establish the codegen entry point and YAML parsing capability without producing any artifacts yet.

**Requirements:** R4 (foundation)

**Dependencies:** None

**Files:**
- Modify: `package.json` — add `yaml` to `devDependencies`; add `"codegen": "node scripts/codegen-taxonomy.mjs"` to `scripts`.
- Create: `scripts/codegen-taxonomy.mjs` — exports `generate()` that loads `data/taxonomy.yaml`, parses it, and (for now) prints the parsed shape to stdout.
- Create: `data/taxonomy.yaml` — minimal placeholder with one field (e.g., `methods: [{slug: shaken, label: Shaken}]`) so the script has something to load.
- Test: `scripts/codegen-taxonomy.test.mjs` — `loads and parses a minimal YAML fixture without throwing`.

**Approach:**
- Use the `yaml` package (`import { parse } from 'yaml'`).
- Script reads `data/taxonomy.yaml` via `node:fs/promises`.
- `generate()` returns the parsed object; CLI invocation prints it.

**Patterns to follow:**
- `scripts/buildReleasePrBody.mjs` — ESM module with named exports and an `if (fileURLToPath(import.meta.url) === process.argv[1])` CLI guard.

**Test scenarios:**
- Happy path: parses a minimal YAML containing one enum field; returned object has the expected shape.
- Error path: missing `data/taxonomy.yaml` → throws with a clear message naming the missing path.
- Error path: malformed YAML → throws with a parser error that includes line context.

**Verification:**
- `npm run codegen` succeeds against the minimal fixture and prints the parsed object.
- `npm test` passes including the new test file.

---

### U2. Codegen → `src/taxonomy.generated.ts` (Zod consumer)

**Goal:** From parsed YAML, emit a TypeScript module that exports typed `as const` arrays for each enum field plus inferred string-literal union types.

**Requirements:** R4, R5

**Dependencies:** U1

**Files:**
- Modify: `scripts/codegen-taxonomy.mjs` — add `emitZodModule(parsed)` that returns the TS source string, and write it to `src/taxonomy.generated.ts`.
- Create: `src/taxonomy.generated.ts` — initially the emitted output against U1's placeholder.
- Test: extend `scripts/codegen-taxonomy.test.mjs` — assert the emitted string matches an expected golden snapshot for a known fixture.

**Approach:**
- For each top-level field in the YAML, emit:
  - `export const FIELD_NAME = ['slug1', 'slug2', ...] as const;`
  - `export type FieldName = (typeof FIELD_NAME)[number];`
- Emit a leading file header comment: `// AUTO-GENERATED FROM data/taxonomy.yaml — DO NOT EDIT BY HAND. Run \`npm run codegen\` to regenerate.`
- Preserve YAML's array order in the emitted const.

**Technical design:** *(directional — not implementation specification)*

```ts
// Output shape sketch for one field:
export const METHODS = ['shaken', 'stirred', 'built', 'blended'] as const;
export type Method = (typeof METHODS)[number];
```

**Patterns to follow:**
- The existing literal `z.enum([...])` calls in `src/content.config.ts` — generated constants must be array literals so Zod's type inference works.

**Test scenarios:**
- Happy path: a fixture YAML with 3 fields emits 3 `const` exports and 3 `type` exports in expected order.
- Edge case: empty array on a field (e.g., `occasions: []`) emits a valid empty `as const` literal.
- Edge case: a single-entry field emits a single-element const without trailing-comma quirks that break TS parsing.

**Verification:**
- Generated `src/taxonomy.generated.ts` type-checks under `astro check` (an empty schema import is enough to validate parse-ability).
- Snapshot test passes against the fixture.

---

### U3. Codegen → `scripts/taxonomy.generated.mjs` (validator consumer)

**Goal:** From the same parsed YAML, emit a plain `.mjs` module exporting the same arrays for the validator to import.

**Requirements:** R4, R6

**Dependencies:** U1

**Files:**
- Modify: `scripts/codegen-taxonomy.mjs` — add `emitValidatorModule(parsed)` and write to `scripts/taxonomy.generated.mjs`.
- Create: `scripts/taxonomy.generated.mjs` — initially the emitted output against U1's placeholder.
- Test: extend `scripts/codegen-taxonomy.test.mjs` — golden-string assertion for the validator output.

**Approach:**
- For each field, emit `export const FIELD_NAME = ['slug1', ...];` (no `as const`; plain JS).
- Same file header comment as U2.

**Patterns to follow:**
- `scripts/buildReleasePrBody.mjs` — ESM module style.

**Test scenarios:**
- Happy path: a fixture YAML emits the same field set as U2 with plain-JS array literals.
- Integration: a downstream importer (`import { METHODS } from './taxonomy.generated.mjs'`) sees the expected array contents.

**Verification:**
- Snapshot test passes.
- `node -e "import('./scripts/taxonomy.generated.mjs').then(m => console.log(Object.keys(m)))"` lists the expected exports.

---

### U4. Codegen → `TEMPLATE.md` table regeneration with markers

**Goal:** Add HTML comment markers around the Canonical Taxonomy section of `TEMPLATE.md`; have codegen rewrite the region content from the parsed YAML.

**Requirements:** R4, R10

**Dependencies:** U1

**Files:**
- Modify: `TEMPLATE.md` — add `<!-- taxonomy:start -->` / `<!-- taxonomy:end -->` markers wrapping the Canonical Taxonomy table. Replace the inline prose sentence "Add new values by editing `scripts/validate.mjs` and (eventually) `src/content.config.ts` together." with new prose: "Add new values by editing `data/taxonomy.yaml` and running `npm run codegen` — the table below regenerates automatically."
- Modify: `scripts/codegen-taxonomy.mjs` — add `emitTemplateTable(parsed)` that returns markdown table rows; `updateTemplateMd(parsed)` reads `TEMPLATE.md`, locates markers, replaces region content, writes back.
- Test: extend `scripts/codegen-taxonomy.test.mjs` — assert the marker region of a TEMPLATE fixture is rewritten correctly and prose outside markers is untouched.

**Approach:**
- Build one markdown table row per enum field (the `family` and `glass` fields render as their own rows, joining the existing 8).
- Use `entry.label` for the human-readable value when present; fall back to `entry.slug` if `label` missing.
- Failure mode: if either marker is missing from `TEMPLATE.md`, throw with a clear error naming both expected markers.

**Patterns to follow:**
- `scripts/buildReleasePrBody.mjs` — managed-block-between-markers pattern with byte-preserved surrounding content.

**Test scenarios:**
- Covers AE5. Happy path: codegen against a fixture YAML and a TEMPLATE fixture rewrites only the marker region; prose before and after is byte-identical.
- Edge case: empty enum field (e.g., empty `occasions`) renders as a table row with `_none_` or empty cell — pick at implementation time, but assert in test.
- Error path: missing `<!-- taxonomy:start -->` marker → throws with a message naming the expected marker pair.
- Error path: markers present but in wrong order → throws.

**Verification:**
- `git diff TEMPLATE.md` after a codegen run is confined to the marker region for taxonomy changes.

---

### U5. Populate `data/taxonomy.yaml` with full canonical sets and regenerate artifacts

**Goal:** Replace the placeholder YAML with the real, complete canonical set across all 10 enumerated fields (8 existing + `family` + `glass`); regenerate all three artifacts.

**Requirements:** R1, R2, R3

**Dependencies:** U2, U3, U4

**Files:**
- Modify: `data/taxonomy.yaml` — full canonical set:
  - `category`: classic, original, seasonal, inbox.
  - `method`: shaken, stirred, built, blended.
  - `ice`: cubed, large-cube, crushed, none.
  - `difficulty`: easy, medium, advanced.
  - `format`: single, batch, punch.
  - `family`: 6 Codex roots (each with `source: Cocktail Codex` and a one-line `note`).
  - `glass`: 13 entries from R3.
  - `spirits`: 14 current entries from `validate.mjs`.
  - `flavors`: 19 current entries.
  - `occasions`: 7 current entries.
- Modify: `src/taxonomy.generated.ts` — regenerated content.
- Modify: `scripts/taxonomy.generated.mjs` — regenerated content.
- Modify: `TEMPLATE.md` — regenerated table region.

**Approach:**
- Take all existing canonical values verbatim from `scripts/validate.mjs` (their order is fine).
- Populate `family` entries with the verbatim Codex notes from the brainstorm (e.g., Old Fashioned: `Spirit + sugar + bitters + water (dilution)`).
- Run `npm run codegen` once; commit all four files together.

**Patterns to follow:**
- None — this is data, not code.

**Test scenarios:**
- Test expectation: none — pure data + regenerated artifacts. Coverage is upstream (codegen tests) and downstream (Zod will reject invalid recipes once U6 lands).

**Verification:**
- `npm run codegen` is a no-op after this commit (artifacts match YAML).
- All 4 files (`data/taxonomy.yaml` + 3 generated) appear in `git status` together.

---

### U6. Update `src/content.config.ts` schema to consume generated taxonomy + add new fields

**Goal:** Bind the Zod schema to the generated constants; add `family` and `glass_note`; harden `spirits`/`flavors`/`occasions`; rename `styles` to `tags`.

**Requirements:** R5, R7

**Dependencies:** U5

**Files:**
- Modify: `src/content.config.ts` — import generated constants; rewrite `recipes` schema.
- Test: existing `astro check` (via `npm run build`) is the schema test surface; no new test file needed.

**Approach:**
- `import { METHODS, ICES, DIFFICULTIES, CATEGORIES, FORMATS, GLASSES, FAMILIES, SPIRITS, FLAVORS, OCCASIONS } from './taxonomy.generated';` (Astro resolves `.ts` extension).
- Replace each literal `z.enum([...])` with `z.enum(CONST_NAME)`.
- Change `glass: z.string()` to `glass: z.enum(GLASSES)`.
- Add `glass_note: z.string().optional().default('')` immediately after `glass`.
- Change `spirits: z.array(z.string())` to `spirits: z.array(z.enum(SPIRITS))`; same for `flavors`, `occasions`.
- Add `family: z.enum(FAMILIES).optional()` (single-value, optional).
- Rename `styles: z.array(z.string())` to `tags: z.array(z.string())` — remains free-form (no enum binding).
- Order: keep the existing field order; insert `family` near `tags` (formerly `styles`); insert `glass_note` after `glass`.

**Execution note:** This unit will hard-fail `astro check` on every existing recipe until U8 and U9 migrate them. Land U6 + U7 + U8 + U9 as one logical change (single PR). Verification for this unit alone is "schema compiles in isolation."

**Patterns to follow:**
- Existing `src/content.config.ts` Astro Content Layer collection definition style.

**Test scenarios:**
- Happy path (post-migration): `astro check` passes against the full migrated recipe corpus.
- Covers AE2. Error path: a recipe with `flavors: [yuzu]` (where `yuzu` is not canonical) fails `astro check` with a Zod error naming the field and value.
- Covers AE3. Edge case: a recipe with `family: old-fashioned`, `glass: rocks`, `glass_note: "or coupe"` parses cleanly.

**Verification:**
- `astro check` passes with the full set of migrated recipes (proven after U8 + U9 land).
- The generated TS module is imported successfully (no resolution errors).

---

### U7. Simplify `scripts/validate.mjs` — delete hardcoded `Set`s; delegate enum checks to Zod

**Goal:** Remove the validator's parallel taxonomy enforcement; keep only the structural checks Zod can't do.

**Requirements:** R6

**Dependencies:** U5 (so the generated `.mjs` exists if we want to import it for any remaining warning, though most use cases evaporate)

**Files:**
- Modify: `scripts/validate.mjs` — delete `METHODS`, `ICES`, `DIFFICULTIES`, `CATEGORIES`, `FORMATS`, `SPIRITS`, `FLAVORS`, `OCCASIONS` `Set` declarations and their per-recipe loop checks.
- Modify: `scripts/validate.test.mjs` — drop tests covering the deleted behaviors; keep tests for retained behaviors.

**Approach:**
- Retain: `walk()`, `parseFrontmatter()`, `parseScalar()` (still used for the parser); slug-uniqueness; `category` ↔ dir match (this is structural, not taxonomy); `related[]` resolution; alias-vs-slug collision; `publish` ↔ dir coherence.
- The "category not in CATEGORIES" check is redundant once Zod enforces it — but the dir-mismatch check ("category=X but dir says Y") remains because it crosses two dimensions Zod can't see.
- Update the closing summary line if needed (e.g., warnings count drops; copy stays the same).

**Patterns to follow:**
- The existing structure of `scripts/validate.mjs` — keep ESM, keep the CLI guard, keep error/warning separation.

**Test scenarios:**
- Happy path: post-migration corpus passes validate with 0 errors and 0 warnings.
- Edge case: a recipe with mismatched `category` vs dir (e.g., file in `recipes/originals/` with `category: classic`) still errors.
- Edge case: a recipe with `related: [does-not-exist]` still errors.
- Edge case: a recipe with `aliases: [<an-existing-slug>]` still warns.
- Edge case: a non-inbox recipe with `publish: false` still warns; an inbox recipe with `publish: true` still warns.
- Regression: validate.mjs no longer references `METHODS`, `SPIRITS`, etc. (grep guard).

**Verification:**
- `npm run validate` passes with 0 errors against the migrated corpus.
- `npm test` passes.

---

### U8. Migration script: rename `styles:` to `tags:` across all recipes

**Goal:** Mechanical rename of the frontmatter key in every recipe file under `recipes/`.

**Requirements:** R7

**Dependencies:** None for the script itself; must run before/with U6 lands.

**Files:**
- Create: `scripts/migrate-styles-to-tags.mjs` — reads each `recipes/**/*.md`, swaps `^styles:` to `tags:` in the frontmatter block only, writes back.
- Create: `scripts/migrate-styles-to-tags.test.mjs` — Vitest fixtures.
- Modify: every `recipes/**/*.md` file with a `styles:` key (audit: all 20 in current usage).

**Approach:**
- Script is idempotent: re-running on already-migrated files is a no-op (no `styles:` key to find).
- Use the existing `parseFrontmatter` from `validate.mjs` to detect frontmatter bounds (or do a simpler line-level swap bounded by the `---\n` / `\n---\n` markers).
- Preserve indentation, comments, and surrounding whitespace.
- Run once locally; commit the result. Keep the script around per the `migrate-to-frontmatter.mjs` precedent.

**Patterns to follow:**
- `scripts/migrate-to-frontmatter.mjs` — idempotent migration utility kept around as documentation of the format conversion.

**Test scenarios:**
- Covers AE4. Happy path: a fixture recipe with `styles: [shaken, floral]` after migration has `tags: [shaken, floral]` and no `styles:` key.
- Edge case: a fixture with `styles: []` migrates to `tags: []`.
- Edge case: a recipe with no `styles:` key is unchanged (idempotent re-run).
- Edge case: a recipe where the word "styles:" appears in the body (e.g., a Notes section discussing different styles of garnish) is NOT modified — only the frontmatter is touched.
- Error path: malformed frontmatter (no closing `---`) is reported with the file path and the file is not modified.

**Verification:**
- After running, `grep -l "^styles:" recipes/**/*.md` returns no results.
- After running, `grep -c "^tags:" recipes/**/*.md` matches the prior count of `^styles:`.

---

### U9. Manual normalization: `glass:` per recipe → canonical slug + `glass_note`

**Goal:** Convert each recipe's free-form glass string into a canonical slug and optional prose note.

**Requirements:** R8

**Dependencies:** U5 (canonical list locked); must land before U6 hard-enforces.

**Files:**
- Modify: every `recipes/**/*.md` file (audit: all 20 in current usage have a `glass:` field).

**Approach:**
- This is a manual per-recipe edit pass, not a script. 20 recipes; each prose value needs human judgment for primary-vs-alternate.
- Reference table for current values → canonical primary (suggestion only; final per-recipe call belongs to Dan):
  - `"Coupe"` → `glass: coupe`
  - `"Highball"` → `glass: highball`
  - `"Rocks"` → `glass: rocks`
  - `"Coupe (or rocks with a big cube)"` → `glass: coupe, glass_note: "or rocks with a big cube"`
  - `"Champagne flute or coupe"` → `glass: flute, glass_note: "or coupe"`
  - `"Collins or highball"` → `glass: collins, glass_note: "or highball"`
  - `"Coupe (or Collins with sparkling water)"` → `glass: coupe, glass_note: "or Collins with sparkling water"`
  - `"Highball or wine glass"` → `glass: highball, glass_note: "or wine glass"`
  - `"Margarita or rocks"` → `glass: margarita, glass_note: "or rocks"`
  - `"Rocks or coupe"` → `glass: rocks, glass_note: "or coupe"`
  - `"Wine glass or spritz glass"` → `glass: wine, glass_note: "or spritz glass"` (spritz glass maps to wine per origin doc note)
- Each edit: replace the existing `glass:` line with two lines: `glass: <slug>` and `glass_note: "<prose>"` (omit `glass_note` if no alternate).

**Patterns to follow:**
- The existing `method_note` and `ice_note` patterns in current recipes (where present).

**Test scenarios:**
- Test expectation: none for the manual edit pass. Correctness is enforced by U6's Zod schema once both land — `astro check` will fail if any recipe has a non-canonical `glass` value.
- Implicit gate (already covered by U6's test scenarios): `astro check` passes against the full corpus.

**Verification:**
- `astro check` passes against all 20 migrated recipes once U6 + U9 land together.

---

### U10. CI staleness check in `.github/workflows/test.yml`

**Goal:** Fail CI when generated artifacts are out of sync with `data/taxonomy.yaml`.

**Requirements:** R9

**Dependencies:** U5 (artifacts exist), U6 (Zod consumes them — proves the round-trip)

**Files:**
- Modify: `.github/workflows/test.yml` — add a new step after "Run tests" called "Verify generated taxonomy is current".

**Approach:**
- New step runs `npm run codegen`, then `git diff --exit-code src/taxonomy.generated.ts scripts/taxonomy.generated.mjs TEMPLATE.md`. (Source YAML is excluded — codegen reads it, never writes it.)
- Non-zero exit fails the step with a clear summary: which file(s) drifted and a reminder to run `npm run codegen` locally and commit.

**Patterns to follow:**
- Existing step structure in `.github/workflows/test.yml`.

**Test scenarios:**
- Covers AE1. Integration: a PR that edits `data/taxonomy.yaml` without running codegen fails this CI step with a message naming the stale file(s). (Manual verification on a deliberately-broken branch is the most direct proof; a synthetic test isn't worth the harness setup for one shell-diff step.)
- Happy path: a PR that edits `data/taxonomy.yaml` AND commits regenerated artifacts passes.

**Verification:**
- The new step appears in `.github/workflows/test.yml` and is named clearly enough that a CI failure points the reader at the fix.
- A deliberately staged drift (edit YAML, skip codegen, push) is rejected by CI.

---

### U11. Update `CLAUDE.md` and `TEMPLATE.md` prose for new contributor workflow

**Goal:** Replace the documented "update both files" discipline with the new YAML + codegen flow.

**Requirements:** R10

**Dependencies:** Everything else lands first so docs describe reality.

**Files:**
- Modify: `CLAUDE.md` — find the sentence "When introducing a new enum value (a new spirit, flavor, occasion, etc.), update **both** `src/content.config.ts` and `scripts/validate.mjs` in the same change." Replace with: "When introducing a new enum value (a new spirit, glass, family, etc.), edit `data/taxonomy.yaml`, run `npm run codegen`, and commit the YAML and all regenerated artifacts together. CI fails if any generated file is stale."
- Modify: `TEMPLATE.md` — update the frontmatter schema example block to add `family`, `glass_note`, rename `styles` to `tags`. Verify the Canonical Taxonomy section now has `family` and `glass` rows (auto-generated by U4; this step is a visual sanity check). Verify the closing prose about the validation gate is still accurate.

**Patterns to follow:**
- None — pure docs.

**Test scenarios:**
- Test expectation: none — docs.

**Verification:**
- `grep -n "update both" CLAUDE.md` returns nothing.
- `grep -n "styles:" TEMPLATE.md` returns no frontmatter-example lines (only the auto-generated table cell entries, if any, which are gone since `tags` is free-form and not in YAML).

---

## System-Wide Impact

- **Interaction graph:** The Zod schema in `src/content.config.ts` is the load-bearing contract for the entire site. Any rendering code that destructures recipe frontmatter via the content collection sees the schema change. Notably: `styles` → `tags` rename will break any component that destructures `entry.data.styles`. Find and update in the same PR.
- **Error propagation:** Pre-migration: Zod warnings for soft fields, Zod errors for hard fields. Post-migration: Zod errors for all 10 enum fields. Pages collection unchanged.
- **State lifecycle risks:** None — this is a build-time concern. No runtime state.
- **API surface parity:** No external APIs. The recipe collection's TS-inferred type changes (gains `family`, `glass_note`, `tags`; loses `styles`) — consumers within the repo must follow.
- **Integration coverage:** The codegen round-trip (YAML → 3 artifacts → consumed by Zod and validator) is the integration surface. U6's `astro check` against the migrated corpus is the canonical integration test.
- **Unchanged invariants:** The `sections` collection schema is untouched. The structural checks in `validate.mjs` (slug uniqueness, dir/category match, `related[]` resolution, alias collision, publish-vs-dir coherence) are preserved exactly. Recipe body parsing and rendering are unchanged.

---

## Risks & Dependencies

| Risk | Mitigation |
|------|------------|
| Hidden consumer of `entry.data.styles` somewhere in `src/` breaks silently after rename | Phase-1 grep across `src/` for `\.styles` before merging the PR; update all references in same change. `astro check` should catch typed access but a `.data` access via dynamic key wouldn't. |
| `yaml` package introduces a transitive vulnerability | Pin a recent version; `yaml` is a single-file dependency with no transitives. Acceptable risk for the use case. |
| Codegen produces non-deterministic output (e.g., different formatting on different Node versions) | Snapshot test (U2, U3, U4) catches non-determinism; CI staleness check (U10) catches drift between local and CI. |
| Manual glass migration introduces typos (e.g., `glass: coup` instead of `coupe`) | `astro check` (U6) hard-fails on uncanonical values; CI catches before merge. |
| Future contributor edits `src/taxonomy.generated.ts` directly thinking it's source | File header comment + `.generated.` filename suffix; CI staleness check overwrites their edits on next run. |
| `family` field added but the entry shape (`{slug, label, source, note, aliases}`) turns out to be wrong for downstream use | Low cost to revisit — the YAML is the source; entry schema can evolve. Generated TS would change shape; consumers update accordingly. |

---

## Documentation / Operational Notes

- After merge, the next PR opening a release-PR rollup will include this as a "Refactor / DX" entry — no special handling needed.
- The `migrate-styles-to-tags.mjs` script stays in `scripts/` per the `migrate-to-frontmatter.mjs` convention; it's no-op idempotent so leaving it indefinitely is fine.
- A follow-up issue is worth opening to track populating `family` on the 20 existing recipes (intentional, per-recipe, over time).
- An adjacent ideation followup: with the YAML in place, the `/about/taxonomy` site page becomes a small lift (would render the `source` and `note` metadata that's now captured but unused). Track as a separate idea.

---

## Sources & References

- **Origin document:** [docs/brainstorms/2026-05-23-canonical-taxonomy-registry-requirements.md](../brainstorms/2026-05-23-canonical-taxonomy-registry-requirements.md)
- **Ideation source:** [docs/ideation/2026-05-23-site-and-pipeline-ideation.md](../ideation/2026-05-23-site-and-pipeline-ideation.md) (Survivor #1)
- **Related code:** `src/content.config.ts`, `scripts/validate.mjs`, `scripts/buildReleasePrBody.mjs`, `scripts/migrate-to-frontmatter.mjs`, `.github/workflows/test.yml`, `.github/workflows/deploy.yml`, `TEMPLATE.md`, `CLAUDE.md`
- **Related issue:** #9 (drink-spec icons) — downstream consumer of structured `glass` and `family` once they exist
- **External docs:** [Astro Content Layer](https://docs.astro.build/en/guides/content-collections/), [yaml npm package](https://www.npmjs.com/package/yaml)
