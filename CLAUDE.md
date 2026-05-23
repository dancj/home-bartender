# Home Bartender

Personal home bartender recipe collection. Recipes are markdown files with YAML frontmatter (see `TEMPLATE.md`); the site is generated from them.

## Contributing

All changes ship via pull request — **never push directly to `main`**. This applies to everything: code, docs, copy fixes, new recipes, dependency bumps.

Standard flow:

1. Create a feature branch (see Branch naming below).
2. Commit there.
3. Push the branch and open a PR with `gh pr create`.
4. Wait for human review and merge. Do not merge your own PRs unless the user explicitly says so.

If you find yourself on `main` with uncommitted changes, stash or move them to a branch before committing.

### Branch naming

Pattern: `{type}-{ISSUE-REF}-{short-description}`

| Type    | Pattern                          | Example                 |
| ------- | -------------------------------- | ----------------------- |
| Feature | `feat-{ISSUE-REF}-short-desc`    | `feat-50-member-export` |
| Bug fix | `fix-{ISSUE-REF}-short-desc`     | `fix-90-login-redirect` |
| Chore   | `chore-{ISSUE-REF}-short-desc`   | `chore-84-upgrade-ampx` |
| Script  | `script-{ISSUE-REF}-short-desc`  | `script-318-backfill`   |

If no issue exists, file one first or use a short slug instead of the ref (`chore-typo-readme`).

### Test-driven development

**All feature and bug fix work MUST follow TDD red-green-refactor discipline.** This applies to all implementation — whether initiated by `/ce:work`, `/ce:plan`, subagents, or direct coding.

When implementing any plan task:

1. Write a failing test that describes the expected behavior.
2. Run the test suite and confirm it fails.
3. Write the minimum code to make it pass.
4. Run the full suite to confirm nothing else broke.
5. Refactor if needed, keeping tests green.
6. Repeat for the next behavioral increment.

**Skip TDD only for:** configuration changes, boilerplate wiring, pure styling/layout, trivial renames, and exploratory spikes.

> Note: this repo does not currently have a test framework wired up — only `astro check` (TypeScript) and `npm run validate` (frontmatter). When a change calls for TDD per the rules above, set up the appropriate test runner as part of that change rather than skipping the discipline.

### Closing issues via PRs

Always reference related GitHub issues in PR descriptions using GitHub's closing keywords so issues are auto-closed on merge:

- Use `Closes #123` or `Fixes #123` in the PR **body** (not title).
- For multiple issues, list each on its own line (`Closes #123`, `Closes #456`).
- If a PR partially addresses an issue but doesn't fully resolve it, use `Related to #123` — links but does not auto-close.
- Bare `#123` references do **not** trigger auto-close; the keyword is required.

### Release PRs (staging → main)

When a `staging` branch is in use, releases roll up via a PR with the standardized title:

```
Release: staging to main (YYYY-MM-DD)
```

The PR body MUST include a `## Closes` section enumerating every issue resolved by PRs included in the release. GitHub only auto-closes issues when the **merge commit** on the **default branch** (`main`) contains the keyword, so the release PR body is where they belong — not the individual staging PRs.

```markdown
## Closes

Closes #90, Closes #137, Closes #204
```

Scan merged staging PRs for issue refs when assembling this list.

## Directory Structure

```
recipes/
  classics/       ← established cocktails (often borrowed; attribution required)
  originals/      ← personal creations and experiments
  seasonal/       ← seasonal/holiday recipes
  inbox/          ← new recipes pending review (publish: false)
sections/         ← prose: introduction, techniques, tools, glossary
TEMPLATE.md       ← standard recipe format with frontmatter schema
```

## Recipe Pipeline

Every recipe lives at `recipes/<category-dir>/<slug>.md` and is loaded by Astro's content collection. The site renders only recipes with `publish: true`. Everything below is enforced by code — read these files before touching the schema or inventing new field values.

### Source of truth

| Concern | File | Notes |
|---|---|---|
| Field shape and types | `src/content.config.ts` | Zod schema; `astro check` (run by `npm run build`) fails on mismatch. |
| Allowed enum values & cross-refs | `scripts/validate.mjs` | Run as `npm run validate`. Errors on bad enums, broken `related[]` slugs, duplicate slugs, dir/category mismatch. Warns on uncanonical spirits/flavors/occasions. |
| Human reference + body layout | `TEMPLATE.md` | Canonical-taxonomy tables and section conventions. Don't duplicate this content elsewhere — link to it. |

