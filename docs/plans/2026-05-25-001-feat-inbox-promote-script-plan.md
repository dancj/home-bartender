---
title: "feat: Add npm run promote <slug> to one-shot inbox → published"
status: active
plan_type: feat
plan_depth: standard
created: 2026-05-25
issue: 18
origin: https://github.com/dancj/home-bartender/issues/18
---

# feat: Add `npm run promote <slug>` to one-shot inbox → published

## Summary

Add `scripts/promote.mjs` and a corresponding `npm run promote <slug> --category=<classic|original|seasonal>` entrypoint that collapses today's three-step manual inbox→published ritual into one command. The script rewrites the recipe's frontmatter (singular `category`, `publish: true`), `git mv`s the file into the matching category directory, re-runs `npm run validate`, and rolls back atomically on validation failure. It also updates `src/pages/inbox.astro` and `CLAUDE.md` to surface the new command in place of the manual three-step prose.

This closes issue [#18](https://github.com/dancj/home-bartender/issues/18) and resolves idea #2 from `docs/ideation/2026-05-23-site-and-pipeline-ideation.md`.

---

## Problem Frame

Today, promoting an inbox draft to a published recipe takes three coordinated manual edits (per `CLAUDE.md` Recipe Pipeline §3):

1. `git mv recipes/inbox/<slug>.md recipes/<category>/<slug>.md`
2. Edit frontmatter: `category: inbox` → singular form (`classic` / `original` / `seasonal`)
3. Edit frontmatter: `publish: false` → `true`

Then re-run `npm run validate` to confirm slug uniqueness, dir/category coherence, and cross-refs.

This is the highest-traffic mutation path in the repo and the most error-prone — three coordinated edits across two surfaces (filesystem and frontmatter) with no atomic safety net. A typo in the category singular (`classics` instead of `classic`) ships a broken category mismatch that only the validator catches.

**Premise correction.** Issue #18 frames the inbox promotion fix as also closing a "documented lie": `src/pages/inbox.astro` referencing a non-existent `npm run publish` script. That cleanup actually landed in PR #27 (merged 2026-05-25). Both `src/pages/inbox.astro` and `CLAUDE.md` are already free of the broken reference. This plan still updates both surfaces, but the framing shifts from "fix the broken reference" to "replace the manual three-step ritual prose with a recommendation to use the new `npm run promote` automation."

---

## Goals

- Provide `npm run promote <slug> --category=<classic|original|seasonal>` that performs the full inbox→published mutation as one command.
- Roll back atomically on validation failure (no half-promoted recipes left in the working tree).
- Match the repository's existing Node-script conventions (ESM, hand-rolled argv, `execFile` subprocess discipline, dependency injection for testability).
- Preserve frontmatter formatting (key order, blank lines, body content) byte-for-byte except for the two intentional edits.
- Update contributor-facing copy in `src/pages/inbox.astro` and `CLAUDE.md` Recipe Pipeline §3 to recommend the new command.

## Non-Goals

- Auto-classifying drafts into `classic` / `original` / `seasonal` from content (explicitly out of scope in issue #18).
- Re-organising inbox UI gating or preview behaviour.
- Adding a `--pr` flag that auto-creates a feature branch and PR (deferred — see Scope Boundaries).
- Inferring category from a frontmatter hint field (deferred — see Scope Boundaries).
- Refactoring `scripts/validate.mjs`'s exit-code or output contract.

---

## Key Technical Decisions

### KTD-1: Line-targeted frontmatter rewrite, not YAML round-tripping

Use the line-targeted regex rewrite pattern from `scripts/migrate-styles-to-tags.mjs:63-83` (the `migrateFileContent` precedent) rather than parsing-and-re-serializing YAML.

**Why.** Naive YAML round-tripping via `yaml.parse` / `yaml.stringify` would re-sort keys, collapse blank lines, and normalize quoting — producing visible diff churn on every promotion. The existing corpus shows uniform frontmatter shape with stable key ordering, no anchors/aliases, no multi-line scalars, and no in-block comments, so two targeted line regexes (`^category:\s*inbox\s*$` and `^publish:\s*false\s*$`) are sufficient. This also matches the in-place-rewrite precedent already in the repo.

### KTD-2: Rollback strategy — pure-functions-first, atomic apply, reverse on validate failure

Compute the new content and target path in pure functions before any I/O. Apply atomically: write the new content to the inbox path, then `git mv` into the category dir, then `npm run validate`. On validation failure, reverse: `git mv` back, then `writeFile` the original captured content back.

**Why.** Matches the orchestrator-with-clear-commit-point precedent in `scripts/releaseChangelogRun.mjs` (the "after this, the version is committed to history" comment shape). Pure computation is unit-testable in isolation; the apply/undo half is exercised in integration only. Reversing `git mv` and restoring the original captured content is a complete reversal — the working tree returns to byte-for-byte its pre-script state.

### KTD-3: Export `CATEGORY_BY_DIR` from `scripts/validate.mjs`

The dir↔singular-category mapping currently lives as a non-exported `const` at `scripts/validate.mjs:23-28`. Export it and import into `promote.mjs` (deriving the inverse `DIR_BY_CATEGORY` locally).

**Why.** Two sources of truth for this mapping is exactly the kind of drift hazard CLAUDE.md already warns about for taxonomy. The existing duplicate in `scripts/migrate-to-frontmatter.mjs:40-45` (`CATEGORY_NORMALIZE`) is a soft-deprecated migration script we don't need to clean up here, but adding a third copy is not warranted.

### KTD-4: Subprocess discipline — `execFile` with explicit argv arrays

All `git` and `npm` calls go through `execFile` (promisified) with explicit argv arrays, not `execSync` or shell strings.

**Why.** Matches the explicit policy documented in `scripts/autoReleasePrRun.mjs:5-9` and `scripts/releaseChangelogRun.mjs:19`. Slugs are user-supplied and could theoretically contain shell metacharacters; argv-array invocation guarantees no shell tokenisation. The one `execSync` use in `scripts/migrate-to-frontmatter.mjs:211` is an anti-pattern the orchestrators were explicitly built to avoid — do not replicate it.

### KTD-5: Dependency-injection orchestrator + hand-rolled argv

`promote.mjs` exports an async `promote({ slug, category, dryRun, exec, readFile, writeFile, rootDir })` function (real deps from `node:child_process` and `node:fs/promises`, stubbed in tests). The CLI entry guard at the bottom of the file parses `process.argv.slice(2)` hand-rolled (includes-and-find pattern from `scripts/migrate-to-frontmatter.mjs:60-67` and `scripts/updateVersion.mjs:88-95`).

**Why.** Matches the canonical orchestrator shape established by `releaseChangelogRun.mjs` and `autoReleasePrRun.mjs`. Tests exercise the orchestrator with stubbed deps that record every call; no real filesystem or git mutation in test runs.

### KTD-6: Flag scope for this PR — ship `--dry-run`, defer `--pr` and category inference

Ship `--dry-run` (cheap, makes pre-flight inspection honest, easy to unit-test). Defer `--pr` (chains to `gh`; separable concern that can re-use the inbox-ingest pattern when added). Defer frontmatter-hint category inference (would imply a new optional schema field; not warranted until repeated friction is demonstrated).

**Why.** The issue explicitly lists all three as "worth considering during brainstorm" rather than required. Shipping the minimum useful surface plus `--dry-run` keeps the PR small, lets the script land and bake, and preserves clean follow-up shape if either deferred flag becomes worth building.

---

## High-Level Technical Design

The promote flow, expressed as directional pseudo-code (this illustrates intended approach and is directional guidance for review, not implementation specification):

```
promote({ slug, category, dryRun, exec, readFile, writeFile, rootDir }):
  # Pure phase — no I/O side effects
  assertValidCategory(category)                   # one of classic|original|seasonal
  srcPath = `${rootDir}/recipes/inbox/${slug}.md`
  dstDir  = `${rootDir}/recipes/${dirFor(category)}`   # classics|originals|seasonal
  dstPath = `${dstDir}/${slug}.md`

  original = await readFile(srcPath, 'utf8')      # throws clear error if missing
  newContent = rewritePromotionFrontmatter(original, { category })
                                                  # throws if already-promoted or malformed

  if dryRun:
    print summary of intended change, return     # no further side effects

  # Apply phase — atomic with rollback
  await writeFile(srcPath, newContent)            # frontmatter now flipped, still in inbox/
  await exec('git', ['mv', srcPath, dstPath])     # file relocated; commit point
  try:
    await exec('npm', ['run', 'validate'])        # rejects on non-zero exit
  catch validateError:
    await exec('git', ['mv', dstPath, srcPath])   # reverse the move
    await writeFile(srcPath, original)            # restore original bytes
    rethrow with clear "validation failed, rolled back" message

  print one-line success summary
  return { srcPath, dstPath, changed: true }
```

The pure phase is unit-testable with string fixtures and no deps. The apply phase is exercised with stubbed deps that record every call (matching `scripts/releaseChangelogRun.test.mjs` and `scripts/autoReleasePrRun.test.mjs`).

---

## Implementation Units

### U1. Export `CATEGORY_BY_DIR` from `scripts/validate.mjs`

**Goal:** Make the dir↔singular-category mapping a shared, importable truth.

**Requirements:** Supports KTD-3.

**Dependencies:** None.

**Files:**
- `scripts/validate.mjs` — add `export` keyword to existing `CATEGORY_BY_DIR` const at lines 23–28.

**Approach:** Single one-word edit. The const is already shaped correctly; just lift its visibility. Existing imports of `parseFrontmatter` and `parseScalar` from this file already prove the export-and-import shape works for `validate.mjs` consumers.

**Patterns to follow:** Existing exported helpers in the same file: `export function parseFrontmatter(...)` at line 41, `export function parseScalar(...)` at line 74.

**Test scenarios:** `Test expectation: none -- pure visibility change of an existing const; no behavioral change. The existing scripts/validate.test.mjs suite still passes unchanged.`

**Verification:** `npm test` continues to pass; `import { CATEGORY_BY_DIR } from './validate.mjs'` resolves from a sibling script.

---

### U2. Pure frontmatter rewriter and category helpers

**Goal:** Pure functions that validate inputs, map category → dir, and compute the rewritten file content. No I/O. Unit-testable with string fixtures.

**Requirements:** Supports KTD-1, KTD-3.

**Dependencies:** U1 (imports `CATEGORY_BY_DIR`).

**Files:**
- `scripts/promote.mjs` — new file (helpers only at this stage; orchestrator and CLI come in U3 and U4).
- `scripts/promote.test.mjs` — new file.

**Approach:** Three exported pure helpers:
- `assertValidCategory(category)` — throws if not one of `classic | original | seasonal`. Inbox is intentionally excluded (you cannot promote *into* inbox).
- `dirForCategory(category)` — returns the dir name (`classics` / `originals` / `seasonal`), derived from inverting `CATEGORY_BY_DIR`. Throws on unknown.
- `rewritePromotionFrontmatter(content, { category })` — returns the rewritten content. Implementation pattern mirrors `scripts/migrate-styles-to-tags.mjs:63-83`: detect frontmatter bounds, split into lines, regex-rewrite the two target lines, reassemble. Throws if either target line is missing (the file is already promoted or malformed).

**Execution note:** Test-first per CLAUDE.md TDD discipline. Write each helper's tests before the implementation.

**Patterns to follow:**
- `scripts/migrate-styles-to-tags.mjs:63-83` (`migrateFileContent`) — the canonical line-targeted frontmatter rewriter.
- `scripts/validate.mjs:41-72` (`parseFrontmatter`) — frontmatter-bounds detection convention.
- `scripts/validate.test.mjs` — pure-function test style (string fixtures, assert on return values).

**Test scenarios:**
- `assertValidCategory('classic' | 'original' | 'seasonal')` returns without throwing.
- `assertValidCategory('classics')` throws (common pluralization mistake).
- `assertValidCategory('inbox')` throws (cannot promote *to* inbox).
- `assertValidCategory(undefined | '' | null)` throws.
- `dirForCategory('classic')` returns `'classics'`; `'original'` returns `'originals'`; `'seasonal'` returns `'seasonal'`.
- `dirForCategory('unknown')` throws.
- `rewritePromotionFrontmatter` on a canonical inbox recipe with `category: inbox` and `publish: false` produces output where both lines are flipped and every other byte is preserved (including blank lines, indentation, and the body after the closing `---`).
- `rewritePromotionFrontmatter` throws when the `category: inbox` line is absent (file already promoted, or hand-edited away from the expected shape).
- `rewritePromotionFrontmatter` throws when the `publish: false` line is absent.
- `rewritePromotionFrontmatter` throws when the frontmatter block is missing entirely (no leading `---\n` or no closing `\n---\n`).
- `rewritePromotionFrontmatter` propagates the same `assertValidCategory` error when given a bad category.
- `rewritePromotionFrontmatter` does not touch frontmatter keys other than `category` and `publish` (regression guard against an over-eager regex).

**Verification:** `npm test` passes; the new test file appears in the Vitest summary.

---

### U3. Orchestrator: `promote()` with dependency injection

**Goal:** Compose the pure helpers with injected I/O deps to perform the full promotion (read → rewrite → write → git mv → validate → success, or rollback on validate failure).

**Requirements:** Supports KTD-2, KTD-4, KTD-5.

**Dependencies:** U2.

**Files:**
- `scripts/promote.mjs` — add the exported `promote(...)` orchestrator below the U2 helpers.
- `scripts/promote.test.mjs` — extend with orchestrator tests using a `makeDeps()` factory.

**Approach:** Single exported async function `promote({ slug, category, dryRun = false, exec, readFile, writeFile, rootDir })` that:
1. Calls `assertValidCategory(category)`.
2. Asserts `slug` is a non-empty string with no slashes (basic guard against path-traversal in argv).
3. Computes `srcPath` and `dstPath`.
4. `await readFile(srcPath, 'utf8')` — clear error message including the path if missing.
5. Pre-flight: ensure no file exists at `dstPath` yet (slug-collision guard before any mutation). Use a thin injectable `fileExists` dep or `readFile` + catch — pick whichever keeps the dep surface narrow.
6. Compute `newContent` via `rewritePromotionFrontmatter`.
7. If `dryRun`: print summary (`would promote <slug>: <srcPath> → <dstPath>`) and return `{ srcPath, dstPath, changed: false, dryRun: true }`.
8. `await writeFile(srcPath, newContent)`.
9. `await exec('git', ['mv', srcPath, dstPath])`.
10. `await exec('npm', ['run', 'validate'])` inside try/catch.
11. On catch: `await exec('git', ['mv', dstPath, srcPath])` then `await writeFile(srcPath, original)`; rethrow with a clear "validation failed; rolled back" message that includes the underlying validator stderr.
12. Print one-line success summary; return `{ srcPath, dstPath, changed: true }`.

**Execution note:** Test-first with stubbed deps. Tests record every `exec`, `readFile`, `writeFile` call and assert on the argv arrays (matching the existing orchestrator test style).

**Technical design:** Directional pseudo-code in the High-Level Technical Design section above. Not implementation specification.

**Patterns to follow:**
- `scripts/releaseChangelogRun.mjs:40-113` — the canonical DI orchestrator shape with required-deps guard at the top.
- `scripts/releaseChangelogRun.test.mjs:11-86` — `makeDeps()` factory returning `{ gh, exec, readFile, writeFile, calls, written }` with `calls.*` arrays recording every invocation.
- `scripts/autoReleasePrRun.test.mjs:151-167` — shell-injection guard test (assert recorded argv arrays).
- `scripts/autoReleasePrRun.mjs:5-9` — the subprocess-discipline comment to mirror at the top of `promote.mjs`.

**Test scenarios:**
- **Happy path** — given an existing inbox file with canonical frontmatter, `promote({ slug, category: 'classic', ... })` results in: 1 `readFile` of the inbox path, 1 `writeFile` of new content to the inbox path, 1 `exec` of `['git', 'mv', srcPath, dstPath]`, 1 `exec` of `['npm', 'run', 'validate']`, returns `{ changed: true }`, prints a one-line summary.
- **Dry run** — given the same inputs with `dryRun: true`, results in: 1 `readFile`, 0 `writeFile`, 0 `exec` calls. Returns `{ dryRun: true, changed: false }`. Prints a "would promote" summary.
- **Missing inbox file** — `readFile` rejects → orchestrator throws an error mentioning the slug and the expected path. Zero subsequent deps called.
- **Slug collision** — when `dstPath` already exists, the orchestrator throws before any `writeFile` / `git mv`. No rollback needed because no mutation happened.
- **Already-promoted file** — `rewritePromotionFrontmatter` throws (the `category: inbox` line is absent). The orchestrator propagates the error; no `writeFile`, no `git mv`, no validate call.
- **Invalid category arg** — `assertValidCategory` throws; orchestrator never touches the filesystem.
- **Invalid slug** — slug with a slash, or empty, throws before any I/O.
- **Validation failure → rollback** — `exec` for `npm run validate` rejects. Orchestrator then calls `exec(['git', 'mv', dstPath, srcPath])` AND `writeFile(srcPath, original)`. Final state of recorded calls matches: read → write(new) → mv(src→dst) → validate(fail) → mv(dst→src) → write(original). Orchestrator re-throws an error message that includes both the underlying validator failure and "rolled back" wording.
- **Subprocess argv shape** — every recorded `exec` call uses `(cmd, argvArray)`, never a single shell string (assert via test inspection of the recorded calls).
- **Rollback step itself fails** — when the reverse `git mv` rejects, orchestrator throws a combined error that surfaces both the original validate failure and the rollback failure, so the user sees the partial state explicitly (no silent swallow).

**Verification:** `npm test` passes; the orchestrator tests cover every branch listed above.

---

### U4. CLI entry guard, argv parsing, and `package.json` wiring

**Goal:** Make `node scripts/promote.mjs <slug> --category=<...>` and `npm run promote -- <slug> --category=<...>` work end-to-end.

**Requirements:** Supports KTD-5, KTD-6.

**Dependencies:** U3.

**Files:**
- `scripts/promote.mjs` — add CLI entry guard at the bottom and an exported `parseArgs(argv)` helper for unit testing.
- `scripts/promote.test.mjs` — extend with `parseArgs` tests.
- `package.json` — add `"promote": "node scripts/promote.mjs"` to the `scripts` block.

**Approach:** Hand-rolled argv parsing matching the house style:
- Exported pure helper `parseArgs(argv: string[])` returns `{ slug, category, dryRun }` (or throws with a clear usage error for missing/invalid input).
- Positional slug is the first non-`--` argument.
- `--category=<value>` form (issue #18 specifies this shape exactly).
- `--dry-run` boolean flag.
- Unknown flags produce a clear usage error.
- CLI guard at file bottom: `if (fileURLToPath(import.meta.url) === process.argv[1]) { promote({ ...parseArgs(process.argv.slice(2)), exec: realExec, readFile, writeFile, rootDir: ROOT }).catch(e => { console.error(e.message ?? e); process.exit(1); }); }`.
- Print a one-line usage hint when args are missing or malformed: `Usage: npm run promote -- <slug> --category=<classic|original|seasonal> [--dry-run]`.

**Patterns to follow:**
- `scripts/migrate-to-frontmatter.mjs:60-67` — the includes-pattern for boolean flags.
- `scripts/updateVersion.mjs:88-95` — argv-includes subcommand shape.
- `scripts/releaseChangelogRun.mjs:175-200` — the canonical CLI guard at the bottom.
- `scripts/codegen-taxonomy.mjs:135-138` — plain-text success log shape.

**Test scenarios:**
- `parseArgs(['my-recipe', '--category=classic'])` returns `{ slug: 'my-recipe', category: 'classic', dryRun: false }`.
- `parseArgs(['my-recipe', '--category=classic', '--dry-run'])` returns `{ ..., dryRun: true }`.
- `parseArgs(['--category=classic', 'my-recipe'])` returns the same — flag/positional order doesn't matter.
- `parseArgs([])` throws a usage error.
- `parseArgs(['my-recipe'])` (no category) throws a usage error mentioning `--category=`.
- `parseArgs(['--category='])` (empty value) throws a usage error.
- `parseArgs(['my-recipe', '--unknown'])` throws a usage error mentioning the unknown flag.
- `parseArgs(['my-recipe', '--category=classic', '--category=original'])` — pick one deterministic behavior (last wins OR reject duplicates) and test it.

**Verification:** `npm run promote -- nonexistent-slug --category=classic` exits 1 with the "file not found" error (manual smoke); the script appears in `npm run` listings.

---

### U5. Update `src/pages/inbox.astro` copy to recommend `npm run promote`

**Goal:** Replace the manual three-step ritual prose at lines 26–30 with a one-liner recommending `npm run promote <slug>`.

**Requirements:** Closes the loop with issue #18's "fix the documented lie" intent (now reframed — see Problem Frame).

**Dependencies:** U3, U4 (the script and `npm run promote` must exist before the page recommends them).

**Files:**
- `src/pages/inbox.astro` — replace lines 25–30 (the `<p class="lede">` block).

**Approach:** New copy should:
- Surface the canonical invocation: `npm run promote &lt;slug&gt; --category=&lt;classic|original|seasonal&gt;`.
- Mention what the script does in one clause (rewrites frontmatter, moves the file, re-runs validate).
- Drop the now-redundant `npm run validate` follow-up sentence — the promote script chains it automatically.
- Keep the Inbox page's tone (concise, informational) consistent with the rest of the file.

**Patterns to follow:** Existing `<code>` markup in the same file (lines 27–29) for the code-formatting style; no new patterns introduced.

**Test scenarios:** `Test expectation: none -- copy-only change to a static Astro template, no behavioral surface. astro check (run via npm run build) continues to pass.`

**Verification:** `npm run build` succeeds; visiting `/inbox/?preview=1` locally shows the updated prose pointing at `npm run promote`.

---

### U6. Update `CLAUDE.md` Recipe Pipeline §3 to surface the new automation

**Goal:** Rewrite step 3 ("Publish") in the Recipe Pipeline lifecycle so contributor-facing instructions reflect the new automation.

**Requirements:** Closes the loop with issue #18's contributor-docs intent (now reframed — see Problem Frame).

**Dependencies:** U3, U4.

**Files:**
- `CLAUDE.md` — rewrite step 3 of the Lifecycle section (lines 124–127).

**Approach:** Collapse step 3 from the three manual sub-steps to a single line: `**Publish** — run`npm run promote <slug> --category=<classic|original|seasonal>` (rewrites frontmatter, git mv's into the matching category dir, re-runs validate; rolls back on failure).` Keep step 4 (validate as safety net) intact — it still applies when authors hand-edit recipes outside of the promote flow.

**Patterns to follow:** Numbered-list step shape established in the surrounding Lifecycle section.

**Test scenarios:** `Test expectation: none -- docs-only change. The validator does not lint CLAUDE.md.`

**Verification:** `CLAUDE.md` renders correctly on GitHub; the Lifecycle section's numbered list remains coherent (steps 1–4 still cohesive).

---

## Scope Boundaries

**In scope (this PR):**
- New `scripts/promote.mjs` and `scripts/promote.test.mjs`.
- Export of `CATEGORY_BY_DIR` from `scripts/validate.mjs`.
- `"promote"` entry in `package.json`'s `scripts` block.
- `--dry-run` flag.
- Atomic rollback on validation failure (reverse `git mv` + restore original content).
- Updates to `src/pages/inbox.astro` and `CLAUDE.md` Recipe Pipeline §3.

**Out of scope (per issue #18):**
- Auto-classifying drafts into `classic` / `original` / `seasonal` from content.
- Reorganising the inbox UI itself (preview gating, etc.).

### Deferred to Follow-Up Work

- **`--pr` flag.** Chain through to `git checkout -b feat-promote-<slug>`, commit, push, and `gh pr create`. Worth doing once the base script bakes; can re-use the inbox-ingest pattern documented in CLAUDE.md. File as a follow-up issue when needed.
- **Category inference from a frontmatter hint field.** Would let drafts carry an `intended_category: classic` hint so contributors don't need to pass `--category=`. Implies a schema decision (new optional field in `src/content.config.ts`) that is bigger than the promote script itself. Defer until repeated friction is observed.
- **Pre-flight `git status` check / dirty-tree warning.** Useful UX guardrail; defer until the first time someone gets bitten.
- **Promoting multiple slugs in one invocation** (e.g., `npm run promote -- slug-a slug-b --category=classic`). Not in issue #18.

---

## Risks & Open Questions

### R1: Working tree state when rollback runs

**Risk:** If the user has unrelated staged or unstaged changes when invoking the script, a rollback (`git mv` + `writeFile`) leaves those unrelated changes intact but mixed with the promote's reverse mutations. The user could be confused about working-tree state.

**Mitigation:** Document the expectation in the success/failure summary lines ("rolled back; your working tree is restored to its pre-promote state for these two paths"). The rollback only touches the two paths the script knows about; it does not invoke `git checkout` or `git stash`, so unrelated work is untouched. A future `--require-clean-tree` flag is a candidate follow-up.

**Confidence:** High — the rollback is scoped, deterministic, and limited to two known paths.

### R2: Rollback step itself failing

**Risk:** The reverse `git mv` or `writeFile` could fail (disk full, permission change, repository-state weirdness). The script must surface this loudly rather than swallow it.

**Mitigation:** U3 test scenario "Rollback step itself fails" covers this — the orchestrator throws a combined error including both the original validate failure and the rollback failure. The user sees the partial state explicitly.

**Confidence:** High — exercised by a dedicated test scenario.

### R3: Frontmatter shape drift

**Risk:** If a future recipe lands with non-canonical frontmatter (e.g., `category : inbox` with whitespace, or a YAML comment, or quoted values), the line-targeted regex could miss it.

**Mitigation:** The rewriter throws cleanly when its target lines are absent, rather than silently no-op'ing. The user gets a clear error and falls back to the manual ritual for that one file. Schema-level enforcement of the inbox shape (Zod already enforces the enum) is the long-term answer.

**Confidence:** Medium — the existing corpus is uniform, but future drift is possible. Acceptable trade-off vs. YAML round-tripping churn.

### Open questions (deferred to implementation)

- Behavior on duplicate `--category=` flag in argv: last-wins vs. reject. Pick deterministically in U4 and assert via test.
- Exact wording of the success summary line — to be settled when writing U3's happy-path test.
- Exact wording of the new `inbox.astro` lede — to be settled when writing U5; should match the page's existing voice.

---

## System-Wide Impact

**Surface touched.** One new script + test (`scripts/promote.{mjs,test.mjs}`), one `package.json` script entry, one one-word export in `scripts/validate.mjs`, two copy updates (`src/pages/inbox.astro`, `CLAUDE.md`).

**Contracts changed.**
- `scripts/validate.mjs` gains a new export (`CATEGORY_BY_DIR`); the existing exports (`parseFrontmatter`, `parseScalar`) and CLI behavior are unchanged.
- `package.json` gains a new `"promote"` script; existing scripts are unchanged.
- No changes to taxonomy, content collection schema, or build pipeline.

**Affected parties.**
- **Recipe authors.** Replace a 3-step manual ritual with one command. Net positive.
- **CI.** No CI changes. The new script is not run in CI; it is a local authoring tool. `npm test` will pick up the new `scripts/promote.test.mjs` via the existing `vitest.config.ts:6` glob.
- **Future contributors.** New automation surface to maintain (~150 lines including tests). Matches existing script conventions, so maintenance cost is conventional.

**Performance / operational.** None. The script runs locally on a single file mutation.

---

## Verification Strategy

- **Unit:** `npm test` exercises every pure helper and every orchestrator branch (happy, dry-run, missing file, slug collision, already-promoted, invalid args, validation failure → rollback, rollback failure).
- **Integration smoke (manual):** With a test inbox draft in the working tree:
  - `npm run promote -- <slug> --category=classic --dry-run` prints the would-promote summary and leaves the working tree unchanged.
  - `npm run promote -- <slug> --category=classic` performs the promotion and prints a success summary; `git status` shows the file renamed and the two intentional frontmatter edits.
  - Introduce a deliberate validation failure (e.g., duplicate slug) and re-run; the script reports the validator failure, rolls back, and `git status` returns to the pre-script state.
- **TypeScript / Astro:** `npm run build` runs `astro check`. The script changes don't touch TypeScript, so this is a regression guard rather than active coverage.

---

## Out-of-Band References

- Issue: [#18](https://github.com/dancj/home-bartender/issues/18) "Add npm run promote <slug> to one-shot inbox → published"
- Source ideation: `docs/ideation/2026-05-23-site-and-pipeline-ideation.md` (idea #2)
- Closest in-repo precedents: `scripts/releaseChangelogRun.mjs`, `scripts/autoReleasePrRun.mjs` (orchestrator + DI shape), `scripts/migrate-styles-to-tags.mjs` (line-targeted frontmatter rewrite), `scripts/validate.mjs` (frontmatter parsing + dir/category mapping).
- CLAUDE.md: Recipe Pipeline §3 (Lifecycle, lines 124–127), TDD discipline (lines 31–44), Branch naming (lines 18–29), PR-closing keywords (lines 48–55).
