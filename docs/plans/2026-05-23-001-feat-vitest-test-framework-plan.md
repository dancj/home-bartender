---
title: "feat: Add Vitest test framework"
type: feat
status: completed
created: 2026-05-23
origin: "GitHub issue #3 — Add Vitest test framework"
---

# feat: Add Vitest test framework

## Origin

GitHub issue [#3 — Add Vitest test framework](https://github.com/dancj/home-bartender/issues/3).

---

## Problem Frame

`CLAUDE.md` requires TDD red-green-refactor for all feature and bug-fix work, but the repo has no test runner — only `astro check` (TypeScript) and `npm run validate` (frontmatter). The current caveat tells the first TDD-needing change to bootstrap a runner inline, which bundles framework setup into unrelated PRs and creates ordering churn.

This plan wires up Vitest proactively, with an anchor test against the existing pure helpers in `scripts/validate.mjs`, so future TDD work can start immediately on `npm test`. CI is wired up alongside so tests gate both PRs and the production deploy.

---

## Scope

### In scope

- `vitest` devDependency and a minimal `vitest.config.ts` configured for Node-environment tests.
- `npm test` and `npm run test:watch` scripts in `package.json`.
- Smallest-possible refactor of `scripts/validate.mjs` to export its pure helpers and guard `main()` so importing the module from a test does not run the script.
- Anchor test covering `parseFrontmatter` and `parseScalar`.
- New `.github/workflows/test.yml` for PR and push-to-staging/main test runs.
- `npm test` step added to `.github/workflows/deploy.yml` so the production deploy is gated.
- `CLAUDE.md` Test-driven development section update to remove the "no framework wired up" caveat.

### Out of scope

- Astro component testing setup (`getViteConfig` from `astro/config`, happy-dom/jsdom). Defer until the first component test is written.
- Coverage of `main()`'s validation rules (enum checks, dangling `related[]` refs, dir/category mismatch). The anchor covers the pure helpers only.
- Tests for `scripts/migrate-to-frontmatter.mjs`.
- Branch protection rule changes (e.g., requiring `test.yml` to pass before merge). Set those after the workflow has run cleanly once.
- Coverage thresholds, `@vitest/coverage-v8`, `@vitest/ui`.

### Deferred to Follow-Up Work

- Extract validation rules from `main()` in `scripts/validate.mjs` into a pure `validateRecipe(fm, slug, dirName, slugs)` helper and add a fixture-driven integration test exercising taxonomy validation, dir/category mismatch, dangling `related[]`, and duplicate slugs. Builds naturally on the U1–U2 foundation.
- Optional `@vitest/ui` devDep and `npm run test:ui`.
- Coverage reporter + threshold gate in `test.yml`.

---

## Requirements

- **R1.** Running `npm test` executes Vitest and reports results.
- **R2.** `scripts/validate.test.mjs` covers `parseFrontmatter` and `parseScalar` happy paths plus their documented edge cases.
- **R3.** `npm run validate` continues to work as before (existing CLI behavior is unchanged after the refactor).
- **R4.** CI runs `npm test` on every PR and on every push to `staging` and `main`.
- **R5.** The production deploy pipeline (`deploy.yml`) fails if tests fail, before any pages artifact is uploaded.
- **R6.** `CLAUDE.md` no longer instructs implementers to bootstrap a test framework as part of their change.

---

## Key Technical Decisions

- **Vanilla `vitest.config.ts`, not `getViteConfig`.** The anchor test targets a pure Node script. `getViteConfig` from `astro/config` adds Astro's Vite plugins (transforms, content collections, etc.) and only earns its keep when testing Astro components. Adopting it now would pay setup cost for no current benefit; defer until the first component test.
- **Test files colocated with source.** `scripts/validate.test.mjs` sits next to `scripts/validate.mjs`. The config sets `test.include` to `['scripts/**/*.test.mjs', 'src/**/*.test.ts']` so future `src/` tests are discovered automatically.
- **Minimal refactor of `validate.mjs`.** Add `export` to the pure helpers and gate the bottom-of-file `main().catch(...)` call with a "ran directly" check. Do not split into a separate `validate-lib.mjs` — the gain doesn't justify the churn for a single anchor test.
- **Two-workflow CI shape.** New `test.yml` runs on `pull_request` and `push` to `staging`/`main` for fast feedback. `deploy.yml` ALSO runs `npm test` so the production deploy is gated independently of whether `test.yml` ran. Redundant runs on `main` pushes are acceptable — each is seconds-scale and the deploy gate is what actually protects production.
- **`.mjs` test file extension.** `validate.mjs` is ESM Node; the test stays `.mjs` for consistency. Future `src/` tests under TypeScript/Astro use `.ts`.

---

## System-Wide Impact

- **CI billing/time.** Adds one Actions job per PR plus one extra step on every deploy. Both are seconds-scale.
- **Hooks and pre-push.** None exist today; no impact.
- **Contributor workflow.** `npm test` becomes the standard local command for TDD loops. Documented in the `CLAUDE.md` update.
- **Branch protection.** Not changed by this plan, but enabling "Require `test` workflow to pass" in repo settings is the natural next step once `test.yml` has run cleanly once.
- **Public-repo signal.** A visible test workflow + green status check raises the bar contributors expect when sending PRs.

---

## Implementation Units

### U1. Vitest dependency and config

**Goal:** Land Vitest as a devDependency with a minimal config so `npm test` can run end-to-end.

**Requirements:** R1

**Dependencies:** none

**Files:**

- `package.json` (add `vitest` devDep, add `test` and `test:watch` scripts)
- `package-lock.json` (regenerated by `npm install`)
- `vitest.config.ts` (new)

**Approach:**

- Add `vitest` (latest stable) as a devDependency.
- Use `defineConfig` from `vitest/config`. Set `test.environment` to `node` and `test.include` to `['scripts/**/*.test.mjs', 'src/**/*.test.ts']`.
- Add `"test": "vitest run"` and `"test:watch": "vitest"` to `scripts` in `package.json`. Place `test` immediately after `validate` so the script ordering reads as a coherent verification pipeline.
- Do not change `build`. `npm test` stays separate from `npm run build`; CI integration in U3 is what enforces it.

**Patterns to follow:** none — this is the first Vitest config in the repo.

**Test scenarios:** none — pure scaffolding. U2 adds the first actual test.

**Verification:**

- `npm install` succeeds and `node_modules/vitest` exists.
- `npx vitest --version` resolves and prints the installed Vitest version (proves the binary is installed and runnable). End-to-end `npm test` exit-code behavior is verified in U2 once the first real test exists — `vitest run` exits non-zero when zero tests are collected, so running `npm test` between U1 and U2 will fail, by design.

---

### U2. Refactor `validate.mjs` and write anchor test

**Goal:** Cover the pure helpers in `scripts/validate.mjs` with the first real Vitest test, with the smallest refactor needed to make them importable.

**Requirements:** R2, R3

**Dependencies:** U1

**Execution note:** Test-first. Write `scripts/validate.test.mjs` against the desired exports, run `npm test`, observe the import failure, then add the `export` keywords and main-guard in `scripts/validate.mjs`.

**Files:**

- `scripts/validate.test.mjs` (new)
- `scripts/validate.mjs` (add `export` to `parseFrontmatter` and `parseScalar`; gate `main().catch(...)` so it runs only when the file is invoked directly)

**Approach:**

- Use the canonical Node-ESM "ran directly" guard built on `fileURLToPath(import.meta.url) === process.argv[1]` so cross-platform path forms (file: URL vs. OS path) compare correctly.
- Keep `walk(dir)` and `main()` internal for now — the anchor test does not exercise them.
- Tests use Vitest's `describe`/`it`/`expect`. Each scenario names the literal input and the expected output explicitly so a reader can verify intent without running the code.

**Patterns to follow:**

- Pure-function-first testing: import the helper, call with literal input, assert on the return value.

**Test scenarios:**

- `parseFrontmatter` parses a well-formed block with flat keys (`title`, `category`, `publish`) into the expected object shape (string, string, boolean).
- `parseFrontmatter` parses nested keys (the `attribution` block with `creator`, `bar`, `year`) into a nested object.
- `parseFrontmatter` parses list values (e.g. `spirits: [tequila, mezcal]`) into an array of strings.
- `parseFrontmatter` strips surrounding single and double quotes from quoted list items (e.g. `spirits: ["tequila", 'mezcal']` → `["tequila", "mezcal"]`).
- `parseFrontmatter` returns `null` when the input does not start with `---\n`.
- `parseFrontmatter` returns `null` when there is no closing `---` delimiter.
- `parseFrontmatter` skips comment lines (`# comment`) and blank lines inside the block without throwing.
- `parseScalar` returns boolean `true`/`false` for the literals `"true"` and `"false"`.
- `parseScalar` returns an integer for an all-digit string (`"42"` → `42`).
- `parseScalar` returns `[]` for an empty list literal (`"[]"`).
- `parseScalar` returns a string array for a list literal with mixed quoting (`'["a", b, \'c\']'` → `["a", "b", "c"]`).
- `parseScalar` strips surrounding single or double quotes from bare strings (`'"hello"'` → `"hello"`).
- `parseScalar` returns the raw string unchanged when no special pattern matches (e.g. `"weeknight"` → `"weeknight"`).

**Verification:**

- `npm test` runs the new test file and reports all scenarios passing.
- `npm run validate` continues to print its existing summary line and exit 0 on a clean recipes directory (regression check on the main-guard refactor).

---

### U3. Wire `npm test` into CI

**Goal:** Run tests on every PR and gate the production deploy on a green test run.

**Requirements:** R4, R5

**Dependencies:** U2 (must have at least one real test asserting behavior before CI runs `npm test`)

**Files:**

- `.github/workflows/test.yml` (new)
- `.github/workflows/deploy.yml` (insert a test step inside the existing `build` job)

**Approach:**

- **`test.yml`:** triggers on `pull_request` (any base branch) and `push` to `staging` and `main`. Declare an explicit workflow-level `permissions: contents: read` block (defense in depth against a future repo-wide "default workflow permissions = read and write" setting, which would otherwise hand fork-PR test runs a write-scoped `GITHUB_TOKEN`). Mirror `deploy.yml`'s pattern of stating permissions explicitly rather than inheriting. Single `test` job — checkout, `actions/setup-node@v4` with `node-version: 22` and `cache: npm`, `npm ci`, `npm test`. Use a `concurrency` group keyed on `${{ github.workflow }}-${{ github.ref }}` with `cancel-in-progress: true` so superseded PR pushes don't pile up.
- **`deploy.yml`:** insert a `Run tests` step running `npm test` between the existing `Validate recipe frontmatter` step and the `Build site` step, so a test failure aborts the build before any pages artifact is produced.

**Patterns to follow:**

- Existing `deploy.yml` Node setup (`actions/setup-node@v4`, `node-version: 22`, `cache: npm`).
- Existing concurrency-group + `cancel-in-progress` pattern from `deploy.yml`'s `pages` group (but with a different group key so PR runs and the singleton deploy don't interfere).