When introducing a new enum value (a new spirit, flavor, occasion, etc.), update **both** `src/content.config.ts` and `scripts/validate.mjs` in the same change.

### Lifecycle

1. **Draft** — file lands in `recipes/inbox/<slug>.md` with `category: inbox` and `publish: false`. Hidden from the site index; visible only at `/inbox/?preview=1`.
2. **Review** — fill in missing measurements, fix taxonomy, add attribution if borrowed, verify the body has at minimum `## Ingredients` and `## Steps` (plus `## House-Made …`, `## How to Batch It`, `## Notes` where relevant).
3. **Publish** — manually: (a) move the file to the matching category dir (`recipes/classics/`, `recipes/originals/`, or `recipes/seasonal/`), (b) change `category:` to the singular form (`classic`, `original`, `seasonal`), (c) flip `publish: true`. There is no `npm run publish` script despite what `src/pages/inbox.astro` currently claims.
4. **Validate** — `npm run validate` before committing. `npm run build` re-validates via `astro check` and rebuilds the Pagefind index.

### Conventions agents should know

- **Slug** = file basename = URL segment (`/recipes/<slug>/`). Lowercase-hyphenated, derived from the title. Must be unique across all category dirs (validator errors on duplicates).
- **Underscore prefix excludes** — `recipes/**/_anything.md` is skipped by the content-collection glob. Use it to stash a draft you don't want loaded.
- **`category` must match parent dir** — `recipes/classics/foo.md` must have `category: classic`. Validator errors otherwise.
- **`related[]`** must list slugs that resolve to existing recipe files. Validator errors on dangling refs.
- **`attribution.creator`** is expected for anything in `classics/`; originals leave the whole `attribution` block empty.
- **Reserved fields** — `hero_image`, `gallery`, `preparations` are defined in the schema but currently unused. Leave them empty; don't fabricate values.
- **Two collections** — `recipes` (in `recipes/`) and `sections` (in `sections/`, schema is just `{ title, order, summary? }`, powers `/learn/`). Same glob rules apply to both.

## Email Recipe Processing

When you receive an email containing a cocktail recipe (look for ingredients with oz measurements, spirit names, mixing instructions, or subject lines mentioning "recipe", "cocktail", "drink"):

1. Parse the recipe: name, ingredients, method, garnish, and any notes
2. Normalize into the `TEMPLATE.md` format with full YAML frontmatter:
   - Slug: lowercase-hyphenated derived from the recipe name
   - `category: inbox`, `publish: false` (inbox recipes are drafts until reviewed)
   - Infer `glass`, `method` (shaken/stirred/built/blended), `ice`, `difficulty` from ingredients and steps
   - Detect primary `spirits[]` from the ingredient list
   - If the email mentions an original creator/bar/year, populate the `attribution` block
   - If measurements are missing, leave them blank rather than guessing
   - Add a House-Made section in the body if the recipe includes a syrup or infusion
3. Write the file to `recipes/inbox/{slug}.md`.
4. Ship it as a PR per the Contributing rules — do not commit on `main`:
   - `git checkout -b feat-inbox-{slug}` (no issue ref needed for ingest)
   - `git add recipes/inbox/{slug}.md && git commit -m "feat(inbox): add {Recipe Title}"`
   - `git push -u origin feat-inbox-{slug}`
   - `gh pr create --title "feat(inbox): add {Recipe Title}" --body "..."` — body should summarize what was parsed, flag any missing measurements or guessed values, and link the source email if available.
5. Confirm to the user what was saved, the branch name, and the PR URL.

If `gh pr create` fails with a token-permission error, still complete steps 1–4 above (file + branch + push) and report the GitHub "create PR" URL from the push output so the user can open the PR manually.

Inbox recipes do not appear on the public site until they're promoted (stages 2–4 of the Recipe Pipeline section above), which happens after the PR is merged.

## Recipe Template Quick Reference

See `TEMPLATE.md` for the authoritative schema. Minimal shape:

```markdown
---
title: Recipe Name
blurb: "One-line description"
category: inbox
publish: false
glass: ...
method: shaken
ice: cubed
difficulty: easy
spirits: [tequila]
flavors: []
attribution:
  creator: ""
  bar: ""
  year: ""
  source_url: ""
---

# Recipe Name

> *One-line description*

## Ingredients
## House-Made [Syrup/Infusion]  (if applicable)
## Steps
## How to Batch It              (if you can calculate it)
## Notes
```
