# Release pipeline

Two GitHub Actions workflows automate the `staging → main` release flow:

1. **`.github/workflows/auto-release-pr.yml`** — keeps the open `staging → main` PR's body in sync as commits land on `staging`.
2. **`.github/workflows/release-changelog.yml`** — when the release PR merges to `main`, tags the release commit, prepends a Keep a Changelog 1.1.0 entry to `CHANGELOG.md`, and opens a `docs:` PR back to `staging` for a human to merge.

All behaviour is delegated to pure-helper modules and orchestrators under `scripts/`. The workflow YAML itself is a thin wrapper.

## The managed block

The release PR body is composed as `[free-form prefix] + MANAGED_BLOCK + [free-form suffix]`. Anything inside the markers is rewritten on every push to `staging`; anything outside is preserved verbatim.

```text
<!-- release-pr:start -->

## Closes

Closes #N, Closes #M, …

## Recipes
- ...

## Changes
- ...

<!-- managed by .github/workflows/auto-release-pr.yml — do not edit between markers -->
<!-- release-pr:end -->
```

Empty category sections are omitted. The `## Closes` line is the only place where un-neutralised closing keywords are emitted — every other interpolated reference is backtick-wrapped (`` `Closes #99` ``), which GitHub explicitly documents as non-auto-closing.

### Categorisation rules

Labels first, title prefix second. Label wins when both are set.

| Signal | Section |
|---|---|
| Label `area:recipe` OR title prefix `feat(inbox):` / `feat(recipe):` / `Add recipe:` (issue-intake PRs) | Recipes |
| Anything else | Changes |

The `area:recipe` label does not currently exist in the repo — categorisation falls through to the title prefix path, which is exhaustive on its own. Creating the label (and optionally a `pull_request` labeler workflow) is forward-compatible.

### Malformed delimiters

If a human accidentally deletes one of the markers while editing, the workflow self-heals on the next push:

1. Strips every stray `<!-- release-pr:start -->` and `<!-- release-pr:end -->` marker from the body.
2. Backtick-wraps any surviving closing-keyword references in the stripped prose so a stale `Closes #99` left in human-authored text can't trigger auto-close.
3. Appends a single fresh managed block at the end.

No manual fix is required.

## CalVer versioning

Versions follow `YYYY.M.D.N` (no zero-padding). `N` starts at `1` and increments on same-day releases (`2026.5.23.1`, `2026.5.23.2`, ...). The orchestrator computes the next version numerically — lexical sort would order `release-2026.5.23.10` before `release-2026.5.23.2`.

`VERSION.json` at the repo root holds the current version. `release-changelog.yml` writes it on every release, and `scripts/updateVersion.mjs --from-tags` can be run locally to inspect what the next version would be.

## Per-release ritual

When the release PR merges to `main`, `release-changelog.yml` fires:

1. Performs a defensive first-parent ancestry check; exits cleanly if the head commit isn't a merge.
2. Computes the next CalVer from existing `release-*` tags.
3. Tags and pushes `release-<version>` on `main` **first** — so failures in later steps leave no orphan state ahead of the tag.
4. Reads `CHANGELOG.md`, injects a new entry after `## [Unreleased]`, writes `VERSION.json`.
5. Creates a `docs-changelog-<version>` branch, commits, pushes.
6. Opens a PR titled `docs: update CHANGELOG for release <version>` against `staging`.

**A human reviews and merges that docs PR.** The next release picks up the new CHANGELOG entry from that merge. The workflow does **not** auto-merge — keeping the human in the loop sidesteps GitHub's default-token recursion limits and gives a natural review gate.

## Manual triggers and recovery

| Symptom | Fix |
|---|---|
| Release PR body looks stale | `gh workflow run auto-release-pr.yml --ref staging` |
| Release-changelog workflow didn't fire (e.g., release subject didn't start with `Release: staging to main`) | `gh workflow run release-changelog.yml --ref main` |
| Managed-block delimiters got mangled | Do nothing — next push to `staging` self-heals |
| Orphan `docs-changelog-<v>` branch from a half-failed run | Delete locally + on origin; re-dispatch the workflow if the tag was pushed but the CHANGELOG entry didn't land |

## One-time post-merge bootstrap

When this feature's own PR merges, run these one-time setup steps:

1. **Create the initial `release-*` tag on `main` HEAD.** This anchors the SINCE_DATE for the first `auto-release-pr.yml` run. Use the value committed in `VERSION.json` (or bump it to today's CalVer if merge day differs):

   ```bash
   git tag release-2026.5.23.1 main
   git push origin release-2026.5.23.1
   ```

2. **Trigger the first `auto-release-pr.yml` run.** Confirm a green run and that the resulting release PR body looks correct:

   ```bash
   gh workflow run auto-release-pr.yml --ref staging
   ```

3. **Optional: create `area:*` labels** for forward-compatible categorisation:

   ```bash
   gh label create area:recipe --color a2eeef --description "Touches recipe content"
   gh label create area:product --color 0075ca --description "Touches product behavior"
   ```

## Known limitations

- **Default `GITHUB_TOKEN` does not re-trigger workflows on its own commits/pushes.** In this design that only matters in one place: when `release-changelog.yml` pushes a tag to `main`, no downstream workflow runs from that push. Since a human merges the docs PR back to `staging`, the next `auto-release-pr.yml` run fires normally on the human's merge commit.
- **`gh pr list --limit 200`** is a hardcoded ceiling. If a release window ever accumulates more than 200 merged staging PRs, the orchestrator silently truncates. The orchestrator's hardcoded SINCE fallback (in `autoReleasePrRun.mjs`) and the existing release tag together bound the window in practice.
- **Tag protection on `release-*`** is not enforced by this plan. Any contributor with push access could push a `release-<garbage>` tag and corrupt the CalVer counter. For a solo project the risk is currently low; add a tag-protection rule via repo settings if collaborators are added.