**Test scenarios:** none — workflow configuration, exercised by CI itself when the PR runs.

**Verification:**

- The PR that ships this plan triggers `test.yml` and the run goes green.
- Introducing a locally-failing test fails `test.yml` and (when merged to `main`) fails the `build` job in `deploy.yml` before any pages artifact uploads. Confirmed by a one-off scratch PR after merge, or by reasoning about the workflow shape if the user prefers not to test the failure path.

---

### U4. Update `CLAUDE.md` TDD section

**Goal:** Remove the "no framework wired up" caveat and point future TDD work at `npm test`.

**Requirements:** R6

**Dependencies:** U1, U3 (the new prose names both `npm test` and the `test.yml` / `deploy.yml` CI gates, so all three must exist before the doc references them)

**Files:**

- `CLAUDE.md`

**Approach:**

- Replace the existing `> Note: this repo does not currently have a test framework wired up …` blockquote in the **Test-driven development** subsection with one sentence: tests are written with Vitest, run via `npm test`, and gated in CI via `test.yml` plus the `deploy.yml` build step.
- Keep the red-green-refactor numbered list and the "Skip TDD only for" exceptions list verbatim — both are still correct.

**Test scenarios:** none — documentation update.

**Verification:**

- Reading the `CLAUDE.md` TDD section after the edit, an implementer knows which command to run (`npm test`) and is not told to bootstrap anything themselves.

