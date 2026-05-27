---
title: "feat: DX hardening bundle — pre-commit hook, .astro CI cache, named deploy gates"
type: feat
status: active
created: 2026-05-26
issue: 20
related_ideation: docs/ideation/2026-05-23-site-and-pipeline-ideation.md
---

# DX hardening bundle — pre-commit hook, `.astro` CI cache, named deploy gates

## Summary

Ship three of the four sub-changes named in issue #20 as one PR (or short series) targeting `staging`:

1. **Husky + lint-staged pre-commit hook** that runs `node scripts/validate.mjs --files <staged>` on staged `recipes/**/*.md`, catching taxonomy / `related[]` / dir-category errors locally in <5s instead of waiting on the ~90s CI roundtrip.
2. **`.astro/data-store.json` cache** in `.github/workflows/deploy.yml`, keyed on a hash of content + lockfile + schema files, to warm the Astro Content Layer between deploys.
3. **Structured `PASS|HOLD: <stage>, <reason>` summary lines** appended to `$GITHUB_STEP_SUMMARY` from each meaningful step in `deploy.yml`, so the next regression is a one-glance diagnosis from the job summary tab.

The fourth piece from the issue — auto-tagging on main merge with `v$(date +%Y%m%d)` — is **out of scope**. The existing `.github/workflows/release-changelog.yml` workflow already creates `release-<SemVer>` tags on every `Release: staging to main` merge, writes `VERSION.json`, and updates `CHANGELOG.md`. Adding parallel CalVer date tags would dual-tag every release with no compounding value; replacing the SemVer scheme is a much larger blast radius and explicitly not what the user wants. Drop with prejudice; the existing tagging mechanism is enough.

---

## Problem Frame

The inner loop has three slow / opaque seams:

- **Pre-commit gap.** The full validate + test + build cycle runs only in CI (~90s). Common authoring errors (a typo in `spirits:`, a dangling `related:` slug, a recipe in the wrong category dir) currently fail in CI, requiring a force-push round-trip.
- **Cold `.astro` content layer.** `deploy.yml` runs `astro check && astro build` from scratch on every push. Astro 6 maintains a `.astro/data-store.json` for the Content Layer; external reports (walterra.dev) and `withastro/action` defaults indicate caching this file cuts content-heavy site builds from ~10min to ~30s. The current `actions/setup-node@v6` step already caches `node_modules` via `cache: npm`; only `.astro` is missing.
- **Opaque CI output.** `deploy.yml` has five meaningful steps (`Validate recipe frontmatter`, `Run tests`, `Verify generated taxonomy is current`, `Build site`, `Upload artifact`). When something fails, diagnosis requires scrolling through job logs. Naming each stage with a one-line `PASS|HOLD: <stage>, <reason>` summary turns the GitHub job summary tab into the "which gate failed and why" dashboard.

None of these are individually high-value enough to justify a dedicated PR. Bundled, they materially compress the inner loop and pay back on every future push.

---

## Requirements

Traceability back to issue #20 (closing keywords applied in the PR body):

- **R1.** Pre-commit hook runs `node scripts/validate.mjs --files` on staged `recipes/**/*.md` and blocks the commit on validation errors. Hook executes in <5s on a small staged set on a developer machine.
- **R2.** `.astro/data-store.json` is cached in `deploy.yml` keyed on a hash that includes `recipes/**`, `sections/**`, `data/taxonomy.yaml`, `package-lock.json`, `src/content.config.ts`, and `astro.config.mjs`. Cache hit produces a warm content layer for `astro check && astro build`.
- **R3.** Each meaningful step in `deploy.yml` appends one line to `$GITHUB_STEP_SUMMARY`. Grammar: `PASS: <stage>` on success, `HOLD: <stage>, <reason>` on failure. `<stage>` matches the step's display name verbatim.
- **R4.** None of the above breaks the existing CI gates (Vitest, taxonomy drift check, `astro check`, Pagefind index) or the release-PR / changelog automation.
- **R5.** Existing contributor workflow remains npm-only — no new binary install steps. (Drives the husky-vs-Lefthook choice.)

---

## Key Technical Decisions

### Pre-commit tooling: husky + lint-staged (not Lefthook)

The issue offers Lefthook *or* husky as alternatives. Choosing husky + lint-staged keeps the install story pure `npm ci` — no extra binary in the contributor's `PATH`, no separate config file format to learn. Trade-off accepted: husky's `prepare` script runs on every `npm install` (~100ms overhead). The hook surface for this repo is small enough that lint-staged's per-file glob handling is more than sufficient — Lefthook's parallelism wouldn't pay off here.

