---
date: 2026-05-23
topic: canonical-taxonomy-registry
---

# Canonical Taxonomy Registry

## Summary

Establish `data/taxonomy.yaml` as the single source of truth for the 8 enum-shaped recipe frontmatter fields. A small codegen script produces typed exports for `src/content.config.ts` (Zod) and `scripts/validate.mjs`, and rewrites the "Canonical Taxonomy" tables in `TEMPLATE.md`. CI fails when generated artifacts are stale. The site gains a new `family` field anchored to the Cocktail Codex 6 root drinks; the existing `styles` field is renamed to `tags` so it stays explicitly free-form.

---

## Problem Frame

Today the taxonomy that defines what a recipe *can* be lives in three places that must agree by hand. `src/content.config.ts` carries the Zod enums; `scripts/validate.mjs` carries parallel `Set`s for the same hard enums plus separate "canonical" sets that warn (not error) on `spirits`, `flavors`, `occasions`; `TEMPLATE.md` carries human-readable tables of the same values for contributor reference. `CLAUDE.md` explicitly instructs contributors to update at least the first two in lockstep when adding a value — that documented discipline is the smell. Drift is asymmetric and quiet: a value present in Zod but missing from the validator silently warns; a value present in the validator but missing from Zod hard-fails `astro check`; values added to the validator but not TEMPLATE.md make contributor reference rot.

