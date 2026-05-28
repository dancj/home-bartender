---
title: One-shot content migration with dep-injected linter as rollback gate
date: 2026-05-27
category: design-patterns
module: scripts
problem_type: design_pattern
component: tooling
severity: medium
applies_when:
  - Migrating markdown content from one body shape to another (sections to frontmatter, frontmatter shape change, etc.)
  - The destination shape is enforced by a linter that is itself being inverted in the same change
  - Per-file atomicity matters (one bad file shouldn't corrupt the corpus)
  - The migration must be idempotent so it can be re-run during development
tags: [migration, script, atomic, rollback, idempotency, dependency-injection, content-pipeline]
---

# One-shot content migration with dep-injected linter as rollback gate

## Context

Stage A of issue #23 converted every recipe's freeform `## Ingredients` / `## Steps` / `## House-Made <Thing>` / `## How to Batch It` body markdown into structured YAML frontmatter (`ingredients[]`, `steps[]`, `house_made{}`, `batch{}`, plus top-level `garnish` and `float`). The change inverts the body-structure linter at the same time — from "these headings must exist" to "these headings are migration leftovers". A one-shot migration script (`scripts/migrate-body-to-frontmatter.mjs`) rewrites all ~20 corpus recipes in place.

Two pressures meet here: (1) the linter contract that gates the corpus IS the thing being inverted, so the script can't just call the current `lintBody` to validate its output — that would either fail every file (pre-flip contract) or duplicate the flip inside the migration code; (2) one bad file shouldn't corrupt the corpus, so per-file atomicity matters; (3) the script needs to be idempotent so developers can re-run during the U6/U7 coupling.

The pattern that emerged is portable to any future content migration in this repo (and likely beyond): **the linter that validates the output shape is dependency-injected into the migration script, and the migration ships coupled with the linter flip in the same PR.**

## Guidance

Structure a one-shot content migration script around four invariants:

### 1. Dep-inject the validator that gates rollback

The post-write validation gate is the most coupling-prone point — the validator's contract is exactly what the migration is producing, so a hard import couples the script to one specific version of the contract forever. Inject it instead:

```js
// scripts/migrate-body-to-frontmatter.mjs
import { lintBody as realLintBody } from './validate.mjs';

export function makeDeps(overrides = {}) {
  return {
    readFile: overrides.readFile ?? defaultReadFile,
    writeFile: overrides.writeFile ?? defaultWriteFile,
    glob: overrides.glob ?? defaultGlob,
    lintBody: overrides.lintBody ?? realLintBody,
  };
}
```

Tests can swap in a mock or the pre-flip implementation to verify rollback behavior independently of the live contract. Production gets whatever `lintBody` is exported at run time — which means the migration "uses the new contract" as a property of WHEN it runs (after U7's flip lands), not as something the script encodes.

### 2. Couple the migration commit with the contract-flip commit

If the script ships before the new linter contract, it self-rolls-back every file (the old contract still requires the body headings the script just removed). If the new contract ships first, `npm run validate` fails on the un-migrated corpus until the migration runs.

Declare the dependency explicitly in the plan AND in the migration unit's dependency field. In `ce-plan` parlance: `U_migration depends on U_linter_flip`, and the plan's risk register should note that they ship in the same change. The husky pre-commit hook will catch any drift; CI will catch any drift; the developer running `npm run validate` between the two will catch any drift. Defense in depth.

### 3. Per-file atomicity via in-memory rollback

For each file:

```
1. readFile (snapshot original content in memory)
2. Parse + transform in memory (no I/O)
3. writeFile (commit the new content)
4. Call dep-injected lintBody on the result
5. If lint errors → writeFile(original) to restore; emit error row
6. Continue to next file regardless of outcome
```

Per-file failures don't halt the corpus — the report at the end shows `{migrated, skipped, errors}` counts and the developer fixes outliers by hand. Idempotency (step 7 below) makes re-running safe.

Caveats from the Tier 2 review of this exact script:

- The post-write `lintBody` call should be wrapped in `try/catch`. If `lintBody` throws (vs returning errors), the file is half-migrated with no rollback. Defensive try/catch around step 4 catches this.
- "Atomic" overstates the guarantee at the OS level: SIGKILL between step 3 and step 5 leaves a half-migrated file on disk. Mitigated by git (the developer can `git checkout -- <file>`) and by the script's one-shot nature, but the doc string should say "best-effort rollback" rather than "atomic."

### 4. Idempotency guard on the output shape, not the input shape

Check whether the destination fields are already populated:

```js
function isAlreadyMigrated(frontmatter) {
  return (
    nonEmptyArray(frontmatter.ingredients) ||
    nonEmptyArray(frontmatter.steps) ||
    frontmatter.house_made !== undefined ||
    frontmatter.batch !== undefined
  );
}
```

A file with any of the new fields populated is skipped on re-run. This makes `npm run migrate:bodies` safe to re-execute during development without producing diffs.

**Caveat:** a partial-migration state (one new field set + body still has legacy headings) gets short-circuited as "already migrated" — the migration tool doesn't notice the leftover body. The fix that landed in Stage A was to widen the **linter** (not the migration script) to flag migration-leftover headings regardless of `publish` status, so the pre-commit hook catches the half-migrated state. Conceptually: the migration script's idempotency check optimizes for the common case (re-run is no-op); the linter is the catch-all for inconsistent state.

### 5. Make non-bullet/non-numbered content drops surface to the user

The Tier 2 reviewer caught a real data loss in `recipes/inbox/gin-gimlet.md`: a `**Variation:**` callout under `## Ingredients` and a trailing `*For the Collins variation:*` italic step were silently dropped by parsers that only kept bullets / numbered items. Two mitigations:

- **Defensively:** parsers that discard "everything except X" should either error on unknown shapes or emit a per-file warning the developer reviews. Silent drops in a one-shot migration are not recoverable — the body markdown is gone after writeFile.
- **At review time:** include a fixture-based content-preservation property test that asserts every line of the pre-migration body either lands in a frontmatter field OR survives in the residual body. The Stage A migration suite lacked this; if it had run, gin-gimlet would have failed before the corpus PR opened.

## Why This Matters

A one-shot content migration is a chance to destroy data permanently — the body markdown is removed after writeFile, and unless rollback fires, the migrated file IS the new state. The patterns above (DI gate, coupled-ship, per-file rollback, idempotency on output shape, fail-loud on unknown content) are not over-engineering — each one corresponds to a class of failure that almost happened (or did happen — gin-gimlet) during Stage A:

- Without DI: U5 ships → tests pass against the old contract → migration runs in CI → every file rolls back. Caught only after running locally.
- Without coupled-ship: U7 lands in PR before U6 → `npm run validate` fails on the un-migrated corpus → developer panics or hand-migrates one file to "fix CI", further fragmenting the corpus.
- Without per-file rollback: one malformed recipe halts the script halfway through → the corpus is split between migrated and un-migrated → manually figuring out who's who.
- Without idempotency on output shape: dry-run + real-run on the same day produces duplicate fields or errors.
- Without fail-loud parsers: gin-gimlet's variation content is gone, and nobody notices until a reader of that recipe wonders where the Collins variation went.

## When to Apply

- Content migrations that change body shape (sections → frontmatter, frontmatter shape change, prose → structured fields)
- Migrations where the validator that gates the destination shape is itself changing in the same PR (the DI pattern matters most here)
- One-shot scripts intended to run once and never again — the idempotency-on-output-shape guard handles the inevitable re-run during development
- Corpus mutations large enough that per-file atomicity matters (more than ~5 files; below that hand-fixing one outlier is cheaper than rollback)
- Content where dropping unknown shapes is a real failure mode (anything authored by humans — markdown bodies are often more varied than a fixture suite captures)

## Examples

### makeDeps + dep-injected lintBody (Stage A)

```js
// scripts/migrate-body-to-frontmatter.mjs
import { lintBody as realLintBody } from './validate.mjs';

export function makeDeps(overrides = {}) {
  return {
    readFile: overrides.readFile ?? ((p) => fs.readFile(p, 'utf8')),
    writeFile: overrides.writeFile ?? ((p, c) => fs.writeFile(p, c, 'utf8')),
    glob: overrides.glob ?? defaultGlob,
    lintBody: overrides.lintBody ?? realLintBody,
  };
}

export async function migrate({ deps, dryRun = false }) {
  const files = await deps.glob('recipes/**/*.md');
  const results = { migrated: [], skipped: [], errors: [] };

  for (const path of files) {
    const original = await deps.readFile(path);
    const fm = parseYaml(extractFrontmatter(original));

    if (isAlreadyMigrated(fm)) {
      results.skipped.push({ path, reason: 'already-migrated' });
      continue;
    }

    const { newContent, newFm } = migrateContent(original, fm);

    if (dryRun) {
      results.migrated.push({ path, changed: false, dryRun: true });
      continue;
    }

    await deps.writeFile(path, newContent);

    // Dep-injected lintBody — picks up whichever contract is live at run time
    try {
      const { errors } = deps.lintBody(extractBody(newContent), newFm);
      if (errors.length > 0) {
        await deps.writeFile(path, original); // rollback
        results.errors.push({ path, reason: errors.join('; '), rolledBack: true });
        continue;
      }
    } catch (err) {
      await deps.writeFile(path, original); // rollback on throw too
      results.errors.push({ path, reason: `lintBody threw: ${err.message}`, rolledBack: true });
      continue;
    }

    results.migrated.push({ path, changed: true });
  }

  return results;
}
```

### Test pattern (mock the dep, swap the contract)

```js
// scripts/migrate-body-to-frontmatter.test.mjs
import { migrate, makeDeps } from './migrate-body-to-frontmatter.mjs';

it('rolls back when post-write lint fails', async () => {
  const fileSeed = new Map([
    ['recipes/test.md', '---\ntitle: t\n---\n## Ingredients\n- 2 oz\n'],
  ]);
  const writes = [];
  const deps = makeDeps({
    readFile: async (p) => fileSeed.get(p),
    writeFile: async (p, c) => { writes.push({ p, c }); fileSeed.set(p, c); },
    glob: async () => ['recipes/test.md'],
    lintBody: () => ({ errors: ['simulated lint failure'], warnings: [] }),
  });

  const result = await migrate({ deps });

  expect(result.errors).toHaveLength(1);
  expect(result.errors[0].rolledBack).toBe(true);
  // Two writes: the forward migration, then the rollback restoring original
  expect(writes).toHaveLength(2);
  expect(writes[1].c).toBe('---\ntitle: t\n---\n## Ingredients\n- 2 oz\n');
});
```

### Linter-as-half-migration-catcher

```js
// scripts/validate.mjs — after Stage A's U7 + the review fix
export function lintBody(body, frontmatter) {
  const errors = [];
  const warnings = [];
  const headings = extractH2Headings(body);

  // Migration-leftover errors fire on ALL recipes regardless of publish status.
  // Without this, an inbox draft with `## Ingredients` in the body slips through
  // the pre-commit hook and the migration tool's rollback gate is a no-op for it.
  if (headings.includes('Ingredients')) {
    errors.push('migration leftover: ## Ingredients heading in body — content belongs in frontmatter.ingredients[]');
  }
  // ...same for Steps, House-Made, How to Batch It

  if (frontmatter?.publish !== true) return { errors, warnings };

  // Publish-only checks: empty arrays, craft-prep warnings, batch-format warnings
  // ...
}
```

## Related

- Plan: `docs/plans/2026-05-26-002-feat-component-primitives-stage-a-plan.md`
- Issue: [#23 — Component primitives + ingredient ontology (Stage A: components, Stage B: ingredients collection)](https://github.com/dancj/home-bartender/issues/23)
- PR: [#43 — feat: Stage A — typed recipe components with frontmatter-driven body sections](https://github.com/dancj/home-bartender/pull/43)
- Prior migration scripts in this repo: `scripts/migrate-to-frontmatter.mjs` (bold-fact prose → frontmatter, 2026-03), `scripts/migrate-styles-to-tags.mjs` (field rename, 2026-04)
- Gold-standard one-file mutation: `scripts/promote.mjs` (inbox → category promotion with rollback) — the DI + rollback pattern was lifted from here