### File-scoped validate via slug-map-from-full-tree

`scripts/validate.mjs` currently walks the entire `recipes/` tree on every invocation. The pre-commit path needs file scoping to stay fast, but two cross-file checks (`related[]` slug resolution, duplicate-slug detection) require the full slug map. The honest fix: in `--files` mode, still walk the full tree to build the slug map (cheap — frontmatter parse only), but only emit errors / warnings for files in the staged set. This preserves full-fidelity cross-file checks at near-zero cost. The full whole-tree run continues to live in CI.

### Cache `.astro/data-store.json` specifically, not the whole `.astro/` directory

`.astro/settings.json` is mutated by Astro on every invocation (it carries `_variables.lastUpdateCheck`, a timestamp). Caching the whole `.astro/` directory would force a key recomputation on every save, defeating the cache. Cache the data-store file alone.

### Cache `deploy.yml` only; skip `test.yml`

Issue #20 names both workflows. `test.yml` runs `npm test` (Vitest, `environment: 'node'`) plus the `npm run codegen` drift check — neither reads `.astro/data-store.json`. Adding the cache there is dead weight today and grows the key surface for no payoff. Revisit if `astro check` ever joins `test.yml`. `node_modules` is already cached in both workflows via `setup-node@v6`'s `cache: npm` — that piece is already done.

### Cache-key inputs widened beyond the issue's proposal

Issue proposes `hashFiles('recipes/**', 'sections/**', 'package-lock.json')`. Adding `data/taxonomy.yaml`, `src/content.config.ts`, and `astro.config.mjs` to the key covers two more invalidation paths the issue's set misses: taxonomy enum changes (which alter the Zod schema applied to every recipe) and content-collection config changes. The cost is negligible; the safety upgrade is real.

### `PASS|HOLD` summaries via paired success + `if: failure()` steps

Two implementation shapes considered:

| Shape | Pros | Cons |
|---|---|---|
| Append `PASS: <stage>` at the end of each `run:` block + `if: failure()` post-step writing `HOLD: <stage>, see logs` for the same stage | Each gate is wrapped at the workflow level; no shell error trapping per step | Each gate needs two YAML entries |
| Wrap each step in a `bash` block with explicit `if`/`else` writing the line | One step per gate | Verbose `run:` blocks; harder to read; loses GH Actions step-status semantics |

Going with the paired-step shape — cleanest YAML and respects GH Actions native step status.

### `<reason>` text on HOLD lines

Keep `<reason>` short (≤80 chars). For the first pass: literal `"see logs"`. Capturing the stderr tail per step is a worthwhile follow-up but not in scope here — the value is gate-level legibility ("which stage held"), and "see logs" is a one-glance acceptable answer for an MVP.

---

## High-Level Technical Design

*This illustrates the intended approach and is directional guidance for review, not implementation specification.*

**`deploy.yml` job structure after the change** (sketch — actual YAML shape decided in U3/U4):

```text
build job:
  Checkout
  Setup Node                            (existing; already caches node_modules)
  Cache .astro/data-store.json          (NEW: U3 — actions/cache@v4)
  Install dependencies (npm ci)
  Validate recipe frontmatter           → PASS|HOLD line                (U4)
  Run tests                             → PASS|HOLD line                (U4)
  Verify generated taxonomy is current  → PASS|HOLD line                (U4)
  Build site                            → PASS|HOLD line                (U4)
  Upload artifact                       → PASS|HOLD line                (U4)

deploy job:                             (unchanged)
  Deploy to GitHub Pages
```

**Pre-commit flow**:

```text
git commit
  → .husky/pre-commit
    → npx lint-staged
      → glob "recipes/**/*.md" against staged set
      → if non-empty: node scripts/validate.mjs --files <staged paths>
        → walk full recipes/ for slug map
        → emit errors/warnings only for paths in --files set
        → exit 1 on any error
```

---

## Implementation Units

### U1. Extend `scripts/validate.mjs` with a `--files` mode

**Goal:** Add file-scoped validation alongside the existing full-tree mode, exposing a `--files <paths...>` flag without changing the default whole-tree behavior.

**Requirements:** R1

**Dependencies:** None

**Files:**
- `scripts/validate.mjs` (modify)
- `scripts/validate.test.mjs` (modify)

