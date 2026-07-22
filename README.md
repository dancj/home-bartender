# Home Bartender

A personal cocktail recipe collection — markdown files in, static site out.

**Live site: https://dancj.github.io/home-bartender/**

Recipes are markdown with YAML frontmatter (see [`TEMPLATE.md`](TEMPLATE.md)). The site is built with [Astro](https://astro.build) and [Pagefind](https://pagefind.app), and deployed to GitHub Pages by the workflow in `.github/workflows/deploy.yml`. New recipes arrive via email/WhatsApp (parsed by a personal AI assistant) or the [**Submit a recipe** issue form](../../issues/new?template=recipe.yml), land in `recipes/inbox/` with `publish: false`, and become live after a quick human review.

## Submitting a recipe via GitHub

Open a new issue with the **Submit a recipe** template (or email it to the repo). The `.github/workflows/recipe-from-issue.yml` workflow parses the form, writes a `publish: false` draft to `recipes/inbox/`, and opens a PR against `staging` — the PR *is* the review. The form's dropdowns (`method`, `ice`, `glass`, `difficulty`) plus a description line let a complete submission arrive release-valid; a reviewer fills any gaps (`blurb`, `glass`, `method`, `ice`, `difficulty`, `steps` — slugs per [`TEMPLATE.md`](TEMPLATE.md)) and merges to accept or closes to decline. The `recipe` label the form applies is the spam gate: non-collaborators can't apply labels, so the workflow only fires on the form's own submissions.

## Structure

```
recipes/
  classics/      ← established cocktails (with attribution to original creator)
  originals/     ← personal creations and experiments
  seasonal/      ← seasonal/holiday recipes
  inbox/         ← drafts awaiting review (publish: false)
sections/        ← prose: techniques, tools, super juice
src/             ← the Astro app (layouts, pages, components)
scripts/         ← migration + validation utilities
```

## Working with the site

```sh
npm install          # one-time
npm run dev          # local dev server at localhost:4321
npm run validate     # check every recipe's frontmatter against the schema
npm run build        # full production build → dist/ (includes Pagefind index)
```

Pushing to `main` deploys via GitHub Actions.

## License

Two licenses, one repo:

- **[`LICENSE-CODE`](LICENSE-CODE)** — MIT for the framework code (Astro app, scripts, workflow, configs). Modify and reuse freely with attribution.
- **[`LICENSE-CONTENT`](LICENSE-CONTENT)** — CC BY-NC 4.0 (Attribution-NonCommercial 4.0 International) for the recipe prose and section writeups. Credit required, non-commercial use only.

Recipe specs themselves (ingredients, ratios, methods) aren't copyrightable — those are facts and techniques. But the recipe **prose**, **headnotes**, and the **compilation as a whole** are copyrightable, and that's what CC BY-NC protects. Borrowed recipes credit their original creator via the per-recipe `attribution` frontmatter block.