A second pressure: the site has no concept of *cocktail family* even though Dan thinks in those terms (Cocktail Codex's 6 root drinks: Old Fashioned, Martini, Daiquiri, Sidecar, Whiskey Highball, Flip). The existing `styles` field has accumulated a mix of method words (`shaken`, `built`), flavor words (`floral`, `fruity`), and structure words (`highball`) — it doesn't carry the family meaning the user wants to assert.

The cost shows up every time taxonomy expands: a multi-file ritual gated by docs-as-discipline, with no machine check that the three files actually agree.

---

## Requirements

**Canonical source (the YAML)**

- R1. A new file `data/taxonomy.yaml` is the single source of truth for the 8 enum-shaped fields: `category`, `method`, `ice`, `difficulty`, `format`, `glass`, `spirits`, `flavors`, `occasions`, `family`, and (free-form, not enumerated) `tags`. Note: 8 enumerated + 1 free-form for clarity.
- R2. Each canonical value is an object with a required `slug` (kebab-case identifier) and required `label` (human-readable). Optional fields per entry: `source` (citation, e.g., `Cocktail Codex`), `note` (one-line description), `aliases` (array of alternate names — documentation only in v1).
- R3. The `family` enum holds exactly the Cocktail Codex 6 root drinks at v1: `old-fashioned`, `martini`, `daiquiri`, `sidecar`, `whiskey-highball`, `flip`. Each entry carries `source: Cocktail Codex` and a one-line `note`.
- R4. The `glass` enum starter list is exactly these 13 entries: `coupe`, `nick-and-nora`, `rocks`, `double-rocks`, `highball`, `collins`, `flute` (label: "Champagne flute"), `wine` (label: "Wine glass"), `margarita`, `martini`, `mug`, `snifter`, `julep-tin`. Covers current usage plus common drinkware a reader would expect. Future additions are intentional YAML edits.

**Codegen pipeline**

- R5. A new script (e.g., `npm run codegen` or `scripts/codegen-taxonomy.mjs`) reads `data/taxonomy.yaml` and produces three artifacts:
  - A TypeScript module exporting typed `as const` arrays + types for the Zod schema to import.
  - A `.mjs` sibling exporting the same arrays as plain JS for `scripts/validate.mjs` to import.
  - An in-place rewrite of the "Canonical Taxonomy" section of `TEMPLATE.md` between marker comments (e.g., `<!-- taxonomy:start -->` / `<!-- taxonomy:end -->`).
- R6. All generated artifacts are committed to the repo (not gitignored). Diffs to taxonomy land as both a YAML change and the matching regenerated artifacts in the same commit.
- R7. A CI check re-runs codegen and fails the build if any generated artifact differs from what was committed. Wires into the existing test workflow.
- R8. `npm run validate` continues to work and now reads its canonical sets from the generated `.mjs` artifact.

**Schema changes**

- R9. `src/content.config.ts` imports the generated TS module and replaces every `z.enum([...])` literal for the 8 enumerated fields with a reference to the generated arrays.
- R10. `spirits`, `flavors`, `occasions` change from `z.array(z.string())` to `z.array(z.enum(GENERATED))` — these fields now hard-fail `astro check` on uncanonical values, instead of warning.
- R11. A new `family` field is added: optional, single-value, hard enum bound to the generated family list.
- R12. `glass` changes from `z.string()` to `z.enum(GENERATED_GLASSES)`. A sibling `glass_note` field (`z.string().optional().default('')`) is added for prose alternates, mirroring the existing `method_note` / `ice_note` pattern.
- R13. The existing `styles` field is renamed to `tags`. It remains `z.array(z.string()).default([])` — explicitly free-form, not enumerated, not in the canonical YAML surface.

**Migration of existing recipes**

- R14. All 20 existing recipes have their `styles:` frontmatter key renamed to `tags:`. The values are preserved as-is.
- R15. All 20 existing recipes have their `glass:` frontmatter normalized to a single canonical slug, with any "or X" alternates moved into `glass_note`. The user reviews the canonical split per recipe.
- R16. Existing values for `spirits`, `flavors`, `occasions` are audited against the new hard enums before merge. Pre-flight audit shows current usage is within the existing canonical sets in `validate.mjs`, so the hardening is expected to be a no-op for recipe content — but the codegen CI gate must pass on the populated YAML before this PR can land.
- R17. The new `family` field is not auto-populated. It remains empty on existing recipes; the user fills it in over time as an intentional act per recipe.

**Contributor workflow**

- R18. `CLAUDE.md` is updated to replace the "update both files" instruction with the new flow: edit `data/taxonomy.yaml`, run `npm run codegen`, commit all changed files together.
- R19. The `Validation` section of `TEMPLATE.md` documents that the Canonical Taxonomy tables below it are auto-generated and warns against hand-editing within the marker comments.

---

## Acceptance Examples

- AE1. **Covers R7.** Given a contributor edits `data/taxonomy.yaml` to add a new spirit and commits the change *without* running codegen, when CI runs on the PR, the codegen-staleness step fails and the failure message names which generated files are out of date.
- AE2. **Covers R10.** Given a recipe lists `flavors: [yuzu]` and `yuzu` is not in `data/taxonomy.yaml`, when `npm run validate` or `astro check` runs, the build fails with a Zod error naming the field and the offending value.
- AE3. **Covers R11, R12.** Given a recipe declares `family: old-fashioned` and `glass: rocks` and `glass_note: "or coupe for citrus-forward riffs"`, when the site builds, the recipe page renders with the structured glass and an associated note. (Note: how the note renders is a planning-time UI question; the AE asserts the data shape parses cleanly, not the UI.)
- AE4. **Covers R14.** Given a recipe previously had `styles: [shaken, floral]`, when migration runs, the recipe's frontmatter has `tags: [shaken, floral]` and no `styles:` key remains.
- AE5. **Covers R5, R19.** Given a contributor runs `npm run codegen` after editing `data/taxonomy.yaml`, when they `git diff TEMPLATE.md`, the change is confined to the region between the marker comments and reflects the YAML edit.

---

## Success Criteria

- Adding a new canonical value (a new spirit, a new flavor, a new glass) is a single YAML edit plus a codegen run — no second file to remember.
- A contributor who forgets to run codegen is caught by CI, not by a quiet drift bug in production.
- The "update both files" instruction in `CLAUDE.md` is replaced with "edit one file."
- The 20 existing recipes pass `astro check` and `npm run validate` after migration.
- The Cocktail Codex 6 root drinks are queryable as data (`family` field), making future family-pivot pages and family-filter UI a join, not a parse.
- A downstream agent or implementer can ship this without inventing taxonomy values, deciding what the YAML schema looks like, or guessing about migration scope.

---

## Scope Boundaries

- **Functional alias normalization.** `aliases` in YAML entries is documentation-only in v1. Recipes must use the canonical slug; the validator does not rewrite `agave-spirit` to `mezcal`. If demand emerges, hardening aliases to functional aliases is a follow-up.
- **Auto-populating `family` on existing recipes.** The new field stays empty until the user fills it in per recipe.
- **Site UI consumption of metadata.** Generated `source` and `note` fields are not rendered anywhere in v1. They're latent data for future surfaces (e.g., an `/about/taxonomy` page).
- **Ingredient ontology.** Treating ingredients as a separate typed collection (idea #6 in the ideation doc) is a separate, larger track. This work is scoped to enum-shaped frontmatter fields, not the ingredient lines inside recipe bodies.
- **A structured editor / form UI.** Generating a form from the YAML for inbox ingestion is out of scope.
- **JSON API export of the taxonomy.** Adjacent ideation track; not this PR.
- **Pagefind search facets bound to the new fields.** Search integration is downstream.

---

## Key Decisions

- **YAML + codegen + committed artifacts**, not direct runtime read of YAML. Generated artifacts are committed so diffs are inspectable in PRs and so `astro build` / `validate.mjs` don't depend on a YAML parser at runtime. The cost — a small "edit YAML → run codegen → commit all" ritual — is the right trade for static-site portability.
- **CI staleness check is a hard fail**, not a warning. Matches the "intentional decisions to expand" posture; the user can re-evaluate if the ritual becomes annoying in practice.
- **Soft three (`spirits`, `flavors`, `occasions`) hardened to Zod enums.** Previous warning-only behavior allowed silent drift; hard enforcement makes additions intentional. Pre-flight audit confirms existing recipe content is already within the canonical sets, so this is a no-op for the 20 current recipes.
- **`family` as a new field rather than overloading `styles`.** The Codex anchor means what the book means; existing `styles` carries unrelated method/flavor/structure words that would dilute it. Renaming `styles` to `tags` preserves the existing free-form data and makes its purpose honest.
- **`glass` becomes single-value with `glass_note` for alternates**, mirroring the existing `method_note` / `ice_note` precedent. Each recipe has one canonical glass for icon rendering (issue #9) and filter UI; prose flexibility lives in the note.
- **Aliases documentation-only in v1.** Avoids the normalization machinery and the question of which spelling wins.
- **13-entry glass starter list.** `coupe`, `nick-and-nora`, `rocks`, `double-rocks`, `highball`, `collins`, `flute`, `wine`, `margarita`, `martini`, `mug`, `snifter`, `julep-tin`. Covers all current usage in the 20 existing recipes plus common drinkware. "Spritz glass" in current usage normalizes to `wine`; flag in migration PR.

---

## Dependencies / Assumptions

- Astro can resolve a TS module imported by `src/content.config.ts` that was emitted by codegen — assumed; standard Astro behavior.
- `scripts/validate.mjs` can `import { ... } from './taxonomy.generated.mjs'` — straightforward ESM.
- A YAML parser is available at codegen time (Node `yaml` package or similar). Adding a dev dependency is acceptable.
- The pre-flight audit of current recipe values vs canonical sets was correct (spirits clean, flavors clean apart from the `spicy` vs `spice` near-collision in old `styles` field which moves to `tags` so it doesn't break). A full re-audit at the start of implementation is part of the work.
- Issue #9 (drink-spec icons) will likely consume the new structured `glass` and `family` values once they exist — surfaced as context, not a hard dependency.

---

## Outstanding Questions

### Deferred to Planning

- [Affects R5][Technical] Codegen script details — what generates what (single script with multiple targets vs separate scripts per artifact), how `TEMPLATE.md` marker comments are detected and rewritten, whether codegen output is formatted via prettier.
- [Affects R7][Technical] Where the CI staleness check lives — extends `test.yml`, lives in a new workflow, or runs as part of `npm run validate`.
- [Affects R8][Technical] Whether `validate.mjs` continues to maintain its own warning lists alongside the new hard-enum gates, or whether the validator delegates entirely to Zod for enum membership and only retains its other checks (slug uniqueness, dir/category match, `related[]` resolution).
- [Affects R14, R15][Technical] Migration mechanics — a one-shot migration script that runs once and is deleted, vs interactive per-recipe glass review, vs a `--migrate` flag on `validate.mjs`.
- [Affects R10][Needs research] Confirm by re-running the audit at implementation time that no recipe uses an uncanonical `spirits` / `flavors` / `occasions` value. If found, decide per case: add to YAML (intentional expansion) or fix the recipe.