**Approach:**
- Extract the body of `main()` into an exported `runValidate({ rootDir, files })` function, mirroring the DI shape used by `promote()` (see `scripts/promote.mjs` `runPromote`). Default `files = []` means whole-tree behavior, preserving today's contract.
- Add `parseArgs(argv)` that recognizes `--files <path> [<path>...]`, following the convention in `scripts/promote.mjs` (`parseArgs` lines 218-257): explicit `USAGE` constant, throws on duplicate flag, throws on unknown flag, throws on empty `--files`.
- When `files` is non-empty:
  - Still walk the full `recipes/` tree to build the slug map (needed for `related[]` and alias resolution).
  - Normalize each `--files` entry to an absolute path; de-dupe; resolve symlinks.
  - Silently skip entries outside `recipes/` (e.g., `sections/foo.md`, root-level files). lint-staged may pass any staged path matching the glob; defensive scope check belongs here, not in the hook.
  - Emit errors / warnings only when the offending file is in the `--files` set.
- Keep the existing CLI self-execution guard (`fileURLToPath(import.meta.url) === process.argv[1]`).
- Exit-code contract preserved: `process.exit(1)` on any errors, `0` on warnings-only.

**Execution note:** Implement test-first per CLAUDE.md.

**Patterns to follow:**
- `scripts/promote.mjs` `parseArgs` (argv parser shape, USAGE constant, error grammar)
- `scripts/promote.mjs` `runPromote` (exported pure function, DI-friendly signature)
- `scripts/validate.test.mjs` existing tests (Vitest, named imports, no script spawning)

**Test scenarios:**
- `parseArgs`:
  - `parseArgs(['--files', 'a.md', 'b.md'])` → `{ files: ['a.md', 'b.md'] }`
  - `parseArgs([])` → `{ files: [] }` (default mode)
  - `parseArgs(['--files'])` → throws "missing argument" with USAGE
  - `parseArgs(['--files', 'a.md', '--files', 'b.md'])` → throws "duplicate flag"
  - `parseArgs(['--unknown', 'x'])` → throws "unknown flag"
- `runValidate({ rootDir, files: [] })` (whole-tree mode):
  - Behaves identically to today: walks `recipes/`, returns same error / warning set
  - Returns same summary shape (count of files scanned, errors, warnings)
- `runValidate({ rootDir, files: [valid recipe] })`:
  - No errors emitted
  - Slug map still built from full tree (verified by ensuring a sibling broken-`related` file does NOT pollute output)
- `runValidate({ rootDir, files: [recipe with bad taxonomy value] })`:
  - Errors only for the named file
- `runValidate({ rootDir, files: [recipe whose related[] points to non-existent slug] })`:
  - Error surfaces (proves slug map covers full tree)
- `runValidate({ rootDir, files: [recipe A, recipe B with bad dir/category mismatch] })`:
  - Error surfaces for B only; A clean
- `runValidate({ rootDir, files: [path outside recipes/] })`:
  - Silently skipped (no error, no warning, no count increment)
- `runValidate({ rootDir, files: [absolute path], rootDir-relative same file })`:
  - De-dupes; no double-reporting
- CLI exit code: behavior verified by importing and asserting return shape — do not spawn the script in tests (matches existing repo convention)

**Verification:** New + existing Vitest tests pass. Manual smoke: `node scripts/validate.mjs --files recipes/classics/manhattan.md` exits 0; introducing a typo to that file's `spirits:` field makes it exit 1 with the same error string as the full-tree run.

---

### U2. Wire up husky + lint-staged

**Goal:** Install husky, configure lint-staged, and add the `.husky/pre-commit` hook that runs `node scripts/validate.mjs --files` on staged `recipes/**/*.md`.

**Requirements:** R1, R5

**Dependencies:** U1 (needs `--files` mode)

**Files:**
- `package.json` (modify — add devDeps, add `prepare` script, add `lint-staged` config block)
- `.husky/pre-commit` (create — checked into git per husky convention)