---

## Risks and Mitigations

- **Risk:** The `fileURLToPath(import.meta.url) === process.argv[1]` guard pattern has subtle cross-platform pitfalls (file: URL vs. path string equality) if implemented wrong. **Mitigation:** Use `fileURLToPath` explicitly rather than string-comparing `import.meta.url` directly. Caught by U2's verification step (`npm run validate` regression check).
- **Risk:** Adding `npm test` to `deploy.yml` makes a previously-green deploy newly fail if any unrelated test breaks. **Mitigation:** Initial suite is the anchor only, so the breakage surface is tiny. CLAUDE.md update steers future contributors to keep tests green before merging to main.
- **Risk:** `test.yml` and `deploy.yml` both run tests on `main` pushes, doubling CI minutes for that path. **Mitigation:** Each run is seconds-scale; the duplication is intentional belt-and-suspenders coverage. Revisit if CI minutes become a real constraint.
- **Risk:** Vitest's discovery picks up `migrate-to-frontmatter.mjs` if a typo creates `*.test.mjs` accidentally. **Mitigation:** The explicit `test.include` glob requires the `.test.mjs` suffix; accidental script picks-up would require renaming.

---

## Open Questions Deferred to Implementation

- Exact `vitest` major version pinned at install time — will be the latest stable when `npm install vitest -D` runs; the resolved version lands in `package.json` and `package-lock.json`.
- Whether to also add an `npm run test:ui` script — deferred; not in this plan.
- Whether `test.yml` should run on a matrix of Node versions — deferred. Node 22 (the production deploy target) is the only one that matters today.
