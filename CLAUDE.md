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

Tests are written with [Vitest](https://vitest.dev/) and run via `npm test`. CI gates them on every PR via `.github/workflows/test.yml`, and the production deploy in `.github/workflows/deploy.yml` runs them as a build step so a test failure aborts before any pages artifact is uploaded. `astro check` and `npm run validate` continue to cover TypeScript and recipe-frontmatter checks.

### Pre-commit hooks

The repo runs [husky](https://typicode.github.io/husky/) + [lint-staged](https://github.com/lint-staged/lint-staged) on every commit. The hook is installed automatically the first time you run `npm install` (via the `prepare` script). On commit, lint-staged runs `node scripts/validate.mjs --files <staged>` against any staged `recipes/**/*.md`, catching taxonomy, `related[]`, and dir/category mismatches locally instead of waiting for CI.

`--no-verify` bypasses the hook, but per the Git Safety Protocol in this file, treat it as emergency-only. If the hook fails, fix the underlying issue (run `npm run validate` to see the full report) rather than skipping.

### Closing issues via PRs

Always reference related GitHub issues in PR descriptions using GitHub's closing keywords so issues are auto-closed on merge:

- Use `Closes #123` or `Fixes #123` in the PR **body** (not title).
- For multiple issues, list each on its own line (`Closes #123`, `Closes #456`).
- If a PR partially addresses an issue but doesn't fully resolve it, use `Related to #123` — links but does not auto-close.
- Bare `#123` references do **not** trigger auto-close; the keyword is required.

### Release PRs (staging → main)

Releases roll up via a PR with the standardized title:

```
Release: staging to main (YYYY-MM-DD)
```

The release PR body is **bot-maintained** by `.github/workflows/auto-release-pr.yml`. Every push to `staging` re-renders a managed block — wrapped in HTML comment delimiters — containing the categorised PR breakdown and the aggregated `## Closes` list. Human notes go **outside** the managed block; the workflow won't touch them.

```markdown
Optional human prose above the block.

<!-- release-pr:start -->

## Closes

Closes #90, Closes #137, Closes #204

## Recipes
- ...

<!-- managed by .github/workflows/auto-release-pr.yml — do not edit between markers -->
<!-- release-pr:end -->

Optional human prose below the block.
```

The aggregated `## Closes` list inside the managed block is the **only** place auto-closing issues land — every other interpolated `Closes|Fixes|Resolves #N` reference (PR titles in bullets, prose around the block) is backtick-wrapped so it doesn't trigger GitHub's auto-close. See `docs/release-pipeline.md` for the full contract, recovery procedures, and the per-release manual-merge ritual for the bot-opened `docs: update CHANGELOG for release <version>` PR.

## Directory Structure

```
recipes/
  classics/       ← established cocktails (attribution filled only when there's a clear named creator + venue)
  originals/      ← contributor's own creations (only when the contributor has explicitly stated authorship, not when a recipe simply looks unusual)
  seasonal/       ← seasonal/holiday recipes
  inbox/          ← new recipes pending review (publish: false)
sections/         ← prose: introduction, techniques, tools, super juice
TEMPLATE.md       ← standard recipe format with frontmatter schema
```

## Recipe Pipeline

Every recipe lives at `recipes/<category-dir>/<slug>.md` and is loaded by Astro's content collection. The site renders only recipes with `publish: true`. Everything below is enforced by code — read these files before touching the schema or inventing new field values.

### Source of truth

| Concern | File | Notes |
|---|---|---|
| Canonical taxonomy values | `data/taxonomy.yaml` | Single source of truth for every enum-shaped field (category, method, ice, difficulty, format, glass, root, spirits, flavors, occasions). Edit here. |
| Generated Zod source | `src/taxonomy.generated.ts` | Auto-generated by `npm run codegen`. `src/content.config.ts` imports its `as const` arrays. Do not edit by hand. |
| Generated validator source | `scripts/taxonomy.generated.mjs` | Auto-generated. `scripts/validate.mjs` imports it. Do not edit by hand. |
| Field shape and types | `src/content.config.ts` | Zod schema bound to the generated constants; `astro check` (run by `npm run build`) fails on mismatch. |
| Cross-refs and structural rules | `scripts/validate.mjs` | Run as `npm run validate`. Errors on broken `related[]` slugs, duplicate slugs, dir/category mismatch, alias collisions. Enum membership is enforced by Zod. |
| Human reference + body layout | `TEMPLATE.md` | The Canonical Taxonomy table is regenerated automatically between `<!-- taxonomy:start -->` and `<!-- taxonomy:end -->`. Don't hand-edit between those markers. |

When introducing a new enum value (a new spirit, glass, root, etc.):

1. Add it to `data/taxonomy.yaml` (entry shape: `{ slug, label, source?, note?, aliases? }`).
2. Run `npm run codegen` to regenerate `src/taxonomy.generated.ts`, `scripts/taxonomy.generated.mjs`, and the `TEMPLATE.md` table region.
3. Commit the YAML edit and all three regenerated files together.

CI re-runs codegen on every PR and fails if any generated artifact is stale.

### Lifecycle

1. **Draft** — file lands in `recipes/inbox/<slug>.md` with `category: inbox` and `publish: false`. Hidden from the site index; visible only at `/inbox/?preview=1`.
2. **Review** — fill in missing measurements, fix taxonomy, add attribution if borrowed, verify the frontmatter carries `ingredients[]` and `steps[]` (plus `house_made{}`, `batch{}`, and top-level `garnish` / `float` where relevant). The body collapses to `## Notes` and any narrative-only sections. The body+frontmatter contract is enforced by `npm run validate` on every `publish: true` recipe — an empty `ingredients[]` errors out, residual `## Ingredients` / `## Steps` / `## House-Made …` / `## How to Batch It` headings in the body error as migration leftovers, ingredient strings that reference craft preps (`shrub`, `tincture`, `cordial`, `infusion`, `*-washed`, or a non–store-bought syrup) warn when no `house_made` field is present, and `format: batch | punch` recipes warn when the `batch` field is missing.
3. **Publish** — run `npm run promote -- <slug> --category=<classic|original|seasonal>`. The script rewrites frontmatter (singular `category`, `publish: true`), `git mv`s the file into the matching category dir, and re-runs `npm run validate`. Add `--dry-run` to preview. On validation failure the script rolls back atomically. If you'd rather hand-edit, the manual ritual is: (a) move the file to the matching category dir (`recipes/classics/`, `recipes/originals/`, or `recipes/seasonal/`), (b) change `category:` to the singular form, (c) flip `publish: true`.
4. **Validate** — `npm run validate` runs automatically as part of `npm run promote`. Run it manually before committing if you used the hand-edit path. `npm run build` re-validates via `astro check` and rebuilds the Pagefind index.

### Conventions agents should know

- **Slug** = file basename = URL segment (`/recipes/<slug>/`). Lowercase-hyphenated, derived from the title. Must be unique across all category dirs (validator errors on duplicates).
- **Underscore prefix excludes** — `recipes/**/_anything.md` is skipped by the content-collection glob. Use it to stash a draft you don't want loaded.
- **`category` must match parent dir** — `recipes/classics/foo.md` must have `category: classic`. Validator errors otherwise.
- **`related[]`** must list slugs that resolve to existing recipe files. Validator errors on dangling refs.
- **`attribution.creator`** is filled only when there's a clear, named creator AND venue (e.g., Sam Ross / Milk & Honey; Joaquín Simó / Death & Co; Nathan Howard / Cole's). For established communal classics whose origin is murky or contested (Old Fashioned, Manhattan, Cosmopolitan, French 75, Gin Gimlet, Spritz, Mojito, etc.) and for originals, leave the whole `attribution` block empty — never invent or guess. The convention is conservative attribution: the block carries weight only when it's verifiable.
- **Category placement** — don't agonize over `classics/` vs `originals/`. Default new promotions to `classics/`. Place in `originals/` only when the contributor has explicitly stated the recipe is their own creation. When in doubt, ask or pick classic.
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
   - Write parsed ingredients into `ingredients[]` (each line as a single string), parsed steps into `steps[]`. Garnishes go in top-level `garnish: string` (single string; join multiple with " or ")
   - If the recipe has a syrup/infusion/shrub the bartender makes themselves, populate `house_made: { name, yield?, ingredients?, steps }` in frontmatter (NOT a body section)
   - If the recipe includes batch instructions, populate `batch: { yield, ingredients?, instructions? }`. `instructions` is plain text — markdown syntax in the field renders literally
   - Populate the `attribution` block ONLY when the email names both a specific creator AND a specific venue (e.g., "Sam Ross at Milk & Honey", "Joaquín Simó at Death & Co"). Do NOT fill attribution for communal classics whose origin is murky (Old Fashioned, Manhattan, Cosmopolitan, French 75, Gin Gimlet, etc.) — leave all fields empty. Never invent a likely creator.
   - If measurements are missing, leave them blank rather than guessing
   - Body should be just `## Notes` (and any narrative-only sections like `## Variations`) — do NOT put `## Ingredients` / `## Steps` / `## House-Made` / `## How to Batch It` in the body, those are migration leftovers and the linter will error on them
   - Notes must stick to verifiable facts: substitutions, technique tips, named-source observations. Do NOT open with "An original…", "This is essentially X", or any other inferential origin claim — the project convention is conservative attribution, so editorial assertions about origin get rewritten at promotion time anyway. If the email's own text states an origin, quote/paraphrase faithfully; if not, stay silent on origin.
3. Write the file to `recipes/inbox/{slug}.md`.
4. Ship it as a PR per the Contributing rules — do not commit on `main`:
   - `git checkout -b feat-inbox-{slug}` (no issue ref needed for ingest)
   - `git add recipes/inbox/{slug}.md && git commit -m "feat(inbox): add {Recipe Title}"`
   - `git push -u origin feat-inbox-{slug}`
   - `gh pr create --title "feat(inbox): add {Recipe Title}" --body "..."` — body should summarize what was parsed, flag any missing measurements or guessed values, and link the source email if available.
5. Confirm to the user what was saved, the branch name, and the PR URL.

If `gh pr create` fails with a token-permission error, still complete steps 1–4 above (file + branch + push) and report the GitHub "create PR" URL from the push output so the user can open the PR manually.

Inbox recipes do not appear on the public site until they're promoted (stages 2–4 of the Recipe Pipeline section above), which happens after the PR is merged.

## GitHub Issue Recipe Intake

Third intake path alongside email and `/ingest`: the **Submit a recipe** issue form (`.github/ISSUE_TEMPLATE/recipe.yml`) plus the `.github/workflows/recipe-from-issue.yml` workflow. The form auto-applies the `recipe` label; the workflow fires on that label, parses the form body, writes a `publish: false` draft to `recipes/inbox/`, runs `npm run validate`, and opens a PR against `staging`. The label is the spam gate — non-collaborators can't apply labels, so only the form's own submissions trigger it. The PR is the review; a human completes it and merges (accept) or closes (decline).

**The draft it writes is intentionally partial.** The workflow only knows name / category-suggestion / ingredients / method / glassware / garnish / notes / attribution from the form — it cannot infer the enum-shaped fields. So a fresh issue draft carries only `title`, `category: inbox`, `publish: false`, `ingredients[]`, optional `garnish` / `attribution`, and provenance keys (`submitted_by`, `source_issue`). The reviewer fills the rest before promotion.

Why it passes CI in that state, and where it would break:

- `scripts/validate.mjs` skips Zod/enum checks for `publish !== true`, so the partial inbox draft passes the workflow's validate step and the PR opens.
- PR CI (`test.yml`) runs `npm test` only — no `astro check` — so the PR lands green.
- The full Zod schema (`blurb`, `glass`, `method`, `ice`, `difficulty`, `steps` required) is enforced by `astro check` inside `npm run build`, which runs **only at the staging→main release build** (`deploy.yml`, on push to `main`). A draft still missing those fields breaks the release build. **So the reviewer must complete the enum frontmatter — using the slugs in `data/taxonomy.yaml` / `TEMPLATE.md` — before the draft rides a release**, then promote via `npm run promote`.

Gotchas baked into the workflow (don't regress them if you edit it):

- `category` is **hardcoded to `inbox`**, never the submitter's dropdown value. A file in `recipes/inbox/` with any other category fails `validate.mjs` (dir↔category coherence) and no PR opens. The submitter's suggestion is preserved as a `> Submitter hints` block in the body.
- Attribution uses `source_url`, not `url` — that's the schema key; a stray `url` is silently dropped by Zod.
- Glassware from the form goes into the body hint block, not frontmatter — `glass` is an enum slug the reviewer sets, not free text.
- `ISSUE_BODY` is passed through `env:`, never inlined into a `run:` block, so a malicious issue body can't inject shell.

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
ingredients:
  - 2 oz blanco tequila
  - 1 oz fresh lime juice
garnish: Salt rim                   # optional
float: ""                           # optional (e.g. ¼ oz Laphroaig for penicillin-style)
steps:
  - Combine in a shaker with ice.
  - Shake hard, strain.
house_made:                         # optional
  name: Honey-Ginger Syrup
  yield: Makes ~4 oz.
  ingredients:                      # optional — omit when the procedure produces the ingredient
    - 1 cup honey
    - 1 cup water
  steps:
    - Combine and simmer.
batch:                              # optional
  yield: Makes 8 servings.
  ingredients:                      # optional
    - 16 oz blanco tequila
  instructions: |                   # PLAIN TEXT — markdown renders literally
    Combine all in a pitcher. Stir to chill.
attribution:
  creator: ""
  bar: ""
  year: ""
  source_url: ""
---

# Recipe Name

> *One-line description*

## Notes

*Origin story, substitutions, variations, tips.*
```