**Approach:**
- Install latest stable `husky` and `lint-staged` (currently husky v9, lint-staged v16) as devDependencies. Use exact version selectors matching the repo's existing caret-range style (e.g., `"husky": "^9.x.x"`).
- Add `"prepare": "husky"` to `package.json` scripts. This runs on every `npm install` / `npm ci` and creates the local git hook wiring. It's a no-op outside a git repo (e.g., in deployment Docker images) — safe.
- Create `.husky/pre-commit` with a single line: `npx lint-staged`. No shebang line is needed under husky v9 (the v9 init format dropped it). Make it executable (`chmod +x`).
- Add a `lint-staged` block to `package.json`:
  ```json
  "lint-staged": {
    "recipes/**/*.md": "node scripts/validate.mjs --files"
  }
  ```
  lint-staged appends staged file paths to the command. `sections/**/*.md` is intentionally **not** included — `validate.mjs` does not currently walk `sections/`, so a hook there would be a no-op (see Deferred to Follow-Up Work).
- Skip TDD per CLAUDE.md — this unit is boilerplate wiring (devDep additions, npm-script entry, hook script, lint-staged config). Verification is manual.

**Test scenarios:** Test expectation: none — pure config / wiring per CLAUDE.md ("config changes, boilerplate wiring"). Verification is manual (see below).

**Patterns to follow:**
- husky v9 install pattern (single `prepare` script, no shebang in hook files)
- lint-staged config in `package.json` (matches repo convention — no top-level `.lintstagedrc` file; existing config lives in `package.json` or in tool-specific `.config` files only when required by the tool)

**Verification:**
1. Fresh `npm install` creates `.husky/_/` and installs the pre-commit hook.
2. Stage a clean recipe → `git commit` succeeds in <5s.
3. Stage a recipe with a taxonomy typo (e.g., `spirits: [whisky_]`) → `git commit` is rejected with validate.mjs's error output. Restoring the typo and re-committing succeeds.
4. Stage a `sections/*.md` change → commit succeeds (no validate run; expected per the lint-staged glob).
5. Stage a non-`.md` change → commit succeeds (no validate run).
6. `git commit --no-verify` still works as an emergency override (but is explicitly discouraged per CLAUDE.md "never skip hooks").

---

### U3. Cache `.astro/data-store.json` in `deploy.yml`

**Goal:** Warm the Astro Content Layer between deploys to compress `astro check && astro build` runtime.

**Requirements:** R2

**Dependencies:** None

**Files:**
- `.github/workflows/deploy.yml` (modify)

**Approach:**
- Add an `actions/cache@v4` step after `Setup Node` and before `Install dependencies`. Step name: `Cache Astro data store`.
- `path: .astro/data-store.json` — cache the data store file specifically, not the whole `.astro/` directory (`.astro/settings.json` mutates on every Astro invocation and would invalidate the key constantly).
- `key:` template:
  ```yaml
  key: ${{ runner.os }}-astro-data-store-${{ hashFiles('recipes/**', 'sections/**', 'data/taxonomy.yaml', 'package-lock.json', 'src/content.config.ts', 'astro.config.mjs') }}
  ```
- `restore-keys:` with the prefix `${{ runner.os }}-astro-data-store-` so partial cache hits still help cold runs after a content edit.
- Do NOT add the cache to `test.yml` (see Key Decisions). `test.yml` does not invoke Astro.

**Test scenarios:** Test expectation: none — workflow config; observed behavior is the only meaningful signal.

**Patterns to follow:**
- `actions/cache@v4` is the current major (aligns with the v5/v6 action pins already in use in `deploy.yml`).
- Existing workflow conventions: keep step names in human-readable Sentence Case (`Cache Astro data store`), match the existing indentation style, place the cache step immediately after `setup-node` (matches `actions/cache` documented placement).

**Verification:**
1. Push that triggers `deploy.yml`. First run: cache miss, full cold build, content layer rebuilt. Cache uploaded at job end.
2. Second push that touches only non-content files (e.g., a CSS change): cache hit — `astro check && astro build` runs noticeably faster, log shows `Cache restored from key: …`.
3. Push that edits a recipe: cache miss (key changes), `actions/cache` falls back to `restore-keys` prefix — partial restore. Build proceeds; data store rebuilt for the touched recipe.
4. Push that edits `data/taxonomy.yaml`: cache miss as expected (schema change invalidates).

---

### U4. Structured `PASS|HOLD` step summaries in `deploy.yml`

**Goal:** Each meaningful step in `deploy.yml` appends one line to `$GITHUB_STEP_SUMMARY` in the form `PASS: <stage>` (success) or `HOLD: <stage>, <reason>` (failure), making the GitHub job summary tab the one-glance gate dashboard.

**Requirements:** R3

**Dependencies:** None (independent of U1/U2/U3)

**Files:**
- `.github/workflows/deploy.yml` (modify)

**Approach:**
- For each of the five meaningful steps in the `build` job, append a one-line summary on completion:
  - `Validate recipe frontmatter`
  - `Run tests`
  - `Verify generated taxonomy is current`
  - `Build site`
  - `Upload artifact`
- Implementation shape: at the end of each step's `run:` block, append `echo "PASS: <stage>" >> "$GITHUB_STEP_SUMMARY"`. Immediately after each such step, add an `if: failure()` post-step (own `name:`, e.g., `Mark validate as HOLD on failure`) that appends `HOLD: <stage>, see logs`. The `if: failure()` step is a no-op on success and only fires when the preceding `run:` block exits non-zero.
- For the `Upload artifact` step (uses `actions/upload-pages-artifact@v5`, no `run:` block of our own), follow it with two paired steps: an `if: success()` step appending `PASS: Upload artifact`, and an `if: failure()` step appending `HOLD: Upload artifact, see logs`.
- Convention: `<stage>` matches the step's `name:` field verbatim. `<reason>` is `see logs` for the first pass (see Key Decisions on why stderr capture is deferred).

**Test scenarios:** Test expectation: none — workflow config; observed behavior is the only meaningful signal.

**Patterns to follow:**
- No existing `$GITHUB_STEP_SUMMARY` usage in any workflow today — this unit *establishes* the convention. Land it cleanly so future workflow edits can copy from it.
- Match existing step `name:` style (Sentence Case, no trailing punctuation).

**Verification:**
1. Trigger `deploy.yml` via `workflow_dispatch` on a clean `main` (or wait for the next merge). Job summary tab shows five `PASS:` lines in order:
   ```
   PASS: Validate recipe frontmatter
   PASS: Run tests
   PASS: Verify generated taxonomy is current
   PASS: Build site
   PASS: Upload artifact
   ```
2. On a draft branch, intentionally break one gate (e.g., introduce a taxonomy error and push to a branch that triggers `test.yml`; or temporarily target `deploy.yml` from a feature branch). Confirm the failed gate appears as `HOLD: <stage>, see logs` and downstream gates are absent (they never ran). Revert the intentional break before merging.

---

## Scope Boundaries

### In scope

- `scripts/validate.mjs` `--files` mode + tests
- `package.json` devDeps + `prepare` script + `lint-staged` config
- `.husky/pre-commit` hook script
- `.github/workflows/deploy.yml` — `.astro` cache step + `PASS|HOLD` summary lines

### Deferred to Follow-Up Work

- **Extend `validate.mjs` to also walk `sections/`** so pre-commit can cover section drafts. Today, `astro check` (Zod) at build time is the only check on sections. Tracked as: next iteration on validate scope.
- **Step-summary convention in `test.yml`.** Cheap to add for parity but not asked for in #20; lift this once the deploy.yml shape is bedded in.
- **Captured `<reason>` text on `HOLD` lines.** First-pass `see logs` is acceptable; capturing the stderr tail (last 1-3 lines of the failing step) makes the summary self-diagnostic. Worth a follow-up once the gate convention has lived for a few real failures.
- **Codegen-drift detection in pre-commit.** When `data/taxonomy.yaml` is staged without the three regenerated artifacts (`src/taxonomy.generated.ts`, `scripts/taxonomy.generated.mjs`, `TEMPLATE.md`), the pre-commit hook could block and prompt `npm run codegen`. The CI gate catches this today; local pre-commit would shorten the loop further.
- **Capture this work as a `docs/solutions/` learning entry post-merge.** No `docs/solutions/` directory exists today; this is a clean opportunity to seed it with (1) the `.astro/data-store.json` cache-key composition and failure mode, (2) the husky + lint-staged setup pattern for npm-only Astro repos, (3) the `PASS|HOLD: <stage>, <reason>` grammar and rationale. Run `/ce-compound` after merge.
- **CLAUDE.md "Pre-commit hooks" subsection** under Contributing — note what runs, how to skip (and that `--no-verify` is explicitly discouraged per the existing Git Safety Protocol). One paragraph. Can ship in the same PR as U2 if cheap, otherwise as a follow-up.

### Out of scope (explicit non-goals — preserved from issue #20)

- **CalVer auto-tag on main merge.** The existing `.github/workflows/release-changelog.yml` already creates `release-<SemVer>` tags + `VERSION.json` + CHANGELOG entries on every `Release: staging to main` merge. Dual-tagging adds noise without compounding value. Replacing SemVer with CalVer is a much larger blast radius and not what the user wants.
- **Lockfile manager change** (e.g., pnpm, yarn, bun). Issue explicit.
- **Cloudflare Pages PR previews / visual regression.** Tracked separately (idea #4 in `docs/ideation/2026-05-23-site-and-pipeline-ideation.md`).
- **Markdownlint / body-structure linter integration.** Tracked separately (likely the future issue referenced in #20 as `#TBD`).
- **Lefthook as the pre-commit tool.** Considered and rejected (see Key Decisions).
- **`release-changelog.yml` Node version bump** (currently Node 22 outlier; rest of CI is Node 24). Not part of #20.

---

## Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Cache key omits an invalidating input → stale `.astro/data-store.json` masks a real content-layer bug in CI | Medium | Medium | Widened key set (taxonomy + content config + astro config); on suspected staleness, manually clear cache via `gh actions cache delete` |
| husky `prepare` script fails on `npm ci` in CI (e.g., husky binary install issue) | Low | High (would block CI) | Husky v9's `prepare` is a no-op when run outside a git repo and is well-trodden in npm-only repos; pin husky version with `^9.x.x` and validate in a feature-branch CI run before merge |
| lint-staged stash behavior eats an uncommitted change | Low | Low | This is documented lint-staged behavior (it stashes, runs hooks, restores); contributors learn it once. Document `--no-verify` as emergency override in CLAUDE.md |
| `if: failure()` post-step misses an edge case (e.g., step canceled mid-run) | Low | Low | Acceptable — cancellation doesn't need a `HOLD` line; the workflow run status itself is the source of truth |
| Pre-commit slow-down on contributors with large staged sets | Low | Low | `--files` mode + lint-staged glob targets only `recipes/**/*.md`; large batched changes are rare in this repo. Worst case is bounded by full-tree slug-map build (~few hundred ms for current recipe count) |

---

## System-Wide Impact

- **Contributors:** First `npm install` after merge installs the pre-commit hook silently via husky's `prepare` script. From that point, committing a recipe with a taxonomy / `related[]` / dir-category error is blocked locally. Documented escape hatch is `--no-verify` (discouraged per existing CLAUDE.md Git Safety Protocol).
- **CI runtime:** `deploy.yml` second-and-onward runs should be materially faster on content edits (cache hit on `.astro/data-store.json` warms the content layer). `test.yml` is untouched. `release-changelog.yml` and `auto-release-pr.yml` are untouched.
- **Job summary tab:** `deploy.yml` runs now render a 5-line `PASS|HOLD` gate dashboard. No existing dashboards or external consumers depend on the prior empty summary, so this is purely additive.
- **Release pipeline:** Untouched. `release-changelog.yml` continues to be the only source of tags and VERSION.json updates.

---

## Sequencing & PR Strategy

Two viable shapes:

**Option A — single PR** (matches issue's "ideally in one PR"):
- Branch: `chore-20-dx-hardening`
- Lands all four units together. Smaller review thread for the workflow YAML diff, since reviewers see the cache + summaries together with their context.

**Option B — short series** (3 PRs against `staging`):
- `chore-20-pre-commit-hook` (U1 + U2)
- `chore-20-astro-cache` (U3)
- `chore-20-deploy-gates` (U4)
- Smaller PRs, easier to revert any one piece independently. The husky install (U2) becomes a self-contained change.

**Recommendation:** Option A unless review surface starts to feel unwieldy. The total diff is small (one script + one test + one config block + two workflow steps). Use `Closes #20` only in the final / single PR body; if Option B, use `Related to #20` on the first two and `Closes #20` on the last.

Decision deferred to `ce-work` time; both shapes respect CLAUDE.md branching and never-push-to-main rules.

---

## Origin & References

- Issue: [#20](https://github.com/dancj/home-bartender/issues/20)
- Ideation source: `docs/ideation/2026-05-23-site-and-pipeline-ideation.md` (idea #3)
- Related files:
  - `.github/workflows/deploy.yml`
  - `.github/workflows/test.yml`
  - `.github/workflows/release-changelog.yml` (touched only by the dropped sub-change (d); referenced here for context)
  - `scripts/validate.mjs`
  - `scripts/validate.test.mjs`
  - `scripts/promote.mjs` (pattern reference for `parseArgs` + DI shape)
  - `package.json`
  - `CLAUDE.md` (TDD requirement; PR-only workflow; Git Safety Protocol on `--no-verify`)
